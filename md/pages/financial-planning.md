# 💳 Financial Planning Page — Feature Specification

> **Vision:** A private, per-member financial dashboard where members can upload bank statements, see their spending broken down by category, track what's coming in vs going out, identify areas to cut, and find opportunities to contribute more to the LLC — whether through cutting subscriptions, reducing excess spending, or redirecting cashback from the Fidelity rewards card.

---

## Overview

This page is not about the LLC's money — it's about **each member's personal finances**.

The goal is to help members:
- Understand exactly where their money is going
- Identify real opportunities to cut waste
- See how small changes could increase their LLC contribution
- Get a nudge toward the Fidelity 2% cashback setup
- Keep a running history of their financial picture over time

Everything on this page is **private to the individual member**. Admins do not see other members' bank data.

---

## Core Feature: Bank Statement Upload + Analysis

### How It Works

1. Member uploads a bank statement (PDF or CSV)
2. The system parses the file and extracts transactions
3. Transactions are automatically categorized
4. Member sees a breakdown of spending by category
5. Each category expands to show individual line items
6. Data is saved to the member's profile for future reference
7. Multiple accounts can be added and tracked separately

---

## Multi-Account Support

Members can have multiple bank accounts linked/uploaded — each tracked separately.

| Feature | Detail |
|---|---|
| **Per-account separation** | Chase account and Bank of America account show as separate "wallets" |
| **Account labeling** | Member names each account (e.g., "Chase Checking", "BofA Savings") |
| **Statement history per account** | Each account shows a list of past uploads by month/date |
| **Cross-account summary** | Optional combined view showing totals across all accounts |
| **Account type tags** | Checking, Savings, Credit Card — helps categorize inflows vs outflows correctly |

---

## Spending Categories

Transactions are automatically sorted into categories. Member can re-categorize any item manually.

| Category | Examples |
|---|---|
| 🏠 Housing | Rent, mortgage, renters insurance |
| 🛒 Groceries | Supermarkets, grocery delivery |
| 🍽️ Dining | Restaurants, fast food, coffee shops |
| 🚗 Transportation | Gas, car payment, rideshare, parking, tolls |
| 🎬 Entertainment | Streaming, movies, events, hobbies |
| 📱 Subscriptions | Netflix, Spotify, gym, apps, software |
| 🛍️ Shopping | Retail, Amazon, clothing, general purchases |
| 💊 Health | Pharmacy, doctor, gym, insurance |
| 📚 Education | Courses, books, certifications |
| 💼 Business | Work-related expenses |
| 💸 LLC Contribution | Stripe payment to Justice McNeal LLC |
| 💰 Savings / Transfers | Transfers to savings, investment accounts |
| 🔁 Other | Uncategorized or misc |

---

## Statement View — What the Member Sees

