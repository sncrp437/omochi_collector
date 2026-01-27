from typing import List, Optional
from django.conf import settings
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import ValidationError

from .models import Coupon, UserCoupon, CouponType
from omochi.system_setting.services import SystemSettingService


class CouponService:
    """
    Service class for managing coupons and user coupons
    """
    
    @staticmethod
    def assign_referral_onboarding_coupons_to_user(user, ref_code: str) -> List[UserCoupon]:
        """
        Assign referral onboarding coupons to a new user who registered with a referral code
        
        Args:
            user: The user to assign coupons to
            ref_code: The referral code used during registration
            
        Returns:
            List[UserCoupon]: List of created user coupons
        """
        # Check if user has ordered before - ineligible for onboarding coupons
        from omochi.orders.models import Order
        has_ordered_before = Order.objects.filter(user=user).exists()
        if has_ordered_before:
            import logging
            logger = logging.getLogger('omochi')
            logger.info(f"User {user.id} already has orders, skipping referral onboarding coupons")
            return []

        coupon_ids = SystemSettingService.get_referral_onboarding_coupon_ids()
        created_coupons = []
        
        with transaction.atomic():
            for coupon_id in coupon_ids:
                try:
                    coupon = Coupon.objects.get(id=coupon_id, is_active=True)
                    
                    # Check if user already has this coupon
                    existing_coupon = UserCoupon.objects.filter(
                        user=user,
                        coupon=coupon,
                        is_used=False
                    ).exists()
                    
                    if existing_coupon:
                        import logging
                        logger = logging.getLogger('omochi')
                        logger.info(f"User {user.id} already has coupon {coupon_id}, skipping")
                        continue
                    
                    user_coupon = UserCoupon.objects.create(
                        user=user,
                        coupon=coupon,
                        note=f"Referral onboarding coupon - referred by code: {ref_code}"
                    )
                    created_coupons.append(user_coupon)
                except Coupon.DoesNotExist:
                    # Log this error but don't fail the registration
                    import logging
                    logger = logging.getLogger('omochi')
                    logger.warning(f"Referral onboarding coupon with ID {coupon_id} not found or inactive")
                    continue
        
        return created_coupons

    @staticmethod
    @transaction.atomic
    def create_campaign_user_coupon(user, coupon_id: str) -> UserCoupon:
        """
        Create user coupon for CAMPAIGN type coupon only.
        This service is specifically for regular users to claim campaign coupons.
        
        Args:
            user: The user to assign the coupon to
            coupon_id: UUID of the campaign coupon
            
        Returns:
            UserCoupon: Created user coupon instance
            
        Raises:
            ValidationError: If coupon is invalid, not campaign type, or user already has it
        """
        import logging
        logger = logging.getLogger('omochi')
        
        try:
            # Get coupon and validate it's active and campaign type
            coupon = Coupon.objects.get(id=coupon_id, is_active=True)
            logger.info(f"User {user.id} attempting to claim campaign coupon {coupon_id}")
            
            # Only allow CAMPAIGN type coupons
            if coupon.type != CouponType.CAMPAIGN:
                logger.warning(f"User {user.id} tried to claim non-campaign coupon {coupon_id} of type {coupon.type}")
                raise ValidationError(_("The provided coupon is invalid or already used."))
            
            # Check if user already has unused campaign coupon
            existing_unused_coupon = UserCoupon.objects.filter(
                user=user, 
                coupon=coupon, 
                is_used=False
            ).exists()
            
            if existing_unused_coupon:
                logger.info(f"User {user.id} already has unused campaign coupon {coupon_id}, skipping")
                raise ValidationError(_("User already has this coupon."))
            
            # Create user coupon
            user_coupon = UserCoupon.objects.create(
                user=user,
                coupon=coupon,
                created_by=user,
                note="Campaign coupon claimed by user"
            )
            
            logger.info(f"Successfully created campaign user coupon {user_coupon.id} for user {user.id} with coupon {coupon_id}")
            return user_coupon
            
        except Coupon.DoesNotExist:
            logger.warning(f"Campaign coupon with ID {coupon_id} not found or inactive for user {user.id}")
            raise ValidationError(_("The provided coupon is invalid or already used."))
