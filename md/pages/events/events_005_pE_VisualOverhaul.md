# 🎨 `portal/events.html` — Phase F Visual Overhaul (events_005)

> **Status:** 📋 **Spec drafted** — no code shipped. Targets parity with the supplied mockup (desktop 2‑column "community events hub" layout with calendar + RSVP rail). All work is gated behind `body.evt-vlift` (default‑ON, `?vlift=0` opt‑out) exactly like Phase E.
>
> **Spec origin:** user supplied screenshot reference on 2026‑04‑23 after Phase E shipped (SW `v68`). This doc *continues* the Phase E numbering as **Phase F**.
> **Scope:** `/portal/events.html` list view only. No schema, no RPC, no edge-function changes. All interactions reuse existing `evtHandleRsvp`, `evtNavigateToEvent`, `evtAttendees`, `window.notifBtn`, etc.
> **Non-goal:** dark mode (removed at user request in commit `f62a71d`, SW v68). This spec stays light-only.
> **Pre-reqs shipped:** E1 gradient header, E2 search pill, E3 chip rail, E4 bucket emoji, E5 Top Picks, E6 festival hero, E7 attendee cluster, E9 motion, E10 header bell, E11 per-bucket see-all, E12 heart favorite, E14 vlift flag.

---

## 1. Visual delta — current vs. mockup

| # | Area | Current state (post-Phase E) | Mockup target | Delta size |
|---|---|---|---|---|
| 1 | Greeting | `<h1>Events</h1>` + count line | "Welcome back, Justin 👋" small line **above** `<h1>Events</h1>`, subtitle "Discover and join events in your community." below | S |
| 2 | Page layout | Single column, `max-w-5xl` | Two columns ≥`lg`: main (flex-1) + right rail (~320px). Collapses to single column on `md` and below | **L** |
| 3 | Tab strip | Segmented control (pill) "Upcoming / Past / Going" | **Underline tabs** "Upcoming / Past / Going / **Saved**" — no background, active = indigo underline + bold | M |
| 4 | Filter row | Icon-only search + view-toggle + "All" dropdown | Full-width pill **search input** ("Search events, hosts, or locations…") + **Filters** dropdown + **Date** dropdown + view-toggle (grid/list) | M |
| 5 | Chip rail | "All / 💼 LLC / 👥 Member / 🏆 Competition" (E3) | Same chips but **with outline-icon SVGs** (building, user-group, trophy) not emojis; active = filled purple | S |
| 6 | Hero layout | Tall festival hero (portrait 16:9 w/ image) | **Horizontal landscape** gradient card: emoji/image thumbnail (left) + **white vertical date chip** + title column + right-side description + white "View Details" pill | **L** |
| 7 | Card grid | List of cards per bucket (`evtCard`) | **3-col grid** on `lg`, 2-col on `md`, 1-col below. Each card: top image (16:9) + white vertical date chip overlay + Live pill + title + badges + attendee cluster + RSVP outline button | M |
| 8 | Create-event tile | FAB button on mobile, header button on desktop | **Dashed-border tile slotted INTO the grid** as the last cell: `+` icon, "Create an Event", "Share your ideas…" subtitle | S |
| 9 | Bucket header | Emoji + "Label (N)" | "Upcoming Events" (no emoji when mockup shows top-level) + `5 events` muted count on the right | S |
| 10 | Right rail — calendar | None | **Mini month calendar** with `< >` nav, weekday row, day grid, current day = filled purple circle, event-day dot indicators | **L** |
| 11 | Right rail — my RSVPs | Going-rail (top of main) | **"Your Upcoming RSVPs"** card — up-to-3 thumbnails stacked vertically + unread-style count badge + "View All My Events" button | M |
| 12 | Right rail — overview | None | **"Events Overview"** stat card: This Month (N) / You're Going (N) / Communities (N) + "View Full Calendar" link | M |

**Classification:** F2 (2-col layout), F6 (horizontal hero), F10 (mini calendar) are large structural deltas; the rest are surface refactors.

---

## 2. Information architecture (desktop ≥`lg`)

