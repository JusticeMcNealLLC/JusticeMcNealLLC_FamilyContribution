# Phase 7 — Native ESM exports (incremental)

**Status:** Started (engagement modules export; full migration open)  
**Date:** 2026-05-25

## Done in Phase 6.1

- `main.js` is the **only** load-order manifest (`classic-chain-loader.js` removed).
- `engagement/rsvp.js` and `engagement/raffle.js` moved from portal/events root.
- Named `export { … }` on engagement modules; `window.*` bridges kept for HTML `onclick` and legacy callers.
- CI: `.github/workflows/events-bundle.yml` runs `verify:events-main`, `build:events`, bundle smokes.

## Done in Phase 7.1

| File | Change |
|------|--------|
| `core/vendor-loader.js` | IIFE removed; `export` `ensureQRCode` / `ensureJsQR` / `ensureLeaflet`; `window.evtEnsure*` preserved |

## Done in Phase 7.2

| File | Change |
|------|--------|
| `core/state.js` | `export const EventsState`; `globalThis.evt*` getters/setters for legacy + esbuild |
| 19 modules | Bare `evtCurrentUser`, `evtAllEvents`, etc. → `globalThis.*` (see `scripts/migrate-events-state-globals.js`) |

## Done in Phase 7.3

| File | Change |
|------|--------|
| `core/utils.js` | Named `export` for routing/modal/ICS helpers; `globalThis.*` assignment |
| `compat/global-reexports.js` | Resolve handlers via `globalThis` (esbuild-safe) |

## Remaining (incremental PRs)

| Area | Files | Approach |
|------|-------|----------|
| IIFE modules | ~40 under list/detail/create/manage | Remove IIFE wrapper; `export` handlers; import in orchestrators |
| `compat/global-reexports.js` | 1 | Shrink as modules import each other directly |
| Shared components | `js/components/events/*` | Optional `export` for `EventsConstants`, etc. |

## Rule until migration complete

1. Edit **`main.js`** when load order changes → `npm run verify:events-main` → `npm run build:events`.
2. New public APIs: add **`export`** and keep **`window.*`** assignment until all callers import.
3. Do not edit `events.bundle.js` by hand.

## Verification

```bash
npm run verify:events-main
npm run build:events
node test/_smoke-events-bundle.js
```
