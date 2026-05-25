# Phase 7 — Native ESM exports (complete)

**Status:** Complete (2026-05-25)  
**Production:** `main.js` → `npm run build:events` → `events.bundle.js` (single script in `portal/events.html`)

## Summary

All `js/portal/events/**/*.js` modules loaded by `main.js` are now ESM source files. Legacy `window.*` / `globalThis.*` bridges remain for HTML `onclick`, inline handlers, and external pages until callers migrate to imports.

**Exception (intentional):** `core/raffle-model.js` stays UMD `(function (root) { … })(this)` — shared with non-bundle contexts; exports via `root.EventsRaffleModel`.

## Phases completed

| Phase | Scope |
|-------|--------|
| 7.1 | `core/vendor-loader.js` |
| 7.2 | `core/state.js` + state global migration |
| 7.3 | `core/utils.js`, `compat/global-reexports.js` |
| 7.4 | `list/*` (7 modules; shell in 7.9) |
| 7.5 | `team/chat.js`, `team/tools.js` |
| 7.6 | `detail/*` pipeline (8 modules; `detail.js` in 7.10) |
| 7.7 | `create/*` (12 modules) |
| 7.8 | `manage/*` (11 modules) |
| 7.9 | `list/shell.js` orchestrator |
| 7.10 | `detail.js` orchestrator |
| 7.11 | `index.js`, `compat/global-reexports.js` |

## Unwrap scripts

| Script | Folder |
|--------|--------|
| `scripts/unwrap-list-iife.js` | `list/` (excl. shell) |
| `scripts/unwrap-list-shell-iife.js` | `list/shell.js` |
| `scripts/unwrap-team-iife.js` | `team/` |
| `scripts/unwrap-detail-iife.js` | `detail/` submodules |
| `scripts/unwrap-detail-orchestrator-iife.js` | `detail.js` |
| `scripts/unwrap-create-iife.js` | `create/` |
| `scripts/unwrap-manage-iife.js` | `manage/` |
| `scripts/unwrap-index-iife.js` | `index.js` |
| `scripts/unwrap-compat-reexports-iife.js` | `compat/global-reexports.js` |

## Workflow (unchanged)

1. Edit **`main.js`** when load order changes → `npm run verify:events-main` → `npm run build:events`.
2. Bump `events.bundle.js?v=` in `portal/events.html` on deploy.
3. Do not edit `events.bundle.js` by hand.

## Verification

```bash
npm run verify:events-main
npm run build:events
node test/_smoke-events-bundle.js
node test/_smoke-phase7-esm-progress.js
node test/_smoke-phase3a-list-bridge.js
node test/_smoke-phase3b-detail-bridge.js
node test/_smoke-phase3c-manage-bridge.js
node test/_smoke-phase3d-create-bridge.js
```

## Optional follow-ups (not required for Phase 7)

- Replace `window.*` onclick handlers with `data-action` + delegated listeners.
- `import` between modules instead of `globalThis` bridges.
- ESM `export` on `js/components/events/*` shared components.
- Convert `core/raffle-model.js` UMD to ESM if bundle-only.
