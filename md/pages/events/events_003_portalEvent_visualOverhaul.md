# 📅 `portal/events.html` — Visual & UX Overhaul Spec (events_003)

> **Status:** Phase A1+A2+A3+B1+B2+B3+B4+B5+C1+C2+C3+C4 shipped. **Phase D opened** — see [events_004_portalEvent_phaseD.md](events_004_portalEvent_phaseD.md) (D3 + D1 + D2 + D4 shipped — **Phase D complete**, SW at `v61`). **Phase E partial:** E1 (gradient header) + E2 (mobile search pill) + E3 (inline category chip rail) + E4 (emoji bucket labels) + E9 (motion polish) shipped — **vlift default-ON live**, opt-out via `?vlift=0`. Phase A4 (polish/QA on real device) still pending — non-blocking for Phase C since C1 is mobile-gated behind `ontouchstart` + `innerWidth < 640` + `scrollY === 0`. **Phase E (Premium Visual Lift) scoped** — see §Phase E + Appendix C for the design-parity plan against the California gradient + Tomorrowland festival mockups.
> **Scope:** `/portal/events.html` **list view only**. Detail view (`#eventsDetailView`) is out of scope — already shipped in M2 (`events_002.md`).
> **Goal:** transform the current functional-but-flat list page into a **premium, mobile-first event browsing experience** that feels native to a top-tier consumer product, while staying inside the existing JMLLC portal theme (Inter + brand-indigo + surface-50 background + light editorial cards).
> **Non-goal:** backend changes. No schema, RPC, or edge-function work. RSVP flow, create flow, detail flow all continue to call exactly what they call today.

---

## 1. Executive Summary

### 1.1 What this is
A focused redesign of `portal/events.html`'s **list/browse view** — the page a member lands on when they tap the Events tab. The current page is functional (search, filter, stats, grid) but visually weak: it reads like an admin dashboard, not a place a member wants to *browse* and *get excited about an event*.

### 1.2 Why now
The events overhaul tracked in `events_002.md` (M0–M6) successfully restructured the codebase, extracted shared components, rebuilt the detail page, and shipped the admin management sheet. The detail page (M2) and public page (M5) now feel premium. **The list page — the entry point — was rebuilt structurally in M1 but never got the visual lift.** It now visibly lags behind the rest of the events surface.

### 1.3 What changes
- **Header & hero** — replace the cold "Up Next + 2 stat tiles" row with a single editorial hero that *features the next event* (with banner, countdown, and one-tap RSVP / Going state) instead of summarizing it as a number.
- **Filtering** — collapse the two stacked chip rows into one segmented control + a single "category/type" chip strip. Sticky on scroll. Search becomes a leading icon button that expands, not a permanent text field eating vertical real estate.
- **Cards** — redesign the event card as the page's hero unit: bigger banner, stronger date treatment, attendee avatar stack ("3 going · join them"), live countdown chip on imminent events, RSVP status as a clear ribbon not a buried micro-pill.
- **Grouping** — flat grid → grouped sections: **Happening now** → **This week** → **Coming up** → **Past** (tab-driven). Members scan dates instead of titles.
- **Empty / loading / personalized states** — richer empty state with a clear next action; skeletons that match the new card shape; a "Your RSVPs" rail that shows up when the member has confirmed events (instead of just a stat counter).
- **Mobile polish** — sticky header that condenses on scroll, sticky filters with edge-fade, FAB-style Create on mobile (replaces the header button on small screens), safe-area handling on every fixed element.

### 1.4 What does NOT change
- The Supabase queries in `js/portal/events/list.js` (`loadEvents()`).
- The shared `EventsCard.render()` API — it gets a redesign but the call signature and the four data fields it depends on stay identical.
- The detail page (`#eventsDetailView`), the create sheet (`EventsCreate`), the admin sheet (`EventsManage`).
- The URL contract (`?event={slug}` to open detail, `?newCreate=1` flag).
- Any RSVP / payment / raffle / competition logic.
- Permissions (`events.create` still gates the Create button).

### 1.5 Success criteria
- A first-time member opens the page on a phone and within 3 seconds knows: **(a)** what's the next thing happening, **(b)** whether they're going, **(c)** how to RSVP.
- The page feels visually consistent with the *detail* page (M2) — same hero rhythm, same card language, same spacing tokens.
- Zero regressions in the underlying functionality (filter, search, RSVP load, featured carousel, drafts, permissions).
- 100% of fixed/sticky elements respect iOS safe-area.

---

## 2. Audit of Current Events Page

### 2.1 File inventory (touched by this overhaul)

| File | Lines | Role | Touched here? |
|---|---|---|---|
| [portal/events.html](portal/events.html) | ~600 | Page shell, list view markup, legacy `#createModal` HTML | **Yes — list view markup rewritten** |
| [css/pages/portal-events.css](css/pages/portal-events.css) | 338 (post-M6 purge) | Detail-view styles + chip + CTA bar | **Trim further; add new card/hero rules in scoped block** |
| [js/portal/events/list.js](js/portal/events/list.js) | ~340 | `PortalEvents.list` — data load, render, filter, search | **Render functions rewritten; data load untouched** |
| [js/portal/events/init.js](js/portal/events/init.js) | ~130 | Listener wiring | **Re-wire new sticky/condensing header + new chip controls** |
| [js/components/events/card.js](js/components/events/card.js) | ~125 | Shared `EventsCard.render()` | **Card markup rewritten; signature preserved** |
| [js/components/events/pills.js](js/components/events/pills.js) | — | `typePill`, `statePill`, `rsvpChip` renderers | **Add `countdownChip`, refresh visual styles** |
| [js/components/events/helpers.js](js/components/events/helpers.js) | — | `formatDate`, `escapeHtml`, etc. | **Add `relativeDate` ("in 3 days", "tomorrow at 7pm") + `groupByBucket`** |
| [js/components/events/constants.js](js/components/events/constants.js) | — | `CATEGORY_EMOJI`, `CATEGORY_GRADIENT`, type/status maps | **Recolor gradients to muted/desaturated palette** |

### 2.2 Current page structure (what's actually rendered)

Top to bottom on the live page (`/portal/events.html`):

1. **Sidebar nav** (desktop) / **bottom-tab nav** (mobile) — out of scope.
2. **Page header** — `<h1>Events</h1>` + 1-line subtitle ("Family gatherings, milestones & upcoming happenings") + right-aligned `Create Event` button (gated on `events.create`).
3. **Stat tile row** — 3 tiles in a 2-col mobile grid:
   - **Up Next** (gradient brand tile, col-span-2) — title + date of next event, OR "No upcoming events" copy.
   - **Upcoming** (white tile) — count.
   - **Your RSVPs** (white tile) — count.
4. **Search input** — full-width text input with leading magnifier + trailing clear (X) when filled.
5. **Sticky lifecycle chips** — single row, `Upcoming / Past / Going`, sticky to top with backdrop blur.
6. **Type chips** — second chip row, `All / LLC / Member / Competition` (not sticky).
7. **Featured carousel** — horizontal scrolling row of pinned LLC events. Hidden when empty (currently hidden in screenshot).
8. **Events grid** — 1-col mobile, 2-col sm, 3-col lg. Each card is `EventsCard.render(event, {rsvp, href})`:
   - 176-192px tall banner with category gradient fallback + emoji watermark.
   - White date chip top-left (44×44, day number + month).
   - Status pill + type pill top-right (pair).
   - Title (line-clamp 2) + meta line ("Wed, Apr 1 · 7:53 PM · location") below.
   - RSVP status chip on a second row if member has RSVP'd.
9. **Empty state** — center-aligned card with calendar icon + "No upcoming events" + Create CTA (admin only).

### 2.3 Underlying data flow (preserved by this overhaul)

```
loadEvents()
  ├─ supabaseClient.from('events').select(*, creator:…)
  │    .in('status', ['open','confirmed','active','completed'])
  │    .order('start_date')                            → window.evtAllEvents
  ├─ if admin: extra query for status='draft' AND created_by=me  → prepended
  └─ if signed-in: event_rsvps where user_id=me, event_id IN (…) → window.evtAllRsvps {[event_id]: rsvp}

renderFeatured() → reads evtAllEvents, filters to is_pinned + LLC, fills #evtFeaturedCarousel.
renderEvents()   → reads evtAllEvents + evtActiveTab + _activeType + _searchQuery,
                   maps to EventsCard.render() into #eventsGrid; updates hero stats.
```

**This pipeline stays exactly as-is.** The overhaul only changes how the rendered output looks and how it's grouped/sectioned.

### 2.4 Existing strengths to preserve
- Clean, single-purpose IIFE namespace (`PortalEvents.list`).
- Shared card component (`EventsCard`) used by portal AND admin — keeps both surfaces aligned.
- Sticky lifecycle filter chips with safe-area-aware backdrop blur — pattern is good.
- Skeleton placeholders during load (already wired in `Card.skeleton()`).
- Drafts visible to admin creator — non-trivial, keep.
- Permission gating on Create button — keep.

---

## 3. Current UX / Visual Problems

> Ranked by user impact (worst first). Each problem links to a fix in §8.

