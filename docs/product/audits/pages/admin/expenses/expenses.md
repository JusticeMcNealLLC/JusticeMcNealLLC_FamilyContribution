# 💸 LLC Expenses Tracker — Admin Page Spec

**Status:** 🔲 Not Started (Planned)  
**Priority:** High — needed before $5k/year revenue milestone  
**Goal:** Track all business expenses for the website LLC (future: JM Family Contribution LLC or similar) for accurate bookkeeping and tax deductions on Schedule C.

---

## Why Track Expenses?

As a single-member LLC, every legitimate business expense reduces taxable income on your Schedule C. Proper expense tracking:

- Maximizes tax deductions
- Keeps you IRS-compliant
- Gives a clear picture of actual profit
- Makes tax season painless
- Protects you in case of audit

---

## Current Known Expenses

| Expense | Monthly | Annual | Category |
|---------|---------|--------|----------|
| GitHub Pages Hosting | $0.00 | $0.00 | Hosting (free tier) |
| Supabase (Free Tier) | $0.00 | $0.00 | Backend/Database |
| Stripe Processing Fees (~2.9% + $0.30/txn) | ~$3.78 | ~$45.36 | Payment Processing |
| Domain (justicemcnealllc.com) | — | ~$12.00 | Domain Registration |
| Copilot / Dev Tools | TBD | TBD | Software & Tools |
| LLC Filing / Registered Agent | — | TBD | Legal & Compliance |
| Future: Supabase Pro Plan | $25.00 | $300.00 | Backend/Database |
| Future: Custom Email (Google Workspace etc.) | ~$7.00 | ~$84.00 | Communication |

> **Note:** Stripe fees are automatically deducted from payouts. Should still be recorded as an expense.

---

## Expense Categories (IRS Schedule C Aligned)

These categories map to Schedule C Part II line items:

| Category | Schedule C Line | Examples |
|----------|-----------------|----------|
| **Advertising** | Line 8 | Social media ads, promotional materials |
| **Commissions & Fees** | Line 10 | Stripe processing fees, platform fees |
| **Contract Labor** | Line 11 | Freelancers, designers, developers |
| **Insurance** | Line 15 | Business liability insurance (future) |
| **Legal & Professional** | Line 17 | Attorney fees, CPA, LLC filing |
| **Office Expenses** | Line 18 | Software subscriptions, dev tools |
| **Rent / Lease** | Line 20b | Server hosting, SaaS subscriptions |
| **Taxes & Licenses** | Line 23 | State LLC annual fees, business licenses |
| **Utilities** | Line 25 | Internet (% used for business) |
| **Other Expenses** | Line 27 | Domain registration, misc |

---

## Admin Page — Feature Requirements

### MVP (Before $5k/year milestone)

- [ ] Expense entry form: date, amount, category, description, receipt upload
- [ ] Monthly expense summary table
- [ ] Running annual total
- [ ] Category breakdown (pie chart or bar chart)
- [ ] Receipt/document storage (Supabase Storage)
- [ ] CSV export for tax prep

### Future Enhancements

- [ ] Recurring expense auto-entries (Stripe fees auto-imported)
- [ ] Receipt OCR (scan & auto-fill amount/vendor)
- [ ] Budget vs. actual comparison
- [ ] Year-over-year expense comparison
- [ ] Integration with Stripe to auto-pull fee data
- [ ] Expense approval workflow (if multi-admin in future)

---

## Database Schema (Proposed)

```sql
CREATE TABLE llc_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  vendor TEXT,
  receipt_url TEXT,
  schedule_c_line TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT, -- 'monthly', 'quarterly', 'annual'
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);
```

---

## Key Rules

1. **Every expense needs a receipt** — even small ones. Upload photo or PDF.
2. **Categorize at entry time** — don't let uncategorized expenses pile up.
3. **Record Stripe fees monthly** — pull from Stripe dashboard or auto-import.
4. **Home office deduction** — if applicable, track square footage and % of home used.
5. **Mileage** — if driving for business purposes, log miles (standard rate: 67¢/mile for 2024, check annually).

---

## References

- `md/llc/profits.md` — Revenue & profit tracking
- `md/llc/tax-prep.md` — Tax preparation & Schedule C filing
- `md/roadmap/index.md` — Roadmap phase for LLC restructuring
- [IRS Schedule C Instructions](https://www.irs.gov/instructions/i1040sc)

---

*Last Updated: March 13, 2026 | Maintained By: Justin McNeal (Admin)*
