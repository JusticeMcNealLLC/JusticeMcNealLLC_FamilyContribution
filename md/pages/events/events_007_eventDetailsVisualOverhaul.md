# events_007 — Event Details Visual Overhaul

**Goal:** Redesign the event detail page to match the ParkConnect reference — rich desktop layout with a right sidebar, immersive hero with title/meta overlay, and polished content cards below.

**Files in scope:**
- `js/portal/events/detail.js` — HTML generation (sections, hero, cards)
- `css/pages/portal/events/detail.css` — All `.ed-*` styling
- `portal/events.html` — Shell markup (sidebar slot, desktop grid)

---

## Section 1 — Page Header Bar ✅ DONE

- [x] Add a top "Event Details" header strip above the hero: `← Back to Events` button on left, `Event Details` h2 + subtitle in center, `Share` + `Add to Calendar` action buttons on right
- [x] Style as a white bar with bottom border (`#e5e7eb`), `max-width: 80rem`, padding `14px 24px` desktop
- [x] Mobile: condensed — back arrow only (no "Back to Events" label), `16px` title, subtitle hidden, buttons icon-only (no text labels), `Add to Calendar` button hidden on mobile
- [x] Hero back pill (`.evt-hero-back-btn`) hidden globally — page header provides back nav on all breakpoints
- [x] Files changed: `js/portal/events/detail.js` (header HTML injected before hero), `css/pages/portal/events/detail.css` (`.ed-page-header*` rules + mobile overrides)

---

## Section 2 — Hero Banner ✅ DONE

- [x] Hero height: `420px` min desktop, `280px` mobile (was 320px/300px)
- [x] Darker gradient scrim: `rgba(0,0,0,.88)` at bottom → `.25` at top (was `.78` → `.08`)
- [x] Event title overlaid in hero bottom-left: `ed-hero-title` — `36px` desktop / `22px` mobile, `800` weight, white with text-shadow
- [x] Host + category subtitle below title: `Hosted by {name} • {category}` — `13px`/`14px`, `rgba(255,255,255,.72)`
- [x] Date/time/location info bar: 3-column flex row with calendar/clock/pin icons, main + sub labels — columns divided by `rgba(255,255,255,.18)` separators; location column hidden on mobile (too tight)
- [x] Status badge + share pill remain top-right; back pill stays hidden (handled by S1 page header)
- [x] Files changed: `js/portal/events/detail.js` (hero bottom content), `css/pages/portal/events/detail.css` (`.ed-hero*` rules)

---

## Section 3 — Title + Meta Card (main left column) ✅ DONE

- [x] Since title moves to hero, replace `.ed-card-title` with a clean **quick-info** card: no repeated title; show only date/time row, location row, "+ Add to calendar" link
- [x] Give each meta row an icon container with a soft colored rounded square background (`48px`, brand-50 fill, icon stroke brand-600)
- [x] Add a `View on Maps ↗` link after location name (matching reference style — brand color, underline on hover)
- [x] Show RSVP deadline notice inline here if applicable (soft amber banner, `12px`)

---

## Section 4 — About / Description Card ✅ DONE

- [x] Section heading: `About This Event` (bold, `16px`, `#111`)
- [x] Body text at `15px`, `line-height: 1.75`, `#484848`
- [x] Collapse at `130px` with a "Read more" expand link (kept)
- [x] Add category tag pills row below description body: event-type pill (llc/member/competition colors) + category pill (green)
- [x] Separate "Hosted by" organizer row into its own visual block below description: 48px avatar, "Organizer of this event" label, name bold, role/title gray — moved below desc with divider

---

## Section 5 — RSVP / Action Card ✅ DONE

- [x] Primary RSVP button: full-width, brand-600, `border-radius: 12px`, `height: 52px`, `font-size: 16px font-weight: 600`
- [x] Secondary "Message Host" button: full-width outline variant, same dimensions, shown below primary
- [x] "You're going!" confirmed state: green check icon + "We'll see you there." sub-text, with `Update RSVP` outline button below
- [x] Interested / Maybe option: keep as secondary row of smaller pill buttons
- [x] Hosting state: `⭐ Hosting` muted pill (replaces notice card)
- [x] Remove hard box-shadow from RSVP card; use border only (`1px solid #e5e7eb`)

---

## Section 6 — Attendees Card ✅ DONE

- [x] Avatar stack: `40px` circles, `-8px` overlap, `2.5px` white border
- [x] Show `{n} going` count in bold `16px` to the right of the stack
- [x] Add `See all →` link (brand color) aligned right
- [x] Card title: `Who's Going` with icon

