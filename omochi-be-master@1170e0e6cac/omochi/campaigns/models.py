import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from omochi.common.utils import CompleteImageHandlingMixin

class Campaign(models.Model):
    TYPE_CHOICES = [
        ('venue_notice', 'Venue Notice'),
        ('global', 'Global'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='venue_notice')
    title = models.CharField(max_length=50)
    description = models.TextField()
    cta_link = models.CharField(max_length=500, blank=True, null=True)
    target_venue = models.ForeignKey('venues.Venue', on_delete=models.CASCADE, related_name='campaigns')
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='campaigns_created')
    
    class Meta:
        db_table = 'campaign'
        ordering = ['-created_at']
        verbose_name = 'Campaign'
        verbose_name_plural = 'Campaigns'
    
    def __str__(self):
        return f"{self.title} ({self.get_type_display()})"
    
    def clean(self):
        """Clean and validate model data"""
        super().clean()
        if self.description:
            # Normalize line endings
            self.description = self.description.replace('\r\n', '\n').replace('\r', '\n')
    
    def save(self, *args, **kwargs):
        """Override save to clean data before saving"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def image_urls(self):
        """Return list of image URLs"""
        return [image.image.url for image in self.images.all() if image.image]


class CampaignImage(CompleteImageHandlingMixin, models.Model):
    id = models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')
    campaign = models.ForeignKey(Campaign, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='campaigns/', blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'campaign_image'
        ordering = ['order', 'created_at']
        verbose_name = 'Campaign Image'
        verbose_name_plural = 'Campaign Images'
    
    def __str__(self):
        return f"Image for \"{self.campaign.title}\""
