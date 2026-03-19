# 🧾 LLC Tax Preparation — Admin Page Spec

**Status:** 🔲 Not Started (Planned)  
**Priority:** High — needed before $5k/year revenue milestone  
**Goal:** Streamline annual tax filing for the website LLC as a single-member LLC, ensuring all Schedule C data is organized and ready for filing.

---

## Tax Structure Overview

| Detail | Value |
|--------|-------|
| **Entity Type** | Single-Member LLC (SMLLC) |
| **Owner** | Justin McNeal |
| **Tax Treatment** | Disregarded entity — reported on personal return |
| **Tax Form** | IRS Schedule C (Form 1040) |
| **Self-Employment Tax** | Schedule SE (15.3% on net profit) |
| **State** | Georgia |
| **Fiscal Year** | Calendar Year (Jan 1 — Dec 31) |

> **Single-member LLC = Schedule C.** The LLC itself doesn't file a separate return. All income and expenses flow through to your personal Form 1040 via Schedule C.

---

## Schedule C Quick Reference

### Part I — Income (Lines 1–7)

| Line | Description | Source |
|------|-------------|--------|
| Line 1 | Gross receipts/sales | Total revenue from `llc_revenue` table |
| Line 4 | Cost of goods sold | N/A (service-based) |
| Line 7 | **Gross income** | Line 1 (same as gross receipts for service business) |

### Part II — Expenses (Lines 8–27)

| Line | Category | Your Likely Expenses |
|------|----------|---------------------|
| 8 | Advertising | Social media ads, promotional costs |
| 10 | Commissions & fees | Stripe processing fees |
| 11 | Contract labor | Freelance developers, designers |
| 15 | Insurance | Business liability (future) |
| 17 | Legal & professional | Attorney, CPA, LLC filing fees |
| 18 | Office expense | Software subscriptions, dev tools |
| 20b | Rent (other) | Hosting, SaaS services |
| 23 | Taxes & licenses | GA LLC annual registration, business license |
| 25 | Utilities | Internet (business % only) |
| 27 | Other expenses | Domain, miscellaneous |

### Part III — Cost of Goods Sold
Not applicable — this is a service/platform business.

### Part IV — Vehicle
Only if using personal vehicle for business. Track mileage if applicable.

### Part V — Other Expenses (Line 48)
Itemize anything that doesn't fit standard categories.

**Line 31 = Net Profit (or Loss)** → flows to Form 1040 Line 8 and Schedule SE.

---

## Self-Employment Tax (Schedule SE)

As a single-member LLC, you owe self-employment tax on net profit:

```
Net Profit (Schedule C, Line 31)
  × 92.35% (adjustment factor)
  × 15.3% (12.4% Social Security + 2.9% Medicare)
  = Self-Employment Tax

Deduction: You can deduct 50% of SE tax on Form 1040.
```

### Example at Current Revenue ($1,440/year)

```
$1,383 net profit (after expenses)
× 0.9235 = $1,277
× 0.153  = $195.39 self-employment tax
```

### Example at $5,000/year Target

```
~$4,500 net profit (estimated after expenses)
× 0.9235 = $4,156
× 0.153  = $635.82 self-employment tax
```

> **Tip:** At $5k/year, consider making quarterly estimated tax payments to avoid underpayment penalties.

---

## Georgia State Taxes

| Item | Details |
|------|---------|
| GA Income Tax | 1%–5.49% (2026 rates — check annually) |
| GA LLC Annual Registration | ~$50/year |
| GA Business License | Varies by county/city |
| Local Business Tax | Check county requirements |

> Georgia follows federal treatment for SMLLCs — no separate state LLC return needed. Income flows through to GA Form 500 personal return.

---

## Tax Calendar — Key Dates

