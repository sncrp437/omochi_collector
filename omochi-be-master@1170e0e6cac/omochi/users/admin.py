from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, Address
from omochi.venues.models import VenueManager


class ManagedVenuesInline(admin.TabularInline):
    model = VenueManager
    extra = 1
    autocomplete_fields = ['venue']


class AddressInline(admin.TabularInline):
    model = Address
    extra = 1


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'first_name', 'last_name', 'phone_number', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'date_joined')
    search_fields = ('email', 'first_name', 'last_name', 'phone_number')
    ordering = ('-date_joined',)
    readonly_fields = ('date_joined', 'last_login')
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'phone_number', 'avatar')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'phone_number', 'password1', 'password2'),
        }),
    )
    
    inlines = [ManagedVenuesInline, AddressInline]


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('user', 'prefecture', 'city', 'is_default', 'created_at')
    list_filter = ('prefecture', 'is_default', 'created_at')
    search_fields = ('user__email', 'prefecture', 'city', 'detail')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ['user']
