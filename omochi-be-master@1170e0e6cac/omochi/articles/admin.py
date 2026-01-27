import logging
from django.contrib import admin
from omochi.settings import FRONTEND_URL
from .models import Article, ArticleVenueAffiliate
from .forms import ArticleAdminForm, ArticleVenueAffiliateAdminForm

logger = logging.getLogger(__name__)

class ArticleVenueAffiliateInline(admin.TabularInline):
    model = ArticleVenueAffiliate
    form = ArticleVenueAffiliateAdminForm
    extra = 1
    fields = ['venue', 'title', 'social_link', 'menu_link', 'order']
    view_on_site = False
    verbose_name = "Venue Affiliate Link"
    verbose_name_plural = "Venue Affiliate Links"


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    form = ArticleAdminForm
    list_display = [
        'title_link', 'truncated_description', 
        'created_by', 'created_at', 'updated_at'
    ]
    list_filter = ['created_at', 'updated_at']
    search_fields = ['title', 'description', 'content']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [ArticleVenueAffiliateInline]
    list_per_page = 20
    change_form_template = "admin/article_change_form.html"
    
    fieldsets = (
        ('Article Information', {
            'fields': ('title', 'description'),
            'description': 'Basic information about the article post'
        }),
        ('SEO Image', {
            'fields': ('seo_image',),
            'description': 'SEO image for social media sharing (PNG/JPG only)'
        }),
        ('Article Content', {
            'fields': ('summary', 'content_image', 'content'),
            'description': 'Article content including summary, image and main content'
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',),
            'description': 'System generated information'
        })
    )
    
    def title_link(self, obj):
        """Display title as a link to the detail page"""
        from django.urls import reverse
        from django.utils.html import format_html
        url = reverse('admin:articles_article_change', args=[obj.pk])
        return format_html('<a href="{}">{}</a>', url, obj.title)
    title_link.short_description = 'Title'
    title_link.admin_order_field = 'title'
    
    def truncated_description(self, obj):
        """Display truncated description"""
        if obj.description:
            if len(obj.description) > 50:
                return f"{obj.description[:50]}..."
            return obj.description
        return "-"
    truncated_description.short_description = 'Description'
    truncated_description.admin_order_field = 'description'
    
    def save_model(self, request, obj, form, change):
        """Override save to set created_by for new articles"""
        if not change:  # If this is a new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def get_queryset(self, request):
        """Optimize queryset with select_related"""
        return super().get_queryset(request).select_related('created_by')
    
    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        """
        Add FRONTEND_URL to template context.
        
        Args:
            request: HTTP request object
            object_id: ID of the object being edited (optional)
            form_url: URL for the form (optional)
            extra_context: Additional context data (optional)
            
        Returns:
            HttpResponse: The rendered change form view
        """
        extra_context = extra_context or {}
        
        # Get FRONTEND_URL from settings with secure fallback
        frontend_url = FRONTEND_URL
        if not frontend_url:
            # Log warning if FRONTEND_URL is not configured
            logger.warning("FRONTEND_URL not configured in settings, using default")
            frontend_url = 'https://omochiapp.com'
            
        extra_context['FRONTEND_URL'] = frontend_url
        return super().changeform_view(request, object_id, form_url, extra_context)
