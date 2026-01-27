from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from django.db.models import Q, Exists, OuterRef
from django.db import models
from omochi.common.utils import get_day_utc_range

from omochi.notifications.models import Notification
from omochi.users.models import FCMToken
from omochi.notifications.services import firebase_service
from .serializers import (
    NotificationSerializer, 
    NotificationReadStatusSerializer,
    FCMTokenSerializer,
    FCMTokenRegistrationSerializer,
    NotificationTestSerializer
)
from omochi.notifications.models import SystemNotificationReadStatus


class NotificationPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsNotificationUser(permissions.BasePermission):
    """Permission to only allow users to view their own notifications or broadcast notifications"""
    
    def has_object_permission(self, request, view, obj):
        # Allow access to broadcast notifications (user=NULL) for non-venue-managers
        if obj.is_broadcast and obj.user is None:
            return not request.user.managed_venues.exists()
        # Allow access to personal notifications
        return obj.user == request.user


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoints for retrieving notifications"""
    permission_classes = [permissions.IsAuthenticated, IsNotificationUser]
    serializer_class = NotificationSerializer
    pagination_class = NotificationPagination
    
    def get_queryset(self):
        
        user = self.request.user
        
        # Venue managers only see personal notifications
        if user.managed_venues.exists():
            queryset = Notification.objects.filter(user=user, is_broadcast=False)
        else:
            # Regular users see personal and broadcast notifications
            # Broadcast notifications are only shown if user existed when notification was sent
            queryset = Notification.objects.filter(
                Q(user=user, is_broadcast=False) |
                Q(
                    is_broadcast=True, 
                    user__isnull=True,
                    created_at__gte=user.date_joined
                )
            ).prefetch_related(
                models.Prefetch(
                    'read_statuses',
                    queryset=SystemNotificationReadStatus.objects.filter(user=user)
                )
            )
        
        # Apply status filter if provided
        status_param = self.request.query_params.get('status')
        if status_param:
            if status_param == 'READ':
                queryset = queryset.filter(
                    Q(is_broadcast=False, status='READ') |
                    Q(is_broadcast=True, read_statuses__user=user, read_statuses__is_read=True)
                )
            elif status_param == 'UNREAD':
                queryset = queryset.filter(
                    Q(is_broadcast=False, status='UNREAD') |
                    Q(
                        is_broadcast=True,
                        user__isnull=True
                    ) & (
                        ~Exists(
                            SystemNotificationReadStatus.objects.filter(
                                notification=OuterRef('pk'),
                                user=user,
                                is_read=True
                            )
                        )
                    )
                )
        
        # Filter by type if provided
        type_param = self.request.query_params.get('type')
        if type_param:
            queryset = queryset.filter(type=type_param)
        
        return queryset.distinct().order_by('-created_at')
    
    @extend_schema(
        summary="List user notifications",
        description="Returns a paginated list of notifications for the current user",
        parameters=[
            OpenApiParameter(name='status', description='Filter by read status', type=str),
            OpenApiParameter(name='type', description='Filter by notification type', type=str),
            OpenApiParameter(name='page', description='Page number', type=int),
            OpenApiParameter(
                name='page_size', 
                description='Number of results per page (max 100)', 
                type=int
            ),
        ],
        responses={
            200: OpenApiResponse(response=NotificationSerializer(many=True)),
            401: OpenApiResponse(description="Authentication required")
        }
    )
    def list(self, request, *args, **kwargs):
        """Override list to batch fetch venue logos for better performance"""
        response = super().list(request, *args, **kwargs)
        
        if response.status_code == 200 and 'results' in response.data:
            # Get all notifications from the response
            page_notifications = self.get_queryset().filter(
                id__in=[item['id'] for item in response.data['results']]
            )
            
            # Batch fetch venue logos
            venue_logos = firebase_service.get_venue_logos_for_notifications(page_notifications)
            
            # Add image_url to each notification in response
            for item in response.data['results']:
                item['image_url'] = venue_logos.get(str(item['id']))
        
        return response
    
    @extend_schema(
        summary="Get notification details",
        description="Get detailed information about a notification",
        responses={
            200: OpenApiResponse(response=NotificationSerializer),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Notification not found")
        }
    )
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to fetch venue logo for single notification"""
        response = super().retrieve(request, *args, **kwargs)
        
        if response.status_code == 200:
            notification = self.get_object()
            venue_logos = firebase_service.get_venue_logos_for_notifications([notification])
            response.data['image_url'] = venue_logos.get(str(notification.id))
        
        return response
    
    @extend_schema(
        summary="Mark notification as read",
        description="Mark a notification as read",
        request=NotificationReadStatusSerializer,
        responses={
            200: OpenApiResponse(response=NotificationReadStatusSerializer),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Notification not found")
        }
    )
    @action(detail=True, methods=['put'])
    def read(self, request, pk=None):
        from django.utils import timezone
        from omochi.notifications.models import SystemNotificationReadStatus
        
        notification = self.get_object()
        
        if notification.is_broadcast:
            # For broadcast notifications, create/update SystemNotificationReadStatus
            read_status, created = SystemNotificationReadStatus.objects.get_or_create(
                user=request.user,
                notification=notification,
                defaults={'is_read': True, 'read_at': timezone.now()}
            )
            if not created and not read_status.is_read:
                read_status.is_read = True
                read_status.read_at = timezone.now()
                read_status.save()
        else:
            # For personal notifications, update status field directly
            notification.status = 'READ'
            notification.save()
        
        serializer = NotificationReadStatusSerializer(notification)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Mark all notifications as read",
        description="Mark all notifications of the current user as read",
        request=None,  # Explicitly specify no request body is expected
        responses={
            204: OpenApiResponse(description="All notifications marked as read - No Content"),
            401: OpenApiResponse(description="Authentication required")
        }
    )
    @action(detail=False, methods=['put'])
    def read_all(self, request):
        from django.utils import timezone
        from omochi.notifications.models import SystemNotificationReadStatus
        
        user = request.user
        queryset = self.get_queryset()
        
        # Mark personal notifications as read
        personal_notifications = queryset.filter(is_broadcast=False, status='UNREAD')
        personal_notifications.update(status='READ')
        
        # Mark broadcast notifications as read using bulk operations
        broadcast_notifications = queryset.filter(is_broadcast=True, user__isnull=True)
        broadcast_ids = list(broadcast_notifications.values_list('id', flat=True))
        
        if broadcast_ids:
            existing_read_statuses = SystemNotificationReadStatus.objects.filter(
                user=user,
                notification_id__in=broadcast_ids
            )
            existing_notification_ids = set(existing_read_statuses.values_list('notification_id', flat=True))
            
            # Update existing records
            existing_read_statuses.filter(is_read=False).update(
                is_read=True,
                read_at=timezone.now()
            )
            
            # Create new records for unread notifications
            new_read_statuses = [
                SystemNotificationReadStatus(
                    user=user,
                    notification_id=notification_id,
                    is_read=True,
                    read_at=timezone.now()
                )
                for notification_id in broadcast_ids
                if notification_id not in existing_notification_ids
            ]
            
            if new_read_statuses:
                SystemNotificationReadStatus.objects.bulk_create(
                    new_read_statuses,
                    ignore_conflicts=True
                )
        
        return Response({"message": "All notifications marked as read"}, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary="Get upcoming reservation and order counts for venue",
        description="Get count of reservations and orders with time slots starting in the next 30 minutes.",
        parameters=[
            OpenApiParameter(name='venue_id', description='Filter by venue ID (required)', type=str, required=True),
        ],
        responses={
            200: OpenApiResponse(
                description="Count of upcoming reservations and orders",
                response={
                    "type": "object",
                    "properties": {
                        "reservation_count": {
                            "type": "integer",
                            "description": "Number of upcoming reservations in the next 30 minutes",
                            "example": 5
                        },
                        "order_count": {
                            "type": "integer",
                            "description": "Number of upcoming orders in the next 30 minutes",
                            "example": 3
                        }
                    }
                }
            ),
            401: OpenApiResponse(description="Authentication required"),
            403: OpenApiResponse(description="Permission denied - Not a venue manager"),
            404: OpenApiResponse(description="Venue not found")
        }
    )
    @action(detail=False, methods=['get'])
    def upcoming_reservations(self, request):
        """Get reservations and orders with time slots starting in the next 30 minutes for venue managers"""
        from datetime import datetime, timedelta
        import pytz
        from django.utils import timezone
        from django.shortcuts import get_object_or_404
        from rest_framework.exceptions import PermissionDenied
        from omochi.reservations.models import Reservation
        from omochi.orders.models import Order
        from omochi.venues.models import Venue, VenueManager
        
        # Get venue_id from query parameters
        venue_id = request.query_params.get('venue_id')
        if not venue_id:
            return Response(
                {"error": "venue_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get the venue
        venue = get_object_or_404(Venue, id=venue_id)
        
        # Check if user is a manager for this venue
        is_manager = request.user.is_staff or VenueManager.objects.filter(
            user=request.user,
            venue=venue,
            role__in=['OWNER', 'MANAGER', 'STAFF']
        ).exists()
        
        if not is_manager:
            raise PermissionDenied("You do not have permission to view this venue's data")
        
        # Get current time in Japan timezone
        japan_timezone = pytz.timezone('Asia/Tokyo')
        now_jst = timezone.now().astimezone(japan_timezone)
        
        # Calculate 30 minutes from now
        thirty_mins_later = now_jst + timedelta(minutes=30)
        
        # Convert times to time objects for comparison
        time_30_mins_later = thirty_mins_later.time()
        
        # Get today's date in JST
        today = now_jst.date()

        start_of_day_utc, end_of_day_utc = get_day_utc_range('Asia/Tokyo', today)

        # Get reservations starting in the next 30 minutes for this venue
        reservations = Reservation.objects.filter(
            venue=venue,
            date=today,
            start_time__lte=time_30_mins_later
        ).exclude(
            status__in=['CANCELLED', 'COMPLETED', 'READY']
        )
        
        # Get orders starting in the next 30 minutes for this venue, using proper UTC conversion
        orders = Order.objects.filter(
            venue=venue,
            order_date__range=(start_of_day_utc, end_of_day_utc),
            start_time__lte=time_30_mins_later
        ).exclude(
            status__in=['CANCELLED', 'COMPLETED', 'READY']
        ).exclude(
            # Exclude orders with payment_method = ONLINE and payment_status != PAID
            Q(payment_method='ONLINE') & ~Q(payment_status='PAID')
        )
        
        # Create response data with only counts
        data = {
            'reservation_count': reservations.count(),
            'order_count': orders.count()
        }
        
        return Response(data)
    

class FCMTokenViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing FCM tokens for push notifications
    """
    serializer_class = FCMTokenSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return FCMToken.objects.filter(user=self.request.user)
    
    @extend_schema(
        operation_id="register_fcm_token",
        summary="Register FCM token",
        description="Register a new Firebase Cloud Messaging token for push notifications",
        request=FCMTokenRegistrationSerializer,
        responses={
            201: OpenApiResponse(
                response=FCMTokenSerializer,
                description="FCM token registered successfully"
            ),
            400: OpenApiResponse(
                description="Invalid token or validation error"
            )
        }
    )
    @action(detail=False, methods=['post'])
    def register(self, request):
        """Register a new FCM token for the authenticated user"""
        serializer = FCMTokenRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            device_type = serializer.validated_data.get('device_type', 'WEB')
            device_id = serializer.validated_data.get('device_id')
            
            # Register the token
            fcm_token = FCMToken.register_token(
                user=request.user,
                token=token,
                device_type=device_type,
                device_id=device_id
            )
            
            response_serializer = FCMTokenSerializer(fcm_token)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        operation_id="deactivate_fcm_token",
        summary="Deactivate FCM token",
        description="Deactivate an FCM token (e.g., when user logs out)",
        responses={
            200: OpenApiResponse(description="Token deactivated successfully"),
            404: OpenApiResponse(description="Token not found")
        }
    )
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate an FCM token"""
        try:
            fcm_token = self.get_object()
            fcm_token.is_active = False
            fcm_token.save()
            return Response({"message": "Token deactivated successfully"})
        except FCMToken.DoesNotExist:
            return Response(
                {"error": "Token not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @extend_schema(
        summary="Send a test notification",
        description="Send a test notification to the current user's registered devices",
        request=NotificationTestSerializer,
        responses={
            200: OpenApiResponse(
                description="Test notification sent successfully",
                response={
                    "type": "object",
                    "properties": {
                        "success": {
                            "type": "boolean",
                            "description": "Whether the notification was sent successfully"
                        },
                        "message": {
                            "type": "string",
                            "description": "Status message"
                        }
                    }
                }
            ),
            400: OpenApiResponse(description="Invalid request data"),
            401: OpenApiResponse(description="Authentication required")
        }
    )
    # @action(detail=False, methods=['post'])
    def test(self, request):
        """Send a test notification to the current user's registered devices"""
        serializer = NotificationTestSerializer(data=request.data)
        
        if serializer.is_valid():
            title = serializer.validated_data['title']
            body = serializer.validated_data['body']
            click_action = serializer.validated_data.get('click_action')
            
            # Send test notification
            success = firebase_service.send_notification_to_user(
                user=request.user,
                title=title,
                body=body,
                click_action=click_action,
                data={'test': True, 'type': 'TEST'},
                save_to_db=True
            )
            
            if success:
                return Response({
                    'success': True,
                    'message': 'Test notification sent successfully'
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Failed to send notification. Make sure you have at least one registered device.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)