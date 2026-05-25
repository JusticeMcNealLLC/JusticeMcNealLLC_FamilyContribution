# Events Refactor — Manage Surface Inventory

**Document:** `049_manage_surface_inventory.md`  
**Path:** `docs/audit/pages/events/049_manage_surface_inventory.md`  
**Date:** 2026-05-21  
**Status:** **Audit complete (inventory only)** — no implementation  
**Kickoff:** `046_list_manage_create_audit_kickoff.md` (`1ce201c`)  
**Prior inventories:** `047_list_surface_inventory.md` (`59fbe7e`), `048_create_surface_inventory.md` (`8e6f2c0`)  
**Related:** `025_phase_5_remaining_refactor_completion_roadmap.md`, `test/_smoke-phase3c-manage-bridge.js`

---

## 1. Baseline

| Item | State |
| --- | --- |
| **Phase 5L** | **Closed** — production 3-tag model; live QA 18/18 (`044`, `d483f6a`) |
| **046 kickoff** | List/manage/create audit track started (`1ce201c`) |
| **047 list inventory** | Committed (`59fbe7e`) |
| **048 create inventory** | Committed (`8e6f2c0`) |
| **This doc** | **Audit-only** — manage surface inventory |
| **Implementation** | **Not started**, **not approved** |
| **5L.4 / Option D** | **Not started** |

### Loader position (production chain)

`manage/sheet.js` is the **last** script in the middle chain (27 modules), immediately before `init.js`:

```text
… → create.js → create/sheet.js → documents.js → map.js → scanner.js → raffle.js
→ competition.js → scrapbook.js → manage/sheet.js?v=112 → init.js
```

| Property | Value |
| --- | --- |
| **Position** | **27th / last** middle script |
| **Cache bust** | `?v=112` on loader URL only (not a separate HTML tag in 3-tag model) |
| **Loaded via** | `js/portal/events/classic-chain-loader.js` (`document.write` per entry) |
| **Also used by** | `admin/events.html` (same `EventsManage` API; out of portal HTML audit scope) |

**Dependency note:** Manage loads **after** `raffle.js`, `scanner.js`, `documents.js`, and the full detail pipeline — it may call `window.evtOpenScanner`, `window.evtOpenRaffleDraw`, and `window.EventsRaffleModel` at runtime.

---

## 2. File Snapshot

| File | Lines | Bytes | Structure |
| --- | ---: | ---: | --- |
| `js/portal/events/manage/sheet.js` | **2,140** | **~149 KB** | **IIFE** `(function () { 'use strict'; … })();` |
| `js/portal/events/manage.js` | — | — | **Does not exist** |
| `js/portal/events/manage/` siblings | — | — | **Only** `sheet.js` |

**Single-file manage surface** — all manage UX, persistence, and bridges live in one monolith (M3a + M3b tabs in one module).

---

## 3. Architectural Overview

### 3.1 Entry surfaces (who opens manage)

| Consumer | How manage opens | Notes |
| --- | --- | --- |
| **Portal detail — Host Controls** | `detail/sections.js` — `onclick` → `window.EventsManage.open(eventId, { source: 'portal' })` | Fallback: admin URL if `EventsManage` missing |
| **Portal team CTA rail** | `team/tools.js` — mobile/desktop Manage buttons | Closes CTA panel first (`evtCloseCtaPanel`) |
| **Admin events dashboard** | Admin cards → `EventsManage.open` | `source: 'admin'` default in `STATE` |
| **Compat layer** | `compat/inline-handlers.js` lists `'EventsManage.open'` | Preserved for Phase 4/5 compat |
| **Detail registry** | `PortalEvents.detail.register('manage', { open, close })` | Additive registration at end of IIFE |

There is **no** separate `manage.js` orchestrator — `sheet.js` is the entire manage implementation.

### 3.2 Sheet lifecycle

```text
EventsManage.open(eventId, opts)
  → _ensureMounted()          // inject #emSheetRoot once (DOM + inline <style>)
  → _loadEventData(eventId)   // events + RSVPs + guests + checkins
  → _renderHeader / _renderTabs / _renderTab(activeTab)
  → show sheet (backdrop + panel animation)

EventsManage.close()
  → hide sheet, clear animation classes after timeout
```

