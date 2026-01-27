# Register your models here.
from django import forms
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.http import HttpResponse
from openpyxl.styles import Alignment
from io import BytesIO
import openpyxl
import pytz

from .models import TimeSlot, Reservation, ReservationStatusHistory, ReservationQuestion


class ReservationQuestionInline(admin.TabularInline):
    model = ReservationQuestion
    extra = 0
    readonly_fields = ('id', 'created_at', 'updated_at')
    fields = ('order_index', 'question', 'question_en', 'answer', 'answer_en',)
    ordering = ('order_index',)
    formfield_overrides = {
        model._meta.get_field('question').__class__: {
            'widget': forms.TextInput(attrs={'size': 25, 'style': 'min-width:150px;'})
        },
        model._meta.get_field('question_en').__class__: {
            'widget': forms.TextInput(attrs={'size': 25, 'style': 'min-width:150px;'})
        },
        model._meta.get_field('answer').__class__: {
            'widget': admin.widgets.AdminTextareaWidget(
                attrs={
                    'rows': 3,
                    'cols': 15,
                    'style': 'resize:vertical; min-width:200px; width:100%;'
                }
            )
        },
        model._meta.get_field('answer_en').__class__: {
            'widget': admin.widgets.AdminTextareaWidget(
                attrs={
                    'rows': 3,
                    'cols': 15,
                    'style': 'resize:vertical; min-width:200px; width:100%;'
                }
            )
        },
    }


