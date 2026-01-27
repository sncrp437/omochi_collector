# Omochi Payment Integration

This document provides instructions for integrating with Stripe payments in the Omochi platform.

## Setup

1. First, ensure you have the necessary Stripe API keys from your Stripe dashboard:
   - Stripe Publishable Key
   - Stripe Secret Key
   - Stripe Webhook Secret

2. Add these keys to your `.env` file:
   ```
   STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
   STRIPE_SECRET_KEY=sk_test_your_test_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   STRIPE_API_VERSION=2023-10-16
   FRONTEND_URL=http://localhost:3000
   ```

3. The payments app is already integrated with the Omochi platform and configured to work with the orders system.

## Integration Points

### 1. Creating Payments

There are two ways to initiate a payment:

#### Option 1: Through an Order

```http
POST /api/orders/{order_id}/pay/
```

This endpoint will:
- Create a payment transaction for the order
- Generate a Stripe checkout session
- Return a checkout URL that can be used to redirect users to the Stripe payment page

#### Option 2: Direct Payment Creation

```http
POST /api/payments/create_checkout_session/
```

Request body:
```json
{
  "order_id": "uuid-of-order",
  "return_url": "https://your-frontend.com/payment/callback"
}
```

Both methods will return:
```json
{
  "payment_id": "uuid-of-payment",
  "checkout_session_id": "stripe-session-id",
  "checkout_url": "https://checkout.stripe.com/..."
}
```

### 2. Handling Payment Callbacks

After a user completes payment, they will be redirected to:
- Success URL: `{FRONTEND_URL}/payment/status?session_id={CHECKOUT_SESSION_ID}&status=success`
- Cancel URL: `{FRONTEND_URL}/payment/status?status=cancelled`

Your frontend should handle these redirects and:
1. For successful payments, check the payment status using:
   ```http
   GET /api/payments/check_status/?session_id={session_id}
   ```

2. Display appropriate success/failure messages to the user

### 3. Webhook Configuration

To handle asynchronous payment events, set up a webhook in your Stripe dashboard:

1. Go to the Stripe Dashboard > Developers > Webhooks
2. Add an endpoint: `https://your-api.com/api/payments/webhook/`
3. Select the following events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

4. Copy the generated webhook secret and add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

## Testing

For testing, use Stripe's test cards:

- Success: `4242 4242 4242 4242`
- Requires Authentication: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 0002`

Expiration date: any future date
CVC: any 3 digits
ZIP: any 5 digits

## Frontend Integration Example

Here's a basic example of how to integrate with the payment system from your frontend:

```javascript
// Example using React
async function initiatePayment(orderId) {
  try {
    const response = await fetch(`/api/orders/${orderId}/pay/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + yourAuthToken
      }
    });
    
    const data = await response.json();
    
    if (data.checkout_url) {
      // Redirect to Stripe checkout
      window.location.href = data.checkout_url;
    }
  } catch (error) {
    console.error('Payment initiation failed:', error);
  }
}

// In your payment status page:
async function checkPaymentStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const status = urlParams.get('status');
  
  if (status === 'success' && sessionId) {
    try {
      const response = await fetch(`/api/payments/check_status/?session_id=${sessionId}`, {
        headers: {
          'Authorization': 'Bearer ' + yourAuthToken
        }
      });
      
      const paymentData = await response.json();
      
      if (paymentData.status === 'COMPLETED') {
        // Payment successful
        showSuccessMessage();
      } else {
        // Payment in progress or failed
        showStatusMessage(paymentData.status);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  } else if (status === 'cancelled') {
    // Payment cancelled
    showCancelledMessage();
  }
}
```

## Handling Payments in the Admin Panel

The payments app includes an admin interface where you can:
- View all payment transactions
- Check payment statuses
- View associated orders
- See error messages for failed payments

Access this at: `/admin/payments/paymenttransaction/`