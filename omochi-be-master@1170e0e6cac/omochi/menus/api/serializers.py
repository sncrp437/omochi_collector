from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from omochi.menus.models import MenuCategory, MenuItem
from omochi.common.multilingual_service import MultilingualSerializerMixin


class MenuCategorySerializer(MultilingualSerializerMixin, serializers.ModelSerializer):
    """Serializer for menu category"""

    system_category = serializers.SerializerMethodField()

    name_en = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )

    class Meta:
        model = MenuCategory
        fields = ('id', 'name', 'name_en', 'description', 'display_order', 'system_category')
        read_only_fields = ('id',)

    def get_system_category(self, obj) -> bool:
        return obj.venue is None


class MenuItemSerializer(MultilingualSerializerMixin, serializers.ModelSerializer):
    """Serializer for menu item"""

    category = serializers.PrimaryKeyRelatedField(
        queryset=MenuCategory.objects.all(), required=False, allow_null=True
    )
    category_name = serializers.ReadOnlyField(source='category.name')
    description = serializers.CharField(max_length=150, allow_blank=True, allow_null=True, required=False, trim_whitespace=False)
    origin_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = MenuItem
        fields = (
            'id',
            'name',
            'price',
            'description',
            'image',
            'take_out_price',
            'is_available',
            'category',
            'category_name',
            'ingredients',
            'preparation_time',
            'is_out_of_stock',
            'is_alcoholic',
            'is_priority_pass',
            'origin_id',
        )
        read_only_fields = ('id', 'is_out_of_stock')


class MenuItemDetailSerializer(MenuItemSerializer):
    """Serializer for detailed menu item information"""

    origin_id = serializers.IntegerField(read_only=True)

    class Meta(MenuItemSerializer.Meta):
        pass


class MenuCategoryWithItemsSerializer(MenuCategorySerializer):
    """Serializer for menu category with its items"""

    items = serializers.SerializerMethodField()

    class Meta(MenuCategorySerializer.Meta):
        fields = MenuCategorySerializer.Meta.fields + ('items',)

    @extend_schema_field(MenuItemSerializer(many=True))
    def get_items(self, obj):
        venue_id = self.context.get('venue_id')
        items = obj.items.filter(venue_id=venue_id).order_by('created_at')
        # pass full context to serializer to enable multilingual
        return MenuItemSerializer(items, many=True, context=self.context).data


class MenuItemStockUpdateSerializer(serializers.Serializer):
    menu_item_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=True,
        help_text="List of MenuItem UUIDs to update"
    )

    
