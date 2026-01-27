from datetime import datetime
import logging

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from omochi.orders.models import Order, OrderStatusHistory
from omochi.common.utils import get_day_utc_range
from omochi.venues.models import VenueManager

from omochi.orders.api.serializers import (
    OrderSerializer,
    OrderStatusHistorySerializer,
    OrderStatusUpdateSerializer,
    OrderCreateSerializer,
    OrderListSerializer,
    BulkOrderStatusSerializer,
    BulkOrderConfirmPickupSerializer,
)

# Set up logging
logger = logging.getLogger(__name__)


# check user managed venue ids
def _get_user_managed_venue_ids(user_id):
    """
    Get set of venue IDs that the user manages.
    More efficient and secure - only loads venues for the specific user.
    """
    return set(
        VenueManager.objects.filter(user_id=user_id)
        .values_list('venue_id', flat=True)
    )


# get orders with permission check at query level
def _get_orders_with_permission_check(request, order_ids):
    """
    Fetch orders with permission check at query level.
    
    Returns:
        tuple: (orders: list, error_response: Response or None)
        
    Usage:
        orders, error = _get_orders_with_permission_check(request, order_ids)
        if error:
            return error
    """
    if request.user.is_staff:
        # Admin can update any order
        orders = list(
            Order.objects.select_for_update()
            .filter(pk__in=order_ids)
        )
    else:
        # Venue manager can only update orders of their managed venues
        user_managed_venue_ids = _get_user_managed_venue_ids(request.user.id)
        if not user_managed_venue_ids:
            return None, Response(
                {"error": _("You do not have permission to update the status of these orders.")},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Filter orders by managed venues at query level for security
        orders = list(
            Order.objects.select_for_update()
            .filter(pk__in=order_ids, venue_id__in=user_managed_venue_ids)
        )
    
    # Validate existence
    if len(orders) != len(order_ids):
        return None, Response(
            {'error': _("The relevant orders could not be found. Please reload or check the list.")},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    return orders, None


class OrderPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsOrderOwnerOrVenueManager(permissions.BasePermission):
    """
    Permission to only allow order owners or venue managers
    to view/edit orders
    """

    def has_object_permission(self, request, view, obj):
        # Check if user is admin
        if request.user.is_staff:
            return True
            
        # Check if user is the order owner
        if obj.user == request.user:
            return True
            
        # Check if user is manager for this venue
        return obj.venue.managers.filter(user=request.user).exists()


class OrderViewSet(viewsets.ModelViewSet):
    """API endpoints for managing orders"""

    permission_classes = [
        permissions.IsAuthenticated,
        IsOrderOwnerOrVenueManager,
    ]
    pagination_class = OrderPagination

    def get_serializer_class(self):
        serializer_map = {
            'create': OrderCreateSerializer,
            'update': OrderCreateSerializer,
            'update_status': OrderStatusUpdateSerializer,
            'list': OrderListSerializer,
            'retrieve': OrderSerializer,
        }
        return serializer_map.get(self.action, OrderSerializer)

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.all()

        if not user.is_staff:
            managed_venues = user.managed_venues.all().values_list(
                'venue_id', flat=True
            )
            queryset = queryset.filter(
                Q(user=user) | Q(venue__id__in=managed_venues)
            )

        # Handle regular filter fields
        filter_fields = {
            'venue': 'venue',
            'order_type': 'order_type',
            'time_slot': 'time_slot',
        }

        for param, field in filter_fields.items():
            value = self.request.query_params.get(param)
            if value:
                queryset = queryset.filter(**{field: value})
                
        # Special handling for status filter to support multiple values
        status_param = self.request.query_params.get('status')
        if status_param:
            # Split by comma to support multiple statuses
            status_values = [s.strip() for s in status_param.split(',')]
            if status_values:
                queryset = queryset.filter(status__in=status_values)

        # For list views, optimize by selecting only necessary fields
        if self.action == 'list':
            queryset = queryset.only(
                'id', 'status', 'order_type', 'order_date', 'updated_at',
                'total_amount', 'venue_id', 'user_id', 'payment_status',
                'pickup_time', 'reservation_id', 'order_code', 'total'
            )

        start_date = self.request.query_params.get('start_date')        
        if start_date:
            parsed_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            start_of_day_utc, _ = get_day_utc_range(timezone_str='Asia/Tokyo', date=parsed_date)
            queryset = queryset.filter(order_date__gte=start_of_day_utc)
        
        end_date = self.request.query_params.get('end_date')
        if end_date:
            parsed_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            _, end_of_day_utc = get_day_utc_range(timezone_str='Asia/Tokyo', date=parsed_date)
            queryset = queryset.filter(order_date__lt=end_of_day_utc)

        return queryset.order_by('-updated_at', '-order_date')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    @extend_schema(
        summary="List user orders",
        description=(
            "Returns a list of orders for the current user or orders "
            "from venues the user manages"
        ),
        parameters=[
            OpenApiParameter(
                name='venue', description='Filter by venue ID', type=str
            ),
            OpenApiParameter(
                name='status', description='Filter by order status (can be a comma-separated list of statuses)', type=str
            ),
            OpenApiParameter(
                name='order_type', description='Filter by order type', type=str
            ),
            OpenApiParameter(
                name='time_slot', description='Filter by time slot', type=str
            ),
            OpenApiParameter(
                name='page', description='Page number', type=int
            ),
            OpenApiParameter(
                name='page_size', 
                description='Number of results per page (max 100)', 
                type=int
            ),
            OpenApiParameter(
                name='start_date',
                description=(
                    'Filter by start date (YYYY-MM-DD)'
                ),
                type=str
            ),
            OpenApiParameter(
                name='end_date',
                description=(
                    'Filter by end date (YYYY-MM-DD)'
                ),
                type=str
            ),
        ],
        responses={
            200: OpenApiResponse(response=OrderListSerializer(many=True)),
            401: OpenApiResponse(description="Authentication required"),
        },
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create order",
        description="Create a new order with menu items",
        request=OrderCreateSerializer,
        responses={
            201: OpenApiResponse(response=OrderSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            401: OpenApiResponse(description="Authentication required"),
        },
    )
    def create(self, request, *args, **kwargs):
        user = request.user

        if user.managed_venues.all().exists():
            return Response(
                {"detail": _("User belongs to venue account so can not order.")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        data = request.data.copy()
        # Ensure lang is present and default to 'ja' if not
        if 'lang' not in data:
            data['lang'] = 'ja'
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save(user=request.user)
        return Response(
            OrderSerializer(order, context={'request': request}).data,
            status=201,
        )

    @extend_schema(
        summary="Get order details",
        description="Get detailed information about an order",
        responses={
            200: OpenApiResponse(response=OrderSerializer),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Order not found"),
        },
    )
    def retrieve(self, request, *args, **kwargs):
        user = request.user
        
        with transaction.atomic():
            # Lock the order for update to prevent race conditions during auto-confirmation
            order = Order.objects.select_for_update().get(pk=kwargs['pk'])
            
            is_manager_or_staff = (
                user.is_staff or order.venue.managers.filter(user=user).exists()
            )
            if is_manager_or_staff and order.status == 'PENDING':
                old_status = order.status
                order.status = 'CONFIRMED'
                order.save()
                order.save_status_history(old_status, order.status, request.user)
        
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Update order",
        description="Update the details of a specific order by its ID.",
        request=OrderCreateSerializer,
        responses={
            200: OpenApiResponse(response=OrderSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Order not found"),
        },
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Cancel order",
        description=(
            "Cancel an order (only for the order owner or venue manager)"
        ),
        responses={
            204: OpenApiResponse(description="Order cancelled successfully"),
            400: OpenApiResponse(description="Cannot cancel order"),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Order not found"),
        },
    )
    def destroy(self, request, *args, **kwargs):
        with transaction.atomic():
            # Lock the order for update to prevent race conditions
            order = Order.objects.select_for_update().get(pk=kwargs['pk'])
            if order.status == 'CANCELLED':
                return Response(status=status.HTTP_204_NO_CONTENT)
            
            # Check if order can be cancelled based on status and payment status
            if order.status in ['COMPLETED']:
                return Response(
                    {"error": _("Cannot cancel an order that is already completed or cancelled.")},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            if order.payment_status == 'PAID' and order.status in ['PREPARING', 'READY']:
                return Response(
                    {"error": _("Cannot cancel a paid order that is being prepared or ready for pickup.")},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Find and update user coupons related to this order
            from omochi.coupons.models import UserCoupon
            user_coupons = UserCoupon.objects.filter(order=order, is_used=True)
            for user_coupon in user_coupons:
                user_coupon.is_used = False
                user_coupon.order = None
                user_coupon.used_at = None
                user_coupon.save()
                logger.info(f"Reset coupon {user_coupon.id} for cancelled order {order.id}")
            
            old_status = order.status
            order.status = 'CANCELLED'

            order.save()
            order.save_status_history(old_status, order.status, request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary="Update order status",
        description="Update the status of an order (venue managers only)",
        request=OrderStatusUpdateSerializer,
        responses={
            200: OpenApiResponse(response=OrderStatusUpdateSerializer),
            400: OpenApiResponse(description="Bad request, invalid status"),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Order not found"),
        },
    )
    @action(detail=True, methods=['put'])
    def status(self, request, pk=None):
        with transaction.atomic():
            # Lock the order for update to prevent race conditions
            order = Order.objects.select_for_update().get(pk=pk)
            
            # Check if user is venue manager for this order
            if not (request.user.is_staff or order.venue.managers.filter(user=request.user).exists()):
                return Response(
                    {"error": _("You do not have permission to update the status of these orders.")},
                    status=status.HTTP_403_FORBIDDEN,
                )
            
            serializer = OrderStatusUpdateSerializer(order, data=request.data)
            serializer.is_valid(raise_exception=True)
            new_status = serializer.validated_data.get('status')
            old_status = order.status

            if new_status == 'PREPARING':
                order.status = 'PREPARING'
            elif new_status == 'READY':
                order.status = 'READY'
                
                reservation = order.reservation
                if reservation is not None:
                    current_reservation_status = reservation.status
                    # Define the complete status flow
                    status_flow = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']
                    # Find the index of the current status
                    try:
                        current_index = status_flow.index(current_reservation_status)
                    except ValueError:
                        # If status is not in our flow (like CANCELLED), start from beginning
                        current_index = -1
                        
                    # Add status history entries for each missing step
                    for i in range(current_index + 1, len(status_flow)):
                        old_status = status_flow[i-1] if i > 0 else current_reservation_status
                        new_status = status_flow[i]
                        
                        # Record the status transition
                        order.reservation.save_status_history(old_status, new_status, request.user)
                    reservation.status = 'COMPLETED'
                    reservation.save()

            order.save()
            order.save_status_history(old_status, order.status, request.user)
            return Response(serializer.data)

    @extend_schema(
        summary="Confirm order pickup",
        description=(
            "Mark an order as completed after confirming pickup "
            "with the customer."
        ),
        request=None,
        responses={
            200: OpenApiResponse(
                description="Order has been marked as completed."
            ),
            400: OpenApiResponse(description="Invalid status transition."),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Order not found"),
        },
    )
    @action(detail=True, methods=['post'])
    def confirm_pickup(self, request, pk=None):
        with transaction.atomic():
            # Lock the order for update to prevent race conditions
            order = Order.objects.select_for_update().get(pk=pk)
            
            if order.status != 'READY':
                return Response(
                    {
                        "error": (
                            _("Order must be in 'READY' status to confirm pickup.")
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            old_status = order.status
            order.status = 'COMPLETED'
            order.pickup_time = datetime.now()

            from omochi.ref_logs.services import RefLogService
            RefLogService.log_order(order.user, order.id, order.venue)
        

            if order.payment_method == 'CASH':
                order.payment_status = 'PAID'

            order.save()
            order.save_status_history(old_status, order.status, request.user)

        return Response(
            {"message": _("Order has been marked as completed.")},
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        summary="Bulk update order status",
        description="Bulk update status for multiple orders (venue managers only). Status must follow flow: PENDING → CONFIRMED → PREPARING → READY → COMPLETED",
        request=BulkOrderStatusSerializer,
        responses={
            200: OpenApiResponse(
                description="Bulk status update result: per-order success/error list.",
                examples=[{"results": [{"order_id": "1", "success": True, "new_status": "READY"}]}]
            ),
            400: OpenApiResponse(
                description="Bad request, invalid status or order.",
                examples=[{"error": "The relevant orders could not be found. Please reload or check the list."}]
            ),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(
                description="Permission denied",
                examples=[{"error": "Permission denied for order 1"}]
            ),
        },
    )
    @action(detail=False, methods=['put'], url_path='bulk-status')
    def bulk_status(self, request):
        """Optimized bulk status update with permission class integration"""
        serializer = BulkOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        order_ids = serializer.validated_data['order_ids']
        target_status = serializer.validated_data['status']
        
        status_flow = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']
        target_index = status_flow.index(target_status)
            
        with transaction.atomic():
            # Get orders with permission check
            orders, error = _get_orders_with_permission_check(request, order_ids)
            if error:
                return error
            
            # Check eligibility
            ineligible = []
            eligible_orders = []
            
            for order in orders:
                
                # Check eligibility - separate eligible from ineligible orders
                if order.status in ['READY', 'COMPLETED', 'CANCELLED']:
                    ineligible.append(str(order.order_code))
                else:
                    eligible_orders.append(order)
            
            if ineligible:
                return Response({'error': _("Some of the selected orders cannot be updated due to their current status. Please check the status and try again.")}, status=status.HTTP_400_BAD_REQUEST)
            
            # Process updates with bulk history creation
            results = []
            history_objects = []
            
            for order in eligible_orders:
                try:
                    current_index = status_flow.index(order.status)
                    if target_index <= current_index:
                        results.append({'order_id': str(order.id), 'success': False, 'error': 'Invalid status transition'})
                        continue
                    
                    # Collect history entries for bulk create
                    for index in range(current_index + 1, target_index + 1):
                        new_status = status_flow[index]
                        prev_status = status_flow[index - 1] if index > 0 else order.status
                        
                        # Create history object in memory
                        history_objects.append(
                            OrderStatusHistory(
                                order=order,
                                old_status=prev_status,
                                new_status=new_status,
                                changed_by=request.user
                            )
                        )
                        order.status = new_status
                        
                    order.save(update_fields=['status', 'updated_at'])
                    results.append({'order_id': str(order.id), 'success': True, 'new_status': order.status})
                    
                except Exception as e:
                    results.append({'order_id': str(order.id), 'success': False, 'error': str(e)})
            
            # Bulk create all history records at once
            if history_objects:
                OrderStatusHistory.objects.bulk_create(history_objects)
            
            return Response({'results': results}, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Bulk confirm order pickup",
        description="Bulk confirm pickup for multiple orders (venue managers only). All orders must be in READY state.",
        request=BulkOrderConfirmPickupSerializer,
        responses={
            200: OpenApiResponse(
                description="Bulk confirm pickup result: per-order success/error list.",
                examples=[{"results": [{"order_id": "1", "success": True, "new_status": "COMPLETED"}]}]
            ),
            400: OpenApiResponse(
                description="Bad request, invalid status or order.",
                examples=[{"error": "The relevant orders could not be found. Please reload or check the list."}]
            ),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(
                description="Permission denied",
                examples=[{"error": "Permission denied for order 1"}]
            ),
        },
    )
    @action(detail=False, methods=['post'], url_path='bulk-confirm-pickup')
    def bulk_confirm_pickup(self, request):
        """Optimized bulk pickup confirmation with permission class integration"""
        serializer = BulkOrderConfirmPickupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        order_ids = serializer.validated_data['order_ids']
            
        with transaction.atomic():
            # Get orders with permission check
            orders, error = _get_orders_with_permission_check(request, order_ids)
            if error:
                return error
            
            # Check READY status
            not_ready = []
            for order in orders:
                if order.status != 'READY':
                    not_ready.append(str(order.order_code))
            
            if not_ready:
                return Response({'error': _("All orders must be in [Ready] status to proceed with the update.")}, status=status.HTTP_400_BAD_REQUEST)
            
            # Bulk processing
            pickup_time = datetime.now()
            results = []
            history_objects = []
            orders_to_log = []
            
            for order in orders:
                try:
                    order.status = 'COMPLETED'
                    order.pickup_time = pickup_time
                    
                    if order.payment_method == 'CASH':
                        order.payment_status = 'PAID'
                    
                    order.save(update_fields=['status', 'pickup_time', 'payment_status', 'updated_at'])
                    
                    # Collect order for logging after transaction
                    orders_to_log.append(order)
                    
                    # Collect history object for bulk create
                    history_objects.append(
                        OrderStatusHistory(
                            order=order,
                            old_status='READY',
                            new_status='COMPLETED',
                            changed_by=request.user
                        )
                    )
                    
                    results.append({'order_id': str(order.id), 'success': True, 'new_status': 'COMPLETED'})
                    
                except Exception as e:
                    results.append({'order_id': str(order.id), 'success': False, 'error': str(e)})
            
            # Bulk create all history records at once
            if history_objects:
                OrderStatusHistory.objects.bulk_create(history_objects)
        
        # Log orders after transaction commits (keep individual calls as RefLogService may not support batch)
        from omochi.ref_logs.services import RefLogService
        for order in orders_to_log:
            try:
                RefLogService.log_order(order.user, order.id, order.venue)
            except Exception as e:
                logger.error(f"Failed to log order {order.id}: {e}")
        
        return Response({'results': results}, status=status.HTTP_200_OK)


class OrderFilterViewSet(viewsets.GenericViewSet):
    """API endpoints for filtering orders by venue or user"""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.all()

        if not user.is_staff:
            managed_venues = user.managed_venues.all().values_list(
                'venue_id', flat=True
            )
            queryset = queryset.filter(
                Q(user=user) | Q(venue__id__in=managed_venues)
            )
            
        return queryset.order_by('-updated_at', '-order_date')
    
    @extend_schema(
        summary="List orders by venue",
        description=(
            "Retrieve a list of orders filtered by a specific venue ID. "
            "Only accessible to venue staff (owners, managers, or staff)."
        ),
        parameters=[
            OpenApiParameter(
                name="venue_id",
                description="ID of the venue to filter orders by",
                required=True,
                type=str,
            )
        ],
        responses={
            200: OpenApiResponse(response=OrderSerializer(many=True)),
            400: OpenApiResponse(
                description="Bad request, venue_id is required"
            ),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied, only venue staff can access this resource"),
        },
    )
    @action(detail=False, methods=['get'])
    def by_venue(self, request):
        venue_id = request.query_params.get("venue_id")
        if not venue_id:
            return Response(
                {"error": _("Venue_id is required.")},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        # Check if user is venue staff (owner, manager, or staff)
        user = request.user
        if not user.is_staff:  # Skip check for admin users
            try:
                # Check if user is manager for this venue
                is_venue_staff = user.managed_venues.filter(venue_id=venue_id).exists()
                if not is_venue_staff:
                    return Response(
                        {"error": _("Permission denied.")},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except ValidationError as e:
                return Response(
                    {"error": _("Invalid venue ID format."), "details": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        start_of_day_utc, end_of_day_utc = get_day_utc_range(timezone_str='Asia/Tokyo')

        try:
            orders = (
                self.get_queryset()
                .filter(venue_id=venue_id, order_date__range=(start_of_day_utc, end_of_day_utc))
                .exclude(
                    # Exclude orders with payment_method = ONLINE and payment_status != PAID
                    Q(payment_method='ONLINE') & ~Q(payment_status='PAID')
                )
                .order_by('-order_date')
            )
            
            serializer = self.get_serializer(orders, many=True)
            return Response(serializer.data)
        except ValidationError as e:
            return Response(
                {"error": _("Invalid venue ID format."), "details": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @extend_schema(
        summary="List orders by current user",
        description="Retrieve orders by current user.",
        responses={
            200: OpenApiResponse(response=OrderSerializer(many=True)),
            401: OpenApiResponse(description="Authentication required"),
        },
    )
    @action(detail=False, methods=['get'])
    def my_orders(self, request):
        orders = (
            self.get_queryset()
            .filter(user=request.user)
            .select_related('venue')
            .order_by('-order_date')
        )
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)


class OrderStatusHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for viewing order status history.
    """

    serializer_class = OrderStatusHistorySerializer
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='order_id',
                description='UUID of the order',
                required=True,
                type='string',
            )
        ]
    )
    def get_queryset(self):
        order_id = self.kwargs.get('order_id')
        return OrderStatusHistory.objects.filter(order_id=order_id)
