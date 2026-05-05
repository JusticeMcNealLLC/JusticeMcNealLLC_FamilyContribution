# events_008 — Event Detail Page: Mobile Redesign

**Goal:** Redesign the mobile view of the event detail page to match the reference. The desktop layout (007) stays untouched — this is a `@media (max-width: 1023px)` only overhaul.

**Reference design summary:**
- Page background: keep existing `bg-surface-50` — the lavender in the image is the mockup frame, not the app
- Hero is a **rounded card** with `16px` side margin — NOT full-bleed
- All sections stack vertically, white cards with shadow/radius — no sidebar
- Collapsible accordion pattern for About Event, What to Expect, Attendees
- Bottom CTA bar has **two buttons side-by-side** (RSVP + Message Host)

**Files in scope:**
- `js/portal/events/detail.js` — HTML output + bottom nav init
- `css/pages/portal/events/detail.css` — `.ed-*` overrides for mobile
- `css/pages/portal/events/base.css` — CTA bar styles

**Implementation order follows section numbering below.**

---

## Section 1 — Page Shell (mobile spacing) ✅ DONE

- [x] Page background: keep existing `bg-surface-50` — no change needed
- [x] Main content column: `padding:12px 0 0` on mobile — no horizontal padding on wrapper
- [x] Cards carry their own horizontal margin: `margin: 0 16px 16px` (`0 24px` on 640–1023px)
- [x] Desktop (`≥1024px`) unaffected — `.ed-content { padding:0 24px }` still applies

---

## Section 2 — Top Navigation Bar ✅ DONE

- [x] White bar, `height: 56px`, sticky top, `border-bottom: 1px solid #efefef`
- [x] Back button: `38px` circle, `border: 1.5px solid #e5e7eb`, chevron-left `20px` — label hidden on mobile
- [x] Title: `"Event Details"` `17px 700` centered via `position:absolute; left:50%; transform:translateX(-50%)`
- [x] Subtitle hidden on mobile
- [x] Share + Bookmark buttons: `38px` circles, `border: 1.5px solid #e5e7eb`, icons `18px`
- [x] Calendar button hidden on mobile (`ed-page-header-btn-cal`), bookmark shown (`ed-page-header-btn-bookmark`)
- [x] Bookmark taps `.ics` download (same as calendar — save event to calendar)
- [x] Desktop (≥1024px): back is text link left, title left-aligned column, actions are text+icon pill buttons — unchanged

---

## Section 3 — Hero Card (rounded, image/gradient, overlay) ✅ DONE

- [x] Hero is a **card** — `margin: 12px 16px`, `border-radius: 20px`, `overflow: hidden`
- [x] Height: `260px` on mobile, `min-height: 0`, `max-height: none`
- [x] Status badge top-left in `.ed-hero-nav`: uses existing `evt-status-badge` + `dotPulse` logic
- [x] Title overlay `22px` / subtitle `13px` at bottom with scrim — unchanged from 007
- [x] Hero nav padding tightened to `14px` (no 80px dead zone from old sticky header design)
- [x] Bottom content padding tightened: `16px 16px 18px` on mobile
- [x] Desktop (≥1024px): unchanged — full-bleed with `border-radius:16px` from 007

---

## Section 4 — Quick-Info Bar (date / time / location) ✅ DONE

- [x] White card, `margin: 0 16px 12px`, `border-radius: 16px`, `padding: 16px 0`, shadow: `0 1px 4px rgba(0,0,0,.06)`
- [x] 3-column flex row, equal width (`flex:1`), `1px solid #e5e7eb` vertical dividers between cols
- [x] Each column: brand-purple icon (`24px`), main value `15px 700 #111`, sub-label `12px #9ca3af`
  - Col 1: calendar icon, `Apr 1` / `Wed`
  - Col 2 (if `showTime`): clock icon, `7:30 PM` / `Start time`
  - Col 3 (if `showLocation` + venue text): pin icon, venue name (truncate) / address
- [x] Col 3 tappable → `evtOpenFullscreenMap(lat, lng)` if coordinates available
- [x] Hidden on desktop (`display:none`) — sidebar handles date/time/location there
- [x] Tablet (640–1023px): `margin: 0 24px 12px`

---

## Section 5 — Map Card ✅ DONE

- [x] Card: `margin: 0 16px 12px`, `border-radius: 16px`, `overflow: hidden`, `display:none` on desktop
- [x] Map `height: 160px`, Leaflet via `detailEventMapMobile` (separate id from desktop map)
- [x] Venue overlay card bottom-right: pin icon + name + address + "View on Maps ↗" — reuses existing `.ed-map-overlay` styles
- [x] Tapping map opens fullscreen map overlay via `evtOpenFullscreenMap`
- [x] Desktop `.ed-about-right` col hidden on mobile (avoids duplicate map/organiser)
- [x] Map init refactored into `_initMap(id)` helper used for both desktop + mobile ids

---

## Section 6 — Description + Tags ✅ DONE

