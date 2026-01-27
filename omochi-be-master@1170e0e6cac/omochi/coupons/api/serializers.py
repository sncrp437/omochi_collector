from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from django.utils.translation import gettext_lazy as _
from django.db import transaction

from ..models import Coupon, UserCoupon, CouponType


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = (
            'id',
            'venue',
            'type',
            'value_type',
            'amount',
            'paid_by',
            'description',
            'is_active',
            'order_type',
            'payment_method',
            'expiry_date',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class UserCouponSerializer(serializers.ModelSerializer):
    coupon = CouponSerializer(read_only=True)
    coupon_id = serializers.UUIDField(write_only=True, help_text="ID of the coupon to assign")
    
    class Meta:
        model = UserCoupon
        fields = (
            'id',
            'user',
            'coupon',
            'coupon_id',  # Add write-only field for creation
            'order',
            'is_used',
            'used_at',
            'created_by',
            'expiry_date',
            'note',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Create user coupon with proper validation and transaction protection.
        This is now only for admin users creating non-CAMPAIGN coupons.
        CAMPAIGN coupons should use the dedicated campaign coupon endpoint.
        """
        coupon_id = validated_data.pop('coupon_id')
        
        try:
            # Get coupon and validate it's active
            coupon = Coupon.objects.get(id=coupon_id, is_active=True)

            # Enhanced permission check with null safety
            request = self.context.get('request')
            if not request or not hasattr(request, 'user') or not request.user:
                raise PermissionDenied()
                
            user = request.user
            
            # Only admin can use this endpoint
            if not user.is_staff:
                raise PermissionDenied()
            
            # Check if user already has this coupon to prevent duplicates
            target_user = validated_data.get('user', user)
            
            # For all coupon types, prevent any duplicate
            if UserCoupon.objects.filter(user=target_user, coupon=coupon).exists():
                raise serializers.ValidationError(
                    _("User already has this coupon.")
                )
            
            validated_data['coupon'] = coupon
            return super().create(validated_data)
            
        except Coupon.DoesNotExist:
            raise serializers.ValidationError(
                _("The provided coupon is invalid or already used.")
            )
