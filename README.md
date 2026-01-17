# Family Contribution Portal

A simple, invite-only portal for managing family contributions using Stripe subscriptions.

## Features

- 🔐 **Invite-only access** - No public signup
- 💰 **Flexible amounts** - $30-$250/month (whole dollars)
- 📊 **Member dashboard** - View current amount, next bill date, payment history
- 🔄 **Change amount anytime** - Takes effect next billing cycle
- 👑 **Admin dashboard** - View all members, totals, past-due accounts
- ✉️ **Admin invite system** - Invite new members via email

## Tech Stack

- **Frontend:** Plain HTML + Tailwind CSS + Vanilla JavaScript
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **Payments:** Stripe (Subscriptions, Checkout, Billing Portal)
- **Hosting:** GitHub Pages, GoDaddy, or any static host

## Project Structure

```
├── index.html              # Redirects to login
├── login.html              # Login page
├── portal/
│   ├── index.html          # Member dashboard
│   ├── contribution.html   # Change contribution amount
│   ├── history.html        # Payment history
│   └── settings.html       # Account & billing settings
├── admin/
│   ├── index.html          # Admin dashboard
│   └── invite.html         # Invite new members
├── js/
│   ├── config.js           # Supabase client & helpers
│   ├── auth.js             # Authentication logic
│   ├── portal.js           # Portal page logic
│   ├── contribution.js     # Contribution form logic
│   ├── history.js          # History page logic
│   ├── settings.js         # Settings page logic
│   ├── admin.js            # Admin dashboard logic
│   └── invite.js           # Invite page logic
└── supabase/
    ├── functions/          # Edge Functions
    │   ├── create-checkout-session/
    │   ├── update-subscription/
    │   ├── create-billing-portal/
    │   ├── invite-user/
    │   └── stripe-webhook/
    └── migrations/
        └── 001_initial_schema.sql
```

## Setup Guide

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Go to **SQL Editor** and run the migration:
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and run in SQL Editor

3. Go to **Authentication > Settings**:
   - Disable "Enable email confirmations" (for invite flow)
   - Or keep it enabled and configure email templates

4. Get your API keys from **Settings > API**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)

2. Create a Product:
   - Go to **Products** > **Add product**
   - Name: "Family Contribution"
   - Don't add a price (we create them dynamically)
   - Copy the Product ID (`prod_xxx`)

3. Get your API keys from **Developers > API keys**:
   - `STRIPE_SECRET_KEY` (use test key for development)
   - `STRIPE_PUBLISHABLE_KEY`

4. Configure the Billing Portal:
   - Go to **Settings > Billing > Customer portal**
   - Enable "Allow customers to update payment methods"
   - Enable "Allow customers to cancel subscriptions"
   - **Disable** "Allow customers to update subscriptions" (we handle this)

5. Create a Webhook:
   - Go to **Developers > Webhooks**
   - Add endpoint: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Copy the signing secret (`whsec_xxx`)

### 3. Deploy Edge Functions

1. **Use npx** (no install needed - works on Windows):
   ```bash
   npx supabase --version
   ```

2. Login and link your project:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Set secrets:
   ```bash
   npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
   npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
   npx supabase secrets set STRIPE_PRODUCT_ID=prod_xxx
   ```

4. Deploy functions:
   ```bash
   npx supabase functions deploy create-checkout-session
   npx supabase functions deploy update-subscription
   npx supabase functions deploy create-billing-portal
   npx supabase functions deploy invite-user
   npx supabase functions deploy stripe-webhook
   ```

### 4. Configure Frontend

1. Edit `js/config.js`:
   ```javascript
   const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

### 5. Create Your Admin Account

1. Go to Supabase **Authentication > Users**
2. Click **Add user** > **Create new user**
3. Enter your email and password
4. Go to **SQL Editor** and run:
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

### 6. Deploy Frontend

#### Option A: GitHub Pages (Free)

1. Push code to GitHub
2. Go to repo **Settings > Pages**
3. Select branch and folder
4. Your site will be at `https://username.github.io/repo-name`

#### Option B: GoDaddy

1. Go to your GoDaddy hosting control panel
2. Upload all files via File Manager or FTP
3. Make sure `index.html` is in the root

### 7. Update Stripe Webhook URL

After deploying, update your Stripe webhook to use your production Supabase function URL.

## Usage

### Inviting Members

1. Log in as admin
2. Go to Admin > Invite
3. Enter member's email
4. They'll receive an email to set their password

### Member Flow

1. Member logs in
2. Sets up their contribution amount ($30-$250)
3. Completes Stripe Checkout
4. Can view dashboard, change amount, see history

### Changing Amounts

- Members can change their amount anytime
- New amount takes effect on next billing date
- No proration (simpler for family contributions)

## Troubleshooting

### "No authorization header" error
- Make sure you're logged in
- Check that `config.js` has correct Supabase credentials

### Webhook not working
- Verify webhook URL is correct
- Check webhook signing secret matches
- View Stripe webhook logs for errors

### RLS policy errors
- Make sure you ran the full migration SQL
- Check that profiles are being created on signup

## Support

If you run into issues:
1. Check browser console for errors
2. Check Supabase logs (Database > Logs)
3. Check Stripe webhook logs

---

Built with ❤️ for family