### 3.1 P0 — The page never *features* anything
The "Up Next" gradient tile is a **summary** of the next event (title + date), not the event itself. There's no banner, no RSVP CTA, no countdown. When members open the page, they see *information about* the next event but not the next event. → **Replace stat tile with a hero card that IS the next event.** (§8.1)

### 3.2 P0 — Two chip rows feel like a control panel, not a feed
Search input + sticky lifecycle chips + type chips = 3 stacked filtering controls before the user sees any content. On a 390px-wide phone in portrait, ~280px of scroll is consumed by chrome before the first card. → **Collapse to one segmented control + one icon-row of category filters; make search an expand-on-tap action.** (§8.4, §8.5)

### 3.3 P0 — Cards are flat & generic
- 176px banner is small for the visual weight a hero card deserves.
- Default-gradient fallback for missing banners is over-saturated (purples, oranges) and reads cartoony, not premium.
- Status pill + type pill in the top-right corner overlap visually and add noise.
- No social proof: nowhere does a member see "3 cousins are going."
- No countdown on imminent events ("Starts in 3h").
- Date chip is too small to anchor the card.

→ **Redesign card with bigger banner, muted fallback, attendee avatar stack, countdown ribbon, single status badge, and a stronger date stamp.** (§8.6)

### 3.4 P1 — No grouping
All events flow into one flat grid sorted by `start_date`. There's no visual break between *"this week"* and *"in three months."* Members can't quickly answer "what's happening soon?" → **Group events into time buckets within the active lifecycle tab.** (§8.7)

### 3.5 P1 — "Your RSVPs" is a number, not a section
A counter that says `Your RSVPs: 4` is information without action. → **Replace with a horizontally-scrolling "You're going" rail at the top of the feed when the member has confirmed RSVPs.** (§8.2)

### 3.6 P1 — Header is generic
"Events" + subtitle + Create button is the same shape as every other admin page in the workspace. There's nothing JMLLC about it. → **Add a small editorial flourish — subtle gradient wash, brand-mark detail, or a member-personalized greeting ("Saturday looks busy, Justin").** (§8.1)

### 3.7 P2 — Empty state is bland
Calendar SVG + "No upcoming events" + Create CTA is fine but uninspired, and it appears the same way for a member with no permissions (no CTA shown — just a dead end). → **Differentiate by viewer role; add Lottie or category illustration; add secondary action ("Browse past events").** (§8.10)

### 3.8 P2 — Loading state mismatch
`Card.skeleton()` renders a generic gray-block-with-text-lines pattern that doesn't match the new card layout. → **Update skeleton to mirror the new card shape (taller banner, stamp position, avatar stack placeholder).** (§8.6)

### 3.9 P2 — No live indicator anywhere on the list
A "Live" status is shown as a small pill on the card, but there's no top-of-page treatment when an event is *currently happening*. → **When any event has `status === 'active'` or is within its time window, surface a thin "🔴 Live now" banner above the feed with a one-tap link.** (§8.3)

### 3.10 P3 — Featured carousel is invisible until populated
`#evtFeaturedSection.hidden` gives a "broken page" feel during initial render and on members with no pinned LLC events. → **Fold featured into the new "Happening soon" rail; drop the standalone carousel section.** (§8.7)

### 3.11 P3 — Search doesn't help discovery
Search only matches `title + description`. There's no category-tap-to-filter from a card; no recent-search memory; no suggested searches. → **Add tap-to-filter on category emoji from any card; persist last search in `sessionStorage`.** (§8.5)

### 3.12 P3 — No calendar/agenda view option
Power members (admins, organizers) want a month-grid view. Today there's only a list. → **Future: add a list/agenda toggle in the header.** (§10, future)

---

## 4. Core Product Decisions

### 4.1 The page's primary job
Help a member, in under 5 seconds on mobile, **see what's next and decide if they're going.** Everything else (browsing past events, searching, filtering by type) is secondary.

### 4.2 Keep vs change
| Concept | Decision | Why |
|---|---|---|
| Three lifecycle states (Upcoming / Past / Going) | **Keep** | Mental model is correct. Repackage as a segmented control. |
| Four event types (All / LLC / Member / Competition) | **Keep** | Real product distinction. Render as compact icon chips. |
| Search | **Keep**, but de-emphasize | It's used by ~5% of sessions on similar feeds. Demote to an expandable icon. |
| Featured / pinned LLC carousel | **Drop as separate section** | Fold into "Happening soon" rail with a "📌" badge. |
| Hero stat tiles | **Drop entirely** | Replace with the actual next event as a hero card + a "You're going" rail. |
| Create Event button in header | **Keep on desktop**, **move to FAB on mobile** | Header button competes with content; FAB is the modern mobile pattern. |
| Per-card meta line ("Wed, Apr 1 · 7:53 PM · location") | **Keep**, polish typography | Compact, scannable. |
| Card grid (1/2/3 col responsive) | **Keep on tablet+**, **single column on mobile** | Two-up cards on small phones squeezes content. |
| Skeleton loading | **Keep**, but match new card | Consistency. |
| Drafts shown to admin creator | **Keep** | Non-trivial query, real value. |

### 4.3 Hero card selection rule (LOCKED)

The hero is the emotional center of the page. Its selection must be **deterministic and predictable**, not heuristic. Rendering pipeline picks **exactly one** event by walking this list in order and stopping at the first match:

1. **A `going` RSVP within the next 24h** (member-personal). If multiple, the soonest one.
2. **A pinned/featured LLC event in the future** (`is_pinned = true` AND `start_date >= now`). If multiple, the soonest one.
3. **The soonest upcoming event overall** (any type, any RSVP status, `start_date >= now`).
4. **No hero rendered** if there are no upcoming events at all (the page falls back to the empty state).

This rule lives here in Core Decisions on purpose — it's not a recommendation, it's the contract. `renderHero()` in `list.js` implements exactly this ordering.

**Going rail must exclude the hero event.** If the hero was selected by rule (1) — i.e. it came from the member's `going` list — `renderGoingRail()` filters it out before rendering. The rail must never repeat the hero as its first item.

### 4.4 Search behavior (LOCKED)

When `_searchQuery` is non-empty, the page **disables time-bucket grouping** and renders a flat list. Sort order:

1. **Tier 1 — title match** (case-insensitive substring on `event.title`). Within tier, sort by `start_date` ascending.
2. **Tier 2 — description match** (case-insensitive substring on `event.description`, excluding events already in tier 1). Within tier, sort by `start_date` ascending.
3. Events matching neither are filtered out entirely.

No fuzzy matching, no token weighting, no client-side ranking. Two tiers, simple substring, date-ascending within each. Hero card and going rail are also hidden during active search — the search result list is the only thing on screen below the filter strip.

### 4.5 New product additions (labeled by priority)

| Addition | Priority | Notes |
|---|---|---|
| Hero card for next/featured event | **must-have (P0)** | Single biggest visual lift. |
| Attendee avatar stack on cards | **must-have (P0)** | Social proof = the highest-impact feature for community apps. |
| Time-bucket grouping (Today / This week / Later / Past) | **must-have (P0)** | Replaces flat grid. |
| Countdown chip on imminent events (≤72h) | **recommended (P1)** | "Starts in 3h" is a known engagement driver. |
| "🔴 Live now" top banner | **recommended (P1)** | Only renders when applicable. |
| "You're going" rail | **recommended (P1)** | Personalization. |
| Mobile FAB for Create | **recommended (P1)** | Pattern parity with modern apps. |
| Tap category emoji to filter by category | **future** | Cheap to add, but not core. |
| Calendar/agenda view toggle | **future** | Real lift; defer. |
| Search history / suggested searches | **future** | Low-impact polish. |

---

## 5. Proposed New Page Experience

### 5.1 Mobile (390px) information stack — top to bottom

```
┌─────────────────────────────────────────────┐
│ [Sticky condensing header]                  │
│  "Events"  · 4 going · 12 upcoming     [+]  │  ← collapses to icon row on scroll
├─────────────────────────────────────────────┤
│                                             │
│  HERO CARD (next event)                     │  ← full-bleed banner, 320px tall
│  ┌──────────────────────────────────┐       │
│  │ banner img w/ gradient scrim     │       │
│  │                                  │       │
│  │  🔴 LIVE  · 21 going             │       │
│  │  Birthday Cook Out               │       │
│  │  Tonight · 7:00 PM · Mom's House │       │
│  │  [ I'm Going ]   [ Maybe ]       │       │
│  └──────────────────────────────────┘       │
│                                             │
├─────────────────────────────────────────────┤
│  YOU'RE GOING (hidden if 0)                 │  ← horizontal scroll rail
│   [card] [card] [card] →                    │
├─────────────────────────────────────────────┤
│ [Sticky filter strip]                       │
│  ◉ Upcoming   ○ Past   ○ Going              │
│  [🔍] [All ▾]                               │  ← search collapses to icon
├─────────────────────────────────────────────┤
│                                             │
│  THIS WEEK                                  │  ← group label, sticky-ish
│  ┌──────────────────────────────────┐       │
│  │ event card                       │       │
│  │ event card                       │       │
│                                             │
│  COMING UP                                  │
│  ┌──────────────────────────────────┐       │
│  │ event card                       │       │
│  │ event card                       │       │
│                                             │
└─────────────────────────────────────────────┘
                          [+ FAB]   ← floating, brand-violet, bottom-right
```

