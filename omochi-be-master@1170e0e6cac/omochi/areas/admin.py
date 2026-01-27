from django.contrib import admin
from .models import Area

@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ('prefecture', 'prefecture_en', 'station', 'station_en')
    search_fields = ('prefecture', 'prefecture_en', 'station', 'station_en')
    ordering = ('prefecture', 'station')
    list_filter = ('prefecture', 'prefecture_en')