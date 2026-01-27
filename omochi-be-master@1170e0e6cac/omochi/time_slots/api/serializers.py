from rest_framework import serializers

from omochi.reservations.models import TimeSlot, TimeSlotDailyLimit


class TimeSlotSerializer(serializers.ModelSerializer):
    remaining_slots = serializers.IntegerField(read_only=True)

    class Meta:
        model = TimeSlot
        fields = [
            'id',
            'start_time',
            'end_time',
            'slot_interval',
            'max_reservations',
            'remaining_slots',
            'priority_pass_slot',
            'temporary_additional_limit',
            'total_current_limit',
            'service_type',
            'is_paused',
        ]
        read_only_fields = ('temporary_additional_limit',)

    max_reservations = serializers.IntegerField(min_value=0)

    def validate(self, data):
        """
        Validate that priority_pass_slot does not exceed max_reservations
        """
        max_reservations = data.get('max_reservations')
        priority_pass_slot = data.get('priority_pass_slot')
        
        # If this is an update, get existing values for fields not being updated
        if self.instance:
            if max_reservations is None:
                max_reservations = self.instance.max_reservations
            if priority_pass_slot is None:
                priority_pass_slot = self.instance.priority_pass_slot
        
        # Only validate if both values are present and valid
        if (max_reservations is not None and max_reservations > 0 and 
            priority_pass_slot is not None and priority_pass_slot >= 0):
            if priority_pass_slot > max_reservations:
                raise serializers.ValidationError({
                    'priority_pass_slot': 'Priority pass slot cannot be greater than max reservations'
                })
        
        return data


class PausedTimeSlotSerializer(serializers.Serializer):
    time_slot_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=True,
    )
    service_type = serializers.ChoiceField(
        choices=TimeSlot.SERVICE_TYPE_CHOICES,
        write_only=True,
        required=True,
    )
    is_paused = serializers.BooleanField(write_only=True, required=True)


class TimeSlotDailyLimitSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlotDailyLimit
        fields = ['date', 'temporary_additional_limit']
