# Stripe Integration Setup Guide

## Environment Variables

Add these to your `/opt/livekit1/frontend/.env.local` file:

```bash
# Stripe Keys (Get from https://dashboard.stripe.com/apikeys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (Create products in Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_pro_monthly_id
NEXT_PUBLIC_STRIPE_PRO_YEARLY_ID=price_pro_yearly_id

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Setup Steps

### 1. Create Stripe Account
1. Go to https://stripe.com
2. Sign up for an account
3. Activate your account

### 2. Get API Keys
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Add them to `.env.local`

### 3. Create Products & Prices

In Stripe Dashboard:

1. Go to **Products** → **Add Product**

2. **Create Pro Plan**:
   - Name: "Pro Plan"
   - Description: "10,000 minutes, 10 agents"
   - Pricing: $49/month (recurring)
   - Copy the Price ID (starts with `price_`)
   - Add to `.env.local` as `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`

3. **(Optional) Create Yearly Plan**:
   - Add another price to Pro Product
   - $490/year (recurring annually)
   - Copy Price ID to `.env.local`

### 4. Set Up Webhook

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `http://localhost:3001/api/stripe/webhook`
   - For production: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 5. Configure Billing Portal

1. Go to **Settings** → **Billing**
2. Click **Customer portal**
3. Enable portal
4. Configure:
   - Allow customers to update payment methods ✓
   - Allow customers to cancel subscriptions ✓
   - Allow customers to switch plans ✓

### 6. Test the Integration

```bash
# Make sure environment variables are set
cat /opt/livekit1/frontend/.env.local

# Restart your dev server
cd /opt/livekit1/frontend
npm run dev
```

### 7. Test Webhook Locally (Optional)

Install Stripe CLI:
```bash
# Install Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.0/stripe_1.19.0_linux_x86_64.tar.gz
tar -xvf stripe_1.19.0_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

Forward webhooks to local:
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

This will give you a webhook signing secret for testing.

## Testing Payment Flow

### Test Card Numbers

Use these test cards in Stripe:

- **Success**: `4242 4242 4242 4242`
- **Requires Authentication**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`

Any future expiry date and any CVC will work.

### Test the Flow

1. Go to http://localhost:3001/pricing
2. Click "Upgrade to Pro" on Pro plan
3. Fill in test card: `4242 4242 4242 4242`
4. Expiry: Any future date
5. CVC: Any 3 digits
6. Complete checkout
7. Should redirect back to dashboard
8. Check Stripe Dashboard → Customers to see the subscription

## Production Checklist

Before going live:

- [ ] Switch to live API keys (remove `_test_` keys)
- [ ] Update webhook URL to production domain
- [ ] Enable Stripe Radar for fraud protection
- [ ] Set up tax collection (if required)
- [ ] Configure email receipts
- [ ] Test subscription lifecycle (create, update, cancel)
- [ ] Set up Stripe notifications
- [ ] Configure dispute handling

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is accessible
- Verify signing secret is correct
- Use `stripe listen` for local testing
- Check Stripe Dashboard → Developers → Webhooks for delivery attempts

### Payment fails
- Verify API keys are correct
- Check price IDs match your Stripe products
- Ensure customer email is provided
- Check browser console for errors

### Redirect doesn't work
- Verify `NEXT_PUBLIC_APP_URL` is correct
- Check success/cancel URLs in checkout session
- Ensure no ad blockers interfering

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Test Mode: https://dashboard.stripe.com/test
- Get Help: https://support.stripe.com
