# 🏢 LLC Restructuring Plan — Overview

**Status:** 🔲 Planning Phase  
**Priority:** High — finalize by $5k/year revenue milestone  
**Target:** End of 2026 — Early 2027  
**Goal:** Build a 4-LLC structure with a holding company and three operating subsidiaries, each generating revenue that flows up into the holding entity.

---

## The Big Picture

The long-term plan is **4 LLCs total** — one holding company and three operating businesses. Currently everything runs under Justice McNeal LLC, but as revenue grows each venture needs its own entity for:

- **Liability isolation** — a lawsuit against one business doesn't touch the others
- **Clean bookkeeping** — separate P&L for each business
- **Tax clarity** — dedicated Schedule C per entity (or consolidated under holding)
- **Professional structure** — proper entity for each revenue stream
- **Future scalability** — easier to bring on partners, sell, or restructure individual businesses

---

## The 4-LLC Structure

```
Justice McNeal Holding LLC (Holding Company)
│
├── 1️⃣ [TBD] — Family Contribution Website
│   ├── justicemcnealllc.com (or new domain)
│   ├── Stripe subscriptions (member contributions)
│   ├── Supabase + GitHub
│   └── Dedicated bank account
│
├── 2️⃣ [TBD] — Karry Kraze
│   ├── E-commerce / brand
│   └── Dedicated bank account
│
├── 3️⃣ [TBD] — AI Content Generation
│   ├── AI content services / platform
│   └── Dedicated bank account
│
├── Fidelity Brokerage Account (investments)
├── BlueVine Business Account (holding company funds)
└── Future assets (real estate, vehicles, etc.)
```

> **All revenue from the 3 operating LLCs flows UP into Justice McNeal Holding LLC**, which manages investments, reserves, and distributions.

### Future (with Trust)

```
McNeal Family Trust
    ↓
Justice McNeal Holding LLC
    ├── Family Contribution Website LLC
    ├── Karry Kraze LLC
    ├── AI Content Generation LLC
    ├── Fidelity Brokerage
    ├── Real Estate (Phase 10)
    └── Other entities
```

---

## LLC Names — Status

| # | Business | Name Candidates | Status |
|---|----------|----------------|--------|
| 0 | **Holding Company** | Justice McNeal Holding LLC (rename from Justice McNeal LLC) | 🟡 Rename needed |
| 1 | **Family Contribution Website** | JM Family Contribution LLC, JM Media LLC | 🔲 Pick name |
| 2 | **Karry Kraze** | Karry Kraze LLC, KK Enterprises LLC | 🔲 Pick name |
| 3 | **AI Content Generation** | TBD | 🔲 Pick name |

> **Action items:** Pick names → check availability on Georgia SOS → file.

---

## Current Financial State

| Metric | Value |
|--------|-------|
| Monthly Revenue | $120.00 |
| Annual Revenue (projected) | $1,440.00 |
| Monthly Expenses (estimated) | ~$5 |
| Annual Net Profit (estimated) | ~$1,383 |
| Members | ~4 |
| Revenue Source | Member subscriptions via Stripe |

---

## Steps to Complete

### Phase A — Planning & Research (Now)
- [x] Document the restructuring plan (this file)
- [x] Create expense tracking spec (`md/llc/expenses.md`)
- [x] Create profit tracking spec (`md/llc/profits.md`)
- [x] Create tax prep spec (`md/llc/tax-prep.md`)
- [ ] Decide on LLC name
- [ ] Check name availability (Georgia Secretary of State)
- [ ] Research filing requirements & costs

### Phase B — Formation ($2,500/year trigger or ready)
- [ ] File Articles of Organization with Georgia SOS
- [ ] Obtain EIN from IRS (free, online)
- [ ] Draft Operating Agreement (single-member)
- [ ] Open dedicated business bank account
- [ ] Set up new Stripe account (or transfer existing)
- [ ] Update domain registration to new LLC

