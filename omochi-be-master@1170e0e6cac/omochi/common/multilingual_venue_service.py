"""
Service for handling multilingual venue-related fields in serializers
"""

from typing import Any, Optional
from django.http import HttpRequest
from omochi.common.multilingual_service import MultilingualService


class MultilingualVenueFieldService:
    """
    Service to handle multilingual venue fields in serializers that reference venues
    """
    
    @classmethod
    def get_venue_name(cls, venue_obj: Any, request: Optional[HttpRequest] = None) -> str:
        """
        Get venue name with multilingual support
        
        Args:
            venue_obj: Venue model instance
            request: Django request object for language detection
            
        Returns:
            Localized venue name string
        """
        if not venue_obj:
            return ""
        
        if not request:
            return venue_obj.name
        
        # Check if multilingual is disabled via query param
        enable_multilingual = request.GET.get('multilingual', 'true').lower() != 'false'
        
        if enable_multilingual:
            # Get localized venue name based on Accept-Language header
            localized_fields = MultilingualService.get_localized_fields(
                venue_obj, request=request
            )
            return localized_fields.get('name', venue_obj.name)
        
        return venue_obj.name
    
    @classmethod
    def get_venue_address(cls, venue_obj: Any, request: Optional[HttpRequest] = None) -> str:
        """
        Get venue address with multilingual support
        """
        if not venue_obj:
            return ""
        
        if not request:
            return venue_obj.address
        
        enable_multilingual = request.GET.get('multilingual', 'true').lower() != 'false'
        
        if enable_multilingual:
            localized_fields = MultilingualService.get_localized_fields(
                venue_obj, request=request
            )
            return localized_fields.get('address', venue_obj.address)
        
        return venue_obj.address
    
    @classmethod
    def get_venue_description(cls, venue_obj: Any, request: Optional[HttpRequest] = None) -> str:
        """
        Get venue description with multilingual support
        """
        if not venue_obj:
            return ""
        
        if not request:
            return venue_obj.description
        
        enable_multilingual = request.GET.get('multilingual', 'true').lower() != 'false'
        
        if enable_multilingual:
            localized_fields = MultilingualService.get_localized_fields(
                venue_obj, request=request
            )
            return localized_fields.get('description', venue_obj.description)
        
        return venue_obj.description


class VenueFieldSerializerMixin:
    """
    Mixin to provide common venue field methods for serializers
    """
    
    def get_venue_name_multilingual(self, obj):
        """Get venue name with multilingual support - can be used in any serializer"""
        venue = getattr(obj, 'venue', None)
        request = self.context.get('request')
        return MultilingualVenueFieldService.get_venue_name(venue, request)
    
    def get_venue_address_multilingual(self, obj):
        """Get venue address with multilingual support"""
        venue = getattr(obj, 'venue', None) 
        request = self.context.get('request')
        return MultilingualVenueFieldService.get_venue_address(venue, request)
    
    def get_venue_description_multilingual(self, obj):
        """Get venue description with multilingual support"""
        venue = getattr(obj, 'venue', None)
        request = self.context.get('request') 
        return MultilingualVenueFieldService.get_venue_description(venue, request)