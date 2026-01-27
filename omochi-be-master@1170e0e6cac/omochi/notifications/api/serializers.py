from rest_framework import serializers
from omochi.notifications.models import Notification, SystemNotificationReadStatus
from omochi.users.models import FCMToken
from omochi.common.multilingual_service import MultilingualSerializerMixin

class NotificationSerializer(MultilingualSerializerMixin, serializers.ModelSerializer):
    """Serializer for notifications with dynamic status for broadcast notifications"""

    title_en = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    message_en = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = ('id', 'user', 'title', 'title_en', 'message', 'message_en',
                   'type', 'status', 'created_at', 'reference_id', 'reference_type',
                  'image_url', 'click_action', 'is_broadcast')
        read_only_fields = ('id', 'created_at', 'is_broadcast')
    
    def get_status(self, obj):
        """
        Get the read status for this notification.
        
        For broadcast notifications, checks SystemNotificationReadStatus for the current user.
        For personal notifications, returns the status field directly.
        
        Note: Uses prefetched read_statuses when available to avoid N+1 queries.
        """
        if obj.is_broadcast:
            request = self.context.get('request')
            if not request or not request.user:
                return 'UNREAD'
            
            # Use prefetched data if available, otherwise query database
            if hasattr(obj, '_prefetched_objects_cache') and 'read_statuses' in obj._prefetched_objects_cache:
                for read_status in obj.read_statuses.all():
                    if read_status.user_id == request.user.id:
                        return 'READ' if read_status.is_read else 'UNREAD'
                return 'UNREAD'
            else:
                try:
                    read_status = SystemNotificationReadStatus.objects.get(
                        user=request.user,
                        notification=obj
                    )
                    return 'READ' if read_status.is_read else 'UNREAD'
                except SystemNotificationReadStatus.DoesNotExist:
                    return 'UNREAD'
        else:
            return obj.status


class NotificationReadStatusSerializer(serializers.ModelSerializer):
    """Serializer for updating notification read status"""
    
    class Meta:
        model = Notification
        fields = ('status',)


# FCM Token Serializers

class FCMTokenSerializer(serializers.ModelSerializer):
    """Serializer for FCM tokens"""
    
    class Meta:
        model = FCMToken
        fields = ['id', 'token', 'device_type', 'device_id', 'is_active', 'created_at', 'last_used']
        read_only_fields = ['id', 'is_active', 'created_at', 'last_used']


class FCMTokenRegistrationSerializer(serializers.Serializer):
    """Serializer for registering FCM tokens"""
    
    token = serializers.CharField(max_length=500, required=True)
    device_type = serializers.ChoiceField(
        choices=FCMToken.DEVICE_TYPE_CHOICES,
        default='WEB'
    )
    device_id = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    def validate_token(self, value):
        if not value or len(value.strip()) < 10:
            raise serializers.ValidationError("Invalid FCM token")
        return value.strip()


class NotificationTestSerializer(serializers.Serializer):
    """Serializer for testing push notifications"""
    
    title = serializers.CharField(max_length=100)
    body = serializers.CharField(max_length=500)
    click_action = serializers.URLField(required=False)