# Migration Guide - Adding Stripe to Existing Installation

This guide helps you upgrade an existing webhook-github-action installation to include Stripe instant payments.

## What's New

- ✅ Stripe payment processing with instant payment methods (ACH, iDEAL, Bancontact, SOFORT)
- ✅ Payment intent lifecycle management
- ✅ Webhook integration for payment events
- ✅ Customer management
- ✅ Multiple currency support
- ✅ Full TypeScript support
- ✅ Comprehensive API documentation

## Migration Steps

### 1. Update Dependencies

```bash
pnpm install
# or
npm install
```

This will install the new Stripe dependencies:
- `stripe` - Stripe SDK
- `@stripe/stripe-js` - Stripe JavaScript library
- `dotenv` - Environment variable management

### 2. New Files Added

The following new files have been added to your project:

```
stripe.ts                    # Stripe payment processor class
types.ts                     # TypeScript type definitions
.env.example                 # Environment variable template
payment-example.html         # Frontend payment example
STRIPE_INTEGRATION.md         # Stripe API documentation
SETUP_GUIDE.md               # Complete setup instructions
API_EXAMPLES.js              # Code examples
MIGRATION_GUIDE.md           # This file
```

### 3. Environment Variables

Add the new Stripe environment variables to your `.env` file:

```bash
# Required
STRIPE_API_KEY=sk_live_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# Optional
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
STRIPE_RETURN_URL=https://yourdomain.com/payment-success
```

See `.env.example` for all available options.

### 4. Build & Test

```bash
# Compile TypeScript
pnpm run build

# Start development server
pnpm run dev

# Or run production build
pnpm start
```

### 5. Test Payment Endpoints

Test the new payment endpoints:

```bash
# Get available payment methods
curl http://localhost:3001/payment/methods

# Create a test payment
curl -X POST http://localhost:3001/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "email": "test@example.com",
    "name": "Test User"
  }'
```

### 6. Update Stripe Webhook Configuration

If you already have a Stripe account:

1. Go to https://dashboard.stripe.com/developers/webhooks
2. Add new endpoint for `/webhook/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 7. Deploy to Production

For Render deployment:

```bash
# Push changes to GitHub
git add .
git commit -m "feat: integrate Stripe instant payments"
git push

# Trigger Render deployment (automatic with GitHub integration)
# Then update environment variables in Render dashboard
```

Update these environment variables in Render:
- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_RETURN_URL` (use your Render domain)

## Breaking Changes

⚠️ **No breaking changes!**

All existing functionality remains unchanged:
- Render webhook endpoints work as before
- GitHub Actions triggering works as before
- All existing environment variables still required

The Stripe integration is completely new and optional.

## Rollback Instructions

If you need to revert to the previous version:

```bash
# Revert commits
git revert HEAD~1

# Or checkout previous version
git checkout previous-tag

# Reinstall original dependencies
pnpm install

# Rebuild
pnpm run build
```

## Troubleshooting Migration

### TypeScript Compilation Errors

```bash
# Clear build cache and rebuild
rm -rf dist/
pnpm run build

# Check for type errors
pnpm run typecheck
```

### Missing Dependencies

```bash
# Reinstall all dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Environment Variables Not Loading

Ensure `.env` file exists in project root with proper formatting:

```env
# ✓ Correct
STRIPE_API_KEY=sk_live_abc123...

# ✗ Wrong (quotes not needed)
STRIPE_API_KEY="sk_live_abc123..."
```

### Webhook Not Receiving Events

1. Verify webhook URL is correct in Stripe Dashboard
2. Check webhook signing secret matches `STRIPE_WEBHOOK_SECRET`
3. For local testing, use `stripe listen` command
4. Check application logs for webhook errors

## Performance Impact

- **Minimal impact**: Payment processing is handled by Stripe
- **Database**: No database required (payments stored by Stripe)
- **Latency**: <100ms for payment endpoint calls
- **Scalability**: Stripe handles scaling - no concerns

## Testing the Integration

### Local Testing

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe listen --forward-to localhost:3001/webhook/stripe`
3. In another terminal: `stripe trigger payment_intent.succeeded`

### Staging Testing

1. Deploy to staging environment
2. Update Stripe webhook endpoint to staging URL
3. Test with `stripe trigger` commands
4. Verify webhook logs in Stripe Dashboard

### Production Testing

1. Use Stripe test mode (Secret key starts with `sk_test_`)
2. Test with real test payment methods
3. Monitor Stripe Dashboard > Events logs
4. Switch to live mode when ready

## Monitoring

### Check Application Logs

```bash
# On Render
# Go to Service > Logs tab in dashboard

# Locally
pnpm run dev
# Watch console output for payment events
```

### Stripe Dashboard Monitoring

1. Go to https://dashboard.stripe.com/payments
2. Monitor payment status in real-time
3. Check Events tab for webhook deliveries
4. Review API calls in Developers > API requests

## Best Practices After Migration

1. **Set up monitoring** - Monitor payment events in Stripe Dashboard
2. **Test regularly** - Use `stripe trigger` to simulate events
3. **Review security** - Ensure all secrets are in environment variables
4. **Update documentation** - Document your payment workflow
5. **Train team** - Brief team on new payment endpoints
6. **Plan backups** - Stripe provides payment history

## Version Compatibility

- **Node.js**: 16.x or higher
- **TypeScript**: 5.x or higher
- **Stripe SDK**: 14.x or higher
- **Express**: 4.x or higher

## Support

- **Stripe Issues**: https://support.stripe.com
- **Project Issues**: GitHub Issues
- **Stripe Docs**: https://stripe.com/docs

## What's Next?

After successful migration:

1. **Customize payment logic** - Edit `stripe.ts` for your needs
2. **Build frontend** - Use `payment-example.html` as reference
3. **Add database** - Store payment records for your use case
4. **Implement notifications** - Send payment confirmation emails
5. **Setup alerts** - Monitor failed payments

## Confirmation Checklist

After migration, verify:

- [ ] All dependencies installed (`pnpm install`)
- [ ] Environment variables configured (`.env` file)
- [ ] TypeScript compiles without errors (`pnpm run build`)
- [ ] Application starts (`pnpm start` or `pnpm run dev`)
- [ ] Render webhooks still working
- [ ] GitHub Actions still triggering
- [ ] Stripe webhooks configured and verified
- [ ] Payment endpoints accessible and working
- [ ] Test payment creates successfully
- [ ] Documentation reviewed and understood

## Success!

Congratulations! Your Stripe instant payments integration is ready. 🎉

Start with the [SETUP_GUIDE.md](SETUP_GUIDE.md) for next steps.
