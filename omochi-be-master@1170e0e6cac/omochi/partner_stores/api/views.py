from rest_framework import generics
from rest_framework.permissions import AllowAny
from ..models import PartnerStore
from .serializers import PartnerStoreSerializer


class PartnerStoreListAPIView(generics.ListAPIView):
    """
    API view to list all partner stores
    No authentication required
    Ordered by order field (ascending) then by creation date (LIFO - newest first)
    """
    serializer_class = PartnerStoreSerializer
    permission_classes = [AllowAny]  # No authentication required
    
    def get_queryset(self):
        """Get all partner stores ordered by order field then creation date (LIFO)"""
        return PartnerStore.objects.order_by('order', '-created_at')
