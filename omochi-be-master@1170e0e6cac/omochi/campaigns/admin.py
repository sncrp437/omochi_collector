from django.contrib import admin
from .models import Campaign, CampaignImage
from .forms import CampaignAdminForm


class CampaignImageInline(admin.TabularInline):
    model = CampaignImage
    min_num = 0  # Images are optional
    extra = 0
    fields = ['image', 'order']
    view_on_site = False

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    form = CampaignAdminForm
    list_display = [
        'title', 'type', 'target_venue', 'start_date', 'end_date', 
        'created_by', 'created_at', 'updated_at'
    ]
    list_filter = ['type', 'target_venue', 'start_date', 'end_date', 'created_at']
    search_fields = ['title', 'target_venue__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [CampaignImageInline]
    
    fieldsets = (
        ('Campaign Information', {
            'fields': ('type', 'title', 'description'),
            'description': 'Basic information about the campaign'
        }),
        ('Call to Action', {
            'fields': ('cta_link',),
            'description': 'Optional link for users to take action'
        }),
        ('Targeting', {
            'fields': ('target_venue',),
            'description': 'Select venue for this campaign'
        }),
        ('Schedule', {
            'fields': ('start_date', 'end_date'),
            'description': 'When the campaign should be active'
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
            'description': 'System generated information'
        })
    )
    
    def save_model(self, request, obj, form, change):
        """Override save to set created_by for new campaigns"""
        if not change:  # If this is a new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
