# Events Refactor — Create Surface Inventory

**Document:** `048_create_surface_inventory.md`  
**Path:** `docs/audit/pages/events/048_create_surface_inventory.md`  
**Date:** 2026-05-21  
**Status:** **Audit complete (inventory only)** — no implementation  
**Kickoff:** `046_list_manage_create_audit_kickoff.md` (`1ce201c`)  
**Prior inventory:** `047_list_surface_inventory.md` (`59fbe7e`)  
**Related:** `025_phase_5_remaining_refactor_completion_roadmap.md`, `test/_smoke-phase3d-create-bridge.js`

---

## 1. Baseline

| Item | State |
| --- | --- |
| **Phase 5L** | **Closed** — production 3-tag model; live QA 18/18 (`044`) |
| **046 kickoff** | List/manage/create audit track started |
| **047 list inventory** | Committed |
| **This doc** | **Audit-only** — create surface inventory |
| **Implementation** | **Not started**, **not approved** |
| **5L.4 / Option D** | **Not started** |

### Loader position (production chain)

```text
… → detail.js → comments.js → rsvp.js → create.js → create/sheet.js → documents.js → … → manage/sheet.js
```

`create.js` loads **before** `create/sheet.js`. Sheet **depends on** geocoding helpers in `create.js` (`window.evtGeocodeAddress`).

---

## 2. File Snapshot

| File | Lines | Bytes | Structure |
| --- | ---: | ---: | --- |
| `js/portal/events/create.js` | **625** | ~39 KB | **Top-level** classic script (no IIFE); global functions |
| `js/portal/events/create/sheet.js` | **1,009** | ~65 KB | **IIFE** `(function () { 'use strict'; … })();` |
| **Combined** | **~1,634** | ~104 KB | Two-file create surface |

`js/portal/events/create/` contains **only** `sheet.js` today (no other `.js` siblings).

---

## 3. Architectural Overview — Dual Create Paths

Production uses **two** create UX paths wired from `init.js`:

| Path | Entry | Primary file | Event types |
| --- | --- | --- | --- |
| **A — Sheet (default)** | `#createEventBtn`, `#emptyCreateBtn`, list create tile → `#createEventBtn` | `create/sheet.js` | **Member** only (M4a); LLC/Competition disabled in Step 1 UI |
| **B — Legacy modal (fallback)** | `EventsCreate` missing → `evtToggleModal('createModal')` | `create.js` + HTML `#createEventForm` | **Member, LLC, competition** — full legacy form |

```text
init.js _openCreate()
  ├─ EventsCreate.open()     → sheet path (preferred)
  └─ else evtToggleModal()   → legacy modal + evtHandleCreate on submit
```

After sheet publish/draft: `CustomEvent('events:created')` → `init.js` reloads list via `evtLoadEvents()`.

Legacy path on success: direct `evtLoadEvents()` + `evtNavigateToEvent(slug)` (no `events:created` dispatch).

---

## 4. High-Level Responsibility Map

### 4.1 `create.js` — legacy modal + shared services

| Subsystem | Functions / symbols | Notes |
| --- | --- | --- |
| **LLC cost breakdown UI** | `evtToggleLlcFields`, `evtAddCostItem`, `evtRemoveCostItem`, `evtRenderCostItems`, `evtUpdateCostItem`, `evtRecalcCostSummary` | Module-level `evtCostItems[]`; **inline `onclick=`** in generated HTML |
| **Geocoding (shared)** | `evtExpandAddress`, `evtGeocodeCensus`, `evtGeocodeNominatim`, **`evtGeocodeAddress`** | Used by **legacy form** and **sheet** (`_doGeocode`) |
| **Location validation (legacy form)** | `evtSetLocationIcon`, `evtSetLocationStatus`, `evtValidateLocation`, `evtInitLocationValidation` | `#eventLocation` in `#createModal` |
| **Legacy publish** | **`evtHandleCreate`** | Large async insert: member/LLC/competition, storage uploads, raffle, competition phases, cost items |
| **Preview (legacy)** | `evtHandlePreview`, `evtClosePreview` | Injects preview HTML into `#eventsDetailView`; **`onclick="evtClosePreview()"`** |
| **Global state used** | `evtCostItems` (local), `evtBannerFile` / `evtEmbedImageFile` (`state.js`), `evtGenerateSlug` (`utils.js`) | Not assigned in `create.js` except cost array |

