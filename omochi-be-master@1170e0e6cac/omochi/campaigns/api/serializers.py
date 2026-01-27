from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from ..models import Campaign
from omochi.common.multilingual_venue_service import MultilingualVenueFieldService

class CampaignSerializer(serializers.ModelSerializer):
    target_venue = serializers.SerializerMethodField()
    image_urls = serializers.SerializerMethodField()
    
    description = serializers.CharField(
        required=True, allow_blank=True, trim_whitespace=False
    )
    
    class Meta:
        model = Campaign
        fields = [
            'id', 'type', 'title', 'description', 'image_urls', 
            'cta_link', 'target_venue', 'start_date', 'end_date', 
            'created_at', 'updated_at'
        ]
    @extend_schema_field({
        'type': 'object',
        'properties': {
            'id': {
                'type': 'string',
                'format': 'uuid',
                'description': 'Venue ID'
            },
            'name': {
                'type': 'string',
                'description': 'Venue name'
            }
        },
        'required': ['id', 'name'],
        'example': {
            'id': 'string',
            'name': 'venue 1'
        }
    })
    def get_target_venue(self, obj):
        request = self.context.get('request')
        venue_name = MultilingualVenueFieldService.get_venue_name(obj.target_venue, request)
        return {'id': str(obj.target_venue.id), 'name': venue_name}
    
    @extend_schema_field({
        'type': 'array',
        'items': {
            'type': 'string',
            'format': 'uri',
            'description': 'Image URL'
        },
        'example': [
            'https://example.com/media/campaigns/image1.jpg',
            'https://example.com/media/campaigns/image2.jpg'
        ]
    })
    def get_image_urls(self, obj):
        request = self.context.get('request')
        urls = []
        for image in obj.images.all():
            if image.image:
                if request:
                    urls.append(request.build_absolute_uri(image.image.url))
                else:
                    urls.append(image.image.url)
        return urls
    
    def validate_title(self, value):
        """Validate title is not empty after trimming"""
        if value:
            stripped_title = value.strip()
            if not stripped_title:
                raise serializers.ValidationError(
                    'Title cannot be empty or contain only spaces.'
                )
            return stripped_title  # Return trimmed value
        return value
