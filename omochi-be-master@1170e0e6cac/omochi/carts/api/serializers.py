from rest_framework import serializers

from omochi.menus.api.serializers import MenuItemSerializer
from omochi.menus.models import MenuItem

from ..models import Cart


class CartSerializer(serializers.ModelSerializer):
    menu_item = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.all(), write_only=True
    )
    menu_item_details = MenuItemSerializer(source="menu_item", read_only=True)

    class Meta:
        model = Cart
        fields = [
            "id",
            "user",
            "menu_item",
            "menu_item_details",
            "quantity",
            "created_at",
            "updated_at",
        ]
