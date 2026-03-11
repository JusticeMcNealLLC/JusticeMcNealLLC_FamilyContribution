# Phase 1 — Investment Visibility, Manual Deposits & Onboarding

**Status:** ✅ Complete (1A · 1B · 1C)  
**Priority:** High  
**Goal:** Members should be able to see where the money is and how it's growing, make additional deposits, and have a smooth onboarding experience.

---

## 1A. Investment Dashboard ✅

### Features Built
- [x] Dashboard showing total portfolio value
- [x] Breakdown by fund (VTI, VXUS, VIG, SPAXX) with percentages and dollar amounts
- [x] Growth over time chart (line graph via Chart.js)
- [x] Individual member contribution total (private, shown only to that member)
- [x] Family-wide contribution total (sum of all payments)
- [x] Monthly/quarterly performance summary (30d, 90d, all-time cards)
- [x] All-time gain/loss badge on hero card
- [x] Top holding highlight card
- [x] Admin hub page with grid navigation
- [x] Admin investment management (Fidelity CSV upload + manual entry)
- [x] Snapshot history with change tracking
- [x] Allocation bar chart
- [x] Portfolio history table (desktop + mobile)
- [x] All portal pages updated with Investments nav link
- [x] Database: `investment_snapshots` + `investment_holdings` tables with RLS

### Fidelity Data Integration Options

| Option | Pros | Cons | Feasibility |
|--------|------|------|-------------|
| **Plaid API** | Read-only Fidelity sync, automated | Monthly cost, Fidelity can be finicky | ⭐⭐⭐ Medium |
| **Fidelity CSV Export + Manual Upload** ✅ | Free, accurate | Monthly manual process | ⭐⭐⭐⭐ High |
| **Manual Entry by Admin** | Simplest | Tedious | ⭐⭐⭐⭐⭐ Highest |
| **Yodlee / MX** | Enterprise-grade aggregation | Expensive, overkill | ⭐ Low |

> **Chosen Approach:** Fidelity CSV upload + manual admin entry. Explore Plaid later as fund grows.

---

## 1B. One-Time / Manual Deposits ✅

### Features Built
- [x] "Extra Deposit" feature — members can make a one-time contribution outside of subscription
- [x] Admin-initiated manual deposit recording (for transfers/personal investment moves)
- [x] Transaction log showing Stripe subscription payments AND manual deposits
- [x] Proper attribution — each deposit tagged to correct member with date + notes
- [x] Running total per member (Stripe + manual combined)

---

## 1C. Member Onboarding ✅

**Goal:** Smooth, welcoming experience from invite to fully set-up member.  
**Note:** Existing members redirected to onboarding wizard on next login if `setup_completed = false`.

### Invite Flow
- [x] Admin sends invite via email
- [x] Member receives invite link
- [x] Member creates account (sets password)
- [x] Member lands on portal

### Onboarding Wizard Steps
- [x] Welcome screen / first-time setup wizard
- [x] **Existing member forced onboarding** — redirect if `setup_completed = false`
- [x] Set first name & last name
- [x] Set birthday (skippable)
- [x] Upload profile picture (drag-drop + preview, skippable)
- [x] **Start contribution** — skippable Stripe subscription setup step
- [x] **Link bank for payouts** — optional Stripe Connect Express step
- [x] Database: `birthday`, `profile_picture_url`, `setup_completed` columns added to `profiles`
- [x] Supabase Storage bucket for profile pictures
- [x] Profile picture displayed throughout portal (nav desktop + mobile, settings)
- [x] Profile editing in settings page (name, birthday, photo)
- [x] "Complete Your Profile" nudge banner if profile is incomplete
- [x] Admin can see onboarding completion status per member

---

## Database

- `investment_snapshots` — portfolio snapshots with total value, date, source
- `investment_holdings` — per-fund breakdown (symbol, shares, value, pct)
- `profiles` — extended with `birthday`, `profile_picture_url`, `setup_completed`
- Manual deposits tracked in payment/deposit ledger tables