### 4.2 `create/sheet.js` — multi-step sheet (default UX)

| Subsystem | Functions | Notes |
| --- | --- | --- |
| **Sheet mount / lifecycle** | `_ensureMounted`, `open`, `close`, `_confirmClose` | Injects `#ecSheetRoot` DOM if missing |
| **Step machine** | `STATE`, `_render`, `_back`, `_next`, `_validateStep` | 4 steps: Basics → When & Where → Pricing → Review |
| **Step HTML** | `_basicsHtml`, `_whenHtml`, `_pricingHtml`, `_reviewHtml`, `_raffleReviewHtml` | InnerHTML per step |
| **Step wiring** | `_wireBasics`, `_wireWhen`, `_wirePricing`, `_wireReview`, `_wireRaffleBuilder`, `_wireImageUpload` | `addEventListener` (no inline onclick in sheet) |
| **Images / media** | `_setImageFile`, `_wireImageUpload`, `_setPrizeImage` | Banner + embed + raffle prize images → Supabase storage |
| **Geocoding** | `_doGeocode` | Calls `window.evtGeocodeAddress` from `create.js` |
| **Raffle builder** | `_raffleBuilderHtml`, `_ensureRaffleConfig`, `_normalizeRaffleConfig`, `_updateCategory`, `_updateItem`, `_remove*`, `_move*` | Uses `window.EventsRaffleModel` |
| **Persistence** | **`_submit(status)`** | `status`: `'draft'` \| `'open'`; `events` insert + storage + prize uploads |
| **Bridge** | `window.EventsCreate`, `window.PortalEvents.create` | `open`, `close`, `isFlagOn` |

### 4.3 Cross-cutting concerns

| Concern | Where handled |
| --- | --- |
| **Create button visibility** | `init.js` — `canCreateEvents()` shows `#createEventBtn` |
| **Banner file pickers (legacy modal)** | `init.js` listeners on `#bannerDropzone`, `#bannerFile` → `evtHandleBannerSelect` (`utils.js`) |
| **Form submit (legacy)** | `init.js` — `#createEventForm` → `evtHandleCreate` |
| **Post-create list refresh** | `init.js` — `events:created` listener; legacy path calls `evtLoadEvents` directly |

---

## 5. Function Inventory

### 5.1 `create.js` (top-level)

| Function | Category | Role |
| --- | --- | --- |
| `evtToggleLlcFields` | DOM + state | Show/hide LLC/competition sections; force pricing rules |
| `evtAddCostItem` | Form state | Append LLC cost line |
| `evtRemoveCostItem` | Form state | Remove cost line |
| `evtRenderCostItems` | Render | LLC cost list HTML (**inline onclick**) |
| `evtUpdateCostItem` | Form state | Update cost line field |
| `evtRecalcCostSummary` | Render + utility | Buy-in math from cost items |
| `evtExpandAddress` | Utility | Address normalization for geocoders |
| `evtGeocodeCensus` | Persistence (IO) | Edge function geocode |
| `evtGeocodeNominatim` | Persistence (IO) | OSM fallback |
| `evtGeocodeAddress` | Bridge + utility | **Public** geocode API for sheet + legacy |
| `evtSetLocationIcon` | DOM binding | Legacy location field icons |
| `evtSetLocationStatus` | DOM binding | Legacy location status text |
| `evtValidateLocation` | Validation + IO | Debounced geocode for legacy form |
| `evtInitLocationValidation` | DOM binding | Wire legacy `#eventLocation` |
| `evtHandleCreate` | Validation + persistence | **Legacy** full publish pipeline |
| `evtHandlePreview` | Render | Legacy preview in detail view (**inline onclick**) |
| `evtClosePreview` | DOM binding | Exit preview (**inline onclick**) |

**Module-level:** `evtCostItems`, `COST_CATEGORIES`, `STREET_ABBREVS`, `STATE_ABBREVS`, `_evtLocGeoCache`, `_evtLocDebounce`.

