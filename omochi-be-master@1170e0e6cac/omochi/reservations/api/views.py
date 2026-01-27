from datetime import datetime, timedelta

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

from omochi.reservations.models import (
    Reservation,
    ReservationStatusHistory,
    TimeSlot,
)
from omochi.venues.models import Venue, VenueManager
from omochi.notifications.services import firebase_service

from .serializers import (
    ReservationSerializer,
    ReservationStatusHistorySerializer,
    ReservationStatusUpdateSerializer,
    BulkReservationStatusSerializer,
)
import logging
from omochi.common.utils import get_timezone_datetime
logger = logging.getLogger(__name__)


# get reservations with permission check at query level
def _get_reservations_with_permission_check(request, reservation_ids):
    """
    Fetch reservations with permission check at query level.
    
    Returns:
        tuple: (reservations: list, error_response: Response or None)
        
    Usage:
        reservations, error = _get_reservations_with_permission_check(request, reservation_ids)
        if error:
            return error
    """
    if request.user.is_staff:
        # Admin can update any reservation
        reservations = list(
            Reservation.objects.select_for_update()
            .filter(pk__in=reservation_ids)
            .select_related('venue', 'user')
        )
    else:
        # Venue manager can only update reservations of their managed venues
        user_managed_venue_ids = set(
            VenueManager.objects.filter(user_id=request.user.id)
            .values_list('venue_id', flat=True)
        )
        if not user_managed_venue_ids:
            return None, Response(
                {"error": _("You do not have permission to update the status of these reservations.")},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Filter reservations by managed venues at query level for security
        reservations = list(
            Reservation.objects.select_for_update()
            .filter(pk__in=reservation_ids, venue_id__in=user_managed_venue_ids)
            .select_related('venue', 'user')
        )
    
    # Validate existence
    if len(reservations) != len(reservation_ids):
        return None, Response(
            {'error': _("The relevant reservations could not be found. Please check the list and try again.")},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    return reservations, None

class ReservationPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsReservationOwnerOrVenueManager(permissions.BasePermission):
    """Permission to only allow reservation owners or venue managers to
    view/edit reservations"""

    def has_object_permission(self, request, view, obj):
        # Check if user is admin
        if request.user.is_staff:
            return True

        # Check if user is the reservation owner
        if obj.user == request.user:
            return True

        # Check if user is manager for this venue
        return obj.venue.managers.filter(user=request.user).exists()


class ReservationViewSet(viewsets.ModelViewSet):
    """API endpoints for managing reservations"""

    permission_classes = [
        permissions.IsAuthenticated,
        IsReservationOwnerOrVenueManager,
    ]
    pagination_class = ReservationPagination

    def get_serializer_class(self):
        if self.action == 'status':
            return ReservationStatusUpdateSerializer
        return ReservationSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Reservation.objects.select_related(
            'venue', 'time_slot', 'user'
        ).prefetch_related('status_history', 'reservation_questions')

        # If the user is not staff, filter reservations by user
        # or by venues the user manages
        if not user.is_staff:
            managed_venues = user.managed_venues.all().values_list(
                'venue_id', flat=True
            )
            queryset = Reservation.objects.filter(
                Q(user=user) | Q(venue__id__in=managed_venues)
            )
        filter_fields = {
            'venue': 'venue',
        }

        for param, field in filter_fields.items():
            value = self.request.query_params.get(param)
            if value:
                queryset = queryset.filter(**{field: value})
        
        # Handle status filtering - supports comma-separated list of statuses
        status_param = self.request.query_params.get('status')
        if status_param:
            statuses = [s.strip() for s in status_param.split(',')]
            queryset = queryset.filter(status__in=statuses)
                
        # Handle date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # Filter to only return reservations without any orders
        queryset = queryset.filter(orders__isnull=True)

        return queryset.order_by('-updated_at', '-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @extend_schema(
        summary="List reservations",
        description=(
            "Returns a list of reservations for the current user or "
            "reservations from venues the user manages"
        ),
        parameters=[
            OpenApiParameter(
                name="venue", description="Filter by venue ID", type=str
            ),
            OpenApiParameter(
                name="start_date",
                description="Filter by start date (YYYY-MM-DD)",
                type=str,
            ),
            OpenApiParameter(
                name="end_date",
                description="Filter by end date (YYYY-MM-DD)",
                type=str,
            ),
            OpenApiParameter(
                name="status", 
                description="Filter by status (comma-separated for multiple, e.g. 'PENDING,CONFIRMED')", 
                type=str
            ),
            OpenApiParameter(
                name="page", description="Page number", type=int
            ),
            OpenApiParameter(
                name="page_size", 
                description="Number of results per page (max 100)", 
                type=int
            ),
        ],
        responses={
            200: OpenApiResponse(response=ReservationSerializer(many=True)),
            401: OpenApiResponse(description="Authentication required"),
        },
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create reservation",
        description="Create a new reservation for a venue with optional venue questions",
        request=ReservationSerializer,
        responses={
            201: OpenApiResponse(response=ReservationSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            401: OpenApiResponse(description="Authentication required"),
        },
    )
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        venue = Venue.objects.filter(id=data.get('venue')).first()
        if venue is None:
            return Response(
                {"error": _("Venue not found.")},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if the venue supports dine-in reservations or is a non-partner.
        # Prevents reservation creation otherwise.
        if not venue.is_partner or venue.enable_reservation == False:
            return Response(
                {"error": _("This venue does not support dine-in reservations.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            try:
                time_slot = TimeSlot.objects.select_for_update().get(
                    id=data['time_slot'],
                    venue_id=data['venue'],
                    service_type='DINE_IN',
                )
                if time_slot.is_paused:
                    return Response(
                        {"error": _("Time slot is fully booked.")},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except TimeSlot.DoesNotExist:
                return Response(
                    {"error": _("Time slot or venue not found.")},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Use Japan timezone (UTC+9)
            current_tz_datetime = get_timezone_datetime('Asia/Tokyo')
            current_tz_date = current_tz_datetime.date()

            reservation_check = Reservation.objects.filter(
                venue=data['venue'],
                user=request.user,
                time_slot=time_slot,
                date=current_tz_date,
            ).exclude(Q(status='CANCELLED') | Q(status='COMPLETED'))

            if reservation_check.exists():
                return Response(
                    {"error": _("You have a reservation for today at this time slot.")},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            remaining_slots = time_slot.remaining_slots

            if remaining_slots < data['party_size']:
                return Response(
                    {"error": _("Time slot is fully booked.")},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            from omochi.menus.models import MenuItem
            has_priority_pass_item = MenuItem.objects.filter(
                venue=venue, is_priority_pass=True
            ).exists()

            if (
                has_priority_pass_item 
                and time_slot.priority_pass_slot > 0
                and remaining_slots - data['party_size'] < time_slot.priority_pass_slot
            ):
                return Response(
                    {"error": _("Please add priority pass item(s) to make a reservation.")},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            venue = Venue.objects.get(id=data['venue'])
            buffer_time = timedelta(minutes=venue.buffer_time)

            start_time = datetime.combine(
                current_tz_date, time_slot.start_time
            ).replace(tzinfo=current_tz_datetime.tzinfo)

            if start_time - current_tz_datetime < buffer_time:
                return Response(
                    {
                        "error": _(
                            "Cannot book a time slot within the buffer time."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Ensure lang is present and default to 'ja' if not
            if 'lang' not in data:
                data['lang'] = 'ja'

            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            reservation = serializer.save(
                user=request.user,
                date=current_tz_date,
                start_time=time_slot.start_time,
                end_time=time_slot.end_time,
                status='PENDING',
            )

        logger.info(f"New reservation {reservation.id} created. Sending notification to venue.")
        firebase_service.send_new_reservation_notification_to_venue(reservation)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Get reservation details",
        description="Get detailed information about a reservation",
        responses={
            200: OpenApiResponse(response=ReservationSerializer),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Reservation not found"),
        },
    )
    def retrieve(self, request, *args, **kwargs):
        reservation = self.get_object()
        user = request.user
        is_manager_or_staff = (
            user.is_staff or reservation.venue.managers.filter(user=user).exists()
        )
        if is_manager_or_staff and reservation.status == 'PENDING':
            old_status = reservation.status
            reservation.status = 'CONFIRMED'
            reservation.save()
            reservation.save_status_history(old_status, reservation.status, request.user)
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Update reservation",
        description=(
            "Update reservation details " "(only for the reservation owner)"
        ),
        request=ReservationSerializer,
        responses={
            200: OpenApiResponse(response=ReservationSerializer),
            400: OpenApiResponse(description="Bad request, validation error"),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Reservation not found"),
        },
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Cancel reservation",
        description=(
            "Cancel a reservation "
            "(only for the reservation owner or venue manager)"
        ),
        responses={
            204: OpenApiResponse(
                description="Reservation cancelled successfully"
            ),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Reservation not found"),
        },
    )
    def destroy(self, request, *args, **kwargs):
        reservation = self.get_object()
        old_status = reservation.status
        reservation.status = 'CANCELLED'
        reservation.save()
        reservation.save_status_history(
            old_status, reservation.status, request.user
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary="Update reservation status",
        description="Update the status of a reservation (venue managers only)",
        request=ReservationStatusUpdateSerializer,
        responses={
            200: OpenApiResponse(response=ReservationStatusUpdateSerializer),
            400: OpenApiResponse(description="Bad request, invalid status"),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Reservation not found"),
        },
    )
    @action(detail=True, methods=['put'])
    def status(self, request, pk=None):
        reservation = self.get_object()
        old_status = reservation.status
        serializer = ReservationStatusUpdateSerializer(
            reservation, data=request.data
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        reservation.save_status_history(
            old_status, reservation.status, request.user
        )
        return Response(serializer.data)

    @extend_schema(
        summary="Bulk update reservation status",
        description="Bulk update status for multiple reservations. Status must follow flow: PENDING → CONFIRMED → PREPARING → READY → COMPLETED",
        request=BulkReservationStatusSerializer,
        responses={
            200: OpenApiResponse(description="Bulk status update result: per-reservation success/error list."),
            400: OpenApiResponse(description="Bad request, invalid status or reservation."),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
        },
    )
    @action(detail=False, methods=['put'], url_path='bulk-status')
    def bulk_status(self, request):
        """Optimized bulk reservation status update with permission class integration"""
        serializer = BulkReservationStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        reservation_ids = serializer.validated_data['reservation_ids']
        target_status = serializer.validated_data['status']
        
        status_flow = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED']
        target_index = status_flow.index(target_status)
            
        with transaction.atomic():
            # Get reservations with permission check
            reservations, error = _get_reservations_with_permission_check(request, reservation_ids)
            if error:
                return error
            
            # Process updates with bulk history creation
            results = []
            history_objects = []
            
            for reservation in reservations:
                try:
                    current_index = status_flow.index(reservation.status)
                    if target_index <= current_index:
                        results.append({'reservation_id': str(reservation.id), 'success': False, 'error': 'Invalid status transition'})
                        continue
                    
                    # Collect history entries for bulk create
                    for i in range(current_index + 1, target_index + 1):
                        new_status = status_flow[i]
                        prev_status = status_flow[i-1] if i > 0 else reservation.status
                        
                        # Create history object in memory
                        history_objects.append(
                            ReservationStatusHistory(
                                reservation=reservation,
                                old_status=prev_status,
                                new_status=new_status,
                                changed_by=request.user
                            )
                        )
                        reservation.status = new_status
                        
                    reservation.save(update_fields=['status', 'updated_at'])
                    results.append({'reservation_id': str(reservation.id), 'success': True, 'new_status': reservation.status})
                    
                except Exception as e:
                    results.append({'reservation_id': str(reservation.id), 'success': False, 'error': str(e)})
            
            # Bulk create all history records at once
            if history_objects:
                ReservationStatusHistory.objects.bulk_create(history_objects)
            
            return Response({'results': results}, status=status.HTTP_200_OK)


class ReservationStatusHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for viewing reservation status history.
    """

    serializer_class = ReservationStatusHistorySerializer
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    @extend_schema(
        summary="Get reservation status history",
        description="Retrieve the status history of a reservation by its ID.",
        parameters=[
            OpenApiParameter(
                name="reservation_id",
                description="UUID of the reservation",
                required=True,
                type="string",
            )
        ],
        responses={
            200: OpenApiResponse(
                response=ReservationStatusHistorySerializer(many=True)
            ),
            401: OpenApiResponse(description="Authentication required"),
            404: OpenApiResponse(description="Reservation not found"),
        },
    )
    def get_queryset(self):
        reservation_id = self.kwargs.get('reservation_id')
        return ReservationStatusHistory.objects.filter(
            reservation_id=reservation_id
        )


class UserReservationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for retrieving current user's reservations.
    """
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # No pagination for user reservations
    
    def get_queryset(self):
        queryset = (
            Reservation.objects.filter(user=self.request.user)
            .select_related('venue', 'time_slot')
            .prefetch_related('status_history')
        )
        
        # Handle status filtering - supports comma-separated list of statuses
        status_param = self.request.query_params.get('status')
        if status_param:
            statuses = [s.strip() for s in status_param.split(',')]
            queryset = queryset.filter(status__in=statuses)
            
        # Handle date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        # Filter to only return reservations without any orders
        queryset = queryset.filter(orders__isnull=True)
            
        return queryset.order_by('-updated_at', '-created_at')
    
    @extend_schema(
        summary="List reservations by current user",
        description="Retrieve reservations by current user.",
        parameters=[
            OpenApiParameter(
                name="status", 
                description="Filter by status (comma-separated for multiple, e.g. 'PENDING,CONFIRMED')", 
                type=str
            ),
            OpenApiParameter(
                name="start_date",
                description="Filter by start date (YYYY-MM-DD)",
                type=str,
            ),
            OpenApiParameter(
                name="end_date",
                description="Filter by end date (YYYY-MM-DD)",
                type=str,
            ),
        ],
        responses={
            200: OpenApiResponse(response=ReservationSerializer(many=True)),
            401: OpenApiResponse(description="Authentication required"),
        },
    )
    def list(self, request):
        reservations = self.get_queryset()
        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)
