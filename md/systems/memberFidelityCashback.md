# 💳 Fidelity Cashback System — Integration Strategy

> **The idea:** Family members open a Fidelity account, apply for the Fidelity Rewards Visa, use it for normal purchases, and direct 2% cashback straight into the LLC's Fidelity investment account — creating a passive, automated revenue stream for the family fund that requires no extra effort from anyone.

---

## Why This Is a Good Idea

- **2% cashback** when redeemed into an eligible Fidelity account
- Members are already spending money on bills and purchases every month
- The cashback costs no one anything extra — it's money being left on the table otherwise
- If all 4 members participate, it compounds into meaningful LLC income over time

### Potential Impact at 4 Members

If each member runs $1,000–$1,500/month of normal spending through the card:

| Spend/Month (per person) | Cashback/Month | Yearly (4 people) |
|---|---|---|
| $500 | $10 | $480 |
| $1,000 | $20 | $960 |
| $1,500 | $30 | $1,440 |
| $2,000 | $40 | $1,920 |

**At $1,000/month per member → ~$80/month or $960/year extra into the LLC fund.**

This is on top of the regular $120/month in contributions — with zero additional out-of-pocket.

---

## The Problem: It Bypasses Stripe

The current portal tracks contributions **through Stripe**. Every member's monthly contribution, one-time deposit, and payment history flows through Stripe → BlueVine → Fidelity.

Cashback from the Fidelity card goes **directly into the Fidelity account** — it never touches Stripe.

This creates a real tracking gap:

| Issue | Impact |
|---|---|
| No Stripe record of the cashback | Portal can't auto-attribute it to a member |
| No way to tell who contributed how much | Credit Points / contribution tracking breaks |
| Cashback shows up as generic deposit in Fidelity | No member-level visibility |
| Can't award CP for cashback participation | Members lose gamification incentive |
| Admin has no breakdown | Hard to reconcile where fund growth came from |

---

## Options for Making It Work

---

### Option A — Manual Monthly Declaration (Simplest)

Each month, members manually report how much cashback they redirected to the LLC Fidelity account.

**How it works:**
- Member redeems Fidelity cashback into the LLC account
- Member goes to the portal → logs a "Cashback Contribution" with amount
- Admin verifies against Fidelity statement
- Portal attributes it to the member and awards CP

**Pros:**
- No technical integration required
- Works immediately
- Members stay in control

**Cons:**
- Relies on members remembering to log it
- Requires admin to verify each entry
- No automation — manual forever

**Best for:**
> Early-stage, before any automated system is built. Simple but workable.

---

### Option B — One-Time Deposit via Portal (Already Exists)

The portal already has a **one-time deposit** feature via Stripe.

Members can:
1. Redeem Fidelity cashback to their personal bank account instead of the LLC
2. Use that cash to make a one-time deposit in the portal (via Stripe)
3. Portal attributes it to their account → triggers CP, shows in history

**How it flows:**
```
Fidelity Card Purchase
       ↓
Cashback accumulated in Fidelity personal account
       ↓
Member redeems cashback → personal bank account
       ↓
Member opens portal → "One-Time Deposit"
       ↓
Stripe processes it → BlueVine → LLC Fund
       ↓
Portal attributes contribution → member gets credit + CP
```

**Pros:**
- Works with existing Stripe system
- Full tracking, CP, history, attribution
- No admin verification needed
- No new systems to build

**Cons:**
- Not automatic — member has to actively do this each month
- Extra step (redeem → bank → portal)
- If member forgets, cashback just sits personally
- Not the "automatic → LLC Fidelity direct" flow

**Best for:**
> Members who want cashback to count toward their tracked contributions without waiting for a technical solution.

---

### Option C — Put Monthly Contribution on the Fidelity Card

Instead of directly paying Stripe from a bank account, members put their monthly LLC contribution on the Fidelity card.

**How it flows:**
```
Member gets Fidelity Rewards Visa
       ↓
Member charges monthly Stripe contribution to the Fidelity card
       ↓
Stripe processes payment normally → LLC account (tracked ✅)
       ↓
Fidelity card earns 2% cashback on the $30+ contribution
       ↓
That cashback is directed to LLC Fidelity account
```

**Result:**
- Stripe tracks the contribution normally ✅
- CP and contribution history work normally ✅
- The cashback from the $30 goes to the fund too
- On $30/month: ~$0.60/month per person = $7.20/year per person (small but automatic)
- If members put ALL their normal bills on the card: much bigger impact

**Pros:**
- Totally compatible with existing tracking
- Zero system changes needed
- CP and history work immediately
- The cashback on the contribution itself is a bonus

**Cons:**
- Cashback on just $30/month is minimal (~$7/year per person)
- Real impact only comes if member uses card for most spending

**Best for:**
> The path of least resistance. Every member should do this immediately.

---

### Option D — Admin Adds Cashback as Manual Attribution (Medium Term)

Admin can add a **"cashback contribution"** entry to a member's account directly from the admin dashboard.

**How it works:**
- Admin sees Fidelity statement each month
- Fidelity shows gross cashback deposits by account (all lumped together currently)
- Admin knows which members are participating via a separate tracking sheet
- Admin manually attributes cashback amounts to each member in the portal
- Members get CP for it, it shows in their history

**What we'd need to build:**
- Admin ability to post a manual attribution to any member's contribution record
- A "contribution type" tag: `stripe_monthly`, `stripe_one_time`, `cashback`, `windfall`, etc.
- Admin dashboard cashback reconciliation view

**Pros:**
- Keeps portal tracking clean
- Members can see their cashback credited
- CP system still works

**Cons:**
- Manual admin work every month
- Requires discipline from admin
- Still no automation

**Best for:**
> Medium-term while building toward a more automated approach.

