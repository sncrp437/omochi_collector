from django.contrib import admin
from .models import PartnerStore


@admin.register(PartnerStore)
class PartnerStoreAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'order', 'created_at', 'updated_at']
    list_display_links = ['id']  # Make ID clickable to go to detail
    search_fields = ['name']
    list_filter = ['created_at', 'updated_at']
    ordering = ['order', '-created_at']
    
    fields = ['name', 'image', 'order']
    readonly_fields = []
    
    def get_readonly_fields(self, request, obj=None):
        # Make ID read-only in detail view
        if obj:  # editing an existing object
            return self.readonly_fields + ['id']
        return self.readonly_fields
