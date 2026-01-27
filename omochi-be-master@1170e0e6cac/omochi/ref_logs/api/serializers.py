from rest_framework import serializers
from ..models import RefLog
from omochi.venues.models import Venue


class RefLogClickSerializer(serializers.Serializer):
    """
    Serializer for logging referral clicks
    """
    ref_code = serializers.CharField(max_length=20, help_text="The referral code")
    venue_id = serializers.UUIDField(help_text="The venue ID being referenced")
    
    def validate_ref_code(self, value):
        """
        Validate that ref_code is not empty
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Referral code cannot be empty")
        return value.strip()
        
    def validate_venue_id(self, value):
        """
        Validate that venue with given ID exists
        """
        try:
            Venue.objects.get(id=value)
        except Venue.DoesNotExist:
            raise serializers.ValidationError("Venue with this ID does not exist")
        return value


class RefLogResponseSerializer(serializers.ModelSerializer):
    """
    Serializer for RefLog response
    """
    class Meta:
        model = RefLog
        fields = ['id', 'user', 'ref_id', 'action_type', 'action_id', 'venue', 'created_at']
        read_only_fields = ['id', 'user', 'ref_id', 'action_type', 'action_id', 'venue', 'created_at']
