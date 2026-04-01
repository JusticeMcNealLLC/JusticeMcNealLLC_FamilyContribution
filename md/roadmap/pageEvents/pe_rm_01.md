# PE-RM-01: Convert Event Modal → Full Event Page

**Created:** March 31, 2026
**Status:** Complete
**Priority:** High
**Scope:** Portal events — detail view only (public event page is unaffected)

---

## Summary

Replace the current full-screen modal (`detailModal`) used to display event details in the portal with a **dedicated, URL-driven event page**. When a member clicks an event card on `portal/events.html`, instead of opening a modal overlay, the app navigates to a standalone page that loads the event by slug from the URL.

---

## Current Architecture

### How It Works Today
1. `portal/events.html` renders a grid of event cards via `list.js → evtRenderCard()`
2. Clicking a card calls `evtOpenDetail(eventId)` in `detail.js`
3. `evtOpenDetail()` queries Supabase for all event data (RSVPs, check-ins, cost items, waitlist, raffle, competition, documents, map, scrapbook, comments, host status)
4. It builds a massive HTML string (~900 lines) and injects it into `#detailContent` inside the `#detailModal` overlay
5. `evtToggleModal('detailModal', true)` shows the modal (fixed overlay, full-screen on mobile, centered panel on desktop)
6. A close button or clicking the backdrop calls `evtToggleModal('detailModal', false)` to hide it

### What's Wrong With the Modal Approach
- **No shareable URL** — you can't link directly to a portal event detail view; the URL never changes
- **No browser history** — back button exits the entire events page instead of closing the detail view
- **SEO/accessibility** — modals are harder to navigate with screen readers and have no page title
- **Heavy DOM** — the entire events list stays rendered behind the modal, wasting memory
- **State persistence** — refreshing the page loses the detail view entirely
- **Deep linking** — other portal pages (feed, profile, notifications) can't link to a specific event detail

### Files Involved
| File | Role |
|---|---|
| `portal/events.html` | Contains `#detailModal` div, `#detailContent` container, all event CSS |
| `js/portal/events/detail.js` | `evtOpenDetail()` — the main function (~1070 lines), fullscreen map, ICS download |
| `js/portal/events/list.js` | Card click handler → `evtOpenDetail(card.dataset.eventId)` |
| `js/portal/events/init.js` | Wires up `#detailModalOverlay` click → close |
| `js/portal/events/utils.js` | `evtToggleModal()` — show/hide + body scroll lock |
| `js/portal/events/rsvp.js` | Calls `evtOpenDetail(eventId)` after RSVP actions to refresh |
| `js/portal/events/competition.js` | Calls `evtOpenDetail(eventId)` after competition actions (~8 call sites) |
| `js/portal/events/documents.js` | Calls `evtOpenDetail(eventId)` after document actions (~3 call sites) |
| `js/portal/events/raffle.js` | Calls `evtOpenDetail(eventId)` after raffle draw |
| `js/portal/events/create.js` | Calls `evtOpenDetail(data.id)` after event creation |
| `js/portal/events/scrapbook.js` | Photo upload/gallery within detail view |
| `js/portal/events/map.js` | Live location map within detail view |
| `js/portal/events/scanner.js` | QR scanner modal (separate modal, stays as-is) |

### Call Sites for `evtOpenDetail()`
- `list.js` — card click (1 site)
- `create.js` — after event creation (1 site)
- `rsvp.js` — after RSVP/waitlist/cancel actions (6 sites)
- `competition.js` — after competition actions (8 sites)
- `documents.js` — after document upload/delete (3 sites)
- `raffle.js` — after raffle draw (1 site)
- **Total: ~20 call sites** that currently trigger `evtOpenDetail(eventId)`

---

## Target Architecture

### URL Pattern
```
/portal/events.html?event={slug}
```

This follows the same query-parameter routing pattern already used by the public event page (`/events/?e={slug}`). Since this is a static GitHub Pages site, we use query parameters rather than path-based routing.

### How It Will Work
1. `portal/events.html` checks for an `?event={slug}` query parameter on page load
2. **If slug present:** fetch the event by slug, render the full detail view directly into the main content area (replacing the event list), update the page `<title>` to the event name
3. **If no slug:** render the normal event list feed (current behavior, unchanged)
4. Clicking an event card navigates via `window.location.href` (or `history.pushState` + dynamic swap) to `?event={slug}`
5. Browser back button returns to the event list naturally
6. All `evtOpenDetail(eventId)` call sites are updated to navigate to the event page URL instead of opening a modal
7. After mutation actions (RSVP, raffle draw, etc.), the detail view refreshes in-place without navigation

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Routing method | Query parameter (`?event={slug}`) | Consistent with public page pattern, works on static hosting |
| Navigation method | `history.pushState` + dynamic content swap | No full page reload — faster transitions, preserves auth state |
| Back button | `popstate` listener restores list view | Natural browser UX |
| URL updates | Slug-based (not UUID) | Human-readable, shareable within the family |
| Detail view container | Reuse `#eventsContainer` (swap list for detail) | Single content area, clean DOM |
| Page title | Dynamic `document.title = event.title + ' | Events'` | Better tab/bookmark identification |
| Fresh data on navigate | Always re-fetch from Supabase on detail load | Ensures up-to-date info |
| Post-action refresh | Re-call the detail renderer (no navigation) | Smooth UX after RSVP/raffle/etc. |

