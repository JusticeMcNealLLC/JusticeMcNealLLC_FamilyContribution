# PE-RM-01: Convert Event Modal → Full Event Page

**Created:** March 31, 2026
**Status:** In Progress (Step 2 Complete)
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
- [ ] `create.js` — after creation: navigate to the new event's slug
- [ ] `rsvp.js` — after RSVP actions: call `evtRenderDetailPage(eventId)` in-place (no navigation, just refresh)
- [ ] `competition.js` — after competition actions: call `evtRenderDetailPage(eventId)` in-place
- [ ] `documents.js` — after document actions: call `evtRenderDetailPage(eventId)` in-place
- [ ] `raffle.js` — after raffle draw: call `evtRenderDetailPage(eventId)` in-place
- [ ] Add `data-slug` attribute to event cards in `evtRenderCard()` for click-to-navigate

### Step 4 — Clean Up Modal Artifacts
*Remove the modal infrastructure that's no longer needed.*

- [ ] Remove `#detailModal` and `#detailContent` div from `portal/events.html`
- [ ] Remove `#detailModalOverlay` click listener from `init.js`
- [ ] Remove `detailModal`-specific CSS styles from `portal/events.html`
- [ ] Remove modal-specific logic from `evtToggleModal()` for `detailModal` (keep for scanner/create/raffle modals)
- [ ] Remove body scroll lock logic that was specific to the detail modal
- [ ] Clean up any `z-index` hacks (e.g., `bottomTabBar` z-index override for detail modal)

### Step 5 — Deep Link Support & Polish
*Handle edge cases and ensure robustness.*

- [ ] Handle invalid/unknown slug in URL — show a "Event not found" message with link back to list
- [ ] Handle direct page load with `?event={slug}` (user opens a shared link or refreshes)
- [ ] Preserve any existing query params (e.g., if other features add params later)
- [ ] Test browser back/forward navigation across list → detail → list → detail
- [ ] Test direct URL access when logged in vs. not logged in (auth redirect should preserve the `?event=` param)
- [ ] Update the fullscreen map overlay to work without the detail modal's z-index assumptions
- [ ] Update QR scanner modal to work independently (already separate — verify no regressions)
- [ ] Verify mobile layout — detail page should scroll naturally (no modal scroll container)
- [ ] Verify bottom tab bar visibility on detail page (should remain visible, no z-index overrides needed)

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

## Testing Checklist
- [ ] Click event card → navigates to `?event={slug}`, shows detail page
- [ ] Browser back button → returns to event list
- [ ] Browser forward button → returns to detail page
- [ ] Direct URL `portal/events.html?event=ski-trip-2026` → loads event detail
- [ ] Invalid slug URL → shows "not found" with back link
- [ ] Refresh on detail page → detail page persists
- [ ] RSVP from detail page → detail refreshes in-place (URL stays)
- [ ] Raffle draw → detail refreshes in-place
- [ ] Competition action → detail refreshes in-place
- [ ] Document upload/delete → detail refreshes in-place
- [ ] Create event → navigates to new event's detail page
- [ ] QR scanner works from detail page
- [ ] Fullscreen map works from detail page
- [ ] Bottom tab bar visible on detail page
- [ ] Mobile scroll behavior is natural (no modal scroll trapping)
- [ ] Auth redirect preserves `?event=` param on return
- [ ] Page title updates to event name on detail, "Events" on list

---

**Last Updated:** March 31, 2026