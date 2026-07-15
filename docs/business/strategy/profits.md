# 📈 LLC Profits Tracker — Admin Page Spec

**Status:** 🔲 Not Started (Planned)  
**Priority:** High — needed before $5k/year revenue milestone  
**Goal:** Track all revenue streams and calculate net profit for the website LLC to maintain clear financial visibility and accurate tax reporting.

---

## Current Revenue Snapshot

| Metric | Value |
|--------|-------|
| **Current Monthly Revenue** | $120.00 |
| **Current Annual Revenue (projected)** | $1,440.00 |
| **Target Annual Revenue** | $5,000.00 |
| **Target Timeline** | End of 2026 — Early 2027 |
| **Monthly Target to Hit $5k/year** | ~$417/month |
| **Members Needed at $30/month** | ~14 members |

---

## Revenue Sources

### Active

| Source | Type | Current Monthly | Notes |
|--------|------|-----------------|-------|
| Member Subscriptions | Recurring | $120.00 | 4 members × $30/month (estimated) |

### Planned / Future

| Source | Type | Est. Monthly | Timeline |
|--------|------|--------------|----------|
| Additional Members | Recurring | +$30 each | Ongoing recruitment |
| Extra Deposits (one-time) | Variable | Varies | Already built in portal |
| Investment Returns (dividends) | Variable | Varies | As portfolio grows |
| Family Lending Interest | Variable | — | Phase 8 ($50k milestone) |
| Vehicle Usage Fees | Variable | — | Phase 9 ($250k milestone) |
| Rental Income | Variable | — | Phase 10 ($500k milestone) |

---

## Profit Calculation

```
Gross Revenue (all income sources)
  − Stripe Processing Fees
  − Software & Hosting Costs
  − Legal & Compliance Fees
  − Other Business Expenses
  ─────────────────────────
  = Net Profit (Schedule C, Line 31)
```

### Example: Current State

```
Monthly:
  $120.00  Subscription Revenue
  − $3.78  Stripe Fees (~2.9% + $0.30 × 4 txns)
  − $1.00  Domain (amortized monthly)
  ────────
  $115.22  Estimated Net Profit

Annual (projected):
  $1,440.00  Revenue
  − $45.36   Stripe Fees
  − $12.00   Domain
  ──────────
  $1,382.64  Estimated Net Profit
```

---

## Growth Milestones

| Milestone | Annual Revenue | Monthly Needed | What Unlocks |
|-----------|---------------|----------------|--------------|
| 🔲 **$2,500/year** | $2,500 | ~$209/month | Consider upgrading Supabase, basic bookkeeping |
| 🔲 **$5,000/year** | $5,000 | ~$417/month | LLC restructuring finalized, formal tax prep |
| 🔲 **$10,000/year** | $10,000 | ~$834/month | Consider S-Corp election for tax savings |
| 🔲 **$25,000/year** | $25,000 | ~$2,084/month | Hire CPA, quarterly estimated tax payments |
| 🔲 **$50,000/year** | $50,000 | ~$4,167/month | Full business infrastructure, lending program |

> **Important:** At ~$40k+ net self-employment income, electing S-Corp status can save significant self-employment tax. Revisit at that milestone.

---

## Admin Page — Feature Requirements

### MVP (Before $5k/year milestone)

- [ ] Revenue entry form: date, amount, source, description
- [ ] Auto-pull Stripe subscription data (monthly revenue)
- [ ] Monthly revenue summary
- [ ] Running annual revenue total
- [ ] Net profit calculation (revenue − expenses)
- [ ] Revenue by source breakdown (chart)
- [ ] Month-over-month growth chart

### Future Enhancements

- [ ] Auto-import from Stripe API (subscriptions, one-time payments, fees)
- [ ] Profit margin tracking (%)
- [ ] Revenue forecasting based on growth trends
- [ ] Year-over-year comparison
- [ ] Dashboard widget on admin home page
- [ ] Quarterly profit reports (PDF export)
- [ ] Break-even analysis for new expenses

---

## Database Schema (Proposed)

```sql
CREATE TABLE llc_revenue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  source TEXT NOT NULL, -- 'subscription', 'extra_deposit', 'investment_return', 'lending_interest', 'other'
  description TEXT,
  stripe_payment_id TEXT, -- link to Stripe for auto-imported entries
  is_recurring BOOLEAN DEFAULT false,
  member_id UUID REFERENCES auth.users(id), -- if tied to a specific member payment
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- View for quick profit calculation
CREATE VIEW llc_profit_summary AS
SELECT
  DATE_TRUNC('month', r.date) AS month,
  SUM(r.amount) AS total_revenue,
  COALESCE((
    SELECT SUM(e.amount) FROM llc_expenses e
    WHERE DATE_TRUNC('month', e.date) = DATE_TRUNC('month', r.date)
  ), 0) AS total_expenses,
  SUM(r.amount) - COALESCE((
    SELECT SUM(e.amount) FROM llc_expenses e
    WHERE DATE_TRUNC('month', e.date) = DATE_TRUNC('month', r.date)
  ), 0) AS net_profit
FROM llc_revenue r
GROUP BY DATE_TRUNC('month', r.date)
ORDER BY month DESC;
```

---

## Key Metrics to Track

1. **MRR (Monthly Recurring Revenue)** — subscription income per month
2. **Net Profit** — revenue minus all expenses
3. **Profit Margin** — net profit ÷ revenue × 100
4. **Member Growth Rate** — new members per month
5. **Revenue Per Member** — average contribution per member
6. **Runway** — how many months of expenses current profit covers

---

## References

- `md/llc/expenses.md` — Expense tracking
- `md/llc/tax-prep.md` — Tax preparation & Schedule C filing
- `md/roadmap/index.md` — Roadmap phase for LLC restructuring
- `md/systems/memberContributionSystem.md` — How member contributions work

---

*Last Updated: March 13, 2026 | Maintained By: Justin McNeal (Admin)*
