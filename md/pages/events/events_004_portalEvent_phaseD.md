# events_004 · Portal Events — Phase D (Power Features)

> **Parent spec:** [events_003_portalEvent_visualOverhaul.md](events_003_portalEvent_visualOverhaul.md)
> **Status:** Phase D opened. **D3 shipped** (SW `v53 → v54`). **D1 shipped** (SW `v54 → v55`). D2 + D4 pending.
> **Prereqs:** Phase A1+A2+A3+B1–B5+C1–C4 shipped.
> **Scope:** D1 calendar/agenda toggle · D2 swipe gestures · D3 search history & suggestions · D4 dark-mode pass.
> **Out of scope:** new data contracts, new queries, admin-surface changes, notification schema.

---

## Ship order & cache bumps

| # | Item | Risk | SW bump | Notes |
|---|---|---|---|---|
| **D3** | Search history & suggestions | Low | `v53 → v54` | Builds on C3 `sessionStorage`; pure client. |
| **D1** | Calendar / agenda view toggle | Med | `v54 → v55` | New view mode, reuses existing data. |
| **D2** | Swipe gestures | Med | `v55 → v56` | Touch-only, mobile-gated. |
| **D4** | Dark mode pass | Med | `v56 → v57` | Token audit across `portal-events.css`. |

Each item ships as its own commit. Do NOT batch D1+D2+D3+D4.

---

## D1 — Calendar / agenda view toggle

> ✅ **SHIPPED** — SW `v54 → v55`. Smoke: `test/_smoke-d1.js` 30/30 pass.
>
> Implementation notes:
> - New state `_activeView` (`'list' | 'calendar'`) + `_calMonth` (first-of-viewed-month `Date`). Persisted in `evt_list_state_v1` under `v`.
> - `#evtViewToggle` button (icon-only, right of search toggle in `#evtFilterStrip`) toggles views; `aria-pressed` tracks state; icon swaps so users see the *other* view’s icon.
> - `renderEvents()` short-circuits to `_renderCalendar()` when `_activeView === 'calendar'`, hiding hero / going rail / live banner / groups / active-filter pill.
> - `_renderCalendar()` draws weekday row + leading-blank cells + day cells. Each day cell shows day number + up to 3 colored dots (category gradient first color) + `+N` overflow.
> - `_groupEventsByDay(all)` respects `_matchesType` + `_matchesCategory` so the visible dataset mirrors the list view.
> - Month nav: `‹` prev, `›` next, `Today` reset. Client-side only — no reload.
> - Tap day cell → `_openDayModal(dateKey)` opens bottom-sheet (mobile) / centered modal (sm+) populated with the reused `_miniCard` renderer. Esc or scrim tap closes.
> - `body.evt-view--calendar` hides `#evtLifecycleSeg`, `#evtHero`, `#evtGoingRail`, `#evtLiveBanner`, `#evtActiveFilters` via CSS.
> - `prefers-reduced-motion` kills the fade-in on both the calendar mount and the day modal.

**Goal:** let members switch between today's **list view** and a month-calendar grid that highlights days with events.

### D1.1 Entry point
- Add a second button to the right of the existing lifecycle segmented control:
  `[ Upcoming | Past | Going ]  [ 📅 Calendar ]`
- Button toggles `body.evt-view--calendar`; list hides, calendar mounts into `#evtCalendarMount`.
- Persist the view choice in `evt_list_state_v1` under `view: 'list' | 'calendar'`.

### D1.2 Calendar grid
- Month grid, 7 columns. Current month default; prev/next arrows in header.
- Day cell shows: day number, up to 3 colored dots (one per event), `+N` overflow indicator.
- Dot color = category gradient start color (reuses `C.CATEGORY_GRADIENT`).
- Tap day → opens bottom-sheet / modal listing that day's events (reuses `EventsCard.renderMini`).

### D1.3 Data reuse
- Reuses the same `loadEvents()` dataset — no new query. Filters to events in the visible month by `start_date`.
- When user switches month, no reload — client-side date window.

### D1.4 Non-goals
- No drag-to-create, no week view, no iCal export (those are Phase E+).

---

## D2 — Swipe gestures (mobile-only)

**Goal:** add native-app-feeling quick actions on cards.

### D2.1 Gestures
- **Swipe left on a Going-rail card** → reveals a red "Cancel RSVP" action button. Tap to confirm. Swipe right or tap card to dismiss.
- **Long-press any card (500ms)** → opens context sheet with: `Share link`, `Copy link`, `Add to calendar (.ics)`, `Hide from list` (session-only).

### D2.2 Implementation
- `_initSwipeGestures()` in `list.js`, touch-only, gated on `innerWidth < 640` + `'ontouchstart' in window`.
- Delegated on `#evtGoingRailScroll` for swipe, on `#evtList` for long-press.
- Respect `prefers-reduced-motion` — skip the reveal animation, show the button immediately.