**Opts:** `{ source: 'admin' | 'portal', tab?: string, editCopy?: boolean }` — `editCopy` scrolls/focuses title editor on overview.

### 3.3 Tab model (8 tabs)

| Tab key | Load | Editable today | Primary data |
| --- | --- | --- | --- |
| **overview** | Eager (on open) | Title/description; featured toggle (permissioned) | `STATE.event`, RSVP aggregates |
| **images** | Eager | Banner + embed upload/URL | Supabase `event-banners` storage |
| **rsvps** | Eager | Remove member/guest participation (edge fn) | `event_rsvps`, `event_guest_rsvps` |
| **money** | Lazy `_renderTabAsync` | **Read-only** (M3b) | RSVPs, guests, raffle entries, pool contributions |
| **docs** | Lazy | Upload, distribute, delete | `event_documents` + `event-documents` storage |
| **raffle** | Lazy | Prize setup, entry price, remove entries, winner choice | Raffle tables + `EventsRaffleModel` |
| **comp** | Lazy (competition type only) | **Read-only** (M3b) | phases, entries, votes, winners |
| **danger** | Eager | Cancel, complete, reset participation, delete | `events` + edge participation reset |

**Lazy cache:** `STATE.tabData[key]` cleared on `open()`; invalidated per-tab after mutations (e.g. `STATE.tabData.docs = null`).

---

## 4. High-Level Responsibility Map

| Subsystem | Functions | Notes |
| --- | --- | --- |
| **Sheet open/close** | `_ensureMounted`, `open`, `close` | Injected DOM; Escape/backdrop close |
| **Permissions / host controls** | `canManageEventBanners()` in overview | Featured toggle only; **no** in-sheet host-role gate — caller assumes authorized user |
| **Event editing (copy)** | `_overviewHtml`, `_wireOverview`, `_saveEventCopy` | **Title + description only** — not date/location/pricing |
| **Date/location/details** | Overview “Details” card | **Display-only** — edit deferred to detail page / future M4 |
| **Images** | `_imagesHtml`, `_wireImages`, `_imgDropZone` | Banner + embed; storage upload |
| **RSVP / attendance** | `_rsvpsHtml`, `_wireRsvps`, `_removeParticipationPerson` | Lists + remove via `manage-event-participation` edge |
| **Check-in handoff** | Overview quick action | `EventsManage.close()` → `evtOpenScanner(eventId)` |
| **Money** | `_loadMoney`, `_moneyHtml`, `_wireMoney` | Read-only revenue/payment breakdown |
| **Docs / team handoff** | `_loadDocs`, `_docsHtml`, `_wireDocs`, `_uploadDocFromManage` | LLC document hub; distribute flags |
| **Raffle admin** | `_loadRaffle` … `_assignWinnerChoice`, `refreshRaffle` | Heavy UI; uses `EventsRaffleModel`; draw via `evtOpenRaffleDraw` |
| **Competition** | `_loadComp`, `_compHtml`, `_wireComp` | Read-only dashboard; advancement on detail page |
| **Save/update** | `_saveEventCopy`, image save, raffle saves, doc CRUD, featured toggle | Mix of direct Supabase + edge functions |
| **Delete/cancel/archive** | `_dangerHtml`, `_wireDanger`, `_runDangerAction`, `_resetParticipation` | cancel → `status: cancelled`; complete → `completed`; delete row; reset participation |
| **Custom events** | `_notifyParent`, `_emToggleFeatured`, `events:raffle:drawn` listener | `events:manage:updated` / `events:manage:deleted` |
| **Bridge / export** | `window.EventsManage`, `window.PortalEvents.manage`, `detail.register` | `open`, `close`, `refreshRaffle` |
| **QR / invite** | `_ensureQrCode`, `_renderOverviewQrs`, `_shareInviteUrl` | CDN QRCode lib; public site URL |

---

## 5. Function Inventory

All functions are **private** inside the IIFE except public assignments at file end and `window._emToggleFeatured`.

### 5.1 Lifecycle, shell, tabs

