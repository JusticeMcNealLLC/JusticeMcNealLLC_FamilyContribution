# Phase 2 — Milestones, Perks, Quests & Payouts

**Status:** ✅ Complete (2A · 2B · 2C)  
**Priority:** High  
**Goal:** Gamify generational wealth with milestone tiers, a quest/badge system, and a universal payout infrastructure powered by Stripe Connect.

---

## 2A. Milestone Tiers ✅

Members unlock perks as the total LLC asset value crosses thresholds. Early wins are fast to build momentum.

| Threshold | Milestone | Perk Unlocked |
|-----------|-----------|---------------|
| $500 | 🌱 First Seed | Social feed launches |
| $1,000 | 💵 Four Figures | Events system opens |
| $2,500 | 📈 Gaining Ground | Family gallery unlocked |
| $5,000 | 🔥 Halfway to Five Figures | Quest system opens |
| $10,000 | 🏅 Five Figures | Milestone celebration event |
| $25,000 | 💪 Building Momentum | Lending program opens |
| $50,000 | 🏦 Mini Bank | Emergency fund access |
| $75,000 | 🛡️ Safety Net | Trust formation begins |
| $100,000 | 🎉 Six Figures | Family vehicle evaluation |
| $250,000 | 🚗 Fleet Ready | Real estate research |
| $500,000 | 🏠 Compound Vision | Scholarships, life insurance |
| $1,000,000 | 👑 Generational | Full benefits suite |

### Features Built
- [x] Milestones page (visual roadmap with progress bars)
- [x] Current asset level indicator with animated progress to next tier
- [x] Expandable milestone detail cards (perk details, requirements, ETA, "what's included")
- [x] Animated celebration when milestone reached (confetti + toast)
- [x] Milestone history timeline (when each tier was achieved)
- [x] "Next Unlock" countdown card on dashboard
- [x] Locked/unlocked visual state per perk tier

### Deferred
- [ ] Push notification when milestone hit *(⏳ Phase 4D)*
- [ ] Auto-generated social feed posts for milestones *(⏳ Phase 4A)*
- [ ] Perk status badges on member profiles *(⏳ Phase 4B)*
- [ ] Admin can create custom milestones *(lower priority)*

---

## 2B. Quest & Task System ✅

### How It Works
- Members complete quests at their own pace — earn **Credit Points (CP)**
- **Rolling 3-month window** — only CP from last 90 days counts toward active tier
- CP determines **status tier** (Bronze → Silver → Gold → Diamond)
- **Badges** are separate — permanent achievements, member picks one to display

### Credit Point Tiers

| 90-Day CP | Status | Perks |
|-----------|--------|-------|
| 0–99 | 🥉 Bronze | Base access, standard loan terms |
| 100–249 | 🥈 Silver | Priority lending, 1.5× loan limit, silver ring |
| 250–499 | 🥇 Gold | 2× loan limits, lower rate, voting weight, gold ring |
| 500+ | 💎 Diamond | Max loans, lowest rate, first access to new features, diamond ring |

### Badges (Permanent)

| Badge | How to Earn |
|-------|-------------|
| 🏅 Founding Member | Joined during year 1 |
| 📸 Shutterbug | Uploaded profile picture |
| 🔥 Streak Master | 6+ consecutive on-time months |
| ⚡ Streak Legend | 12+ consecutive on-time months |
| 🌱 First Seed Witness | Active when $500 milestone hit |
| 💵 Four Figure Club | Active when $1,000 milestone hit |
| 🎯 Quest Champion | Completed 10+ quests total |
| 🏦 Fidelity Linked | Opened Fidelity + linked cashback to LLC |
| 📚 Credit Scholar | Completed all Credit 101 modules *(Phase 3C)* |
| 🗳️ Decision Maker | Voted in 5+ family decisions *(future)* |
| 🎂 Birthday VIP | Linked bank for birthday payouts |

### Example Quests

| Quest | CP | Type |
|-------|----|------|
| Activate Contribution | 50 | One-time |
| Upload Profile Picture | 20 | One-time |
| Complete Onboarding | 30 | One-time |
| On-Time Payment | 10 | Monthly recurring |
| 3-Month Streak | 25 | One-time |
| 6-Month Streak | 50 | One-time |
| Open Fidelity Account | 50 | One-time |
| Apply for Fidelity Card | 50 | One-time |
| Link Cashback to LLC | 100 | One-time |
| Use Fidelity Card as Primary | 25 | Monthly recurring |
| Credit Score Check-In | 15 | Monthly recurring |
| Complete Credit 101 *(Phase 3C)* | 40 | One-time |
| Attend Family Event *(Phase 5A)* | 20 | Per event |
| Refer a Family Member | 75 | Per referral |

