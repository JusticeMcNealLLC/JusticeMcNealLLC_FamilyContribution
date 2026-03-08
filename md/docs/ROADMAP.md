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
- [x] Payment history with invoices
- [x] Account settings (name, password)
- [x] Admin dashboard (member management, invite system)
- [x] Member activation / deactivation
- [x] Mobile-friendly design with bottom tab navigation
- [x] Admin hub with grid navigation to sub-pages
- [x] Investment dashboard (CSV upload, manual entry, portfolio viewer)

---

## 🗺️ The Roadmap

### Phase 1: Investment Visibility & Manual Deposits
**Status:** ✅ 1A Complete — 🔧 1B In Progress — 1C Not Started
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

##### Current Flow (Partial ✅)
- [x] Admin sends invite via email
- [x] Member receives invite link
- [x] Member creates account (sets password)
- [x] Member lands on portal

##### Onboarding Improvements Needed
- [ ] Welcome screen / first-time setup wizard after accepting invite
- [ ] **Existing member forced onboarding** — redirect to wizard on login if `setup_completed = false`
- [ ] Set first name & last name during onboarding (not buried in settings)
- [ ] Set birthday during onboarding
- [ ] Upload profile picture during onboarding (crop + preview)
- [ ] Database: add `birthday`, `profile_picture_url` columns to `profiles`
- [ ] Supabase Storage bucket for profile pictures
- [ ] "Complete Your Profile" nudge banner if profile is incomplete
- [ ] Admin can see onboarding completion status per member
- [ ] Profile picture displayed throughout portal (nav, settings, social feed)
- [ ] Birthday auto-celebration (ties into Phase 2 milestones & Phase 5 events)

---

### Phase 2: Milestones, Perks & Quests
**Status:** 🔲 Not Started
**Priority:** 🔴 High
**Goal:** Show members what we've achieved and what perks unlock as our assets grow — gamify generational wealth.

#### 2A. Milestone Tiers (Unlockable by Asset Threshold)
| Threshold | Milestone | Perk / Feature Unlocked |
|-----------|-----------|-------------------------|
| $5,000 | 🌱 Seed Planted | Social feed launches — members can post & interact |
| $10,000 | 📈 First Five Figures | Events system opens — plan family gatherings |
| $25,000 | 💪 Building Momentum | Family gallery unlocked — store & share memories |
| $50,000 | 🏦 Mini Bank | Lending program opens — members can borrow from the fund |
| $75,000 | 🛡️ Safety Net | Emergency fund access for members in need |
| $100,000 | 🎉 Six Figures | Trust formation begins — consult estate attorney |
| $250,000 | 🚗 Fleet Ready | Family vehicle program evaluation begins |
| $500,000 | 🏠 Compound Vision | Real estate research & land acquisition planning |
| $1,000,000 | 👑 Generational | Full benefits suite — life insurance, scholarships, compound |

##### Features to Build
- [ ] Milestones page on the portal (visual roadmap with progress bars)
- [ ] Current asset level indicator with animated progress to next tier
- [ ] Animated celebration when a new milestone is reached (confetti, toast notification)
- [ ] Milestone history timeline (when each tier was achieved)
- [ ] Push notification to all members when a milestone is hit
- [ ] Admin can create custom milestones beyond the defaults
- [ ] Perk status badges on member profiles
- [ ] "Next Unlock" countdown card on the portal dashboard
- [ ] Auto-generated social feed posts for milestone achievements
- [ ] Locked/unlocked visual state for each perk tier

#### 2B. Quest & Task System
**Goal:** Give members clear, actionable tasks that benefit both them and the LLC — completion earns Credit Points that unlock rewards and boost their status in the system.

##### How It Works
- Members receive quests (tasks) they can complete at their own pace
- Completing quests earns **Credit Points (CP)** — tracked on their profile
- Credit Points unlock **status tiers** and perks within the portal
- Some quests are one-time (e.g. "Open a Fidelity account"), others are recurring (e.g. "Pay on time this month")
- Admin can create, edit, and assign quests from the admin dashboard
- Quest progress is visible on the member's portal dashboard

##### Credit Point Tiers
| Points | Status | Perks |
|--------|--------|-------|
| 0–99 | 🥉 Bronze Member | Base access |
| 100–249 | 🥈 Silver Member | Priority lending queue, profile badge |
| 250–499 | 🥇 Gold Member | Higher loan limits, voting weight bonus |
| 500+ | 💎 Diamond Member | VIP status, featured on leadership page, first access to new benefits |

##### Example Quests
| Quest | Description | CP Reward | Type |
|-------|-------------|-----------|------|
| 🏦 Open Fidelity Account | Create a personal Fidelity brokerage account | 50 CP | One-time |
| 💳 Apply for Fidelity Credit Card | Apply for the Fidelity Rewards Visa Signature Card | 50 CP | One-time |
| 🔗 Link Cashback to LLC | Link your Fidelity credit card cashback to the LLC brokerage account | 100 CP | One-time |
| 💰 Use Fidelity Card as Primary | Use the Fidelity card as your primary spending card for a full month to maximize cashback contributions | 25 CP | Monthly recurring |
| 📊 Complete Budget Setup | Set up your personal budget tracker on the portal | 30 CP | One-time |
| 📈 Credit Score Check-In | Log your credit score update on the portal | 15 CP | Monthly recurring |
| ✅ On-Time Payment Streak | Pay your subscription on time this month | 10 CP | Monthly recurring |
| 📚 Complete Credit 101 | Read all Credit 101 modules and pass the quiz | 40 CP | One-time |
| 🎉 Attend Family Event | RSVP and attend a family event | 20 CP | Per event |
| 👥 Refer a Family Member | Invite and onboard a new family member | 75 CP | Per referral |

