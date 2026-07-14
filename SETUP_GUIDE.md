# Setup & Installation Guide - Stripe Instant Payments

This guide covers the complete setup process for the Stripe instant payments integration.

## Prerequisites

- Node.js 16+ 
- npm or pnpm
- A Stripe account (free at https://stripe.com)
- Environment variables configured

## Installation Steps

### 1. Install Dependencies

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

The following packages will be installed:
- `stripe`: Stripe SDK for payment processing
- `@stripe/stripe-js`: Stripe JavaScript library for frontend
- `dotenv`: Environment variable management
- All existing dependencies

### 2. Get Stripe API Keys

1. Go to https://dashboard.stripe.com/login
2. Sign in (or create an account if you don't have one)
3. Click "Developers" in the left sidebar
4. Click "API Keys" 
5. You'll see two keys:
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)

Keep these keys secure! The secret key should never be exposed in the frontend.

### 3. Setup Stripe Webhooks

To receive payment notifications:

1. Go to https://dashboard.stripe.com/developers/webhooks
2. Click "Add Endpoint"
3. Set the endpoint URL to: `https://yourdomain.com/webhook/stripe`
   - For local development, use the Stripe CLI (see Testing section)
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
5. Click "Add Endpoint"
6. Copy the **Signing Secret** (starts with `whsec_`)

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Stripe Configuration
STRIPE_API_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_RETURN_URL=http://localhost:3001/payment-success

# Render Configuration (existing)
RENDER_WEBHOOK_SECRET=your_render_webhook_secret
RENDER_API_KEY=your_render_api_key
RENDER_API_URL=https://api.render.com/v1

# GitHub Configuration (existing)
GITHUB_API_TOKEN=your_github_token
GITHUB_OWNER_NAME=your_github_owner
GITHUB_REPO_NAME=your_github_repo
GITHUB_WORKFLOW_ID=example.yaml

# Server Configuration
PORT=3001
NODE_ENV=development
```

See `.env.example` for all available options.

### 5. Build the Project

```bash
# TypeScript compilation
pnpm run build

# Or with npm
npm run build
```

### 6. Start the Application

#### Development Mode (with auto-reload)
```bash
pnpm run dev
```

#### Production Mode
```bash
pnpm run start
```

The application will be running at `http://localhost:3001`

## Project Structure

```
webhook-github-action/
├── app.ts                    # Main Express application
├── stripe.ts                 # Stripe payment processor
├── render.ts                 # Render webhook types
├── payment-example.html      # Frontend example
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── .env.example              # Example environment variables
├── STRIPE_INTEGRATION.md     # Stripe API documentation
├── SETUP_GUIDE.md            # This file
├── README.md                 # Original project README
└── dist/                     # Compiled JavaScript (generated)
```

## API Endpoints

### Payment Endpoints

- `POST /payment/create` - Create a payment intent
- `POST /payment/confirm` - Confirm a payment with payment method
- `GET /payment/status/:id` - Check payment status
- `POST /payment/cancel/:id` - Cancel a payment
- `GET /payment/methods` - List available payment methods

### Webhook Endpoints

- `POST /webhook` - Render webhook receiver
- `POST /webhook/stripe` - Stripe webhook receiver

### Other Endpoints

- `GET /` - Health check
- `GET /payment-success` - Payment success page

## Testing

### Test Payment Methods in Development

When `STRIPE_API_KEY` starts with `sk_test_`, you're in test mode and can use:

**Test Cards:**
- Visa: `4242 4242 4242 4242`
- Mastercard: `5555 5555 5555 4444`

**For ACH (US Bank Account):**
- Account: `110000000000000004`
- Routing: `110000000`

**For iDEAL (Netherlands):**
- Use the test selector after selecting iDEAL

### Testing Webhooks Locally

Use the Stripe CLI to test webhooks:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Authenticate:
   ```bash
   stripe login
   ```
3. Forward webhooks to local server:
   ```bash
   stripe listen --forward-to localhost:3001/webhook/stripe
   ```
4. Trigger test events:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

## Development Workflow

### Updating Payment Processing Logic

The `stripe.ts` file contains the `StripePaymentProcessor` class:

```typescript
class StripePaymentProcessor {
    createInstantPayment()      // Create new payment intent
    confirmPayment()            // Confirm payment with method
    getPaymentIntent()          // Get payment status
    cancelPayment()             // Cancel payment
    handlePaymentSucceeded()    // Webhook handler
    handlePaymentFailed()       // Webhook handler
}
```

To add custom logic for successful payments:

1. Open `stripe.ts`
2. Find the `handlePaymentSucceeded()` method
3. Add your logic (e.g., database updates, email notifications)

### Extending Payment Functionality

To add new payment features:

1. Add method to `StripePaymentProcessor` class in `stripe.ts`
2. Create new endpoint in `app.ts` using the new method
3. Update `.env.example` if new environment variables needed
4. Document in `STRIPE_INTEGRATION.md`

## Troubleshooting

### Missing STRIPE_API_KEY Error

```
Error: STRIPE_API_KEY is not set
```

**Solution:** Add `STRIPE_API_KEY` to your `.env` file with your Stripe secret key.

### Webhook Signature Verification Failed

```
Webhook Error: Webhook signature verification failed
```

**Solutions:**
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check webhook endpoint URL matches configuration
- For local testing, use `stripe listen` to get correct secret
- Ensure request body isn't modified before verification

### Payment Intent Not Found

```
No such payment_intent: 'pi_...'
```

**Solutions:**
- Verify payment intent ID is correct
- Check you're using the same Stripe account
- Ensure payment intent hasn't expired (expires after 24 hours)

### TypeScript Compilation Errors

```bash
# Check for errors without building
pnpm run typecheck

# Fix common issues
pnpm install
pnpm run build
```

## Deploying to Render

1. Push code to GitHub
2. Go to https://dashboard.render.com
3. Create new "Web Service"
4. Connect your GitHub repository
5. Set environment variables:
   - `STRIPE_API_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_RETURN_URL` (your Render domain)
   - All existing Render/GitHub env vars
6. Set build command: `pnpm install && pnpm run build`
7. Set start command: `pnpm start`
8. Deploy

### Update Stripe Webhook URL for Production

1. Go to https://dashboard.stripe.com/developers/webhooks
2. Update webhook endpoint URL to your Render domain:
   `https://your-service.onrender.com/webhook/stripe`
3. Update `STRIPE_WEBHOOK_SECRET` with new signing secret

## Performance Considerations

- Payment intents expire after 24 hours
- Webhook processing is asynchronous
- Payments are processed by Stripe, not stored locally
- For production, consider adding a database for payment history
- Implement rate limiting on payment endpoints for security

## Security Checklist

- [ ] Never expose secret keys in frontend code
- [ ] Use HTTPS in production (Render provides this automatically)
- [ ] Verify all webhook signatures
- [ ] Implement rate limiting on payment endpoints
- [ ] Store sensitive data securely (payment history in database)
- [ ] Regularly rotate webhook signing secrets
- [ ] Monitor Stripe dashboard for suspicious activity
- [ ] Keep dependencies updated: `pnpm update`

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Payment Intents Guide](https://stripe.com/docs/payments/payment-intents)

## Getting Help

- **Stripe Issues:** https://support.stripe.com
- **Render Issues:** https://render.com/docs
- **Project Issues:** Check GitHub Issues or contact the maintainer

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure environment variables
3. ✅ Build and start the application
4. ✅ Test payment endpoints
5. ✅ Deploy to production
6. ✅ Monitor payments and webhooks

Good luck with your Stripe integration! 🚀
