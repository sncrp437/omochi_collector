import uuid

from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

from omochi.venues.models import Venue


class RefLog(models.Model):
    """
    Model to log reference actions across the application.
    """
    ACTION_TYPE_CHOICES = (
        ('REGISTRATION', 'Registration'),
        ('STOCKED_VENUE', 'Stocked Venue'),
        ('ORDER', 'Order'),
        ('CLICK', 'Click'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='ref_logs',
        null=True,
        blank=True,
    )
    ref_id = models.CharField(
        max_length=255, 
        help_text=_("The ID of the referrer user or referral code")
    )
    venue = models.ForeignKey(
        Venue, 
        on_delete=models.SET_NULL, 
        related_name='ref_logs', 
        null=True, 
        blank=True
    )
    action_type = models.CharField(
        max_length=20, 
        choices=ACTION_TYPE_CHOICES,
        help_text=_("Type of action that was referred")
    )
    action_id = models.CharField(
        max_length=255,
        help_text=_("ID of the related action (order ID, registration ID, etc.)")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    data = models.JSONField(
        null=True, 
        blank=True, 
        help_text=_("Additional data related to the reference action")
    )

    class Meta:
        db_table = 'ref_log'
        ordering = ['-created_at']
        verbose_name = _("Reference Log")
        verbose_name_plural = _("Reference Logs")

    def __str__(self):
        return f"Ref Log: {self.action_type} by {self.user} with ref {self.ref_id}"