**No** `window.PortalEvents.create` assignment in `create.js` (sheet owns namespace bridge).

### 5.2 `create/sheet.js` (IIFE closures)

| Function | Category | Role |
| --- | --- | --- |
| `isFlagOn` | Bridge | Always `true` (compat flag) |
| `_ensureMounted` | DOM binding | Inject sheet shell HTML + wire footer buttons |
| `open` / `close` | Bridge + DOM | Sheet visibility / animation |
| `_confirmClose` | DOM binding | Discard confirm |
| `_render` | Render | Step dots + step body dispatch |
| `_basicsHtml` / `_wireBasics` | Render + DOM | Title, category, description, type cards, banner/embed upload |
| `_whenHtml` / `_wireWhen` | Render + DOM | Dates, timezone, location, geocode, RSVP deadline, max participants |
| `_pricingHtml` / `_wirePricing` | Render + DOM | Pricing mode, raffle toggle, raffle builder entry |
| `_raffleBuilderHtml` / `_wireRaffleBuilder` | Render + DOM | Full raffle config UI |
| `_drawModeOptions` | Render | Raffle draw mode select HTML |
| `_setImageFile` / `_wireImageUpload` | Form state + DOM | File inputs |
| `_setPrizeImage` | Form state | Prize image map in STATE |
| `_raffleModel` | Bridge | Lazy `EventsRaffleModel` access |
| `_ensureRaffleConfig` / `_normalizeRaffleConfig` | Form state | Raffle config object |
| `_updateCategory` / `_updateItem` / `_remove*` / `_move*` | Form state | Raffle builder mutations |
| `_renumberSortOrders` / `_moveEntry` | Utility | Raffle ordering |
| `_reviewHtml` / `_raffleReviewHtml` / `_wireReview` | Render | Review step |
| `_validateStep` | Validation | Per-step errors (alert) |
| `_back` / `_next` | DOM binding | Step navigation |
| `_doGeocode` | Persistence (IO) | Address → `STATE.geocode` |
| `_submit` | Validation + persistence | Draft/publish insert |
| `_esc` | Utility | HTML escape |

**Module-level:** `STEPS`, `STATE`, `CATEGORIES`, `TIMEZONES`, `_submitting`.

---

## 6. Global / Bridge Dependency Map

### 6.1 Reads

| Symbol | Source module | Used by |
| --- | --- | --- |
| `window.EventsRaffleModel` | `raffle-model.js` | Sheet raffle builder + validation |
| `window.evtGeocodeAddress` | **`create.js`** | Sheet `_doGeocode` |
| `window.evtGenerateSlug` | `utils.js` | Sheet `_submit`, legacy `evtHandleCreate` |
| `window.evtCurrentUser` | `init.js` / auth | Sheet `_submit` creator id |
| `supabaseClient` | config/bootstrap | Both paths — DB + storage |
| `getFunctionUrl('geocode-address')` | config | `evtGeocodeCensus` |
| `SUPABASE_ANON_KEY` | config | Census fetch headers |
| `evtBannerFile` / `evtEmbedImageFile` | **`state.js`** | Legacy `evtHandleCreate`, preview |
| `evtCostItems` | **`create.js` local** | Legacy LLC flow only |
| `canCreateEvents()` | permissions (`constants` / global) | Sheet disabled types; legacy visibility via init |
| `formatCurrency` | global helper | LLC cost summary display |
| `evtEscapeHtml` | **`utils.js`** | Legacy templates + cost items |
| `evtToggleModal` | **`utils.js`** | Preview + init fallback |
| `evtLoadEvents` | **`list.js`** | Post-create reload |
| `evtNavigateToEvent` | **`utils.js`** | Post-publish navigation |

### 6.2 Writes