---

## Implementation Plan

### Step 1 — URL Routing & Page Shell
*Set up the routing layer that decides list vs. detail view.*

- [x] Add URL detection in `init.js` — check `URLSearchParams` for `event` param on `DOMContentLoaded`
- [x] Create `evtNavigateToEvent(slug)` helper in `utils.js` — uses `history.pushState` to update URL and triggers detail render
- [x] Create `evtNavigateToList()` helper — uses `history.pushState` to clear the `event` param and restores list view
- [x] Add `popstate` event listener for browser back/forward button support
- [x] Update `document.title` dynamically on navigation (event title for detail, "Events" for list)

### Step 2 — Convert Detail Rendering to Page View
*Refactor `evtOpenDetail()` to render into the main content area instead of a modal.*

- [ ] Rename `evtOpenDetail()` → `evtRenderDetailPage(eventId)` (or accept slug)
- [x] Change render target from `#detailContent` (modal) → main content area (hide event list, show detail)
- [x] Replace the modal close button (×) with a **back button** (← Back to Events) that calls `evtNavigateToList()`
- [x] Remove `evtToggleModal('detailModal', true/false)` calls from the detail flow
- [x] Keep the existing data-fetching logic and HTML layout — just change the container target
- [x] Add slug-based lookup: if called with slug (from URL), query `events` by slug first to get the UUID
- [x] Ensure the detail view uses the full page width (no modal panel constraints)

### Step 3 — Update All Call Sites
*Replace every `evtOpenDetail(eventId)` call with the new navigation or refresh pattern.*

- [x] `list.js` — card click: change to `evtNavigateToEvent(event.slug)` (need slug on the card `data-` attribute)
- [x] `create.js` — after creation: navigate to the new event's slug
- [x] `rsvp.js` — after RSVP actions: `evtOpenDetail(eventId)` re-renders in-place (no modal, correct container)
- [x] `competition.js` — after competition actions: `evtOpenDetail(eventId)` re-renders in-place
- [x] `documents.js` — after document actions: `evtOpenDetail(eventId)` re-renders in-place
- [x] `raffle.js` — after raffle draw: `evtOpenDetail(eventId)` re-renders in-place
- [x] `rsvp.js` — status/cancel/delete: `evtNavigateToList()` instead of modal close
- [x] `rsvp.js` — duplicate: `evtNavigateToEvent(slug)` to open the copy
- [x] `create.js` — preview: renders into `#eventsDetailView` with back-to-editor button

### Step 4 — Clean Up Modal Artifacts
*Remove the modal infrastructure that's no longer needed.*

- [x] Remove `#detailModal` and `#detailContent` div from `portal/events.html`
- [x] Remove `#detailModalOverlay` click listener from `init.js`
- [x] Update `#detailContent` CSS selectors to `#eventsDetailView` in `portal/events.html`
- [x] Remove `detailModal`-specific logic from `evtToggleModal()` (z-index hack, map cleanup)
- [x] Add map cleanup to `evtRouteByUrl()` when switching to list view
- [x] Clean up `evtCloseFullscreenMap()` — no longer checks detailModal state

### Step 5 — Deep Link Support & Polish
*Handle edge cases and ensure robustness.*

- [x] Handle invalid/unknown slug in URL — show a "Event not found" message with link back to list
- [x] Handle direct page load with `?event={slug}` (user opens a shared link or refreshes)
- [x] Preserve any existing query params (e.g., if other features add params later)
- [x] Browser back/forward navigation via `popstate` listener
- [x] Updated fullscreen map overlay to work without detail modal's z-index assumptions
- [x] QR scanner modal works independently (already separate, no regressions)
- [x] Detail page scrolls naturally (no modal scroll container)
- [x] Bottom tab bar visible on detail page (no z-index overrides needed)

---

## File Changes Summary

| File | Change Type | Description |
|---|---|---|
| `js/portal/events/init.js` | Modify | Add URL routing on load, `popstate` listener, remove `detailModalOverlay` listener |
| `js/portal/events/utils.js` | Modify | Add `evtNavigateToEvent(slug)`, `evtNavigateToList()` helpers |
| `js/portal/events/detail.js` | Modify | Refactor `evtOpenDetail()` → page render, slug lookup, back button, remove modal toggling |
| `js/portal/events/list.js` | Modify | Card click → `evtNavigateToEvent(slug)`, add `data-slug` to cards |
| `js/portal/events/create.js` | Modify | Post-create → navigate to event slug |
| `js/portal/events/rsvp.js` | Modify | Replace `evtOpenDetail()` calls with in-place detail refresh |
| `js/portal/events/competition.js` | Modify | Replace `evtOpenDetail()` calls with in-place detail refresh |
| `js/portal/events/documents.js` | Modify | Replace `evtOpenDetail()` calls with in-place detail refresh |
| `js/portal/events/raffle.js` | Modify | Replace `evtOpenDetail()` call with in-place detail refresh |
| `portal/events.html` | Modify | Remove `#detailModal` div, remove modal CSS, add detail container/back-button area |

