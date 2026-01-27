from django.contrib import admin

from .models import SystemSetting


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'created_at', 'updated_at')
    search_fields = ('key', 'value')
    ordering = ('key',)