```
┌─────────────────────────────────────────────────────┬──────────────────────┐
│  Welcome back, Justin 👋                            │  ┌────────────────┐  │
│  Events                             [+ Create] [🔔] │  │ April 2025 < > │  │
│  Discover and join events in your community.       │  │  S M T W T F S │  │
│  ──────────────────────────────────────             │  │  · · · · · · · │  │
│  Upcoming  Past  Going  Saved                       │  │  (day grid)    │  │
│  ─────                                              │  └────────────────┘  │
│  [🔍 Search…]  [Filters▾]  [Date▾]   [⊞] [☰]       │  ┌────────────────┐  │
│  [All] [LLC] [Member] [Competition]                 │  │ Your Upcoming  │  │
│  ┌──────── FEATURED EVENT ───────────────────────┐  │  │ RSVPs      [3] │  │
│  │ 🎂  [APR]  Birthday Cook Out     [Live]      │  │  │ • raffel       │  │
│  │    [ 1 ]  Hosted by LLC · Celeb              │  │  │ • jkj          │  │
│  │    [WED]  📍 Grove Park  🕒 7:30 PM          │  │  │ • Birthday…    │  │
│  │    👥 24 going          [View Details]       │  │  │ [View All]     │  │
│  └──────────────────────────────────────────────┘  │  └────────────────┘  │
│  Upcoming Events                          5 events  │  ┌────────────────┐  │
│  ┌──────┐  ┌──────┐  ┌──────┐                       │  │ Events Overview│  │
│  │ card │  │ card │  │ card │                       │  │ This Month  5  │  │
│  └──────┘  └──────┘  └──────┘                       │  │ Going       3  │  │
│  ┌──────┐  ┌ + ───┐                                 │  │ Communities 3  │  │
│  │ card │  │ tile │                                 │  │ [View Cal.]    │  │
│  └──────┘  └──────┘                                 │  └────────────────┘  │
└─────────────────────────────────────────────────────┴──────────────────────┘
```

Mobile (<`lg`): single column, right-rail widgets collapse into collapsible sections below the grid (calendar hidden by default, RSVPs + overview become horizontal rails or are hidden entirely — see F10/F11/F12 individual specs).

---

## 3. Phase F breakdown (ship order)

> Each F-step follows the established cadence: edit → SW bump → dedicated `test/_smoke-fN.js` → widen prior smoke SW pin to range → full regression → commit. vlift gating on every DOM change. No backend work.

### F1 — Greeting + subtitle block (S)

**What:** Replace the current single `<h1>Events</h1>` + count line with:
```html
<div class="evt-greeting">
  <p class="evt-greeting-hello">Welcome back, <span data-greeting-name>Justin</span> 👋</p>
  <div class="flex items-end justify-between gap-3">
    <div>
      <h1 id="evtHeaderTitle">Events</h1>
      <p class="evt-greeting-sub">Discover and join events in your community.</p>
    </div>
    <div class="flex items-center gap-2">[createEventBtn] [notifBtn slot]</div>
  </div>
</div>
```

- Pull name from `window.portalContext?.profile?.first_name` (already populated by portal shell); fallback to "there".
- The `#evtHeaderCount` line is retired (count moves to bucket header in F9).
- Hide greeting subtitle on `<sm` to save vertical space.

**Files:** `portal/events.html`, `css/pages/portal-events.css`, `js/portal/events/list.js` (greeting hydration in `_onReady`).
**SW:** v68 → v69. **Smoke:** `test/_smoke-f1.js` (5 checks).

---

### F2 — Desktop 2‑column shell (L)

**What:** Wrap existing `<main>` content + new right rail in a CSS grid.

- New DOM (vlift-only): `<div class="evt-shell">` around main content, sibling `<aside id="evtRightRail">` (hidden on mobile, visible ≥`lg`).
- CSS: `.evt-shell { display:grid; grid-template-columns: minmax(0,1fr); gap:1.5rem } @media (min-width:1024px){ .evt-shell { grid-template-columns: minmax(0,1fr) 320px } }`.
- Widen the existing `max-w-5xl` to `max-w-6xl` (or drop the cap and let the shell do it).
- Sticky right rail inside its own scroll container: `position:sticky; top:var(--evt-header-h)`.
- `aside` is populated empty in F2 (placeholders); real widgets land in F10/F11/F12.
- Respect `prefers-reduced-motion` (no animated collapse — just immediate reflow on resize).

