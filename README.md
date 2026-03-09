# Justice McNeal LLC — Family Contribution Portal

A full-featured, invite-only family financial platform and social hub. Members contribute monthly, track investments, earn badges, complete quests, interact via a social feed, and more — all wrapped in a mobile-first PWA.

**Live:** [justicemcneal.com](https://justicemcneal.com)

---

## Features

### Core Financial
- 🔐 **Invite-only access** — admin sends email invites, no public signup
- 💰 **Flexible subscriptions** — $30–$250/month via Stripe, change anytime
- 📊 **Member dashboard** — contribution amount, next bill date, quick-link grid
- 📈 **Investment portfolio** — CSV upload, manual entry, Chart.js visualizations
- 💵 **One-time & manual deposits** — Stripe checkout + admin-recorded deposits
- 🧾 **Payment history** — full invoice log with fee tracking & receipt links

### Gamification
- 🏆 **Milestones** — 12-tier roadmap ($500 → $1M) with progress bars, ETAs, confetti celebrations
- 🎯 **Quest system** — one-time & recurring quests, Credit Points (CP), proof submission + admin verification
- 💎 **Status tiers** — Bronze → Silver → Gold → Diamond (rolling 90-day CP window)
- 🏅 **Badges** — permanent achievements with rarity tiers (Common → Legendary), choose a displayed badge
- 🔥 **Streak tracking** — consecutive on-time payment months

### Social Hub
- 📰 **Social feed** — text/image/video posts, likes, comments, bookmarks, emoji reactions, @mentions, threaded replies
- 👤 **Member profiles** — Instagram-style with cover banners, posts grid, feed tab, badges, stats bar, editable bio
- 🔔 **Notification panel** — slide-in sheet with real-time updates, unread badges, mark-all-read
- 🎉 **Events page** — family events listing

### Member Payouts
- 💸 **Stripe Connect Express** — members link their bank once
- 🎂 **Automated birthday payouts** — daily cron sends $10 on birthdays
- 🏆 **Manual / competition payouts** — admin sends any amount with a reason
- ⚙️ **Enrollment settings** — per-type opt-in/out, global admin kill switch

### Platform
- 📱 **PWA** — installable on iOS & Android, standalone display, splash screen, service worker caching
- 🎨 **Animated splash screen** — brand logo with floating orbs, progress bar, auth-aware redirect
- 🧭 **Mobile-first nav** — 5-tab bottom bar, customizable dock (tap-to-assign), swipe-up drawer
- 📋 **Onboarding wizard** — name, birthday, photo, contribution setup, optional bank linking
- 👑 **Admin dashboard** — member management, quest CRUD, deposit recording, payout console, brand settings

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS + Tailwind CSS (CDN) + Inter font |
| Backend | Supabase (Auth, PostgreSQL, Realtime, Storage, Edge Functions) |
| Payments | Stripe (Subscriptions, Checkout, Billing Portal, Connect Express) |
| Hosting | GitHub Pages (custom domain via CNAME) |
| PWA | manifest.json + Service Worker + iOS meta tags |
| Charts | Chart.js |

---

## Project Structure

```
├── index.html                    # Splash screen → auth redirect
├── manifest.json                 # PWA manifest
├── sw.js                         # Service worker
├── CNAME                         # justicemcneal.com
│
├── auth/
│   ├── login.html                # Login page
│   └── reset-password.html       # Password reset
│
├── portal/                       # Member-facing pages (13)
│   ├── index.html                # Dashboard (quick-link grid)
│   ├── feed.html                 # Social feed
│   ├── contribution.html         # Change contribution amount
│   ├── extra-deposit.html        # One-time deposit via Stripe
│   ├── history.html              # Payment history
│   ├── investments.html          # Investment portfolio
│   ├── milestones.html           # Milestone roadmap
│   ├── quests.html               # Quest board
│   ├── events.html               # Family events
│   ├── settings.html             # Account & billing settings
│   ├── profile.html              # Member profile (own or ?id=)
│   ├── onboarding.html           # First-time setup wizard
│   └── connect-return.html       # Stripe Connect return handler
│
├── admin/                        # Admin-facing pages (9)
│   ├── index.html                # Admin hub
│   ├── invite.html               # Invite new members
│   ├── members.html              # Member management
│   ├── deposits.html             # Record manual deposits
│   ├── transactions.html         # Transaction viewer
│   ├── investments.html          # Manage investments
│   ├── quests.html               # Quest CRUD + verification
│   ├── payouts.html              # Payout console & ledger
│   └── brand.html                # Brand logo management
│
├── css/
│   └── shared.css                # All custom styles (glass, dock, notifications, etc.)
│
├── js/
│   ├── config.js                 # Supabase client init & helpers
│   ├── splash.js                 # Splash screen animation
│   ├── sw-register.js            # SW registration + PWA standalone detection
│   │
│   ├── auth/
│   │   ├── login.js
│   │   ├── reset-password.js
│   │   └── shared.js             # Auth guards, logout, nav profile loader
│   │
│   ├── components/
│   │   ├── pageShell.js          # Nav, footer, tab bar, drawer, dock edit mode
│   │   ├── notifications.js      # Notification panel logic + real-time subscription
│   │   └── layout.js             # Admin layout component
│   │
│   ├── portal/
│   │   ├── portal.js             # Dashboard page
│   │   ├── contribution.js       # Contribution form
│   │   ├── extra-deposit.js      # Extra deposit form
│   │   ├── history.js            # History page
│   │   ├── settings.js           # Settings page
│   │   │
│   │   ├── feed/                 # Social feed (8 modules)
│   │   │   ├── state.js          # Shared state & config
│   │   │   ├── render.js         # Post HTML rendering
│   │   │   ├── loader.js         # Infinite scroll & data fetching
│   │   │   ├── composer.js       # New post / edit composer
│   │   │   ├── actions.js        # Like, bookmark, delete, react
│   │   │   ├── comments.js       # Comment threads & replies
│   │   │   ├── filters.js        # Feed tab filtering
│   │   │   └── init.js           # Bootstrap & event wiring
│   │   │
│   │   ├── profile/              # Member profiles (9 modules)
│   │   │   ├── state.js          # Shared state
│   │   │   ├── utils.js          # Helpers (time ago, escape, etc.)
│   │   │   ├── loader.js         # Profile data fetching
│   │   │   ├── badges.js         # Badge rendering
│   │   │   ├── posts.js          # Posts grid & feed tab
│   │   │   ├── milestones.js     # Milestones tab
│   │   │   ├── tabs.js           # Tab switching
│   │   │   ├── edit.js           # Edit profile modal
│   │   │   └── index.js          # Bootstrap
│   │   │
│   │   ├── investments/          # Portfolio (4 modules)
│   │   │   ├── config.js, init.js, charts.js, renders.js
│   │   │
│   │   ├── milestones/           # Milestones (5 modules)
│   │   │   ├── config.js, init.js, renders.js, history.js, celebration.js
│   │   │
│   │   ├── quests/               # Quests (3 modules)
│   │   │   ├── config.js, init.js, renders.js
│   │   │
│   │   └── onboarding/           # Onboarding wizard (5 modules)
│   │       ├── state.js, init.js, steps.js, photo.js, contribution.js
│   │
│   └── admin/
│       ├── hub.js, dashboard.js, invite.js, deposits.js
│       ├── transactions.js, investments.js, quests.js
│       ├── payouts.js, brand.js
│
├── assets/
│   └── icons/
│       ├── icon-192.svg          # PWA icon 192×192
│       └── icon-512.svg          # PWA icon 512×512
│
├── supabase/
│   ├── functions/                # 13 Edge Functions
│   │   ├── backfill-invoice-fees/
│   │   ├── backfill-receipt-urls/
│   │   ├── birthday-payout/
│   │   ├── create-billing-portal/
│   │   ├── create-checkout-session/
│   │   ├── create-connect-onboarding/
│   │   ├── create-extra-deposit/
│   │   ├── deactivate-user/
│   │   ├── invite-user/
│   │   ├── reactivate-user/
│   │   ├── send-payout/
│   │   ├── stripe-webhook/
│   │   └── update-subscription/
│   │
│   └── migrations/               # 23 migrations (001–023)
│       ├── 001_initial_schema.sql
│       ├── ...
│       └── 023_notifications.sql
│
└── md/docs/
    └── ROADMAP.md                # Full 10-phase roadmap (1050+ lines)
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (name, birthday, photo, role, streak, CP, badge, dock config, Stripe Connect) |
| `invoices` | Stripe invoice records with fee tracking |
| `investments` | Portfolio holdings (fund, shares, value) |
| `manual_deposits` | Admin-recorded cash/check deposits |
| `milestones` | Tier definitions + achieved timestamps |
| `quests` | Quest definitions (title, CP reward, type, instructions) |
| `member_quests` | Per-member quest progress + proof |
| `credit_points_log` | CP earn/spend ledger with expiry |
| `member_badges` | Earned badges per member |
| `posts` | Social feed posts (text, media, visibility) |
| `post_images` | Multi-image attachments |
| `post_likes` | Post likes |
| `post_comments` | Comments + threaded replies |
| `post_bookmarks` | Saved posts |
| `comment_likes` | Comment likes |
| `payouts` | Universal payout ledger (birthday, competition, custom) |
| `payout_enrollments` | Per-member, per-type payout enrollment |
| `app_settings` | Admin global settings (key-value JSONB) |
| `notifications` | In-app notifications with real-time |

---

## Phases Completed

| Phase | What Shipped |
|-------|-------------|
| **1A** | Investment dashboard — CSV upload, manual entry, Chart.js portfolio viewer |
| **1B** | One-time & manual deposits — Stripe checkout + admin recording |
| **1C** | Member onboarding — wizard (name, birthday, photo, contribution, bank link) |
| **2A** | Milestones — 12-tier roadmap, progress bars, confetti celebrations, ETA |
| **2B** | Quests & badges — quest board, CP tiers, badge rarity, auto-detection |
| **2C** | Member payouts — Stripe Connect Express, birthday cron, manual payouts |
| **4A** | Social feed — posts, likes, comments, reactions, @mentions, image uploads |
| **4B** | Member profiles — cover banners, posts grid, badges, stats, edit profile |
| **PWA** | manifest.json, service worker, installable, Dynamic Island safe-area |
| **UX** | Dock customization, swipe-up drawer, animated splash, notification panel |

---

## Roadmap (Upcoming)

See [md/docs/ROADMAP.md](md/docs/ROADMAP.md) for the full 10-phase roadmap. Next up:

- **Notification triggers** — DB triggers for likes, comments, follows, quest completions, badge awards
- **Push notifications** — Web Push API via service worker + VAPID keys
- **Night mode / theming** — dark theme toggle in settings
- **Phase 3** — Meet the Team, Family Tree, Credit 101, Budget Tracker + AI Coach
- **Phase 4C** — Private messaging / Snapchat-style DMs
- **Phase 4E** — Family location map (Leaflet.js)
- **Phase 5** — Events system with RSVP + trip deposits

---

## Quick Start

### Prerequisites
- [Supabase](https://supabase.com) project
- [Stripe](https://stripe.com) account
- GitHub repo with Pages enabled

### 1. Clone & Configure
```bash
git clone https://github.com/YOUR_USER/JusticeMcNealLLC_FamilyContribution.git
```
Edit `js/config.js` with your Supabase URL and anon key.

### 2. Run Migrations
Run all SQL files in `supabase/migrations/` (001–023) in order via the Supabase SQL Editor.

### 3. Deploy Edge Functions
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase secrets set STRIPE_SECRET_KEY=sk_xxx STRIPE_WEBHOOK_SECRET=whsec_xxx STRIPE_PRODUCT_ID=prod_xxx
npx supabase functions deploy --all
```

### 4. Create Admin Account
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 5. Deploy to GitHub Pages
Push to GitHub → Settings → Pages → select branch. Custom domain via CNAME file.

---

Built with ❤️ for family