| Function | Category | Role |
| --- | --- | --- |
| `_ensureMounted` | Render + DOM binding | One-time `#emSheetRoot` injection + close listeners |
| `open` | DOM binding + persistence | Load event, show sheet, render initial tab |
| `close` | DOM binding | Hide sheet |
| `_loadEventData` | Persistence | `events`, `event_rsvps`, `event_guest_rsvps`, `event_checkins` |
| `_renderHeader` | Render | Title/subtitle in header |
| `_renderTabs` | Render + DOM binding | Tab bar; click → `_renderTab` |
| `_renderContent` | Render | `innerHTML` into `#emSheetContent` |
| `_renderTab` | Render + orchestration | Route to tab render/wire or `_renderTabAsync` |
| `_renderTabAsync` | Render + persistence | Lazy load + guard against tab race |
| `_refreshEventManager` | Orchestration | Reload tab after participation changes |
| `_notifyParent` | Bridge | `CustomEvent('events:manage:' + type)` |
| `_emptyHtml` | Render | Placeholder panels |
| `refreshRaffle` | Bridge + render | External/cache invalidation for raffle tab |

### 5.2 Overview tab

| Function | Category | Role |
| --- | --- | --- |
| `_overviewHtml` | Render | Stats, LLC ops cards, copy form, featured, QR, scanner button |
| `_wireOverview` | DOM binding | Copy form, invite/share/QR, overview-tab jumps |
| `_saveEventCopy` | Validation + persistence | `events.update({ title, description })` |
| `_ensureQrCode` | Utility | Lazy-load QRCode CDN |
| `_renderOverviewQrs` | Render | Invite + venue QR canvases |

### 5.3 Images tab

| Function | Category | Role |
| --- | --- | --- |
| `_imgDropZone` | Render | Drop zone HTML fragment |
| `_imagesHtml` | Render | Banner/embed editors |
| `_wireImages` | DOM binding + persistence | DnD, file pick, storage upload, `events.update` URLs |

### 5.4 RSVPs tab

| Function | Category | Role |
| --- | --- | --- |
| `_rsvpsHtml` | Render | Member/guest sections (`memberRow`, `guestRow`, `section` nested) |
| `_wireRsvps` | DOM binding | `[data-remove-rsvp]` → `_removeParticipationPerson` |

### 5.5 Danger zone

| Function | Category | Role |
| --- | --- | --- |
| `_dangerHtml` | Render | Cancel / complete / reset / delete cards |
| `_wireDanger` | DOM binding | `[data-action]` buttons |
| `_runDangerAction` | Persistence | delete, cancel, complete, reset-participation |
| `_getParticipationResetCounts` | Persistence | Count rows before reset confirm |
| `_resetParticipation` | Persistence | Edge `manage-event-participation` reset |
| `_removeParticipationPerson` | Persistence | Edge remove member/guest RSVP |

### 5.6 Money tab (read-only)

| Function | Category | Role |
| --- | --- | --- |
| `_loadMoney` | Persistence | Parallel Supabase reads |
| `_moneyHtml` | Render | `paymentRow` nested helper |
| `_wireMoney` | DOM binding | No-op stub |

### 5.7 Docs tab

| Function | Category | Role |
| --- | --- | --- |
| `_loadDocs` | Persistence | `event_documents` select |
| `_docTypeIcon` | Utility | Emoji map |
| `_formatBytes` | Utility | Human-readable sizes |
| `_docsHtml` | Render | Upload UI + lists (`docRow`, `memberSection` nested) |
| `_wireDocs` | DOM binding + persistence | Upload, distribute, delete |
| `_uploadDocFromManage` | Persistence | Storage + insert row |

### 5.8 Raffle tab

