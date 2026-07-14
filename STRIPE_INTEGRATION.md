# Stripe Instant Payments Integration

This guide explains how to use the integrated Stripe payment processing with instant payment methods in your webhook application.

## Features

- **Instant Payment Methods**: Support for ACH Direct Debit, iDEAL, Bancontact, SOFORT, and more
- **Webhook Integration**: Automatic handling of Stripe webhook events
- **Customer Management**: Automatic customer creation and payment method saving
- **Payment Intent Lifecycle**: Create, confirm, check status, and cancel payments
- **Secure Verification**: Stripe webhook signature verification

## Setup

### 1. Get Stripe API Keys

1. Sign up for a [Stripe account](https://stripe.com) if you don't have one
2. Go to the [Stripe Dashboard](https://dashboard.stripe.com)
3. Navigate to **Developers** > **API Keys**
4. Copy your **Secret Key** and **Publishable Key**

### 2. Enable Instant Payment Methods

In the Stripe Dashboard:
1. Go to **Settings** > **Payment Methods**
2. Enable the instant payment methods you want to support:
   - **ACH Direct Debit** (for US customers)
   - **iDEAL** (for Netherlands)
   - **Bancontact** (for Belgium)
   - **SOFORT** (for Europe)

### 3. Setup Webhooks

1. Go to **Developers** > **Webhooks**
2. Click **Add Endpoint**
3. Set the endpoint URL to: `https://your-domain.com/webhook/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
5. Copy the webhook signing secret

### 4. Configure Environment Variables

Create a `.env` file in your project root with:

```env
STRIPE_API_KEY=sk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_RETURN_URL=http://localhost:3001/payment-success
```

See `.env.example` for all available configuration options.

## API Endpoints

### Get Available Payment Methods

```
GET /payment/methods
```

Returns a list of supported instant payment methods.

**Response:**
```json
{
  "success": true,
  "methods": [
    {
      "type": "us_bank_account",
      "description": "ACH Direct Debit (US)"
    },
    {
      "type": "ideal",
      "description": "iDEAL (Netherlands)"
    }
  ]
}
```

### Create a Payment Intent

```
POST /payment/create
Content-Type: application/json

{
  "amount": 99.99,
  "currency": "USD",
  "email": "customer@example.com",
  "name": "John Doe",
  "description": "Service Payment",
  "metadata": {
    "orderId": "123",
    "serviceId": "service-456"
  }
}
```

**Parameters:**
- `amount` (required): Payment amount in dollars/euros (will be converted to cents)
- `currency` (required): Currency code (USD, EUR, etc.)
- `email` (optional): Customer email - creates or retrieves customer
- `name` (optional): Customer name
- `description` (optional): Payment description
- `metadata` (optional): Custom metadata object

**Response:**
```json
{
  "success": true,
  "paymentIntent": {
    "id": "pi_1234567890",
    "clientSecret": "pi_1234567890_secret_xyz",
    "status": "requires_payment_method",
    "amount": 9999,
    "currency": "usd"
  }
}
```

### Confirm a Payment

```
POST /payment/confirm
Content-Type: application/json

{
  "paymentIntentId": "pi_1234567890",
  "paymentMethodId": "pm_9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "paymentIntent": {
    "id": "pi_1234567890",
    "clientSecret": "pi_1234567890_secret_xyz",
    "status": "requires_action",
    "amount": 9999,
    "currency": "usd"
  }
}
```

### Check Payment Status

```
GET /payment/status/:paymentIntentId
```

**Response:**
```json
{
  "success": true,
  "paymentIntent": {
    "id": "pi_1234567890",
    "clientSecret": "pi_1234567890_secret_xyz",
    "status": "succeeded",
    "amount": 9999,
    "currency": "usd"
  }
}
```

### Cancel a Payment

```
POST /payment/cancel/:paymentIntentId
```

**Response:**
```json
{
  "success": true,
  "paymentIntent": {
    "id": "pi_1234567890",
    "clientSecret": "pi_1234567890_secret_xyz",
    "status": "canceled",
    "amount": 9999,
    "currency": "usd"
  }
}
```

## Frontend Integration

### Using Stripe Elements

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://js.stripe.com/v3/"></script>
</head>
<body>
    <form id="payment-form">
        <div id="payment-element"></div>
        <button type="submit">Pay</button>
    </form>

    <script>
        const stripe = Stripe('YOUR_PUBLISHABLE_KEY');
        const elements = stripe.elements();
        const paymentElement = elements.create('payment');
        paymentElement.mount('#payment-element');

        // Create payment intent
        fetch('/payment/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: 99.99,
                currency: 'USD',
                email: 'customer@example.com',
                name: 'John Doe'
            })
        })
        .then(r => r.json())
        .then(data => {
            const { clientSecret } = data.paymentIntent;
            
            // Handle form submission
            document.getElementById('payment-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const { error } = await stripe.confirmPayment({
                    elements,
                    clientSecret,
                    confirmParams: {
                        return_url: 'http://localhost:3001/payment-success'
                    }
                });

                if (error) {
                    console.error(error);
                }
            });
        });
    </script>
</body>
</html>
```

## Payment Flow Diagram

```
1. Customer initiates payment
   ↓
2. Server creates PaymentIntent via /payment/create
   ↓
3. Client displays payment method options (ACH, iDEAL, etc.)
   ↓
4. Customer selects payment method and enters details
   ↓
5. Client confirms payment via /payment/confirm
   ↓
6. Stripe processes instant payment
   ↓
7. Webhook notifies server of payment result
   ↓
8. Customer redirected to success page
```

## Payment Statuses

- `requires_payment_method`: Payment intent created, waiting for payment method
- `requires_action`: Payment method added, customer action required (3D Secure, etc.)
- `processing`: Payment is being processed
- `succeeded`: Payment completed successfully
- `requires_capture`: Payment authorized but not yet captured
- `canceled`: Payment was canceled

## Handling Webhook Events

The application automatically handles these Stripe events:

### payment_intent.succeeded
Triggered when a payment is successfully completed. Customize the handler in `stripe.ts`:

```typescript
async handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    // Add custom logic here:
    // - Update database
    // - Send confirmation email
    // - Trigger fulfillment
}
```

### payment_intent.payment_failed
Triggered when a payment fails. Customize handling in `stripe.ts`:

```typescript
async handlePaymentFailed(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    // Add custom logic here:
    // - Notify customer
    // - Retry payment
    // - Update order status
}
```

### charge.succeeded
Triggered when a charge is successfully completed.

## Testing

### Test Payment Methods

Use these test card numbers in Stripe test mode:

| Payment Method | Test Number |
|---|---|
| US Bank Account | 110000000000000004 |
| Card (Visa) | 4242 4242 4242 4242 |
| Card (Mastercard) | 5555 5555 5555 4444 |

### Test Webhook Events

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to test webhooks locally:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli#install

# Forward webhook events to local server
stripe listen --forward-to localhost:3001/webhook/stripe

# Trigger a test event
stripe trigger payment_intent.succeeded
```

## Error Handling

The API returns structured error responses:

```json
{
  "success": false,
  "error": "Error description"
}
```

Common errors:
- `Missing required fields`: Check that all required parameters are provided
- `Failed to create payment`: Verify Stripe API key is correct
- `Webhook Error`: Verify webhook secret is correct
- `Payment declined`: Customer's payment method was declined

## Security Considerations

1. **Never expose secret keys**: Keep `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` private
2. **Verify webhook signatures**: All webhook handlers verify Stripe signatures
3. **HTTPS required**: Always use HTTPS in production
4. **PCI Compliance**: Never handle raw card data - use Stripe Elements
5. **Rate limiting**: Consider implementing rate limits on payment endpoints

## Troubleshooting

### Webhooks not received
- Verify webhook signing secret is correct
- Check endpoint URL is publicly accessible
- Review Stripe Dashboard > Developers > Webhooks > Event logs

### Payments failing
- Check Stripe Dashboard for declined payments
- Verify payment method is supported in customer's region
- Enable test mode to use test payment methods

### Customer not found
- Ensure email is provided in payment creation
- Check Stripe Dashboard > Customers for existing customers

## Additional Resources

- [Stripe Payment Intents API](https://stripe.com/docs/payments/payment-intents)
- [Stripe Instant Payment Methods](https://stripe.com/docs/payments/instant-methods)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe JavaScript SDK](https://stripe.com/docs/js)