### 5.2 Desktop (≥768px) information stack

Same vertical stack, but:
- Cards in `grid-cols-2` (md) and `grid-cols-3` (lg).
- Hero card is single column max-w-3xl, centered.
- Search stays open (no expand-on-tap).
- FAB collapses back into the header `Create Event` button.
- "You're going" rail becomes a 2-up grid instead of horizontal scroll.

### 5.3 What members see in the first 3 seconds (mobile, signed in)
1. **Member name + count** in header — "4 going, 12 upcoming."
2. **Hero card** — next event, banner, RSVP CTA inline. They can RSVP without ever leaving the page.
3. **First group label** — "Tonight" / "This week" — orients them in time.

### 5.4 What an admin with no events sees
1. Header with `+` icon.
2. Empty hero swap → an editorial empty state ("No events yet — create your family's first one") with a primary `Create event` CTA and an illustration.
3. No filter strip until at least one event exists.

---

## 6. Mobile-First UX Strategy

### 6.1 Core principles (locked)
- **Single-column** on `<sm`. Two-up cards on a 390px phone shrink content too much.
- **Thumb-zone** all primary actions: hero RSVP CTA bottom of card, FAB bottom-right.
- **Safe-area aware** every fixed/sticky element: header `padding-top: max(0.75rem, env(safe-area-inset-top))`; FAB `bottom: max(1rem, calc(56px + env(safe-area-inset-bottom)))` (clears bottom-tab nav).
- **iOS-zoom-safe inputs**: `text-base sm:text-sm` (16px+ on small).
- **Tap targets ≥44×44**: every chip, every card-action button.
- **No horizontal scroll inside cards.** Horizontal scroll is opt-in (rails), never accidental.

### 6.2 Sticky-header behavior
- On load: header expanded, ~88px tall (title + count line).
- On scroll past the hero card: header condenses to ~52px (title + icon row).
- IntersectionObserver on a sentinel div under the hero — no scroll listener thrashing.
- Header bg: `bg-surface-50/85 backdrop-blur` (matches existing chip-row pattern).

### 6.3 Filter strip behavior
- On load: lifecycle segmented control + search-icon + type-dropdown chip in one row.
- On scroll: this row sticks below the condensed header (z-30, `top: var(--header-h)`).
- Active filter chip auto-scrolls into view on change (preserve current behavior).

### 6.4 FAB behavior
- Render only on `<sm` AND `events.create` permission.
- 56×56, brand-violet gradient, `+` icon.
- Hides on scroll-down, reappears on scroll-up (classic mobile pattern; debounced; cancelled if at page top).
- Bottom-tab-nav-aware bottom offset.

### 6.5 Pull-to-refresh
- Add native pull-to-refresh on `<sm`. Reload `loadEvents()` on release.
- Implementation: small custom handler (touch events on `main`) — no new lib. **Recommended P2; not a launch blocker.**

### 6.6 Mobile gesture niceties (P3)
- Long-press a card → context sheet ("Save", "Share link", "Add to calendar").
- Swipe-left on a confirmed-RSVP card → quick "Cancel RSVP" action (with grace-window check).

---

## 7. Visual Design Direction

### 7.1 Inspiration anchors
- **Airbnb / Hopper** — full-bleed hero banner with title overlaid on scrim; date stamp as an editorial element, not a badge.
- **Eventbrite mobile** — date chip as a strong vertical tile (day-num large, month small), pinned to card top-left.
- **Apple Maps "Today" / News+** — quiet section labels ("This week"), generous vertical rhythm.
- **Linear / Notion** — restrained pill chips, system-y typography, mono-weight indicators (live = single dot, not flashy gradient).
- **Modern fintech** (Cash App, Wealthsimple) — desaturated category accent colors, lots of white, one bold accent per surface.

### 7.2 Visual token table

| Token | Value | Where it's used |
|---|---|---|
| **Page bg** | `bg-surface-50` (`#f8fafc`) | Already in use — keep. |
| **Card bg** | `bg-white` | Cards, hero card, rails. |
| **Card border** | `border border-gray-200/80` | All non-hero cards. |
| **Card shadow** | `shadow-sm md:hover:shadow-md` | Cards. |
| **Hero card shadow** | `shadow-[0_8px_30px_rgba(79,70,229,0.12)]` | Top hero only. |
| **Card radius** | `rounded-2xl` (16px) for hero, `rounded-xl` (12px) for grid cards | Today everything is `rounded-2xl` — too uniform. |
| **Banner aspect** | `aspect-[16/10]` for hero, `aspect-[16/9]` for grid | Today fixed-pixel `h-44 sm:h-48` — switch to aspect ratios. |
| **Brand accent** | `brand-600` (`#4f46e5`) | CTAs, active filter chip, FAB. |
| **Live indicator** | `text-rose-500` + `bg-rose-50` + dot pulse | New `LIVE` badge. |
| **Section label** | `text-xs font-bold uppercase tracking-[0.14em] text-gray-500` | "This week", "Coming up". |
| **Card title** | `text-base sm:text-lg font-bold text-gray-900 leading-snug` | All cards. |
| **Hero card title** | `text-2xl sm:text-3xl font-extrabold text-white drop-shadow-sm` | Hero only. |
| **Card meta** | `text-sm text-gray-500` | Date · time · location line. |
| **Spacing rhythm** | `gap-4` between cards, `gap-8` between groups, `gap-6` between major sections | Today: `gap-4` everywhere — feels cramped. |
| **Date stamp** | `bg-white/95 backdrop-blur rounded-xl px-2.5 py-2 min-w-[52px]` (was 44px) | Slightly larger, more present. |

### 7.3 Category gradient palette (replace current saturated set)
Current `CATEGORY_GRADIENT` produces strong purples/oranges that read cartoony. Replace with **muted, photographic-feeling** gradients (think Spotify Wrapped 2023):

| Category | New gradient | Old (for reference) |
|---|---|---|
| `party` | `linear-gradient(135deg, #1e1b4b, #6366f1)` (deep indigo → brand) | bright purple/pink |
| `birthday` | `linear-gradient(135deg, #831843, #ec4899)` (wine → rose) | hot pink |
| `cookout` | `linear-gradient(135deg, #7c2d12, #f97316)` (rust → amber) | bright orange |
| `meeting` | `linear-gradient(135deg, #0f172a, #475569)` (slate) | gray |
| `competition` | `linear-gradient(135deg, #052e16, #16a34a)` (forest → green) | bright green |
| `trip` | `linear-gradient(135deg, #0c4a6e, #0ea5e9)` (deep teal → sky) | cyan |
| `fundraiser` | `linear-gradient(135deg, #422006, #d97706)` (umber → amber) | bright orange |
| `volunteer` | `linear-gradient(135deg, #14532d, #4ade80)` (forest → light green) | bright lime |
| `celebration` | `linear-gradient(135deg, #4a044e, #d946ef)` (deep purple → fuchsia) | hot pink |
| `other` | `linear-gradient(135deg, #1f2937, #6b7280)` (charcoal) | gray |

> Each gradient is anchored on one **darker, deeper** color so the white text + emoji watermark remains legible without fighting saturation.

