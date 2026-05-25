# Phase 5M — Create / List / Manage Modularization Closeout

**Document:** `067_phase_5m_modularization_closeout.md`  
**Path:** `docs/audit/pages/events/067_phase_5m_modularization_closeout.md`  
**Date:** 2026-05-21  
**Status:** **Closeout** — documentation only; no runtime work in this commit  
**Prior plans:** `065_phase_5m_create_closeout_and_list_plan.md`, `066_phase_5m2_list_closeout_and_manage_plan.md`  
**Latest implementation:** `6118efa` — Extract Events manage raffle and danger modules (5M.3C)

---

## 1. Phase 5M Closeout Summary

The bundled **Phase 5M** structural refactor of portal Events **Create**, **List**, and **Manage** is **complete**.

| Track | Status | Bundles |
| --- | --- | --- |
| **5M.1 Create** | **Complete** | 5M.1.1–5M.1.5 (+ 5M.1.6 path decision deferred) |
| **5M.2 List** | **Complete** | 5M.2A, 5M.2B, 5M.2C |
| **5M.3 Manage** | **Complete** | 5M.3A, 5M.3B, 5M.3C |

No further **5M** runtime extractions are planned in this track. Product-gated create path unification (5M.1.6 Option D) remains **deferred**.

---

## 2. Key Final State

### 5M.1 Create

Modularized under `js/portal/events/create/`:

| Module | Role |
| --- | --- |
| `geocode.js` | Address geocode helpers → `window.evtGeocodeAddress` |
| `step-*.js` (×4) | Sheet steps → `EventsCreateSteps` |
| `raffle-builder.js` | Raffle step UI → `EventsCreateRaffleBuilder` |
| `submit.js` | Persistence → `EventsCreateSubmit` |
| `legacy-*.js` (×4) | LLC/competition modal path |
| `sheet.js` + `create.js` | Thin orchestrators / bridges |

**Key commits:** `0ee3794` (geocode), `c0ab1da` (steps), `d4bfe02` (raffle builder), `ecced37` (submit), `d76113d` (legacy split).

### 5M.2 List

Modularized under `js/portal/events/list/`:

| Module | Role |
| --- | --- |
| `search.js` | Search UI + suggest |
| `right-rail.js` | Right rail |
| `header.js` | List header chrome |
| `filters.js` | Filter chips / strip |
| `calendar.js` | Calendar mode |
| `hero-rails.js` | Hero CTA / going rail |
| `buckets.js` | Bucket cards / expand |

`list.js` remains orchestrator (`loadEvents`, `renderEvents`, card wiring, mobile/vlift).

**Key commits:** `e42c61f` (5M.2A), `0eb279e` (5M.2B), `38b9158` (5M.2C).

### 5M.3 Manage

Modularized under `js/portal/events/manage/`:

| Module | Role |
| --- | --- |
| `shell.js` | Mount, header, tabs, tab routing shell |
| `overview.js` | Overview tab, copy save, QR, featured toggle |
| `images.js` | Images tab + uploads |
| `docs.js` | Documents tab |
| `rsvps.js` | RSVPs tab |
| `money.js` | Money tab (read-only) |
| `competition.js` | Competition tab (read-only) |
| `participation.js` | Reset/remove participation edge calls |
| `raffle.js` | Raffle tab, prizes, draw, winner choice |
| `danger.js` | Cancel / complete / delete / reset wiring |

`manage/sheet.js` is a **thin orchestrator** (~255 lines): `STATE`, open/close, `_loadEventData`, `_renderTab` / `_renderTabAsync`, `_refreshEventManager`, `_notifyParent`, `_emptyHtml`, `DOC_TYPES`, module API wiring, `EventsManage` / `PortalEvents.manage` / `detail.register('manage')`.

**Key commits:** `2ed23c3` (5M.3A shell + overview), `a55d30b` (5M.3B secondary tabs), `6118efa` (5M.3C participation + raffle + danger).

### Loader and HTML

