/* ════════════════════════════════════════════════════════════

   Portal Events — Namespace shell  (M1)

   Establishes `window.PortalEvents` so feature modules

   (list, detail, create, etc.) can register themselves

   without polluting the global scope further.



   Loaded before core/state.js (via main.js / bundle) so

   subsequent modules can attach. Requires

   `js/components/events/constants.js` in the page first.



   Existing legacy `evt*` globals are preserved unchanged

   for backward compat with not-yet-refactored modules

   (engagement/rsvp.js, detail/comments.js, detail/map-live.js, etc.).

   ════════════════════════════════════════════════════════════ */

(function () {

    'use strict';

    window.PortalEvents = window.PortalEvents || {};



    var C = window.EventsConstants || {};

    window.PortalEvents.constants = {

        CATEGORY_EMOJI: C.CATEGORY_EMOJI,

        TYPE_COLORS: C.TYPE_COLORS_PORTAL,

        STATUS_COLORS: C.STATUS_COLORS,

    };



    // Sub-namespaces are created lazily by their owners:

    //   PortalEvents.list   ← list.js   (M1)

    //   PortalEvents.detail ← detail.js (M2)

    //   PortalEvents.create ← create/sheet.js (M4)

    //   PortalEvents.manage ← manage/   (M3)

   // Boot lives in init.js (imported last from main.js).

   //   Production HTML loads events.bundle.js built from main.js (Phase 6).

})();

