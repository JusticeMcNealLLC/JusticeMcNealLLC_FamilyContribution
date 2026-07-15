# Why Join? — Member Pitch Page

**File:** `pages/resources/why-join.html`  
**Status:** 🔲 Not Started  
**Access:** Public (no login required — built to be shared and presented)  
**Source content:** `md/docs/memberBenefits.md`  
**Purpose:** A polished, presentation-ready page explaining why someone should join Justice McNeal LLC. Designed to be shown on a projector or large screen during an in-person conversation, or shared as a link before a call.

---

## The Goal

This page has two uses:
1. **In-person presentation** — open it on a laptop or TV, walk through it with a potential member (spouse, parent, sibling-in-law) while you explain each section
2. **Shareable link** — send it to someone before or after a conversation so they can read it on their own and arrive informed

It needs to work well both as something you *present* and something someone *reads quietly alone.* That means: big enough to read from across a room, clean enough to not need explanation, and structured enough to tell a clear story.

---

## Page Structure

The page flows top to bottom like a unified story — not tabs, not a dashboard, just one continuous scroll with clear section breaks. Each section is large and easy to digest.

---

### Section 1 — Hero

**Full-viewport opening panel.**

```
[LLC Logo — centered, large]

The McNeal Family
Is Building Something.

A family-owned investment company.
A growing fund. A real portal.
A plan that compounds over time.

This is Justice McNeal LLC.

[↓ Scroll to learn more]
```

- Dark background (deep indigo or near-black)
- White text
- Logo prominent
- Subtext is minimal and confident — not a sales pitch, a statement
- Subtle animated background (gradient shift or the Lottie orbs from login, scaled back)

---

### Section 2 — The Problem (Why This Exists)

**Light background. Large text. One idea.**

Headline: *"Most families work their whole lives and leave almost nothing behind."*

Body: Short paragraph explaining the generational wealth gap — not because people didn't work hard but because money always went outward and never compounded. The cycle resets every generation unless someone breaks it.

Closing line: *"We decided to break it."*

---

### Section 3 — What This Is

**Dark section. Simple diagram.**

Headline: *"A family-owned investment company. Not a bank. Not an app. Ours."*

Show the money flow diagram in a clean visual:

```
Monthly contributions
       ↓
BlueVine Business Account (FDIC insured)
       ↓
Fidelity LLC Brokerage
       ↓
VTI · VXUS · VIG · SPAXX
       ↓
Grows for everyone
```

Below diagram: "And you can see all of it, in real time, in the portal."

Optional: small portal screenshot or mockup showing the dashboard/investment view.

---

### Section 4 — The Ask (What We Need From You)

**Light background. Very large, centered text.**

Headline: *"We're asking for one thing."*

Giant text: **$30 / month**

Below: "That's the minimum. That's it. No wage requirements. No income percentages. Just $30 a month, invested on your behalf, tracked and visible."

Small clarifying text: "Contribute more if you ever want to. Nobody will ever require it."

---

### Section 5 — What You Get Back

**Dark background. Card grid of benefits.**

6 cards in a responsive grid (2×3 or 3×2):

| # | Card | Content |
|---|------|---------|
| 1 | 📈 Your Money Growing | Invested in the U.S. stock market. Tracked. Visible. Yours. |
| 2 | 🏦 Family Loans | Borrow at 4–6% instead of paying a bank 10–25%. Interest stays in the family. |
| 3 | 🎂 Birthday Payouts | $10 auto-sent to your bank on your birthday. Live today. |
| 4 | 🔓 Milestone Unlocks | As the fund grows, everyone gains access to new programs ($25k → lending, $75k → Trust, $500k → real estate). |
| 5 | 🏠 Family Housing | Long-term: family-owned land where members live at below-market cost — building the family's equity, not a stranger's. |
| 6 | 🛡️ Life Insurance | Once the Trust is formed: whole life policies for every member, funded by the LLC. Payout stays in the family. |

Cards: white on dark, icon large, title bold, description small, clean hover lift.

---

### Section 6 — What's Already Built

**Light background. Status table or checklist.**

Headline: *"This isn't a promise. This is already working."*

Feature checklist — two columns, checkmarks on built items:

| ✅ Built | Description |
|----------|-------------|
| ✅ Member portal | Login, profile, settings — live at justicemcnealllc.com |
| ✅ Monthly subscription | Stripe-managed, with payment history and receipts |
| ✅ Investment dashboard | Portfolio value, allocation chart, growth history |
| ✅ Birthday payouts | Auto-sent to your bank via Stripe Connect |
| ✅ Quest & badge system | Earn Credit Points, unlock tiers, display badges |
| ✅ Social feed | Posts, reactions, comments, @mentions |
| ✅ Family tree | Interactive visualization of the family |
| ✅ Mobile app (PWA) | Installable to your home screen — works like a native app |
| 🔧 Events system | Coming — plan gatherings, manage RSVPs, QR check-in |
| 🔧 Family messaging | Coming — direct messages + stories |
| 🔧 Credit 101 hub | Coming — financial education modules |

---

