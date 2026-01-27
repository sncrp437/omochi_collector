import uuid
from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPE_CHOICES = (
        ('ORDER_STATUS', 'Order Status'),
        ('RESERVATION', 'Reservation'),
        ('SYSTEM', 'System'),
        ('TIME_SLOT_AVAILABLE', 'Time Slot Available'),
    )
    
    STATUS_CHOICES = (
        ('UNREAD', 'Unread'),
        ('READ', 'Read'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        null=True,
        blank=True,
        help_text="User who receives this notification. NULL for broadcast notifications"
    )
    title = models.CharField(max_length=255)
    title_en = models.CharField(max_length=255, blank=True, null=True, verbose_name="Title (English)")
    message = models.TextField()
    message_en = models.TextField(blank=True, null=True, verbose_name="Message (English)")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(
        max_length=10, 
        choices=STATUS_CHOICES, 
        default='UNREAD',
        help_text="Read status. For broadcast notifications, this is default value (actual status tracked per-user via SystemNotificationReadStatus)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reference_id = models.UUIDField(blank=True, null=True)
    reference_type = models.CharField(max_length=50, blank=True, null=True)
    # image_url are fetched dynamically based on venue logos
    image_url = models.URLField(max_length=500, blank=True, null=True)
    click_action = models.URLField(max_length=500, blank=True, null=True)
    
    # New field for broadcast notifications sent to all users via Firebase Topic
    is_broadcast = models.BooleanField(
        default=False,
        help_text="True if this is a broadcast notification sent via Firebase Topic to all users. "
                  "Broadcast notifications have user=NULL and are shown to all non-venuer users dynamically."
    )
    
    class Meta:
        ordering = ['-created_at']
        db_table = 'notification'
        verbose_name = 'Admin Notification'
        verbose_name_plural = 'Admin Notifications'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['is_broadcast', 'created_at']),
        ]
    
    def __str__(self):
        if self.is_broadcast:
            return f"[BROADCAST] {self.title}"
        return f"{self.title} - {self.user.email if self.user else 'N/A'}"


class SystemNotificationReadStatus(models.Model):
    """
    Track read status for broadcast (system) notifications per user.
    This allows us to store only 1 notification record for all users,
    while tracking individual read status efficiently.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='system_notification_read_statuses'
    )
    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name='read_statuses',
        help_text="The broadcast notification this read status belongs to"
    )
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'system_notification_read_status'
        verbose_name = 'System Notification Read Status'
        verbose_name_plural = 'System Notification Read Statuses'
        unique_together = [['user', 'notification']]
        indexes = [
            models.Index(fields=['user', 'notification']),
            models.Index(fields=['notification', 'is_read']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.notification.title} - {'Read' if self.is_read else 'Unread'}"