---

### Option E — Fidelity API Integration (Long-Term, Technical)

Fidelity does not have a public open banking API for personal accounts. However, there are paths to institutional-level data access or third-party integrations.

**Possible approaches:**
- **Plaid** — aggregates bank/brokerage data; Fidelity is supported. Could read cashback deposits into the LLC account and match them to member accounts.
- **Fidelity Institutional API** — for RIA/institutional clients, Fidelity has data integrations. Out of scope for our setup.
- **Email/webhook trigger** — if Fidelity sends email confirmation of deposits, a service could parse that and post to the portal automatically.

**Reality check:**
- Plaid integration would require building an admin consent/linking flow for the LLC Fidelity account
- Complex to implement securely
- Fidelity's cashback deposits don't contain member-level metadata — we still have the attribution problem

**Verdict:** This is a nice future idea but not practical at our current scale or tech budget.

---

## Recommended Path (By Phase)

### Right Now — Do These Immediately
1. **Every member uses the Fidelity card for their Stripe contribution** — costs nothing, earns cashback automatically → Option C
2. **Members redirect cashback from other spending to their bank → portal one-time deposit** → Option B when they accumulate cashback

### Near Term (Next 3–6 Months)
3. **Build manual cashback attribution into admin dashboard** → Option D
4. **Add "cashback contribution" as a contribution type** in the portal's history and CP system
5. **Surface cashback opportunity on financial planning page** (see `md/pages/financial-planning.md`)

### Later
6. **Explore Plaid or data aggregation** if the fund is large enough that accurate automated tracking becomes important

---

## Cashback Card Setup Guide (For Members)

> This is what each member needs to do to participate.

**Step 1:** Open a personal Fidelity brokerage account (free, takes ~10 minutes at fidelity.com)

**Step 2:** Apply for the Fidelity Rewards Visa (issued by Elan Financial Services / US Bank)

**Step 3:** Once approved, in the card's rewards settings, select an eligible Fidelity account as the cashback destination

**Step 4:** For the cashback destination, choose either:
- Option A: Your **personal** Fidelity account → you collect rewards yourself and manually deposit to LLC via portal
- Option B: The **LLC's** Fidelity account → automatically goes to the fund (preferable, but only if the card allows it)

> ⚠️ **Important:** Fidelity lets you designate eligible Fidelity accounts for cashback deposits. Whether the LLC's Fidelity account qualifies as an eligible destination needs to be confirmed directly with Fidelity, since it's a business/trust account, not a personal account.

**Step 5:** Use the card for:
- Monthly Stripe LLC contribution
- Bills (utilities, subscriptions, phone)
- Groceries, gas, everyday purchases
- Anything you'd normally pay with debit

**Step 6:** Check cashback balance monthly → log in the portal or make a one-time deposit

---

## Tracking System We Need to Build

To make cashback trackable in the portal:

| Feature | What It Does |
|---|---|
| `contribution_type` field on contributions | Tag each contribution: `stripe_monthly`, `stripe_one_time`, `cashback`, `windfall` |
| Admin manual attribution tool | Let admin post a cashback amount to any member's record |
| Member self-report flow | Let members submit a cashback log with amount + date |
| Admin verification toggle | Admin marks submitted cashback as verified after checking Fidelity |
| CP for cashback participation | Award CP when cashback is verified (separate from standard contribution CP) |
| Cashback leaderboard | Optional: show which members are contributing cashback (gamification) |
| Financial planning page integration | Surface each member's cashback opportunity based on their statement (see financial-planning.md) |

---

## Database Changes Needed

```sql
-- Add contribution type to existing one-time deposits or create a cashback log
CREATE TABLE member_cashback_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES profiles(id),
    amount_cents    INT NOT NULL,
    reported_at     TIMESTAMPTZ DEFAULT NOW(),
    period_month    DATE,                       -- which month's cashback this covers
    verified        BOOLEAN DEFAULT FALSE,
    verified_by     UUID REFERENCES profiles(id) NULL,
    verified_at     TIMESTAMPTZ,
    notes           TEXT,
    deposited_to    TEXT DEFAULT 'llc_fidelity'  -- 'llc_fidelity' | 'portal_one_time'
);
```

Also add `contribution_type` to the existing contributions/payments table:
```sql
ALTER TABLE payments ADD COLUMN contribution_type TEXT DEFAULT 'stripe_monthly';
-- Values: 'stripe_monthly' | 'stripe_one_time' | 'cashback' | 'windfall' | 'manual'
```

---

## Key Rules to Establish

- [ ] Cashback only counts if it flows to the LLC Fidelity account OR is deposited via portal one-time
- [ ] Members should not count cashback they keep personally as an LLC contribution
- [ ] Admin verifies cashback amounts against Fidelity statement monthly before awarding CP
- [ ] The Fidelity card should never be used to carry a balance — pay in full monthly (interest would wipe out the cashback value)
- [ ] If a member carries a balance, cashback earned does not count toward LLC contribution until the card is paid down (interest paid = contribution nullified)

---

## Summary

| Option | Effort | Tracks in Portal | Auto | Best For |
|---|---|---|---|---|
| A — Manual log | Low | With declaration | No | Right now |
| B — Redeem → One-Time Deposit | Low | Yes (via Stripe) | No | Right now |
| C — Pay Stripe with card | None | Yes (auto Stripe) | Yes | Right now, always |
| D — Admin manual attribution | Medium (build) | Yes | No | Near-term |
| E — Fidelity API/Plaid | Very High | Yes | Yes | Future |

**Start with C + B. Build D within a few months. Revisit E much later.**

---

**Last Updated:** March 11, 2026
**Status:** 📋 Strategy documented — Option C ready to implement now, Option D needs portal build
