import logging

from django import forms
from django.conf import settings
from django.contrib import admin, messages
from django.contrib.admin.helpers import AdminForm
from django.db import transaction
from django.shortcuts import redirect, render
from django.urls import path
from django.utils.html import format_html

from omochi.users.models import User
from .models import Notification, SystemNotificationReadStatus
from .services import FirebaseNotificationService

logger = logging.getLogger(__name__)


class SendNotificationForm(forms.Form):
    """Form for sending notifications to all users (excluding venuers)"""
    
    title = forms.CharField(
        label='Title - Japanese',
        max_length=255,
        help_text='Required: Notification title in Japanese'
    )
    
    title_en = forms.CharField(
        label='Title - English',
        max_length=255,
        required=False,
        help_text='Optional: Notification title in English'
    )
    
    message = forms.CharField(
        label='Message - Japanese',
        widget=forms.Textarea(attrs={'rows': 4}),
        help_text='Required: Notification message in Japanese'
    )
    
    message_en = forms.CharField(
        label='Message - English',
        required=False,
        widget=forms.Textarea(attrs={'rows': 4}),
        help_text='Optional: Notification message in English'
    )
    
    click_action = forms.URLField(
        label='Click Action URL',
        required=False,
        initial=settings.FRONTEND_URL,
        help_text=f'Optional: URL to open when notification is clicked (default: {settings.FRONTEND_URL})'
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title_display', 'title_en_display', 'user_display', 'type', 'status_badge', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('title', 'title_en', 'message', 'message_en', 'user__email')
    readonly_fields = (
        'id', 'user', 'type', 'status', 'title', 'title_en', 
        'message', 'message_en', 'click_action', 'image_url', 
        'reference_type', 'reference_id', 'is_broadcast', 'created_at'
    )
    ordering = ('-created_at',)
    change_list_template = 'admin/notifications/notification/change_list.html'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'user', 'type', 'status', 'is_broadcast')
        }),
        ('Content - Japanese', {
            'fields': ('title', 'message')
        }),
        ('Content - English', {
            'fields': ('title_en', 'message_en')
        }),
        ('Additional Information', {
            'fields': (
                'click_action', 'image_url', 'reference_type', 
                'reference_id', 'created_at'
            )
        }),
    )
    
    def title_display(self, obj):
        """Display truncated title"""
        if len(obj.title) > 50:
            return format_html(
                '<span title="{}">{}</span>',
                obj.title,
                obj.title[:50] + '...'
            )
        return obj.title
    title_display.short_description = 'Title'
    title_display.admin_order_field = 'title'
    
    def title_en_display(self, obj):
        """Display truncated English title"""
        if not obj.title_en:
            return '-'
        if len(obj.title_en) > 50:
            return format_html(
                '<span title="{}">{}</span>',
                obj.title_en,
                obj.title_en[:50] + '...'
            )
        return obj.title_en
    title_en_display.short_description = 'Title (EN)'
    title_en_display.admin_order_field = 'title_en'
    
    def user_display(self, obj):
        """Display user or BROADCAST label"""
        if obj.is_broadcast:
            return format_html('<span style="color: #0066cc; font-weight: bold;">ALL</span>')
        return obj.user.email if obj.user else 'N/A'
    user_display.short_description = 'User'
    user_display.admin_order_field = 'user'
    
    def has_add_permission(self, request):
        """Hide 'Add Admin Notification' button"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Disable delete permission"""
        return False
    
    def status_badge(self, obj):
        """Display status with color badge - for broadcast notifications show '-' """
        if obj.is_broadcast:
            return format_html('<span style="color: #999;">-</span>')
        
        if obj.status == 'READ':
            color = '#28a745'
            icon = '✓'
        else:  # UNREAD
            color = '#e05260'
            icon = '●'
        
        return format_html(
            '<span style="display: inline-block; padding: 4px 12px; color: {};">'
            '{} {}</span>',
            color, icon, obj.status
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    def get_queryset(self, request):
        """Show only SYSTEM type notifications"""
        qs = super().get_queryset(request)
        return qs.filter(type='SYSTEM')
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                'send-notification/',
                self.admin_site.admin_view(self.send_notification_view),
                name='notifications_notification_send',
            ),
        ]
        return custom_urls + urls
    
    def send_notification_view(self, request):
        """View for sending notifications to all users (excluding venuers)"""
        if request.method == 'POST':
            return self._handle_notification_send(request)
        
        form = SendNotificationForm()
        return self._render_notification_form(request, form)
    
    def _handle_notification_send(self, request):
        """
        Send notification to all current users via Firebase Topic.
        
        Creates a single broadcast notification record. User eligibility is determined
        by comparing notification.created_at with user.date_joined to ensure only
        users who existed at send time receive the notification.
        
        Read status records are created lazily when users mark notifications as read.
        """
        form = SendNotificationForm(request.POST)
        if not form.is_valid():
            return self._render_notification_form(request, form)
        
        title = form.cleaned_data['title']
        title_en = form.cleaned_data['title_en']
        message = form.cleaned_data['message']
        message_en = form.cleaned_data['message_en']
        click_action = form.cleaned_data['click_action'] or settings.FRONTEND_URL
        
        # Count eligible users for reporting only (non-venue managers, active)
        user_count = User.objects.filter(
            is_active=True,
            managed_venues__isnull=True
        ).distinct().count()
        
        if user_count == 0:
            messages.warning(request, 'No eligible users found to send notification.')
            return redirect('admin:notifications_notification_changelist')
        
        # Send real-time notification via Firebase Topics (language-specific)
        # Note: Venue managers are automatically excluded from these topics via:
        # - Token registration (FCMToken.register_token)
        # - VenueManager signals (unsubscribe/resubscribe)
        # - API queryset filtering
        notification_service = FirebaseNotificationService()
        
        # Get language-specific topics
        topic_ja = getattr(settings, 'FIREBASE_TOPIC_JA', 'all-users-ja')
        topic_en = getattr(settings, 'FIREBASE_TOPIC_EN', 'all-users-en')
        
        # Send Japanese notification to Japanese users
        success_ja = notification_service.send_to_topic(
            topic=topic_ja,
            title=title,  # Japanese title
            body=message,  # Japanese message
            data={'type': 'system'},
            click_action=click_action
        )
        
        # Send English notification to English users (if English content provided)
        success_en = True  # Default to true if no English content
        if title_en and message_en:
            success_en = notification_service.send_to_topic(
                topic=topic_en,
                title=title_en,  # English title
                body=message_en,  # English message
                data={'type': 'system'},
                click_action=click_action
            )
        else:
            # If no English content, send Japanese to English users as fallback
            logger.warning("No English content provided, sending Japanese to English users")
            success_en = notification_service.send_to_topic(
                topic=topic_en,
                title=title,  # Japanese title as fallback
                body=message,  # Japanese message as fallback
                data={'type': 'system'},
                click_action=click_action
            )
        
        # Check if at least one topic succeeded
        if not success_ja and not success_en:
            messages.error(request, 'Failed to send notification to both language topics.')
            return redirect('admin:notifications_notification_changelist')
        elif not success_ja:
            messages.warning(request, 'Failed to send notification to Japanese users topic.')
        elif not success_en:
            messages.warning(request, 'Failed to send notification to English users topic.')
        
        # Create broadcast notification record
        # User eligibility determined by created_at timestamp
        try:
            broadcast_notification = Notification.objects.create(
                user=None,
                title=title,
                title_en=title_en or '',
                message=message,
                message_en=message_en or '',
                type='SYSTEM',
                status='UNREAD',
                click_action=click_action,
                is_broadcast=True  # Mark as broadcast notification
            )
            
            logger.info(
                f"Created broadcast notification {broadcast_notification.id}. "
                f"Only users created before {broadcast_notification.created_at} will see it. "
                f"Estimated {user_count} eligible users."
            )
        except Exception as e:
            logger.error(f"Failed to create broadcast notification: {str(e)}")
            messages.error(request, f'Notification sent but failed to save to database: {str(e)}')
            return redirect('admin:notifications_notification_changelist')
        
        messages.success(
            request,
            f'Notification sent successfully to ~{user_count} users! '
        )
        
        return redirect('admin:notifications_notification_changelist')
    
    def _render_notification_form(self, request, form):
        """Render the notification form with Django admin styling"""
        adminForm = AdminForm(
            form,
            [(None, {'fields': list(form.fields.keys())})],
            {},
            model_admin=self
        )
        
        context = {
            **self.admin_site.each_context(request),
            'title': 'Send Notification to All Users',
            'adminform': adminForm,
            'form': form,
            'opts': self.model._meta,
            'has_view_permission': True,
            'has_add_permission': True,
            'has_change_permission': True,
            'has_delete_permission': False,
            'media': self.media + adminForm.media,
            'add': True,
            'change': False,
            'is_popup': False,
            'save_as': False,
            'show_save': True,
            'show_save_and_continue': False,
            'show_save_and_add_another': False,
            'show_delete': False,
            'has_editable_inline_admin_formsets': False,
            'inline_admin_formsets': [],
            'errors': adminForm.form.errors,
            'preserved_filters': self.get_preserved_filters(request),
        }
        
        return render(request, 'admin/change_form.html', context)



