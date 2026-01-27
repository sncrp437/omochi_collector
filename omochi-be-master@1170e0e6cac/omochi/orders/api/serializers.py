from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from omochi.coupons.models import UserCoupon
from omochi.menus.api.serializers import MenuItemSerializer
from omochi.orders.models import Order, OrderItem, OrderStatusHistory, OrderQuestion
from omochi.reservations.models import Reservation, TimeSlot
from omochi.venues.models import Venue
from omochi.common.utils import get_timezone_date, get_day_utc_range
from omochi.common.multilingual_service import MultilingualSerializerMixin, SupportedLanguage
from omochi.common.multilingual_venue_service import VenueFieldSerializerMixin
from omochi.common.venue_questions_mixin import VenueQuestionsValidationMixin


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for order item"""

    menu_item_details = MenuItemSerializer(source='menu_item', read_only=True)

    class Meta:
        model = OrderItem
        fields = (
            'id',
            'menu_item',
            'menu_item_details',
            'quantity',
            'subtotal',
            'special_request',
        )
        read_only_fields = ('id', 'subtotal')


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = [
            'id',
            'order',
            'old_status',
            'new_status',
            'changed_at',
            'changed_by',
        ]
        read_only_fields = ['id', 'order', 'changed_at', 'changed_by']


class OrderQuestionSerializer(MultilingualSerializerMixin, serializers.ModelSerializer):
    """Serializer for order questions and answers"""
    
    class Meta:
        model = OrderQuestion
        fields = (
            'id',
            'question',
            'answer',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class OrderQuestionInputSerializer(serializers.Serializer):
    """Serializer for accepting question answers during order creation"""
    
    question_id = serializers.UUIDField(help_text="ID of the venue question")
    answer = serializers.CharField(allow_blank=True, required=False, default="")


class OrderListSerializer(VenueFieldSerializerMixin, serializers.ModelSerializer):
    """Serializer for order list views - optimized with fewer fields"""
    
    venue_name = serializers.SerializerMethodField(method_name='get_venue_name_multilingual')
    
    class Meta:
        model = Order
        fields = (
            'id',
            'order_code',
            'venue',
            'venue_name',
            'status',
            'order_type',
            'order_date',
            'updated_at',
            'total_amount',
            'payment_status',
            'total',
            'pickup_time',
            'reservation',
        )


class OrderSerializer(VenueFieldSerializerMixin, serializers.ModelSerializer):
    """Serializer for order detail views"""

    items = OrderItemSerializer(many=True, read_only=True)
    order_questions = OrderQuestionSerializer(many=True, read_only=True)
    venue_name = serializers.SerializerMethodField(method_name='get_venue_name_multilingual')
    venue_logo = serializers.SerializerMethodField()
    venue_website = serializers.ReadOnlyField(source='venue.website')
    user_first_name = serializers.ReadOnlyField(source='user.first_name')
    user_last_name = serializers.ReadOnlyField(source='user.last_name')
    user_phone_number = serializers.ReadOnlyField(source='user.phone_number')
    user_email = serializers.ReadOnlyField(source='user.email')
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    user_coupon = serializers.SerializerMethodField()
    total_coupon_amount = serializers.ReadOnlyField()

    class Meta:
        model = Order
        fields = (
            'id',
            'order_code',
            'user',
            'user_first_name',
            'user_last_name',
            'user_phone_number',
            'user_email',
            'venue',
            'venue_name',
            'venue_logo',
            'venue_website',
            'time_slot',
            'user_coupon',
            'total_coupon_amount',
            'takeout_fee_subsidized_amount',
            'application_fee_amount',
            'application_fee_discount_amount',
            'order_discount_amount',
            'start_time',
            'end_time',
            'party_size',
            'status',
            'order_type',
            'order_date',
            'total_amount',
            'total',
            'payment_status',
            'payment_method',
            'pickup_time',
            'reservation',
            'note',
            'items',
            'order_questions',
            'status_history',
        )
        read_only_fields = (
            'id',
            'order_code',
            'order_date',
            'total_amount',
            'start_time',
            'end_time',
        )

    def get_venue_logo(self, obj):
        from omochi.common.utils import build_absolute_image_url
        request = self.context.get('request')
        return build_absolute_image_url(obj.venue.logo, request)

    def get_user_coupon(self, obj):
        user_coupon = obj.user_coupons.filter(is_used=True).first()
        if user_coupon:
            coupon = user_coupon.coupon
            return {
                "id": user_coupon.id,
                "amount": coupon.amount,
                "value_type": coupon.value_type,
                "type": coupon.type,
                "paid_by": coupon.paid_by,
            }
        return None


class OrderCreateSerializer(VenueQuestionsValidationMixin, serializers.ModelSerializer):
    """Serializer for creating orders with items"""

    items = OrderItemSerializer(many=True)
    venue_questions = OrderQuestionInputSerializer(many=True, required=False, allow_empty=True)
    user_coupon = serializers.UUIDField(
        write_only=True, required=False, allow_null=True
    )
    time_slot = serializers.PrimaryKeyRelatedField(
        queryset=TimeSlot.objects.all(),
        error_messages={
            'does_not_exist': _("Time slot not found."),
        }
    )
    lang = serializers.ChoiceField(
        choices=[(SupportedLanguage.JAPANESE.value, 'Japanese'), (SupportedLanguage.ENGLISH.value, 'English')],
        required=False,
        default=SupportedLanguage.JAPANESE.value,
        help_text="Language for order questions answers (default: 'ja')"
    )

    class Meta:
        model = Order
        fields = (
            'id',
            'venue',
            'time_slot',
            'user_coupon',
            'party_size',
            'order_type',
            'payment_method',
            'pickup_time',
            'reservation',
            'note',
            'items',
            'venue_questions',
            'lang',
        )

    def validate_user_coupon(self, user_coupon):
        """Validate the provided user_coupon (basic validation only)"""
        if not user_coupon:
            return None

        user = self.context['request'].user
        try:
            # Prefetch coupon relation to avoid additional queries
            user_coupon = UserCoupon.objects.select_related('coupon').get(
                id=user_coupon, user=user, is_used=False
            )
            
            # Check if venue is provided in the data
            venue_id = self.initial_data.get('venue')
            if (venue_id and user_coupon.coupon.venue and 
                str(user_coupon.coupon.venue.id) != str(venue_id)):
                raise serializers.ValidationError(
                    _("This coupon cannot be applied to the selected venue.")
                )
            
            # Check if coupon is still active
            if not user_coupon.coupon.is_active:
                raise serializers.ValidationError(
                    _("This coupon is no longer active.")
                )
            
            # Check expiry date if set
            if user_coupon.expiry_date and user_coupon.expiry_date < now():
                raise serializers.ValidationError(
                    _("This coupon has expired.")
                )
            
            # Check order type restrictions if set
            order_type = self.initial_data.get('order_type')
            if (order_type and user_coupon.coupon.order_type and 
                order_type not in user_coupon.coupon.order_type):
                raise serializers.ValidationError(
                    _("This coupon cannot be used for this order type.")
                )
            
            # Check payment method restrictions if set
            payment_method = self.initial_data.get('payment_method')
            if (payment_method and user_coupon.coupon.payment_method and 
                payment_method not in user_coupon.coupon.payment_method):
                raise serializers.ValidationError(
                    _("This coupon cannot be used with this payment method.")
                )
        except UserCoupon.DoesNotExist:
            raise serializers.ValidationError(
                _("The provided coupon is invalid or already used.")
            )
        return user_coupon

    def validate_time_slot_and_party_size(
        self, time_slot, party_size, order_type
    ):
        remaining_slots = time_slot.remaining_slots

        exceeds_limit = (
            order_type == 'DINE_IN'
            and remaining_slots < party_size
        ) or (
            order_type == 'TAKEOUT'
            and remaining_slots < 1
        )

        if exceeds_limit:
            raise serializers.ValidationError(
                {
                    "party_size": _(
                        "Total party size exceeds the maximum reservations "
                        "for this time slot."
                    )
                }
            )

    def validate_priority_pass_slot(
        self, time_slot, party_size, order_type, order_items, existing_reservation=None
    ):
        if existing_reservation is not None and party_size <= existing_reservation.party_size:
            return True
        
        from omochi.menus.models import MenuItem
        
        # For TAKEOUT orders, check if there are priority pass items that support takeout
        if order_type == 'TAKEOUT':
            has_priority_pass_item = MenuItem.objects.filter(
                venue=time_slot.venue, 
                is_priority_pass=True,
                take_out_price__isnull=False
            ).exists()
        else:
            # For DINE_IN orders
            has_priority_pass_item = MenuItem.objects.filter(
                venue=time_slot.venue, 
                is_priority_pass=True
            ).exists()
            
        if not has_priority_pass_item:
            return True

        if order_type == 'TAKEOUT':
            party_size = 1
        # assume that have enough slot because already checked in validate_time_slot_and_party_size
        if time_slot.priority_pass_slot > time_slot.remaining_slots - party_size:
            # find priority pass menu item in order_items and check if 
            # quantity is enough
            priority_pass_menu_item = next(
                (item for item in order_items if item['menu_item'].is_priority_pass), 
                None
            )
                
            if (priority_pass_menu_item is None or 
                priority_pass_menu_item['quantity'] != party_size):
                # Only raise error if there are priority pass items that support the current order type
                raise serializers.ValidationError(
                    {
                        "priority_pass": _(
                            "Please add %(count)s priority pass item(s) "
                            "to use this priority slots."
                        ) % {"count": party_size}
                    }
                )
    


    def create(self, validated_data):
        venue = validated_data['venue']
        items = self.data.get('items')
        venue_check = Venue.objects.filter(id=venue.id).first()
        if not self.data.get('items'):
            raise serializers.ValidationError(
                {"items": _("At least one order item is required.")}
            )

        # Check is_partner logic for all order types
        # If not a partner, prevent all order types
        order_type = validated_data.get('order_type')
        if venue_check and not venue_check.is_partner:
            if order_type == 'DINE_IN':
                raise serializers.ValidationError({"venue": _("Venue is not available for dine-in orders.")})
            elif order_type == 'TAKEOUT':
                raise serializers.ValidationError({"venue": _("Venue is not available for takeout orders.")})

        # Validate payment method against venue settings
        payment_method = validated_data.get('payment_method')
        if ((payment_method == 'CASH' and not venue_check.enable_cash_payment) or 
            (payment_method == 'ONLINE' and not venue_check.enable_online_payment)):
            raise serializers.ValidationError(
                {
                    "payment_method": _(
                        "This payment method no longer supported."
                    )
                }
            )

        menu_item_ids = [item.get('menu_item') for item in items]
        valid_menu_items = set(
            venue.menu_items.filter(id__in=menu_item_ids).values_list(
                'id', flat=True
            )
        )
        invalid_ids = [
            mid for mid in menu_item_ids if mid not in valid_menu_items
        ]
        if invalid_ids:
            raise serializers.ValidationError(
                {
                    "items": _(
                        "The items in your shopping cart have been edited "
                        "or removed. Please try again."
                    )
                }
            )
            
        items_data = validated_data.pop('items')
        venue_questions_data = validated_data.pop('venue_questions', [])
        time_slot = validated_data.pop('time_slot')
        user_coupon = validated_data.pop('user_coupon', None)
        party_size = validated_data.pop('party_size')
        order_type = validated_data['order_type']
        reservation = validated_data.pop('reservation', None)
        payment_method = validated_data['payment_method']

        # Validate venue questions
        self._validate_venue_questions_logic(venue, venue_questions_data, order_type)

        # Get Japan timezone date
        today = get_timezone_date('Asia/Tokyo')

        # Translate answers if lang == 'en' and venue.enable_order_questions and len(venue_questions_data) > 0 and order_type == 'DINE_IN'
        lang = validated_data.pop('lang', 'ja')
        if (
            lang == 'en' and
            getattr(venue, 'enable_order_questions', False) and
            len(venue_questions_data) > 0 and
            order_type == 'DINE_IN'
        ):
            from omochi.common.openai_service import get_openai_service
            openai_service = get_openai_service()
            for venue_question in venue_questions_data:
                answer_request = venue_question.get('answer', '')
                venue_question['answer_en'] = answer_request
                venue_question['answer'] = answer_request
                if answer_request:
                    result = openai_service.translate_text(
                        text=answer_request,
                        target_language='Japanese',
                        source_language='English',
                        field_type='answer',
                    )
                    if result.get('success') and result.get('translated_text'):
                        venue_question['answer'] = result['translated_text']

        if order_type == 'DINE_IN' and not venue_check.enable_eat_in:
            # If venue does not support dine-in, check if there is a priority pass item
            # and if the reservation is valid
            if (
                not venue_check.enable_reservation
                or len(items_data) != 1
                or not items_data[0].get('menu_item', {}).is_priority_pass
            ):
                raise serializers.ValidationError(
                    {"venue": _("Venue is not available for dine-in orders.")}
                )
        
        if (order_type == 'TAKEOUT' and 
            venue_check.enable_take_out == False):
            raise serializers.ValidationError(
                {"venue": _("Venue is not available for takeout orders.")}
            )
        
        if not time_slot:
            raise serializers.ValidationError(
                {"time_slot": _("Time slot is required.")}
            )

        if not order_type:
            raise serializers.ValidationError(
                {"order_type": _("Order type is required.")}
            )

        # Time slot's start_time is in Japan time (JST, UTC+9)
        # Need to account for the difference between JST and UTC
        jst_utc_diff = timedelta(hours=9)
        today_jp = datetime.now() + jst_utc_diff  # proper datetime object
        slot_start_time = datetime.combine(today_jp, time_slot.start_time)
        buffer_time = timedelta(minutes=venue.buffer_time)

        if slot_start_time - today_jp < buffer_time:
            raise serializers.ValidationError(
                {
                    'time_slot': _(
                        "Cannot book a time slot within the buffer time."
                    )
                }
            )

        with transaction.atomic():
            start_of_day_utc, end_of_day_utc = get_day_utc_range(
                'Asia/Tokyo', today
            )
            
            # Lock and re-validate the user coupon to prevent race conditions
            if user_coupon is not None:
                try:
                    user_coupon = UserCoupon.objects.select_for_update().get(
                        id=user_coupon.id, 
                        user=self.context['request'].user, 
                        is_used=False
                    )
                except UserCoupon.DoesNotExist:
                    raise serializers.ValidationError(
                        {
                            "user_coupon": _(
                                "The provided coupon is invalid or already used."
                            )
                        }
                    )
                
            reservation_check = Reservation.objects.filter(
                venue=venue,
                user=self.context['request'].user,
                time_slot=time_slot,
                date=today,
            ).exclude(Q(status='CANCELLED') | Q(status='COMPLETED'))
            existing_reservation = (
                reservation_check.first() if reservation_check.exists() else None
            )
            
            if order_type == 'DINE_IN':
                try:
                    time_slot = TimeSlot.objects.select_for_update().get(
                        id=time_slot.id,
                        venue=venue,
                        service_type='DINE_IN',
                    )
                except TimeSlot.DoesNotExist:
                    raise serializers.ValidationError(
                        {"time_slot": _("Time slot or venue not found.")}
                    )
                
                remaining_slots = time_slot.remaining_slots
                if remaining_slots < party_size or time_slot.is_paused:
                    if (existing_reservation is None or 
                        remaining_slots + existing_reservation.party_size < party_size):
                        raise serializers.ValidationError(
                            {'party_size': _("Time slot is fully booked.")}
                        )

                # Use timezone-aware range comparison
                dine_in_order = Order.objects.filter(
                    venue=venue,
                    user=self.context['request'].user,
                    time_slot=time_slot,
                    order_date__range=(start_of_day_utc, end_of_day_utc),
                    order_type='DINE_IN',
                ).exclude(Q(status='CANCELLED') | Q(status='COMPLETED'))

                if dine_in_order.exists():
                    raise serializers.ValidationError(
                        {
                            'order_type': _(
                                "You already have an active dine-in order at "
                                "this time slot."
                            )
                        }
                    )

            if order_type == 'TAKEOUT':
                party_size = 0
                try:
                    time_slot = TimeSlot.objects.select_for_update().get(
                        id=time_slot.id,
                        venue=venue,
                        service_type='TAKEOUT',
                        is_paused=False,
                    )
                except TimeSlot.DoesNotExist:
                    raise serializers.ValidationError(
                        {"time_slot": _("Time slot or venue not found.")}
                    )

                take_away_order = Order.objects.filter(
                    venue=venue,
                    user=self.context['request'].user,
                    time_slot=time_slot,
                    order_date__range=(start_of_day_utc, end_of_day_utc),
                    order_type='TAKEOUT',
                ).exclude(Q(status='CANCELLED') | Q(status='COMPLETED'))

                if take_away_order.exists():
                    raise serializers.ValidationError(
                        {
                            'order_type': _(
                                "You already have an active take away order at "
                                "this time slot."
                            )
                        }
                    )

            party_size_check = party_size
            if existing_reservation is not None:
                party_size_check = party_size_check - existing_reservation.party_size
            self.validate_time_slot_and_party_size(time_slot, party_size_check, order_type)
            self.validate_priority_pass_slot(
                time_slot, party_size, order_type, items_data, existing_reservation
            )
            
            order = Order.objects.create(
                total_amount=0,
                total=0,
                time_slot=time_slot,
                start_time=time_slot.start_time,
                end_time=time_slot.end_time,
                party_size=party_size,
                reservation=existing_reservation,
                **validated_data,
            )

            for item_data in items_data:
                menu_item = item_data.pop('menu_item')
                quantity = item_data.pop('quantity')
                
                if menu_item.is_out_of_stock:
                    raise serializers.ValidationError(
                        {
                            'items': _(
                                f"Menu item is currently out of stock."
                            )
                        }
                    )

                if (order_type == 'TAKEOUT' and 
                    menu_item.take_out_price is None):
                    raise serializers.ValidationError(
                        {'items': _(f"cannot order.")}
                    )

                subtotal = (
                    menu_item.take_out_price * quantity
                    if menu_item.take_out_price is not None
                    and order_type == 'TAKEOUT'
                    else menu_item.price * quantity
                )

                OrderItem.objects.create(
                    order=order,
                    menu_item=menu_item,
                    quantity=quantity,
                    subtotal=subtotal,
                    **item_data,
                )

            # Create order questions using shared mixin method
            # Only create for DINE_IN orders (TAKEOUT orders are ignored by mixin)
            if order_type == 'DINE_IN':
                self._create_venue_questions(
                    parent_obj=order,
                    venue=venue,
                    venue_questions_data=venue_questions_data,
                    question_model_class=OrderQuestion
                )

            order.summarize_order(user_coupon)

            if (order_type == 'DINE_IN' and party_size > 0 and 
                existing_reservation is None):
                reservation = Reservation.objects.create(
                    user=self.context['request'].user,
                    venue=venue,
                    time_slot=time_slot,
                    start_time=time_slot.start_time,
                    end_time=time_slot.end_time,
                    date=today,
                    party_size=party_size,
                )
                order.reservation = reservation
            elif existing_reservation is not None and order_type == 'DINE_IN':
                # Update existing reservation's party_size to match the order's party_size
                existing_reservation.party_size = party_size
                existing_reservation.save()
            order.save()
        return order

    def update(self, instance, validated_data):
        raise serializers.ValidationError(
            _("Order updates are not allowed.")
        )


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating order status"""

    class Meta:
        model = Order
        fields = ('status',)

    def validate_status(self, value):
        if value not in ['CONFIRMED', 'PREPARING', 'READY']:
            raise serializers.ValidationError(_('Invalid status.'))
        return value


class BulkOrderStatusSerializer(serializers.Serializer):
    """Serializer for bulk order status update"""
    order_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        help_text=_("List of order IDs to update")
    )
    status = serializers.ChoiceField(
        choices=['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'],
        help_text=_("Target status for the orders")
    )

    def validate_order_ids(self, value):
        if not value:
            raise serializers.ValidationError(_("Order IDs required"))
        return value


class BulkOrderConfirmPickupSerializer(serializers.Serializer):
    """Serializer for bulk order pickup confirmation"""
    order_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        help_text=_("List of order IDs to confirm pickup")
    )

    def validate_order_ids(self, value):
        if not value:
            raise serializers.ValidationError(_("Order IDs required"))
        return value