**Files:** `portal/events.html`, `css/pages/portal-events.css`.
**SW:** v69 → v70. **Smoke:** `test/_smoke-f2.js` (4 checks).

---

### F3 — Underline tabs + Saved tab (M)

**What:** Replace the pill-style `#evtLifecycleSeg` with an **underline tab strip** and add a **Saved** tab.

- DOM: reuse the existing `<div role="tablist">`, swap the `.evt-seg__btn` classes for a new `.evt-tab` underline style (no background, bottom border on `--active`).
- New tab: `data-filter="saved"`. Backing: filter `evt_items` by `rsvp.status === 'maybe'` (our "hearted" set — same mapping as E12). Or if more appropriate, use `window.evtSavedSet` (derive at fetch time — no DB change).
- Tab order: `Upcoming | Past | Going | Saved`.
- `aria-selected` + arrow-key navigation preserved from old segmented control.

**Files:** `portal/events.html`, `css/pages/portal-events.css`, `js/portal/events/list.js` (extend `_applyLifecycleFilter` with `saved` case).
**SW:** v70 → v71. **Smoke:** `test/_smoke-f3.js` (5 checks).

---

### F4 — Full-width filter row (M)

**What:** Replace icon-only search + type dropdown with the mockup's horizontal filter row:

```
┌─ 🔍 Search events, hosts, or locations… ────┐  [☰ Filters▾]  [📅 Date▾]   [⊞][☰]
```

- The E2 mobile search pill behavior (collapsing) stays for `<sm`. On `≥sm` the search input is **always visible** and expands to fill remaining width.
- `Filters` dropdown: opens a panel with checkbox groups for **Type** (LLC / Member / Competition) and future filters (Status, Host). Migrates the current `#evtTypeMenuBtn` dropdown. On `<sm`, opens as a bottom sheet.
- `Date` dropdown: static options — "Any date", "Today", "This week", "This weekend", "This month", "Custom…". Custom → native date-range picker (two `<input type="date">`).
- View toggle icons reorder: grid first, list second (mockup convention).

**Files:** `portal/events.html`, `css/pages/portal-events.css`, `js/portal/events/list.js` (new `_initDateFilter`, `_initFiltersPanel`).
**SW:** v71 → v72. **Smoke:** `test/_smoke-f4.js` (6 checks).

---

### F5 — Icon-chip row (S)

**What:** Replace the emoji in the E3 chip rail with outline SVG icons that match the mockup.

- Replace `<span>💼</span> LLC` → inline SVG `building-office` icon.
- `👥 Member` → `user-group` SVG.
- `🏆 Competition` → `trophy` SVG.
- `All` stays emoji-less.
- Active state unchanged (filled brand-600 bg, white text).

**Files:** `portal/events.html`, `css/pages/portal-events.css` (icon sizing).
**SW:** v72 → v73. **Smoke:** `test/_smoke-f5.js` (4 checks). Updates `_smoke-e3.js` to drop the emoji assertion if any.

---

### F6 — Horizontal festival hero (L)

**What:** Retarget the E6 hero from portrait-festival to horizontal-landscape.

