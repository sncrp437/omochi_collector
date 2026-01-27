import uuid
from django.db import models
from django.conf import settings
from omochi.common.utils import validate_image_format, CompleteImageHandlingMixin

class Article(CompleteImageHandlingMixin, models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=150, db_index=True)
    description = models.TextField()
    summary = models.TextField(
        blank=True,
        null=True,
        help_text='Article summary or excerpt'
    )
    seo_image = models.ImageField(
        upload_to='articles/seo/', 
        blank=True, 
        null=True,
        validators=[validate_image_format],
        help_text='SEO image for social media sharing (PNG/JPG only)'
    )
    content_image = models.ImageField(
        upload_to='articles/content/', 
        blank=True, 
        null=True,
        validators=[validate_image_format],
        help_text='Main content image (PNG/JPG only)'
    )
    content = models.TextField(
        help_text='Main article content'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='articles_created'
    )
    
    class Meta:
        db_table = 'article'
        ordering = ['-created_at']
        verbose_name = 'Article'
        verbose_name_plural = 'Articles'
    
    def __str__(self):
        return self.title
    
    def clean(self):
        """Clean and validate model data"""
        super().clean()
        # Remove description validation since we don't limit it anymore
    
    def save(self, *args, **kwargs):
        """Override save to clean data before saving"""
        self.full_clean()
        super().save(*args, **kwargs)


class ArticleVenueAffiliate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    article = models.ForeignKey(
        Article, 
        related_name='venue_affiliates', 
        on_delete=models.CASCADE
    )
    venue = models.ForeignKey(
        'venues.Venue', 
        on_delete=models.CASCADE, 
        related_name='article_affiliates',
        blank=True,
        null=True,
        help_text='Select a venue (optional)'
    )
    title = models.CharField(
        max_length=150,
        help_text='Display title for this venue affiliate'
    )
    social_link = models.URLField(
        help_text='Social media link for this venue'
    )
    menu_link = models.URLField(
        blank=True, 
        null=True,
        help_text='Menu link for this venue'
    )
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'article_venue_affiliate'
        ordering = ['order', 'created_at']
        verbose_name = 'Article Venue Affiliate'
        verbose_name_plural = 'Article Venue Affiliates'
    
    def __str__(self):
        venue_name = self.venue.name if self.venue else "No Venue"
        return f"{self.article.title} - {venue_name}"
    
    def save(self, *args, **kwargs):
        """Override save to set manual setting title and menu_link from admin"""
        if not self.title and self.venue:
            self.title = self.venue.name
        if not self.menu_link and self.venue and self.venue.website:
            self.menu_link = self.venue.website
        super().save(*args, **kwargs)