### Per-Statement Summary Card

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CHASE CHECKING — February 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💵 Income / Inflows:        $3,240.00
  💸 Total Spending:          $2,890.44
  📉 Net:                     +$349.56
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 Breakdown by Category:

  🍽️ Dining             $312.00    (11%)
  🛒 Groceries          $280.00    (10%)
  🚗 Transportation     $230.00     (8%)
  📱 Subscriptions      $145.00     (5%)
  🛍️ Shopping           $427.00    (15%)
  🏠 Housing          $1,200.00    (41%)
  🔁 Other              $296.44    (10%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💳 LLC Contribution:   $30.00 ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Category Drill-Down

Tapping any category expands to show individual transactions:

```
📱 Subscriptions — $145.00
─────────────────────────────
  Feb 3   Netflix              $15.49
  Feb 3   Spotify              $10.99
  Feb 5   Hulu                 $17.99
  Feb 7   Planet Fitness       $25.00
  Feb 10  Adobe Creative       $54.99
  Feb 15  ChatGPT Plus         $20.00
─────────────────────────────
  Total: $144.46
```

---

## Savings Intelligence Panel

After the statement is analyzed, the page surfaces a **"Ways to Save"** insight panel.

### What It Shows

**Subscription Audit**
> "You're spending $144/month on subscriptions. That's $1,728/year. Consider reviewing: Adobe Creative ($54.99), Hulu ($17.99). Cutting 2 subscriptions could free up $70+/month."

**Dining vs Groceries Ratio**
> "You spent $312 dining out vs $280 on groceries. Shifting even $100 from dining to groceries could save ~$80/month."

**Cashback Opportunity** *(see below)*
> "If you used the Fidelity 2% card for your $850 in eligible monthly purchases, you'd earn ~$17/month in cashback automatically directed to the LLC fund."

**Contribution Opportunity**
> "Your net this month was +$349. After your $30 LLC contribution, you still had $319 left over. Consider a one-time deposit to the LLC."

**Excess Identification**
> "Your Shopping category is your highest non-fixed expense at $427. This is above your 3-month average of $290."

---

## Cashback Opportunity Feature

### The Concept

If a member gets the **Fidelity Rewards Visa** and sets the LLC Fidelity account as the cashback destination, every purchase they make becomes a passive contribution to the family fund.

### How the Page Surfaces This

After analyzing a statement:
- The page calculates how much of their spending is on **eligible categories** for cashback
- Shows estimated monthly and yearly cashback earnings at 2%
- Shows a callout if they haven't set up the Fidelity card yet

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💳 Fidelity 2% Cashback Opportunity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Eligible spending this month:  $1,420
  Estimated cashback @ 2%:       $28.40 / month
  Projected yearly:              $340.80 / year

  → If all 4 members did this, the LLC could
    gain ~$1,363/year in extra contributions
    from cashback alone.

  [Learn how to set up the Fidelity card →]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Statement History & Progress Tracking

Each member has a running history of all uploaded statements.

### Per Account History View

```
CHASE CHECKING
─────────────────────────────────────────
  March 2026       Uploaded ✅   View
  February 2026    Uploaded ✅   View
  January 2026     Uploaded ✅   View
  December 2025    Uploaded ✅   View
─────────────────────────────────────────
  [+ Upload New Statement]
```

### Trend Charts

Over time, the page builds trend views:
- Monthly spending by category (bar chart)
- Income vs spending over time (line chart)
- Subscription cost over time
- LLC contribution history (links to existing Stripe data)
- Month-over-month spending delta (are you improving?)

---

## Privacy Model

| Who can see | What |
|---|---|
| **The member** | All of their own statements, breakdowns, trends |
| **Admin** | Nothing — member financial data is completely private |
| **Other members** | Nothing |

Bank statement data is personal. It lives only on the member's account and is never accessible to anyone else in the portal.

---

## How Statement Parsing Works (Technical)

### File Types Supported
- **CSV** — fully supported; auto-detects header row and column formats from various banks (Delta Community Credit Union, Chase, etc.)
- **PDF** — planned for Phase 3

### Parsing Approach
- CSV parsing: auto-detects header row (scans first 10 lines for date/description/amount columns), handles quoted fields with embedded commas
- Generic bank description detection: identifies useless descriptions like "ACH Withdrawal", "Check Card Purchase", "Online Transfer" and prioritizes the Memo column instead
- Multi-month support: a single CSV spanning multiple months is automatically split into separate per-month statements
- Description cleaner (`finCleanDescription`): transforms raw bank noise into clean, readable text:
  - `"Journal Voucher ZELLE YOLANDA MCNEAL 800-544-3328 ZTID#607400N07OJ0"` → **Zelle · Yolanda McNeal**
  - `"CASH APP *SMOJO*ADD CASH Oakland CA Date 02/24/26..."` → **Cash App · Smojo**
  - `"OPENAI OPENAI.COM CA Date 03/15/26 24492166..."` → **OpenAI**
  - `"APPLE CASH INST XFER CUPERTINO CA Card 8281"` → **Apple Cash · Received**
  - `"To Loan 0090"` → **Payment to Loan 0090**
  - `"From Share 0000"` → **Transfer from Savings 0000**
  - `"AMAZON.CWPYLZKDC"` (deposit) → **Amazon · Seller Payout**
  - Strips dates, card numbers, phone numbers, tracking IDs, state codes, duplicate domains
- Amount-aware categorization: same merchant categorized differently based on money direction (e.g., Amazon deposit = Income, Amazon purchase = Shopping; eBay deposit = Income, eBay fee = Business; KarryKraze deposit = Income)
- Custom rules engine: members create personal rules that override defaults (e.g., "zelle yolanda" → Housing). Rules persist in the database and run before built-in merchant matching
- Normalized matching: rule matching strips separators (·, -, /) so rules work across cleaned and raw descriptions

### Data Storage (Supabase)
```sql
-- Linked bank accounts per member
CREATE TABLE member_accounts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID REFERENCES profiles(id),
    label        TEXT NOT NULL,              -- "Free Checking ****702"
    account_type TEXT DEFAULT 'checking',    -- 'checking' | 'savings' | 'credit'
    institution  TEXT,                       -- "Delta Community Credit Union"
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded bank statements (one per account per month)
CREATE TABLE member_statements (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id           UUID REFERENCES member_accounts(id) ON DELETE CASCADE,
    user_id              UUID REFERENCES profiles(id),
    statement_month      DATE NOT NULL,      -- first of month, e.g. 2026-03-01
    file_url             TEXT,               -- Supabase Storage URL
    original_filename    TEXT,
    parsed               BOOLEAN DEFAULT FALSE,
    total_inflow_cents   INT DEFAULT 0,
    total_outflow_cents  INT DEFAULT 0,
    net_cents            INT DEFAULT 0,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, statement_month)
);

-- Individual transactions from parsed statements
CREATE TABLE member_transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id     UUID REFERENCES member_statements(id) ON DELETE CASCADE,
    user_id          UUID REFERENCES profiles(id),
    transaction_date DATE NOT NULL,
    description      TEXT NOT NULL,          -- cleaned by finCleanDescription
    amount_cents     INT NOT NULL,           -- negative = outflow, positive = inflow
    category         TEXT,                   -- auto-assigned, editable by member
    notes            TEXT,                   -- optional member notes
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Cashback estimates per statement
CREATE TABLE member_cashback_estimates (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id             UUID REFERENCES member_statements(id) ON DELETE CASCADE,
    user_id                  UUID REFERENCES profiles(id),
    eligible_spend_cents     INT DEFAULT 0,
    estimated_cashback_cents INT DEFAULT 0,  -- eligible_spend * 0.02
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(statement_id)
);

-- Custom categorization rules per member
CREATE TABLE member_category_rules (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES profiles(id),
    match_text TEXT NOT NULL,                -- case-insensitive substring match
    category   TEXT NOT NULL,                -- target category key
    label      TEXT,                         -- optional display label
    priority   INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, match_text)
);
```

All tables enforce Row-Level Security — only the owning member can read/write their own data. Explicit GRANTs ensure the `authenticated` role has full CRUD access through RLS policies.

---

## Implementation Phases

### Phase 1 — CSV Upload + Dashboard ✅ COMPLETE
- [x] Member account setup (add/edit/delete accounts with label, institution, type)
- [x] Multi-account tabs with "All Accounts" combined view
- [x] CSV upload with drag-and-drop + progress bar
- [x] Auto-detect CSV header row and columns (flexible for various bank formats)
- [x] Generic bank description detection (prefers Memo over useless descriptions)
- [x] Multi-month CSV auto-split (single file → separate monthly statements)
- [x] Smart description cleaner (strips bank noise, normalizes brand names)
- [x] Transaction categorization (14 categories, rule-based, amount-aware)
- [x] Amount-aware categorization (Amazon/eBay/KarryKraze deposits = Income)
- [x] Per-statement summary (income, spending, net, LLC contribution)
- [x] Doughnut chart — spending breakdown by category (Chart.js)
- [x] Category list with percentages and progress bars
- [x] Category drill-down — click category to filter transaction list
- [x] Transaction list with colored emoji circles + category labels
- [x] Transaction editing (description, category, notes)
- [x] "Always categorize this way" — creates custom rule from transaction edit
- [x] Custom rules management (add/edit/delete rules, priority ordering)
- [x] Rules auto-recategorize existing matching transactions
- [x] Post-upload review banner for uncategorized ("Other") transactions
- [x] Date range filters (Last 30 Days, Last 3 Months, Last 12 Months, All Time)
- [x] Monthly trend bar chart (income vs spending, Chart.js)
- [x] Statement history with view/delete per statement
- [x] File storage in Supabase Storage (private per user)
- [x] Centralized auth refresh (`finEnsureAuth`) for all write operations
- [x] RLS + explicit GRANTs on all finance tables
- [x] Privacy notice on page — "Your data is 100% private"
- [x] Service worker caching (stale-while-revalidate)
- [x] Navigation integrated (desktop More dropdown + mobile drawer)

### Phase 2 — Insights Panel
- [x] Subscription audit surfaced automatically (recurring detection, monthly cost, per-service breakdown)
- [x] Cashback opportunity estimate shown (2% and 5% tiers on eligible spending)
- [x] Income vs spending net summary (savings rate calculation, contextual advice)
- [x] One-time deposit prompt based on net surplus (10% suggestion with link to contribute)
- [x] "Ways to Save" intelligence panel (dining/grocery ratio, high subs alert, top splurge, transfer awareness)

### Phase 3 — PDF Support
- [ ] PDF statement parsing (pdf.js text extraction)
- [ ] Merchant name recognition improvements
- [ ] Manual re-categorization improvements

### Phase 4 — Trends & History (partially complete)
- [x] Monthly trend bar chart (income vs spending)
- [ ] Subscription cost over time
- [ ] Income vs spending line chart
- [ ] Month-over-month delta
- [ ] Spending by category over time (stacked bar)

### Phase 5 — Goals & Coaching
- [ ] Set a personal budget target per category
- [ ] Track progress toward target each month
- [ ] "You're over budget in Dining" alert system
- [ ] AI-powered savings suggestions (future)

---

## Page Design Notes

- Lives at `portal/my-finances.html`
- Uses the same PageShell nav system as other portal pages
- Mobile-first: statement cards are collapsible/scrollable on mobile
- Account tabs across the top with "All Accounts" combined view
- All uploads go to Supabase Storage (RLS enforced — private per user)
- Charts use Chart.js CDN (doughnut for categories, bar for trends)
- 14 spending categories with consistent color coding across all views
- Transaction rows: colored circle background (category color at 20% opacity) + emoji + category label text
- Custom rules: case-insensitive normalized matching, runs before built-in merchant rules
- Insights Panel: auto-generated cards analyzing current transaction set — subscription audit, cashback estimate, net summary with savings rate, surplus deposit prompt, Ways to Save tips
- Insights use color-coded cards (purple=subscriptions, emerald=cashback/positive, red=negative, amber=tips, brand=deposit prompt)

---

**Last Updated:** March 20, 2026
**Status:** ✅ Phase 1 & 2 Complete — Phase 3 Next
