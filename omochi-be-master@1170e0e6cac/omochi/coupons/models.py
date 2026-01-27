import uuid
from enum import Enum

from django.conf import settings
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django_softdelete.models import SoftDeleteModel

from omochi.orders.models import Order
from omochi.venues.models import Venue


class CouponType(models.TextChoices):
    SERVICE_FEE = 'SERVICE_FEE', 'Service Fee'
    VENUE = 'VENUE', 'Issued by Venue'
    CAMPAIGN = 'CAMPAIGN', 'Campaign by Omochi'


class Coupon(SoftDeleteModel):
    COUPON_TYPE_CHOICES = CouponType.choices

    PAID_BY_CHOICES = (
        ('OMOCCHI', 'Omochi'),
        ('VENUE', 'Venue'),
    )

    VALUE_TYPE_CHOICES = (
        ('FIXED_AMOUNT', 'Fixed Amount'),
        ('PERCENT', 'Percent'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    venue = models.ForeignKey(
        Venue,
        on_delete=models.DO_NOTHING,
        related_name='coupons',
        null=True,
        blank=True,
    )
    type = models.CharField(
        max_length=20, choices=CouponType.choices, default=CouponType.VENUE
    )
    value_type = models.CharField(
        max_length=15, choices=VALUE_TYPE_CHOICES, default='FIXED_AMOUNT'
    )
    amount = models.DecimalField(max_digits=15, decimal_places=0)
    expiry_date = models.DateTimeField(blank=True, null=True)
    payment_method = ArrayField(
        models.CharField(max_length=15, choices=Order.PAYMENT_METHOD_CHOICES),
        blank=True,
        null=True,
        help_text="Add payment methods (CASH, ONLINE) separate by commas.",
    )
    order_type = ArrayField(
        models.CharField(max_length=10, choices=Order.ORDER_TYPE_CHOICES),
        blank=True,
        null=True,
        help_text="Add order types (TAKEOUT, DINE_IN) separate by commas.",
    )

    paid_by = models.CharField(
        max_length=10, choices=PAID_BY_CHOICES, default='VENUE'
    )
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'coupon'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.id} - {self.type} - {self.value_type}"


class UserCoupon(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        related_name='user_coupons',
    )
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.DO_NOTHING,
        related_name='user_coupons',
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.DO_NOTHING,
        related_name='user_coupons',
        blank=True,
        null=True,
    )
    used_at = models.DateTimeField(blank=True, null=True)
    is_used = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        related_name='created_user_coupons',
        blank=True,
        null=True,
    )
    expiry_date = models.DateTimeField(blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    discount_amount = models.DecimalField(
        max_digits=15, decimal_places=0, default=0
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.expiry_date is None and self.coupon.expiry_date is not None:
            self.expiry_date = self.coupon.expiry_date
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'user_coupon'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.id} - {self.coupon.type} - {self.user}"
