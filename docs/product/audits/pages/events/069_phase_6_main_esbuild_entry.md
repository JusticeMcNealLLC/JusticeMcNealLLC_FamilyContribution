# Phase 6 — `main.js` ESM entry + esbuild production bundle

**Status:** Closed (structure complete)  
**Date:** 2026-05-25

## Architecture

```
main.js (ESM import manifest — sole load-order source)
    ↓  npm run build:events  (esbuild, format IIFE)
events.bundle.js + events.bundle.js.map
    ↓
portal/events.html — one classic <script> tag
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run verify:events-main` | Validate `main.js` import paths and order |
| `npm run build:events` | Verify + esbuild bundle |
| `npm run dev:events` | Watch and rebuild on file changes |

## Optional local dev (unbundled)

`portal/events.dev.html` — `<script type="module" src="../js/portal/events/main.js">` (~60 requests).

## Phase 6.1 follow-up (2026-05-25)

- **`classic-chain-loader.js` removed** — edit `main.js` when order changes.
- **`engagement/rsvp.js`**, **`engagement/raffle.js`** (moved from root; named exports added).
- CI: `.github/workflows/events-bundle.yml`.
- Incremental ESM: `070_phase_7_esm_exports_roadmap.md`.

## Notes

- Bump `?v=` on `events.bundle.js` when deploying after `npm run build:events`.