@admin.action(description='Export to Excel')
def export_reservations_to_excel(modeladmin, request, queryset):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Reservations"

    headers = [
        'Reservation ID',
        'Reservation Code',
        'Venue Name',
        'Venue ID',
        'User ID',
        'User Email',
        'User Name',
        'Date',
        'Start Time',
        'End Time',
        'Party Size',
        'Status',
        'Order Codes',
        'Created At (JST)',
        'Updated At (JST)',
    ]
    ws.append(headers)

    for col in ws.iter_cols(min_row=1, max_row=1):
        for cell in col:
            cell.alignment = Alignment(horizontal='center', vertical='center')

    tokyo_tz = pytz.timezone('Asia/Tokyo')

    for obj in queryset:
        # Get order codes
        order_codes = []
        for order in obj.orders.all():
            order_codes.append(order.order_code)
        order_codes_str = ', '.join(order_codes) if order_codes else 'No orders'

        # Convert times to JST
        created_at_jst = obj.created_at.astimezone(tokyo_tz).strftime('%Y-%m-%d %H:%M:%S') if obj.created_at else 'N/A'
        updated_at_jst = obj.updated_at.astimezone(tokyo_tz).strftime('%Y-%m-%d %H:%M:%S') if obj.updated_at else 'N/A'

        # Create the row
        row = [
            str(obj.id),
            str(obj.reservation_code),
            str(obj.venue.name) if obj.venue else 'N/A',
            str(obj.venue.id) if obj.venue else 'N/A',
            str(obj.user.id) if obj.user else 'N/A',
            str(obj.user.email) if obj.user else 'N/A',
            f"{obj.user.first_name} {obj.user.last_name}".strip() if obj.user else 'N/A',
            obj.date.strftime('%Y-%m-%d') if obj.date else 'N/A',
            obj.start_time.strftime('%H:%M') if obj.start_time else 'N/A',
            obj.end_time.strftime('%H:%M') if obj.end_time else 'N/A',
            str(obj.party_size) if obj.party_size else 'N/A',
            str(obj.get_status_display()),
            order_codes_str,
            created_at_jst,
            updated_at_jst,
        ]
        
        ws.append(row)

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    response = HttpResponse(
        content=buffer.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=reservations.xlsx'

    return response


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'venue_link',
        'service_type',
        'start_time',
        'end_time',
        'slot_interval',
        'max_reservations',
    )
    search_fields = ('venue__name', 'start_time', 'end_time', 'service_type')
    list_filter = ('venue',)
    ordering = ('venue', 'start_time')
    
    def venue_link(self, obj):
        """Create a link to venue detail page"""
        if obj.venue:
            url = reverse('admin:venues_venue_change', args=[obj.venue.id])
            return format_html('<a href="{}">{}</a>', url, obj.venue.name)
        return "-"
    venue_link.short_description = 'Venue'
    venue_link.admin_order_field = 'venue__name'


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'reservation_code',
        'venue_link',
        'user',
        'date',
        'start_time',
        'end_time',
        'party_size',
        'status',
        'order_links',
        'created_at_local',
    )
    list_filter = (
        'venue',
        'user',
        'status',
        'date',
    )
    search_fields = (
        'reservation_code',
        'venue__name',
        'user__email',
        'user__first_name',
        'user__last_name',
    )
    readonly_fields = (
        'id',
        'reservation_code',
        'created_at',
        'updated_at',
        'order_links',
        'created_at_local',
    )
    ordering = ('-created_at',)
    actions = [export_reservations_to_excel]
    inlines = [ReservationQuestionInline]
    
    def venue_link(self, obj):
        """Create a link to venue detail page"""
        if obj.venue:
            url = reverse('admin:venues_venue_change', args=[obj.venue.id])
            return format_html('<a href="{}">{}</a>', url, obj.venue.name)
        return "-"
    venue_link.short_description = 'Venue'
    venue_link.admin_order_field = 'venue__name'
    
    def has_order(self, obj):
        """Check if reservation has related orders"""
        return obj.orders.exists()
    has_order.boolean = True
    has_order.short_description = 'Has Order'
    
    def order_links(self, obj):
        """Display order links when reservation has orders"""
        orders = obj.orders.all()
        if not orders.exists():
            return "No orders"
        
        order_links = []
        for order in orders:
            order_url = reverse('admin:orders_order_change', args=[order.id])
            order_links.append(
                format_html(
                    '<a href="{}">#{}</a>',
                    order_url,
                    order.order_code
                )
            )
        
        return format_html('<br>'.join(order_links))
    order_links.short_description = 'Order Code'
    
    def created_at_local(self, obj):
        """Display created_at in local timezone"""
        if obj.created_at:
            # Convert to local timezone (assuming Asia/Tokyo for this application)
            tokyo_tz = pytz.timezone('Asia/Tokyo')
            local_time = obj.created_at.astimezone(tokyo_tz)
            return local_time.strftime('%Y-%m-%d %H:%M:%S')
        return "-"
    created_at_local.short_description = 'Created At (JST)'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related and prefetch_related for better performance"""
        queryset = super().get_queryset(request).select_related('venue', 'user', 'time_slot').prefetch_related('orders', 'reservation_questions')
        
        # Only show reservations without orders (consistent with API)
        queryset = queryset.filter(orders__isnull=True)
        
        return queryset


@admin.register(ReservationStatusHistory)
class ReservationStatusHistoryAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'reservation_link',
        'old_status',
        'new_status',
        'changed_by',
        'changed_at_local',
    )
    list_filter = (
        'old_status',
        'new_status',
        'changed_at',
    )
    search_fields = (
        'reservation__reservation_code',
        'reservation__venue__name',
        'reservation__user__email',
    )
    readonly_fields = (
        'id',
        'changed_at',
        'changed_at_local',
    )
    ordering = ('-changed_at',)
    
    def reservation_link(self, obj):
        """Create a link to reservation detail page"""
        if obj.reservation:
            url = reverse('admin:reservations_reservation_change', args=[obj.reservation.id])
            return format_html('<a href="{}">{}</a>', url, obj.reservation.reservation_code)
        return "-"
    reservation_link.short_description = 'Reservation'
    reservation_link.admin_order_field = 'reservation__reservation_code'
    
    def changed_at_local(self, obj):
        """Display changed_at in local timezone"""
        if obj.changed_at:
            # Convert to local timezone (assuming Asia/Tokyo for this application)
            tokyo_tz = pytz.timezone('Asia/Tokyo')
            local_time = obj.changed_at.astimezone(tokyo_tz)
            return local_time.strftime('%Y-%m-%d %H:%M:%S')
        return "-"
    changed_at_local.short_description = 'Changed At (Local)'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related for better performance"""
        queryset = super().get_queryset(request).select_related(
            'reservation__venue', 
            'reservation__user', 
            'changed_by'
        )
        
        # By default, only show status history for reservations without orders (consistent with API)
        queryset = queryset.filter(reservation__orders__isnull=True)
        
        return queryset


@admin.register(ReservationQuestion)
class ReservationQuestionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'reservation_link',
        'question_preview',
        'answer_preview',
        'order_index',
        'created_at',
    )
    list_filter = (
        'created_at',
        'reservation__venue',
    )
    search_fields = (
        'reservation__reservation_code',
        'question',
        'answer',
    )
    readonly_fields = (
        'id',
        'created_at',
        'updated_at',
    )
    ordering = ('reservation', 'order_index')
    
    def reservation_link(self, obj):
        """Create a link to reservation detail page"""
        if obj.reservation:
            url = reverse('admin:reservations_reservation_change', args=[obj.reservation.id])
            return format_html('<a href="{}">{}</a>', url, obj.reservation.reservation_code)
        return "-"
    reservation_link.short_description = 'Reservation'
    reservation_link.admin_order_field = 'reservation__reservation_code'
    
    def question_preview(self, obj):
        """Display a preview of the question"""
        return obj.question[:50] + "..." if len(obj.question) > 50 else obj.question
    question_preview.short_description = 'Question'
    
    def answer_preview(self, obj):
        """Display a preview of the answer"""
        return obj.answer[:50] + "..." if len(obj.answer) > 50 else obj.answer
    answer_preview.short_description = 'Answer'
    
    def get_queryset(self, request):
        """Optimize queryset with select_related for better performance"""
        return super().get_queryset(request).select_related('reservation')