- [x] No card wrapper — white bg section, `margin: 0 16px 12px`, `padding: 16px`, `border-radius: 16px`
- [x] Description text: `14px`, `line-height: 1.7`, `#374151`, max 3 lines collapsed (`4.2em`), "Read more" expander in brand color
- [x] Tag pills row below description, `margin-top: 12px`, `gap: 8px`, flex-wrap
  - Each pill: icon `14px` + label `13px`, `background: #f0f0f8`, `border-radius: 20px`, `padding: 5px 12px 5px 8px`, `color: #4f46e5`
  - Built from `event_type` + `event.category` with SVG icon map (social, food, outdoor, fitness, games, music, travel, llc, member, competition)

---

## Section 7 — Attendees Row ✅ DONE

- [x] White card, `margin: 0 16px 12px`, `padding: 14px 16px`, `border-radius: 16px`
- [x] Layout: avatar stack (left) + count + "See all ›" (right)
- [x] Avatar stack: `36px` circles `.ed-avatar-sm`, `-8px` overlap, `2px` white border, max 4 shown + `+N` bubble
- [x] Count text: `"{N} going"` — `15px 700 #111`, beside stack with `12px` gap
- [x] `See all ›` aligned right, brand color `13px`
- [x] Desktop attendees `.ed-about-desc-col` hidden on mobile to avoid duplicate

---

## Section 8 — Hosted By Row

- [ ] White card, `margin: 0 16px 12px`, `padding: 14px 16px`, `border-radius: 16px`
- [ ] Layout: avatar `44px` circle (left) → label column → badge → chevron (right)
  - "Hosted by" label: `11px #9ca3af`
  - Host name: `16px 700 #111`
  - "Organizer of this event" sub-label: `12px #9ca3af`
  - Badge chip: "Member" / "Admin" etc. — matching existing `evtBadgeChip()` output
  - Chevron-right `16px #9ca3af`, tapping opens host profile or sends message

---

## Section 9 — Collapsible Accordion Sections

Each section below the main cards is an **accordion row** — icon left, title, chevron right, body collapses/expands with smooth `max-height` transition.

- [ ] Accordion wrapper: `margin: 0 16px 8px`, `border-radius: 16px`, `background: #fff`, `overflow: hidden`
- [ ] Row height: `56px`, `padding: 0 16px`, `border-bottom: 1px solid #f3f4f6` when multiple rows in one card
- [ ] Left icon: `36px` circle, brand-50 bg, brand-600 icon, `border-radius: 10px`
- [ ] Title: `15px 600 #111`
- [ ] Chevron: `18px #9ca3af`, rotates `180deg` when open
- [ ] Body: `padding: 12px 16px 16px`, `font-size: 14px`, `color: #374151`, `line-height: 1.6`
- [ ] **About Event**: `ℹ` icon, expands full description text + "Read more/less" if long
- [ ] **What to Expect** (only if notes field is set): 🎁 icon, expands notes/special instructions
- [ ] **Attendees**: 👥 icon, expands avatar grid — rows of attendees (going / interested) with name + status
- [ ] Only one accordion open at a time (close others on open)

---

## Section 10 — Bottom CTA Bar (mobile)

- [ ] Update from current single-button bar to **two-button layout**:
  - **Left (primary)**: brand purple `#4f46e5`, full fill, `border-radius: 14px`, `flex: 1`
    - Main label: `RSVP` / `Going ✓` / etc. — `16px 700` white
    - Sub-label below: `"Let the host know you're coming"` / state-specific — `11px rgba(255,255,255,.75)`
  - **Right (secondary)**: white outline `border: 2px solid #e5e7eb`, `border-radius: 14px`, `flex: 1`
    - Icon: chat bubble `18px`, label `"Message Host"` — `14px 600 #374151`
    - Tapping opens DM compose (or `mailto:` fallback)
- [ ] Bar: `padding: 12px 16px`, `background: #fff`, `border-top: 1px solid #f3f4f6`
  - `padding-bottom: max(12px, env(safe-area-inset-bottom))`
  - Positioned above bottom-tab-bar: `bottom: calc(56px + env(safe-area-inset-bottom, 0px))`
- [ ] **Host state**: primary becomes muted gray `⭐ Hosting` (disabled) — secondary changes to `Manage Event` (outline, brand color), tapping opens manage sheet
- [ ] **Going state**: primary becomes green `✓ Going` (disabled) — keep Message Host secondary
- [ ] **Cancelled/Closed**: both buttons muted/disabled

---

## Implementation Order

1. Section 3 — Hero Card (rounded card + overlay)
2. Section 4 — Quick-Info Bar
3. Section 10 — Bottom CTA Bar (2-button layout)
4. Section 1 — Page Shell background
5. Section 2 — Top Nav Bar adjustments
6. Section 5 — Map Card mobile style
7. Section 6 — Description + Tags accordion
8. Section 7 — Attendees Row
9. Section 8 — Hosted By Row
10. Section 9 — Collapsible Accordion Sections

---

## Notes

- All changes scoped to `@media (max-width: 1023px)` unless noted
- Desktop layout (007) must not be affected
- Existing `.ed-*` classes are extended/overridden — no renames
- Accordion open/close state managed by `detail.js` (add `evtInitAccordions()` post-render call)
- "Message Host" tap: use `window.location = 'feed.html?dm={userId}'` or emit a custom event for the portal shell to handle