| Symbol | Set by | Notes |
| --- | --- | --- |
| `window.EventsCreate` | `sheet.js` | `{ open, close, isFlagOn }` |
| `window.PortalEvents.create` | `sheet.js` | Same three methods (Phase 3D bridge) |
| `evtCostItems` | `create.js` | Legacy LLC only; not used by sheet |
| `STATE.form` / sheet STATE | `sheet.js` | In-memory only until submit |
| DB `events` row | `_submit` / `evtHandleCreate` | Insert |
| DB `event_cost_items` | `evtHandleCreate` (LLC) | Legacy only |
| DB `competition_phases` | `evtHandleCreate` (competition) | Legacy only |
| Storage `event-banners` | Both paths | Banner + embed uploads |
| Storage `event-raffle-prizes` | Sheet `_submit` | Prize images |

### 6.3 `PortalEvents` namespace

| Namespace | Assigned in create surface? |
| --- | --- |
| `PortalEvents.create` | **Yes** — `sheet.js` only (`open`, `close`, `isFlagOn`) |
| `PortalEvents.list` / `detail` / `manage` | **No** — consumers only |

`index.js` comment notes future `PortalEvents.create ← create.js` — **not implemented**; sheet owns bridge today.

### 6.4 Supabase tables / storage (persistence)

| Resource | Legacy `evtHandleCreate` | Sheet `_submit` |
| --- | --- | --- |
| `events` insert | Yes (all types) | Yes (**member** only in record) |
| `event_cost_items` | LLC | No |
| `competition_phases` | Competition | No |
| Storage `event-banners` | Banner + embed | Banner + embed |
| Storage `event-raffle-prizes` | No (text prizes in legacy raffle UI) | Yes (raffle builder images) |

### 6.5 Module dependencies (load order)

| Module | Relationship |
| --- | --- |
| **`init.js`** | Wires create entry points; listens `events:created` |
| **`list.js`** | Create tile clicks `#createEventBtn`; reload target |
| **`utils.js`** | Slug, escape, modal toggle, navigate, banner select |
| **`state.js`** | Shared file globals for legacy banner/embed |
| **`raffle-model.js`** | Sheet raffle validation/normalize |
| **`detail`** | Preview hijacks `#eventsDetailView` (legacy only) |
| **`manage`** | No direct import; list reload after manage uses separate event |

---

## 7. DOM / HTML Dependency Notes

### 7.1 Static shell (`portal/events.html`)

| ID / region | Used by |
| --- | --- |
| `#createEventBtn` | Primary create entry (`init.js`) |
| `#createModal`, `#createModalOverlay`, `#closeCreateModal` | Legacy modal shell |
| `#createEventForm` | Legacy submit target |
| `#publishEventBtn` | Legacy publish button |
| `#eventTitle`, `#eventDescription`, `#eventType`, `#eventStart`, `#eventEnd`, `#eventLocation`, … | Legacy form fields (extensive) |
| `#llcFieldsSection`, `#compFieldsSection` | LLC / competition blocks |
| `#costItemsList`, `#costSummary` | LLC cost builder |
| `#bannerDropzone`, `#bannerFile`, `#bannerPreviewWrap` | Legacy banner upload (`init.js` + `utils.js`) |
| `#gateTime`, `#gateLocation` | Legacy preview gates |
| `#eventsListView`, `#eventsDetailView` | Preview mode toggles |
| `#emptyCreateBtn` | Empty-state create CTA |

**Sheet DOM** is **not** in `portal/events.html` — injected at runtime into `#ecSheetRoot` by `_ensureMounted()`.

### 7.2 Sheet injected IDs (runtime)

| ID | Role |
| --- | --- |
| `#ecSheetRoot` | Mount root |
| `#ecSheetBackdrop`, `#ecSheet`, `#ecSheetPanel` | Overlay + panel |
| `#ecSheetClose`, `#ecBackBtn`, `#ecNextBtn`, `#ecDraftBtn` | Chrome buttons |
| `#ecSheetSteps`, `#ecSheetContent`, `#ecSheetFooter` | Step UI |
| `#ecError` | Submit error display |

Step bodies use generated class names (`ec-input`, `ec-type-card`, etc.) and **data attributes** (`data-type`, `data-cat`, …) wired in `_wire*` functions.

### 7.3 Inline handler dependencies

