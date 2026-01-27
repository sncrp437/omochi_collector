import uuid
from django.db import models
from django.conf import settings
from omochi.orders.models import Order


class PaymentTransaction(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('REFUNDED', 'Refunded'),
        ('CANCELLED', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='payment_transactions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_transactions',
        null=True,
        blank=True,
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    stripe_payment_intent_id = models.CharField(max_length=100, blank=True, null=True)
    stripe_checkout_session_id = models.CharField(max_length=100, blank=True, null=True)
    stripe_transfer_id = models.CharField(max_length=100, blank=True, null=True)
    application_fee_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    return_url = models.URLField(blank=True, null=True)
    expired_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'payment_transaction'
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.id} - Order {self.order.id} - {self.amount} - {self.status}"