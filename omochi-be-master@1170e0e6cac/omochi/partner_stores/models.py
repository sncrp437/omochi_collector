import uuid
from django.db import models
from omochi.common.utils import validate_image_format, CompleteImageHandlingMixin


class PartnerStore(CompleteImageHandlingMixin, models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=200, 
        blank=True, 
        null=True,
        help_text='Partner store name'
    )
    image = models.ImageField(
        upload_to='partner_stores/', 
        validators=[validate_image_format],
        help_text='Partner store image (PNG/JPG only)'
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text='Order for display (lower numbers shown first)'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'partner_store'
        ordering = ['order', '-created_at']  # LIFO ordering as requested
        verbose_name = 'Partner Store'
        verbose_name_plural = 'Partner Stores'
    
    def __str__(self):
        return self.name or f"Partner Store {str(self.id)[:8]}"
    
    def save(self, *args, **kwargs):
        """Override save to clean data before saving"""
        self.full_clean()
        super().save(*args, **kwargs)
