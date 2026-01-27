# Stripe Connect Integration

This document outlines the Stripe Connect integration for the OMOCHI platform, which allows venue owners to receive payments directly to their Stripe accounts.

## Overview

OMOCHI uses Stripe Connect with Custom accounts. This allows venues to:
- Receive payments directly from customers
- Complete KYC verification with Stripe
- Manage their own payout schedules
- While allowing OMOCHI to take platform fees based on order type and party size

## Setup

### Environment Variables

The following environment variables need to be set:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_API_VERSION=2023-10-16
```

### Database Models

The integration adds new fields to the following models:

#### Venue
- `stripe_account_id`: The ID of the venue's Stripe Connect account
- `stripe_account_status`: Status of the venue's Stripe account (PENDING, VERIFIED, RESTRICTED, REJECTED)
- `onboarding_complete`: Whether the venue has completed Stripe onboarding
- `payout_enabled`: Whether payouts are enabled for the venue's Stripe account
- `charges_enabled`: Whether charges are enabled for the venue's Stripe account

#### PaymentTransaction
- `stripe_transfer_id`: The ID of the Stripe transfer to the venue's account
- `application_fee_amount`: The amount of the platform fee taken from the payment

### System Settings

A `payment_settings` entry is added to the system settings with:
- `base_service_fee`: Base service fee amount (default: 132 JPY = 120 JPY + 10% tax)

## Fee Structure

OMOCHI uses Stripe's application_fee feature to collect platform fees in all transactions:

### 1. Takeout Orders

- Base fee: 120 JPY + tax = 132 JPY
- The fee is applied as `application_fee_amount` in Stripe
- Venues can choose to subsidize part of this fee for customers:
  - If subsidized, users see a reduced fee (e.g., 50 JPY) in checkout
  - The difference (132 JPY - 50 JPY = 82 JPY) is deducted from venue's payment
  - Field name in order model: `takeout_fee_subsidized_amount`

### 2. Eat-in Orders

- Base fee: 132 JPY × party_size
- The fee is NOT displayed to users (completely hidden)
- Users only see and pay the product prices
- The fee is automatically deducted from venue's payment
- Calculation: `application_fee_amount = 132 × party_size`

## Stripe Connect Flow

1. **Account Creation**:
   - Venue owner initiates Stripe Connect account creation
   - System creates a Custom account with Stripe
   - System stores the account ID in the venue record

2. **Onboarding**:
   - Venue owner completes KYC and verification through Stripe's hosted onboarding
   - Stripe sends webhook events when account status changes
   - System updates the venue's Stripe account status accordingly

3. **Payment Processing**:
   - When a customer makes a payment, the system checks if the venue has a verified Stripe account
   - If yes, payment is processed through Stripe Connect with direct payout to venue
   - Platform fee is calculated based on order type and party size:
     - Takeout: Fixed 132 JPY (optionally subsidized by venue)
     - Eat-in: 132 JPY × party_size (invisible to user)

4. **Webhook Handling**:
   - System listens for Stripe webhook events:
     - `checkout.session.completed`: Update payment and order status
     - `account.updated`: Update venue's Stripe account status
     - `payment_intent.payment_failed`: Handle failed payments

## API Endpoints

### Venue Stripe Connect Management

- `GET /api/venues/{venue_id}/stripe-connect/`: Get Stripe Connect account status
- `POST /api/venues/{venue_id}/stripe-connect/`: Create a new Stripe Connect account
- `POST /api/venues/{venue_id}/stripe-connect/onboarding-link/`: Generate an onboarding link
- `GET /api/venues/{venue_id}/fee-settings/takeout/`: Get venue's takeout fee settings
- `PUT /api/venues/{venue_id}/fee-settings/takeout/`: Update venue's takeout fee settings

### Payment Processing

- `POST /api/payments/create_checkout_session/`: Create a checkout session for payment
- `GET /api/payments/check_status/?session_id={session_id}`: Check payment status
- `POST /api/payments/webhook`: Stripe webhook endpoint
- `GET /api/payments/orders/{order_id}/fees/`: Get fee details for an order

## Webhook Events

OMOCHI listens for the following Stripe webhook events:

1. `checkout.session.completed`: 
   - Updates payment transaction status to COMPLETED
   - Updates order payment status to PAID
   - Records application fee amount and transfer ID

2. `account.updated`:
   - Updates venue's Stripe account status
   - Updates charges_enabled and payout_enabled flags

3. `payment_intent.payment_failed`:
   - Updates payment transaction status to FAILED
   - Updates order payment status to FAILED

## Implementation Details

### Application Fee Calculation

The application fee is calculated based on the order type:

```python
# For takeout orders
application_fee_amount = base_fee  # default 132 JPY

# For eat-in orders
application_fee_amount = base_fee * order.party_size
```

### Stripe Connect Accounts

Venues use Custom accounts, which require:
1. Account creation via API
2. Stripe-hosted onboarding
3. Verification and KYC directly with Stripe

## Testing

### Test Accounts

For testing, use Stripe's test mode and follow their documentation for testing Connect accounts:
https://stripe.com/docs/connect/testing

### Test Webhooks

Use Stripe CLI to forward webhook events to your local environment:

```bash
stripe listen --forward-to localhost:8000/api/payments/webhook
```

## Fee Calculation Examples

### Takeout Order (Standard)
- Product Price: 1,000 JPY
- Service Fee: 132 JPY (visible to user)
- User Pays: 1,132 JPY
- Omochi Receives: 132 JPY
- Venue Receives: 1,000 JPY

### Takeout Order (Venue Subsidized)
- Product Price: 1,000 JPY
- Displayed Fee: 50 JPY (venue subsidizes 82 JPY)
- User Pays: 1,050 JPY
- Omochi Receives: 132 JPY (via application_fee)
- Venue Receives: 918 JPY

### Eat-in Order (2 people)
- Product Price: 2,000 JPY
- Displayed Fee: None (hidden from user)
- User Pays: 2,000 JPY
- Omochi Receives: 264 JPY (132 JPY × 2)
- Venue Receives: 1,736 JPY
