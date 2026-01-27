import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _
from django_softdelete.models import SoftDeleteModel

from omochi.venues.models import Venue


class MenuCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    venue = models.ForeignKey(
        Venue, on_delete=models.DO_NOTHING, related_name='menu_categories', blank=True, null=True
    )
    name = models.CharField(max_length=100)
    name_en= models.CharField(blank=True, null=True, verbose_name="Name (English)")
    description = models.TextField(blank=True, null=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order']
        verbose_name_plural = 'Menu Categories'
        db_table = 'menu_category'

    def __str__(self):
        venue_name = self.venue.name if self.venue else "System"
        return f"{self.name} - {venue_name}"


class MenuItem(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    venue = models.ForeignKey(
        Venue, on_delete=models.DO_NOTHING, related_name='menu_items'
    )
    category = models.ForeignKey(
        MenuCategory,
        on_delete=models.DO_NOTHING,
        related_name='items',
        blank=True,
        null=True,
    )
    name = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True, null=True, verbose_name="Name (English)")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    take_out_price = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    description = models.TextField(blank=True, null=True, max_length=150)
    description_en = models.TextField(blank=True, null=True, verbose_name="Description (English)")
    image = models.ImageField(upload_to='menu_items/', blank=True, null=True)
    is_available = models.BooleanField(default=True)
    ingredients = models.TextField(blank=True, null=True)
    preparation_time = models.IntegerField(
        help_text="Preparation time in minutes", blank=True, null=True
    )
    is_alcoholic = models.BooleanField(default=False, help_text="Does this menu item contain alcohol?")
    is_priority_pass = models.BooleanField(default=False, help_text="Is this menu item a priority pass?")
    is_out_of_stock = models.BooleanField(
        default=False, help_text="Is this menu item out of stock?"
    )
    origin_id = models.UUIDField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'menu_item'

    def __str__(self):
        venue_name = self.venue.name if self.venue else "System"
        return f"{self.name} - {venue_name}"
