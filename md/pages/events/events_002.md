# 📅 Events System — Overhaul Spec (events_002)

> **Status:** Planning. Successor to `events_001.md` (which is the *feature* spec — what the system does).
> This document is the *redesign / rebuild* spec — how we're going to make it feel modern, clean, and cohesive across every surface.

> **Companion file:** Keep `events_001.md` open as the feature reference. Nothing in this overhaul is allowed to *remove* functionality from that doc unless explicitly called out under **Functionality changes** in the relevant milestone.

---

## 1. Executive Summary

### What this overhaul is
A full visual + structural refresh of the Events system across **three surfaces**:

1. **Portal Events** — `/portal/events.html` (member-facing list + detail SPA)
2. **Public Event Page** — `/events/?e={slug}` (no-auth invite/RSVP page)
3. **Admin Events** — `/admin/events.html` (admin dashboard for operational management)

Plus the underlying **Create / Edit Event** flow that today lives as a giant modal inside `portal/events.html` and is shared by all coordinator workflows.

### Why it is needed
- The portal list page looks dated next to the recently-revamped pages (`admin/members`, `portal/my-finances`, `admin/hub`, `portal/feed`). Dark indigo hero + white grid feels 2023.
- The portal detail page was already partially redone ("v2") in an Airbnb style, but it's bolted on top of the old portal shell — visual mismatch between list and detail.
- The public event page is the most polished of the three but uses a completely separate inline `<style>` block (~400 lines) duplicated from `css/pages/events.css`.
- The admin dashboard is a generic table — doesn't match the rest of the modern admin pages (`hub`, `members`, `transactions`).
- The create-event modal is a 1500+ line monolith inside `events.html` that's painful to scroll on mobile.
- Event JS is spread across **16 files** in `js/portal/events/` with a global-variable pattern, mixed responsibilities, and at least one dead-code module (`detail2.js` references a non-existent `events2-detail.html`).
- Mobile UX is functional but cramped: filter chips overflow, the create modal dominates the viewport, the sticky hero on detail eats real estate, the bottom CTA bar overlaps the bottom-tab-bar in places.

### Design / product goals
- **One coherent visual language** across portal-list, portal-detail, public-page, and admin-dashboard.
- **Mobile-first.** Cards, sheets, sticky CTAs, and tap targets sized for one-handed phone use.
- **Airbnb / Eventbrite editorial feel** for the consumer surfaces (list + detail + public) — generous whitespace, big imagery, calm typography, color used sparingly and with intent.
- **Operational clarity** for the admin surface — dense but clean tables/cards in the same brand language, not a different system.
- **Smaller, well-scoped JS modules.** Move from sprawling globals to a thin namespace per surface (`PortalEvents`, `PublicEvent`, `AdminEvents`).

### Core guiding principles
1. **Same database, same edge functions, same RPCs.** This is UX/architecture, not product. `events_001.md` features stay intact.
2. **Mobile is the primary target.** Desktop is "the same UI scaled up", not a separate design.
3. **Inline Tailwind everywhere** for layout/spacing/colors. CSS files only hold things Tailwind can't express (animations, complex gradients, scroll-snap, lightbox).
4. **No inline `<script>`.** All JS lives in `js/<surface>/events/` modules.
5. **Component-style HTML helpers** (in JS) for repeated chunks (event card, status pill, info row, sheet header) — not copy-paste blocks.
6. **Progressive rollout.** Each milestone ships independently and the old surface can keep working until its replacement lands.

---

## 2. Full System Audit

### 2.1 Surface map

| Surface | Entry HTML | JS root | CSS | Audience |
|---|---|---|---|---|
| Portal list + detail | [portal/events.html](portal/events.html) | [js/portal/events/](js/portal/events/) (16 files) | [css/pages/portal-events.css](css/pages/portal-events.css) | Logged-in members |
| Public event page | [events/index.html](events/index.html) | [js/events/public.js](js/events/public.js) | [css/pages/events.css](css/pages/events.css) + 400-line inline `<style>` block in HTML | Anyone with the link |
| Admin dashboard | [admin/events.html](admin/events.html) | [js/admin/events-dashboard.js](js/admin/events-dashboard.js) | shared.css | Admins |

### 2.2 Portal `/portal/events.html` — module-by-module

The portal page is **one HTML file** that hosts both a list view (`#eventsListView`) and a detail view (`#eventsDetailView`). JS toggles between them via URL routing (`?event={slug}`).

