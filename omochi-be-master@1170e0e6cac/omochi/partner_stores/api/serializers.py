from rest_framework import serializers
from ..models import PartnerStore


class PartnerStoreSerializer(serializers.ModelSerializer):
    """Serializer for PartnerStore model"""
    
    class Meta:
        model = PartnerStore
        fields = (
            'id',
            'name', 
            'image',
            'order',
            'created_at',
            'updated_at'
        )
