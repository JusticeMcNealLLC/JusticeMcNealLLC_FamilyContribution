# Phase 5L.4 — Production bundle + lazy vendors

**Status:** Implemented  
**Date:** 2026-05-25

## Production load model

| Before | After |
|--------|--------|
| 4× `components/events/*` + `index` + `classic-chain-loader` (54× `document.write`) + `init` | 1× `events.bundle.js` (see Phase 6) |
| 3× CDN scripts (qrcode, jsQR, Leaflet) always on HTML | Lazy load via `core/vendor-loader.js` |

## Build

Superseded by **Phase 6** (`069_phase_6_main_esbuild_entry.md`): `main.js` + esbuild IIFE (~599 KB).

```bash
npm run build:events   # sync main.js + esbuild bundle
npm run dev:events     # watch
```

## Lazy vendors

`js/portal/events/core/vendor-loader.js` exposes:

- `window.evtEnsureQRCode()` — manage overview QR, detail ticket QR, team CTA QR
- `window.evtEnsureJsQR()` — scanner modal
- `window.evtEnsureLeaflet()` — live map, inline maps, fullscreen map (injects Leaflet CSS)

## Manual QA

- [x] List / detail / create / manage (no console errors) — owner sign-off 2026-05-25
- [x] Open scanner (jsQR loads on first use)
- [x] Open live map + fullscreen map (Leaflet loads on first use)
- [x] Manage overview QR codes render
- [x] Hard refresh after deploy (`?v=116` cache bust on `events.bundle.js`)

## Smokes

- `node test/_smoke-events-bundle.js`
- `node test/_smoke-phase5l-readiness.js`