| Function | Category | Role |
| --- | --- | --- |
| `_loadRaffle` | Persistence | entries, winners, guests |
| `_ord` | Utility | Ordinal suffix |
| `_raffleHtml` | Render | Large tab HTML |
| `_wireRaffle` | DOM binding | Draw button → `evtOpenRaffleDraw` |
| `_rafflePrizeSetupHtml` | Render | Category/item builder UI |
| `_collectRafflePrizeConfigFromDom` | Form state | Read DOM → config object |
| `_wireRafflePrizeImages` | DOM binding | Prize image pickers |
| `_setRafflePrizeImage` | Form state | Pending file map |
| `_clearRafflePrizeImage` | Form state | Clear one item |
| `_clearRafflePrizeImageState` | Form state | Reset maps |
| `_uploadPendingRafflePrizeImages` | Persistence | `event-raffle-prizes` storage |
| `_saveRafflePrizeSetup` | Persistence | `events.update` raffle_prizes JSON |
| `_categoryPrizeQuantity` | Utility | Model helper |
| `_capRaffleWinnerCounts` | Validation | Cap winners vs config |
| `_saveRaffleEntryPrice` | Persistence | `events.update` cost field |
| `_removeRaffleEntry` | Persistence | Edge participation remove |
| `_winnerChoiceHtml` | Render | Pending choice UI |
| `_availableChoiceItems` | Utility | Filter assignable prizes |
| `_assignWinnerChoice` | Persistence | `event_raffle_winners` update |
| `_raffleConfig` | Bridge | Delegates to `EventsRaffleModel.normalizeConfig` |
| `_raffleCategories` | Bridge | Model getters |
| `_raffleItems` | Bridge | Model getters |
| `_raffleTotalWinners` | Bridge | Model getters |
| `_raffleDrawQueue` | Bridge | Model getters |
| `_drawModeLabel` | Utility | Label strings |
| `_prizeSlotLabel` | Utility | Label strings |
| `_winnerBelongsToCategory` | Utility | Category filter |
| `_raffleSlotByPlace` | Utility | Place → slot |

### 5.9 Comp tab (read-only)

| Function | Category | Role |
| --- | --- | --- |
| `_loadComp` | Persistence | phases, entries, votes, winners, pool |
| `_compHtml` | Render | Competition dashboard |
| `_wireComp` | DOM binding | No-op stub |

### 5.10 Shared helpers

| Function | Category | Role |
| --- | --- | --- |
| `_publicEventUrl` | Utility | `https://justicemcneal.com/events/?e=slug` |
| `_safeFilename` | Utility | Download filename sanitize |
| `_downloadCanvasPng` | DOM binding | QR PNG download |
| `_shareInviteUrl` | DOM binding | Web Share API + clipboard |
| `_esc` | Utility | HTML escape |
| `_money` | Utility | Currency format fallback |
| `window._emToggleFeatured` | Persistence + bridge | `events.is_featured` + `events:manage:updated` |

**Function count (named):** ~70 top-level + 4 nested helpers inside HTML builders.

---

## 6. Global / Bridge Dependency Map

### 6.1 Reads from `window.PortalEvents`

| Symbol | Usage |
| --- | --- |
| `window.PortalEvents` | Guard before `PortalEvents.manage` assignment |
| `window.PortalEvents.manage` | Safe-init namespace |
| `window.PortalEvents.detail.register` | Register `{ open, close }` on detail registry |

**Does not read** `PortalEvents.list`, `PortalEvents.create`, or list/detail module internals directly.

### 6.2 Writes to `window.PortalEvents`

| Target | Keys |
| --- | --- |
| `window.PortalEvents.manage` | `open`, `close`, `refreshRaffle` |
| `window.PortalEvents.detail` | `register('manage', …)` |

### 6.3 Classic `window` globals (reads)

| Global | Role |
| --- | --- |
| `supabaseClient` | All DB/storage (required) |
| `formatCurrency` | Money/raffle display (`config.js`) |
| `canManageEventBanners` | Featured toggle visibility |
| `callEdgeFunction` | `manage-event-participation` |
| `window.EventsRaffleModel` | Raffle config normalization, draw queue, categories |
| `window.evtOpenScanner` | Check-in scanner handoff |
| `window.evtOpenRaffleDraw` | Raffle draw modal handoff |
| `globalThis.QRCode` | After CDN script load |
| `navigator.share` / `navigator.clipboard` | Invite share |

### 6.4 Classic globals (writes)

| Global | Role |
| --- | --- |
| `window.EventsManage` | `{ open, close, refreshRaffle }` — **primary public API** |
| `window._emToggleFeatured` | Inline `onclick` from overview HTML |

**Does not assign** `evt*` globals — consumes them only.

