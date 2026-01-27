from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from omochi.orders.models import Order
from omochi.reservations.models import TimeSlot
from omochi.notifications.services import firebase_service
import logging

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Order)
def track_order_status_change(sender, instance, **kwargs):
    """
    Track the previous status before saving to detect status changes
    """
    if instance.pk:
        try:
            previous_instance = Order.objects.get(pk=instance.pk)
            instance._previous_status = previous_instance.status
            instance._previous_payment_status = previous_instance.payment_status
        except Order.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None

@receiver(post_save, sender=Order)
def update_on_order_save(sender, instance, created, **kwargs):
    """
    Send notifications for new orders and status changes.
    """

    logger.info(f"Order {instance.id} saved. Created: {created}, Status: {instance.status}")

    prev_payment_status = getattr(instance, '_previous_payment_status', None)

    if ((created and instance.payment_method == 'CASH') or 
        (instance.payment_method == 'ONLINE' and 
         prev_payment_status != instance.payment_status and 
         instance.payment_status == 'PAID')):
        # Notify venue managers about the new order
        try:
            firebase_service.send_new_order_notification_to_venue(instance)
        except Exception as e:
            logger.error(f"Failed to send new order notification: {str(e)}")
    # Order updated - check if status changed and notify customer
    previous_status = getattr(instance, '_previous_status', None)

    if (previous_status != 'READY' and instance.status == 'READY'):
        try:
            firebase_service.send_order_status_notification(instance)
        except Exception as e:
            logger.error(f"Failed to send order status notification: {str(e)}")
    
    # Send invoice email only when order status becomes COMPLETED
    if instance.status == 'COMPLETED' and previous_status != 'COMPLETED':
        try:
            # Call the function directly instead of using Celery to avoid broker connection issuesing Celery
            from omochi.common.direct_email_service import email_service
            from omochi.orders.models import Order
            from omochi.system_setting.services import SystemSettingService
            
            order = Order.objects.select_related('user', 'venue').prefetch_related('items__menu_item').get(id=instance.id)
            
            if not order.user or not order.user.email:
                logger.warning(f"Order {instance.id} has no user or email")
            else:
                tax_rate = order.application_fee_tax_rate or SystemSettingService.get_application_fee_tax_rate()
                
                # Build order items list for invoice template
                items = []
                venue_subtotal = 0
                for order_item in order.items.all():
                    item_data = {
                        'name': order_item.menu_item.name,
                        'quantity': order_item.quantity,
                        'price': float(order_item.subtotal)
                    }
                    items.append(item_data)
                    venue_subtotal += float(order_item.subtotal)
                
                # Map order types for template
                order_type = 'takeout' if order.order_type == 'TAKEOUT' else 'eat_in'
                
                # Map payment methods for template
                payment_method_map = {
                    'CASH': '現金決済',
                    'ONLINE': 'Stripe'
                }
                payment_method = payment_method_map.get(order.payment_method, order.payment_method)
                
                # Extract discount amounts
                venue_coupon_discount = round(order.order_discount_amount) if order.order_discount_amount else 0
                # application_fee_discount_amount is tax-inclusive, extract pre-tax amount
                omochi_coupon_discount = round(order.application_fee_discount_amount) if order.application_fee_discount_amount else 0

                # Calculate service fee (both amounts are already tax-inclusive)
                service_fee_total = float(order.takeout_fee_subsidized_amount - order.application_fee_discount_amount) if order.takeout_fee_subsidized_amount else 0
                # Extract pre-tax amount and tax from the tax-inclusive total
                service_fee_pretax = round(float(order.takeout_fee_subsidized_amount) / (1 + float(tax_rate)))
                service_tax = int(order.takeout_fee_subsidized_amount - service_fee_pretax)

                # Build comprehensive invoice data structure
                invoice_data = {
                    'invoice_number': order.order_code,
                    'order_date': order.order_date.strftime('%Y年%m月%d日'),
                    'customer_name': order.user.get_full_name() if order.user else 'ゲスト',
                    'venue_name': order.venue.name if order.venue else 'N/A',
                    'payment_method': payment_method,
                    'order_type': order_type,
                    'items': items,
                    'venue_subtotal': round(venue_subtotal),
                    'venue_coupon_discount': round(venue_coupon_discount),
                    'service_fee_pretax': service_fee_pretax,
                    'omochi_coupon_discount': round(omochi_coupon_discount),
                    'service_tax': round(service_tax),
                    'service_fee_total': round(service_fee_total),
                    'total_amount': round(float(order.total))
                }
                
                success = email_service.send_invoice_email(
                    recipient_email=order.user.email,
                    invoice_data=invoice_data
                )
                
                if success:
                    logger.info(f"Invoice email sent for completed order {instance.id}")
                else:
                    logger.error(f"Failed to send invoice email for order {instance.id}")
        
        except Exception as e:
            import traceback
            logger.error(f"Failed to send invoice email for order {instance.id}: {str(e)}\nStack trace: {traceback.format_exc()}")