---

## Section 7 — Map Card ✅ DONE

- [x] Map height: `200px` mobile, `220px` desktop (keep current)
- [x] Add venue name + address as a white overlay card in the bottom-left of the map (like reference: white rounded card with pin icon, name bold, address gray)
- [x] `View on Maps ↗` link styled as a text button inside the overlay card
- [x] Remove the external directions bar below map — move directions into the overlay card instead
- [x] Map moved into about-grid right column below Hosted By card
- [x] Drag-vs-click detection (mousedown/mouseup + touch) so panning the map doesn't trigger fullscreen

---

## Section 8 — Right Sidebar (desktop only, ≥ 1024px) ✅ DONE

- [x] Add a `#evtDetailRail` aside in `portal/events.html` alongside the detail view — hidden on mobile
- [x] **Event Summary panel**: small thumbnail (80px square, rounded-12), title (bold `14px`), `Hosted by {name}`, category badge
- [x] **Date / Time / Location rows**: each as a labeled info row with icon — same style as reference (icon left, label bold, value gray below)
- [x] **Your RSVP panel**: green check card when going ("You're going! · We'll see you there"), `Update RSVP` outline button
- [x] **Upcoming Reminder countdown**: 4-cell countdown grid (Days / Hours / Mins / Secs) with light gray cells + bold numbers; live setInterval tick
- [x] **Share This Event**: row of social icon circles (link copy, Facebook, X, Instagram) — brand-100 bg, brand-600 icon stroke
- [x] Sidebar panels use `border: 1px solid #e5e7eb`, `border-radius: 16px`, `padding: 20px`, white bg, `box-shadow: 0 1px 4px rgba(0,0,0,.06)`
- [x] Page content expanded edge-to-edge on desktop (removed `max-width:80rem; margin:0 auto` from `.ed-content` and `.ed-page-header-inner`)
- [x] Attendee avatar stack capped at 5 max shown

---

## Section 9 — Discussion / Comments Card ✅ DONE

- [x] Section heading: `Discussion` (keep)
- [x] Comment input: `border-radius: 24px`, `border: 1px solid #e5e7eb`, left avatar, right "Post" brand button
- [x] Comment rows: avatar + name bold + timestamp gray + text — clean, no extra padding
- [x] Empty state: centered 💬 icon + "No comments yet. Be the first!" copy
- [x] Enter key submits comment; self-avatar filled from profile picture

---

## Section 10 — Related Events Card ⏭️ SKIPPED

> User decided not to include this section.

---

## Section 11 — Host Controls Card ✅ DONE (moved to Manage Sheet)

- [x] Host Controls, Event Stats, and Attendee Breakdown moved into the **Manage Event** sheet (Overview tab)
- [x] Inline host controls card removed from detail page
- [x] Scanner button moved into Manage sheet (Quick Actions, Overview tab)
- [x] Venue QR canvas moved into Manage sheet (Overview tab)
- [x] "Manage Event" button in RSVP card opens the sheet via `window.EventsManage.open()`

---

## Section 12 — Bottom CTA Bar (mobile only) ✅ DONE

- [x] Fixed bar at bottom, positioned above bottom-tab-bar (`bottom: calc(56px + env(safe-area-inset-bottom))`), z-index 49
- [x] Single primary CTA button: `RSVP` / `RSVP — $X` / `Going ✓` / `Hosting ⭐` / `Raffle Entry` — state-aware
- [x] Hosting state: `⭐ Hosting` muted, disabled (`evt-cta-host` class)
- [x] Safe-area-inset-bottom padding for notched phones
- [x] Hidden on desktop (≥768px) via `@media (max-width: 767px)`
- [x] Body padding-bottom accounts for both CTA bar + tab bar (`evt-cta-active.has-bottom-bar`)
- [x] Implemented in `js/portal/events/detail.js` (`evtInitBottomNav`) + `css/pages/portal/events/base.css` (`.evt-cta-bar`)

---

## Implementation Order

1. Section 2 — Hero (title + subtitle overlay + info bar)
2. Section 8 — Right Sidebar panels (desktop)
3. Section 3 — Title + Meta Card cleanup
4. Section 5 — RSVP Card restyling
5. Section 1 — Page Header Bar (desktop)
6. Section 4 — Description + tags + organizer
7. Section 6 — Attendees Card
8. Section 7 — Map Card overlay
9. Section 9 — Comments Card
10. Section 10 — Related Events
11. Section 11 — Host Controls
12. Section 12 — Bottom CTA Bar
