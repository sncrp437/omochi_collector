from rest_framework import serializers
from omochi.areas.models import Area
from omochi.common.multilingual_service import MultilingualSerializerMixin

class AreaSerializer(MultilingualSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ['id', 'prefecture', 'station'] 