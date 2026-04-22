/* ════════════════════════════════════════════════════════════
   Portal Events — Namespace shell  (M1)
   Establishes `window.PortalEvents` so feature modules
   (list, detail, create, etc.) can register themselves
   without polluting the global scope further.

   Loaded BEFORE state.js so subsequent modules can attach.
   Existing legacy `evt*` globals are preserved unchanged
   for backward compat with not-yet-refactored modules
   (rsvp.js, comments.js, raffle.js, competition.js, etc.).
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    window.PortalEvents = window.PortalEvents || {};
    // Sub-namespaces are created lazily by their owners:
    //   PortalEvents.list   ← list.js   (M1)
    //   PortalEvents.detail ← detail.js (M2)
    //   PortalEvents.create ← create.js (M4)
    //   PortalEvents.manage ← manage/   (M3)
})();