| Pattern | Location | Handlers |
| --- | --- | --- |
| **`onclick="evt…"`** | **`create.js`** generated HTML | `evtRemoveCostItem`, `evtUpdateCostItem`, `evtClosePreview` |
| **`onchange="evtUpdateCostItem…"`** | **`create.js`** cost items | Field updates |
| **`addEventListener`** | **`sheet.js`** | Preferred pattern for sheet |
| **`addEventListener`** | **`init.js`** | Create open/close, form submit, banner |

**Refactor risk:** Legacy LLC cost UI **requires** global `evt*` functions on `window` for inline handlers unless templates are migrated to delegated listeners.

### 7.4 Custom events

| Event | Dispatcher | Listener |
| --- | --- | --- |
| `events:created` | `sheet.js` `_submit` | `init.js` → `evtLoadEvents()` |

Detail: `{ event: data, status }` — init listener **ignores detail** (full reload only).

---

## 8. Split Seam Candidates

### 8.1 Safer extraction candidates

| Candidate | Source | Rationale |
| --- | --- | --- |
| **Geocoding module** | `create.js` geocode block | Self-contained; already called as `window.evtGeocodeAddress`; benefits sheet + legacy |
| **LLC cost builder** | `create.js` cost functions + `evtCostItems` | Isolated to legacy modal; extract with onclick migration plan |
| **Sheet step: review HTML** | `_reviewHtml`, `_raffleReviewHtml` | Read-only summary |
| **Sheet step: basics** | `_basicsHtml`, `_wireBasics`, image upload | Clear boundary |
| **Raffle builder UI** | `_raffleBuilderHtml`, `_wireRaffleBuilder`, mutation helpers | Large but cohesive; depends on `EventsRaffleModel` |
| **Sheet shell chrome** | `_ensureMounted`, open/close animations | DOM template blob |

### 8.2 Medium risk

| Candidate | Risk |
| --- | --- |
| **Sheet `_submit`** | Storage paths, raffle prize uploads, draft vs publish — needs E2E |
| **Sheet when/pricing steps** | Geocode + pricing + raffle toggle interplay |
| **Legacy `evtHandleCreate`** | Largest insert logic; LLC + competition branches |
| **Dual-path routing in `init.js`** | Changing default path affects all entry points |

### 8.3 Risky — defer until coverage + product decision on LLC/competition in sheet

| Area | Why |
| --- | --- |
| **Unifying LLC/competition into sheet** | Product change; sheet currently **disables** LLC/competition types |
| **Removing legacy modal** | Would drop LLC/competition create unless sheet extended |
| **`evtHandlePreview`** | Mutates detail view + list visibility — cross-surface |
| **Moving `events:created` contract** | init + tests depend on it |

---

## 9. Smoke / Test Coverage Map

### 9.1 Existing coverage

| Smoke / test | Coverage |
| --- | --- |
| **`test/_smoke-phase3d-create-bridge.js`** | **Primary** — sheet IIFE, `EventsCreate`, `PortalEvents.create`, core fns, `events:created`, supabase refs, loader includes `create/sheet.js`, no extra files in `create/` |
| **`test/_smoke-phase5l-readiness.js`** | Monolith note: **`create/sheet.js` only** (not `create.js`) |
| **`test/_smoke-phase1-bridge.js`** | `init.js` create wiring indirect |
| **`test/_e2e-phase3d-create-bridge.js`** | E2E patterns (if run in CI) |
| **Phase 3A/3B/3C regressions** | Embedded in 3D smoke |
| **Production live QA (`044`)** | List/detail/team — **not** a dedicated create publish E2E in 18-point checklist |

### 9.2 Gaps recommended before refactor

| Gap | Recommendation |
| --- | --- |
| **`create.js` bridge smoke** | Extend 3D or add `5M.1` smoke: `evtGeocodeAddress`, `evtHandleCreate` presence, key globals |
| **Legacy modal HTML field inventory** | Static doc or smoke that required IDs exist in `portal/events.html` |
| **Sheet step validation** | Unit-style tests for `_validateStep` rules per step |
| **`_submit` insert shape** | Golden object test for member record fields |
| **Draft vs publish** | E2E: draft saves `status=draft`, publish navigates |
| **LLC legacy path** | E2E or manual script — still **only** legacy modal path |
| **Raffle builder + prize upload** | Regression after any raffle module split |
| **`events:created` → list refresh** | Light integration assertion |