**No new files needed.** This is a refactor of existing code, not a new feature.

---

## What Stays the Same
- **Public event page** (`/events/?e={slug}`) — completely unaffected, no changes
- **Admin events dashboard** (`admin/events.html`) — unaffected
- **Create event modal** — stays as a modal (it's a form, not a content page)
- **QR scanner modal** — stays as a modal (camera overlay)
- **Raffle draw modal** — stays as a modal (animation overlay)
- **All data-fetching logic** — same Supabase queries, same data flow
- **All HTML layout/sections** — same visual output, just in a page instead of a modal
- **All sub-features** — RSVP, raffle, competition, documents, map, scrapbook, comments — all work the same

---

## Migration Notes
- The `evtOpenDetail()` function signature currently takes `eventId` (UUID). The new `evtRenderDetailPage()` should accept either a UUID or slug and handle both cases (slug → query by slug, UUID → query by id). This is needed because post-action refreshes know the eventId, while URL routing provides the slug.
- The `evtAllEvents` array (cached on page load) may not contain the event if the user arrives via a direct link. The detail page must always query Supabase directly, not rely on the cached list.
- `history.pushState` doesn't trigger `popstate` — only browser back/forward does. The `evtNavigateToEvent()` helper must both push state AND trigger the render.

---

## Testing Checklist (Code Audit Results)

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | Click event card → navigates to `?event={slug}`, shows detail page | ✅ PASS | `list.js` L86-93: card click calls `evtNavigateToEvent(event.slug)` which does `pushState` + renders detail |
| 2 | Browser back button → returns to event list | ✅ PASS | `init.js` L38: `popstate` listener calls `evtRouteByUrl()` which checks URL params and switches view |
| 3 | Browser forward button → returns to detail page | ✅ PASS | Same `popstate` handler re-reads `?event=` param and loads detail via `evtLoadDetailBySlug()` |
| 4 | Direct URL `portal/events.html?event=ski-trip-2026` → loads event detail | ✅ PASS | `init.js` L30: `evtRouteByUrl()` called on `DOMContentLoaded` after `evtLoadEvents()` — reads `?event=` param |
| 5 | Invalid slug URL → shows "not found" with back link | ✅ PASS | `utils.js` `evtLoadDetailBySlug()`: tries cache, then Supabase query; if no match, renders "Event not found" UI with back link |
| 6 | Refresh on detail page → detail page persists | ✅ PASS | URL retains `?event={slug}` across refresh; `evtRouteByUrl()` on load re-fetches and renders |
| 7 | RSVP from detail page → detail refreshes in-place (URL stays) | ✅ PASS | `rsvp.js`: all 6 RSVP action sites call `evtRenderEvents()` then `await evtOpenDetail(eventId)` for in-place refresh |
| 8 | Raffle draw → detail refreshes in-place | ✅ PASS | `raffle.js` L249: "All Winners Drawn" button calls `evtOpenDetail(eventId)` to refresh detail |
| 9 | Competition action → detail refreshes in-place | ✅ PASS | `competition.js`: 8 call sites (L478, 556, 590, 616, 656, 686, 725, 815) all call `evtOpenDetail(eventId)` |
| 10 | Document upload/delete → detail refreshes in-place | ✅ PASS | `documents.js`: 3 call sites (L240, 284, 313) all call `evtOpenDetail(eventId)` |
| 11 | Create event → navigates to new event's detail page | ✅ PASS | `create.js` L~608: post-create calls `evtNavigateToEvent(data.slug)` which pushes URL and renders detail |
| 12 | QR scanner works from detail page | ✅ PASS | `scannerModal` (z-60) is a standalone fixed overlay in `events.html` L810 — independent of old modal system |
| 13 | Fullscreen map works from detail page | ✅ PASS | `fullscreenMapOverlay` (z-80) is a standalone fixed overlay in `events.html` L851; `evtCloseFullscreenMap()` cleaned of modal references |
| 14 | Bottom tab bar visible on detail page | ✅ PASS | `#eventsDetailView` is a regular page-flow div (not fixed/absolute overlay), so layout.js bottom nav renders normally |
| 15 | Mobile scroll behavior is natural (no modal scroll trapping) | ✅ PASS | No `overflow:hidden` on body for detail view; `padding-bottom: env(safe-area-inset-bottom)` on `#eventsDetailView` for safe area |
| 16 | Auth redirect preserves `?event=` param on return | ⚠️ KNOWN LIMITATION | `auth.js` L10: `window.location.href = APP_CONFIG.LOGIN_URL` — does NOT append return URL or preserve query params. Deep links lost on auth redirect. **Future fix needed.** |
| 17 | Page title updates to event name on detail, "Events" on list | ✅ PASS | `detail.js` L~907: sets `document.title = event.title + ' \| Events \| Justice McNeal LLC'`; list view restores default title |

**Summary:** 16/17 PASS, 1 known limitation (auth redirect doesn't preserve deep link — tracked for future fix)

---

**Last Updated:** July 5, 2025