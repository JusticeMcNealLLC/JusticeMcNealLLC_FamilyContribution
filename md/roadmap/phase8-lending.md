# Phase 8 — Family Lending Program

**Status:** 🔲 Not Started  
**Priority:** Medium  
**Milestone unlock:** 🔒 $50,000 (Mini Bank tier)  
**Goal:** Become the family's own bank — low-interest loans that keep money circulating within the family.

---

## How It Works

- **30% of total LLC funds** available in the lending pool at any given time
- Each member can borrow **up to 30% of their own total contribution amount**
- Interest rate set **below market** (e.g., if banks charge 10–15%, family rate is 4–6%)
- Repayment: monthly payments back to the LLC
- Interest earned → back into the investment fund (**the family profits from its own lending**)

### Example
> Member contributed $5,000 total → eligible to borrow up to $1,500  
> LLC total fund = $50,000 → pool = $15,000 available to lend

---

## Loan Types (Planned)

| Type | Notes |
|------|-------|
| **Personal** | General use — no collateral |
| **Emergency** | Fast-track approval, smaller amounts |
| **Business** | For family members starting a business |
| **Vehicle** | Toward purchasing a personal vehicle |

---

## Features to Build

### Member Side
- [ ] Loan eligibility calculator (based on member's total contributions + CP tier)
- [ ] Loan application form (amount, purpose, requested term)
- [ ] Application status tracker (submitted → under review → approved/denied → active)
- [ ] Repayment dashboard — remaining balance, next payment due, payment history
- [ ] Loan agreement (digital signature before disbursement)

### Admin Side
- [ ] Admin lending dashboard — all active loans, repayment status, pool availability
- [ ] Loan approval / denial workflow with notes
- [ ] Loan agreement generation
- [ ] Automated payment reminders (before due date)
- [ ] Late payment handling (grace period, escalation policy)
- [ ] Loan history per member

### CP Tier Integration (Phase 2B)
| Status | Loan Limit Multiplier | Rate Adjustment |
|--------|-----------------------|----------------|
| 🥉 Bronze | 1× (base 30%) | Standard rate |
| 🥈 Silver | 1.5× | Standard rate |
| 🥇 Gold | 2× | −0.5% rate reduction |
| 💎 Diamond | Max | −1% rate reduction |

---

## Database

```sql
loans (
  id UUID PK,
  member_id UUID → profiles,
  amount_cents INT,
  interest_rate_pct NUMERIC,
  term_months INT,
  purpose TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'active', 'paid_off', 'defaulted')),
  approved_by UUID → profiles,
  disbursed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
)

loan_payments (
  id UUID PK,
  loan_id UUID → loans,
  amount_cents INT,
  payment_date DATE,
  remaining_balance_cents INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)

loan_agreements (
  id UUID PK,
  loan_id UUID → loans,
  agreement_text TEXT,
  member_signed_at TIMESTAMPTZ,
  admin_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

---

## Legal Considerations (To Research)

- [ ] State lending regulations for LLC-to-member loans (Georgia)
- [ ] Required disclosures and documentation
- [ ] Interest rate compliance (usury laws — max legal rate in Georgia)
- [ ] Tax implications of intra-family lending (IRS Applicable Federal Rate requirements)
- [ ] Promissory note templates
- [ ] Whether a lending license is needed (varies by state)
- [ ] Late payment / default handling — legal process
- [ ] Whether repayments are treated as capital contributions or loan payments for tax purposes

---

## Notes

- Interest earned = revenue for the LLC → re-invested into Fidelity
- Keeps money in the family vs. sending it to a bank
- Members with higher CP tiers get better terms → incentivizes engagement
- Document signing: DocuSign or HelloSign when volume justifies it; internal PDF generation at launch