### 6.5 Module load-order dependencies

| Module | Relationship |
| --- | --- |
| `constants.js`, `state.js`, `utils.js` | Loaded before manage (globals/env) |
| `raffle-model.js` | **Required** for raffle tab model helpers |
| `detail/*`, `detail.js` | Manage registers into detail registry **after** detail loads |
| `scanner.js` | `evtOpenScanner` for overview button |
| `raffle.js` | `evtOpenRaffleDraw` for raffle tab |
| `init.js` | Runs **after** manage; does not open manage directly |
| `list.js` | Listens `events:manage:updated` → `evtLoadEvents()` |

### 6.6 Supabase tables / storage (manage touches)

| Resource | Operations |
| --- | --- |
| `events` | select, update (copy, images, featured, raffle fields, status), delete |
| `event_rsvps` | select; remove via edge |
| `event_guest_rsvps` | select; remove via edge |
| `event_checkins` | select; reset via edge |
| `event_documents` | CRUD + distribute flag |
| `event_raffle_entries` | select; remove via edge |
| `event_raffle_winners` | select; update choice |
| `prize_pool_contributions` | select (money/comp) |
| `competition_phases`, `competition_entries`, `competition_votes`, `competition_winners` | select (comp tab) |
| Storage `event-banners` | upload banner/embed |
| Storage `event-documents` | upload/remove docs |
| Storage `event-raffle-prizes` | prize images |
| Edge **`manage-event-participation`** | reset, remove RSVP/guest, remove raffle entry |

---

## 7. DOM / HTML Dependency Notes

### 7.1 `portal/events.html`

| Item | State |
| --- | --- |
| **Manage markup in HTML** | **None** — sheet is **fully injected** by `_ensureMounted` |
| **Script tag for manage** | **Not** a direct tag in 3-tag production HTML; loaded via **`classic-chain-loader.js`** |
| **Static IDs manage expects** | **Zero** from `events.html` — only injected IDs |

### 7.2 Injected mount IDs (created at runtime)

| ID | Role |
| --- | --- |
| `#emSheetRoot` | Root wrapper appended to `document.body` |
| `#emSheetBackdrop` | Overlay |
| `#emSheet` / `#emSheetPanel` | Sheet container + panel |
| `#emSheetHeader`, `#emSheetTitle`, `#emSheetSub` | Header |
| `#emSheetClose` | Close button |
| `#emSheetTabs` | Tab bar |
| `#emSheetContent` | Tab body (replaced per tab) |

**Per-tab dynamic IDs** (non-exhaustive): `emCopyForm`, `emCopyTitle`, `emCopyDescription`, `emFeaturedToggle`, `emInviteQR`, `emVenueQR`, `emBannerZone`, `emEmbedZone`, `emImagesSave`, `emDocUploadBtn`, `emDocTargetMode`, raffle prize builder `data-*` nodes, etc.

### 7.3 `data-action` / `data-*` binding (preferred pattern)

| Attribute | Handler |
| --- | --- |
| `[data-action]` | Danger: `cancel`, `complete`, `delete`, `reset-participation` |
| `[data-remove-rsvp]` | RSVP removal |
| `[data-doc-action]` | `distribute`, `undistribute`, `delete` |
| `[data-copy-invite-url]`, `[data-share-invite-url]`, `[data-download-invite-qr]` | Overview invite |
| `[data-overview-tab]` | Jump to tab from overview cards |
| `[data-pick]` | Image zone file pick |

### 7.4 Inline `onclick` (compat risk)

| Location | Handler |
| --- | --- |
| Featured toggle | `onclick="window._emToggleFeatured()"` |
| Scan attendees | `onclick="window.EventsManage.close();setTimeout(()=>window.evtOpenScanner&&window.evtOpenScanner('…'),150)"` |

**Portal entry points** (outside sheet, in other modules):

| File | Pattern |
| --- | --- |
| `detail/sections.js` | `onclick="window.EventsManage ? window.EventsManage.open(…)"` |
| `team/tools.js` | Same + `evtCloseCtaPanel()` prefix on mobile |

---

## 8. Custom Events