| Property | Value |
| --- | --- |
| **Middle chain count** | **55** scripts (`classic-chain-loader.js` only) |
| **Manage tail order** | `… → competition.js → participation.js → raffle.js → danger.js → sheet.js?v=112 → init.js` |
| **`portal/events.html`** | **Unchanged** (3-tag loader model) |
| **5L.4 compat bootstrap** | **Not started** |
| **No `compat.js`** | Inline `onclick` / `window._emToggleFeatured` preserved where not low-risk to replace |

### Namespaces (Manage)

- `window.EventsManageParticipation`
- `window.EventsManageRaffle`
- `window.EventsManageDanger`
- Plus prior manage modules (`EventsManageShell`, `EventsManageOverview`, etc.) and `window.EventsManage` facade.

---

## 3. Validation

| Gate | Result |
| --- | --- |
| **`node --check`** on manage modules + `sheet.js` + loader | Pass (5M.3C) |
| **Full smoke suite** | **Pass** after 5M.3C (Phase 3C manage bridge, 5L readiness/rehearsal at chain 55, Phase 1/3A–3D/5H–5J, team, raffle parity) |
| **Manual browser QA** | **Not run** in agent sessions for 5M.3C closeout |

**Recommendation:** Treat automated smokes as structural regression gates only. Run **live/manual QA** before any further refactor or production-facing change.

---

## 4. Recommended Manual QA Checklist

Perform on staging (or local) as **host/admin** where applicable:

- [ ] Events **list** loads without console errors.
- [ ] **Search**, **filters**, and **calendar** modes behave as before.
- [ ] **List → detail → back** navigation works.
- [ ] **Create** sheet opens; can step through all create steps (member path).
- [ ] **Manage** opens for host/admin on an owned event.
- [ ] Manage tabs open: **Overview**, **Images**, **Docs**, **RSVPs**, **Money**, **Competition**, **Raffle**, **Danger**.
- [ ] **Team Tools** / **Team Chat** still open **once** (no duplicate mounts).
- [ ] Destructive actions (**cancel**, **complete**, **delete**, **reset participation**, RSVP/raffle removals) still show **confirmation** — do **not** execute on production unless using a **safe test event**.
- [ ] No new **console errors** on list, detail, create, or manage flows.

---

## 5. Recommended Next Action

**Pause runtime refactors** and perform **manual/live QA** using §4.

After QA, choose one path:

| Option | Action |
| --- | --- |
| **A** | **Stop here and monitor** — 5M structural goals met; fix only targeted bugs found in QA. |
| **B** | **Small QA-results doc** — e.g. `068_phase_5m_qa_results.md` if issues or sign-off need recording. |
| **C** | **Plan 5L.4 compat bootstrap** later as a **separate, optional** track — only after explicit approval; not bundled with QA fixes or CSS cleanup. |

**Default recommendation:** **Option A** unless QA finds issues (then targeted fixes + optional Option B).

---

## 6. No-Go Reminders

| Rule | Detail |
| --- | --- |
| **5L.4** | Do **not** start without a **separate approval** doc / explicit go-ahead. |
| **QA vs CSS** | Do **not** combine QA bugfixes with **CSS** or unrelated cleanup in one PR. |
| **`portal/events.html`** | Do **not** modify unless **explicitly approved** (loader remains chain-driven). |
| **Future fixes** | Keep **small and targeted**; preserve destructive confirms, edge payloads, and bridge names. |
| **Create path unification** | **5M.1.6** remains **deferred** (dual sheet + legacy modal). |

---

## 7. Phase Status (Exit)

| Phase | Exit |
| --- | --- |
| **5M.1 Create** | **Closed** (structural) |
| **5M.2 List** | **Closed** (structural) |
| **5M.3 Manage** | **Closed** (structural) |
| **5M overall** | **Closed** — main modularization track complete |
| **5L.4** | **Not started** |

**Phase 5M: done.** Next work is **QA-first**, then product/ops choice (Options A–C above).