### Phase C — Financial Systems ($5k/year trigger)
- [ ] Build admin Expenses page
- [ ] Build admin Profits page
- [ ] Build admin Tax Prep page
- [ ] Migrate Stripe subscription to new LLC's account
- [ ] Set up bookkeeping system (or spreadsheet MVP)
- [ ] Establish quarterly estimated tax payment schedule

### Phase D — Ongoing Operations
- [ ] Monthly: Record all revenue and expenses
- [ ] Quarterly: Review profit, pay estimated taxes
- [ ] Annually: File Schedule C, renew LLC, review structure
- [ ] Review: Evaluate S-Corp election at $40k+ net profit

---

## How Money Will Flow (After Restructuring)

```
┌──────────────────────────────────────────────────────┐
│  Family Contribution   Karry Kraze   AI Content  │
│  (Subscriptions)       (Sales)       (Services)  │
└────────┬────────────┬────────────┬────────────┘
         │            │            │
         ↓            ↓            ↓
    Each LLC keeps operating expenses + tax reserve
         │            │            │
         └────────────┼────────────┘
                      │
                      ↓
     Justice McNeal Holding LLC
     (BlueVine Business Account)
                      │
         ┌────────────┼────────────┐
         ↓            ↓            ↓
    Fidelity       Reserves     Future
    Investments    & Savings    Ventures
```

---

## Estimated Filing Costs

### Per LLC

| Item | Cost | Frequency |
|------|------|-----------|
| Georgia LLC Formation | ~$100 | One-time |
| Registered Agent (if using service) | $0–$125/year | Annual |
| EIN | Free | One-time |
| Business Bank Account | $0 (BlueVine) | — |
| Operating Agreement (DIY) | $0 | One-time |
| GA Annual Registration | ~$50 | Annual |

### Total for All 4 LLCs

| Item | Cost |
|------|------|
| Formation (3 new LLCs + rename 1) | ~$300–$400 |
| Annual registrations (4 × $50) | ~$200/year |
| EINs (3 new) | Free |
| Bank accounts (3 new) | Free |
| **Total startup** | **~$300–$525** |
| **Annual maintenance** | **~$200/year** |

> **Note:** Justice McNeal LLC already exists — it just needs to be renamed to Justice McNeal Holding LLC (amendment filing, ~$50).

---

## Admin Pages to Build

Four new admin pages needed under `/admin/` for **this LLC only** (Family Contribution website). Each other LLC will have its own website with its own admin pages.

| Page | File | Purpose |
|------|------|---------|
| **Expenses** | `admin/expenses.html` | Track & categorize all business expenses |
| **Profits** | `admin/profits.html` | Revenue tracking, profit calculation, growth charts |
| **Tax Prep** | `admin/tax-prep.html` | Schedule C summary, SE tax calc, filing checklist |
| **Documents** | `admin/documents.html` | Secure vault for legal/business docs, signed share links |

Each page will need:
- Corresponding JS file in `js/admin/`
- Supabase tables for data storage
- Admin-only access (existing auth system)
- Chart.js visualizations

See also: `md/llc/documents.md` — Admin Documents Vault spec

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-13 | Documented restructuring plan | Needed to formalize the LLC separation plan |
| 2026-03-13 | Target $5k/year for finalization | Enough revenue to justify formal structure |
| 2026-03-13 | Confirmed 4-LLC structure | Holding + 3 operating (website, Karry Kraze, AI content) |
| 2026-03-13 | Holding company rename planned | Justice McNeal LLC → Justice McNeal Holding LLC |
| TBD | LLC name selection (3 operating) | — |
| TBD | Formation filings | — |

---

## References

- `md/llc/expenses.md` — Expense tracking spec
- `md/llc/profits.md` — Profit tracking spec
- `md/llc/tax-prep.md` — Tax preparation spec
- `md/roadmap/phase7-trust-legal.md` — Trust formation (future, after LLC restructuring)
- `md/wealth/foundation.md` — Overall wealth strategy

---

*Last Updated: March 13, 2026 | Maintained By: Justin McNeal (Admin)*
