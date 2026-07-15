# Resources Hub — Directory Page

**File:** `pages/resources/index.html`  
**Status:** 🔲 Not Started  
**Access:** Public (no login required — shareable with prospective members)  
**Purpose:** A clean directory page linking to all LLC resources and documents. The entry point for anyone who wants to learn more about Justice McNeal LLC, or for members to reference key documents.

---

## Concept

A card-grid directory — like a clean document library. Each card represents a resource or document. Simple, branded, easy to scan. Fully public so a link can be shared with anyone — a potential member, a spouse, a parent — without requiring them to have an account first.

Think less "portal page" and more "landing page that happens to live in our ecosystem."

---

## Layout

### Header
- LLC logo (centered or top-left)
- Headline: **"McNeal Family Resources"** or **"Justice McNeal LLC — Documents & Resources"**
- Subtext: *"Everything you need to understand our plan, our mission, and how to be part of it."*
- No login prompt — this page is intentionally public

### Resource Card Grid
A responsive grid (2 columns on mobile, 3–4 on desktop). Each card:

```
┌──────────────────────┐
│  [Icon / Emoji]      │
│                      │
│  Title               │
│  Short description   │
│                      │
│  [View →]  [tag]     │
└──────────────────────┘
```

**Card anatomy:**
- Icon (emoji or SVG)
- Title (short + punchy)
- 1–2 line description
- "View →" link to the resource page
- Tag badge: `Public` / `Members Only` / `Coming Soon`

### Footer (minimal)
- LLC name + year
- Link back to portal (`justicemcnealllc.com`)

---

## Resource Cards (Initial Set)

| Icon | Title | Description | Tag |
|------|-------|-------------|-----|
| 🤝 | Why Join? | The case for becoming a member — benefits, the plan, and what $30/month actually builds. | Public |
| 💳 | Fidelity Cashback Guide | How to set up 2% passive cashback into the family fund — step by step. | Members Only |
| 📈 | Generational Wealth Blueprint | Our long-term strategy: property, trust, income streams, and the 6-phase roadmap. | Members Only |
| 📋 | Member Rules & FAQ | How contributions work, what's required, and answers to common questions. | Public |
| 🎯 | Quest & Badge Guide | How CP tiers work, what quests earn what, and how to level up your status. | Members Only |

> **Note:** Cards marked `Members Only` should show a lock overlay and redirect to login if clicked while logged out. Cards marked `Public` open freely. Cards marked `Coming Soon` are visible but not clickable.

---

## Visual Design Notes

- Matches LLC brand (indigo/navy, white cards, clean sans-serif font)
- Card hover: slight lift shadow + cursor pointer
- Tags: green badge for Public, indigo badge for Members Only, gray badge for Coming Soon
- Section header above grid: "Resources & Documents"
- Optional: Search/filter bar if card count grows large (not needed at launch)
- Responsive — works on phone, tablet, and projection

---

## Technical Notes

- Lives at `pages/resources/index.html`
- No Supabase auth required to view the page itself
- Individual resource pages may require auth (handled per-page)
- Nav: minimal — just logo and optional portal link in top-right
- No bottom tab nav, no full pageShell — standalone page with its own minimal header/footer
- Tailwind CSS (CDN) for styling
- Cards can be hardcoded initially, later pulled from a config array in JS

---

## Future Cards (Add As Created)

- 🏦 Investment Strategy — how we pick funds, allocation rationale, rebalancing plan  
- 🏠 Property & Land Plan — container home strategy, loan structure, timeline  
- ⚖️ Legal & Trust — how the Family Trust works and why it matters  
- 🎓 Credit 101 — financial education hub *(links into Phase 3C once built)*  
- 📖 Member Onboarding Guide — what to expect in your first 30 days  
- 🗓️ Events Calendar — upcoming LLC events *(once events system is built)*

---

## Related Files

- `pages/resources/why-join.html` — the Why Join pitch page (spec: `md/pages/resources-why-join.md`)
- `md/docs/memberBenefits.md` — source content for the Why Join page
- `md/systems/memberFidelityCashback.md` — source content for Fidelity Cashback Guide
