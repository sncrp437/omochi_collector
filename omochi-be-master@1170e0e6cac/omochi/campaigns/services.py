from django.db.models import Q, Case, When, Value, IntegerField
import random
from typing import List

from .models import Campaign
from omochi.common.utils import get_timezone_date


class CampaignService:
    """Service layer for campaign-related business logic"""
    
    @staticmethod
    def get_active_campaigns_for_user(user):
        """
        Return campaigns based on the following rules:
        1. All global campaigns (LIFO order by created_at)
        2. Up to 5 random venue-specific campaigns that target venues the user has stocked
        All campaigns must be active (current date is between start_date and end_date)
        """
        current_date = get_timezone_date('Asia/Tokyo')
        
        # Get all active campaigns
        active_campaigns = CampaignService._get_active_campaigns(current_date)
        
        # Get global campaigns
        global_campaigns = CampaignService._get_global_campaigns(active_campaigns)
        
        # Get stocked venue IDs for the user
        stocked_venue_ids = CampaignService._get_user_stocked_venue_ids(user)
        
        # Get venue-specific campaigns for user's stocked venues
        venue_campaigns = CampaignService._get_venue_campaigns_for_stocked_venues(
            active_campaigns, stocked_venue_ids
        )
        
        # Combine and order campaigns
        return CampaignService._combine_and_order_campaigns(global_campaigns, venue_campaigns)
    
    @staticmethod
    def _get_active_campaigns(current_date):
        """Get all campaigns that are currently active"""
        return Campaign.objects.select_related('target_venue', 'created_by').prefetch_related('images').filter(
            start_date__lte=current_date,
            end_date__gte=current_date
        )
    
    @staticmethod
    def _get_global_campaigns(active_campaigns):
        """Get all global campaigns from active campaigns"""
        return active_campaigns.filter(type='global')
    
    @staticmethod
    def _get_user_stocked_venue_ids(user):
        """Get venue IDs that the user has stocked"""
        return user.stocked_venues.values_list('venue_id', flat=True)
    
    @staticmethod
    def _get_venue_campaigns_for_stocked_venues(active_campaigns, stocked_venue_ids):
        """Get venue-specific campaigns that match the user's stocked venues"""
        return active_campaigns.filter(
            ~Q(type='global'),  # Exclude global campaigns
            target_venue__id__in=stocked_venue_ids
        ).distinct()
    
    @staticmethod
    def _get_random_venue_campaign_ids(venue_campaigns, max_count=5) -> List[int]:
        """Get up to max_count random venue campaign IDs"""
        venue_campaign_ids = list(venue_campaigns.values_list('id', flat=True))
        
        if len(venue_campaign_ids) > max_count:
            venue_campaign_ids = random.sample(venue_campaign_ids, max_count)
        
        return venue_campaign_ids
    
    @staticmethod
    def _combine_and_order_campaigns(global_campaigns, venue_campaigns):
        """
        Combine global and venue campaigns with proper ordering:
        - Global campaigns first (ordered by created_at desc)
        - Then up to 5 random venue campaigns (ordered by created_at desc)
        """
        venue_campaign_ids = CampaignService._get_random_venue_campaign_ids(venue_campaigns)
        
        if venue_campaign_ids:
            # Combine the IDs of both global and venue campaigns
            global_campaign_ids = list(global_campaigns.values_list('id', flat=True))
            campaign_ids = global_campaign_ids + venue_campaign_ids
            
            # Add a priority field to sort by type (global first, then venue-specific)
            all_campaigns = Campaign.objects.filter(id__in=campaign_ids).annotate(
                priority=Case(
                    When(type='global', then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                )
            ).order_by('priority', '-created_at')
            
            return all_campaigns
        else:
            # If no venue campaigns match, just return global campaigns
            return global_campaigns.order_by('-created_at')