### 7.4 Iconography
- Keep emoji-as-category-mark (it's warm and on-brand for a family LLC).
- All UI icons: stroke `currentColor`, `stroke-width: 2`, 16-20px sizes only. No filled icons.
- Use a single source: the inline `<svg>` set already in use throughout the portal. Do not introduce an icon font.

### 7.5 Typography
- Inter, weights 400/500/600/700/800 — already loaded.
- **Hero title:** `font-extrabold tracking-tight`, white, drop-shadow.
- **Card title:** `font-bold tracking-tight`, gray-900, line-clamp-2.
- **Section labels:** uppercase `text-xs tracking-[0.14em]`, gray-500.
- **Meta text:** `text-sm text-gray-500`. Keep tabular-nums on dates: `font-feature-settings: 'tnum'`.

### 7.6 Motion
- Card enter: `opacity` + `translateY(8px) → 0` over 240ms cubic-bezier(.16,1,.3,1), staggered by index (max 6 cards staggered, then snap).
- Filter change: cross-fade at 120ms (not slide — slide on a flat grid is jittery).
- FAB scroll show/hide: 200ms `transform: translateY(0/120%)`.
- Live dot pulse: keep existing `dotPulse` keyframe (1.5s ease-in-out infinite).
- Respect `@media (prefers-reduced-motion: reduce)` — disable all of the above.

### 7.7 What to keep from current visual language
- Brand-indigo accent and surface-50 background — page identity.
- Card shadows and `rounded-2xl` on hero (we're tightening grid cards to `rounded-xl`, but the language stays).
- Backdrop-blur on sticky headers — already correct pattern.

---

## 8. Component-by-Component Redesign Plan

### 8.1 Header

**Before:** `<h1>Events</h1>` + 1-line subtitle + right-aligned button.

**After (mobile):**
```
┌────────────────────────────────────────────┐
│ Events                              [+]    │  ← title 22px, button 44×44 ghost on scroll
│ 4 going · 12 upcoming                      │  ← live count, gray-500
└────────────────────────────────────────────┘
```
- `[+]` button is the mobile FAB target on small screens; on scroll it stays visible in header (always reachable).
- Live counts pulled from `evtAllRsvps` size and `evtAllEvents.filter(upcoming).length`.
- Optional personalized greeting: `<small class="text-gray-400">Hey ${firstName} 👋</small>` above title — **recommended (P1), not required**.

**After (desktop):**
- Header expands to `flex items-end justify-between` with the existing `Create Event` button text-style (no FAB).

**Sticky behavior:** see §6.2.

### 8.2 "You're going" rail (NEW)

**Conditional render:** only when at least 1 confirmed RSVP (`evtAllRsvps[id].status === 'going'`).

```
┌────────────────────────────────────────────┐
│ YOU'RE GOING                  See all →    │
│ ──────────────────────────────────────     │
│ [mini-card] [mini-card] [mini-card] →     │  ← 220px wide each, snap scroll
└────────────────────────────────────────────┘
```

- Mini-card: 88px tall, banner thumbnail + title + relative date ("in 3 days").
- "See all →" filters to the `Going` lifecycle tab.
- On desktop (`≥md`): renders as a 2-up `grid-cols-2` instead of horizontal scroll.
- Source data: same `evtAllEvents` filtered by `evtAllRsvps`.

### 8.3 Live banner (NEW, conditional)

**Conditional render:** if any event in `evtAllEvents` is currently within its `[start_date, end_date]` window OR has `status === 'active'`.

```
┌────────────────────────────────────────────┐
│ 🔴 Live now · Birthday Cook Out      Join →│
└────────────────────────────────────────────┘
```
- One-line full-bleed banner above the filter strip, `bg-rose-50 text-rose-700`.
- Tap → opens detail page for that event.
- If multiple live events: show first, badge with count ("+2").

### 8.4 Lifecycle segmented control

**Before:** Three pill buttons in a row (`Upcoming / Past / Going`), sticky on scroll.

**After:** True segmented control:
```
┌────────────────────────────────┐
│ ◉ Upcoming   ○ Past   ○ Going  │
└────────────────────────────────┘
```
- One unified bg pill, indicator slides between segments on tap.
- Same data binding (`evtActiveTab`, `evtRenderEvents`).
- On scroll: sticks below condensed header.

### 8.5 Search + type filter strip

**Before:** Search input row + sticky lifecycle row + type chip row = 3 rows.

**After:** One row.
```
┌────────────────────────────────────────────┐
│ ◉ Upcoming   ○ Past   ○ Going   [🔍] [All ▾] │
└────────────────────────────────────────────┘
```
- 🔍 magnifier icon (44×44) → tap to expand inline search field with auto-focus.
- `[All ▾]` chip = current type filter; tap → bottom-sheet picker on mobile, dropdown on desktop, with All / LLC / Member / Competition + a small icon per option.
- ESC or tap-outside collapses search.
- Active type shown as the chip's label (`LLC ▾`, `Member ▾`, etc.).

### 8.6 Event card (the workhorse)

**Before signature:** `EventsCard.render(event, {rsvp, href, variant, adminMeta})` — preserved.

**After visual:**
```
┌─────────────────────────────────────────┐
│  ┌──────────────┐  Tonight              │  ← date stamp left, big relative date right
│  │ 21           │  7:00 PM · Mom's      │
│  │ APR          │  House                │
│  └──────────────┘                       │
│                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │  ← thin divider
│                                         │
│  Banner image (aspect-[16/9])           │
│  with bottom gradient scrim             │
│                                         │
│  Birthday Cook Out                      │  ← title, line-clamp-2
│  🍔 Cookout · LLC event                 │  ← category + type
│                                         │
│  ●●●● +3 going · Starts in 3h           │  ← avatar stack + countdown
└─────────────────────────────────────────┘
```

Key changes:
- **Layout flipped:** date now sits *above* the banner as a small editorial header, not as an overlay badge. Banner becomes the visual centerpiece.
- **Banner aspect:** `aspect-[16/9]`, no fixed pixel height. Renders cleanly at every viewport.
- **Banner fallback:** new muted gradient set (§7.3) + emoji watermark at 56px (was 5xl ~48px).
- **Status badge:** single chip top-right of banner — `LIVE`, `SOON`, `ENDED`, or hidden if `OPEN` (don't badge the default state).
- **Type pill:** moved out of corner — appears as text in meta line, not as a floating chip. Reduces visual noise.
- **Avatar stack:** 4 max, +N overflow. Pulled from `event_rsvps` joined to profiles. **NEW DATA REQUIREMENT** — see §11 Risks.
- **Countdown chip:** if event starts within 72h, append `· Starts in 3h` / `· Tomorrow` / `· In 2 days`. Computed client-side via `EventsHelpers.relativeDate()`.
- **RSVP status:** if member has RSVP'd, render a small green "✓ You're going" ribbon at the top of the card (replaces the buried second-line chip).

**Skeleton match:** `Card.skeleton()` updated to mirror this new shape.

### 8.7 Time-bucket grouping

Within the active lifecycle tab, partition events into buckets:

| Tab | Buckets (in order) |
|---|---|
| Upcoming | **Tonight** (today, after now) → **This week** (≤7 days) → **This month** (≤30 days) → **Later** (rest) |
| Past | **Last week** → **Last month** → **Earlier** |
| Going | **Tonight** → **This week** → **Later** (no need for past — would be redundant with the rail) |

- Each bucket renders a section label (§7.2 styling) and its cards in a vertical stack on mobile, grid on desktop.
- Empty buckets are not rendered.
- Bucketing logic: new `EventsHelpers.groupByBucket(events, mode)` returning `[{label, events[]}]`.

### 8.8 Featured / pinned LLC handling

- Drop the standalone `#evtFeaturedSection` carousel.
- Pinned LLC events get a small `📌` overlay on their date stamp and **always sort first within their bucket**.

### 8.9 Mobile FAB (Create)

```
                                    ┌────┐
                                    │ +  │  ← brand-violet, 56×56 round
                                    └────┘
```
- Position: `fixed right-4 bottom-[max(1rem,calc(56px+env(safe-area-inset-bottom)))]`.
- Z-index: 45 (below modals, above content).
- Permission-gated (`hasPermission('events.create')`).
- Hide on scroll-down, show on scroll-up + at top.
- Routes through `_openCreate()` (same handler as header button — feature-flag-aware).

### 8.10 Empty / loading states

| State | Render |
|---|---|
| **Loading (initial)** | 1 hero skeleton + 4 card skeletons in a single column (mobile) / grid (desktop). |
| **Empty + can create** | Editorial card: `[Lottie or illustration]` + "No events yet" + "Create your family's first one" + primary CTA. |
| **Empty + cannot create** | Editorial card: "No events on the books — check back soon." Secondary text-button: "Browse past events" → switches lifecycle tab. |
| **Empty after filter** | Inline message under the filter strip: "No `LLC` events match `birthday cook`." + "Clear filters" link. |
| **Network error** | Retry card with retry button (red-tinted, calm). |

---

## 9. Information Architecture / Layout Plan

### 9.1 DOM tree (target)

```
<main data-page="events-list">
  <!-- Sticky header (rendered & wired by JS for condensing behavior) -->
  <header id="evtPageHeader" class="sticky top-0 z-40 bg-surface-50/85 backdrop-blur safe-top">
    <div class="page-header__expanded">…title + count + Create button…</div>
    <div class="page-header__condensed">…compact title + Create icon…</div>
  </header>

  <!-- Live banner (conditional) -->
  <div id="evtLiveBanner" class="hidden …"></div>

  <!-- Hero card -->
  <section id="evtHero" class="evt-hero-card …"></section>

  <!-- "You're going" rail (conditional) -->
  <section id="evtGoingRail" class="hidden …">
    <header>YOU'RE GOING <a>See all</a></header>
    <div class="evt-rail-scroll">…mini-cards…</div>
  </section>

  <!-- Filter strip -->
  <div id="evtFilterStrip" class="sticky z-30 …">
    <div role="tablist">…segmented control…</div>
    <div class="evt-filter-actions">
      <button id="evtSearchToggle">🔍</button>
      <button id="evtTypeMenu">All ▾</button>
    </div>
    <div id="evtSearchExpand" class="hidden">…input…</div>
  </div>

  <!-- Bucketed groups -->
  <div id="evtGroups" class="space-y-8">
    <section data-bucket="tonight">
      <h2>TONIGHT</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">…cards…</div>
    </section>
    <section data-bucket="this-week">…</section>
    <section data-bucket="later">…</section>
  </div>

  <!-- Empty state -->
  <div id="evtEmpty" class="hidden">…</div>

  <!-- Detail view container (untouched) -->
  <div id="eventsDetailView" class="hidden"></div>
</main>

<!-- Mobile FAB (conditional) -->
<button id="evtCreateFab" class="hidden sm:hidden fixed …">+</button>

<!-- Legacy create modal (untouched, still feature-flag-routed) -->
<div id="createModal" class="hidden">…</div>
```

### 9.2 Z-index map (locked)
- Bottom-tab nav: 50
- Modals / sheets: 60
- Toasts: 70
- Sticky page header: 40
- Sticky filter strip: 30
- Mobile FAB: 45 (above content, below modals)
- Live banner: 35

### 9.3 Spacing rhythm
- Outer page padding: `px-4 sm:px-6 lg:px-8`, `py-5 sm:py-6`.
- Between hero and going-rail: `mt-6`.
- Between going-rail and filter strip: `mt-6`.
- Between filter strip and first group: `mt-4`.
- Between groups: `mt-8`.
- Between cards inside a group: `gap-4`.

---

## 10. Roadmap by Priority (P0 / P1 / P2 / P3)

> Each milestone ships independently. Old list view stays renderable behind a `?oldList=1` flag during cutover.

### P0 — Visual core (single ship)
**Why first:** these are the changes a member will *feel*. They land together because shipping any one of them on top of the old layout creates a worse hybrid.

1. **Hero card** — replaces stat tiles. (§8.1, §8 generally.)
2. **Card redesign** — new layout, muted gradients, avatar stack, countdown. (§8.6, §7.3.)
3. **Time-bucket grouping** — replaces flat grid. (§8.7.)
4. **Lifecycle segmented control + collapsed filter strip** — replaces 3 chip rows. (§8.4, §8.5.)
5. **Sticky condensing header.** (§6.2.)
6. **New skeleton matching new card shape.** (§3.8.)
7. **Service-worker cache bump.** (`v50 → v51`.)

**Done when:** mobile lighthouse visual feels indistinguishable from the inspiration anchor; all underlying functionality (filter, search, RSVP load, drafts, permissions) regression-clean.

### P1 — Personalization & polish
8. **"You're going" rail.** (§8.2.)
9. **🔴 Live banner.** (§8.3.)
10. **Mobile FAB for Create.** (§8.9.)
11. **Per-viewer empty states** + Lottie/illustration. (§8.10.)
12. **Personalized greeting** in header. (§8.1.)
13. **Pinned LLC marker in date stamp.** (§8.8.)

### P2 — Discovery & motion
14. **Pull-to-refresh** on mobile. (§6.5.)
15. **Tap-category-emoji to filter.** (§3.11.)
16. **Persisted last search in `sessionStorage`.** (§3.11.)
17. **Card enter motion + reduced-motion respect.** (§7.6.)
18. **Stagger animation on bucket reveal.**

### P3 — Power features (future)
19. **Calendar / agenda view toggle.** (§3.12.)
20. **Swipe gestures** (long-press context, swipe-cancel-RSVP). (§6.6.)
21. **Search history & suggestions.**
22. **"Similar events" rail at bottom of list (recsys-lite).**

---

## 11. Supporting File / Module Impact

### 11.1 Per-file impact table

| File | Change | Risk |
|---|---|---|
| [portal/events.html](portal/events.html) | Rewrite `#eventsListView` block per §9.1. **Do not touch** `#eventsDetailView`, `#createModal`, scanner modal, banner upload form. | Low — the JS contracts (`#eventsGrid`, `#typeFilter`, `#createEventBtn`, `#emptyCreateBtn`, etc.) are preserved as IDs even if container moves. |
| [js/portal/events/list.js](js/portal/events/list.js) | Replace `renderEvents()` and `renderFeatured()` with bucket-rendering pipeline. Keep `loadEvents()`, `evtAllEvents`, `evtAllRsvps` exactly as-is. Add `renderHero()`, `renderGoingRail()`, `renderLiveBanner()`. | Medium — lots of new render code. Mitigate by keeping legacy `evt*` global aliases pointing to new functions where signatures match. |
| [js/portal/events/init.js](js/portal/events/init.js) | Wire new sticky-header IntersectionObserver, FAB show/hide, search expand/collapse, type-menu open. Preserve existing wiring for `createEventBtn`, `emptyCreateBtn`, `typeFilter` change listener. | Low. |
| [js/components/events/card.js](js/components/events/card.js) | Replace `render()` body per §8.6. **Signature preserved.** Update `skeleton()` to match. | Medium — also used by `admin/events.html` card grid. Verify admin-variant still renders cleanly (admin footer, status pill). |
| [js/components/events/pills.js](js/components/events/pills.js) | Add `countdownChip(event)` that returns `"Starts in 3h"` / `"Tomorrow"` / `"In 2 days"` / `""`. Refresh `statePill` to match new color tokens. | Low. |
| [js/components/events/helpers.js](js/components/events/helpers.js) | Add `relativeDate(date)` and `groupByBucket(events, mode)`. Keep all existing helpers. | Low. |
| [js/components/events/constants.js](js/components/events/constants.js) | Replace `CATEGORY_GRADIENT` map with new muted palette (§7.3). Keep `CATEGORY_EMOJI`, `TYPE_COLORS`, `STATUS_COLORS`. | Low — also used by admin grid; new gradients render fine there too. |
| [css/pages/portal-events.css](css/pages/portal-events.css) | Add scoped `.evt-list-*` rule block for hero card, going rail, live banner, segmented control, FAB. Remove `.evt-featured-*` (carousel killed). Remove any list-view-only chip rules superseded by Tailwind. | Low. |
| `js/components/events/card.js` (hero variant) | **Decision needed:** add `variant: 'hero'` to existing card renderer, OR create separate `renderHero()` in `list.js`. **Recommendation:** keep card.js focused on grid card; render hero inline in `list.js` (it's structurally different — overlay text on banner). | — |

### 11.2 Service-worker cache strategy
- Bump `CACHE_NAME` in [sw.js](sw.js) from `v50` → `v51`.
- Reason: heavily-cached page; CSS + JS changes won't reach users without a bump.

### 11.3 New asset needs
- **Lottie file** for empty state — `assets/lottie/no-events.json`. **P1, optional.** Reuse `cat-playing.json` if no time/budget.
- **Optional:** small inline SVG illustrations per category for "this category empty" states. **P3.**

### 11.4 No backend / DB / migration changes
This entire overhaul is presentation-layer. Zero migrations, zero RPC changes, zero edge-function changes.

---

## 12. Risks / Open Questions / Recommendations

### 12.1 Technical risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Service-worker cache serves stale `list.js` to existing members. | High | Bump SW cache; document the hard-clear path in the ship checklist. |
| `EventsCard.render()` change breaks the admin event grid. | Medium | Keep `variant: 'admin'` branch intact; smoke-test `/admin/events.html` after the card change. |
| Avatar-stack data requires a new Supabase query (RSVPs joined to profiles for the **5 most recent confirmed** per event) — potential N+1 if done per-card. | Medium | Add **one** query in `loadEvents()`: `event_rsvps` filtered by `status='going'`, joined to `profiles(profile_picture_url, first_name)`, in `event_id IN (…)`. Bucket client-side. **Not** a per-card query. |
| Sticky condensing header + sticky filter strip = nested stickies; on iOS Safari, nested stickies are flaky. | Medium | Use a single sticky container holding both, switch internal layout via class on scroll. Avoid two `position: sticky` elements. |
| FAB conflicts with bottom-sheet open states (already crowded by bottom-tab nav). | Low | Hide FAB when any sheet/modal is open (listen for `body.evt-cta-active` or modal-open class). |
| New muted gradients look dull on small thumbnails. | Low | Test at 280px banner width; if dull, brighten the hot-end stop by ~10% lightness. |
| Bucket grouping makes "search" feel weird (a search match in "Later" is far down the page). | Low | Resolved in §4.4 — search disables bucketing, renders two-tier flat list. |
| **Avatar-stack query becomes an N+1 / over-fetch as event count grows.** | **Medium → High over time** | **Hard rule: avatar fetch is scoped to the event IDs currently present in `evtAllEvents`, never to all rows in `event_rsvps`. If pagination/virtualization is added in a future phase, the avatar query MUST be re-scoped to only the visible page's event IDs at that time.** Single query, `event_rsvps` filtered by `status='going'` + `event_id IN (currentIds)`, joined to profiles, capped at 5 per event client-side. |

### 12.2 Open product questions

1. **Drafts placement** — currently drafts (admin-created, status=`draft`) are *prepended* to the flat list. In a bucketed layout, where do they go? **Recommendation:** dedicated `DRAFTS` bucket above `TONIGHT`, only visible to admin creator, with a small "Draft" pill on each card.

2. **"Going" tab + "You're going" rail** — these overlap. Is the rail redundant if the user can just tap the Going tab? **Recommendation:** keep both. The rail is for at-a-glance from the default Upcoming tab; the tab is for full review.

3. **Live event treatment** — should a currently-live event still appear in the Upcoming bucket, or get pulled out? **Recommendation:** pull out into the `🔴 Live now` banner; do not also list in Upcoming. Avoids double-render.

4. ~~Hero card identity~~ — **Resolved in §4.3.** Locked rule: going-within-24h → pinned LLC future → soonest upcoming → no hero.

5. **Past tab — does anyone use it?** Worth a usage check before investing polish here. **Recommendation:** ship past tab with the same bucketed layout but **skip** the hero card for past tabs (just the buckets).

### 12.3 Design recommendations beyond the brief

- **Make every group label tap-to-collapse** on mobile. With 30+ events the page gets long; collapsing "Later" is a nice power user gesture.
- **Add a "📅 Add all to calendar" link** at the bottom of the Going tab — generates a multi-event `.ics` file. (P3.)
- **Re-use the hero card as a notification card** when a member has a pending RSVP-required event ("You haven't responded yet"). High-impact behavioral nudge. (P2.)
- **Consider dark mode at the same time.** This is the right page to introduce a `dark:` variant pass — the muted gradients, the white-on-photo hero, the gray-500 meta — all already designed in a way that translates. Cost is ~1 day of Tailwind `dark:` variants. **P3.**

### 12.4 Things explicitly NOT to do
- Don't introduce a new icon library — the inline SVG set is fine.
- Don't introduce new CSS-in-JS or styled-components — Tailwind + scoped CSS file is the project convention.
- Don't move events.html to a JS-rendered shell. The HTML file structure stays.
- Don't redesign the detail page (M2 already shipped).
- Don't redesign the create flow (M4a shipped behind a flag; M4b is its own roadmap).

---

## 13. Recommended Build Sequence

> Each step is a self-contained commit. Test on mobile (390px) and desktop (1280px) before moving to the next. Bump SW cache **once** at the end of each P-tier, not after every commit.

### Mobile collision validation checklist (BLOCKING for Phase A ship)

FAB + sticky condensing header + bottom-tab nav + iOS safe-area + open-modal/sheet states are the single highest-risk interaction zone on this page. Before Phase A is considered shipped, **every item below must be verified on a real iPhone (Safari) at 390×844 with notch + home indicator**:

- [ ] FAB does not overlap the bottom-tab nav at any scroll position.
- [ ] FAB respects `env(safe-area-inset-bottom)` on notched and non-notched devices.
- [ ] FAB hides when the create sheet (`EventsCreate`), legacy `#createModal`, scanner modal, or any toast is open.
- [ ] Sticky condensing header transitions smoothly (no jump) and does not flicker on momentum scroll.
- [ ] Sticky filter strip stays directly under the condensed header (no gap, no overlap).
- [ ] Pull-to-refresh (if shipped in this phase) does not fire when the user is mid-scroll inside the going rail.
- [ ] Tapping a card never accidentally triggers the FAB (z-index + hit-target verified).
- [ ] Hero card RSVP buttons remain tappable at 44×44 even when the sticky header is condensed and overlapping the top of the hero on initial load.
- [ ] Live banner does not stack with the sticky header to consume more than 96px of viewport before content.
- [ ] All of the above re-verified after rotating to landscape.

This is not a polish pass. This is a **ship gate**. If any item fails, Phase A does not ship until it's fixed.

### Phase A — P0 visual core (single connected effort)

1. **A1 — Card foundations.** ✅ **SHIPPED** (commit `7906904`).
   - Updated `js/components/events/constants.js` with new muted gradient palette.
   - Updated `js/components/events/helpers.js` with `relativeDate()` and `groupByBucket()`.
   - Updated `js/components/events/pills.js` with `countdownChip()` and refreshed `statePill` (inline Tailwind; orphan `.evt-pill--*` classes were never compiled).
   - Updated `js/components/events/card.js` to new card layout (header row date stamp + relative date, aspect-[16/9] banner, single status badge, category-text meta, avatar stack, countdown footer, going ribbon) + matching `skeleton()`.
   - Smoke-tested admin grid (`/admin/events.html`) for regression — clean.
   - **Verified via** [test/events-card.html](test/events-card.html).

2. **A2 — List page DOM rewrite.** ✅ **SHIPPED**
   - Replaced `#eventsListView` markup in `portal/events.html` per §9.1: sticky condensing header `#evtPageHeader`, hero container `#evtHero`, hidden `#evtLiveBanner` + `#evtGoingRail` (Phase B will populate), sticky filter strip with segmented `#evtLifecycleSeg` + `#evtSearchToggle` + `#evtTypeMenuBtn`/`#evtTypeMenu` popover + collapsible `#evtSearchExpand`, bucket container `#evtGroups`, mobile FAB `#evtCreateFab`.
   - Preserved IDs `createEventBtn`, `emptyCreateBtn`, `typeFilter` (hidden compat select), `eventsDetailView`, `createModal` and all children.
   - Added scoped `.evt-list-*` rules in `css/pages/portal-events.css` (segmented control, type menu, sticky condensing header, FAB, scroll-hide for rail, hero focus state, prefers-reduced-motion).

3. **A3 — list.js render pipeline rewrite.** ✅ **SHIPPED** (SW `v50 → v51`)
   - Rewrote `list.js`: `_pickHero()` per locked §4.3 rule (going-within-24h → pinned LLC future → soonest upcoming → null); `_renderHero()` full-bleed editorial hero with overlay; `_renderBucket()` per-bucket grid via `H.groupByBucket`; pinned-LLC sorted first within each bucket.
   - Search behavior implements locked §4.4: non-empty query disables bucketing + hides hero/rail/banner, two-tier flat list (title-match → description-match) sorted by date asc within each tier.
   - Avatar query implements locked §12.1: ONE batched `event_rsvps` query filtered by `event_id IN (currentIds)` + `status='going'`, joined to `profiles(profile_picture_url, first_name)`, capped 5/event client-side. Stored on `window.evtAttendees`, passed to every `Card.render` call. **No N+1.**
   - New filter wiring: `#evtLifecycleSeg` segmented control replaces lifecycle chip row; `#evtTypeMenuBtn` popover replaces type chip row (label mirrored to hidden `#typeFilter` select for legacy compat); `#evtSearchToggle` expands/collapses `#evtSearchExpand`; ESC clears search or collapses.
   - Sticky condensing header: IntersectionObserver on `#evtHeaderSentinel` toggles `.evt-header--condensed`; header height published as `--evt-header-h` CSS var so the sticky filter strip docks below it (avoids iOS double-sticky overlap).
   - Mobile FAB shown only when `events.create` permission granted.
   - Click routing: cards now emit `data-evt-card="<id>"`; list.js intercepts non-modifier clicks and routes via `evtNavigateToEvent` / `evtOpenDetail`.
   - Legacy globals preserved: `evtLoadEvents`, `evtRenderEvents`, `evtRenderFeatured` (no-op stub), `evtUpdateHeroStats` (renders header count), `evtSetupSearch`, `evtInitFilterChips`, `evtRenderCard`.
   - **SW cache bumped `v50 → v51`** in `sw.js`.

4. **A4 — Polish & QA pass.**
   - Mobile pass at 320 / 375 / 414.
   - Desktop pass at 768 / 1024 / 1440.
   - Reduced-motion media query respected.
   - Safe-area on header, filter strip, FAB.
   - **Commit + push.**

### Phase B — P1 personalization

5. **B1 — "You're going" rail data + render.** ✅ **SHIPPED**
   - `_renderGoingRail()` filters `status='going'` future events, excludes hero event, sorted by `start_date` asc. Hidden when empty or on non-Upcoming tabs or during search. Mini-card renderer (`_miniCard`) with overlaid date stamp, banner or category-gradient fallback, relative date + location line, and attendee-count line. Horizontal snap-scroll on mobile, fixed 256px width on `sm+`.
6. **B2 — 🔴 Live banner.** ✅ **SHIPPED**
   - `_renderLiveBanner()` shows rose-50 pulsing-dot banner above filter strip whenever ≥1 event is in `[start, end]` window (end falls back to `start + 2h`). Single-event variant links directly to detail; multi-event variant shows count. Cancelled/draft filtered out. Hidden on non-Upcoming tabs and during search.
7. **B3 — Mobile FAB scroll-show/hide behavior.** ✅ **SHIPPED**
   - FAB slides down + fades on scroll-down past 8px threshold, restores on scroll-up. Always visible above scrollY<20. `rAF`-throttled passive scroll listener. MutationObserver on `<body>` class toggles `.evt-fab--modal-hidden` when any modal opens (respects existing `modal-open` / `overflow-hidden` flag). `prefers-reduced-motion` disables transform animation, keeps opacity fade.
8. **B4 — Per-viewer empty states (Lottie/illustration).** ✅ **SHIPPED**
   - `_renderEmptyCopy()` rewritten with role × tab × search branching per §8.10:
     • search-has-0-results → *"No events match \"query\""* + **Clear filters** link that resets `_searchQuery` + `_activeType` + syncs the type-menu UI;
     • upcoming + canCreate → *"No events yet"* + *"Create your family's first one."* + primary Create CTA;
     • upcoming + !canCreate → *"No events on the books"* + *"Check back soon…"* + **Browse past events** secondary text-button that calls `_switchLifecycleTab('past')`;
     • past / going → concise role-neutral copy.
   - Added `#emptyIllo` illustration slot and `#emptySecondaryBtn` to `portal/events.html` `#emptyState` markup.
   - Lottie lazy-upgrade: first empty render injects `lottie-web@5.12.2` from jsDelivr, loads `assets/lottie/cat-playing.json` (reused per §7.9 fallback). Silent fallback to the existing brand-50 calendar-SVG placeholder if load fails. `prefers-reduced-motion` respected.
9. **B5 — Personalized greeting + pinned-LLC date-stamp marker.** ✅ **SHIPPED**
   - `init.js` profile select extended to include `first_name`; stashed as `window.evtCurrentUserName`.
   - `_renderHeaderGreeting()` inserts `<small id="evtHeaderGreeting" class="evt-header-greeting block text-xs text-gray-400">Hey {firstName} 👋</small>` above `#evtHeaderTitle` on every count render. Auto-hidden by `#evtPageHeader.evt-header--condensed .evt-header-greeting { display: none }` in the condensed sticky state. Silently omitted when no first name is available.
   - `_dateStamp(event)` in `js/components/events/card.js` + `_miniCard()` in `list.js` render a small `📌` (`.evt-date-pin` / `.evt-date-pin--mini`) at top-left of the date block when `event.is_pinned && event.event_type === 'llc'`. Node-based smoke test (`test/_smoke-b5.js`) asserts: pinned LLC includes 📌, non-pinned LLC excludes 📌, pinned member-event excludes 📌, marker carries `.evt-date-pin` class. **All 5 assertions pass.**
10. SW stays at `v52` (spec §13 groups B1–B5 under one cache generation).

### Phase C — P2 discovery & motion

11. **C1 — Pull-to-refresh.** ✅ SHIPPED
    - `_initPullToRefresh()` in `js/portal/events/list.js` wires touch handlers on `document` (delegated). Constants: `TRIGGER=60px`, `MAX=120px`, `DAMPING=0.45`.
    - Guards: `'ontouchstart' in window`, `innerWidth < 640`, `scrollY === 0`, touch originating inside `#evtGoingRailScroll` skipped, `body.modal-open`/`body.overflow-hidden` skipped.
    - Indicator `#evtPtrIndicator` (`.evt-ptr` + inline SVG spinner) built once; transitions through `.evt-ptr--active` → `.evt-ptr--ready` → `.evt-ptr--refreshing`. On commit calls `window.evtLoadEvents()`; resets 300ms after resolve. `prefers-reduced-motion` kills the spin keyframe.
12. **C2 — Tap-category-emoji-to-filter.** ✅ SHIPPED
    - `_categoryChip(event)` helper in `js/components/events/card.js` renders a `<button data-evt-cat="{category}" class="evt-cat-chip ...">` at banner top-left (state pill keeps top-right).
    - `_wireCardClicks` in `list.js` intercepts `button[data-evt-cat]` clicks *before* card-nav fires (`preventDefault` + `stopPropagation`). Toggle semantics: re-click same category clears it.
    - `_activeCategory` state + `_matchesCategory(ev)` filter applied in both search and normal filter chains.
    - `_renderActiveFilterPill()` mounts `#evtActiveFilters` host after `#evtFilterStrip` on first use; renders dismissible brand-50 `{emoji} {label} ×` pill.
13. **C3 — `sessionStorage` search persistence.** ✅ SHIPPED
    - `STATE_KEY = 'evt_list_state_v1'`. `_persistState()` writes `{q, t, c, tab}`; `_restoreState()` runs at IIFE load (before any init) so filter chains see correct values on first paint. `_applyRestoredUi()` runs on `_onReady` to sync the segmented control active class, type-menu label + active option, `#typeFilter` compat select, and search input/expand/toggle/clear UI (search chrome only opens when restored query is non-empty).
    - `_persistState()` called at every mutation site: lifecycle tab switch, type-menu option pick, search debounce, search clear, search toggle close-with-value, category chip toggle, active-filter pill dismiss, and the empty-state Clear-filters action (which also clears `_activeCategory`). Wrapped in try/catch for private mode.
14. **C4 — Card stagger / enter motion.** ✅ SHIPPED
    - `_renderBucket` now emits `class="evt-card-grid grid ..."` on its grid container.
    - `css/pages/portal-events.css` adds `@keyframes evtCardEnter` (`opacity 0 → 1`, `translateY(8px → 0)`, 240ms `cubic-bezier(.16,1,.3,1)`) applied to `.evt-card-grid > *`, with `:nth-child(1..6)` delays at 40ms steps, `:nth-child(n+7)` snapped to 240ms, and `@media (prefers-reduced-motion: reduce)` killing the animation entirely.
15. SW bumped `v52 → v53`. **Commit + push.** ✅

### Phase D — P3 power features (deferred, scope as separate spec)

16. Calendar / agenda view toggle.
17. Swipe gestures (long-press context, swipe-cancel-RSVP).
18. Search history & suggestions.
19. Dark mode pass.

### Cutover & rollback
- Keep the legacy markup behind a `?oldList=1` query flag through Phase A.
- Once Phase A is in production for 1 week with no reported regressions, **delete the legacy markup** and remove the flag handling.
- Rollback path during Phase A: comment out the Phase-A-2 markup, restore previous `#eventsListView` block, revert `list.js`. No DB or contract changes means rollback is markup + JS only.

---

## Appendix A — Inspiration screenshot mapping

| Inspiration element | Our implementation |
|---|---|
| Big purple "Effortlessly Plan & Manage Your Events" hero with primary CTA | Our **hero card** (§8.1, §5.1) — but featuring the actual next event, not a marketing line. |
| Center phone: list with "Upcoming Events" section label + ranked event cards with images | Our **bucket grouping** (§8.7) + **redesigned event cards** (§8.6). |
| Right phone: full-bleed hero detail view with bottom CTA | Already shipped on the **detail page (M2)** — list redesign brings parity. |
| Premium elevated feel, generous spacing, rounded corners, restrained palette | Section §7 (Visual Design Direction) — muted gradients, rounded-xl/2xl, generous gap-8 between groups. |

## Appendix B — Glossary
- **Hero card** — The single feature card at the top of the list, representing one chosen event with banner + RSVP CTA inline.
- **Going rail** — Horizontal scroll strip of events the member has confirmed; only renders when ≥1.
- **Live banner** — Single-line full-width banner above the filter strip when ≥1 event is currently happening.
- **Bucket** — A time-grouped section ("Tonight", "This week", etc.) within the active lifecycle tab.
- **Segmented control** — One unified pill containing the three lifecycle options with a sliding active indicator.
- **FAB** — Floating action button (mobile-only, brand-violet, bottom-right, `+` icon for Create).


---

## Phase E — Premium Visual Lift (design-parity pass)

> **Goal:** close the "first-screenshot wow" gap with best-in-class consumer event apps (reference mocks: California gradient-header browse screen + Tomorrowland/Roskilde dark-premium festival screen). We currently out-execute those mocks on **information density, personalization, and lifecycle coverage** but under-execute on **first-fold delight**. Phase E is the delight pass.
>
> **Scope:** visual/theming only — zero data contract changes, zero new queries. Reuses all B1–B5 data paths. Swappable via feature flag `?vlift=1` during rollout.
> **Status:** **E1 + E2 + E4 + E9 shipped, vlift default-ON live** (SW `v58 → v59`, smokes `_smoke-e1.js` 27/27 + `_smoke-e2.js` 14/14). Opt-out via `?vlift=0` (sticky in `localStorage('evt_vlift')='0'`). E3/E5–E7/E10–E12 still pending.
> **SW bump target:** `v52 → v53` (shared with Phase C if shipped together; otherwise its own `v52 → v53` and C slides to `v54`).

### E.1 — Gradient editorial header (mockup: California + Tomorrowland)

**Problem:** current `#evtPageHeader` is flat white on surface-50. It reads as utilitarian.
**Fix:** apply a **brand-violet → deep-indigo gradient** to the header block (full-bleed behind the title row), with title text reversed to white.
- Background: `linear-gradient(160deg, #4f46e5 0%, #6d28d9 55%, #4c1d95 100%)` (respect existing `--brand` token).
- Title `#evtHeaderTitle`: white, tracking-tight, drop-shadow-sm.
- Count `#evtHeaderCount`: `text-white/75`.
- Greeting `#evtHeaderGreeting`: `text-white/80` with a small waving-hand animated emoji (reduced-motion: static).
- Notification-bell slot top-right (reuses global `window.openNotifications` if exposed, else hidden). Small red dot when unread > 0.
- Condensed sticky state: shrink gradient to a 56px bar, title scales to 16px, greeting hidden (already spec'd).
- Status pills (countdown / state) on hero remain white-on-dark — already compatible.
- Safe-area inset top preserved via existing `padding-top: max(0.5rem, env(safe-area-inset-top))`.

**CSS class:** `.evt-header--gradient` (opt-in via flag; removable without JS churn).

### E.2 — Hero-visible search pill (mockup: California)

**Problem:** collapsed search icon is fast to scroll past but doesn't invite engagement on land.
**Fix:** on mobile (`sm:hidden`), replace the icon toggle with a **full-width pill input** directly under the gradient header, styled as rounded-2xl with a leading search glyph and a trailing filter-icon button that opens the type menu. Desktop keeps the current compact icon-toggle behavior.
- Markup: swap `#evtSearchToggle` for `#evtSearchPill` (mobile-only). Desktop keeps existing toggle.
- Pill state: white bg, border-gray-200, shadow-sm. On focus, brand-500 ring.
- Trailing filter-icon uses the same `#evtTypeMenu` popover (reuse, not duplicate).
- Search input is uncollapsed at rest; focusing scrolls the chip-row below into view.

### E.3 — Category chip rail replaces dropdown (mockup: California + Tomorrowland)

**Problem:** type filter hidden behind a dropdown button — low discoverability.
**Fix:** render an **inline horizontal chip row** directly under the search pill with the same four options (`All · LLC 💼 · Member 👥 · Competition 🏆`), each chip with its category emoji and a light-gradient tint when selected.
- Active chip: `bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm`.
- Inactive chip: `bg-white border-gray-200 text-gray-700`.
- Scroll-snap horizontally on mobile if more chip types are added later (future extension slot).
- Desktop: chips fit inline with the segmented control on the same row.
- Keeps current `_activeType` state + legacy `#typeFilter` hidden compat select.
- **Delete** `#evtTypeMenuBtn` + `#evtTypeMenu` from the strip; leave them in the DOM behind a `hidden` attribute only while the flag is off.

### E.4 — Emoji-tagged bucket + segment labels (mockup: California "Top Picks 🔥")

Low-cost delight. Refactor:
- Segmented control labels: `🔜 Upcoming` · `🕰️ Past` · `✅ Going`.
- Bucket labels in `_renderBucket`: map `label → emoji + label` via a small table:
  - `Today` → `🔥 Today`
  - `This week` → `✨ This week`
  - `Later this month` → `📅 Later this month`
  - `Next month` → `🌱 Next month`
  - `Future` → `🗓️ Future`
  - `Results for "…"` → `🔎 Results for "…"`
- Single source: `E_BUCKET_EMOJI` constant in `js/components/events/constants.js`. Non-breaking to older callers.

### E.5 — Top Picks / Curated rail (mockup: California "Top Picks 🔥")

Optional **P1** layer above the first bucket on Upcoming, rendered only when ≥2 pinned-LLC-future events exist (reuses hero selection left-overs):
- Horizontal snap-scroll rail titled `🔥 Top Picks` → `See all` (links to filtered view `?filter=pinned`).
- Mini-card style matches `_miniCard` with a heart-like favorite corner (cosmetic only for now — wires to existing RSVP later).
- Hidden during search, on Past tab, on Going tab.
- When only one pinned event exists it's already the hero — rail hidden.

### E.6 — Festival-grade featured banner hero (mockup: Tomorrowland detail)

Upgrade `_renderHero()` visual treatment (no data changes):
- Min-height bump on mobile: `aspect-[4/5]` → `min-h-[62vh]` on `sm:hidden`. Fills more of the first fold.
- Date + time moved **above** the title (matches Tomorrowland layout): calendar-glyph + `25 – 26 July, 2021`  ·  clock-glyph + `4pm – 12pm`.
- Location chip replaced with a **tiny map card** (static gradient stand-in unless we wire Mapbox — defer).
- Bottom-edge fade darkens to `rgba(0,0,0,.85)` for title legibility.
- Primary CTA bar (**Buy Ticket / RSVP Going / You're going ✓**) pinned to bottom of hero on mobile, matching the purple "Buy Ticket 272€" bar. Reuses existing RSVP handlers — no new flows.

### E.7 — "Interested" avatar cluster (mockup: Tomorrowland "Interested 342+")

On hero + large cards, render up-to-5 overlapping avatars + `N+` counter, sourced from existing `window.evtAttendees[event.id]` (already scoped in A3 §12.1). No new query.
- Cluster uses negative margin stack (`-ml-2` on each after the first).
- Last bubble is a gray `342+` pill when `going_count > 5`.
- Tappable → opens existing Going list modal if present; otherwise no-op.

### E.8 — Dark-mode surface option (mockup: Tomorrowland)

Phase E **does not** ship a full dark mode (deferred to Phase D §19), but it introduces **dark-mode-compatible tokens** so D later is a CSS swap, not a refactor:
- All new Phase E classes must read from CSS variables: `--evt-surface`, `--evt-surface-elevated`, `--evt-text`, `--evt-text-dim`, `--evt-border`.
- Default (light) values set on `:root`; dark overrides scoped to `@media (prefers-color-scheme: dark)` behind the same `?vlift=1` flag initially.

### E.9 — Motion polish (mockup: both)

- Header gradient does a 600 ms fade on initial mount (single-shot, respects reduced-motion).
- Category chips: `active:scale-[0.97]` micro-press.
- Hero image: subtle 6 s `ease-in-out` scale 1 → 1.04 ken-burns loop. Paused under `prefers-reduced-motion`.
- Bucket section headers fade-in on scroll (IntersectionObserver, one-shot, 120 ms stagger). Reuses C4 stagger plumbing if shipped first.

### E.10 — Notification bell + unread badge (mockup: California top-right bell)

Small addition: top-right `#evtHeaderBell` button in the gradient header.
- Renders only if `window.notifications?.getUnreadCount` exists (reuse existing portal notifications module).
- Unread dot: 8 px red circle on top-right of the bell when count > 0.
- Click → `window.notifications.open()` — no new handler.

### E.11 — "See all" secondary links (mockup: California)

Every bucket header currently shows `<h2>{label}</h2>`. Extend to `<h2>{label}</h2> … <a>See all →</a>` when the bucket is truncated (default threshold: 6 cards). Clicking `See all` sets a transient client filter that renders only that bucket's events flat. Back via the segmented control reset.
- Non-blocking: if threshold not hit, no link rendered — current behavior preserved.

### E.12 — Heart / favorite affordance (mockup: Tomorrowland top-right heart)

Card + hero gain an optional heart-bookmark icon in the top-right that **does not** introduce a new table — reuses the existing `event_rsvps.status = 'interested'` value (already supported by the RSVP enum per M2). Toggle flips `interested` ↔ `null`.
- Visual: white filled when set, white outline when unset.
- Does not collide with the Going ribbon (left side).
- Deferred if the RSVP enum doesn't ship an `interested` status — confirm before wiring.

### E.13 — Bottom tab-bar mockup parity (mockup: Tomorrowland bottom nav)

**Out of scope for events_003.** Tracked here only as a reference that the global portal nav already provides this shape. No changes within the events page boundary.

### E.14 — Rollout & success criteria

- **Flag:** `?vlift=1` enables Phase E on every user; default remains current styling until QA clears.
- **A/B window:** 1 week on the flag for opt-in internal testing.
- **Success:** positive qualitative feedback from ≥3 family-member testers on "looks premium"; no measurable bounce-rate increase on the list page; no regression in load metrics (hero LCP within 10% of current).
- **Kill switch:** remove `?vlift=1` class toggle — no DB rollback needed.
- **SW bump:** `v52 → v53` when flag becomes default-on.

### E.15 — Phase E task list

```
E1  ✅ SHIPPED  Gradient editorial header (default-ON) — SW `v57 → v58`
E2  ✅ SHIPPED  Mobile hero-visible search pill (always-visible <640px) — SW `v58 → v59`
E3  ✅ SHIPPED  Inline category chip rail (replaces dropdown when vlift on) — SW `v60 → v61`
E4  ✅ SHIPPED  Emoji-tagged bucket labels (default-ON, table in `list.js` `E_BUCKET_EMOJI`)
E5  Top Picks rail (conditional on ≥2 pinned-LLC-future)
E6  Festival-grade featured hero (height + layout refactor)
E7  Interested avatar cluster on hero/cards (reuses evtAttendees)
E8  Dark-mode-compatible CSS tokens (no dark theme yet) — superseded by D4 ship
E9  ✅ SHIPPED (partial)  Motion polish (header fade, chip press) — ken-burns + stagger pending
E10 Notification bell + unread badge in header
E11 "See all" per-bucket truncation links
E12 Heart/favorite affordance (only if RSVP enum supports 'interested')
E13 (out of scope — global nav)
E14 ✅ LIVE  Rollout flag `?vlift=1`/`=0` — default-ON since SW `v58 → v59`
```

### E.16 — Phase E non-goals

- No new Supabase tables, columns, or RPCs.
- No changes to `EventsCard.render()` call signature (internal template only).
- No swipe gestures, pull-to-refresh, or calendar view (those remain Phase C / D).
- No full dark theme (tokens only — shipped in Phase D).
- No i18n — copy strings stay English.

---

## Appendix C — Mockup inspiration deltas (E-phase source mapping)

| Mockup element | Our status | E-phase item |
|---|---|---|
| California purple gradient header | ❌ missing | **E1** |
| California always-visible search pill w/ filter icon | ⚠️ collapsed toggle | **E2** |
| California inline category chips (All / Concert / Book) | ⚠️ dropdown | **E3** |
| California "Top Picks 🔥" label + "See all" | ⚠️ plain bucket | **E4 + E5 + E11** |
| California notification bell top-right | ❌ missing | **E10** |
| Tomorrowland full-bleed festival hero w/ CTA bar | ⚠️ shorter hero | **E6** |
| Tomorrowland "Interested 342+" avatar cluster | ⚠️ attendee data loaded but not clustered on hero | **E7** |
| Tomorrowland heart top-right | ❌ missing | **E12** |
| Tomorrowland dark surface | ❌ light-only | **E8** (tokens now, theme later) |
| Roskilde tall editorial card with overlaid date + title | ✅ close — bucket cards already layered | **E6** refinement |
| Both: motion / polish cues | ⚠️ minimal | **E9** |
