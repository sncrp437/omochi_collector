from django.contrib import admin
from django.utils import timezone
from datetime import timedelta

from .models import Coupon, UserCoupon


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'venue_name',
        'type',
        'value_type',
        'amount',
        'paid_by',
        'expiry_date',
        'is_active',
        'created_at',
        'updated_at',
    )
    
    def venue_name(self, obj):
        return obj.venue.name if obj.venue else "-"
    venue_name.short_description = 'Venue'
    list_filter = ('type', 'value_type', 'paid_by', 'is_active', 'expiry_date')
    search_fields = ('id', 'type', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    fieldsets = (
        (None, {
            'fields': ('id', 'venue', 'type', 'value_type', 'amount', 'paid_by', 'description', 'is_active')
        }),
        ('Time Configuration', {
            'fields': ('expiry_date', 'created_at', 'updated_at')
        }),
        ('Availability', {
            'fields': ('payment_method', 'order_type')
        }),
    )

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        # Set expiry date to 6 months (180 days) from now at 23:59:59
        expiry_date = timezone.now() + timedelta(days=180)  # approximately 6 months
        expiry_date = expiry_date.replace(hour=23, minute=59, second=59, microsecond=0)
        initial['expiry_date'] = expiry_date
        return initial


@admin.register(UserCoupon)
class UserCouponAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'coupon',
        'order',
        'is_used',
        'used_at',
        'expiry_date',
        'created_at',
        'updated_at',
    )
    list_filter = ('is_used', 'created_at', 'expiry_date')
    search_fields = ('id', 'user__email', 'coupon__type', 'order__id')
    readonly_fields = ('id', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
