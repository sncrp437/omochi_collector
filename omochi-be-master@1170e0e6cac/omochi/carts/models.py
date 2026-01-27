import uuid

from django.conf import settings
from django.db import models

from omochi.menus.models import MenuItem


class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="carts"
    )
    menu_item = models.ForeignKey(
        MenuItem, on_delete=models.CASCADE, related_name="carts"
    )
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "menu_item")
        db_table = "cart"
        verbose_name_plural = "cars"

    def __str__(self):
        return f"Cart({self.user} - {self.menu_item.name} x {self.quantity})"