##### Fidelity Cashback Quest (Flagship Quest)
> **Why this matters:** The Fidelity Rewards Visa earns **2% cashback on all purchases** — deposited directly into a Fidelity account. If members link their cashback to the LLC's Fidelity brokerage, every dollar they spend passively grows the family fund. A member spending $2,000/month generates $40/month in extra contributions — automatically.

- [ ] Quest detail page explaining the Fidelity card benefits and step-by-step setup
- [ ] Guided walkthrough: Open Fidelity account → Apply for card → Link cashback to LLC account
- [ ] Verification system (member uploads screenshot or admin confirms linkage)
- [ ] Recurring quest: monthly spending confirmation to earn ongoing CP
- [ ] Cashback contribution tracking per member (visible on admin dashboard)

##### Features to Build
- [ ] Quests page on portal (list of available, in-progress, and completed quests)
- [ ] Quest detail view with instructions, requirements, and reward info
- [ ] Quest progress tracking (started, submitted proof, admin verified, completed)
- [ ] Credit Points balance displayed on portal dashboard and profile
- [ ] Credit Point history log (earned, spent, reason)
- [ ] Status tier badge on member profiles (Bronze → Silver → Gold → Diamond)
- [ ] Admin quest management (create/edit quests, set CP rewards, verify completions)
- [ ] Admin bulk quest assignment (assign a quest to all members or specific groups)
- [ ] Push notification when a new quest becomes available
- [ ] Celebration animation when a quest is completed or tier is achieved
- [ ] Leaderboard — family ranking by Credit Points (optional, can be toggled off)
- [ ] Database: `quests`, `member_quests`, `credit_points_log` tables

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

#### 4B. Member Profiles
- [ ] Profile pictures (upload + crop)
- [ ] Bio / about section
- [ ] Member's post history on their profile page
- [ ] Member since date, contribution streak, badges
- [ ] Profile privacy settings

#### 4C. Private Messaging (DMs)
- [ ] One-on-one direct messages between members
- [ ] Real-time messaging (Supabase Realtime or similar)
- [ ] Message notifications
- [ ] Read receipts
- [ ] Optional: Group chats

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
| 1A | Investment Dashboard | 🔴 High | Medium | Fidelity data (manual or Plaid) |
| 1B | Manual Deposits | 🔴 High | Low-Medium | Database schema update |
| 1C | Member Onboarding | 🔴 High | Low-Medium | Supabase Storage (profile pics) |
| 2A | Milestones & Perks | 🔴 High | Low-Medium | Investment data from Phase 1A |
| 2B | Quest & Task System | 🔴 High | Medium | Milestones system, profiles |
| 3A | Meet the Team / Leadership | 🔴 High | Low | Profile system |
| 3B | Family Tree | 🔴 High | Medium | D3.js or tree library |
| 3C | Credit 101 Education | 🔴 High | Low-Medium | Auth + active member check |
| 3D | Budget Tracker + AI Coach | 🔴 High | High | OpenAI API, CSV parsing |
| 4A | Social Feed | 🟡 Medium | Medium | Supabase storage for media |
| 4B | Member Profiles | 🟡 Medium | Medium | Profile pics storage |
| 4C | Private Messaging | 🟡 Medium | Medium-High | Supabase Realtime |
| 4D | Notifications | 🟡 Medium | Medium | Twilio account, service workers |
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
- `credit_points_log` table (user_id, points, reason, quest_id, created_at)
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

## 📅 Suggested Implementation Order

### Now → Next 3 Months
1. ✅ Core portal (subscriptions, payments, admin) — **DONE**
2. ✅ Investment dashboard (manual entry to start) — **DONE**
3. Member onboarding (profile setup wizard, profile pics, birthday)
4. **Meet the Team / Leadership page** (who runs the LLC — roles, bios, org chart)
5. Milestones & perks page (asset threshold tiers, progress tracker)
6. **Credit 101 education hub** (members-only credit improvement modules)
7. Family hierarchy & roles assignment

### 3–6 Months
8. **Quest & task system** (Credit Points, Fidelity cashback quest, gamification)
9. Family tree page
10. **Personal finance & budget tracker** (bank statement import, spending analysis)
11. One-time deposit feature
12. Social feed + admin announcements (with replies & threads)

### 6–12 Months
13. **AI financial coach** (chat assistant connected to budget data — OpenAI)
14. Member profiles with profile pictures
15. Notifications (push first, then Twilio SMS)
16. Events system with RSVPs
17. Family gallery

### 12–24 Months
18. Trust formation (consult attorney)
19. Plaid integration for Fidelity data (if fund size warrants the cost)
20. Family lending program (after legal consultation + $50k milestone)
21. Vacation-style events with deposit system
22. Private messaging

### 24+ Months (As Capital Allows)
23. Life insurance benefit
24. Family vehicle program
25. Family compound research and acquisition

---

## 📝 Living Document

This roadmap is a **living document**. It will be updated as:
- Features are completed
- New ideas emerge
- Legal research provides clarity
- The fund grows and new possibilities open up
- Members provide feedback and suggestions

**Last Updated:** March 8, 2026
**Maintained By:** Justin McNeal (Admin)

---

*"The best time to plant a tree was 20 years ago. The second best time is now." — Chinese Proverb*

*We're planting our tree today. 🌳*