---

## 10. Risk Map

### 10.1 High risk

| Area | Impact |
| --- | --- |
| **`_submit` / `evtHandleCreate` inserts** | Data loss, wrong `status`, broken slugs, failed storage |
| **Dual-path entry (`EventsCreate` vs modal)** | Wrong UX or dead create button if bridge breaks |
| **`evtGeocodeAddress` / edge function** | Bad lat/lng; sheet + legacy blocked on publish |
| **Raffle config normalization** | Invalid raffle JSON on event row |
| **Inline onclick in LLC cost HTML** | Silent breaks if functions renamed without `window` alias |

### 10.2 Medium risk

| Area | Impact |
| --- | --- |
| Sheet step machine STATE | Lost form data on re-render bugs |
| Banner/embed/prize storage paths | Broken images |
| Preview flow (`evtHandlePreview`) | List/detail visibility stuck |
| LLC/competition legacy-only | Product confusion if sheet promoted without parity |
| `events:created` vs direct `evtLoadEvents` | Inconsistent refresh if one path regresses |

### 10.3 Low risk

| Area | Notes |
| --- | --- |
| `_esc`, step dots UI | Display-only |
| `isFlagOn` stub | Always true |
| Sheet discard confirm | UX only |

---

## 11. Recommended Implementation Phases (create-only — not approved)

Proposed **5M.1.x** sequence after audit sign-off. **Do not implement** without per-phase approval.

| Phase (proposed) | Scope | Rationale |
| --- | --- | --- |
| **5M.1.0** | Audit sign-off + optional LLC/competition product decision doc | Sheet disables LLC/comp — affects whether legacy modal can shrink |
| **5M.1.1** | Extract **`evtGeocodeAddress` + helpers** to `create/geocode.js` (or `utils/geocode.js`) | Shared dependency; smallest IO module |
| **5M.1.2** | Extract **sheet step modules** (basics / when / pricing / review) | Reduce `sheet.js` size without touching legacy |
| **5M.1.3** | Extract **raffle builder** submodule under `create/` | Isolated UI + STATE mutations |
| **5M.1.4** | Extract **`_submit`** + storage helpers | Highest test need |
| **5M.1.5** | Legacy **`create.js` split** (LLC costs, `evtHandleCreate` branches) | Only if legacy modal remains long-term |
| **5M.1.6** | Optional **unify paths** (sheet supports LLC/comp OR deprecate modal) | **Product gate** — not technical-only |

**Order rationale:** Smaller than list (~1.6k lines total vs ~2.7k list); **create first** per `046`/`025` — sheet path is the default UX and is more self-contained than list.

---

## 12. No-Go Reminders

- Do **not** combine **create** refactors with **list** or **manage** in one PR.
- Do **not** combine with **5L.4** compat bootstrap.
- Do **not** combine with **CSS cleanup** or **`portal/events.html`** structural edits without a new approval gate.
- Do **not** remove **`#createModal`** without explicit product approval (LLC/competition depend on it today).
- Do **not** treat this inventory as **implementation approval**.

---

## 13. Doc-Only Commit Workflow (this file)

```bash
git status --short
git diff -- docs/audit/pages/events/048_create_surface_inventory.md
git add docs/audit/pages/events/048_create_surface_inventory.md
git diff --staged --name-only
git commit -m "Add Events create surface inventory"
git push
```

---

## Appendix — Recommended next audit

| Next doc (proposed) | Target |
| --- | --- |
| **`049_manage_surface_inventory.md`** | `js/portal/events/manage/sheet.js` (+ `manage.js` if any) |
| Optional **`050_list_manage_create_risk_smoke_map.md`** | Combined risk/smoke matrix after three inventories |

---

## Appendix — Quick reference: public create API

```text
window.EventsCreate.open()      // sheet — default
window.EventsCreate.close()
window.PortalEvents.create.*    // mirror of above

evtHandleCreate(e)              // legacy form submit only
window.evtGeocodeAddress(addr)  // shared geocode
```
