from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .serializers import CampaignSerializer
from ..services import CampaignService


class CampaignListView(generics.ListAPIView):
    serializer_class = CampaignSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['type']
    
    def get_queryset(self):
        """
        Return campaigns based on the following rules:
        1. All global campaigns (LIFO order by created_at)
        2. Up to 5 random venue-specific campaigns that target venues the user has stocked
        All campaigns must be active (current date is between start_date and end_date)
        """
        return CampaignService.get_active_campaigns_for_user(self.request.user)