| Event | Dispatched when | Known listeners |
| --- | --- | --- |
| **`events:manage:updated`** | `_notifyParent('updated')`, featured toggle | `list.js` → `evtLoadEvents()`; `admin/events-dashboard.js` reload |
| **`events:manage:deleted`** | After permanent delete | `admin/events-dashboard.js` reload |
| **`events:manage:*`** | Via `_notifyParent(type)` | Extensible pattern |
| **`events:raffle:drawn`** | (listener only in manage) | `refreshRaffle` on draw completion |

**List does not import manage** — coupling is **event-only** for hero/card refresh after edits.

---

## 9. Split Seam Candidates

### 9.1 Safer extraction candidates (future)

| Candidate | Lines (approx.) | Rationale |
| --- | ---: | --- |
| **Sheet shell** | ~120 | `_ensureMounted`, open/close, tab chrome — stable DOM contract |
| **Helpers** | ~80 | `_esc`, `_money`, `_publicEventUrl`, `_formatBytes`, `_ord` |
| **Overview tab** | ~350 | Copy save + stats + QR — fewer cross-tab deps |
| **Images tab** | ~150 | Self-contained storage upload |
| **Money tab** | ~120 | Read-only; no edge functions |
| **Comp tab** | ~120 | Read-only; isolated queries |
| **Docs tab** | ~200 | Clear storage + table boundary |

### 9.2 Risky — defer until tests exist

| Candidate | Risk |
| --- | --- |
| **Danger zone** | Destructive deletes, status transitions, participation reset |
| **Raffle tab** | Largest block (~700+ lines); `EventsRaffleModel`, draw handoff, prize images |
| **RSVP removal** | Edge function contract + list/detail RSVP parity |
| **Featured toggle** | Inline `onclick` + `events:manage:updated` hero side effect |
| **Global `STATE`** | Shared across all tabs; split requires explicit state module |

---

## 10. Smoke / Test Coverage Map

| Test / check | What it covers | Gap |
| --- | --- | --- |
| **`test/_smoke-phase3c-manage-bridge.js`** | IIFE, `EventsManage`, `PortalEvents.manage`, `_emToggleFeatured`, `detail.register`, custom event **strings** in source | **Static** only; smoke still checks `events.html` for direct `manage/sheet.js` tag (may **fail** under 3-tag loader unless updated) |
| **`test/_smoke-phase5l-readiness.js`** | Lists `manage/sheet.js` in monolith inventory | No behavioral manage tab tests |
| **`test/_e2e-phase1-bridge.js`** | Opens manage from host CTA; `#emSheetRoot` count | Shallow — overview presence, not tab CRUD |
| **`test/_verify-events-live-globals.js`** | Live `EventsManage`, `PortalEvents.manage`, loader URL `?v=112` | Globals only |
| **`test/_e2e-phase3d-create-bridge.js`** | Regression: manage namespace still exists after create work | Touch only |
| **`test/_qa-portal-parity-signed-in.js`** | Manage button visible for host | No sheet interaction |
| **`test/_smoke-event-coordinator-events-ui.js`** | References manage sheet path | Coordinator UI static |

### Recommended coverage before refactor

1. **Tab smoke harness** — open manage, switch all 8 tabs without throw (fixture event IDs).
2. **Copy save** — title/description update + `events:manage:updated` fires once.
3. **Danger** — cancel/complete mocked or staging-only; delete **never** on prod auto-test.
4. **Raffle** — config round-trip with `EventsRaffleModel` fixture.
5. **Participation edge** — contract test for `manage-event-participation` payloads.
6. **Update 3C smoke** — assert manage loaded via `classic-chain-loader.js` chain array, not raw HTML tag.

---

## 11. Risk Map

### 11.1 High risk

| Area | Impact |
| --- | --- |
| **`_runDangerAction` / delete** | Permanent data loss; wrong confirm still destructive |
| **`_resetParticipation` / edge fn** | Mass RSVP/raffle/check-in wipe |
| **Raffle tab saves** | Corrupt `raffle_prizes` JSON; wrong winner assignment |
| **`window._emToggleFeatured` + inline onclick** | Silent break if renamed; hero desync if event not fired |
| **`STATE` + lazy tab cache** | Stale UI if tab switched during async load |
| **Scanner/draw handoffs** | Close timing + `setTimeout(150)` race with sheet animation |

