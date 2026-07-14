# Quick Reference - Stripe Payment API

## Environment Variables Required

```
STRIPE_API_KEY=sk_live_...              # Secret API Key
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook Signing Secret
STRIPE_RETURN_URL=https://...           # Return URL after payment
```

## API Endpoints

### 1. Get Available Payment Methods
```
GET /payment/methods
```
**Response:**
```json
{
  "success": true,
  "methods": [
    {"type": "us_bank_account", "description": "ACH Direct Debit (US)"},
    {"type": "ideal", "description": "iDEAL (Netherlands)"},
    ...
  ]
}
```

### 2. Create Payment Intent
```
POST /payment/create
Content-Type: application/json

{
  "amount": 99.99,
  "currency": "USD",
  "email": "customer@example.com",
  "name": "John Doe",
  "description": "Order #123",
  "metadata": {"orderId": "123"}
}
```
**Response:**
```json
{
  "success": true,
  "paymentIntent": {
    "id": "pi_...",
    "clientSecret": "pi_...secret",
    "status": "requires_payment_method",
    "amount": 9999,
    "currency": "usd"
  }
}
```

### 3. Confirm Payment
```
POST /payment/confirm
Content-Type: application/json

{
  "paymentIntentId": "pi_...",
  "paymentMethodId": "pm_..."
}
```

### 4. Check Payment Status
```
GET /payment/status/pi_...
```
**Possible Status Values:**
- `requires_payment_method` - Waiting for payment details
- `requires_action` - Additional authentication needed
- `processing` - Payment is processing
- `succeeded` - ✓ Payment successful
- `requires_capture` - Authorized but not captured
- `canceled` - Payment canceled

### 5. Cancel Payment
```
POST /payment/cancel/pi_...
```

### 6. Stripe Webhook
```
POST /webhook/stripe
```
Automatically handles:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.succeeded`

### 7. Payment Success Page
```
GET /payment-success
```

## Payment Methods Supported

| Method | Region | Speed | Notes |
|--------|--------|-------|-------|
| ACH Direct Debit | US | 0-2 days | NACHA network |
| iDEAL | Netherlands | Instant | Real-time settlement |
| Bancontact | Belgium | Instant | Real-time settlement |
| SOFORT | Europe | 1-2 days | SEPA payment |
| Credit/Debit Card | Global | Instant | Visa, MC, Amex |

## Test Payment Methods

### Test Cards
- Visa: `4242 4242 4242 4242`
- Mastercard: `5555 5555 5555 4444`
- Amex: `3782 822463 10005`

### US Bank Account (ACH)
- Account: `110000000000000004`
- Routing: `110000000`

### iDEAL (Test)
- Use test selector in payment form

## cURL Examples

### Create Payment
```bash
curl -X POST http://localhost:3001/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### Check Status
```bash
curl http://localhost:3001/payment/status/pi_1234567890
```

### Get Methods
```bash
curl http://localhost:3001/payment/methods
```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing required fields` | amount/currency missing | Add amount and currency |
| `Webhook signature verification failed` | Wrong webhook secret | Verify STRIPE_WEBHOOK_SECRET |
| `No such payment_intent` | Invalid payment ID | Check payment intent ID format |
| `Unable to charge` | Payment method declined | Use test payment method |
| `Customer not found` | Email not provided | Include email in create request |

## Frontend Integration (Minimal Example)

```javascript
// Create payment intent
const response = await fetch('/payment/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 99.99,
    currency: 'USD',
    email: 'user@example.com'
  })
});

const data = await response.json();
const { clientSecret } = data.paymentIntent;

// Use clientSecret with Stripe Elements
// (See payment-example.html for full example)
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 500 | Server error |

## Rate Limits

No built-in rate limits (implement if needed).

Recommended: 10 requests/second per IP

## Webhook Headers to Verify

```
stripe-signature: t=...,v1=...
```

Signature is verified server-side automatically.

## Files for Reference

- **API Documentation**: [STRIPE_INTEGRATION.md](STRIPE_INTEGRATION.md)
- **Setup Instructions**: [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Code Examples**: [API_EXAMPLES.js](API_EXAMPLES.js)
- **Frontend Example**: [payment-example.html](payment-example.html)
- **Implementation**: [stripe.ts](stripe.ts)

## Development Commands

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Start development server
pnpm run dev

# Type checking
pnpm run typecheck

# Start production server
pnpm start

# Test with Stripe CLI
stripe listen --forward-to localhost:3001/webhook/stripe
stripe trigger payment_intent.succeeded
```

## Production Checklist

- [ ] Use live Stripe keys (sk_live_... not sk_test_...)
- [ ] Update webhook endpoint URL to production domain
- [ ] Set STRIPE_RETURN_URL to production domain
- [ ] Enable HTTPS (required by Stripe)
- [ ] Monitor payment events in Stripe Dashboard
- [ ] Setup alerts for failed payments
- [ ] Test payment flow end-to-end
- [ ] Document payment process for support team

## Helpful Links

- [Stripe Dashboard](https://dashboard.stripe.com)
- [API Keys Page](https://dashboard.stripe.com/developers/apikeys)
- [Webhooks Page](https://dashboard.stripe.com/developers/webhooks)
- [Payments Tab](https://dashboard.stripe.com/payments)
- [Stripe Documentation](https://stripe.com/docs)
- [Testing Guide](https://stripe.com/docs/testing)

## Quick Setup Summary

1. Get Stripe keys from dashboard
2. Add to `.env` file
3. Run `pnpm install && pnpm run build`
4. Run `pnpm start`
5. Test payment endpoint
6. Configure webhook in Stripe Dashboard
7. Deploy to production

---

**Need help?** See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed instructions.
