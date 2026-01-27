import random
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from omochi.menus.models import MenuItem
from omochi.reservations.models import Reservation, TimeSlot
from omochi.system_setting.services import SystemSettingService
from omochi.venues.models import Venue
from omochi.common.utils import validate_answer_length
from django.utils.translation import gettext_lazy as _


class Order(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('PREPARING', 'Preparing'),
        ('READY', 'Ready'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    ORDER_TYPE_CHOICES = (
        ('TAKEOUT', 'Takeout'),
        ('DINE_IN', 'Dine In'),
    )

    PAYMENT_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('FAILED', 'Failed'),
    )

    PAYMENT_METHOD_CHOICES = (
        ('CASH', 'Cash'),
        ('ONLINE', 'Online'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='orders',
        null=True,
        blank=True,
    )
    venue = models.ForeignKey(
        Venue, on_delete=models.SET_NULL, related_name='orders', null=True, blank=True
    )
    time_slot = models.ForeignKey(
        TimeSlot,
        on_delete=models.SET_NULL,
        related_name='orders',
        blank=True,
        null=True,
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    party_size = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PENDING'
    )
    order_type = models.CharField(max_length=10, choices=ORDER_TYPE_CHOICES)
    order_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    order_discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00
    )
    application_fee_discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00
    )
    payment_status = models.CharField(
        max_length=10, choices=PAYMENT_STATUS_CHOICES, default='PENDING'
    )
    payment_method = models.CharField(
        max_length=15, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True
    )
    pickup_time = models.DateTimeField(blank=True, null=True)
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='orders',
    )
    note = models.TextField(blank=True, null=True)
    order_code = models.CharField(
        max_length=10, unique=True,
    )
    takeout_fee_subsidized_amount = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    application_fee_amount = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    application_fee_tax_rate = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    total = models.DecimalField(max_digits=10, decimal_places=2)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'order'

    def __str__(self):
        return f"Order {self.id} - {self.venue.name}"
        
    @property
    def time_slot_start_datetime(self):
        """
        Get the start datetime of the order based on time slot.
        If there's no time slot or the time slot doesn't have a start_time, returns None.
        Converts from JST to UTC by subtracting 9 hours.
        """
        import datetime
        import pytz
        from django.utils import timezone

        if not self.time_slot:
            return None
            
        # Get today's date or the order date if available in Japan timezone
        jst_timezone = pytz.timezone('Asia/Tokyo')
        current_date = self.order_date.astimezone(jst_timezone).date()
        
        # Create a datetime object combining the date with the time slot's start time
        slot_start_time = self.time_slot.start_time
        
        if not slot_start_time:
            return None
            
        jst_datetime = datetime.datetime.combine(current_date, slot_start_time)
        jst_datetime = jst_timezone.localize(jst_datetime)
        
        # Convert to UTC by subtracting 9 hours
        utc_datetime = jst_datetime.astimezone(pytz.UTC)
        
        return utc_datetime

    def save_status_history(self, old_status, new_status, user=None):
        OrderStatusHistory.objects.create(
            order=self,
            old_status=old_status,
            new_status=new_status,
            changed_by=user,
        )

    def generate_order_code(self):
        while True:
            random_number = f"{random.randint(0, 999):03}"
            order_type_code = 'T' if self.order_type == 'TAKEOUT' else 'E'
            order_code = f"{random_number}{order_type_code}"
            if not Order.objects.filter(order_code=order_code).exists():
                return order_code

    def save(self, *args, **kwargs):
        if not self.order_code:
            self.order_code = self.generate_order_code()
        super().save(*args, **kwargs)

    def summarize_order(self, user_coupon=None):

        self.total_amount = sum(item.subtotal for item in self.items.all())
        self.apply_coupon(user_coupon)
        self.apply_fee()

        return self

    def apply_coupon(self, user_coupon):
        self.order_discount_amount = 0
        self.application_fee_discount_amount = 0

        if user_coupon is None:
            return
    
        if user_coupon.is_used:
            raise ValidationError("Coupon has already been used.")
    
        user_coupon.is_used = True
        user_coupon.order = self
        user_coupon.used_at = self.order_date

        venue = self.venue

        coupon = user_coupon.coupon

        if coupon.type == 'SERVICE_FEE':
            system_application_fee_amount = SystemSettingService.get_application_fee_amount()
            application_fee_tax_rate = SystemSettingService.get_application_fee_tax_rate()
            if self.order_type != 'TAKEOUT':
                raise ValidationError(_("This coupon for free application fee cannot be applied to this type of order."))
            if venue.custom_platform_fee_amount is not None:
                discounted_amount = min(system_application_fee_amount, venue.custom_platform_fee_amount)
                self.application_fee_discount_amount = int(discounted_amount + application_fee_tax_rate * discounted_amount)
            else:
                self.application_fee_discount_amount = int(system_application_fee_amount + application_fee_tax_rate * system_application_fee_amount)
        else:
            if coupon.value_type == 'FIXED_AMOUNT':
                self.order_discount_amount = min(coupon.amount, self.total_amount)
            elif coupon.value_type == 'PERCENT':
                self.order_discount_amount = min((self.total_amount * coupon.amount) / 100, self.total_amount)
        
        user_coupon.discount_amount = self.order_discount_amount + self.application_fee_discount_amount
        user_coupon.save()


    def apply_fee(self):
        self.application_fee_tax_rate = SystemSettingService.get_application_fee_tax_rate()
        application_fee_amount = SystemSettingService.get_application_fee_amount() + round(self.application_fee_tax_rate * SystemSettingService.get_application_fee_amount())
        self.takeout_fee_subsidized_amount = 0

        if self.order_type == 'TAKEOUT':
            self.application_fee_amount = application_fee_amount
            venue_service_fee = self.venue.custom_platform_fee_amount
            if venue_service_fee is not None:
                # Apply tax to the venue's custom platform fee and take the minimum
                self.takeout_fee_subsidized_amount = min(round(venue_service_fee * (1 + self.application_fee_tax_rate)), application_fee_amount)
            else:
                # This should be just application_fee_amount since tax is already included
                self.takeout_fee_subsidized_amount = application_fee_amount

        # elif self.order_type == 'DINE_IN' and self.payment_method == 'ONLINE':
        #     # Multiply the application fee (which already includes tax) by party size
        #     self.application_fee_amount = application_fee_amount * self.party_size
        else:
            self.application_fee_amount = 0

        self.total = self.total_amount - self.order_discount_amount + self.takeout_fee_subsidized_amount - self.application_fee_discount_amount

        return self


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order, on_delete=models.DO_NOTHING, related_name='items'
    )
    menu_item = models.ForeignKey(MenuItem, on_delete=models.DO_NOTHING)
    quantity = models.PositiveIntegerField(default=1)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    special_request = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'order_item'
        verbose_name_plural = 'Order Items - Old'

    def __str__(self):
        return (
            f"{self.quantity}x {self.menu_item.name} - Order {self.order.id}"
        )


class OrderStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order, on_delete=models.DO_NOTHING, related_name='status_history'
    )
    old_status = models.CharField(max_length=20, choices=Order.STATUS_CHOICES)
    new_status = models.CharField(max_length=20, choices=Order.STATUS_CHOICES)
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='status_changes',
    )

    class Meta:
        db_table = 'order_status_history'
        ordering = ['-changed_at']

    def __str__(self):
        return (
            f"Order {self.order.id}: {self.old_status} -> {self.new_status} "
            f"at {self.changed_at}"
        )


class OrderItemsMerged(models.Model):
    """
    Model representing the unified_line_items_view for Django admin integration.
    This is an unmanaged model that maps to the SQL view.
    """
    RECORD_TYPE_CHOICES = (
        ('Reservation', 'Reservation'),
        ('Order', 'Order'),
    )
    
    # Primary key field
    id = models.TextField(primary_key=True)
    
    # ID fields
    order_item_id = models.TextField(null=True, blank=True)
    order_id = models.TextField(null=True, blank=True)
    reservation_id = models.TextField(null=True, blank=True)
    
    # Code fields
    order_code = models.CharField(max_length=10, null=True, blank=True)
    reservation_code = models.CharField(max_length=10, null=True, blank=True)
    
    # Common fields
    order_date = models.DateTimeField(null=True, blank=True)
    user_id = models.UUIDField(null=True, blank=True)
    venue_id = models.UUIDField(null=True, blank=True)
    order_type = models.CharField(max_length=10, null=True, blank=True)
    payment_method = models.CharField(max_length=15, null=True, blank=True)
    status = models.CharField(max_length=20, null=True, blank=True)
    party_size = models.PositiveIntegerField(null=True, blank=True)
    time_slot_id = models.UUIDField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    application_fee_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    takeout_fee_subsidized_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Order Item specific fields
    menu_item_id = models.UUIDField(null=True, blank=True)
    quantity = models.PositiveIntegerField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    special_request = models.TextField(null=True, blank=True)
    
    # User details from unified user_id
    user_email = models.EmailField(null=True, blank=True)
    
    # Venue details from unified venue_id (only venue name needed for admin display)
    venue_name = models.CharField(max_length=255, null=True, blank=True)

    # Record type indicator
    record_type = models.CharField(max_length=25, choices=RECORD_TYPE_CHOICES)

    class Meta:
        managed = False  # This tells Django not to manage this table
        db_table = 'order_items_merge_view'
        verbose_name = 'Order Item Merge'
        verbose_name_plural = 'Order Items'

    def __str__(self):
        if self.record_type == 'Order' and self.order_item_id:
            return f"Order Item {self.order_item_id} - Order {self.order_id}"
        elif self.record_type == 'Order':
            return f"Order {self.order_id}"
        else:
            return f"Reservation {self.reservation_id}"


class OrderQuestion(models.Model):
    """
    Model to store venue questions and answers with orders.
    Questions are stored as text (not by ID reference) to preserve historical data
    even if the venue questions change later.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Foreign key to the order
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='order_questions'
    )
    
    # Store question text directly (not by reference) to preserve historical data
    question = models.CharField(
        max_length=255,
        help_text="Question text at the time of order (Japanese)"
    )
    
    question_en = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Question text at the time of order (English)"
    )
    
    # Customer's answer to the question
    answer = models.TextField(
        validators=[validate_answer_length],
        help_text="Customer's answer to the question (max 50 characters)"
    )
    
    # English translation of the answer
    answer_en = models.TextField(
        blank=True,
        null=True,
        validators=[validate_answer_length],
        help_text="Customer's answer to the question (English, max 50 characters)"
    )
    
    # Order in which the question was presented
    order_index = models.PositiveIntegerField(
        default=0,
        help_text="Order of the question as it was presented to the customer"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "order_question"
        ordering = ['order_index', 'created_at']
        # Ensure questions are unique per order by index
        unique_together = ("order", "order_index")

    def __str__(self):
        return f"Order {self.order.order_code} - Q{self.order_index}: {self.question[:50]}"
