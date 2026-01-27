from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from omochi.reservations.models import Reservation, ReservationStatusHistory, TimeSlot, ReservationQuestion
from django.core.validators import MinValueValidator
from omochi.common.multilingual_venue_service import VenueFieldSerializerMixin
from omochi.common.multilingual_service import MultilingualSerializerMixin, SupportedLanguage
from omochi.common.venue_questions_mixin import VenueQuestionsValidationMixin
from django.db import transaction
from omochi.common.openai_service import get_openai_service


class ReservationStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservationStatusHistory
        fields = [
            'id',
            'reservation',
            'old_status',
            'new_status',
            'changed_at',
            'changed_by',
        ]
        read_only_fields = ['id', 'reservation', 'changed_at', 'changed_by']


class ReservationQuestionSerializer(MultilingualSerializerMixin, serializers.ModelSerializer):
    """Serializer for reservation questions and answers"""
    
    class Meta:
        model = ReservationQuestion
        fields = (
            'id',
            'question',
            'answer',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class ReservationQuestionInputSerializer(serializers.Serializer):
    """Serializer for accepting question answers during reservation creation"""
    
    question_id = serializers.UUIDField(help_text="ID of the venue question")
    answer = serializers.CharField(allow_blank=True, required=False, default="")


class ReservationSerializer(VenueQuestionsValidationMixin, VenueFieldSerializerMixin, serializers.ModelSerializer):
    """Serializer for reservation"""

    venue_name = serializers.SerializerMethodField(method_name='get_venue_name_multilingual')
    venue_logo = serializers.SerializerMethodField()
    venue_website = serializers.ReadOnlyField(source='venue.website')
    start_time = serializers.ReadOnlyField(source='time_slot.start_time')
    end_time = serializers.ReadOnlyField(source='time_slot.end_time')
    status_history = ReservationStatusHistorySerializer(
        many=True, read_only=True
    )
    user_first_name = serializers.ReadOnlyField(source='user.first_name')
    user_last_name = serializers.ReadOnlyField(source='user.last_name')
    user_phone_number = serializers.ReadOnlyField(source='user.phone_number')
    user_email = serializers.ReadOnlyField(source='user.email')
    order_id = serializers.SerializerMethodField()
    reservation_questions = ReservationQuestionSerializer(many=True, read_only=True)
    venue_questions = ReservationQuestionInputSerializer(many=True, required=False, allow_empty=True, write_only=True)
    time_slot = serializers.PrimaryKeyRelatedField(
        queryset=TimeSlot.objects.all(),
        error_messages={
            'does_not_exist': _("Time slot not found."),
        }
    )
    party_size = serializers.IntegerField(validators=[MinValueValidator(1)])
    lang = serializers.ChoiceField(
        choices=[(SupportedLanguage.JAPANESE.value, 'Japanese'), (SupportedLanguage.ENGLISH.value, 'English')],
        required=False,
        default=SupportedLanguage.JAPANESE.value,
        help_text="Language for reservation questions answers (default: 'ja')"
    )

    class Meta:
        model = Reservation
        fields = (
            'id',
            'venue',
            'venue_name',
            'venue_logo',
            'venue_website',
            'user',
            'user_first_name',
            'user_last_name',
            'user_phone_number',
            'user_email',
            'time_slot',
            'start_time',
            'end_time',
            'date',
            'start_time',
            'end_time',
            'status',
            'party_size',
            'reservation_code',
            'table_preference',
            'created_at',
            'updated_at',
            'status_history',
            'reservation_questions',
            'venue_questions',
            'order_id',
            'lang',
        )
        read_only_fields = (
            'id',
            'reservation_code',
            'created_at',
            'updated_at',
            'user',
        )

    def get_venue_logo(self, obj):
        from omochi.common.utils import build_absolute_image_url
        request = self.context.get('request')
        return build_absolute_image_url(obj.venue.logo, request)
        
    def get_order_id(self, obj):
        """Get the ID of the most recent order associated with this reservation"""
        order = obj.orders.order_by('-order_date').first()
        return str(order.id) if order else None

    def validate(self, data):
        """Custom validation for reservation creation"""
        venue = data.get('venue')
        venue_questions_data = data.get('venue_questions', [])
        
        # Only validate venue questions during creation (when we have venue_questions data)
        if venue_questions_data is not None and venue:
            # For reservations, no order_type is passed (None), so it validates as dine-in
            self._validate_venue_questions_logic(venue, venue_questions_data, order_type=None)
        
        return data

    def create(self, validated_data):
        """Create reservation with venue questions and translation logic"""
        venue_questions_data = validated_data.pop('venue_questions', [])
        venue = validated_data.get('venue')
        lang = validated_data.pop('lang', 'ja')

        # Translate answers if lang == 'en' and venue.enable_order_questions and len(venue_questions_data) > 0
        if lang == 'en' and getattr(venue, 'enable_order_questions', False) and len(venue_questions_data) > 0:
            openai_service = get_openai_service()
            for venue_question in venue_questions_data:
                answer_request = venue_question.get('answer', '')
                # Set both English and Japanese fields for the answer from the request data
                venue_question['answer_en'] = answer_request
                venue_question['answer'] = answer_request

                # Translate all answers from English to Japanese
                if answer_request:
                    result = openai_service.translate_text(
                        text=answer_request,
                        target_language='Japanese',
                        source_language='English',
                        field_type='answer',
                    )
                    if result.get('success') and result.get('translated_text'):
                        venue_question['answer'] = result['translated_text']

        with transaction.atomic():
            # Create the reservation - this properly handles additional fields from view
            reservation = super().create(validated_data)
            
            # Create reservation questions using shared mixin method
            self._create_venue_questions(
                parent_obj=reservation,
                venue=venue,
                venue_questions_data=venue_questions_data,
                question_model_class=ReservationQuestion
            )
        
        return reservation


class ReservationStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating reservation status"""

    class Meta:
        model = Reservation
        fields = ('status',)


class BulkReservationStatusSerializer(serializers.Serializer):
    """Serializer for bulk reservation status update"""
    reservation_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        help_text=_("List of reservation IDs to update")
    )
    status = serializers.ChoiceField(
        choices=['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'],
        help_text=_("Target status for the reservations")
    )

    def validate_reservation_ids(self, value):
        if not value:
            raise serializers.ValidationError(_("Reservation IDs required"))
        return value