| Date | Action | Notes |
|------|--------|-------|
| **Jan 31** | Issue 1099s (if applicable) | If you paid any contractor $600+ |
| **Mar 15** | N/A for SMLLC | (This is for partnerships/S-corps) |
| **Apr 15** | File Form 1040 + Schedule C | Or file extension (Form 4868) |
| **Apr 15** | Q1 estimated tax payment | If making quarterly payments |
| **Jun 15** | Q2 estimated tax payment | |
| **Sep 15** | Q3 estimated tax payment | |
| **Oct 15** | Extended return due | If extension was filed |
| **Jan 15 (next year)** | Q4 estimated tax payment | |

---

## Admin Page — Feature Requirements

### MVP (Before $5k/year milestone)

- [ ] Annual tax summary dashboard (revenue, expenses, net profit)
- [ ] Schedule C line-item breakdown (auto-mapped from expense categories)
- [ ] Estimated self-employment tax calculator
- [ ] Quarterly estimated tax payment tracker
- [ ] Tax document checklist (what's needed for filing)
- [ ] Export: Schedule C data as CSV or PDF

### Future Enhancements

- [ ] Auto-generate draft Schedule C from recorded data
- [ ] Estimated tax payment reminders (push notifications)
- [ ] Multi-year tax history comparison
- [ ] Deduction optimizer (suggest commonly missed deductions)
- [ ] CPA sharing link (read-only export for accountant)
- [ ] Integration with tax software (TurboTax, FreeTaxUSA export format)
- [ ] State tax summary (Georgia Form 500 data)

---

## Tax Prep Checklist (Annual)

Use this checklist each tax season:

### Income Documentation
- [ ] Total Stripe payouts for the year (download from Stripe dashboard)
- [ ] 1099-K from Stripe (if over $600 threshold)
- [ ] Any other income sources documented
- [ ] Revenue reconciliation (portal data matches bank deposits)

### Expense Documentation
- [ ] All receipts uploaded and categorized
- [ ] Stripe fee total for the year
- [ ] Software/subscription costs documented
- [ ] Domain renewal receipt
- [ ] LLC registration/filing fees
- [ ] Any contractor payments (need their W-9 for 1099 filing)
- [ ] Home office calculation (if claiming)
- [ ] Internet bill (calculate business %)
- [ ] Mileage log (if applicable)

### Filing
- [ ] Calculate net profit (revenue − expenses)
- [ ] Calculate self-employment tax
- [ ] Determine if quarterly estimated payments are needed
- [ ] File Schedule C with Form 1040
- [ ] File Schedule SE
- [ ] File Georgia Form 500
- [ ] Pay any balance due
- [ ] Save copies of everything (digital + backup)

---

## When to Level Up

| Revenue Level | Tax Action |
|---------------|------------|
| **Under $5k/year** | DIY with TurboTax or FreeTaxUSA, basic Schedule C |
| **$5k–$10k/year** | Consider CPA review, start quarterly payments |
| **$10k–$40k/year** | Hire a CPA, maximize deductions |
| **$40k+/year** | Evaluate S-Corp election to save on SE tax |
| **$100k+/year** | Full tax strategy, retirement accounts (SEP IRA / Solo 401k) |

---

## Important Notes

1. **Keep records for 7 years** — IRS can audit up to 3 years back (6 if >25% underreported).
2. **Separate bank account** — The website LLC should have its own bank account (BlueVine or similar).
3. **Don't commingle funds** — Keep personal and business finances separate.
4. **EIN** — The new LLC will need its own EIN (free from IRS).
5. **Reasonable expenses only** — Only deduct expenses with a legitimate business purpose.

---

## References

- `md/llc/expenses.md` — Expense tracking & categories
- `md/llc/profits.md` — Revenue & profit tracking
- `md/llc/overview.md` — LLC restructuring plan
- `md/roadmap/index.md` — Roadmap phase for LLC restructuring
- [IRS Schedule C Instructions](https://www.irs.gov/instructions/i1040sc)
- [IRS Schedule SE Instructions](https://www.irs.gov/instructions/i1040sse)
- [IRS Estimated Tax Payments](https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes)

---

*Last Updated: March 13, 2026 | Maintained By: Justin McNeal (Admin)*
