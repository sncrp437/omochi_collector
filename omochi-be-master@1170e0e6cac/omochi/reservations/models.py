import random
import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
from django_softdelete.models import SoftDeleteModel
from omochi.common.utils import get_timezone_date, get_day_utc_range, validate_answer_length

from omochi.venues.models import Venue


class TimeSlot(SoftDeleteModel):
    SERVICE_TYPE_CHOICES = (
        ("TAKEOUT", "Takeout"),
        ("DINE_IN", "Dine In"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    venue = models.ForeignKey(
        Venue, on_delete=models.DO_NOTHING, related_name="time_slots"
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_interval = models.IntegerField(
        help_text="Interval in minutes", default=30
    )
    max_reservations = models.IntegerField(default=1)
    priority_pass_slot = models.IntegerField(default=0, help_text="Number of priority pass slots")
    is_paused = models.BooleanField(
        default=False, help_text="Time frame pause status"
    )
    service_type = models.CharField(
        max_length=25,
        choices=SERVICE_TYPE_CHOICES,
        default="DINE_IN",
    )

    class Meta:
        db_table = "time_slot"

    def __str__(self):
        return f"{self.venue.name} - {self.start_time}-{self.end_time}"

    @property
    def temporary_additional_limit(self):
        today = get_timezone_date('Asia/Tokyo')
        daily_limit = self.daily_limits.filter(date=today).first()
        return daily_limit.temporary_additional_limit if daily_limit else 0

    @property
    def remaining_slots(self):
        today = get_timezone_date('Asia/Tokyo')

        if self.service_type == "DINE_IN":
            current_party_size = (
                self.reservations.filter(date=today)
                .exclude(Q(status="CANCELLED") | Q(status="COMPLETED"))
                .aggregate(total_party_size=Coalesce(Sum("party_size"), 0))
                .get("total_party_size", 0)
            )
            return (
                self.max_reservations
                + self.temporary_additional_limit
                - current_party_size
            )
        elif self.service_type == "TAKEOUT":
            # Get start and end of day in UTC
            start_of_day_utc, end_of_day_utc = get_day_utc_range('Asia/Tokyo', today)

            # Filter by order_date between UTC start and end
            takeout_order_count = (
                self.orders.filter(
                    Q(order_date__gte=start_of_day_utc) & 
                    Q(order_date__lt=end_of_day_utc) & 
                    Q(order_type="TAKEOUT")
                )
                .exclude(Q(status="CANCELLED") | Q(status="COMPLETED"))
                .count()
            )

            return (
                self.max_reservations
                + self.temporary_additional_limit
                - takeout_order_count
            )
        return 0

    @property
    def total_current_limit(self):
        """
        Calculate current limit.
        """
        return self.max_reservations + self.temporary_additional_limit

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)


class TimeSlotDailyLimit(models.Model):
    time_slot = models.ForeignKey(
        TimeSlot, on_delete=models.DO_NOTHING, related_name="daily_limits"
    )
    date = models.DateField(auto_now_add=True)
    temporary_additional_limit = models.IntegerField(default=0)

    class Meta:
        db_table = "time_slot_daily_limit"
        unique_together = ("time_slot", "date")

    def __str__(self):
        return f"{self.time_slot} - {self.date} - Additional Limit: {self.temporary_additional_limit}"


class Reservation(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('PREPARING', 'Preparing'),
        ('READY', 'Ready'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    venue = models.ForeignKey(
        Venue, on_delete=models.DO_NOTHING, related_name="reservations"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.DO_NOTHING,
        related_name="reservations",
    )
    time_slot = models.ForeignKey(
        TimeSlot, on_delete=models.DO_NOTHING, related_name="reservations"
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    party_size = models.PositiveIntegerField()
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="PENDING"
    )
    table_preference = models.CharField(max_length=100, blank=True, null=True)
    reservation_code = models.CharField(
        max_length=10, unique=True, blank=True, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reservation"

    def __str__(self):
        return f"{self.venue.name} - {self.date} {self.start_time}-{self.end_time} - {self.user.email}"

    def save_status_history(self, old_status, new_status, user):
        ReservationStatusHistory.objects.create(
            reservation=self,
            old_status=old_status,
            new_status=new_status,
            changed_by=user,
        )

    def generate_reservation_code(self):
        while True:
            random_number = f"{random.randint(0, 999):03}"
            reservation_code = f"{random_number}E"
            if not Reservation.objects.filter(
                reservation_code=reservation_code
            ).exists():
                return reservation_code

    def save(self, *args, **kwargs):
        if not self.reservation_code:
            self.reservation_code = self.generate_reservation_code()
        super().save(*args, **kwargs)


class ReservationStatusHistory(models.Model):
    """
    Model to track the status history of a reservation
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.DO_NOTHING,
        related_name="status_history",
    )
    old_status = models.CharField(
        max_length=10, choices=Reservation.STATUS_CHOICES
    )
    new_status = models.CharField(
        max_length=10, choices=Reservation.STATUS_CHOICES
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reservation_status_changes",
    )

    class Meta:
        db_table = "reservation_status_history"
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.reservation} - {self.old_status} -> {self.new_status} at {self.changed_at}"


class ReservationQuestion(models.Model):
    """
    Model to store venue questions and answers with reservations.
    Questions are stored as text (not by ID reference) to preserve historical data
    even if the venue questions change later.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Foreign key to the reservation
    reservation = models.ForeignKey(
        Reservation,
        on_delete=models.CASCADE,
        related_name="reservation_questions",
    )

    # Store question text directly (not by reference) to preserve historical data
    question = models.CharField(
        max_length=255,
        help_text="Question text at the time of reservation (Japanese)",
    )

    question_en = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Question text at the time of reservation (English)",
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
        help_text="Order of the question as it was presented to the customer",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reservation_question"
        ordering = ["order_index", "created_at"]
        # Ensure questions are unique per reservation by index
        unique_together = ("reservation", "order_index")

    def __str__(self):
        return f"Reservation {self.reservation.reservation_code} - Q{self.order_index}: {self.question[:50]}"
