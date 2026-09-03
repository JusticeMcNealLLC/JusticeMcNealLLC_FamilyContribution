# Revenue Ideas — Justice McNeal LLC

Brainstorm space for how **Justice McNeal LLC** (and related entities) can make more money.  
**Not website product work** — company / business strategies, offers, and experiments.

Status: open brainstorm  
Last updated: 2026-07-14

---

## How to use this file

- Dump ideas freely; refine later
- Tag rough fit: `core` (family contribution), `adjacent` (uses the brand/members), `new venture` (separate LLC later)
- Note effort vs upside when you can: `$` low · `$$` mid · `$$$` high upside; effort `xs→xl` same as product todo

Related reading: `docs/business/strategy/overview.md` (4-LLC plan), `docs/business/strategy/profits.md`

---

## Ideas

### 1. Internal family job board + escrow transactions

- **Pitch:** Members post skills/services (electrician, mechanic, babysitting, etc.) or job requests. Other members hire them through the site. Money is held in reserve (Stripe / business account) until the job is marked complete, then released to the worker. Keep money circulating **inside the family**; LLC takes a cut of each deal.
- **Who pays:** Members (buyers of services; possibly sellers via listing fee — fee model TBD)
- **Fit:** adjacent (uses member base + portal; could later become its own OpCo under holding)
- **Upside / effort:** `$$–$$$` · `xl` (marketplace + payments + chat + disputes + legal)

#### Product shape (rough)

- Skills listings + job requests board  
- In-app chat to negotiate details  
- Accept job → checkout / receipt screen  
- Escrow: funds held until completion, then payout to worker  

#### Fee model options (undecided)

| Option | How it works | Buyer pays | Seller nets |
|--------|----------------|------------|-------------|
| **A — Buyer pays fee** | Listed price + % at checkout | price + fee | full listed price (minus Stripe) |
| **B — Seller absorbs fee** | Buyer pays listed price; platform withholds % | listed price | price − fee |
| **C — Split / listing fee** | Smaller take + optional listing fee | TBD | TBD |

**Working target:** ~**10–15%** platform fee. Prefer covering **Stripe costs + margin**.

#### Stripe / cost notes (needs research)

- Likely: charge once to collect (buyer → platform), pay out once to worker (platform → seller)  
- Stripe fees may apply on **both** legs (~2.9% + $0.30 style — confirm)  
- Platform % should absorb double rails so net isn’t wiped out (15% may be safer than 10%)

#### Legal / risk (must solve before build)

- Platform should **not** own liability for bad work, cancellations, or safety — strong terms, disclaimers, maybe independent-contractor framing  
- Escrow dispute rules when buyer and seller disagree on quality/completion:
  - Full refund to buyer?  
  - 50/50 split?  
  - Business “makes both whole” (expensive — last resort)?  
  - Mediation / timeout auto-release rules?  
- Cancellation windows, no-show rules, and who bears Stripe refund costs  

#### Notes / next step

1. Research Stripe Connect / escrow patterns for marketplace 2-sided payouts  
2. Decide fee model A vs B (buyer-pays fee is clearer psychologically for family “tax at checkout”)  
3. Draft dispute + liability rules with an attorney before engineering  
4. MVP slice: listings + request + offline pay agreement → then add escrow  

---

## Themes to explore (prompts)

- More revenue from **existing members** (upsells, events, merchandise, services)
- Revenue from **non-members** without diluting the family portal
- **Passive / semi-passive** income tied to portfolio or content
- Ventures that belong under **Holding → OpCo** in the 4-LLC plan (Karry Kraze, AI content, etc.)
- Fees vs equity vs product sales
- Internal economy (jobs, favors, escrow) that keeps dollars in the family

---

## Parking lot

Quick one-liners that aren’t fleshed out yet:

-
-
-
