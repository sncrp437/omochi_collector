from django.contrib import admin
from .models import RefLog

@admin.register(RefLog)
class RefLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'ref_id', 'venue', 'action_type', 'action_id', 'created_at')
    list_filter = ('action_type', 'created_at')
    search_fields = ('ref_id', 'user__email', 'venue__name', 'action_id')
    date_hierarchy = 'created_at'