### D2.3 Non-goals
- No swipe-to-RSVP (too easy to fire accidentally).
- No per-card reordering.

---

## D3 — Search history & suggestions ⭐ **shipping first**

> ✅ **SHIPPED** — commit SW `v53 → v54`. Smoke: `test/_smoke-d3.js` 26/26 pass.

**Goal:** when the user opens the search pill with no active query, show their recent searches + a few category shortcuts.

### D3.1 Data model
- New `sessionStorage` key `evt_search_hist_v1` holding an array of up to **8** recent non-empty queries, MRU-ordered, de-duped case-insensitively.
- Record a query on search-commit: debounced input change fires record after 600ms of no typing AND query length ≥ 2, OR on explicit Enter.
- Record trims whitespace; dedupes against existing (case-insensitive); prepends; caps at 8.

### D3.2 Suggestions dropdown
- Host element `#evtSearchSuggest` injected once, inside the expanded search row below `#evtSearchInput`.
- Renders when: search is expanded AND `#evtSearchInput.value.trim() === ''`.
- Two sections:
  1. **Recent** — up to 5 history entries. Each is a row: `🕐 {query} ×` (× removes from history, row itself re-runs the search).
  2. **Quick categories** — 4 chips derived from `C.CATEGORY_EMOJI` top entries (cookout, birthday, trip, celebration) or the 4 distinct categories with the highest event count in the current dataset. Tapping a chip runs the same action as C2 category-chip click (`_activeCategory = category`, close suggest, re-render).
- When user starts typing, suggest hides instantly.
- When input is cleared (via × clear button), suggest re-opens if search toggle is still open.

### D3.3 Interaction details
- Dropdown uses the same `.rounded-xl bg-white shadow-lg ring-1 ring-black/5` treatment as the type-menu popover for visual consistency.
- `Esc` key closes suggest AND collapses the search pill (existing behavior).
- Outside-click closes suggest only (leaves pill open).
- Keyboard: up/down arrows move focus between rows/chips; Enter activates; `aria-activedescendant` on input.

### D3.4 Persistence & privacy
- History stays in `sessionStorage` only — never localStorage. Cleared on tab close.
- No server-side record; no telemetry beacon.
- "Clear history" affordance as the last row in Recent when list is non-empty: `🗑 Clear search history`.

### D3.5 CSS
- `.evt-search-suggest` — absolute-positioned under the input, full-width of the expanded search container, `z-40`, max-height `60vh`, scroll-y.
- `.evt-suggest-row` — 40px min-height, flex, `gap-2`, hover `bg-brand-50`, active scale 0.99.
- `.evt-suggest-chip-row` — horizontal-scroll strip of category chips.
- Respect `prefers-reduced-motion` on the fade-in (120ms `opacity` only, no transform).

### D3.6 Acceptance
1. First visit: open search → empty input → suggest shows Quick Categories only (no Recent section).
2. Type "cook" + wait 600ms → collapse pill → re-open → Recent shows "cook".
3. Type "COOK" → Recent does NOT duplicate (case-insensitive dedupe).
4. Tap `🗑 Clear search history` → Recent section disappears, Quick Categories remain.
5. Tap a Quick Category chip → suggest closes, `_activeCategory` pill appears, list re-renders.
6. `prefers-reduced-motion: reduce` → suggest uses opacity-only fade.

### D3.7 Non-goals
- No server-side suggestions.
- No fuzzy typo correction.
- No "trending" section (needs analytics).

---

## D4 — Dark mode pass

**Goal:** portal events page renders correctly when user/system toggles dark.

### D4.1 Strategy
- Add `data-theme="dark"` attribute on `<html>` toggled by `prefers-color-scheme: dark` **AND** an explicit toggle in Settings (already stubbed).
- All of `css/pages/portal-events.css` reviewed for hard-coded white/gray; replace with CSS variables already defined in `css/shared.css`.

### D4.2 Specifics
- Hero card, going rail, live banner, FAB, active-filter pill, PTR indicator, search suggest — all audited.
- Category gradients remain vivid in dark mode; only the **banner overlay alpha** bumps from `0.15 → 0.35` so emoji watermarks stay legible.
- Pinned 📌 marker background flips from white → slate-800.

### D4.3 Acceptance
- `document.documentElement.dataset.theme = 'dark'` → no white backgrounds remain, all text meets WCAG AA contrast.

---

## Rollout

- Each item ships behind its own feature flag during QA: `?d1=1`, `?d2=1`, `?d3=1`, `?d4=1`.
- Once green on real device, flag is removed in the SW bump commit for that item.
- All items respect `prefers-reduced-motion`.

## Locked invariants (still governing)
- §4.3 hero pick, §4.4 two-tier search, §12.1 avatar query contract, legacy global aliases, `data-evt-*` hooks, pinned 📌, greeting, per-viewer empty states, C3 `evt_list_state_v1` persistence schema.