- New layout (≥`sm`): `display:grid; grid-template-columns: 96px 72px 1fr auto` inside the hero.
  1. **Col 1 — Thumbnail** (96×96 rounded): event image or emoji in a soft-tinted circle on the gradient.
  2. **Col 2 — Vertical date chip** (72×~88, white pill, rounded-xl, stacks `APR / 1 / WED`).
  3. **Col 3 — Title + host + meta**: `FEATURED EVENT` small badge (keep E6's), then `<h2>` title, then `Hosted by LLC · Birthday Celebration`, then the date/time row from E6 (`📍 Grove Park · 🕒 7:30 PM`), then the E7 attendee cluster (`24 going`).
  4. **Col 4 — Description + CTA**: max-w-xs paragraph + large white pill **View Details** button. On narrow viewports this collapses below the title column.
- `Live` pill top-right **replaces** the E12 heart when status === 'live'; otherwise heart + countdown remain.
- RSVP CTA bar from E6 (`I'm going` / `Buy Raffle Ticket`) stays but becomes a secondary row below the main hero body on `<lg`, hidden on `≥lg` (replaced by the `View Details` pill + click-through to detail view where the full RSVP controls live).
- Gradient unchanged (brand-600 → brand-800 → violet-900). Dark fade removed since the hero is no longer photo-background-dominant.

**Files:** `js/portal/events/list.js` (`_renderHero` rewrite), `css/pages/portal-events.css`.
**SW:** v73 → v74. **Smoke:** `test/_smoke-f6.js` (8 checks). Widens `_smoke-e6.js` SW pin.

---

### F7 — 3-col card grid + per-card refresh (M)

**What:** Upgrade the card renderer (`_renderEventCard` or equivalent) to match mockup exactly.

- **Grid:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` on `#evtGroups > .evt-bucket > .evt-bucket-grid`.
- **Card anatomy:**
  - Top: 16:9 image area (fallback = branded gradient with category emoji centered).
  - Overlay top-left: white vertical date chip (APR / 1 / WED) matching hero.
  - Overlay top-right: `Live` pill (if status=live) or countdown chip (`in 3d`).
  - Body: title (text-base, semibold) → `Party · Member` meta row (category + host type badges) → `📍 location  🕒 time` row.
  - Footer: attendee cluster (reuse E7 helper) + `RSVP` outline-purple button (click → opens RSVP sheet / calls `evtHandleRsvp`).
- Deprecate the existing mobile-first full-width card layout in favor of this grid on `≥md`.
- **Already-going** state: button becomes "✓ Going" filled purple, click → cycles to `not_going`.

**Files:** `js/portal/events/list.js`, `css/pages/portal-events.css`.
**SW:** v74 → v75. **Smoke:** `test/_smoke-f7.js` (8 checks).

---

### F8 — "Create an Event" inline tile (S)

**What:** Append a dashed-border "Create an Event" cell as the **last grid cell** of the primary Upcoming bucket (not all buckets).

- Only render when `window.evtCanCreate === true` (reuse existing create-event permission check).
- Click → same handler as `#createEventBtn`.
- Tile content: centered `+` in a circle, "Create an Event", muted subtitle "Share your ideas and bring the community together."

**Files:** `js/portal/events/list.js`, `css/pages/portal-events.css`.
**SW:** v75 → v76. **Smoke:** `test/_smoke-f8.js` (4 checks).

---

### F9 — Bucket header refresh (S)

**What:** Update bucket header to match mockup typography.

- Current: small uppercase-tracked emoji + label (E4).
- Target: `<h2 class="evt-bucket-title">Upcoming Events</h2>` (text-lg, semibold) + muted `<span>5 events</span>` floated right.
- Keep E4 emoji for sub-buckets (Today / This Week / Later) but drop from the top-level "Upcoming" bucket to match mockup.

**Files:** `js/portal/events/list.js` (bucket header renderer), `css/pages/portal-events.css`.
**SW:** v76 → v77. **Smoke:** `test/_smoke-f9.js` (4 checks). Widens `_smoke-e4.js` SW pin.

---

### F10 — Right rail: mini calendar (L)

**What:** Build a mini month calendar widget inside `#evtRightRail`.

- `<section id="evtMiniCal" class="evt-rail-card">` containing:
  - Header row: month name + year (`April 2025`) + `‹ ›` nav buttons.
  - Weekday row: `S M T W T F S` muted small caps.
  - 6×7 day grid (42 cells). Cells from prev/next month are dimmed.
  - Current day: filled `brand-600` circle, white text.
  - Days with events: small dot under the number.
  - Click a day → filters the main grid to `date === yyyy-mm-dd`, sets `#evtDateDropdown` to "Custom".
- Pure JS (no library). Reuse event list already fetched — derive per-day counts via `eventsByDate = Map<yyyy-mm-dd, count>`.
- Collapsible on `<lg` (hidden by default behind a "Show calendar" toggle in the filter row).
- Use existing D1 calendar modal for day-details click (already built).

**Files:** new `js/portal/events/miniCal.js` (or inline in `list.js` if small), `portal/events.html`, `css/pages/portal-events.css`.
**SW:** v77 → v78. **Smoke:** `test/_smoke-f10.js` (10 checks).

---

### F11 — Right rail: "Your Upcoming RSVPs" (M)

**What:** Compact going-rail replacement for the right rail.

- `<section id="evtMyRsvps" class="evt-rail-card">`:
  - Header: `Your Upcoming RSVPs` + count pill (rose/indigo badge with `rsvps.length`).
  - List: up to 3 rows, each: 32×32 event thumbnail, title, `Apr 1, 8:00 PM` meta line. Full row clickable → detail view.
  - Footer: outlined `View All My Events` button → filters to Going tab + scrolls to top.
- Data source: `events.filter(e => e.rsvp?.status === 'going' && e.start_at > now).slice(0,3)`.
- Hidden entirely if zero RSVPs (show empty-state card "You haven't RSVP'd yet — pick an event below" only on `≥lg`).
- On `<lg`: falls back to existing E-era top `#evtGoingRail` horizontal scroll.

**Files:** `js/portal/events/list.js` (`_renderMyRsvpsRail`), `portal/events.html`, `css/pages/portal-events.css`.
**SW:** v78 → v79. **Smoke:** `test/_smoke-f11.js` (6 checks).

---

### F12 — Right rail: "Events Overview" stat card (M)

**What:** Three-row stat card with derived totals.

- `<section id="evtStats" class="evt-rail-card">`:
  - `<h3>Events Overview</h3>`
  - Row 1 — `📅 This Month / Upcoming events` → count of future events in current calendar month.
  - Row 2 — `✅ You're Going / Events` → count of `rsvp.status==='going'`.
  - Row 3 — `👥 Communities / Active communities` → count of distinct `host_type === 'llc'` + `host_type === 'group'` hosts with ≥1 event this month. If unknown, hide the row (don't invent data).
  - Footer: "View Full Calendar" link → toggles grid→calendar view (reuses existing `evtViewToggle`).
- All counts derived from in-memory event list — no new queries.
- Icons: inline SVGs (calendar, check-circle, user-group) in muted-brand circles.

**Files:** `js/portal/events/list.js` (`_renderStatsCard`), `portal/events.html`, `css/pages/portal-events.css`.
**SW:** v79 → v80. **Smoke:** `test/_smoke-f12.js` (6 checks).

---

### F13 — Notification bell badge count (S)

**What:** Mockup shows the bell with a **numeric badge** (`3`) instead of our current unread dot (E10).

- Switch `#notifBadge` from a 6px red dot to a 16px rose-500 pill with the unread count (`1`-`99`, `99+` beyond).
- If count === 0, hide.
- Reuse existing unread-count logic from `js/components/notifications.js` (already tracks count — just surface it).

**Files:** `js/components/notifications.js` (if badge text not already rendered) or `js/portal/events/list.js` (E10 mirror logic).
**SW:** v80 → v81. **Smoke:** `test/_smoke-f13.js` (4 checks). Widens `_smoke-e10.js` SW pin.

---

### F14 — Polish + QA pass (S)

**What:** Final pass addressing:

- Keyboard nav across tabs, chips, filter dropdowns, calendar day grid (arrow keys), hero CTA.
- `prefers-reduced-motion` — skip tab underline slide, date-chip hover lift.
- Screen-reader labels on icon-only buttons (view-toggle, filter icons).
- Empty state for each tab (Upcoming / Past / Going / Saved) with tailored copy + CTA.
- Hero and card image lazy-load with `loading="lazy"` + explicit `width`/`height` to prevent CLS.
- Lighthouse pass (target ≥95 a11y, ≥90 perf on mobile).

**Files:** cross-cutting.
**SW:** v81 → v82. **Smoke:** `test/_smoke-f14.js` (10 checks — keyboard, aria, loading attrs, empty states).

---

## 4. Rollout plan

| Step | Phase | SW | Risk |
|---|---|---|---|
| 1 | F1 Greeting | v69 | Low |
| 2 | F2 2-col shell | v70 | **Medium** — layout regressions on intermediate widths |
| 3 | F3 Underline tabs + Saved | v71 | Low |
| 4 | F4 Filter row | v72 | Medium — filters panel is new surface |
| 5 | F5 Icon chips | v73 | Low |
| 6 | F6 Horizontal hero | v74 | **Medium** — rewrite of E6 renderer, keep feature flag handy |
| 7 | F7 Card grid | v75 | Medium — widest surface |
| 8 | F8 Create tile | v76 | Low |
| 9 | F9 Bucket headers | v77 | Low |
| 10 | F10 Mini calendar | v78 | **Medium** — new widget |
| 11 | F11 My RSVPs rail | v79 | Low |
| 12 | F12 Stats card | v80 | Low |
| 13 | F13 Bell count | v81 | Low |
| 14 | F14 Polish | v82 | Low |

Abort / rollback per step: append `?vlift=0` to opt out. Every phase lands behind the existing `body.evt-vlift` gate.

---

## 5. Locked invariants (do not violate)

- **No schema / RPC / edge-function changes.** Saved tab maps to `rsvp.status='maybe'` (same as E12 heart) — **do not** add an `events_saved` table.
- **`evtHandleRsvp(eventId, status)`** remains the single RSVP mutator. Every new button path (F6 View Details, F7 RSVP, F11 rail click-through) reuses it.
- **`evtNavigateToEvent(event)`** remains the single navigation path to detail view.
- **`evtAttendees(eventId)`** reused for F6 hero and F7 cards — no new attendee query.
- **`#notifBtn` / `#notifBadge`** forwarding (E10) preserved; F13 only changes badge rendering.
- **vlift gating** on every DOM change — `?vlift=0` must restore the pre-Phase-F look.
- **No dark mode.** Light-only (see commit `f62a71d`).

---

## 6. Test strategy

- **Per-phase smoke:** `test/_smoke-fN.js` checks HTML hooks + CSS rules + JS init hooks + SW version (range regex).
- **SW pin widen pattern:** each new smoke uses `/jm-portal-v(\d{2,})/` with a floor ≥ its own ship version; previous smokes bump to range regex covering current + next ships (same pattern as E11→E12).
- **Regression after each phase:** full `Get-ChildItem test/_smoke-*.js | ForEach-Object { node $_.FullName }` must be green before commit.
- **Manual QA matrix per ship:**
  - Viewports: 375 (iPhone SE), 768 (iPad), 1024 (iPad Pro), 1440 (desktop).
  - States: empty events list, 1 event, 5 events, 50 events.
  - RSVP states: none, going, maybe, not_going.
  - Permissions: member view (no create btn), admin/LLC-pin view (create btn + pin).

---

## 7. Out of scope for Phase F

- Server-side search / filter indexes.
- Saved events as a first-class DB entity.
- Infinite scroll / pagination (current list is scoped by date window).
- Push notifications for calendar-day events.
- Dark mode (explicitly removed).
- Social features (share event, invite friends) — separate spec.
- Event detail view redesign — covered by `events_002`.

---

## 8. Open questions

1. **Greeting name source** — is `window.portalContext.profile.first_name` always hydrated on this page, or do we need a fresh fetch? (Confirmed present via `js/components/layout.js` shell.)
2. **Date dropdown copy** — should "This weekend" be Sat+Sun only, or Fri+Sat+Sun? (Default: Sat+Sun.)
3. **Communities count (F12)** — do we want to show distinct LLCs, distinct groups, or both? (Default: both, sum.)
4. **Create-tile placement** — last cell of the Upcoming bucket only, or after every bucket? (Default: Upcoming only.)
5. **Saved tab empty state** — what CTA to show if the user has hearted nothing? ("Tap the ❤ on any event to save it for later.")

---

## 9. Deferred / future (post-Phase F)

- G1 — Event search relevance ranking (fuzzy / tokenized, client-side).
- G2 — "Recommended for you" rail using RSVP history.
- G3 — Group-by-host toggle ("See all events by LLC", "See all by Sarah").
- G4 — Event favorites with dedicated `events_saved` table (replaces the `rsvp.status='maybe'` overload).
- G5 — Inline RSVP without opening detail view (sheet on card click).

---

_Spec drafted 2026‑04‑23 against commit `f62a71d` (SW v68, Phase E complete, dark mode removed)._
