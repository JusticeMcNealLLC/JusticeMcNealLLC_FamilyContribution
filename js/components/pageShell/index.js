// ─── Page Shell: Index ──────────────────────────────────
// This module is the entry point for the pageShell component.
//
// Load order (script tags in HTML):
//   1. icons.js        — SVG path constants
//   2. helpers.js      — p(), dLink(), mTab(), centerTab(), profileTab(), logoBlock()
//   3. nav.js          — Builds nav, footer, tabs, drawer HTML, notification panel
//   4. dropdowns.js    — Desktop "More" + profile dropdown click handlers
//   5. drawer.js       — Swipe gestures, dock edit mode, fly animation
//   6. profile-loader.js — loadNavProfile() (called by auth/shared.js)
//   7. index.js        — (this file) Final init
//
// All modules share state via window.PageShell namespace.
// ─────────────────────────────────────────────────────────

// Nothing to do here currently — all modules self-initialize.
// This file exists for documentation and future shared bootstrapping.