### 11.2 Medium risk

| Area | Impact |
| --- | --- |
| **Docs upload/distribute** | Wrong `target_user_id`; storage orphan on failed insert |
| **Image upload paths** | Broken banner/embed URLs |
| **RSVP removal** | Edge errors; partial state until refresh |
| **`events:manage:updated` → full list reload** | Performance hit; must stay compatible with list refactor |
| **Read-only money/comp** | Product expectation if users expect edits in-sheet |
| **No date/location edit in manage** | Confusion vs detail edit flows |

### 11.3 Low risk

| Area | Notes |
| --- | --- |
| `_esc`, `_money`, metric cards | Display-only |
| `_wireMoney` / `_wireComp` stubs | Intentionally empty |
| QR CDN load | Degraded UX if CDN blocked |
| `refreshRaffle` | Narrow API; eventId guard |

---

## 12. Recommended Implementation Phases (manage-only — not approved)

Proposed **5M.3.x** sequence (manage track) after audit sign-off. **Do not implement** without per-phase approval.

| Phase (proposed) | Scope | Rationale |
| --- | --- | --- |
| **5M.3.0** | Audit sign-off + update Phase 3C smoke for 3-tag loader | Gate before any code split |
| **5M.3.1** | Extract **sheet shell** (`mount.js` / `lifecycle.js`) | Stable `#emSheetRoot` contract; smallest slice |
| **5M.3.2** | Extract **overview + copy save** | Isolated Supabase update + `_notifyParent` |
| **5M.3.3** | Extract **images** + **docs** tabs | Clear storage boundaries |
| **5M.3.4** | Extract **danger** + participation edge adapter | Highest test requirement |
| **5M.3.5** | Extract **raffle tab** submodule | Largest block; depends on `EventsRaffleModel` |
| **5M.3.6** | Extract **RSVPs** + **money** (money still read-only) | Edge + display |
| **5M.3.7** | Optional **comp** read-only module | Low churn |
| **5M.3.8** | Replace inline `onclick` with delegated listeners + compat aliases | Aligns with Phase 4 compat goals |

**Order rationale:** Manage is **larger than create** (~2,140 lines, single file) and **more destructive** than list (danger + participation reset). Per `046`, **create-first** (`5M.1.x`) remains the recommended **first implementation** track; manage splits follow list/create or run parallel only with explicit approval.

**Cross-track ordering (from 046 / 025):**

```text
Audits: 047 list ✓ → 048 create ✓ → 049 manage ✓ → (optional 050 risk map)
Implementation (proposed, not approved): 5M.1 create → 5M.2 list → 5M.3 manage
```

---

## 13. No-Go Reminders

- Do **not** combine **manage** refactors with **list** or **create** in one PR.
- Do **not** combine with **5L.4** compat bootstrap or **Option D** module entry.
- Do **not** combine with **CSS cleanup** or **`portal/events.html`** structural edits without a new approval gate.
- Do **not** remove **`window.EventsManage`** or **`window._emToggleFeatured`** without compat shim and smoke updates.
- Do **not** treat this inventory as **implementation approval**.

---

## 14. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/049_manage_surface_inventory.md
git add docs/audit/pages/events/049_manage_surface_inventory.md
git diff --staged --name-only
git commit -m "Add Events manage surface inventory"
git push
```

---

## Appendix — Recommended next audit

| Next doc (proposed) | Target |
| --- | --- |
| **`050_list_manage_create_risk_smoke_map.md`** | Combined risk/smoke matrix after 047–049 |
| **`051_list_manage_create_audit_review.md`** | Cross-surface sign-off before first 5M implementation slice |

---

## Appendix — Quick reference: public manage API

```text
window.EventsManage.open(eventId, { source, tab, editCopy })
window.EventsManage.close()
window.EventsManage.refreshRaffle(eventId)

window.PortalEvents.manage.*     // mirror of above
window._emToggleFeatured()       // inline onclick only

CustomEvent: events:manage:updated | events:manage:deleted
Listener: events:raffle:drawn → refreshRaffle
```
