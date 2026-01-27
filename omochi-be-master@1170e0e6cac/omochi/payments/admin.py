from django.contrib import admin
from omochi.payments.models import PaymentTransaction


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'order', 'user', 'amount', 'status', 
        'application_fee_amount', 'created_at'
    )
    list_filter = (
        'status', 'created_at'
    )
    search_fields = (
        'id', 'order__id', 'user__email', 
        'stripe_payment_intent_id', 'stripe_checkout_session_id',
        'stripe_transfer_id'
    )
    readonly_fields = ('id', 'created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'order', 'user', 'amount', 'status')
        }),
        ('Stripe Details', {
            'fields': (
                'stripe_payment_intent_id', 'stripe_checkout_session_id', 
                'return_url'
            )
        }),
        ('Stripe Connect', {
            'fields': (
                'stripe_transfer_id', 
                'application_fee_amount'
            )
        }),
        ('Additional Information', {
            'fields': ('error_message', 'created_at', 'updated_at')
        }),
    )