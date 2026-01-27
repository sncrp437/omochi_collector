import os
import stripe
from django.conf import settings
from decimal import Decimal

# Initialize Stripe with API key from settings
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
stripe.api_version = os.environ.get('STRIPE_API_VERSION', '2025-04-30.basil')


class StripeConnectService:
    """
    Service for handling Stripe Connect operations
    """
    
    @staticmethod
    def create_account(venue):
        """
        Create a new Stripe Connect custom account for a venue
        """
        try:
            # Create a Custom account with the venue's basic info
            # Use environment variable for country to support different regions in test/prod
            account_country = os.environ.get('STRIPE_CONNECTED_ACCOUNT_COUNTRY', 'JP')
            
            account = stripe.Account.create(
                type='custom',
                country=account_country,
                email=venue.email,
                business_type='company',
                capabilities={
                    'card_payments': {'requested': True},
                    'transfers': {'requested': True},
                },
                business_profile={
                    'name': venue.name,
                    'url': venue.website,
                    'support_email': venue.email,
                },
                metadata={
                    'venue_id': str(venue.id),
                }
            )
            
            # Update the venue with the new Stripe account ID
            venue.stripe_account_id = account.id
            venue.stripe_account_status = 'CREATED'
            venue.save(update_fields=['stripe_account_id', 'stripe_account_status'])
            
            return account
            
        except stripe.error.StripeError as e:
            # Log the error and re-raise
            raise e
    
    @staticmethod
    def create_account_link(venue):
        """
        Create an account link for onboarding
        """
        if not venue.stripe_account_id:
            # Create the account first if it doesn't exist
            account = StripeConnectService.create_account(venue)
            venue.stripe_account_id = account.id
            venue.save(update_fields=['stripe_account_id'])
        
        # Get frontend URL from environment
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        # Create an account link for the venue to complete onboarding
        account_link = stripe.AccountLink.create(
            account=venue.stripe_account_id,
            refresh_url=f"{frontend_url}/venue/settings-venue",
            return_url=f"{frontend_url}/venue/settings-venue",
            type='account_onboarding',
            collect='eventually_due',
        )
        
        return account_link
    
    @staticmethod
    def retrieve_account(venue):
        """
        Retrieve a Stripe account and update venue status
        """
        if not venue.stripe_account_id:
            return None
            
        account = stripe.Account.retrieve(venue.stripe_account_id)
        
        # Update venue based on account status
        venue.charges_enabled = account.charges_enabled
        venue.payout_enabled = account.payouts_enabled
        
        # If both charges and payouts are enabled, the account is verified
        if account.charges_enabled and account.payouts_enabled:
            venue.stripe_account_status = 'VERIFIED'
            venue.onboarding_complete = True
        # If requirements are specified, the account might be restricted
        elif account.requirements and account.requirements.get('disabled_reason'):
            venue.stripe_account_status = 'RESTRICTED'
        
        venue.save(update_fields=[
            'charges_enabled', 
            'payout_enabled', 
            'stripe_account_status',
            'onboarding_complete'
        ])
        
        return account