| File | Lines (approx) | Responsibility | Notes |
|---|---|---|---|
| [state.js](js/portal/events/state.js) | 11 | Bare-minimum global state (`evtCurrentUser`, `evtAllEvents`, `evtAllRsvps`, etc.) | Pure globals, no namespace. |
| [constants.js](js/portal/events/constants.js) | ~ | Category emoji, type colors, status maps | Duplicated in `list.js` (`EVT_CATEGORY_TAG`, `EVT_CATEGORY_GRADIENT`) and in [public.js](js/events/public.js#L7-L17). |
| [utils.js](js/portal/events/utils.js) | ~ | `evtEscapeHtml`, date formatters, ordinal suffix, modal toggle | Many helpers re-implemented in `public.js` too. |
| [init.js](js/portal/events/init.js) | ~400 | DOMContentLoaded bootstrap, all `addEventListener` wiring for create modal, raffle, comp tier calculator, transportation toggle, etc. | Single huge bootstrap. Form-listener spaghetti — every conditional show/hide is here. |
| [list.js](js/portal/events/list.js) | ~600 | Load events, render featured carousel, render grid cards, search, filter chips, type filter, hero stats, countdown chips | Card markup is built as a giant template-literal string. |
| [detail.js](js/portal/events/detail.js) | ~1400 | Render the entire detail view ("v2 visual redesign" — Airbnb-inspired). Hosts: hero, info rows, RSVP block, gated content, host controls, reschedule modal, cancellation modal, lightbox, section animations, live countdown, sticky body header logic | Largest module. Self-contained "v2" — already the strongest visual, but fights with `portal-events.css`. |
| [detail2.js](js/portal/events/detail2.js) | 12 | A 12-line "bridge" that exposes `window.EV2Detail.open(id)` and redirects to `events2-detail.html?id=…` | **Dead code.** No `events2-detail.html` exists in the repo. Safe to delete. |
| [create.js](js/portal/events/create.js) | ~700 | Cost-breakdown builder, LLC field toggling, form-submit handler, banner upload, geocoding integration, preview modal | Tightly coupled to the inline form HTML in `events.html`. |
| [rsvp.js](js/portal/events/rsvp.js) | ~ | RSVP button rendering, stripe-checkout call (`create-event-checkout`), no-refund acknowledgement, waitlist join, grace-window cancel | Reasonable size, mostly fine. |
| [comments.js](js/portal/events/comments.js) | ~ | Comments list, post comment, reactions | Standalone, fine. |
| [competition.js](js/portal/events/competition.js) | ~ | Phase rendering, submission upload, voting UI, results | Self-contained, fine. |
| [raffle.js](js/portal/events/raffle.js) | ~ | Configure raffle, draw winner animation, paid-raffle entry | Self-contained, fine. |
| [documents.js](js/portal/events/documents.js) | ~ | LLC event document upload + per-member distribution | Admin-only side, fine. |
| [scrapbook.js](js/portal/events/scrapbook.js) | ~ | Past-event photo gallery + lightbox | Standalone, fine. |
| [scanner.js](js/portal/events/scanner.js) | ~ | jsQR camera scanner, QR check-in, both modes | Standalone, fine. |
| [map.js](js/portal/events/map.js) | ~ | Leaflet live map, Realtime location pins | Standalone, fine. |

**Load order matters** — the page loads them all as classic scripts and depends on `state.js` first, `init.js` last. Fragile but working.

### 2.3 Public `/events/?e={slug}` — module-by-module

| File | Notes |
|---|---|
| [events/index.html](events/index.html) | Has a **400-line inline `<style>` block** that duplicates much of [css/pages/events.css](css/pages/events.css). Inline styles win — the linked CSS is mostly unused. The HTML is a single airbnb-style scrolling page (hero → body → sections). |
| [js/events/public.js](js/events/public.js) | ~1800 lines. Single giant file. Re-implements `pubEscapeHtml`, `pubMiniMarkdown`, `pubFormatDate`, lightbox, countdown — all of which exist in portal `utils.js`/`detail.js`. Has its own RSVP flow for guests (no-account email + Stripe checkout). |
| [css/pages/events.css](css/pages/events.css) | Mostly orphaned — most of its rules are superseded by the inline `<style>` in `events/index.html`. Some sections (`.evt-hero`, `.evt-related-card`, `.evt-comment*`) may still be referenced. Needs an audit during rebuild. |

The public page already feels the most "modern" of the three surfaces — clean white canvas, generous spacing, Airbnb-style metadata rows, sticky bottom CTA. It's the closest to where we want everything to land.

### 2.4 Admin `/admin/events.html` — module-by-module

| File | Notes |
|---|---|
| [admin/events.html](admin/events.html) | ~250 lines. Stats row → tab nav (All Events / Competition Payouts / Banner Awards) → tables. Generic admin layout, doesn't match the recently-revamped `admin/hub.html` or `admin/members.html`. |
| [js/admin/events-dashboard.js](js/admin/events-dashboard.js) | Loads events, RSVPs, revenue stats; renders the three tables; admin actions for reschedule/cancel/refund are routed back to the portal page rather than living here. |

There's no admin "create event" flow — admins create events on the portal page (via the `Create Event` button gated behind `events.create` permission). That's actually fine, but the **management experience** — viewing one event with its full operational panel (RSVPs, payments, refunds, documents, raffle draw, check-in scanner) — is fragmented across the portal detail page and the admin dashboard table.

### 2.5 Supabase backend (unchanged in this overhaul)

Tables (all present, migrations 063–077):
- `events` (core record, ~50 columns)
- `event_rsvps` (member RSVPs)
- `event_guest_rsvps` (non-member paid RSVPs)
- `event_checkins` (QR scan attendance)
- `event_hosts` (co-hosts / check-in staff)
- `event_raffle_entries`, `event_raffle_winners`
- `event_documents`, `event_documents_map` (per-member doc distribution)
- `event_locations` (Realtime live map)
- `event_competitions` / `event_competition_entries` / `event_competition_votes`
- `event_prize_pool_contributions`
- `event_comments`, `event_comment_reactions`
- `event_cost_items`, `event_scrapbook_photos`
- ~10 triggers (notifications, badge awards, phase changes)
- ~5 RPCs (`get_event_stats`, `award_event_banner_to_attendees`, `draw_raffle_winner`, etc.)

Edge functions (unchanged):
- `create-event-checkout` — RSVP / raffle entry / competition entry / prize pool Stripe checkout
- `process-event-cancellation` — cancel + proportional refund
- `manage-event-waitlist` — promote next person when spot opens
- `send-event-reminders` — 7d / 72h / day-of cron
- `rsvp-guest-free`, `raffle-guest-free` — guest no-checkout helpers
- `event-og` — OG image generation for share previews
- `geocode-address` — free Nominatim geocoder for address validation

> **Backend is in good shape and stays as-is.** This overhaul does not touch any migrations, RPCs, or edge functions.

### 2.6 Where logic is duplicated

| Logic | Locations |
|---|---|
| `escapeHtml` | `js/portal/events/utils.js` (`evtEscapeHtml`), `js/events/public.js` (`pubEscapeHtml`) |
| Mini-markdown (bold/italic/links) | `detail.js` (`evtMiniMarkdown`), `public.js` (`pubMiniMarkdown`) |
| Date / time formatters | spread across `utils.js`, `list.js`, `detail.js`, `public.js`, `events-dashboard.js` |
| Category → emoji / color / gradient maps | `list.js` (`EVT_CATEGORY_TAG`, `EVT_CATEGORY_GRADIENT`), `public.js` (`PUB_CATEGORY_EMOJI`, `PUB_TYPE_COLORS`), `constants.js` |
| Lightbox | `detail.js` (`evtOpenLightbox`), `public.js` (`pubOpenLightbox`) |
| Live countdown | `detail.js` (`evtStartLiveCountdown`), `public.js` (`pubStartLiveCountdown`) |
| Status badge classes (`evt-status-live` etc.) | inline `<style>` in `events/index.html`, `portal-events.css`, `events.css` |

### 2.7 Where UX is weak

**Portal list:**
- Dark hero clashes with the light card grid below.
- Three filter chips (`Upcoming` / `Past` / `Going`) are decent but the type-filter `<select>` next to them feels mismatched.
- Search is a clever "expanding pill" but most users miss it on mobile.
- Hero stats (`Upcoming` / `Your RSVPs` / `Next Event`) are nice but feel disconnected from the cards below.
- Cards on mobile take a lot of vertical space — 180px banner + meta + buttons.
- No empty-state CTA for "Create your first event" if you're permitted to create.

**Portal detail:**
- Already in better shape (v2 redesign), but the sticky body header logic is fragile and stacks awkwardly on small phones.
- The bottom CTA bar overlaps content on iOS Safari with the URL bar collapsed.
- Host controls dropdown is hidden behind a "more" button — discoverable only by long-time admins.
- Reschedule modal opens *on top* of the detail page with no breadcrumb back.

**Create modal:**
- 1500+ line modal. On mobile it scrolls forever.
- Sections aren't collapsible. LLC fields appear/disappear inline causing big layout jumps.
- No save-as-draft on form abandonment.
- Cost breakdown builder is functional but the per-row form is busy.

**Public page:**
- Already strong. Main weaknesses: invite banner not visually distinct enough, sticky CTA bar can clip behind the iOS home indicator.

**Admin dashboard:**
- Tables are dense and don't fit on mobile (must scroll horizontally).
- No way to drill into a single event from the admin page without bouncing to the portal page.
- Banner-award flow is hidden in a tab and uses a raw `<select>` — inconsistent with the modern member-modal Settings tab.

### 2.8 Where code architecture is weak
- **No namespacing.** Every function is a global (`evt*`, `pub*`, etc.). 1500+ globals across the events surface. Fragile load order.
- **HTML templating via giant string literals** in JS — hard to read, easy to break with bad escaping.
- **Mixed CSS strategy.** Some inline `<style>` blocks, some shared CSS, some Tailwind. The recently-revamped pages (`admin/members`, etc.) use **almost-pure Tailwind** with a few targeted CSS classes — that's the target.
- **`detail2.js` is dead code** referencing a non-existent `events2-detail.html`. Delete on contact.
- **Three category-map definitions** that drift over time.
- **Form state has no central store.** Every change handler reads from the DOM, so previewing the create form requires re-reading every input — easy place for bugs.

### 2.9 Mobile UX gaps
- Portal list cards: 180px banner is too tall on small phones; filter chips overflow into a small horizontal scroll without affordance.
- Portal create modal: scrolls past the fold, no sticky "Save / Publish" footer on mobile.
- Portal detail sticky header: stacks with the bottom-tab-bar and the bottom CTA — three sticky regions on a 375px screen.
- Public page bottom CTA: can sit under the iOS home indicator.
- Admin dashboard: tables don't have mobile equivalents.

### 2.10 Refactor vs rebuild — recommendation

| Surface | Recommendation | Why |
|---|---|---|
| **Portal list** (`#eventsListView` + `list.js`) | **Rebuild** | Visual mismatch with the rest of the system, dark hero is the only one of its kind in the project, card markup is monolithic. |
| **Portal detail** (`#eventsDetailView` + `detail.js`) | **Refactor in place** | Already the v2 redesign, mostly the right direction. Extract HTML helpers, drop sticky-header complexity, polish mobile. |
| **Create / edit modal** (form HTML in `events.html` + `create.js`) | **Rebuild as a multi-step sheet** | The monolithic form is the single biggest UX cliff in the system. |
| **Public page** (`events/index.html` + `public.js`) | **Refactor — extract inline styles, dedupe utilities** | Closest to the target design already. |
| **Admin dashboard** (`admin/events.html` + `events-dashboard.js`) | **Rebuild** | Doesn't match the modern admin pages (`hub`, `members`). New design + per-event drill-in panel needed. |
| **JS architecture** (`js/portal/events/*.js`, `js/events/public.js`) | **Refactor: introduce `PortalEvents`, `PublicEvent`, `AdminEvents`, `EventsShared` namespaces.** Move dupes into `js/components/events/` shared module. Delete `detail2.js`. | Globals are already a footgun. |
| **Backend (DB, RPCs, edge functions)** | **No changes** | Solid, unchanged. |

---

## 3. User Roles and Event Journeys

### 3.1 Members (logged in)

**Current journey:**
1. Tap "Events" in bottom tab bar → land on dark-hero list.
2. Choose Upcoming / Past / Going chip + (optional) type filter.
3. Tap a card → URL changes to `?event=slug`, list view hides, detail view renders.
4. RSVP via inline button (free) or `Pay $X` (Stripe checkout).
5. Get gated content unlocked post-RSVP. Open documents, view map during event window, scan QR for check-in.

**Pain points:**
- Visual jolt going from dark hero to airbnb-style detail.
- Hard to tell at a glance which events you've already RSVP'd to without opening them.
- "Going" chip count is buried; "Past" doesn't feel like a scrapbook.
- Mobile cards waste vertical space.

**Desired journey:**
- Land on a calm, light, editorial feed. Pinned/featured carousel up top, then sectioned cards.
- Filter chips collapse to a single sticky pill row that doesn't overflow.
- Each card visibly shows your RSVP status (Going/Maybe/Past) in a small chip.
- Tap-to-open detail keeps the same visual language — no theme switch.

**Required preserved functionality:**
- All filter modes (`upcoming`, `past`, `going`)
- Type filter (`all`, `llc`, `member`, `competition`)
- Search across title/description
- Featured/pinned carousel for upcoming LLC events
- Hero stat counts (next event, upcoming count, your RSVP count)

### 3.2 Non-members / invited guests

**Current journey:**
1. Receive a shared link (`/events/?e=slug` or `/events/?e=slug&invite_token=…`).
2. Public page loads; if member-only, see the "members-only" notice.
3. Otherwise, see a polished Airbnb-style event page.
4. Tap RSVP → enter name + email → Stripe checkout (paid) or instant RSVP (free).
5. Receive QR ticket on confirmation page; can also retrieve later by entering email.

**Pain points:**
- Invite banner (the personalized "you've been invited by X" banner) blends in with content.
- Sticky bottom CTA can clip behind the iOS home indicator.
- The page sometimes renders before the OG image fetch completes — first paint flash.

**Desired journey:**
- Hero image + title + date card immediately readable on first scroll position.
- Personalized invite chip near the title ("👋 Justin invited you").
- Single primary CTA, persistent at the bottom but properly inset for safe-area.
- Email-ticket-lookup ("Already RSVP'd?") visually obvious below the RSVP CTA.

**Required preserved functionality:**
- No-auth viewing of public-tier info
- Member-only gating
- Guest RSVP with name + email
- Stripe checkout for paid events
- QR ticket retrieval by email
- Two-tier info gating (pre/post RSVP)
- Add-to-calendar, share copy-link, OG meta

### 3.3 Admins / coordinators

**Current journey:**
1. Land on `/admin/index.html` → tap Events tile → land on `/admin/events.html` (dashboard table).
2. To create a new event, click "View Portal" → bounce to `/portal/events.html` → click "Create Event" → giant modal.
3. To manage an existing event, click into a table row → opens the portal detail page with admin host-controls visible.
4. Reschedule, cancel, refund, upload docs, draw raffle — all happen on the portal detail page in dropdowns.

**Pain points:**
- Two surfaces for one job — bounce between admin dashboard (overview) and portal detail (operations).
- Create modal is a single 1500-line monster.
- No "draft" workflow that feels real — drafts only show to creator and only on the portal grid.
- No bulk operations (e.g. send reminder to all RSVPs of multiple events).

**Desired journey:**
- Admin Events dashboard renders the same modern card-list as the portal but with admin-only chips (status, revenue, RSVP count).
- Click into an event → opens an **Event Management Sheet** — bottom sheet on mobile / right rail on desktop — with tabs: `Overview / RSVPs / Money / Docs / Raffle / Comp / Danger Zone`.
- Create event → multi-step sheet: `Basics → Details → Pricing → Add-ons → Preview → Publish`.
- All operational tools live inside this management sheet — no more bouncing.

**Required preserved functionality:**
- Stats overview (total events, RSVPs, revenue, competitions)
- Per-event status filtering
- Competition payouts table + 1099-NEC flag
- Banner-award workflow
- All admin actions: reschedule, cancel, refund, document upload, raffle draw, manual check-in, banner award
- Permission gating (`events.create`)

---

## 4. Design Direction

### 4.1 Inspiration anchors
- **Airbnb listing pages** — calm imagery hero, two-tier title (place name + meta line), "Where you'll be" map card, sticky reserve CTA on mobile.
- **Eventbrite event pages** — clear date card pinned to the hero, "About this event" / "Hosts" / "What's included" stacked sections, related-events rail.
- **Recently-revamped pages in this project** — `admin/members` (status pills, stat tiles, sheet modal with tabbed content), `admin/hub` (rounded-2xl tiles with subtle borders), `portal/feed` (card-based scrolling, brand-violet accents).
- **Provided UI inspiration images** — clean event cards with date chips, soft shadows, large readable type, primary action prominent.

### 4.2 Visual system

| Token | Value |
|---|---|
| Page background | `bg-surface-50` (#f8fafc) |
| Card surface | `bg-white` |
| Card border | `border border-gray-200/80` |
| Card radius | `rounded-2xl` (cards) / `rounded-3xl` (sheets) |
| Card shadow | `shadow-sm` resting; `shadow-md` on hover (`md:hover` only) |
| Section padding (card) | `p-4 sm:p-5` |
| Page max width | `max-w-5xl mx-auto` (consumer surfaces) / `max-w-6xl` (admin) |
| Brand color | `brand-600` (#4f46e5) primary, `brand-700` text on light, `brand-50` chip bg |
| Status accents | Live: emerald-500, Soon: amber-500, Past: gray-400, Cancelled: red-500 |
| Type accents | LLC: amber-500, Member: brand-500, Competition: violet-500 |
| Body copy | `text-sm text-gray-600` (15px on detail body) |
| Headings | `font-extrabold tracking-tight` |
| Typography sizes | `text-2xl sm:text-3xl` (page H1), `text-xl` (section H2), `text-base` (card title) |
| Inputs (mobile zoom-safe) | `text-base sm:text-sm` |

### 4.3 Layout style
- **Portal list:** Light page background, optional 1-card-wide "Featured" hero pinned to the top of the feed (no separate dark hero band). Sticky top bar with title + search + Create button. Filter chips in a single horizontally-scrolling row with edge fade. Cards in a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` — each card mobile-friendly with date chip, banner, title, meta line, RSVP-status chip.
- **Detail:** Hero banner with overlaid title + date card + status pill. White content body floating up over the bottom of the hero (`-mt-6 rounded-t-3xl bg-white`). Sectioned content with horizontal dividers. Sticky bottom CTA bar on mobile only, with safe-area inset.
- **Create flow (new):** Multi-step bottom sheet on mobile, modal on desktop. Steps: `Basics → Details → Pricing → Add-ons → Preview → Publish`. Progress dots at the top. Save-draft on every step.
- **Admin events:** Same card grid as portal but each card has an admin-chip footer (status, RSVP count, revenue). Tap card → opens the **Event Management Sheet** (bottom sheet on mobile, right-rail on desktop ≥lg), with the operational tabs.

### 4.4 Card style
```
┌─────────────────────────────┐
│  ┌──┐                       │ ← banner with date chip top-left
│  │14│                       │   (pulls from `evt-date-card`)
│  │JUN                       │
│  └──┘     [LLC] (type tag)  │ ← type tag top-right
├─────────────────────────────┤
│  Snowboarding Trip          │ ← title (extrabold, two lines max)
│  Sat, Jun 14 · Park City    │ ← meta (date + nickname or address)
│                             │
│  👤👤👤  +5     [Going ✓]   │ ← attendee avatars + RSVP status
└─────────────────────────────┘
```
- Tap target = entire card.
- Banner: `aspect-[16/10]` or fixed `h-44 sm:h-48` for grid alignment.
- Empty banner → category gradient (already implemented in `list.js`).
- All chips use `whitespace-nowrap` and `flex-shrink-0`.

### 4.5 Detail page style
- **Hero:** Full-width banner, 280px mobile / 420px desktop, with scrim. Date card pinned bottom-left (similar to today's `evt-date-card-wrap` but moved into the hero, not floating). Status pill top-right.
- **Content body:** White, `rounded-t-3xl`, pulled up `-mt-6`, contains:
  1. Title + (host avatar + "Hosted by X")
  2. Quick info row: date · time · location (icons left, value right)
  3. About this event (collapsible if long)
  4. Map card (Leaflet, tap-to-expand)
  5. Cost breakdown (LLC events; collapsible)
  6. Documents (per-member; LLC events)
  7. RSVP section (variable based on status)
  8. Attendees (avatar grid, "+N more")
  9. Comments
  10. Related events rail (horizontal scroll-snap)
- **Sticky bottom CTA bar** (mobile only): primary action only, reflecting current state (`RSVP $X`, `You're going ✓`, `Buy raffle ticket`, `Cancelled`).

### 4.6 Spacing
- Card outer gap: `gap-4`.
- Section vertical rhythm: `py-6 sm:py-8`.
- Inline icon → text gap: `gap-3`.
- Sheet header padding: `px-4 sm:px-5 py-3 sm:py-4`.

### 4.7 Typography
- Page H1: `text-2xl sm:text-3xl font-extrabold tracking-tight`
- Section H2: `text-lg font-bold text-gray-900`
- Card title: `text-base font-bold text-gray-900` (`line-clamp-2`)
- Meta: `text-sm text-gray-500`
- Body copy in detail: `text-[15px] leading-7 text-gray-700`
- Buttons: `text-sm sm:text-base font-semibold`

### 4.8 CTA treatment
- Primary: `bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-5 py-3 font-semibold`
- Secondary: `bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 rounded-xl px-5 py-3 font-semibold`
- Destructive: `bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-3 font-semibold`
- Sticky bottom CTA: full-width on mobile, `max-w-sm` centered, with `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`.

### 4.9 Status pills / badges
Already mostly defined. Standardize to:
```
.evt-pill { @apply inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap; }
.evt-pill--live      { @apply bg-emerald-50 text-emerald-700; }
.evt-pill--soon      { @apply bg-amber-50 text-amber-700; }
.evt-pill--past      { @apply bg-gray-100 text-gray-500; }
.evt-pill--cancelled { @apply bg-red-50 text-red-700; }
.evt-pill--going     { @apply bg-brand-50 text-brand-700; }
.evt-pill--llc       { @apply bg-amber-100 text-amber-800; }
.evt-pill--member    { @apply bg-brand-100 text-brand-800; }
.evt-pill--comp      { @apply bg-violet-100 text-violet-800; }
```

### 4.10 Mobile behavior
- Sticky **page header** (title + search + create) only on portal list. Hides on scroll-down, reappears on scroll-up (already a pattern in `feed.html`).
- Filter chips: single row, horizontal scroll with edge fade. Active chip auto-scrolls into view (same trick as the members-modal tab fix from `c3af0f9`).
- Sheets / modals: full-height bottom sheet on `<sm`, centered modal on `>=sm`. `max-h-[90dvh]` (dynamic vh).
- z-index: bottom-tab-bar = 50, sheets = 60, toasts = 70 (matches the existing standard from the members fix).
- Inputs: `text-base sm:text-sm` to prevent iOS zoom.

### 4.11 Keeping the existing vibe
Project's identity = brand violet (`#4f46e5`), Inter font, generous rounded corners, soft shadows, white cards on `surface-50`. The overhaul keeps all of this. What changes:
- **Drop the dark indigo hero** on `/portal/events.html`. Replace with the same light editorial layout used on the rest of the portal pages.
- **Standardize status pills** across all three surfaces (today there are two slightly different sets).
- **Single source of truth** for category emoji/colors.

---

## 5. Architecture Recommendation

> **Bottom line:** the events surface is mature feature-wise but its visual + code architecture has drifted. Rebuild the parts that are obviously legacy; refactor the parts that already point in the right direction.

### 5.1 Per-file decisions

| File | Decision | Reason |
|---|---|---|
| [portal/events.html](portal/events.html) | **Rebuild** the list-view section. **Refactor** the detail-view container to be empty (will be filled by the refactored `detail.js`). **Extract** the giant create-modal HTML into a dedicated partial (or build it via JS). | List markup is dated; create modal is too big to ship inside the page. |
| [admin/events.html](admin/events.html) | **Rebuild** | Generic admin layout, doesn't match modern admin pages. Replace with card-grid + management-sheet pattern. |
| [events/index.html](events/index.html) | **Refactor** — extract the inline `<style>` to `css/pages/public-event.css`. **Keep** the structural HTML; it's the strongest of the three. | Visual is already on-brand for the new direction. Code organization is the main fix. |
| [css/pages/portal-events.css](css/pages/portal-events.css) | **Replace** with a much smaller `portal-events.css` that only holds: card hover transition, hero-stat backdrop blur, filter-chip styles. Most of today's content is delete-on-sight. | 80% of current rules will be inline Tailwind in the rebuild. |
| [css/pages/events.css](css/pages/events.css) | **Audit + retire most rules.** What's still referenced moves into `public-event.css`. | Likely 70% orphaned after `events/index.html` extraction. |
| [js/portal/events/state.js](js/portal/events/state.js) | **Replace** with a `PortalEvents.state` object inside a new `PortalEvents` IIFE namespace. | Globals are fragile; we already use IIFE namespaces in `admin/members`. |
| [js/portal/events/constants.js](js/portal/events/constants.js) | **Move to `js/components/events/constants.js`** (shared with public + admin). | Three duplicate copies today. |
| [js/portal/events/utils.js](js/portal/events/utils.js) | **Move shared helpers to `js/components/events/helpers.js`** (escape, mini-markdown, format date, format money, lightbox, countdown). Keep portal-specific helpers in `PortalEvents.utils`. | Dedupe with `public.js`. |
| [js/portal/events/init.js](js/portal/events/init.js) | **Rebuild** as `PortalEvents.bootstrap()`. Split listener wiring into per-feature setup functions. | Currently one giant 400-line `DOMContentLoaded` handler. |
| [js/portal/events/list.js](js/portal/events/list.js) | **Rebuild** as `PortalEvents.list` module. New card markup. Use shared helpers. | Card markup needs full visual refresh anyway. |
| [js/portal/events/detail.js](js/portal/events/detail.js) | **Refactor** — keep the v2 architecture, simplify sticky-header logic, extract card-helpers, swap to shared utils. | Already in the right direction. |
| [js/portal/events/detail2.js](js/portal/events/detail2.js) | **Delete** | Dead code referencing non-existent `events2-detail.html`. |
| [js/portal/events/create.js](js/portal/events/create.js) | **Rebuild** as a multi-step sheet (`PortalEvents.create`). Split per step. Add a real form-state object instead of DOM-reads. | Single biggest UX cliff today. |
| [js/portal/events/rsvp.js, comments.js, competition.js, raffle.js, documents.js, scrapbook.js, scanner.js, map.js](js/portal/events/) | **Refactor in place** — port to `PortalEvents.<feature>` namespace, swap to shared utils. | Logic is fine; just naming + utility dedupe. |
| [js/events/public.js](js/events/public.js) | **Refactor** — split into `PublicEvent.{bootstrap, hero, body, rsvp, raffle, ticket}` files. Use shared utils. | 1800-line single file is hard to maintain. |
| [admin/events.html](admin/events.html) + [js/admin/events-dashboard.js](js/admin/events-dashboard.js) | **Rebuild** as `AdminEvents` module — card grid + Event Management Sheet. | Replace tables with cards. |

### 5.2 Source-of-truth pieces that must stay
- All Supabase tables, RLS, RPCs, edge functions, triggers (migrations 063–084).
- The `create-event-checkout` edge function contract (`{type, event_id, user_id|guest_*}`).
- The `qr_token` generation + HMAC scheme on `event_rsvps` and `event_guest_rsvps`.
- The notification preferences fields (used in `settings.html`).
- The `slug` URL contract: portal uses `?event={slug}`, public uses `?e={slug}`.
- The permission contract: `events.create`, `events.manage`, `events.checkin`.

### 5.3 New shared module layout

```
js/components/events/
  constants.js   ← single category/type/status maps
  helpers.js     ← escape, miniMarkdown, formatDate, formatMoney, lightbox, countdown
  pills.js       ← status/type/RSVP pill renderers (string returns)
  card.js        ← shared event-card renderer (used by portal list + admin grid)

js/portal/events/
  index.js       ← IIFE namespace `PortalEvents`, calls .bootstrap()
  list.js        ← PortalEvents.list  (load + render grid + filter)
  detail/
    index.js     ← PortalEvents.detail (orchestrator)
    hero.js      ← hero banner + status pill + date card
    body.js      ← info rows + about + map
    rsvp.js      ← RSVP block (replaces today's rsvp.js)
    raffle.js    ← (refactored from today's raffle.js)
    competition.js
    comments.js
    documents.js
    scrapbook.js
    scanner.js
    map.js
    sticky-cta.js ← bottom CTA bar logic
  create/
    index.js     ← multi-step sheet orchestrator
    step-basics.js
    step-details.js
    step-pricing.js
    step-addons.js
    step-preview.js
    cost-builder.js
    state.js     ← PortalEvents.create.state (form-state object)
  manage/        ← admin Event Management Sheet (used by both portal & admin pages)
    index.js
    tab-overview.js
    tab-rsvps.js
    tab-money.js
    tab-docs.js
    tab-raffle.js
    tab-comp.js
    tab-danger.js

js/events/
  index.js       ← IIFE `PublicEvent`, .bootstrap()
  hero.js
  body.js
  rsvp.js
  raffle.js
  ticket.js      ← email-lookup + QR display

js/admin/events/
  index.js       ← IIFE `AdminEvents`
  dashboard.js   ← stat tiles + filter
  list.js        ← admin card grid
  payouts.js     ← competition payouts panel
  banners.js     ← banner-award panel
```

> **`js/components/events/`** is shared by all three surfaces — same category map, same date formatting, same lightbox.

---

## 6. Milestone-Based Build Plan

> Each milestone ships independently. The old surface remains live until its replacement is approved.

---

### Milestone 0 — Foundation (shared utilities + dead-code purge)

> **Status:** ✅ **Shipped** — commit `c322241`.

**Goal:** lay the shared module groundwork, delete dead code, set up the new file scaffolding without touching any user-visible page.

**Pages / files touched:**
- Create: `js/components/events/{constants,helpers,pills,card}.js`
- Delete: `js/portal/events/detail2.js`
- Update: `portal/events.html` (remove dead `<script src="js/portal/events/detail2.js">` if present)

**Functionality included:** none new.

**Design changes:** none.

**Data / logic considerations:**
- Move category emoji + gradient + tag-label into `js/components/events/constants.js` (one definition).
- Port `escapeHtml`, `miniMarkdown`, `formatDate`, `formatMoney`, `lightbox`, `startLiveCountdown` into `js/components/events/helpers.js`. Keep the old `evt*` and `pub*` aliases as thin wrappers so nothing breaks.
- Port status-pill / type-tag renderers into `js/components/events/pills.js`.

**Dependencies:** none.

**Risks:** the old code paths still exist; aliases must be 1:1.

**Done when:**
- `js/components/events/` modules load on portal events page and public events page without breaking either.
- `evtEscapeHtml === EventsHelpers.escapeHtml` (proxy).
- No reference to `detail2.js` anywhere.

**Regression checklist (verified post-ship):**
- [x] `/portal/events.html` still loads (auth-gated; redirects to login as before).
- [x] `/events/?e={slug}` still renders (tested with `?e=test` → "Event Not Found" as expected).
- [x] All 4 `window.Events*` namespaces register on every surface.
- [x] Legacy globals (`pubEscapeHtml`, `evtEscapeHtml`, etc.) still defined and functional.
- [x] `window.EV2Detail` is `undefined` (dead code purged).
- [x] SW cache bumped (`v40 → v41`) so clients pick up the new scripts.

**Lesson learned (apply forward):** M0 ended up moving lightbox + countdown into shared helpers in addition to the lean set (constants, escape, date, money, pills). It worked and verified clean — but in retrospect, a stricter M0 scope (constants + 3 helpers + pills + delete) would have been safer. **For M1+, hold the line: do only what the milestone says.**

---

### Milestone 1 — Portal Members List Page (consumer) ✅ Shipped — commit `fe52915`

**Status:** ✅ Shipped. List view rebuilt with `PortalEvents.list` namespace, light editorial layout, EventsCard grid, sticky chip filters. Old list-only CSS rules left in place for M6 cleanup.

**Lessons learned:**
- Hidden `<select id="typeFilter">` retained as compat shim — `init.js` still calls `addEventListener('change', evtRenderEvents)` on it. Removing the element would crash bootstrap.
- `EventsCard.render()` returns an `<a href="?event=...">` — overriding `href: 'javascript:void(0)'` and using `e.preventDefault()` keeps SPA routing intact.
- All legacy `evt*` globals (`evtLoadEvents`, `evtRenderEvents`, `evtRenderFeatured`, `evtUpdateHeroStats`, `evtSetupSearch`, `evtInitFilterChips`, `evtRenderCard`) preserved as `window` aliases — unmodified consumers (init/rsvp/create/competition) keep working.
- SW cache bumped v41 → v42 (real users auto-receive on next visit; dev verification via direct HTTP fetch since browser SW caches old file).

**Goal:** rebuild `/portal/events.html` list view with the new visual language. Mobile-first card grid, light editorial layout, sticky filters.

**Pages / files touched:**
- Edit: [portal/events.html](portal/events.html) — replace the `#eventsListView` block. Keep `#eventsDetailView` empty placeholder until M2.
- Create: [js/portal/events/index.js](js/portal/events/index.js), [js/portal/events/list.js](js/portal/events/list.js) (rebuild)
- Replace: [css/pages/portal-events.css](css/pages/portal-events.css) — slim down to ~80 lines (card hover, filter chip, hero-stat blur).
- Use: shared `EventsCard.render()`, `EventsConstants`, `EventsHelpers`.

**Functionality included** (matches `events_001.md`):
- Upcoming / Past / Going filter chips
- Type filter (`all`, `llc`, `member`, `competition`)
- Search (in-place expanding, but cleaner — replace pill with a real input + clear button)
- Featured/pinned LLC carousel at top of feed
- Hero stat counters (Upcoming, Your RSVPs, Next Event)
- Empty states with CTA when permitted
- Skeleton loading
- Create button gated on `events.create` permission

**Design changes:**
- Remove the dark indigo hero. Replace with a light header card containing title + stat tiles + Create button (same pattern as `admin/members`).
- Cards get the new layout (date chip, banner, title, meta, RSVP status chip).
- Filter chip row: sticky on scroll, single row, horizontal scroll, edge fade, active chip auto-scrolls into view.
- Type filter becomes a styled pill matching the chip row, not a `<select>`.
- Cards get RSVP-status chip in the bottom-right (`Going` / `Maybe` / `—`).
- Empty state shows category illustration + "Create Event" CTA when permitted.

**Data / logic considerations:**
- Same Supabase queries (`events`, `event_rsvps` for current user). Move into `PortalEvents.list.load()`.
- RSVP status map (`evtAllRsvps`) becomes `PortalEvents.state.rsvpsByEvent`.

**Dependencies:** Milestone 0.

**Risks:**
- URL routing (`?event=slug`) still needs to swap views — wire to the existing detail.js for now (M2 will refactor it).

**Done when:**
- `/portal/events.html` list view renders with new visual at 375px and 1280px.
- All filters / search / featured carousel / stats work.
- Tapping a card opens the existing detail view (M2 refactors that).
- No regressions in create-modal trigger or RSVP-status display.

**Regression checklist:**
- [ ] Tapping a card sets `?event={slug}` and opens existing detail view.
- [ ] Featured/pinned LLC carousel renders + scrolls + arrows work.
- [ ] All 3 lifecycle chips (Upcoming / Past / Going) filter correctly.
- [ ] All 4 type filters (all / llc / member / competition) filter correctly.
- [ ] Search matches title + description (case-insensitive).
- [ ] Hero stat counters (Upcoming, Your RSVPs, Next Event) match data.
- [ ] RSVP-status chip on each card matches `evtAllRsvps` for current user.
- [ ] Create button hidden when user lacks `events.create` permission.
- [ ] Create button still triggers the existing `#createModal` (M4 replaces that).
- [ ] Skeleton placeholders render during initial load.
- [ ] Empty state renders (and shows Create CTA only when permitted).
- [ ] No JS errors in console on initial load or filter switch.
- [ ] No layout shift on filter chip auto-scroll-into-view.
- [ ] SW cache version bumped.

---

### Milestone 2 — Portal Event Detail Page (consumer) ✅ Shipped

**Status:** ✅ Shipped. `detail.js` wrapped in IIFE with `PortalEvents.detail` namespace + sub-module registry. Dead JS hero-collapse code stripped. CTA bar safe-area tightened. Host "More" dropdown relabeled "Manage event" with settings-cog icon — same dropdown for now; M3 swaps the trigger for the full Event Management Sheet.

**Deliberate scope cut (from original spec):**
- **Did NOT split** `detail.js` into 5 sub-files (`{index,hero,body,rsvp,sticky-cta}.js`). Spec called this out as a load-order risk and proposed a `PortalEvents.detail.register(name, fn)` registry as mitigation. Shipped the **registry** without the split — same architectural win, far less risk. M3 + future tabs will register into the same registry.
- All other M2 deliverables shipped intact.

**Lessons learned:**
- IIFE wrap of a 990-line classic-script file works fine because referenced free vars (`TYPE_COLORS`, `evtAllEvents`, `supabaseClient`, `formatCurrency`, etc.) live in sibling scripts' global lexical environment — the IIFE's scope chain still finds them.
- `var _evtCountdownInterval` (was `let`) so it doesn't conflict if detail.js is somehow loaded twice in dev.
- Dead JS hero-collapse code (~50 lines of unreachable scroll math after a `return;`) deleted entirely — the `position:sticky` title row in CSS is the new approach.
- All 11 legacy `evt*` globals (`evtOpenDetail`, `evtOpenLightbox`, `evtOpenFullscreenMap`, `evtCloseFullscreenMap`, `evtMiniMarkdown`, `evtInitSectionAnimations`, `evtStartLiveCountdown`, `evtInitHeroCollapse`, `evtCleanupHeroCollapse`, `evtInitBottomNav`, `evtCleanupBottomNav`) preserved on `window` — `utils.js` still calls `evtCleanupBottomNav()` from `evtNavigateToList`, which would crash without the alias.
- Sticky CTA bar already had `bottom: calc(56px + env(safe-area-inset-bottom,0px))`, but its `padding-bottom: 26px` hard-coded was wrong on notched iPhones — now `calc(12px + env(safe-area-inset-bottom, 0px))`.
- SW cache bumped v42 → v43.

**Goal:** refactor `detail.js` to use shared utils, simplify sticky-header logic, polish mobile, and ensure visual consistency with M1.

**Pages / files touched:**
- Refactor: [js/portal/events/detail.js](js/portal/events/detail.js) — split into `js/portal/events/detail/{index,hero,body,rsvp,sticky-cta}.js`.
- Refactor: [js/portal/events/{rsvp,raffle,competition,comments,documents,scrapbook,scanner,map}.js](js/portal/events/) — port to `PortalEvents.detail.<feature>` namespace, use shared helpers.
- Update: `portal/events.html` — `#eventsDetailView` container only (no inline content).

**Functionality included** (matches `events_001.md`):
- Two-tier info gating (pre/post-RSVP)
- All RSVP modes (Going/Maybe/Not Going for free, paid Stripe checkout, waitlist join, grace-window cancel)
- Raffle (config display, paid raffle entry, draw-winner UX, winner notifications)
- Competition phases (Registration / Active / Voting / Results)
- Comments + reactions
- Documents (per-member distribution)
- Scrapbook (post-event photo gallery)
- QR check-in scanner (both modes)
- Live event map (Leaflet + Realtime)
- Host controls (reschedule, cancel, refund, edit, draw raffle, mark distributed)
- Add-to-calendar
- Share (copy link, share API)

**Design changes:**
- Hero: full-width banner with overlaid title + date card + status pill (consolidates today's `evt-hero-content` + `evt-date-card-wrap` + `evt-body-header`).
- Drop the sticky `evt-body-header` complexity — replace with a much simpler "title pinned in scroll" pattern using `position:sticky` on the title row only.
- Sticky bottom CTA bar: rebuild to be safe-area-aware (`pb-[calc(0.75rem+env(safe-area-inset-bottom))]`), single primary action only.
- Host controls dropdown becomes a clearly-labeled "Manage event" button (matches the management-sheet entry point in M3).
- Sections all get the same heading style + horizontal divider rhythm.

**Data / logic considerations:**
- All existing data flows preserved.
- Reschedule / cancel modals → port to bottom-sheet on mobile, modal on desktop, matching the `admin/members` member-sheet pattern.

**Dependencies:** Milestone 0, Milestone 1.

**Risks:**
- The detail file is large; splitting risks load-order issues. Mitigate with explicit `PortalEvents.detail.register(name, fn)` registry.

**Done when:**
- Detail page renders correctly for all event types (LLC, Member, Competition).
- All host controls still work.
- No visual mismatch between list (M1) and detail.
- Sticky CTA bar respects safe-area on iOS.

**Regression checklist:**
- [ ] Opening `?event={slug}` loads the right event by slug.
- [ ] Pre-RSVP gating: locked sections hidden until RSVP confirmed.
- [ ] Post-RSVP gating: documents, map, scanner unlock as expected.
- [ ] All RSVP modes work: Going, Maybe, Not Going, paid Stripe checkout, waitlist join, grace-window cancel.
- [ ] Stripe `create-event-checkout` payload unchanged (verify via Network tab).
- [ ] Raffle: config display, paid entry, draw winner animation, winner notification.
- [ ] Competition: phase rendering (Registration / Active / Voting / Results), self-vote prevention, prize splits.
- [ ] Comments: post + reactions + delete-own.
- [ ] Documents: per-member distribution download links work.
- [ ] Scrapbook: photo upload + lightbox.
- [ ] QR scanner: both modes (Attendee Ticket / Venue Scan) work.
- [ ] Live map: Leaflet renders + Realtime location pins update.
- [ ] Host controls: reschedule, cancel, refund, edit, draw raffle, mark distributed.
- [ ] Add-to-calendar produces valid `.ics`.
- [ ] Share: Web Share API + clipboard fallback both function.
- [ ] Sticky bottom CTA does not overlap bottom-tab-bar or iOS home indicator.
- [ ] No regressions for non-host viewers (gating on `events.manage`).

---

### Milestone 3 — Admin Events Dashboard + Event Management Sheet

**Goal:** rebuild `/admin/events.html` to match modern admin pages. Introduce the **Event Management Sheet** — one place for all admin operational tasks per event.

**Pages / files touched:**
- Edit: [admin/events.html](admin/events.html) — full rebuild.
- Replace: [js/admin/events-dashboard.js](js/admin/events-dashboard.js) — split into `js/admin/events/{index,dashboard,list,payouts,banners}.js`.
- Create: `js/portal/events/manage/{index,tab-overview,tab-rsvps,tab-money,tab-docs,tab-raffle,tab-comp,tab-danger}.js` (the management sheet, shared between admin page and portal detail page's "Manage" button).

**Functionality included** (matches `events_001.md`):
- Stats overview: total events, total RSVPs, event revenue, competitions
- Per-event status filter
- Competition payouts table + 1099-NEC flag (preserved)
- Banner-award workflow (preserved, redesigned UI)
- Per-event drill-in via the Event Management Sheet:
  - **Overview** — high-level counts, quick actions
  - **RSVPs** — confirmed list, waitlist, manual check-in toggle
  - **Money** — revenue, refunds issued, manual refund button
  - **Docs** — upload + per-member distribution (existing `documents.js` logic)
  - **Raffle** — config view, draw-winner button (existing `raffle.js` host logic)
  - **Comp** — entries, voting tally, prize payout (existing `competition.js` host logic)
  - **Danger Zone** — reschedule, cancel-with-refund, delete (admin only)
- Permission gating preserved (`events.manage`)

**Design changes:**
- Tables → cards. Each event renders as a card in a grid, with an admin-chip footer showing status / RSVPs / revenue.
- Banner-award workflow becomes a dedicated section card (not a tab) with a clean two-column form.
- Competition payouts gets its own section card with the table style from the modern admin members page.
- The Event Management Sheet uses the same layout pattern as the member-sheet from `admin/members` — full-height bottom sheet on mobile, large modal on desktop, with horizontally-scrolling tab bar that auto-scrolls the active tab into view.

**Data / logic considerations:**
- All admin RPCs and queries preserved.
- The portal detail page's "Manage event" button opens the same Event Management Sheet — single source of truth for admin ops.

**Dependencies:** Milestones 0–2.

**Risks:**
- Sharing the management sheet between admin and portal pages requires careful event delegation. Ship as a self-contained module that both pages can `import`.
- The full 7-tab management sheet is the largest single piece of UX in this overhaul — easy to over-scope.

**Phased ship strategy (recommended):**
The Event Management Sheet is big enough to ship in two passes:
- **M3a — Thin first version:** ship dashboard rebuild + management sheet with **only 3 tabs**: `Overview`, `RSVPs`, `Danger Zone`. The other tabs render a placeholder ("Coming soon — use existing controls on portal detail").
- **M3b — Full sheet:** layer in `Money`, `Docs`, `Raffle`, `Comp` tabs. Each tab can be its own commit.

This keeps the *visible win* (modern admin dashboard + drill-in pattern) shippable fast, while the operational tabs land incrementally without blocking M4.

**Done when:**
- `/admin/events.html` matches the visual language of `/admin/hub.html` and `/admin/members.html`.
- Tapping an event card opens the management sheet.
- (M3a) Overview / RSVPs / Danger Zone tabs work and call the same RPCs as today.
- (M3b) All 7 tabs work; admins no longer bounce to portal detail for ops.

**Regression checklist:**
- [ ] All admin RPCs unchanged (verify Network tab payloads).
- [ ] Permission gating still respects `events.manage`.
- [ ] Stats overview matches existing values exactly (events, RSVPs, revenue, competitions).
- [ ] Competition payouts table preserves 1099-NEC flag column.
- [ ] Banner-award workflow still awards correctly.
- [ ] Reschedule preserves RSVPs + sends notifications.
- [ ] Cancel-with-refund triggers `process-event-cancellation` edge function with correct payload.
- [ ] Manual check-in toggle writes to `event_checkins`.
- [ ] Doc upload + per-member distribution still works.
- [ ] Raffle draw still triggers `draw_raffle_winner` RPC.
- [ ] Mobile: management sheet is full-height bottom sheet on `<sm`, modal on `>=sm`.
- [ ] Tab bar auto-scrolls active tab into view (matches members-modal fix).
- [ ] No regressions in portal detail's host-controls dropdown during M3a (still functional).

---

### Milestone 4 — Create / Edit Event Multi-Step Sheet

**Goal:** replace the 1500-line monolithic create modal with a multi-step bottom sheet. Add proper draft-save + state management.

**Pages / files touched:**
- Edit: [portal/events.html](portal/events.html) — remove the entire `#createModal` block.
- Create: `js/portal/events/create/{index,step-basics,step-details,step-pricing,step-addons,step-preview,cost-builder,state}.js`
- Refactor: [js/portal/events/create.js](js/portal/events/create.js) — split into the new step modules.

**Functionality included** (matches `events_001.md`):
- All event types: Member / LLC / Competition
- All field categories preserved (basics, dates, location with geocoding, pricing, gating, raffle config, competition config, transportation, location sharing, cost breakdown, LLC cut, invest-eligible, member-only)
- Banner upload (drag & drop, file picker, preview)
- Live address validation via `geocode-address` edge function
- Cost-breakdown builder with auto-calc + RSVP override
- Preview before publish
- Save as draft

**Design changes:**
- Multi-step sheet (mobile bottom sheet / desktop modal):
  - **Step 1 — Basics:** title, type, category, description, banner
  - **Step 2 — Details:** start/end, timezone, location (nickname + address + geocoded), max attendees, RSVP deadline
  - **Step 3 — Pricing:** mode (free/paid/free-paid-raffle), RSVP price, raffle entry price, member-only toggle
  - **Step 4 — Add-ons:** raffle config, competition config, transportation, location sharing, info gating, cost breakdown (LLC only)
  - **Step 5 — Preview:** shows the public-page preview
  - **Step 6 — Publish:** confirm + publish (or save draft)
- Progress dots in sheet header.
- Sticky footer with Back / Next / Save Draft.
- All inputs `text-base sm:text-sm` for iOS zoom-safety.
- LLC-only / competition-only steps render conditionally based on type.

**Data / logic considerations:**
- Introduce `PortalEvents.create.state` — a single form-state object. Steps read/write to it. On Publish, serialize and `INSERT` into `events`.
- Save Draft: `INSERT … status='draft'` (or `UPSERT` if editing).
- Edit-existing flow uses the same sheet but pre-populates state from the loaded event.
- Cost-breakdown builder lives in its own module (already complex enough to deserve it).

**Dependencies:** Milestones 0, 1, 2.

**Risks:**
- This is the biggest milestone. Ship it behind a feature flag or in parallel — let the old modal keep working until this one is stable.
- **Old drafts loading into the new editor is the single highest-risk path.** It is not a small edge case; it is its own validation pass (see below).

**Draft migration validation (must pass before deleting the old modal):**
Drafts created by the old `#createModal` may have:
- Missing newer fields (`transportation_enabled`, `location_required`, `location_share_enabled`, etc.) — defaults must be applied on load, not on save.
- Empty / null `cost_breakdown` arrays — editor must handle as "no items" not as a crash.
- Older `pricing_mode` enum values that have since shifted naming — map old → new on read.
- LLC drafts with `event_type='llc'` but missing `llc_cut_pct` — show as 0%, prompt before publish.
- Banner uploads referencing the old storage path scheme — verify still resolvable.

**Validation steps:**
1. Pull every existing `events` row with `status='draft'` (production + dev).
2. Snapshot each as JSON.
3. Load each into the new editor; assert no console errors, all fields render, no data loss on a no-op save.
4. Round-trip: load → save without changes → diff old vs new row. Diff must be empty (or limited to the defaulted-in-on-load fields).
5. Only after all drafts pass, delete the old modal.

**Done when:**
- Creating any event type works end-to-end via the new sheet.
- Editing an existing event (admin host control) opens the same sheet pre-populated.
- Save Draft works and resumes correctly.
- **All existing drafts in production pass the round-trip validation above.**
- The old `#createModal` HTML and `create.js` monolith are deleted.

**Regression checklist:**
- [ ] All 3 event types (Member / LLC / Competition) creatable end-to-end.
- [ ] All 3 pricing modes (fully_paid / free_event_paid_raffle / fully_free) selectable + saved.
- [ ] Banner upload (drag/drop + file picker) writes to storage + sets `banner_url`.
- [ ] Geocoding via `geocode-address` edge function still validates addresses.
- [ ] Cost-breakdown auto-calc + per-RSVP override math identical to old modal.
- [ ] LLC-only fields render only when `event_type='llc'`.
- [ ] Competition-only fields render only when `event_type='competition'`.
- [ ] Save Draft writes `status='draft'` and is editor-resumable.
- [ ] Publish writes `status='open'` (or correct status) and triggers the new-event notification.
- [ ] Editing existing event preserves all fields not touched by the editor.
- [ ] All inputs `text-base sm:text-sm` (no iOS zoom on focus).
- [ ] Sticky footer (Back / Next / Save Draft) doesn't overlap bottom-tab-bar.

---

### Milestone 5 — Public / Guest Event Page

**Goal:** keep the existing strong design, but extract inline styles, dedupe utilities, and harden mobile + invite UX.

**Pages / files touched:**
- Edit: [events/index.html](events/index.html) — extract the inline `<style>` block to `css/pages/public-event.css`. Trim to structural HTML.
- Create: `css/pages/public-event.css` (new, ~250 lines).
- Refactor: [js/events/public.js](js/events/public.js) — split into `js/events/{index,hero,body,rsvp,raffle,ticket}.js`.
- Audit + retire: most of [css/pages/events.css](css/pages/events.css) (move what's still used into `public-event.css`).

**Functionality included** (matches `events_001.md`):
- No-auth viewing of public-tier info
- Member-only gating with sign-in prompt
- Guest RSVP form (name + email)
- Stripe checkout for paid RSVP (`create-event-checkout` edge function)
- Free RSVP fallback (`rsvp-guest-free` edge function)
- Raffle entry purchase
- Two-tier info gating
- QR ticket display + email-based ticket retrieval
- Add-to-calendar
- Share link (`Web Share API` + clipboard fallback)
- OG meta image (already generated by `event-og` edge function)
- Personalized invite banner (when `?invite_token=…`)

**Design changes:**
- Hero gets the same layout as portal detail (consistency).
- Invite banner promoted to a brand-violet pill chip near the title (`👋 Justin invited you`), not a yellow card.
- Sticky bottom CTA bar gets `pb-[calc(0.75rem+env(safe-area-inset-bottom))]` for iOS home indicator.
- Email-ticket-lookup ("Already RSVP'd?") becomes a visible card under the RSVP CTA, not buried in a section.

**Data / logic considerations:**
- Keep the same query (`events` by `slug`).
- Keep guest-token URL handling (`?guest_token=…`) intact.
- Service worker cache invalidation for the public page (it's heavily cached).

**Dependencies:** Milestones 0, 2 (so detail visual language is locked).

**Risks:**
- Public page is the most-shared URL. Any regression hits non-members hard. Test guest RSVP + email lookup explicitly.

**Done when:**
- `events/index.html` has no inline `<style>` block.
- `js/events/public.js` no longer exists; replaced by 6 focused modules.
- Guest RSVP, email-lookup, paid checkout, raffle, member-only gating all verified.
- Visual matches portal detail (M2).

**Regression checklist:**
- [ ] No-auth visitor can view public-tier info on a public event.
- [ ] Member-only event shows sign-in prompt to guests.
- [ ] Guest RSVP form (name + email) submits successfully.
- [ ] Free RSVP path hits `rsvp-guest-free` edge function.
- [ ] Paid RSVP path hits `create-event-checkout` with unchanged payload.
- [ ] Raffle entry purchase works for guests.
- [ ] QR ticket renders on confirmation + by email-lookup.
- [ ] OG meta image still resolves via `event-og` edge function (test in social link debugger).
- [ ] Slug URL contract preserved: `?e={slug}` still loads correct event.
- [ ] `?invite_token=…` shows personalized invite chip.
- [ ] Add-to-calendar `.ics` valid.
- [ ] Share (Web Share API + clipboard fallback) works.
- [ ] Sticky CTA respects iOS safe-area.
- [ ] First paint has no flash (banner loads cleanly, no layout jump).
- [ ] SW cache bumped (public page is heavily cached — critical).

---

### Milestone 6 — Polish + Cleanup

**Goal:** purge legacy CSS, finalize shared module surface, ensure everything is mobile-perfect, and document the new architecture.

**Pages / files touched:**
- Audit + delete: any rule in [css/pages/portal-events.css](css/pages/portal-events.css) and [css/pages/events.css](css/pages/events.css) not referenced anywhere.
- Audit + delete: any unused helper in `js/portal/events/utils.js` after M0–M5.
- Update: this doc (`events_002.md`) — flip sections to "Shipped" and link commits.
- Update: `events_001.md` if any feature drift is discovered.

**Functionality included:** none new.

**Design changes:**
- Final mobile pass at 320 / 375 / 414 / 768 / 1024 / 1440 widths.
- Confirm all sheets use the safe-area pattern.
- Confirm filter chips auto-scroll active into view across all surfaces.
- Confirm z-index stack is consistent everywhere (bottom-tab-bar 50, sheet 60, toast 70).

**Dependencies:** all prior milestones.

**Risks:** none — purely cleanup.

**Done when:**
- No dead CSS rules.
- No dead JS functions.
- All four surfaces (portal list, portal detail, public, admin) feel like the same product.

---

## 7. File Impact Plan

> Per-file lifecycle through the milestones.

| File | M0 | M1 | M2 | M3 | M4 | M5 | M6 |
|---|---|---|---|---|---|---|---|
| `portal/events.html` | — | rebuild list block | refactor detail container | — | remove create modal | — | final pass |
| `admin/events.html` | — | — | — | rebuild | — | — | final pass |
| `events/index.html` | — | — | — | — | — | extract inline styles | final pass |
| `css/pages/portal-events.css` | — | replace (~80 lines) | tweak | — | — | — | dead-rule purge |
| `css/pages/events.css` | — | — | — | — | — | retire (merge into `public-event.css`) | dead-rule purge |
| `css/pages/public-event.css` | — | — | — | — | — | **create** (~250 lines) | — |
| `js/components/events/constants.js` | **create** | — | — | — | — | — | — |
| `js/components/events/helpers.js` | **create** | — | — | — | — | — | — |
| `js/components/events/pills.js` | **create** | — | — | — | — | — | — |
| `js/components/events/card.js` | **create** | use | use | use (admin grid) | — | — | — |
| `js/portal/events/index.js` | — | **create** (`PortalEvents` IIFE) | extend | extend | extend | — | — |
| `js/portal/events/state.js` | — | replace (now `PortalEvents.state`) | — | — | — | — | delete file |
| `js/portal/events/constants.js` | shim → shared | — | — | — | — | — | delete |
| `js/portal/events/utils.js` | shim → shared | — | — | — | — | — | trim |
| `js/portal/events/init.js` | — | rewrite into `PortalEvents.list.bootstrap()` | extend for detail | — | extend for create | — | — |
| `js/portal/events/list.js` | — | rebuild | — | — | — | — | — |
| `js/portal/events/detail.js` | — | — | split into `detail/{index,hero,body,…}` | — | — | — | — |
| `js/portal/events/detail2.js` | **delete** | — | — | — | — | — | — |
| `js/portal/events/create.js` | — | — | — | — | split into `create/{step-*,cost-builder,state}` | — | delete original |
| `js/portal/events/{rsvp,raffle,comments,competition,documents,scrapbook,scanner,map}.js` | — | — | port to namespace | — | — | — | — |
| `js/portal/events/manage/*` | — | — | — | **create** | — | — | — |
| `js/admin/events-dashboard.js` | — | — | — | split into `js/admin/events/{dashboard,list,payouts,banners}.js` | — | — | delete original |
| `js/events/public.js` | shim → shared utils | — | — | — | — | split into `js/events/{hero,body,rsvp,raffle,ticket}.js` | delete original |

### 7.1 Folder reorganization summary

```
NEW
  css/pages/public-event.css
  js/components/events/{constants,helpers,pills,card}.js
  js/portal/events/index.js
  js/portal/events/detail/{index,hero,body,rsvp,sticky-cta}.js
  js/portal/events/create/{index,step-basics,step-details,step-pricing,step-addons,step-preview,cost-builder,state}.js
  js/portal/events/manage/{index,tab-overview,tab-rsvps,tab-money,tab-docs,tab-raffle,tab-comp,tab-danger}.js
  js/admin/events/{index,dashboard,list,payouts,banners}.js
  js/events/{index,hero,body,rsvp,raffle,ticket}.js

DELETED
  js/portal/events/detail2.js
  js/portal/events/state.js (after M1)
  js/portal/events/constants.js (after M0)
  js/portal/events/create.js (after M4)
  js/admin/events-dashboard.js (after M3)
  js/events/public.js (after M5)

REPLACED IN PLACE
  css/pages/portal-events.css (slimmed down)
  css/pages/events.css (retired into public-event.css)
  portal/events.html (list block + create modal removed)
  admin/events.html (full rebuild)
  events/index.html (inline styles extracted)
```

### 7.2 Project conventions to respect (verified against recent revamps)
- **Heavy inline Tailwind.** Modal markup uses Tailwind utility classes; CSS files only hold what utilities can't express.
- **No inline `<script>`.** All JS lives in `js/` modules loaded as classic scripts.
- **IIFE namespaces** (e.g. `PortalEvents`, matches the pattern from `admin/members`).
- **Mobile-safe input sizing:** `text-base sm:text-sm` on every input.
- **Sheet-modal pattern** with `max-h-[90dvh]`, `flex-shrink-0` header/tab bar + `flex-1 overflow-y-auto` content.
- **z-index standard:** bottom-tab-bar 50, modals/sheets 60, toasts 70.
- **Service-worker cache invalidation** during dev (already documented in repo memory).

---

## 8. Risks / Open Questions

### 8.1 Technical risks
- **Service worker caching.** All three surfaces are cached aggressively. Each milestone needs a clear cache-bust strategy (versioned filenames or `sw.js` bump).
- **Load-order dependency** in the legacy globals during the refactor window. Mitigate by introducing namespaces with **alias shims** for the old global names (e.g. `window.evtEscapeHtml = EventsHelpers.escapeHtml`). Removed in M6.
- **Stripe checkout edge function contract.** Must not change. Verify before each milestone that `create-event-checkout` is called with the same payload.
- **Realtime subscription on `event_locations`.** Refactoring the map module risks dropping the subscription. Wire a smoke test.
- **OG image generation** (`event-og`) is invoked by URL path — make sure the public page URL doesn't change.

### 8.2 UX risks
- **The current public page is shared in the wild** (texted, posted on social). Any visual regression on first paint is high-impact. Ship M5 last and test on real devices.
- **Drafts saved by the old modal** must load into the new multi-step sheet without data loss.
- **Admin "bouncing"** from admin dashboard to portal detail is a habit — the new Event Management Sheet has to be obviously discoverable from both surfaces.

### 8.3 Migration risks
- **Old slugs in the wild.** Any URL like `/events/?e=snowboarding-trip-2026` must keep resolving. The slug field is unchanged in this overhaul — just verifying.
- **Saved drafts.** Old-shape draft rows in `events` may be missing newer fields (e.g. `transportation_enabled`). Defensive defaults required in the new editor.
- **Permissions migration.** `events.create`, `events.manage`, `events.checkin` permissions exist (migration 080+). The new admin dashboard must check these before showing actions.

### 8.4 Edge cases hidden in the old system
- Member-only event with a guest who tries to RSVP — what does the new UI show? (Today: sign-in prompt. Keep that.)
- Past event with no scrapbook photos — does the section render empty or hide? (Today: hides. Keep.)
- Competition event with zero registered competitors at deadline — does the page show "Cancelled — minimum not met"? (Today: yes.)
- Free event + paid raffle where the user paid for the raffle but didn't check in — they're not in the pool. (Confirmed — preserve.)
- Reschedule with grace window — refund flow. Verify in M2.

### 8.5 Open questions for product
1. **Founder/Coordinator role expansion** — `events_001.md` mentions a future `coordinator` role. In scope or out? *(Default: out of scope for this overhaul.)*
2. **Calendar grid view** — `events_001.md` lists this as `[ ]` (not yet built). In scope? *(Default: out — could be a future M7.)*
3. **Recurring events** — explicitly deferred in `events_001.md`. Same answer? *(Default: out.)*
4. **Bulk admin actions** — sending a reminder to multiple events at once is mentioned as a pain point. In scope? *(Default: out — could be a future M7.)*
5. **Per-event banner cosmetic** — the `events_001.md` notes "no per-event badge creation mechanism yet". In scope? *(Default: out.)*

---

## 9. Recommended Build Order

> Lowest-risk-first, highest-UX-impact-first, preserve-current-functionality.

### Phase A — Invisible foundation (low risk, no user impact)
1. **M0 — Foundation.** Shared utilities, dead-code purge. Ships in ~1 commit. No visual change.

### Phase B — Member-facing visual lift (high UX impact)
2. **M1 — Portal list rebuild.** First moment users see "Oh, this looks new." Ship behind a feature flag if cautious; otherwise ship straight.
3. **M2 — Portal detail refactor.** Closes the visual gap between list and detail. Smaller change than M1 but high-frequency-of-use surface.

### Phase C — Admin operational lift (medium UX impact)
4. **M3 — Admin dashboard + Event Management Sheet.** The sheet is the centerpiece — once it exists, admin tasks are dramatically simpler. Ship after M2 so the visual language is locked.

### Phase D — Highest-leverage rewrite (medium risk, high UX impact)
5. **M4 — Create / Edit multi-step sheet.** Biggest single improvement to admin workflow. Ship after M3 because the management sheet's "Edit event" entry point depends on it.

### Phase E — Public touch-up (low risk, high external impact)
6. **M5 — Public page refactor.** Save for last because regressions hit non-members. By this point the visual target is clear; we're aligning the strongest existing surface to the new shared utilities.

### Phase F — Cleanup
7. **M6 — Polish + cleanup.** Dead-CSS purge, dead-JS purge, final mobile pass at all viewport sizes.

### Why this order
- **M0 first** because everything depends on shared utilities. Never refactor a surface twice.
- **M1 before M2** because the list is the entry point — users notice the visual lift instantly.
- **M3 before M4** because the management sheet's "Edit event" button is the natural integration point for the create-sheet rebuild.
- **M5 last** because the public page is the most-shared URL and the highest-stakes surface for first-paint regressions. By then, the visual language is fully proven on three internal surfaces.
- **M6** is the cherry on top — only ships when nothing else is in flight.

---

## Appendix A — Quick Reference

### Existing functionality that MUST keep working
- All RSVP modes (Going, Maybe, Not Going, paid Stripe checkout, waitlist, grace-window cancel)
- Two-tier info gating (pre-RSVP / post-RSVP)
- Three pricing modes (Fully Paid, Free Event Paid Raffle, Fully Free)
- Three event types (LLC, Member, Competition)
- LLC-specific fields (cost breakdown, min participants, LLC cut, invest-eligible, transportation, location-required)
- Competition phases (Registration → Active → Voting → Results), self-vote prevention, prize splits, 1099-NEC flag
- Raffle (digital + physical, draw triggers, paid entry, prize tiers)
- Two QR check-in modes (Attendee Ticket, Venue Scan)
- Per-member document distribution
- Live event map with Realtime locations
- Comments + reactions
- Scrapbook photo upload
- Public guest RSVP (name + email, no account)
- Email-based ticket retrieval for guests
- Member-only gating with sign-in prompt
- Waitlist promotion with 24h window
- Admin reschedule + cancel-with-refund (proportional)
- Banner award workflow
- All notification triggers (new event, reminder, RSVP, raffle winner, comp phase, doc upload)
- Push + in-app notification preferences

### Backend untouched
- All migrations 063–084
- All edge functions in `supabase/functions/`
- All RPCs and triggers
- Slug URL contract: portal `?event={slug}`, public `?e={slug}`
- HMAC QR token scheme

### New shared modules (post-M0)
- `js/components/events/constants.js`
- `js/components/events/helpers.js`
- `js/components/events/pills.js`
- `js/components/events/card.js`

### Visual standards (matches recent revamps)
- Page bg: `bg-surface-50`
- Card: `bg-white rounded-2xl border border-gray-200/80 shadow-sm`
- Brand: `brand-600` (#4f46e5) for primary; chip backgrounds in `brand-50`
- z-index: bottom-tab-bar 50, sheet/modal 60, toast 70
- Inputs: `text-base sm:text-sm` (iOS zoom-safe)
- Sheet height: `max-h-[90dvh]`
- Sheet bottom safe-area: `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`
- Active tab in horizontally-scrolling tab bar must `scrollIntoView` (matches members-modal fix)

---

> **Hand-off contract.** When this doc is handed back as "Start Milestone N", the agent should:
> 1. Re-read this file from top to bottom.
> 2. Re-read `events_001.md` for the feature contract that must be preserved.
> 3. Re-read the relevant **File Impact Plan** row for the milestone.
> 4. Build only the files listed in that milestone's plan.
> 5. Mark the milestone "Shipped" in this doc with the commit hash.
