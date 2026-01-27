from django.conf import settings
from .models import RefLog


class RefLogService:
    @staticmethod
    def log_action(user, ref_code, action_type, action_id, venue=None, data=None):
        """
        Log a reference action.
        
        Args:
            user: The user who performed the action
            ref_code: The referral code
            action_type: Type of action (REGISTRATION, STOCKED_VENUE, ORDER)
            action_id: ID of the related action
            venue: Optional venue related to the action
            data: Optional additional data related to the action
        
        Returns:
            The created RefLog instance or None if the referral code is invalid or belongs to the user
        """
        # Import User model here to avoid circular imports
        User = settings.AUTH_USER_MODEL
        from django.apps import apps
        UserModel = apps.get_model(User)
        
        # Check if ref_code exists and doesn't belong to the user themselves
        try:
            referrer = UserModel.objects.get(ref_code=ref_code)
            # Don't log if the user is referring themselves
            if user and referrer.id == user.id:
                return None
                
            # Valid referral code found, create the log
            return RefLog.objects.create(
                user=user,
                ref_id=ref_code,  # Still using ref_id field in database
                action_type=action_type,
                action_id=action_id,
                venue=venue,
                data=data
            )
        except UserModel.DoesNotExist:
            # Invalid referral code, don't create log
            return None
    
    @staticmethod
    def log_registration(user, ref_code, user_id):
        """
        Log a user registration referral.
        """
        return RefLogService.log_action(
            user=user,
            ref_code=ref_code,
            action_type='REGISTRATION',
            action_id=user_id
        )
    
    @staticmethod
    def log_stocked_venue(user, venue):
        """
        Log a stocked venue referral.
        """
        ref = RefLog.objects.filter(
            user=user,
            action_type='CLICK',
            venue=venue
        ).order_by('-created_at').first()

        if ref is not None:
            return RefLogService.log_action(
                user=user,
                ref_code=ref.ref_id,
                action_type='STOCKED_VENUE',
                action_id=venue,
                venue=venue
            )

        return None

    @staticmethod
    def log_order(user, order_id, venue):
        """
        Log an order referral.
        """

        ref = RefLog.objects.filter(
            user=user,
            action_type='CLICK',
            venue=venue
        ).order_by('-created_at').first()

        if ref is not None:
            return RefLogService.log_action(
                user=user,
                ref_code=ref.ref_id,
                action_type='ORDER',
                action_id=order_id,
                venue=venue
            )
    
    @staticmethod
    def log_click(user, ref_code, venue_id):
        """
        Log a referral link click.
        Skip if similar log already exists for the same user, ref_code, and venue.
        """
        # Import User model here to avoid circular imports
        User = settings.AUTH_USER_MODEL
        from django.apps import apps
        UserModel = apps.get_model(User)
        
        # Check if ref_code exists and doesn't belong to the user themselves
        try:
            referrer = UserModel.objects.get(ref_code=ref_code)
            # Don't log if the user is referring themselves
            if user and referrer.id == user.id:
                return None
        except UserModel.DoesNotExist:
            # Invalid referral code, don't create log
            return None
        
        # Check if similar log already exists
        existing_log = RefLog.objects.filter(
            user=user,
            ref_id=ref_code,
            action_type='CLICK',
            venue_id=venue_id
        ).first()
        
        if existing_log:
            # Similar log exists, skip creating new one
            return existing_log
        
        from omochi.coupons.services import CouponService
        CouponService.assign_referral_onboarding_coupons_to_user(user, ref_code)

        # Create new click log
        return RefLog.objects.create(
            user=user,
            ref_id=ref_code,
            action_type='CLICK',
            action_id=str(venue_id),  # Use venue_id as action_id for clicks
            venue_id=venue_id
        )
