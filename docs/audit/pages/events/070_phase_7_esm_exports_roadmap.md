# Phase 7 — Native ESM exports (incremental)

**Status:** Started (engagement modules export; full migration open)  
**Date:** 2026-05-25

## Done in Phase 6.1

- `main.js` is the **only** load-order manifest (`classic-chain-loader.js` removed).
- `engagement/rsvp.js` and `engagement/raffle.js` moved from portal/events root.
- Named `export { … }` on engagement modules; `window.*` bridges kept for HTML `onclick` and legacy callers.
- CI: `.github/workflows/events-bundle.yml` runs `verify:events-main`, `build:events`, bundle smokes.

## Remaining (incremental PRs)

| Area | Files | Approach |
|------|-------|----------|
| Shared state | `core/state.js` | `export let` + import in `init.js`; migrate bare `evtCurrentUser` references file-by-file |
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
