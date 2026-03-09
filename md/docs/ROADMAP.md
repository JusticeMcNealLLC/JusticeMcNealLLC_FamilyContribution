# 🏛️ Justice McNeal LLC — Generational Wealth Plan Roadmap

> **Mission:** Build and preserve generational wealth for the McNeal family through collective investment, shared benefits, and community.

> **Vision:** A family-owned ecosystem — part investment fund, part bank, part social hub — that empowers every member financially and strengthens family bonds for generations to come.

---

## 📍 Where We Are Today

### Current Infrastructure
- **Legal Entity:** Justice McNeal LLC (future plan: owned by a Family Trust)
- **Website:** [justicemcnealllc.com](https://justicemcnealllc.com) — Family Contribution Portal
- **Members:** Justin + siblings, all actively contributing
- **Tech Stack:** Supabase (auth + database), Stripe (subscriptions), GitHub Pages (hosting)

### Current Money Flow
```
Members (Monthly Subscription via Stripe)
    ↓
BlueVine Business Bank Account
    ↓
Fidelity LLC Brokerage Account
    ↓
Invested into:
    • VTI  — Vanguard Total Stock Market ETF
    • VXUS — Vanguard Total International Stock ETF
    • VIG  — Vanguard Dividend Appreciation ETF
    • SPAXX — Fidelity Government Money Market Fund
```

### Current Portal Features (Live ✅)
- [x] Member authentication (login / password reset)
- [x] Monthly subscription management via Stripe
- [x] Contribution page with current plan details
- [x] Payment history with invoices (filter by Stripe Monthly, Stripe One-time, Manual)
- [x] Account settings (name, password, profile editing)
- [x] Admin dashboard (member management, invite system)
- [x] Member activation / deactivation
- [x] Mobile-friendly design with bottom tab navigation
- [x] Admin hub with grid navigation to sub-pages
- [x] Investment dashboard (CSV upload, manual entry, portfolio viewer)
- [x] Extra one-time deposit feature (Stripe Checkout)
- [x] Manual deposit recording by admin with full attribution
- [x] Running totals per member (Stripe + manual combined)
- [x] Stripe fee tracking on all invoices
- [x] Shared nav/footer components (pageShell.js — single source of truth)
- [x] Profile name & photo displayed in nav (desktop + mobile)
- [x] Member onboarding wizard (name, birthday, photo, contribution setup)
- [x] Skippable contribution step during onboarding (Stripe Checkout)
- [x] Receipt links for one-time Stripe payments (backfilled)
- [x] Admin member detail modal with profile info and transaction history

---

## 🗺️ The Roadmap

### Phase 1: Investment Visibility, Manual Deposits & Onboarding
**Status:** ✅ 1A Complete — ✅ 1B Complete — ✅ 1C Complete
**Priority:** High
**Goal:** Members should be able to see where the money is and how it's growing.

#### 1A. Investment Dashboard
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

##### Fidelity Data Integration Options
| Option | Pros | Cons | Feasibility |
|--------|------|------|-------------|
| **Plaid API** | Read-only connection to Fidelity, automated balance/holdings sync | Monthly cost, requires Plaid subscription, Fidelity connection can be finicky | ⭐⭐⭐ Medium |
| **Fidelity CSV Export + Manual Upload** | Free, accurate, no API dependency | Manual process (monthly), admin has to upload | ⭐⭐⭐⭐ High |
| **Manual Entry by Admin** | Simplest to build, no integrations | Tedious, prone to errors | ⭐⭐⭐⭐⭐ Highest |
| **Yodlee / MX (aggregators)** | Enterprise-grade data aggregation | Expensive, overkill for current scale | ⭐ Low |

> **Recommended Approach:** Start with **manual admin entry** (simple form to update balances/allocations monthly). Explore **Plaid** integration later as the fund grows. Plaid connects to Fidelity and can pull holdings, balances, and transactions programmatically.

#### 1B. One-Time / Manual Deposits
- [x] "Extra Deposit" feature — members can make a one-time contribution outside of their subscription
- [x] Admin-initiated manual deposit recording (for transfers like moving personal investments into the LLC account)
- [x] Transaction log showing both Stripe subscription payments AND manual deposits
- [x] Proper attribution — each manual deposit is tagged to the correct member with date and notes
- [x] Running total per member (Stripe payments + manual deposits combined)

#### 1C. Member Onboarding
**Goal:** Smooth, welcoming experience from invite to fully set-up member.
**Note:** Existing members will be required to complete the onboarding wizard on their next login. A `setup_completed` flag on the profile determines whether to redirect to onboarding or the portal. This ensures all current members have complete profiles (name, birthday, photo) before continuing.

##### Current Flow (✅ Complete)
- [x] Admin sends invite via email
- [x] Member receives invite link
- [x] Member creates account (sets password)
- [x] Member lands on portal

##### Onboarding Improvements (✅ Complete)
- [x] Welcome screen / first-time setup wizard after accepting invite
- [x] **Existing member forced onboarding** — redirect to wizard on login if `setup_completed = false`
- [x] Set first name & last name during onboarding (not buried in settings)
- [x] Set birthday during onboarding (skippable)
- [x] Upload profile picture during onboarding (drag-drop + preview, skippable)
- [x] **Start contribution during onboarding** — skippable Stripe subscription setup step
- [x] Database: add `birthday`, `profile_picture_url`, `setup_completed` columns to `profiles`
- [x] Supabase Storage bucket for profile pictures
- [x] Profile picture displayed throughout portal (nav desktop + mobile, settings)
- [x] Profile editing in settings page (name, birthday, photo)
- [x] "Complete Your Profile" nudge banner if profile is incomplete
- [x] Admin can see onboarding completion status per member
- [ ] Birthday auto-celebration + $10 payout (see Phase 2C Birthday Payouts)

---

### Phase 2: Milestones, Perks & Quests
**Status:** ✅ 2A Complete — ✅ 2B Complete — � 2C In Progress
**Priority:** 🔴 High
**Goal:** Show members what we've achieved and what perks unlock as our assets grow — gamify generational wealth. Build universal payout infrastructure for birthdays, competitions, and beyond.

#### 2A. Milestone Tiers (Unlockable by Asset Threshold)

> **Current pace:** 4 members × $30/mo = **$120/mo** ($1,440/yr base contributions, plus investment growth). Tiers are designed so early wins come fast and keep momentum high.

| Threshold | Milestone | Perk / Feature Unlocked |
|-----------|-----------|-------------------------|
| $500 | 🌱 First Seed | Social feed launches — members can post & interact |
| $1,000 | 💵 Four Figures | Events system opens — plan family gatherings |
| $2,500 | 📈 Gaining Ground | Family gallery unlocked — store & share memories |
| $5,000 | 🔥 Halfway to Five Figures | Quest system opens — earn Credit Points for tasks |
| $10,000 | 🏅 Five Figures | Milestone celebration event — family dinner / outing |
| $25,000 | 💪 Building Momentum | Lending program opens — members can borrow from the fund |
| $50,000 | 🏦 Mini Bank | Emergency fund access for members in need |
| $75,000 | 🛡️ Safety Net | Trust formation begins — consult estate attorney |
| $100,000 | 🎉 Six Figures | Family vehicle program evaluation begins |
| $250,000 | 🚗 Fleet Ready | Real estate research & land acquisition planning |
| $500,000 | 🏠 Compound Vision | Scholarships, life insurance, compound planning |
| $1,000,000 | 👑 Generational | Full benefits suite — generational wealth achieved |

##### Features to Build
- [x] Milestones page on the portal (visual roadmap with progress bars)
- [x] Current asset level indicator with animated progress to next tier
- [x] **Expandable milestone detail cards** — tap/press a milestone to expand and see:
  - What the perk/feature unlocks in detail
  - Requirements and what counts toward the threshold
  - Estimated timeline to reach it (based on current contribution pace)
  - "What's included" breakdown (e.g., lending terms, event budget, etc.)
- [x] Animated celebration when a new milestone is reached (confetti, toast notification)
- [x] Milestone history timeline (when each tier was achieved)
- [x] "Next Unlock" countdown card on the portal dashboard
- [x] Locked/unlocked visual state for each perk tier

##### Deferred — Requires Later Phases
- [ ] Push notification to all members when a milestone is hit *(⏳ Phase 4D — Notifications)*
- [ ] Auto-generated social feed posts for milestone achievements *(⏳ Phase 4A — Social Feed)*
- [ ] Perk status badges on member profiles *(⏳ Phase 4B — Member Profiles)*
- [ ] Admin can create custom milestones beyond the defaults *(lower priority — revisit after Phase 2B)*

#### 2B. Quest & Task System
**Goal:** Give members clear, actionable tasks that benefit both them and the LLC — completion earns Credit Points that unlock status tiers, better loan terms, and visible badges.

##### How It Works
- Members receive quests (tasks) they can complete at their own pace
- Completing quests earns **Credit Points (CP)** — tracked on their profile
- **Rolling 3-month window:** Only CP earned in the last 90 days counts toward your active tier. This rewards *ongoing* engagement, not one-time effort.
- CP determines your **status tier**, which unlocks tangible perks (loan eligibility, voting weight, etc.)
- **Badges** are separate from CP — they're permanent achievements you collect and display
- Members choose which badge displays next to their name across the portal
- Admin can create, edit, assign, and verify quests from the admin dashboard
- Quest progress is visible on the member's portal dashboard

##### Credit Point Tiers (Rolling 3-Month Window)
| 90-Day CP | Status | Tangible Perks |
|-----------|--------|----------------|
| 0–99 | 🥉 Bronze Member | Base access, standard loan terms (when lending opens) |
| 100–249 | 🥈 Silver Member | Priority lending queue, 1.5× loan limit, silver profile ring |
| 250–499 | 🥇 Gold Member | 2× loan limits, lower interest rate, voting weight bonus, gold profile ring |
| 500+ | 💎 Diamond Member | Max loan limits, lowest interest rate, first access to new features, diamond profile ring |

> **Why rolling window?** A member who contributed for 12 months but went inactive shouldn't outrank someone actively engaged. The 3-month window keeps everyone incentivized to stay active.

##### Badge System (Permanent Achievements)
Badges are **permanent** — once earned, they're yours forever. Members pick one badge to display next to their name everywhere in the portal (feed, comments, leaderboard, etc.). All earned badges are visible on their profile page.

| Badge | How to Earn | Icon |
|-------|-------------|------|
| 🏅 Founding Member | Joined during year 1 of the LLC | Shield |
| 📸 Shutterbug | Uploaded a profile picture | Camera |
| 🔥 Streak Master | 6+ consecutive on-time months | Flame |
| ⚡ Streak Legend | 12+ consecutive on-time months | Lightning |
| 🌱 First Seed Witness | Was an active member when $500 milestone was hit | Seedling |
| 💵 Four Figure Club | Was active when $1,000 milestone was hit | Dollar |
| 🎯 Quest Champion | Completed 10+ quests total | Target |
| 🏦 Fidelity Linked | Opened Fidelity account + linked cashback to LLC | Bank |
| 📚 Credit Scholar | Completed all Credit 101 modules *(Phase 3C)* | Book |
| 🗳️ Decision Maker | Voted in 5+ family decisions *(future)* | Ballot |
| 🎂 Birthday VIP | Linked bank for birthday payouts *(Phase 2C)* | Cake |

##### Example Quests
| Quest | Description | CP Reward | Type |
|-------|-------------|-----------|------|
| ✅ Activate Contribution | Start your monthly subscription | 50 CP | One-time |
| 📸 Upload Profile Picture | Add a profile photo to your account | 20 CP | One-time |
| 🎓 Complete Onboarding | Finish all onboarding steps (name, birthday, photo) | 30 CP | One-time |
| 💰 On-Time Payment | Pay your subscription on time this month | 10 CP | Monthly recurring |
| 🔥 3-Month Streak | Maintain 3 consecutive on-time months | 25 CP | One-time |
| ⚡ 6-Month Streak | Maintain 6 consecutive on-time months | 50 CP | One-time |
| 📈 Increase Contribution | Raise your monthly contribution amount | 30 CP | One-time |
| 🏦 Open Fidelity Account | Create a personal Fidelity brokerage account | 50 CP | One-time |
| 💳 Apply for Fidelity Card | Apply for the Fidelity Rewards Visa Signature Card | 50 CP | One-time |
| 🔗 Link Cashback to LLC | Link Fidelity card cashback to the LLC brokerage | 100 CP | One-time |
| 💰 Use Fidelity Card as Primary | Use Fidelity card as primary spending card for a full month | 25 CP | Monthly recurring |
| 📈 Credit Score Check-In | Log your credit score on the portal | 15 CP | Monthly recurring |
| 📚 Complete Credit 101 | Finish all Credit 101 modules + quiz *(Phase 3C)* | 40 CP | One-time |
| 🎉 Attend Family Event | RSVP and attend a family event *(Phase 5A)* | 20 CP | Per event |
| 👥 Refer a Family Member | Invite and onboard a new family member | 75 CP | Per referral |

> **Note:** Some quests require features from later phases (Credit 101, Events, Social Feed). Those quests will be added to the system when their parent feature launches. The quest/badge infrastructure should support adding new quests at any time.

##### Fidelity Cashback Quest (Flagship Quest)
> **Why this matters:** The Fidelity Rewards Visa earns **2% cashback on all purchases** — deposited directly into a Fidelity account. If members link their cashback to the LLC's Fidelity brokerage, every dollar they spend passively grows the family fund. A member spending $2,000/month generates $40/month in extra contributions — automatically.

- [ ] Quest detail page explaining the Fidelity card benefits and step-by-step setup
- [ ] Guided walkthrough: Open Fidelity account → Apply for card → Link cashback to LLC account
- [ ] Verification system (member uploads screenshot or admin confirms linkage)
- [ ] Recurring quest: monthly spending confirmation to earn ongoing CP
- [ ] Cashback contribution tracking per member (visible on admin dashboard)

##### Features to Build
- [x] Quests page on portal (list of available, in-progress, and completed quests)
- [x] Quest detail view with instructions, requirements, and reward info
- [x] Quest progress tracking (started, submitted proof, admin verified, completed)
- [x] Credit Points balance displayed on portal dashboard and profile
- [x] Credit Point history log (earned, reason, expiry date)
- [x] **Rolling 3-month CP calculation** — only last 90 days of CP counts toward active tier
- [x] Status tier badge on portal (Bronze → Silver → Gold → Diamond) with profile ring color
- [x] **Badge collection page** — view all earned badges, choose which one displays next to your name
- [x] Badge display next to member name throughout the portal (nav, feed, comments, etc.)
- [x] Admin quest management page (create/edit/delete quests, set CP rewards, set quest type)
- [x] Admin quest verification workflow (review proof submissions, approve/deny)
- [ ] Admin bulk quest assignment (assign a quest to all members or specific groups)
- [x] Automatic quest completion detection (e.g., auto-detect when member uploads photo, activates subscription, etc.)
- [x] Auto-detection backfill for existing members (retrospective on-time payment credits, streak detection)
- [ ] Celebration animation when a quest is completed or tier is achieved
- [ ] Leaderboard — family ranking by rolling 3-month CP (optional, can be toggled off)
- [x] Database: `quests`, `member_quests`, `credit_points_log`, `member_badges` tables

##### Deferred — Requires Later Phases
- [ ] Push notification when a new quest becomes available *(⏳ Phase 4D — Notifications)*
- [ ] First Post quest *(⏳ Phase 4A — Social Feed)*
- [ ] Event attendance quest *(⏳ Phase 5A — Events)*

#### 2C. Member Payouts — Birthday Gifts, Competitions & Beyond
**Goal:** Build a universal payout system powered by Stripe Connect. Members link their bank once, and the LLC can send them money for any reason — birthdays, event prizes, competitions, bonuses, profit sharing, and more. Birthday payouts ($10 auto-gift) are the first use case, but the infrastructure supports anything.

##### How It Works
1. Member opts in to payouts via **portal settings** or during **onboarding** (optional step)
2. Member completes **Stripe Connect Express** onboarding to link their bank account (hosted by Stripe — we never see their bank details)
3. Once linked, the LLC can send money to them for any payout type
4. **Birthday payouts:** A daily edge function checks for birthdays → auto-sends $10
5. **Competition / event payouts:** Admin sends a payout manually from the admin dashboard with a reason and amount
6. Money comes from the **LLC's Stripe balance** first; if balance is low, Stripe debits the LLC's connected bank account (BlueVine) — no new bank setup needed
7. Money arrives in the member's bank in 1-2 business days
8. All payouts are logged with full audit trail

> **Important:** Subscription payments (member → LLC) and payouts (LLC → member) are completely separate Stripe systems. Subscriptions use **Payment Methods** (card/ACH debit). Payouts use **Stripe Connect** (bank deposits). Even if a member uses the same bank for both, they're independent connections with no conflict.

##### Why Stripe Connect
- Already using Stripe — no new vendor, same dashboard, same API keys
- Express accounts handle all KYC/compliance (Stripe collects & verifies bank details, not us)
- Member completes a one-time hosted onboarding to link their bank
- Cost: **$0.25 per payout** ($10/year for 4 members = very low cost)
- Scales to any payout use case: birthdays, prizes, profit sharing, loan disbursements, referral bonuses, emergency fund access

##### Payout Types
| Type | Trigger | Default Amount | Auto/Manual |
|------|---------|---------------|-------------|
| 🎂 Birthday | Daily cron checks birthdays | $10 | Automatic |
| 🏆 Competition | Admin awards after event/challenge | Custom | Manual |
| 🎁 Bonus | Admin discretionary | Custom | Manual |
| 💰 Profit Share | Admin distributes earnings | Custom | Manual |
| 👥 Referral | New member onboards via referral | Custom | Automatic |
| 🎯 Quest Reward | Cash reward quests (future) | Custom | Automatic |
| 🛠️ Custom | Any other reason | Custom | Manual |

##### Member Enrollment & Settings
Members control their own payout enrollment — they can opt in or out at any time:

- [ ] **Payout enrollment toggle** in portal settings — master on/off for receiving payouts
- [ ] **Per-type enrollment** — members can enable/disable specific payout types (e.g., opt in to birthday payouts but skip competition payouts)
- [ ] **Birthday Benefits enrollment** — toggle specifically for the $10 birthday gift
- [ ] Bank link status indicator: ✅ Bank Linked / ⚠️ Not Linked / ❌ Not Enrolled
- [ ] "Manage Bank Account" button to update or re-link via Stripe Connect
- [ ] Enrollment status visible to admin (who's enrolled, who's not, who needs a nudge)

##### Admin Controls
The admin has full control over the payout system with safety switches:

- [ ] **Global payout kill switch** — instantly disable ALL outgoing payouts (emergency stop)
- [ ] **Per-type toggle** — enable/disable birthday payouts, competition payouts, etc. independently
- [ ] **Birthday payout amount** — admin can adjust the default amount (e.g., $10 → $25)
- [ ] **Manual payout console** — send any amount to any connected member with a reason, type, and optional note
- [ ] **Payout approval queue** (optional) — for large amounts, require admin confirmation before sending
- [ ] **Payout ledger** — full history of every outgoing transfer: recipient, amount, type, status, Stripe transfer ID, date
- [ ] **Budget alerts** — warning when total payouts approach a threshold (e.g., "You've sent $200 this month")
- [ ] **Member enrollment overview** — see at a glance who's enrolled, bank linked, and eligible for which payout types
- [ ] Admin settings stored in `app_settings` table (payout_enabled, birthday_payout_enabled, birthday_payout_amount, etc.)

##### Onboarding Integration
Bank linking is added as an **optional step** in the member onboarding wizard:

- [ ] New onboarding step: "Link Your Bank for Payouts" (after profile setup, before contribution)
- [ ] Explains what payouts are: "The LLC sends you money for birthdays, prizes, and more"
- [ ] Clear opt-in language: "Would you like to enroll in birthday benefits?"
- [ ] "Link Bank Account" button → opens Stripe Connect Express hosted onboarding
- [ ] "Skip for now" option — can always set up later from settings
- [ ] Return URL handler → marks onboarding step complete, updates enrollment status
- [ ] If skipped, a gentle nudge banner appears on the dashboard: "🎂 Your birthday is coming up! Link your bank to receive your $10 gift"

##### Features to Build — Stripe Connect Infrastructure
- [ ] `stripe_connect_account_id` column in profiles table
- [ ] `payout_enrolled` boolean column in profiles table (master enrollment toggle)
- [ ] Edge function: `create-connect-onboarding` — generates Stripe Connect Express onboarding link
- [ ] Stripe Connect Express onboarding flow (fully hosted by Stripe)
- [ ] Return URL handler page (`/portal/connect-return.html`) — captures success/failure after bank linking
- [ ] Webhook handler for `account.updated` events (track when Connect account becomes active)
- [ ] Connect status sync — periodically verify account is still active and payable

##### Features to Build — Birthday Payouts
- [ ] Edge function: `birthday-payout` — daily cron that:
  1. Checks if birthday payouts are enabled (admin toggle)
  2. Queries members where `birthday = today AND payout_enrolled = true AND stripe_connect_account_id IS NOT NULL`
  3. Checks member's birthday enrollment setting
  4. Creates `stripe.transfers.create({ amount: birthday_amount, destination: 'acct_xxx' })`
  5. Records payout in the ledger
- [ ] Portal notification: "🎂 Happy Birthday! $10 is on its way to your bank account"
- [ ] Birthday celebration card on portal dashboard (visible to all members)
- [ ] Fallback: if birthday member hasn't linked bank, show nudge + queue payout for when they do
- [ ] Queued payout system — if a payout can't be sent (no bank linked), hold it and auto-send when bank is linked

##### Features to Build — Manual / Competition Payouts
- [ ] Admin payout form: select member → enter amount → select type → add note → send
- [ ] Confirmation modal before sending ("Send $50 to Jennifer for Competition Winner?")
- [ ] Payout status tracking: `pending` → `processing` → `completed` / `failed`
- [ ] Failed payout retry mechanism
- [ ] Member receives notification when a payout is sent to them
- [ ] Payout history visible to each member in their settings or history page

##### Database
- [ ] `payouts` table — universal payout ledger:
  - `id`, `user_id`, `amount`, `type` (birthday, competition, bonus, profit_share, referral, custom)
  - `reason` (text description), `status` (pending, queued, processing, completed, failed)
  - `stripe_transfer_id`, `stripe_payout_id`
  - `created_by` (admin user_id for manual payouts, NULL for automatic)
  - `created_at`, `completed_at`
- [ ] `payout_enrollments` table — per-member, per-type enrollment:
  - `user_id`, `payout_type`, `enrolled` (boolean), `enrolled_at`, `updated_at`
- [ ] `app_settings` table (or row in existing config) — admin global settings:
  - `payouts_enabled` (global kill switch)
  - `birthday_payouts_enabled`, `birthday_payout_amount`
  - `competition_payouts_enabled`
- [ ] Add to profiles: `stripe_connect_account_id`, `payout_enrolled`, `connect_onboarding_complete`

##### Deferred — Requires Later Phases
- [ ] Auto-post to social feed: "🎂 Happy Birthday [Name]! The family sent you $10!" *(⏳ Phase 4A — Social Feed)*
- [ ] Competition payout tied to event results *(⏳ Phase 5A — Events)*
- [ ] Profit share distribution to all members *(⏳ when fund is large enough)*
- [ ] Quest cash rewards (quests that pay real money, not just CP) *(future)*

##### Alternative Options Considered
| Option | Verdict |
|--------|---------|
| **Plaid + Dwolla** | Works but adds 2 new vendors, more complex |
| **PayPal Payouts** | Adds PayPal dependency, members need PayPal accounts |
| **Manual Zelle/Venmo** | Free but not automated, admin has to remember |
| **Stripe Connect (Express)** ✅ | Best fit — integrated, compliant, automated, scales to all payout types |

---

### Phase 3: Family Structure, Identity & Financial Education
**Status:** 🔲 Not Started
**Priority:** 🔴 High
**Goal:** Show who we are, how we're connected, who's responsible for what, and empower every member with financial literacy.

#### 3A. Meet the Team / Leadership Page
**Goal:** A public-facing (or members-only) page that showcases who runs the LLC — builds trust, transparency, and family pride.

- [ ] **"Meet Us" / "Who We Are" page** — dedicated page showing LLC leadership
- [ ] Leadership cards for each officer with:
  - Profile picture
  - Full name
  - Title / Role (President, Vice President, Treasurer, Secretary, etc.)
  - Short bio or responsibility description
  - Member since date
  - Optional: fun fact or quote
- [ ] Org chart / hierarchy layout showing the LLC's structure and chain of command
- [ ] Role definitions with responsibilities:
  - **President / Founder** — manages the LLC, portal, investments, final approvals
  - **Vice President** — supports President, steps in when needed, co-manages operations
  - **Treasurer** — tracks finances, reconciles accounts, oversees budgets
  - **Secretary** — records meeting minutes, manages documents, communications
  - **Event Coordinator** — plans and manages family events (future role)
  - **Social Manager** — moderates feed, manages announcements (future role)
  - **Member** — contributes, participates, votes on decisions
- [ ] Role assignment by admin (assign/change roles from the admin dashboard)
- [ ] Role badges displayed on profiles, social feed, and the leadership page
- [ ] Visual org chart layout (tree or hierarchy diagram)
- [ ] "How It Works" section explaining the LLC structure, money flow, and governance
- [ ] Page accessible from portal navigation and optionally from the public landing page
- [ ] Responsive design — clean layout on mobile and desktop
- [ ] Database: add `title` column to profiles (President, Vice President, Treasurer, etc.)

#### 3B. Family Tree Page
- [ ] Interactive family tree visualization (D3.js or similar)
- [ ] Each node shows: profile picture, name, relationship, member status
- [ ] Admin can add/edit family connections (parent, child, sibling, spouse)
- [ ] Expandable/collapsible branches
- [ ] Non-member family shown as grayed-out nodes (potential future members)
- [ ] Tap a person to see their profile or member page
- [ ] Mobile-friendly touch navigation (pinch to zoom, drag to pan)
- [ ] "Invite to Join" button on non-member nodes
- [ ] Database: `family_relationships` table (person_a, person_b, relationship_type)
- [ ] Support for multi-generational depth (grandparents, grandchildren, etc.)

#### 3C. Credit 101 — Credit Education Hub
**Goal:** Equip every member with the knowledge to build, repair, and maintain excellent credit — a cornerstone of generational wealth.
**Access:** Active members only (gated behind authentication + active subscription check).

- [ ] Dedicated **Credit 101 page** on the portal (members-only)
- [ ] Structured learning modules (step-by-step, not just a wall of text):
  - **Module 1: Understanding Your Credit Score** — what it is, FICO vs. VantageScore, the 5 factors (payment history, utilization, length, mix, inquiries)
  - **Module 2: Checking Your Credit** — how to pull free reports (AnnualCreditReport.com), reading your report, disputing errors
  - **Module 3: Building Credit from Scratch** — secured cards, authorized user strategy, credit builder loans
  - **Module 4: Improving Your Score** — lowering utilization, on-time payments, strategic pay-downs, debt snowball vs. avalanche
  - **Module 5: Credit Card Strategy** — choosing the right cards, cashback optimization, balance transfer tactics, avoiding traps
  - **Module 6: Advanced Moves** — credit limit increases, age of accounts, removing collections, goodwill letters, rapid rescoring
  - **Module 7: Protecting Your Credit** — credit freezes, fraud alerts, identity theft recovery, monitoring tools
- [ ] Progress tracking per member (which modules completed, quiz scores)
- [ ] Short quiz at the end of each module to reinforce learning
- [ ] Completion badge / Credit Points reward (ties into Phase 2B Quest System — "Complete Credit 101" quest)
- [ ] Credit score log — members can periodically log their score to track improvement over time
- [ ] Score trend chart (line graph showing member's credit score history)
- [ ] Resource links to recommended tools (Credit Karma, Experian, Discover Scorecard, etc.)
- [ ] Admin can add/edit modules and content
- [ ] Mobile-friendly card-based layout for each module
- [ ] Database: `credit_modules`, `member_module_progress`, `credit_score_log` tables

#### 3D. Personal Finance & Budget Tracker
**Goal:** Give members a powerful budgeting tool right in the portal — import bank statements, automatically categorize spending, identify habits, and get AI-powered advice.
**Access:** Active members only.

##### Core Budget Features
- [ ] **Budget Dashboard** — overview of income, expenses, savings rate, and month-over-month trends
- [ ] **Bank Statement Import** — upload CSV/OFX bank statements to auto-import transactions
- [ ] **Auto-Categorization** — transactions automatically sorted into categories (Housing, Food, Transportation, Entertainment, Subscriptions, etc.)
- [ ] **Manual Transaction Entry** — add cash transactions or adjust categories
- [ ] **Spending Breakdown** — pie/donut chart showing spending by category
- [ ] **Monthly Budget Goals** — set target spending per category, visual progress bars
- [ ] **Budget vs. Actual** — compare planned budget to real spending each month
- [ ] **Recurring Expense Detection** — auto-detect subscriptions and recurring charges
- [ ] **Savings Goal Tracker** — set savings targets with progress visualization
- [ ] **Income Tracking** — log paychecks and other income sources
- [ ] **Net Worth Snapshot** — total assets minus debts, tracked over time
- [ ] **Spending Alerts** — notification when approaching budget limits
- [ ] **Monthly Summary Report** — auto-generated spending report at month end
- [ ] **Export to CSV** — download budget data for personal records

##### AI Financial Coach (Chat)
- [ ] **AI Chat Assistant** integrated into the budget page
- [ ] AI reads the member's budget data, spending patterns, and financial goals
- [ ] Conversational interface — member can ask questions like:
  - "Where am I spending the most?"
  - "How can I save $200 more per month?"
  - "What subscriptions should I cancel?"
  - "Am I on track to hit my savings goal?"
  - "What's the best way to pay down my debt?"
- [ ] AI provides **personalized, data-driven advice** based on actual spending
- [ ] Proactive suggestions — AI surfaces insights without being asked (e.g., "You spent 40% more on dining this month")
- [ ] Chat history preserved per member (can review past conversations)
- [ ] Powered by OpenAI API (GPT-4) or similar LLM
- [ ] Data privacy: each member's financial data is only accessible to them and the AI — never shared with other members
- [ ] Admin cannot see individual member budget data (privacy-first design)
- [ ] Rate limiting to manage API costs

##### Technical Considerations
| Component | Technology | Notes |
|-----------|-----------|-------|
| Statement parsing | Custom CSV parser + OFX library | Handle multiple bank formats |
| Categorization | Rule-based + ML fallback | Start with keyword matching, improve with AI over time |
| AI Chat | OpenAI API (GPT-4) | Context window includes member's spending summary |
| Data storage | Supabase (encrypted) | RLS ensures members only see their own data |
| Charts | Chart.js (already in stack) | Consistent with existing portal charts |

- [ ] Database: `budget_transactions`, `budget_categories`, `budget_goals`, `ai_chat_history` tables
- [ ] Supabase RLS policies ensuring strict per-member data isolation
- [ ] Edge function for AI chat (proxies requests to OpenAI, injects member's financial context)

---

### Phase 4: Family Social Hub
**Status:** 🔲 Not Started
**Priority:** 🟡 Medium
**Goal:** Make the portal more than finances — make it the family's digital home.

#### 4A. Social Feed & Announcements

> **Big Picture:** Home becomes the **Feed** — the first thing members see when they open the app. Posts, announcements, milestones, and family updates all in one scrollable timeline. The portal transforms from a finance tool into a living family hub.

##### Context-Aware Mobile Header
The top navigation bar changes dynamically based on which page the member is on — similar to Instagram's per-page header pattern:

| Page | Left | Center | Right |
|------|------|--------|-------|
| **Home (Feed)** | Logo / "JM" | "Family Feed" | ➕ New Post, ❤️ Notifications |
| **History** | Logo | "History" | Filter icon |
| **Goals (Milestones)** | Logo | "Milestones" | — |
| **Invest** | Logo | "Portfolio" | — |
| **Profile / Settings** | Back arrow | "Profile" | ⚙️ Settings gear |

- [ ] Context-aware mobile top nav (dynamic icons/actions per page)
- [ ] Home page becomes the social feed (replaces current dashboard)
- [ ] New Post button (➕) in header opens post composer
- [ ] Notifications bell/heart icon with unread badge
- [ ] Profile page accessible via bottom tab avatar (replaces current settings link)
- [ ] Settings accessible from profile page gear icon

##### Feed Features
- [ ] Admin announcements section (pinned to top of feed)
- [ ] Milestone celebrations (auto-generated: "The family just hit $10,000 in total investments! 🎉")
- [ ] Social feed — members can post text, images, and videos
- [ ] Like, comment, and bookmark posts
- [ ] Feed filtering (All / Announcements / Milestones / Member Posts)
- [ ] Threaded replies — reply to any post inline
- [ ] @mentions — tag other family members in posts and replies
- [ ] Post editing and deletion (own posts only)
- [ ] Emoji reactions (beyond just “like” — ❤️ 😂 🔥 👏 etc.)
- [ ] Image/video upload with preview before posting
- [ ] Link preview cards (auto-fetch title + thumbnail for shared URLs)
- [ ] "New posts" indicator when feed updates while scrolling
- [ ] Mobile-optimized infinite scroll

#### 4B. Member Profiles (Instagram-Style)
**Goal:** Give every member a rich, visual profile page — part social media, part resume, part family legacy page.

##### Profile Header
- [ ] Cover photo / banner image (upload + crop)
- [ ] Large profile picture with online status indicator
- [ ] Display name (first + last) with editable bio / tagline
- [ ] Stats bar: **Posts** | **Contributions** | **Member Since** | **Streak**
- [ ] Credit Point tier badge (🥉 Bronze → 💎 Diamond) displayed on profile
- [ ] "Edit Profile" button (own profile) / "Message" button (other members)
- [ ] Contribution streak flame icon with day count

##### Profile Content Tabs
- [ ] **Posts** tab — grid layout (Instagram-style 3-column image grid with overlay on hover)
- [ ] **Feed** tab — chronological list view of all the member's posts, comments, and activity
- [ ] **Photos** tab — all images the member has posted, organized by date
- [ ] **Milestones** tab — personal contribution milestones and badges earned
- [ ] **Activity** tab — timeline of actions (joined, reached milestone, completed quest, attended event, etc.)

##### Post Creation (from Profile)
- [ ] Create post directly from profile page
- [ ] Post types: **Text**, **Photo**, **Photo + Caption**, **Video**, **Link Share**
- [ ] Multi-image posts with swipe/carousel view
- [ ] Post privacy: **Family** (all members) or **Private** (only visible on own profile)
- [ ] Edit and delete own posts
- [ ] Post timestamp with relative time ("2h ago", "3d ago")

##### Profile Stats & Gamification
- [ ] Total lifetime contributions (dollar amount)
- [ ] Current monthly contribution amount
- [ ] Contribution streak (consecutive on-time months)
- [ ] Longest streak record
- [ ] Quests completed count
- [ ] Credit Points total + tier progress bar
- [ ] Badges showcase (earned from milestones, quests, events)
- [ ] "Top Contributor" / "Streak Master" / "Event Regular" special badges

##### Profile Interactions
- [ ] View any family member's profile by tapping their avatar anywhere in the app
- [ ] Like / comment on profile posts
- [ ] Direct message button → opens DM thread (ties into Phase 4C)
- [ ] "Nudge" button — send a friendly reminder to contribute or check in
- [ ] Share profile link (deep link to member's profile)

##### Profile Settings & Privacy
- [ ] Choose what's visible to other members (bio, birthday, contribution stats, posts)
- [ ] Hide contribution amount (show streak but not dollar amount)
- [ ] Block / mute other members (hides their content from your feed)
- [ ] Profile visibility: **Public to Family** or **Private** (admin-only visible)

##### Technical Requirements
- [ ] Database: `posts`, `post_images`, `post_likes`, `post_comments`, `profile_badges` tables
- [ ] Supabase Storage bucket for post images + cover photos
- [ ] Image compression / thumbnail generation (edge function)
- [ ] Infinite scroll with cursor-based pagination
- [ ] RLS: members see only family-visible posts; own profile always fully visible
- [ ] Profile page route: `/portal/profile.html?id={user_id}`
- [ ] Responsive: full-width cover on mobile, constrained on desktop

#### 4C. Private Messaging (DMs)
- [ ] One-on-one direct messages between members
- [ ] Real-time messaging (Supabase Realtime or similar)
- [ ] Message notifications
- [ ] Read receipts
- [ ] Optional: Group chats

##### Snapchat-Style Message Streams
> **Concept:** Ephemeral, casual messaging that feels more like Snapchat than email. Messages auto-disappear after being viewed (or after 24 hours), encouraging frequent, low-pressure communication between family members.

- [ ] Ephemeral messages — auto-delete after recipient views them (configurable: after view / 24h / 7d)
- [ ] "Snap" button — quick photo/video message with optional caption
- [ ] Story-style feature — post a 24-hour story visible to all family members
- [ ] Story viewers list (who saw your story)
- [ ] Message streaks — track consecutive days of messaging between two members (🔥 streak counter)
- [ ] Streak milestone celebrations (7-day, 30-day, 100-day streaks)
- [ ] Bitmoji-style family avatars (or custom emoji based on profile pic)
- [ ] Quick reactions to snaps (❤️ 😂 🔥 😮 without needing to type)
- [ ] Screenshot notification ("[Name] screenshotted your message!")
- [ ] Archive option — save important messages before they disappear
- [ ] Database: `ephemeral_messages` table (sender_id, receiver_id, content, media_url, expires_at, viewed_at, type)
- [ ] Database: `stories` table (author_id, media_url, caption, created_at, expires_at)
- [ ] Database: `story_views` table (story_id, viewer_id, viewed_at)
- [ ] Database: `message_streaks` table (user_a_id, user_b_id, current_streak, longest_streak, last_message_at)

#### 4D. Push & Text Notifications
- [ ] Push notifications (web push via service workers)
- [ ] SMS/text notifications via **Twilio** (or similar)
- [ ] Notification preferences per member (what they want to be notified about)
- [ ] Notification types:
  - New announcements
  - Event invites & RSVPs
  - DM received
  - Milestone reached
  - Loan status updates
  - Subscription reminders

#### 4E. Family Location Map (GPS)
> **Concept:** An opt-in family map where members can share their live or last-known location — like Find My Friends, but built into the family portal. Great for safety, coordination, and just knowing where everyone is.

- [ ] Opt-in location sharing (must explicitly enable — off by default)
- [ ] Interactive map using **Leaflet.js** (free, open-source) + **OpenStreetMap** tiles
- [ ] Member pins on the map with profile picture avatars
- [ ] Location accuracy levels: **Precise** (exact), **City-level** (approximate), **Off**
- [ ] Last updated timestamp per member
- [ ] "Check In" button — manually share current location without continuous tracking
- [ ] Location history (optional — see where family members have checked in over time)
- [ ] Geofence alerts (optional — "[Name] arrived at [Place]")
- [ ] Browser Geolocation API for web; future: native app with background location
- [ ] Privacy controls per member: who can see your location (all family / specific members / no one)
- [ ] Admin can see all opted-in members on a single map
- [ ] Mobile-optimized: full-screen map with bottom sheet for member list
- [ ] Database: `member_locations` table (user_id, latitude, longitude, accuracy, updated_at, sharing_level)
- [ ] Database: `location_checkins` table (user_id, latitude, longitude, place_name, created_at)

> **Note:** This feature uses the browser's Geolocation API (no cost). Map tiles from OpenStreetMap are free. Leaflet.js is a lightweight, mobile-friendly map library. For a native-app feel later, this can be upgraded to Mapbox GL JS (free tier: 50k map loads/month).

---

### Phase 5: Events & Family Activities
**Status:** 🔲 Not Started
**Priority:** 🟡 Medium
**Goal:** Bring the family together IRL with organized events and shared experiences.

#### 5A. Events System
- [ ] Create event (title, description, date/time, location, cover image)
- [ ] Event types: **Gathering**, **Birthday**, **Holiday**, **Vacation**, **Meeting**, **Custom**
- [ ] RSVP system (Going / Maybe / Not Going)
- [ ] See who's attending with profile pics
- [ ] Event reminders (push + SMS)
- [ ] Event comments / discussion thread
- [ ] Past events archive with photos

#### 5B. Vacation / Trip Events (Special Type)
- [ ] Trip-style events with a **deposit requirement**
- [ ] Members RSVP by submitting a deposit (goes into a trip pot)
- [ ] Pot covers shared expenses (Airbnb, rental cars, activities, etc.)
- [ ] The LLC pays from the pot on behalf of the group
- [ ] **No refunds for last-minute cancellations** (policy clearly stated at RSVP)
- [ ] Trip expense breakdown visible to all attendees
- [ ] Trip budget tracker (target vs. collected)

#### Example Flow
```
Jennifer creates "Jennifer's 54th Birthday Bash"
    📍 Location: The Venue, Atlanta GA
    📅 Saturday, July 18th at 6:00 PM
    
    → Push notification sent to all members:
      "🎂 Jennifer created an event! Jennifer's 54th Birthday
       at The Venue — Click here to RSVP"
    
    → Members tap notification → See event details → RSVP
    → Jennifer sees RSVP list with profile pics
    → Event page shows countdown, attendee list, and comments
```

---

### Phase 6: Family Gallery
**Status:** 🔲 Not Started
**Priority:** 🟡 Medium
**Goal:** One place for all family memories — organized, searchable, and preserved forever.

#### Features
- [ ] Photo & video uploads (drag and drop, mobile camera support)
- [ ] Album creation (by event, year, person, custom)
- [ ] Metadata per photo:
  - Date taken
  - Location / address
  - People tagged (linked to member profiles)
  - Caption / description
  - Who uploaded it
- [ ] Search by person, date, location, or keyword
- [ ] Slideshow view
- [ ] Download originals
- [ ] Storage solution: Supabase Storage or S3-compatible bucket
- [ ] Auto-organize by date (timeline view)
- [ ] "On This Day" — resurface old memories

---

### Phase 7: Trust Formation & Legal Structure
**Status:** 🔲 Not Started (Planned)
**Priority:** 🟡 Medium (should happen before major asset acquisition)
**Goal:** Transition the LLC to be owned by a Family Trust for maximum asset protection and generational transfer.

- [ ] Research revocable vs. irrevocable trust structures
- [ ] Consult with estate planning attorney
- [ ] Draft trust agreement
- [ ] Transfer LLC ownership to the Trust
- [ ] Update all accounts and policies to reflect new structure
- [ ] Establish succession plan (who manages the Trust if current trustees can't)
- [ ] Annual trust review process
- [ ] Member education on how the trust works and protects them

---

### Phase 8: Family Lending Program
**Status:** 🔲 Not Started
**Priority:** 🟡 Medium (requires legal research + $50k milestone)
**Goal:** Become the family's own bank — low-interest loans that keep money in the family.

> **🔒 Unlocks at $50,000 milestone tier (see Phase 2)**

#### How It Works
- **30% of total LLC funds** are available in the lending pool at any given time
- Each member can borrow **up to 30% of their own total contribution amount**
- Interest rate is set **below market rate** for personal loans (e.g., if banks charge 10-15%, family rate could be 4-6%)
- Repayment terms are flexible but structured (monthly payments back to the LLC)
- Interest earned goes back into the investment fund — **the family profits from its own lending**

#### Features to Build
- [ ] Loan eligibility calculator (based on member's total contributions)
- [ ] Loan application form (amount, reason, preferred repayment term)
- [ ] Admin loan approval/denial workflow
- [ ] Loan agreement generation (digital signature)
- [ ] Repayment tracking dashboard (borrower view)
- [ ] Admin lending dashboard (all active loans, repayment status, pool availability)
- [ ] Automated payment reminders
- [ ] Late payment handling & policy
- [ ] Loan history per member

#### Legal Considerations (To Research)
- [ ] State lending regulations for LLC-to-member loans
- [ ] Required disclosures and documentation
- [ ] Interest rate compliance (usury laws)
- [ ] Tax implications of intra-family lending
- [ ] Promissory note templates
- [ ] Whether a lending license is needed (varies by state)

---

### Phase 9: Member Benefits Program
**Status:** 🔲 Not Started
**Priority:** 🟠 Medium-Low (requires significant legal research + capital)
**Goal:** Make membership tangibly valuable beyond investment returns.

#### 9A. Family Vehicle Program 🚗
**Concept:** LLC-owned vehicle(s) available for members who need transportation — whether they're in a pinch, young and need a ride to work/school, or between cars.

> **🔒 Unlocks at $250,000 milestone tier (see Phase 2)**

- [ ] LLC purchases and owns the vehicle(s)
- [ ] Reservation / scheduling system on the portal
- [ ] Vehicle availability calendar
- [ ] Pickup/return process and condition logging
- [ ] Mileage tracking

##### Legal / Insurance Research Needed
- [ ] Commercial auto insurance for LLC-owned vehicles
- [ ] Liability structure — who's responsible in an accident?
- [ ] Study how Turo / Uber / Zipcar handle insurance & liability
- [ ] Per-use insurance model vs. blanket policy
- [ ] Member agreement / waiver for vehicle use
- [ ] Whether members pay for their own insurance while using the vehicle
- [ ] State-specific regulations for vehicle sharing within an LLC
- [ ] Maintenance responsibility and cost allocation
- [ ] Potential revenue model (small usage fee to cover insurance + maintenance)

#### 9B. Life Insurance Benefit 🛡️
**Concept:** A whole life insurance policy for every member, paid for by the LLC/Trust, with the Trust as primary beneficiary.

- [ ] Whole life policy issued for each active member
- [ ] LLC/Trust pays premiums from operating funds
- [ ] Trust is the primary beneficiary
- [ ] Percentage of payout goes to the member's children (if applicable)
- [ ] Policy details visible on member's portal profile
- [ ] Annual policy review process

##### Legal / Insurance Research Needed
- [ ] Group life insurance vs. individual policies for LLC members
- [ ] Tax implications of LLC-funded life insurance
- [ ] Insurable interest requirements
- [ ] Trust as beneficiary — proper documentation
- [ ] Member consent and medical underwriting process
- [ ] Cost projections per member per year
- [ ] Vesting schedule (minimum membership duration before policy is issued?)

#### 9C. Future Benefits (Ideas)
- [ ] Emergency fund access (separate from lending program)
- [ ] Education assistance / scholarship fund for members' children
- [ ] Tax preparation assistance
- [ ] Group discount programs (insurance, travel, etc.)
- [ ] Credit building assistance (see Phase 3C for dedicated Credit 101 hub)

---

### Phase 10: Family Compound / Real Estate
**Status:** 🔲 Not Started (Long-Term Vision)
**Priority:** 🔵 Low (future phase — requires significant capital)
**Goal:** Family-owned land with affordable housing for members.

> **🔒 Unlocks at $500,000 milestone tier (see Phase 2)**

#### Vision
- LLC/Trust purchases land
- Build or place housing: house, duplex, multi-unit, or multiple small homes
- Members can live there at **below-market rent**
- Rent covers property maintenance, taxes, insurance, and contributes to LLC fund
- Builds equity for the family collectively

#### Considerations
- [ ] Real estate market research (target locations)
- [ ] Financing options (commercial loan, DSCR loan, fund from investment returns)
- [ ] Property management structure
- [ ] Tenant/member agreements (different from standard leases)
- [ ] Property maintenance plan and budget
- [ ] Insurance (property + liability)
- [ ] Tax implications of LLC-owned rental property
- [ ] Zoning laws for multi-unit on single property
- [ ] Timeline: Begin when investment fund reaches $500,000+

---

## 📊 Priority Matrix

| Phase | Name | Priority | Complexity | Dependencies |
|-------|------|----------|------------|--------------|
| 1A | Investment Dashboard | ✅ Done | Medium | Fidelity data (manual or Plaid) |
| 1B | Manual Deposits | ✅ Done | Low-Medium | Database schema update |
| 1C | Member Onboarding | ✅ Done | Low-Medium | Supabase Storage (profile pics) |
| 2A | Milestones & Perks | ✅ Done | Low-Medium | Investment data from Phase 1A |
| 2B | Quest & Task System | ✅ Done | Medium | Milestones system |
| 3A | Meet the Team / Leadership | 🔴 High | Low | Profile system |
| 3B | Family Tree | 🔴 High | Medium | D3.js or tree library |
| 3C | Credit 101 Education | 🔴 High | Low-Medium | Auth + active member check |
| 3D | Budget Tracker + AI Coach | 🔴 High | High | OpenAI API, CSV parsing |
| 4A | Social Feed | 🟡 Medium | Medium | Supabase storage for media |
| 4B | Member Profiles | 🟡 Medium | Medium | Profile pics storage |
| 4C | Private Messaging + Snaps | 🟡 Medium | Medium-High | Supabase Realtime |
| 4D | Notifications | 🟡 Medium | Medium | Twilio account, service workers |
| 4E | Family Location Map | 🟡 Medium | Medium | Leaflet.js, browser Geolocation API |
| 5A | Events System | 🟡 Medium | Medium | Notification system (Phase 4D) |
| 5B | Vacation Events | 🟡 Medium | High | Events system, payment processing |
| 6 | Family Gallery | 🟡 Medium | Medium | Storage solution |
| 7 | Trust Formation | 🟡 Medium | High (legal) | Estate planning attorney |
| 8 | Family Lending | 🟡 Medium | High | Legal research, $50k milestone |
| 9A | Family Vehicle | 🟠 Medium-Low | Low (portal) / High (legal) | Legal research, $250k milestone |
| 9B | Life Insurance | 🟠 Medium-Low | Low (portal) / High (legal) | Legal research, insurance broker |
| 10 | Family Compound | 🔵 Low | Very High | Significant capital, $500k milestone |

---

## 🛠️ Technical Notes

### Potential Tech Additions
| Need | Technology | Notes |
|------|-----------|-------|
| Investment data | **Plaid API** | Connects to Fidelity for holdings/balances |
| SMS notifications | **Twilio** | Text message notifications for events, reminders |
| Push notifications | **Web Push API** + service workers | Free, browser-native |
| File storage | **Supabase Storage** | Already using Supabase — natural fit for photos/videos |
| AI chat / coaching | **OpenAI API (GPT-4)** | Powers AI financial coach in budget tracker |
| CSV parsing | **Custom parser** | Bank statement import for budget tracker |
| Real-time messaging | **Supabase Realtime** | WebSocket-based, already in our stack |
| Document signing | **DocuSign API** or **HelloSign** | For loan agreements, vehicle waivers |
| Payment processing | **Stripe** (existing) | One-time deposits, trip deposits, rent payments |

### Database Expansion Needed
- `milestones` table (title, description, threshold_cents, achieved_at, type, perk_description)
- `family_roles` table (user_id, role_name, role_description, assigned_by, assigned_at)
- `family_relationships` table (person_a_id, person_b_id, relationship_type, added_by, created_at)
- `family_tree_nodes` table (name, profile_id, is_portal_member, parent_node_id, created_at)
- `investments` table (fund, shares, value, date, updated_by)
- `manual_deposits` table (member_id, amount, date, notes, recorded_by)
- `loans` table (member_id, amount, interest_rate, term, status, payments)
- `loan_payments` table (loan_id, amount, date, remaining_balance)
- `posts` table (author_id, content, media_urls, created_at)
- `comments` table (post_id, author_id, content, parent_comment_id, created_at)
- `reactions` table (post_id, user_id, emoji)
- `likes` table (post_id, user_id)
- `bookmarks` table (post_id, user_id)
- `messages` table (sender_id, receiver_id, content, read_at)
- `events` table (creator_id, title, description, date, location, type, deposit_amount)
- `rsvps` table (event_id, user_id, status, deposit_paid)
- `gallery_photos` table (uploader_id, url, caption, date_taken, location)
- `photo_tags` table (photo_id, user_id)
- `notifications` table (user_id, type, content, read, created_at)
- `quests` table (title, description, cp_reward, quest_type, is_recurring, instructions, created_by)
- `member_quests` table (quest_id, user_id, status, proof_url, verified_by, completed_at)
- `credit_points_log` table (user_id, points, reason, quest_id, created_at, expires_at)
- `member_badges` table (user_id, badge_key, earned_at, is_displayed)
- `credit_modules` table (title, slug, content, order, quiz_data)
- `member_module_progress` table (user_id, module_id, completed, quiz_score, completed_at)
- `credit_score_log` table (user_id, score, source, logged_at)
- `budget_transactions` table (user_id, date, description, amount_cents, category, source_file)
- `budget_categories` table (user_id, name, monthly_limit_cents, color)
- `budget_goals` table (user_id, title, target_cents, current_cents, deadline)
- `ai_chat_history` table (user_id, role, content, created_at)
- `vehicles` table (name, make, model, year, status, insurance_info)
- `vehicle_reservations` table (vehicle_id, user_id, start_date, end_date)

---

## 💡 Revenue & Sustainability

The LLC sustains itself through:
1. **Member subscriptions** → Primary income, goes to investments
2. **Loan interest** → Interest payments flow back into the investment fund
3. **Vehicle usage fees** (if implemented) → Cover insurance + maintenance
4. **Rental income** (future compound) → Cover property costs + contribute to fund
5. **Investment returns** → Dividends and capital appreciation compound over time

---

## 📅 Implementation Order

> **Rule:** Go in order. Items marked ⏳ are deferred because they depend on a later phase — they'll be picked up when that phase is built. Everything else is buildable in sequence.

### ✅ Complete
1. ✅ Core portal — subscriptions, payments, admin dashboard
2. ✅ Phase 1A — Investment dashboard (CSV upload, manual entry, portfolio viewer)
3. ✅ Phase 1B — One-time & manual deposits (Stripe + admin-recorded)
4. ✅ Phase 1C — Member onboarding wizard (name, birthday, photo, contribution)
5. ✅ Nav/footer component extraction & profile display (pageShell.js)
6. ✅ Mobile nav redesign — 5-tab bar with Instagram-style center button
7. ✅ Phase 2A — Milestones page, progress bars, expandable detail cards, ETA calculations

### 🔧 Up Next — Phase 2 (Milestones, Perks & Quests)
8. ✅ **Phase 2A wrap-up** — Animated milestone celebration (confetti + toast), milestone history timeline
9. ✅ **Phase 2B — Quest & Task System** — Quest board, Credit Points, status tiers (Bronze → Diamond), badge collection, auto-detection engine, admin quest management, proof review workflow
10. ✅ **Brand Splash Screen & Logo Management** — Animated splash page with logo, floating orbs, progress bar, auth-aware redirect; admin brand settings page with transparent/solid logo upload
11. **Phase 2C — Birthday Payouts** — Stripe Connect Express, automated $10 birthday deposits, bank linking flow

### Phase 3 (Family Structure, Identity & Education)
12. **Phase 3A — Meet the Team / Leadership page** — roles, bios, org chart, role badges
13. **Phase 3B — Family Tree** — interactive tree visualization, relationships, multi-generational
14. **Phase 3C — Credit 101 Education Hub** — learning modules, quizzes, score tracking
15. **Phase 3D — Budget Tracker + AI Coach** — bank statement import, categorization, spending analysis, OpenAI chat

### Phase 4 (Family Social Hub)
15. **Phase 4A — Social Feed & Announcements** — posts, likes, comments, context-aware mobile header
16. **Phase 4B — Member Profiles (Instagram-style)** — cover photos, posts grid, stats, badges
17. **Phase 4C — Private Messaging + Snaps** — one-on-one DMs, Snapchat-style ephemeral messages, stories, message streaks
18. **Phase 4D — Push & Text Notifications** — web push, Twilio SMS, notification preferences
19. **Phase 4E — Family Location Map (GPS)** — opt-in location sharing, Leaflet.js map, check-ins, privacy controls
20. ⏳ **Pick up deferred items** — social feed posts for milestones/birthdays, push notifications for milestones, perk badges on profiles, admin custom milestones

### Phase 5 (Events & Family Activities)
21. **Phase 5A — Events System** — create events, RSVP, reminders, event comments
22. **Phase 5B — Vacation / Trip Events** — deposit requirement, trip pot, expense breakdown

### Phase 6+
23. **Phase 6 — Family Gallery** — photo/video uploads, albums, tagging, "On This Day"
24. **Phase 7 — Trust Formation** — estate attorney, trust agreement, succession plan
25. **Phase 8 — Family Lending Program** — loan applications, repayment tracking ($50k milestone)
26. **Phase 9 — Member Benefits** — vehicle program ($250k), life insurance, scholarships
27. **Phase 10 — Family Compound** — real estate acquisition ($500k+ milestone)

---

## 📝 Living Document

This roadmap is a **living document**. It will be updated as:
- Features are completed
- New ideas emerge
- Legal research provides clarity
- The fund grows and new possibilities open up
- Members provide feedback and suggestions

**Last Updated:** March 9, 2026
**Maintained By:** Justin McNeal (Admin)

---

*"The best time to plant a tree was 20 years ago. The second best time is now." — Chinese Proverb*

*We're planting our tree today. 🌳*