### Section 7 — The Fidelity Cashback Opportunity

**Dark background. Tight, punchy layout.**

Headline: *"2% cashback. Zero extra spending."*

Brief explanation: Fidelity Rewards Visa — 2% on everything — deposited directly into the family fund. Use it for groceries, gas, bills. Spend what you'd spend anyway.

**Visual table:**

| Households using the card | Extra per month | Extra per year |
|--------------------------|-----------------|----------------|
| 1 household | ~$30 | ~$360 |
| 2 households | ~$60 | ~$720 |
| 4 households | ~$120–$200 | ~$1,440–$2,400 |

"Passive. Automatic. Already documented. (Full guide available in Resources.)"

---

### Section 8 — The Timeline

**Light background. Two-column layout.**

Headline: *"Here's the honest math."*

Left column — the problem:
> At $120/month (4 members × $30), reaching $200,000 for land + housing takes about **24 years**. That's too long.

Right column — the solution:
> Growing to 9 members — just immediate family — and hitting $270–$450/month compresses that to **13–18 years**. Add cashback and voluntary contributions, and we're looking at **8–11 years**.

Numbers table:

| Monthly | Source | Est. years to $200k |
|---------|--------|---------------------|
| $120 | 4 members × $30 | ~24 years |
| $270 | 9 members × $30 | ~18 years |
| $450 | 9 members × $50 avg | ~13 years |
| $600 | + cashback | ~11 years |
| $1,000 | + business income | ~8 years |

Closing line: *"Every person who joins moves the timeline for everyone."*

---

### Section 9 — Transparency

**Dark background. Short and firm.**

Headline: *"Nothing is hidden."*

Bullet points:
- Every contribution is logged and visible in the portal
- Money flows: Stripe → BlueVine (FDIC insured) → Fidelity brokerage → invested
- It never touches a personal account
- Any member can log in and see the full portfolio, their history, and the family total
- Admin cannot redirect funds — the flow is one-way and auditable

---

### Section 10 — Rules in Plain Language

**Light background. Two-column rule table.**

Headline: *"The rules, no fine print."*

| Rule | What It Means |
|------|---------------|
| $30/month minimum | Non-negotiable — this keeps the fund funded |
| No wage or income requirements | We will never ask for a % of your paycheck or raise |
| Your contributions are tracked and yours | Permanently recorded, not absorbed |
| Voluntary contributions above minimum | Always welcome, never required |
| Windfalls are a culture, not a policy | Got a tax refund? Drop some in if you want. No one tracks it. |
| What you join with, others will join with later | Cousins, aunts, extended family — same rules, always |

---

### Section 11 — Call to Action (Hero Closing Panel)

**Full-viewport dark panel. Centered.**

```
Ready to be part of it?

Ask Justin for an invite.
Setup takes less than 10 minutes.

[→ Visit the Portal]      [→ See All Resources]
```

- Two CTAs: portal link + resources hub link
- Closing quote (optional): *"The best time to plant a tree was 20 years ago. The second best time is now."*
- LLC name + year in small text at bottom

---

## Design Notes

### Presentation Mode (Projection Ready)
- Font sizes should be large enough to read comfortably from 8–10 feet
- Minimum body font: 18px. Headings: 40–60px where possible
- High contrast throughout — avoid low-contrast grays
- Avoid dense walls of text — every section has breathing room
- Consider a keyboard shortcut or "present" button that hides the browser UI hints (full page scroll, large margins removed)

### Sections Alternating Light / Dark
- Section 1 (Hero): Dark
- Section 2 (Problem): Light  
- Section 3 (What This Is): Dark
- Section 4 (The Ask): Light — isolated $30 text, very impactful
- Section 5 (What You Get): Dark
- Section 6 (Already Built): Light
- Section 7 (Cashback): Dark
- Section 8 (Timeline): Light
- Section 9 (Transparency): Dark
- Section 10 (Rules): Light
- Section 11 (CTA): Dark

### Typography
- Headlines: Bold, large, confident
- Body: Clean sans-serif (Tailwind default or Inter)
- Numbers and financial figures: monospace or slightly larger weight for emphasis

### No Auth Wall, No Nav Drawer
- This page is standalone — no portal bottom nav, no pageShell
- Minimal fixed header: LLC logo left, "Join the Portal →" link right
- No login required to view

---

## Technical Notes
- `pages/resources/why-join.html`
- Tailwind CSS CDN
- Lottie optionally for hero background (reuse auth/login.html's animated orbs)
- Chart.js optionally for timeline visualization in Section 8
- No Supabase calls needed — fully static content
- Anchor links in header for each section (for easy navigation during presentation: `#problem`, `#ask`, `#benefits`, etc.)
- Smooth scroll between sections
- `og:title`, `og:description`, `og:image` meta tags so link preview looks sharp when shared

---

## Related Files

- `pages/resources/index.html` — Resources Hub (spec: `md/pages/resources-hub.md`)
- `md/docs/memberBenefits.md` — full source content
- `md/wealth/income.md` — numbers reference
- `md/wealth/roadmap.md` — timeline / projection reference
