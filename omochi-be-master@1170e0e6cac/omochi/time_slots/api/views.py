from datetime import datetime
import pytz

from django.db.models import Q
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response

from omochi.reservations.models import TimeSlot, TimeSlotDailyLimit
from omochi.venues.api.views import IsVenueManagerOrAdmin
from omochi.venues.models import Venue

from .serializers import (
    PausedTimeSlotSerializer,
    TimeSlotDailyLimitSerializer,
    TimeSlotSerializer,
)


class TimeSlotViewSet(viewsets.ModelViewSet):
    serializer_class = TimeSlotSerializer
    permission_classes = [IsVenueManagerOrAdmin]

    def get_serializer_class(self):
        if self.action == 'additional_limit':
            return TimeSlotDailyLimitSerializer
        if self.action == 'paused_time_slots':
            return PausedTimeSlotSerializer
        return TimeSlotSerializer

    def get_queryset(self):
        venue_id = self.kwargs.get("venue_id")
        if not Venue.objects.filter(id=venue_id).exists():
            raise NotFound(_("Venue not found."))

        service_type = self.request.query_params.get("service_type")
        queryset = TimeSlot.objects.filter(
            venue_id=venue_id, service_type=service_type
        )

        return queryset

    def get_venue(self, venue_id):

        try:
            return Venue.objects.get(id=venue_id)
        except Venue.DoesNotExist:
            raise NotFound("Venue not found.")

    def validate_time_format(self, time_str):
        """Validate and parse time string into a time object."""
        try:
            return datetime.strptime(time_str, "%H:%M:%S").time()
        except ValueError:
            raise ValidationError(
                {
                    "error": _(
                        f"Invalid time format for '{time_str}'. "
                        "Expected '%H:%M:%S'."
                    )
                }
            )

    def validate_slot_interval(self, start_time, end_time, slot_interval):
        """Validate that the time slot duration is a multiple of the
        slot interval and more than 15 minutes."""
        duration = (
            datetime.combine(datetime.min, end_time)
            - datetime.combine(datetime.min, start_time)
        ).total_seconds() / 60

        # Validate that duration is at least 15 minutes
        if duration < 15:
            raise ValidationError(
                { "error": _("Time slot duration must be at least 15 minutes.") }
            )

        if duration % slot_interval != 0:
            raise ValidationError(
                {
                    "error": _(
                        "Time slot duration must be a multiple of "
                        "the slot interval."
                    )
                }
            )

    def validate_within_opening_hours(self, venue, start_time, end_time):
        """Validate that the time slot is within the venue's opening and closing times."""
        if not venue.opening_time or not venue.closing_time:
            raise ValidationError(
                {
                    "error": _(
                        "Venue does not have opening and/or closing times configured."
                    )
                }
            )

        opening_time = venue.opening_time
        closing_time = venue.closing_time

        if not (
            opening_time <= start_time < closing_time
            and opening_time < end_time <= closing_time
        ):
            raise ValidationError(
                {
                    "error": _(
                        "Time slot must be within the venue's working hours."
                    )
                }
            )

    def validate_overlapping_slots(
        self, venue_id, start_time, end_time, service_type, exclude_id=None
    ):
        """Validate that the time slot does not overlap with existing slots."""
        overlapping_slots = TimeSlot.objects.filter(
            venue_id=venue_id, service_type=service_type
        ).filter(Q(start_time__lt=end_time, end_time__gt=start_time))

        if exclude_id:
            overlapping_slots = overlapping_slots.exclude(id=exclude_id)

        if overlapping_slots.exists():
            raise ValidationError(
                {"error": _("Time slot overlaps with an existing time slot.")}
            )

    @extend_schema(
        summary="List time slots",
        description="Retrieve a list of time slots filtered by service type.",
        parameters=[
            OpenApiParameter(
                name="service_type",
                description="Filter by service type (DINE_IN or TAKEOUT)",
                required=True,
                type=str,
                enum=["DINE_IN", "TAKEOUT"],
            ),
        ],
        responses={
            200: OpenApiResponse(response=TimeSlotSerializer(many=True)),
        },
    )
    def list(self, request, *args, **kwargs):
        venue_id = self.kwargs.get("venue_id")
        if not Venue.objects.filter(id=venue_id).exists():
            raise NotFound(_("Venue not found."))

        queryset = self.get_queryset()
        service_type = request.query_params.get("service_type")
        if service_type:
            queryset = queryset.filter(service_type=service_type)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, venue_id=None):
        venue = self.get_venue(venue_id)
        data = request.data

        start_time = self.validate_time_format(data["start_time"])
        end_time = self.validate_time_format(data["end_time"])
        service_type = data.get("service_type")

        self.validate_within_opening_hours(venue, start_time, end_time)

        self.validate_slot_interval(
            start_time, end_time, data.get("slot_interval", 30)
        )

        self.validate_overlapping_slots(
            venue_id, start_time, end_time, service_type
        )

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(venue_id=venue_id)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, venue_id=None, pk=None):
        time_slot = TimeSlot.objects.filter(id=pk, venue_id=venue_id).first()

        if not time_slot:
            raise NotFound(_("Time slot not found."))

        self.check_object_permissions(request, time_slot)

        data = request.data
        start_time = self.validate_time_format(data["start_time"])
        end_time = self.validate_time_format(data["end_time"])
        service_type = data.get("service_type", time_slot.service_type)

        self.validate_within_opening_hours(
            time_slot.venue, start_time, end_time
        )

        self.validate_slot_interval(
            start_time, end_time, data.get("slot_interval", 30)
        )

        self.validate_overlapping_slots(
            time_slot.venue_id,
            start_time,
            end_time,
            service_type,
            exclude_id=time_slot.id,
        )
        
        serializer = self.get_serializer(
            time_slot, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, venue_id=None, pk=None):
        time_slot = TimeSlot.objects.filter(id=pk, venue_id=venue_id).first()

        if not time_slot:
            raise NotFound(_("Time slot not found."))

        self.check_object_permissions(request, time_slot)

        time_slot.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path='additional-limit')
    def additional_limit(self, request, venue_id=None, pk=None):
        """
        Add a temporary additional limit to a time slot daily limit.
        """
        venue_id = self.kwargs.get('venue_id')
        time_slot_id = self.kwargs.get('pk')
        try:
            venue = Venue.objects.get(id=venue_id)
        except Venue.DoesNotExist:
            return Response(
                {"error": "Venue not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        time_slot = TimeSlot.objects.filter(
            id=time_slot_id, venue=venue
        ).first()
        temporary_additional_limit = request.data.get(
            'temporary_additional_limit'
        )

        try:
            temporary_additional_limit = int(temporary_additional_limit)
        except (ValueError, TypeError):
            return Response(
                {"error": _("Additional limit must be a valid integer.")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if temporary_additional_limit < 0:
            return Response(
                {"error": _("Additional limit must be greater than 0.")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Get current Japan date
        japan_timezone = pytz.timezone('Asia/Tokyo')
        current_japan_date = datetime.now(japan_timezone).date()

        daily_limit, created = TimeSlotDailyLimit.objects.get_or_create(
            date=current_japan_date,
            time_slot=time_slot
        )
        daily_limit.temporary_additional_limit += temporary_additional_limit
        daily_limit.save()
        time_slot.save()

        from omochi.notifications.services import FirebaseNotificationService
        FirebaseNotificationService().send_time_slot_available_to_users(time_slot)

        return Response(
            {
                "message": "Daily limit updated successfully.",
                "temporary_additional_limit": daily_limit.temporary_additional_limit,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path='paused-time-slots')
    def paused_time_slots(self, request, *args, **kwargs):
        """
        Pause a time slot by setting.
        """
        venue_id = self.kwargs.get('venue_id')
        try:
            venue = Venue.objects.get(id=venue_id)
        except Venue.DoesNotExist:
            return Response(
                {'error': 'Venue not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = PausedTimeSlotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        time_slot_ids = serializer.validated_data.get('time_slot_ids', [])
        is_paused = serializer.validated_data.get('is_paused')
        service_type = serializer.validated_data.get('service_type')

        if not isinstance(time_slot_ids, list):
            return Response(
                {'error': _('Invalid request.')},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not time_slot_ids:
            TimeSlot.objects.filter(
                venue=venue, service_type=service_type
            ).update(is_paused=is_paused)

            return Response(
                {
                    "message": "All time slots have been marked as paused.",
                },
                status=status.HTTP_200_OK,
            )

        time_slots = TimeSlot.objects.filter(
            id__in=time_slot_ids, venue=venue, service_type=service_type
        ).update(is_paused=is_paused)

        return Response(
            {
                'message': _('Time slots updated successfully.'),
                'time_slots': time_slots,
            },
            status=status.HTTP_200_OK,
        )