### Features Built
- [x] Quests page (available, in-progress, completed)
- [x] Quest detail view (instructions, requirements, reward)
- [x] Quest progress tracking (started → proof submitted → admin verified → complete)
- [x] CP balance on dashboard and profile
- [x] CP history log (earned, reason, expiry date)
- [x] Rolling 3-month CP calculation
- [x] Status tier badge with profile ring color
- [x] Badge collection page + display selector
- [x] Badge display throughout portal (nav, feed, comments)
- [x] Admin quest management (create/edit/delete, set CP, set type)
- [x] Admin quest verification workflow (review proof, approve/deny)
- [x] Auto quest completion detection (photo upload, subscription, etc.)
- [x] Auto-detection backfill for existing members
- [x] Lottie animation engine (epic/legendary sparkle glow, badge effects)
- [x] Database: `quests`, `member_quests`, `credit_points_log`, `member_badges`

### Pending
- [ ] Admin bulk quest assignment
- [ ] Admin badge management page (create/edit/delete badges, upload Lottie)
- [ ] Admin banner management page (gradients, image, Lottie, preview)
- [ ] Celebration animation on quest completion / tier upgrade
- [ ] Leaderboard (rolling 3-month CP ranking)

---

## 2C. Member Payouts — Stripe Connect ✅

### How It Works
1. Member opts in + completes Stripe Connect Express onboarding (bank link)
2. LLC sends money to members via Stripe transfers
3. **Birthday payouts** — daily cron auto-sends $10 on member birthdays
4. **Competition/bonus payouts** — admin sends manually from dashboard
5. Funds from LLC's Stripe balance; Stripe debits BlueVine if balance is low
6. Arrives in member's bank in 1–2 business days

### Payout Types

| Type | Trigger | Amount | Mode |
|------|---------|--------|------|
| 🎂 Birthday | Daily cron | $10 default | Automatic |
| 🏆 Competition | Admin after event | Custom | Manual |
| 🎁 Bonus | Admin discretionary | Custom | Manual |
| 💰 Profit Share | Admin distribution | Custom | Manual |
| 👥 Referral | New member onboards | Custom | Automatic |
| 🎯 Quest Reward | Cash quest *(future)* | Custom | Automatic |
| 🛠️ Custom | Any reason | Custom | Manual |

### Features Built
- [x] Payout enrollment toggle in settings (master on/off)
- [x] Per-type enrollment (birthday, competition, etc. independently)
- [x] Bank link status indicator (Linked / Not Linked / Not Enrolled)
- [x] "Manage Bank Account" button → Stripe Connect onboarding
- [x] Enrollment status visible to admin
- [x] Global payout kill switch (admin emergency stop)
- [x] Per-type admin toggle (birthday, competition, etc.)
- [x] Birthday payout amount configurable (admin)
- [x] Manual payout console (amount, member, type, note)
- [x] Payout ledger — full history with Stripe transfer IDs
- [x] Admin settings in `app_settings` table
- [x] Stripe Connect Express onboarding (bank linking step in wizard)
- [x] Return URL handler (`/portal/connect-return.html`)
- [x] Webhook for `account.updated` events
- [x] Edge function: `birthday-payout` (daily cron via pg_cron + pg_net)
- [x] Dedup check — no duplicate birthday payouts same day
- [x] Payout history mini-list in member settings page

### Pending
- [ ] Portal notification: "🎂 Happy Birthday! $10 is on its way"
- [ ] Birthday celebration card on dashboard (visible to all)
- [ ] Fallback / queued payouts when bank not linked
- [ ] Failed payout retry mechanism
- [ ] Member notification when payout is sent
- [ ] Budget alerts (admin warning when payouts approach threshold)
- [ ] Payout approval queue for large amounts
- [ ] Connect status sync (periodic verify account still active)

### Database
- `payouts` — universal ledger (id, user_id, amount_cents, payout_type, reason, status, stripe_transfer_id, error_message, created_by, created_at, completed_at)
- `payout_enrollments` — per-member per-type enrollment (user_id, payout_type, enrolled)
- `app_settings` — admin global settings (payouts_enabled, birthday_payouts_enabled, birthday_payout_amount_cents, competition_payouts_enabled)
- `profiles` extended: `stripe_connect_account_id`, `payout_enrolled`, `connect_onboarding_complete`
