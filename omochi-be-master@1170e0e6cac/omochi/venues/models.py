import uuid

from django.conf import settings
from django.db import models
from omochi.common.utils import (
    AbsoluteURLMixin, 
    validate_announcement_length, 
    validate_question_length
)


class Venue(AbsoluteURLMixin, models.Model):
    STRIPE_ACCOUNT_STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('CREATED', 'Created'),
        ('VERIFIED', 'Verified'),
        ('RESTRICTED', 'Restricted'),
        ('REJECTED', 'Rejected'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    name_en = models.CharField(blank=True, null=True, verbose_name="Name (English)")
    address = models.TextField()
    address_en = models.TextField(blank=True, null=True, verbose_name="Address (English)")
    description = models.TextField(blank=True, null=True)
    description_en = models.TextField(blank=True, null=True, verbose_name="Description (English)")
    announcement = models.TextField(blank=True, null=True, validators=[validate_announcement_length])
    announcement_en = models.TextField(blank=True, null=True, verbose_name="Announcement (English)")
    phone_number = models.CharField(max_length=15, default="")
    email = models.EmailField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    opening_time = models.TimeField(blank=True, null=True)
    closing_time = models.TimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    enable_cash_payment = models.BooleanField(default=True)
    enable_online_payment = models.BooleanField(default=False)
    additional_info = models.CharField(max_length=255, blank=True, null=True)
    additional_info_en = models.CharField(blank=True, null=True, verbose_name="Additional Info (English)")
    genre = models.CharField(max_length=255, blank=True, null=True)
    genre_en = models.CharField(blank=True, null=True, verbose_name="Genre (English)")
    enable_reservation = models.BooleanField(default=True)
    enable_eat_in = models.BooleanField(default=True)
    enable_take_out = models.BooleanField(default=True)
    enable_order_questions = models.BooleanField(default=False)
    logo = models.ImageField(upload_to="venue_logos/", blank=True, null=True)
    qr_code = models.TextField(blank=True, null=True)
    buffer_time = models.IntegerField(default=15)
    nearest_station = models.CharField(max_length=255, blank=True, null=True)
    nearest_station_en = models.CharField(blank=True, null=True, verbose_name="Nearest Station (English)")
    is_partner = models.BooleanField(default=True, verbose_name="Is Partner")
    
    # Stripe Connect fields
    stripe_account_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_account_status = models.CharField(
        max_length=20,
        choices=STRIPE_ACCOUNT_STATUS_CHOICES,
        default='PENDING'
    )
    onboarding_complete = models.BooleanField(default=False)
    payout_enabled = models.BooleanField(default=False)
    charges_enabled = models.BooleanField(default=False)
    custom_platform_fee_amount = models.IntegerField(
        null=True,
        blank=True,
        help_text="Absolute application fee amount in JPY for takeout orders"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "venue"

    def __str__(self):
        return self.name
    
    def clean(self):
        super().clean()
        if not self.enable_cash_payment and not self.enable_online_payment:
            self.enable_cash_payment = True


class VenueManager(models.Model):
    ROLE_CHOICES = (
        ("OWNER", "Owner"),
        ("MANAGER", "Manager"),
        ("STAFF", "Staff"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="managed_venues",
    )
    venue = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name="managers",
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="STAFF",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "venue")
        db_table = "venue_manager"

    def __str__(self):
        return f"{self.user} - {self.venue} ({self.role})"


class StockedVenue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stocked_venues",
    )
    venue = models.ForeignKey(
        Venue, on_delete=models.CASCADE, related_name="stocked_by"
    )
    date_added = models.DateTimeField(auto_now_add=True)
    is_favorite = models.BooleanField(default=False)

    class Meta:
        unique_together = ("user", "venue")
        db_table = "stocked_venue"

    def __str__(self):
        return f"{self.user} - {self.venue}"


class VenueQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    venue = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name="questions"
    )
    question = models.CharField(
        max_length=255,
        validators=[validate_question_length],
        help_text="Question (max 255 characters)"
    )
    question_en = models.CharField(
        blank=True,
        null=True,
        verbose_name="Question (English)",
    )
    ordinal = models.PositiveIntegerField(
        default=0,
        help_text="Order of the question (lower numbers appear first)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "venue_question"
        ordering = ['ordinal', 'created_at']
        unique_together = ("venue", "question")

    def __str__(self):
        return f"{self.venue.name} - {self.question}"
