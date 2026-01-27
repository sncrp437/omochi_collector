from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema_field

from omochi.venues.api.serializers import VenueSerializer
from omochi.venues.models import StockedVenue
from omochi.time_slots.api.serializers import TimeSlotSerializer
from omochi.campaigns.api.serializers import CampaignSerializer
from omochi.common.utils import get_timezone_date


class StockedVenueSerializer(serializers.ModelSerializer):
    """Serializer for StockedVenue model"""

    venue_details = VenueSerializer(source='venue', read_only=True)
    timeslots = TimeSlotSerializer(source='venue.time_slots', many=True, read_only=True)
    campaigns = serializers.SerializerMethodField()

    class Meta:
        model = StockedVenue
        fields = (
            'id',
            'user',
            'venue',
            'venue_details',
            'timeslots',
            'campaigns',
            'date_added',
            'is_favorite',
        )
        read_only_fields = ('id', 'date_added', 'user')
    
    # Extend schema field for campaigns
    @extend_schema_field(serializers.ListSerializer(child=CampaignSerializer()))

    def get_campaigns(self, obj):
        """Return only active campaigns"""
        current_date = get_timezone_date('Asia/Tokyo')
        active_campaigns = obj.venue.campaigns.filter(
            start_date__lte=current_date,
            end_date__gte=current_date
        )
        return CampaignSerializer(active_campaigns, many=True, context=self.context).data
