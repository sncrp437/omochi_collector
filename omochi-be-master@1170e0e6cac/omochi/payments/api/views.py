import os
import time
import stripe
from datetime import datetime
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    OpenApiExample,
)

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import status, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction
from django.utils.translation import gettext_lazy as _

from omochi.orders.models import Order
from omochi.payments.models import PaymentTransaction
from omochi.payments.api.serializers import (
    PaymentTransactionSerializer,
    PaymentCheckoutSessionSerializer,
    PaymentStatusSerializer,
)
import logging

logger = logging.getLogger(__name__)

# Initialize Stripe with API key from settings
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')
stripe.api_version = os.environ.get('STRIPE_API_VERSION', '2025-04-30.basil')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')


class PaymentTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing and retrieving payment transactions.
    """
    serializer_class = PaymentTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="List user payment transactions",
        description="Returns a list of payment transactions for the current user",
        responses={
            200: OpenApiResponse(response=PaymentTransactionSerializer(many=True), 
                                description="Payment transactions retrieved successfully"),
            401: OpenApiResponse(description="Authentication required"),
        }
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Get payment transaction details",
        description="Retrieve details for a specific payment transaction",
        responses={
            200: OpenApiResponse(response=PaymentTransactionSerializer, 
                                description="Payment transaction retrieved successfully"),
            401: OpenApiResponse(description="Authentication required"),
            404: OpenApiResponse(description="Payment transaction not found"),
        }
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return PaymentTransaction.objects.all()
        return PaymentTransaction.objects.filter(user=user)


class CreateCheckoutSessionView(APIView):
    """
    Create a Stripe checkout session for payment
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Create payment checkout session",
        description="Create a Stripe checkout session for payment",
        request=PaymentCheckoutSessionSerializer,
        responses={
            200: OpenApiResponse(
                description="Checkout session created successfully",
                response={
                    "type": "object",
                    "properties": {
                        "payment_id": {"type": "string", "format": "uuid"},
                        "checkout_session_id": {"type": "string"},
                        "checkout_url": {"type": "string", "format": "uri"}
                    }
                }
            ),
            400: OpenApiResponse(description="Bad request or order already paid"),
            404: OpenApiResponse(description="Order not found"),
            500: OpenApiResponse(description="Stripe error"),
        },
        examples=[
            OpenApiExample(
                "Checkout Session Example",
                summary="Sample checkout session request",
                value={
                    "order_id": "123e4567-e89b-12d3-a456-426614174000",
                    "return_url": "https://example.com/payment/status"
                },
                request_only=True
            )
        ]
    )
    def post(self, request):
        serializer = PaymentCheckoutSessionSerializer(data=request.data)
        if serializer.is_valid():
            order_id = serializer.validated_data['order_id']
            return_url = serializer.validated_data.get('return_url', f"{FRONTEND_URL}/payment/status")
            
            try:
                with transaction.atomic():
                    order = Order.objects.select_for_update().get(id=order_id)
                    venue = order.venue
                    
                    # Check if order is already paid
                    if order.payment_status == 'PAID':
                        return Response(
                            {'error': _('This order has already been paid for')},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    if order.status == 'CANCELLED':
                        return Response(
                            {'error': _('This order has been cancelled')},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    if order.payment_method != 'ONLINE':
                        return Response(
                            {'error': _('This order cannot be paid online')},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    if venue.stripe_account_status != 'VERIFIED':
                        return Response(
                            {'error': _('This venue has not completed Stripe onboarding')},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Check for existing pending or processing payment
                    existing_payment = PaymentTransaction.objects.filter(
                        order=order,
                        status__in=['PENDING', 'PROCESSING'],
                    ).order_by('-created_at').first()
                    
                    # If there's an existing payment with a checkout URL, verify it's still valid
                    if existing_payment:
                        try:
                            checkout_session = stripe.checkout.Session.retrieve(
                                existing_payment.stripe_checkout_session_id,
                                stripe_account=existing_payment.order.venue.stripe_account_id
                            )
                            
                            # Check if the session is still usable (not expired or used)
                            current_time = int(time.time())
                            if checkout_session.status != 'complete' and (not checkout_session.expires_at or checkout_session.expires_at > current_time):
                                # Return the existing checkout session details
                                logger.info(f"Reusing existing checkout session for order {order_id}: {existing_payment.stripe_checkout_session_id}")
                                return Response({
                                    'payment_id': existing_payment.id,
                                    'checkout_session_id': existing_payment.stripe_checkout_session_id,
                                    'checkout_url': checkout_session.url
                                })
                        except stripe.error.StripeError:
                            # If there's an error retrieving the session, it's likely invalid
                            # Continue to create a new one
                            logger.warning(f"Could not retrieve existing checkout session {existing_payment.stripe_checkout_session_id} for order {order_id}")
                            pass
                    
                    # If order total is 0, mark as paid immediately without creating a checkout session
                    if order.total_amount == 0:
                        # Update order payment status
                        order.payment_status = 'PAID'
                        order.save()
                        
                        # Create a completed payment transaction record
                        payment = PaymentTransaction.objects.create(
                            order=order,
                            user=request.user if request.user.is_authenticated else None,
                            amount=0,
                            status='COMPLETED',
                            return_url=return_url
                        )
                        
                        return Response({
                            'payment_id': payment.id,
                            'status': 'COMPLETED',
                            'message': _('Order has been processed as paid since total amount is 0.')
                        })
                    
                    # Create a payment transaction in our database (user can be null now)
                    payment = PaymentTransaction.objects.create(
                        order=order,
                        user=request.user if request.user.is_authenticated else None,
                        amount=order.total_amount,
                        status='PENDING',
                        return_url=return_url
                    )
                    
                    # Get currency from settings or use default
                    currency = getattr(settings, 'DEFAULT_CURRENCY', 'jpy').lower()
    
                    # Create line items for Stripe checkout
                    line_items = []
                    for item in order.items.all():
                        line_items.append({
                            'price_data': {
                                'currency': currency,
                                'product_data': {
                                    'name': item.menu_item.name,
                                },
                                'unit_amount': int(
                                    item.menu_item.take_out_price
                                    if item.menu_item.take_out_price is not None and item.order.order_type == 'TAKEOUT'
                                    else item.menu_item.price
                                ),
                            },
                            'quantity': item.quantity,
                        })
                    
                    # Create Stripe checkout session
                    checkout_session_args = {
                        'payment_method_types': ['card'],
                        'line_items': line_items,
                        'mode': 'payment',
                        'success_url': f"{return_url}?session_id={{CHECKOUT_SESSION_ID}}&status=success",
                        'cancel_url': f"{return_url}?session_id={{CHECKOUT_SESSION_ID}}&status=cancelled",
                        'metadata': {
                            'order_id': str(order.id),
                            'payment_id': str(payment.id)
                        }
                    }
                    
                    # Add customer email if authenticated
                    if request.user.is_authenticated:
                        checkout_session_args['customer_email'] = request.user.email

                    application_fee_amount = int(order.application_fee_amount - order.application_fee_discount_amount)
                    
                    # For takeout orders, check if there's a subsidized fee amount
                    if order.order_type == 'TAKEOUT' and order.takeout_fee_subsidized_amount - order.application_fee_discount_amount > 0:
                        # If there's a subsidized amount, add it as a separate line item in checkout
                        # This is the amount user will see and pay
                        checkout_session_args['line_items'].append({
                            'price_data': {
                                'currency': currency,
                                'product_data': {
                                    'name': 'サービス利用料',  # Service Fee in Japanese
                                },
                                'unit_amount': int(order.takeout_fee_subsidized_amount - order.application_fee_discount_amount),  # e.g., 132 JPY
                            },
                            'quantity': 1,
                        })
                    # If there's a discount, apply it as an explicit discount
                    if order.order_discount_amount > 0:
                        # Create a discount coupon that will be applied to this checkout session only
                        # IMPORTANT: Create coupon on the same Stripe account as the checkout session
                        coupon = stripe.Coupon.create(
                            amount_off=int(order.order_discount_amount),
                            currency=currency,
                            name='割引',  # Discount in Japanese
                            # Set a short duration since this is a one-time use
                            duration='once',
                            stripe_account=venue.stripe_account_id
                        )
                        # Apply the coupon to the checkout session
                        checkout_session_args['discounts'] = [{
                            'coupon': coupon.id,
                        }]
                        
                    checkout_session_args['payment_intent_data'] = {
                        'application_fee_amount': application_fee_amount,
                    }
                    
                    # Save application fee info in payment transaction
                    payment.application_fee_amount = application_fee_amount
                    payment.save(update_fields=['application_fee_amount'])

                    # Set expiration time based on order's time slot start time
                    # Default to 30 minutes from now if no time slot or start time is in the past
                    current_time = int(time.time())                    
                    # Default expiration is 30 minutes
                    expires_at = current_time + 30 * 60
                    
                    # If order has a time slot with a start time, use that as expiration
                    if hasattr(order, 'time_slot_start_datetime') and order.time_slot_start_datetime:
                        from django.utils import timezone
                        time_slot_start = order.time_slot_start_datetime
                        now = timezone.now()
                        # Check if time slot is less than 15 minutes away
                        time_diff = (time_slot_start - now).total_seconds() / 60
                        
                        # If less than 15 minutes away, prevent checkout
                        if time_diff < 15:
                            return Response(
                                {'error': _('Cannot process payment as the reservation time is less than 15 minutes away.')},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    
                    # Convert Unix timestamp to datetime for the Django model
                    payment.expired_at = datetime.fromtimestamp(expires_at)
                    checkout_session_args['expires_at'] = expires_at

                    # Create Stripe checkout session
                    checkout_session = stripe.checkout.Session.create(
                        **checkout_session_args,
                        stripe_account=venue.stripe_account_id,
                    )
                    
                    # Update payment transaction with Stripe session ID
                    payment.stripe_checkout_session_id = checkout_session.id
                    payment.status = 'PROCESSING'
                    payment.save()
                
                # Return checkout session details
                return Response({
                    'payment_id': payment.id,
                    'checkout_session_id': checkout_session.id,
                    'checkout_url': checkout_session.url
                })
                
            except Order.DoesNotExist:
                return Response(
                    {'error': _('Order not found')},
                    status=status.HTTP_404_NOT_FOUND
                )
            except stripe.error.StripeError as e:                
                # Check for minimum amount error message
                if 'total amount must convert to at least' in str(e):
                    error_message = _('The order amount is too small for processing payment. Minimum amount required is 50 cents equivalent.')
                    return Response({'error': error_message}, status=status.HTTP_400_BAD_REQUEST)
                
                logger.error(f"Stripe error when creating checkout session: order_id {order_id} {str(e)}")
                raise e
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    summary="Check payment status",
    description="Check the status of a payment using the Stripe session ID",
    parameters=[
        OpenApiParameter(
            name="session_id",
            description="Stripe checkout session ID",
            required=True,
            type=str,
            location=OpenApiParameter.QUERY
        ),
    ],
    responses={
        200: OpenApiResponse(
            description="Payment status retrieved successfully",
            response={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]
                    },
                    "order_id": {"type": "string", "format": "uuid"},
                    "venue_id": {"type": "string", "format": "uuid"},
                    "amount": {"type": "number", "format": "float"}
                }
            }
        ),
        400: OpenApiResponse(description="Invalid parameters"),
        404: OpenApiResponse(description="Payment not found"),
        500: OpenApiResponse(description="Error checking payment status"),
    },
    examples=[
        OpenApiExample(
            "Payment Status Example",
            summary="Sample payment status request",
            value={
                "session_id": "cs_test_123456789"
            },
            request_only=True
        )
    ]
)
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def check_payment_status(request):
    """
    Check the status of a payment using the Stripe session ID
    """
    serializer = PaymentStatusSerializer(data=request.query_params)
    if serializer.is_valid():
        session_id = serializer.validated_data['session_id']
        
        try:
            # Retrieve the payment from our database
            payment = PaymentTransaction.objects.get(stripe_checkout_session_id=session_id)
            
            # If payment is still processing, check with Stripe
            if payment.status in ['PENDING', 'PROCESSING']:
                try:
                    # Retrieve the checkout session from Stripe
                    checkout_session = stripe.checkout.Session.retrieve(
                        session_id,
                        stripe_account=payment.order.venue.stripe_account_id
                    )
                    
                    if checkout_session.payment_status == 'paid':
                        # Use transaction to ensure both payment and order updates happen atomically
                        with transaction.atomic():
                            # Lock payment and order for update to prevent race conditions
                            payment = PaymentTransaction.objects.select_for_update().get(
                                stripe_checkout_session_id=session_id
                            )
                            order = Order.objects.select_for_update().get(id=payment.order.id)
                            
                            # Update payment status
                            payment.status = 'COMPLETED'
                            payment.save()
                            
                            # Update order payment status
                            order.payment_status = 'PAID'
                            order.payment_method = 'ONLINE'
                            order.save()
                except stripe.error.StripeError as e:
                    logger.error(f"Stripe error when checking payment status: session_id {session_id} {str(e)}")
                    return Response(
                        {'error': _('Internal Server Error')},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
            # Return payment details
            return Response({
                'status': payment.status,
                'order_id': payment.order.id,
                'venue_id': payment.order.venue.id,
                'amount': payment.amount,
            })
            
        except PaymentTransaction.DoesNotExist:
            return Response(
                {'error': _('Payment not found for this session ID')},
                status=status.HTTP_404_NOT_FOUND
            )
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Handle Stripe webhook events
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
    
    # Log webhook request in a single line
    logger.info(f"Stripe webhook received | Content Length: {len(payload)} bytes | Signature: {sig_header[:10]}... | Headers: {dict(request.headers)}")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        
        # Log event details in a single line
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            logger.info(f"Stripe webhook event | Type: {event['type']} | ID: {event['id']} | Session ID: {session.id} | Payment Status: {session.payment_status} | Amount: {session.amount_total} | Metadata: {session.get('metadata', {})}")
        elif event['type'] == 'checkout.session.expired':
            session = event['data']['object']
            logger.info(f"Stripe webhook event | Type: {event['type']} | ID: {event['id']} | Session ID: {session.id} | Expired At: {session.expires_at} | Metadata: {session.get('metadata', {})}")
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            error_msg = payment_intent.get('last_payment_error', {}).get('message', 'Unknown error')
            logger.info(f"Stripe webhook event | Type: {event['type']} | ID: {event['id']} | Intent ID: {payment_intent.id} | Error: {error_msg}")
        # Log Stripe Connect specific events
        elif event['type'] == 'account.updated':
            logger.info(f"Stripe webhook event (should use connect webhook) | Type: {event['type']} | ID: {event['id']}")
        else:
            logger.info(f"Stripe webhook event | Type: {event['type']} | ID: {event['id']}")
        
    except ValueError as e:
        logger.error(f"Stripe webhook error | Type: Invalid payload | Error: {str(e)}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Stripe webhook error | Type: Invalid signature | Error: {str(e)}")
        return HttpResponse(status=400)
    
    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        handle_payment_completed(event)
    elif event['type'] == 'checkout.session.expired':
        handle_payment_expired(event)
    elif event['type'] == 'payment_intent.payment_failed':
        handle_payment_failed(event)
    
    return HttpResponse(status=200)

def handle_payment_completed(event: stripe.Event):
    """
    Handle the payment completed event
    """
    session = event['data']['object']
    
    # Get payment and order from metadata
    order_id = session.get('metadata', {}).get('order_id')
    payment_id = session.get('metadata', {}).get('payment_id')
    
    if not order_id or not payment_id:
        logger.error(f"Stripe webhook error | Type: Missing metadata | Order ID: {order_id} | Payment ID: {payment_id}")
        return HttpResponse(status=200)  # Return 200 to acknowledge receipt
    
    try:
        with transaction.atomic():
            # Lock payment and order for update to prevent race conditions
            payment = PaymentTransaction.objects.select_for_update().get(id=payment_id)
            order = Order.objects.select_for_update().get(id=order_id)
            
            # Update payment transaction
            payment.status = 'COMPLETED'
            payment.stripe_payment_intent_id = session.payment_intent
            
            # Get payment intent to check for transfer information and fees
            payment_intent = stripe.PaymentIntent.retrieve(
                session.payment_intent,
                stripe_account=order.venue.stripe_account_id
            )

            payment.is_direct_payout = True
                
            # Record application fee amount (already stored when creating session, but verify)
            if payment_intent.application_fee_amount:
                payment.application_fee_amount = payment_intent.application_fee_amount
            
            payment.save()
            
            # Update order
            order.payment_status = 'PAID'
            order.payment_method = 'ONLINE'
            
            # Update the application fee amount in the order record too (if not already set)
            if payment.application_fee_amount and not order.application_fee_amount:
                order.application_fee_amount = payment.application_fee_amount
            
            order.save()
            
            logger.info(f"Stripe webhook success | Type: checkout.session.completed | Order ID: {order_id} | Payment ID: {payment_id} | Is Direct Payout: {payment.is_direct_payout} | Application Fee: {payment.application_fee_amount}")
            
    except (PaymentTransaction.DoesNotExist, Order.DoesNotExist) as e:
        # Log the error but return a 200 response to acknowledge receipt
        logger.error(f"Stripe webhook error | Type: Record not found | Order ID: {order_id} | Payment ID: {payment_id} | Error: {str(e)}")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe webhook error | Type: Stripe API error | Order ID: {order_id} | Payment ID: {payment_id} | Error: {str(e)}")
    

def handle_payment_expired(event: stripe.Event):
    """
    Handle the payment expired event
    """
    session = event['data']['object']
        
    # Get payment and order from metadata
    order_id = session.get('metadata', {}).get('order_id')
    payment_id = session.get('metadata', {}).get('payment_id')
    
    if not order_id or not payment_id:
        logger.error(f"Stripe webhook error | Type: Missing metadata | Order ID: {order_id} | Payment ID: {payment_id}")
        return HttpResponse(status=200)  # Return 200 to acknowledge receipt
    
    try:
        with transaction.atomic():
            # Lock payment and order for update to prevent race conditions
            payment = PaymentTransaction.objects.select_for_update().get(id=payment_id)
            order = Order.objects.select_for_update().get(id=order_id)
            
            # Only update if the order status is still PENDING and payment status is PENDING or PROCESSING
            if order.payment_status != 'PAID' and payment.status in ['PENDING', 'PROCESSING']:
                # Update payment transaction
                payment.status = 'CANCELLED'
                payment.error_message = 'Checkout session expired'
                payment.save()
                
                # Update order status to CANCELLED
                old_status = order.status
                order.status = 'CANCELLED'

                # Find and update user coupons related to this order
                from omochi.coupons.models import UserCoupon
                user_coupons = UserCoupon.objects.filter(order=order, is_used=True)
                for user_coupon in user_coupons:
                    user_coupon.is_used = False
                    user_coupon.order = None
                    user_coupon.used_at = None
                    user_coupon.save()
                    logger.info(f"Reset coupon {user_coupon.id} for cancelled order {order.id}")
                    
                order.save()
                order.save_status_history(old_status, order.status, None)
                
                logger.info(f"Stripe webhook success | Type: checkout.session.expired | Order ID: {order_id} | Payment ID: {payment_id} | Order and payment cancelled due to checkout session expiration")
            else:
                logger.info(f"Stripe webhook skipped | Type: checkout.session.expired | Order ID: {order_id} | Payment ID: {payment_id} | Order status: {order.status} | Payment status: {payment.status} | No action needed")
    
    except (PaymentTransaction.DoesNotExist, Order.DoesNotExist) as e:
        logger.error(f"Stripe webhook error | Type: Record not found | Order ID: {order_id} | Payment ID: {payment_id} | Error: {str(e)}")
    except Exception as e:
        logger.error(f"Stripe webhook error | Type: Unexpected error | Order ID: {order_id} | Payment ID: {payment_id} | Error: {str(e)}")


def handle_payment_failed(event: stripe.Event):
    """
    Handle the payment failed event
    """
    payment_intent = event['data']['object']
    session_id = None
    
    try:
        # Try to find the session ID from the payment intent
        sessions = stripe.checkout.Session.list(payment_intent=payment_intent.id)
        if sessions and sessions.data:
            session_id = sessions.data[0].id
        
        if session_id:
            try:
                with transaction.atomic():
                    # Lock payment and order for update to prevent race conditions
                    payment = PaymentTransaction.objects.select_for_update().get(
                        stripe_checkout_session_id=session_id
                    )
                    order = Order.objects.select_for_update().get(id=payment.order.id)
                    
                    payment.status = 'FAILED'
                    payment.error_message = payment_intent.get('last_payment_error', {}).get('message', 'Payment failed')
                    payment.save()
                    
                    # Also update the order's payment status
                    order.payment_status = 'FAILED'
                    order.save()
                    
                    logger.info(f"Stripe webhook success | Type: payment_intent.payment_failed | Session ID: {session_id} | Order ID: {order.id} | Payment ID: {payment.id}")
            except PaymentTransaction.DoesNotExist:
                logger.error(f"Stripe webhook error | Type: Record not found | Session ID: {session_id} | Error: Payment not found")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe webhook error | Type: Stripe API error | Intent ID: {payment_intent.id} | Error: {str(e)}")

@csrf_exempt
@require_POST
def stripe_connect_webhook(request):
    """
    Handle Stripe Connect webhook events for connected accounts
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    connect_webhook_secret = os.environ.get('STRIPE_CONNECT_WEBHOOK_SECRET')
    
    # Log webhook request in a single line
    logger.info(f"Stripe Connect webhook received | Content Length: {len(payload)} bytes | Signature: {sig_header[:10]}... | Headers: {dict(request.headers)}")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, connect_webhook_secret
        )
        logger.info(f"Stripe Connect webhook event | Type: {event['type']} | ID: {event['id']} | Event metadata: {event['data']['object']}")
    except ValueError as e:
        logger.error(f"Stripe Connect webhook error | Type: Invalid payload | Error: {str(e)}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Stripe Connect webhook error | Type: Invalid signature | Error: {str(e)}")
        return HttpResponse(status=400)

    # Handle the payment events
    if event['type'] == 'checkout.session.completed':
        handle_payment_completed(event)
    elif event['type'] == 'checkout.session.expired':
        handle_payment_expired(event)
    elif event['type'] == 'payment_intent.payment_failed':
        handle_payment_failed(event)
    # Handle the account.updated event for Stripe Connect
    elif event['type'] == 'account.updated':
        account = event['data']['object']
        account_id = account.id
        
        # Find the venue with this Stripe account ID
        from omochi.venues.models import Venue
        try:
            venue = Venue.objects.get(stripe_account_id=account_id)
            
            # Update venue based on account status
            venue.charges_enabled = account.charges_enabled
            venue.payout_enabled = account.payouts_enabled
            
            # If both charges and payouts are enabled, the account is verified
            if account.charges_enabled and account.payouts_enabled:
                venue.enable_online_payment = True
                venue.stripe_account_status = 'VERIFIED'
                venue.onboarding_complete = True
            # If requirements are specified, the account might be restricted
            elif account.requirements and account.requirements.get('disabled_reason'):
                venue.stripe_account_status = 'RESTRICTED'
            else:
                venue.stripe_account_status = 'PENDING'
            
            venue.save(update_fields=[
                'charges_enabled', 
                'payout_enabled', 
                'stripe_account_status',
                'onboarding_complete'
            ])
            
            logger.info(f"Stripe Connect webhook success | Type: account.updated | Account ID: {account_id} | Venue ID: {venue.id} | Status: {venue.stripe_account_status}")
            
        except Venue.DoesNotExist:
            logger.error(f"Stripe Connect webhook error | Type: Venue not found | Account ID: {account_id}")
    
    # Handle account deauthorization
    elif event['type'] == 'account.application.deauthorized':
        application = event['data']['object']
        account_id = application.account
        
        from omochi.venues.models import Venue
        try:
            venue = Venue.objects.get(stripe_account_id=account_id)
            
            # Mark the account as deauthorized
            venue.stripe_account_status = 'DEAUTHORIZED'
            venue.charges_enabled = False
            venue.payout_enabled = False
            venue.onboarding_complete = False
            
            venue.save(update_fields=[
                'stripe_account_status',
                'charges_enabled', 
                'payout_enabled',
                'onboarding_complete'
            ])
            
            logger.info(f"Stripe Connect webhook success | Type: account.application.deauthorized | Account ID: {account_id} | Venue ID: {venue.id}")
            
        except Venue.DoesNotExist:
            logger.error(f"Stripe Connect webhook error | Type: Venue not found for deauth | Account ID: {account_id}")
    
    # Handle capability updates (charges, transfers, etc.)
    elif event['type'] == 'capability.updated':
        capability = event['data']['object']
        account_id = capability.account
        capability_type = capability.id
        capability_status = capability.status
        
        from omochi.venues.models import Venue
        try:
            venue = Venue.objects.get(stripe_account_id=account_id)
            
            # Update specific capabilities
            if capability_type == 'card_payments':
                venue.charges_enabled = capability_status == 'active'
            elif capability_type == 'transfers':
                venue.payout_enabled = capability_status == 'active'
            
            # Update overall status based on capabilities
            if venue.charges_enabled and venue.payout_enabled:
                venue.stripe_account_status = 'VERIFIED'
                venue.onboarding_complete = True
            elif capability_status == 'inactive':
                venue.stripe_account_status = 'RESTRICTED'
            
            venue.save(update_fields=[
                'charges_enabled', 
                'payout_enabled', 
                'stripe_account_status',
                'onboarding_complete'
            ])
            
            logger.info(f"Stripe Connect webhook success | Type: capability.updated | Account ID: {account_id} | Venue ID: {venue.id} | Capability: {capability_type} | Status: {capability_status}")
            
        except Venue.DoesNotExist:
            logger.error(f"Stripe Connect webhook error | Type: Venue not found for capability | Account ID: {account_id}")
    
    return HttpResponse(status=200)


@extend_schema(
    summary="Create order payment",
    description="Create a payment for a specific order",
    responses={
        200: OpenApiResponse(
            description="Checkout session created successfully",
            response={
                "type": "object",
                "properties": {
                    "payment_id": {"type": "string", "format": "uuid"},
                    "checkout_session_id": {"type": "string"},
                    "checkout_url": {"type": "string", "format": "uri"}
                }
            }
        ),
        400: OpenApiResponse(description="Invalid parameters"),
        404: OpenApiResponse(description="Order not found"),
        500: OpenApiResponse(description="Error processing payment"),
    },
    examples=[
        OpenApiExample(
            "Payment Example",
            summary="Sample payment request",
            value={
                "return_url": "https://example.com/payment/status"
            },
            request_only=True
        )
    ]
)
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def order_payment(request, order_id):
    """
    Create a payment for a specific order
    """
    # Prepare the checkout data
    checkout_data = {
        'order_id': order_id,
        'return_url': request.data.get('return_url', f"{FRONTEND_URL}/payment/status")
    }

    # Validate the data
    serializer = PaymentCheckoutSessionSerializer(data=checkout_data)
    if serializer.is_valid():
        # Use the checkout session view which now includes all validations
        view = CreateCheckoutSessionView()
        view.permission_classes = [permissions.AllowAny]  # Override view permissions
        request._full_data = checkout_data
        return view.post(request)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)