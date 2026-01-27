from django.utils.translation import gettext_lazy as _
import re
from rest_framework import serializers

from omochi.venues.models import Venue, VenueManager, VenueQuestion
from omochi.common.multilingual_service import MultilingualSerializerMixin
from omochi.common.multilingual_venue_service import VenueFieldSerializerMixin
from omochi.areas.models import Area


class VenueSerializer(MultilingualSerializerMixin, serializers.ModelSerializer):
    """Serializer for Venue model"""

    announcement = serializers.CharField(
        required=False, allow_blank=True, trim_whitespace=False
    )
    description = serializers.CharField(
        required=False, allow_blank=True, trim_whitespace=False
    )
    genre_en = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    additional_info_en = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )
    nearest_station_en = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )

    class Meta:
        model = Venue
        fields = (
            "id",
            "name",
            "address",
            "description",
            "announcement",
            "phone_number",
            "email",
            "website",
            "opening_time",
            "closing_time",
            "is_active",
            "enable_reservation",
            "enable_eat_in",
            "enable_take_out",
            "enable_order_questions",
            "logo",
            "qr_code",
            "enable_cash_payment",
            "enable_online_payment",
            "additional_info",
            "additional_info_en",
            "genre",
            "genre_en",
            "buffer_time",
            "nearest_station",
            "nearest_station_en",
            "custom_platform_fee_amount",
            "stripe_account_status",
            "onboarding_complete",
            "payout_enabled",
            "charges_enabled",
            "is_partner",
        )
        read_only_fields = (
            "id",
            "stripe_account_status",
            "onboarding_complete",
            "payout_enabled",
            "charges_enabled",
            "is_partner",
        )

    def validate_phone_number(self, value):
        """
        Validate that phone number is 10-11 digits.
        """
        if value and not re.match(r"^\d{10,11}$", value):
            raise serializers.ValidationError(_("Phone number must be 10-11 digits."))
        return value

    def validate_announcement(self, value):
        # For validation, remove all \r\n and check length
        check_value = value.replace("\r\n", "")
        if len(check_value) > 500:
            raise serializers.ValidationError(
                _("Please enter no more than 500 characters for Announcement.")
            )
        return value

    def validate(self, data):
        enable_cash_payment = data.get("enable_cash_payment", False)
        enable_online_payment = data.get("enable_online_payment", False)
        enable_eat_in = data.get("enable_eat_in", False)
        enable_reservation = data.get("enable_reservation", False)
        enable_take_out = data.get("enable_take_out", False)

        if not (enable_cash_payment or enable_online_payment):
            raise serializers.ValidationError(
                _(
                    "Please select method of use: enable_cash_payment or enable_online_payment"
                )
            )

        if not (enable_eat_in or enable_take_out or enable_reservation):
            raise serializers.ValidationError(
                _(
                    "Please select at least one service type: enable_eat_in or enable_take_out or enable_reservation."
                )
            )

        return data
    
    # auto fill nearest_station_en based on nearest_station requested
    def _map_nearest_station_en(self, validated_data):
        nearest_station = validated_data.get("nearest_station")
        if nearest_station:
            area = Area.objects.filter(station=nearest_station).first()
            if area:
                validated_data["nearest_station_en"] = area.station_en
        return validated_data

    def create(self, validated_data):
        validated_data = self._map_nearest_station_en(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._map_nearest_station_en(validated_data)
        return super().update(instance, validated_data)


class VenueDetailSerializer(VenueSerializer):
    """Serializer for detailed venue information"""

    class Meta(VenueSerializer.Meta):
        fields = VenueSerializer.Meta.fields + ("opening_time", "closing_time",)
class VenueManagerSerializer(VenueFieldSerializerMixin, serializers.ModelSerializer):
    """Serializer for VenueManager model"""

    user_email = serializers.ReadOnlyField(source="user.email")
    user_name = serializers.SerializerMethodField()
    venue_name = serializers.SerializerMethodField(method_name='get_venue_name_multilingual')

    class Meta:
        model = VenueManager
        fields = (
            "id",
            "user",
            "user_email",
            "user_name",
            "venue",
            "venue_name",
            "role",
        )
        read_only_fields = ("id",)

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"


class VenueStripeConnectSerializer(serializers.ModelSerializer):
    """
    Serializer for Stripe Connect account information
    """

    class Meta:
        model = Venue
        fields = [
            "id",
            "name",
            "stripe_account_id",
            "stripe_account_status",
            "onboarding_complete",
            "payout_enabled",
            "charges_enabled",
        ]
        read_only_fields = [
            "id",
            "name",
            "stripe_account_id",
            "stripe_account_status",
            "onboarding_complete",
            "payout_enabled",
            "charges_enabled",
        ]


class VenueQuestionSerializer(MultilingualSerializerMixin, serializers.ModelSerializer):
    """Serializer for VenueQuestion model"""

    class Meta:
        model = VenueQuestion
        fields = (
            "id",
            "question",
            "ordinal",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_question(self, value):
        """Validate question length"""
        if len(value) > 255:
            raise serializers.ValidationError(
                _("Question must be 255 characters or less.")
            )
        return value


class VenueQuestionsConfigSerializer(MultilingualSerializerMixin, serializers.Serializer):
    """Serializer for venue questions configuration - specialized for questions endpoint"""
    
    enable_order_questions = serializers.BooleanField()
    questions = VenueQuestionSerializer(many=True, read_only=True)


class VenueQuestionsUpdateSerializer(MultilingualSerializerMixin, serializers.Serializer):
    """Serializer for updating venue questions configuration"""
    
    enable_order_questions = serializers.BooleanField(required=False)
    questions = VenueQuestionSerializer(many=True, required=False)
    
    def validate_questions(self, value):
        """Validate that questions are unique within the list"""
        if value:
            questions = [item['question'] for item in value]
            if len(questions) != len(set(questions)):
                raise serializers.ValidationError(
                    _("This question already exists in this venue.")
                )
        return value