from rest_framework import serializers
from ..models import Article, ArticleVenueAffiliate


class VenueAffiliateSerializer(serializers.ModelSerializer):
    """Serializer for ArticleVenueAffiliate"""
    venue_name = serializers.SerializerMethodField()
    venue_id = serializers.SerializerMethodField()
    
    class Meta:
        model = ArticleVenueAffiliate
        fields = [
            'id', 'venue_id', 'venue_name', 'title',
            'social_link', 'menu_link', 'order'
        ]
    
    def get_venue_name(self, obj):
        """Get venue name, return None if no venue selected"""
        return obj.venue.name if obj.venue else None
    
    def get_venue_id(self, obj):
        """Get venue ID, return None if no venue selected"""
        return obj.venue.id if obj.venue else None


class ArticleListSerializer(serializers.ModelSerializer):
    """Serializer for Article list view"""
    seo_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Article
        fields = [
            'id', 'title', 'description', 'summary',
            'seo_image_url', 'created_at', 'updated_at'
        ]
    
    def get_seo_image_url(self, obj):
        """Get absolute URL for seo image"""
        if obj.seo_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.seo_image.url)
            return obj.seo_image.url
        return None


class ArticleDetailSerializer(serializers.ModelSerializer):
    """Serializer for Article detail view"""
    seo_image_url = serializers.SerializerMethodField()
    content_image_url = serializers.SerializerMethodField()
    venue_affiliates = VenueAffiliateSerializer(many=True, read_only=True)
    
    class Meta:
        model = Article
        fields = [
            'id', 'title', 'description', 'summary', 'content',
            'seo_image_url', 'content_image_url',
            'venue_affiliates', 'created_at', 'updated_at'
        ]
    
    def get_seo_image_url(self, obj):
        """Get absolute URL for seo image"""
        if obj.seo_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.seo_image.url)
            return obj.seo_image.url
        return None
    
    def get_content_image_url(self, obj):
        """Get absolute URL for content image"""
        if obj.content_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.content_image.url)
            return obj.content_image.url
        return None