# Phase 6 — `main.js` ESM entry + esbuild production bundle

**Status:** Implemented  
**Date:** 2026-05-25

## Architecture

```
main.js (ESM imports, hand-synced from classic-chain-loader)
    ↓  npm run build:events  (esbuild, format IIFE)
events.bundle.js + events.bundle.js.map
    ↓
portal/events.html — one classic <script> tag
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run sync:events-main` | Regenerate `main.js` from `classic-chain-loader.js` chain |
| `npm run build:events` | Sync + esbuild bundle |
| `npm run dev:events` | Watch and rebuild on file changes |

## Optional local dev (unbundled)

```html
<script type="module" src="../js/portal/events/main.js"></script>
```

Uses native imports (~60 requests). Production stays on `events.bundle.js`.

## Notes

- Source files remain classic-style (`window.*` bridges); no per-file `export` migration required yet.
- `classic-chain-loader.js` kept for optional dev HTML / rehearsal.
- Bump `?v=` on `events.bundle.js` when deploying after `npm run build:events`.
