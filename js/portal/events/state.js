// ═══════════════════════════════════════════════════════════
// Portal Events — Shared State
// All mutable state referenced across event modules lives here.
// ═══════════════════════════════════════════════════════════

let evtCurrentUser = null;
let evtCurrentUserRole = null;
let evtActiveTab = 'upcoming';
let evtBannerFile = null;
let evtAllEvents = [];
let evtAllRsvps = {};      // event_id → rsvp record
let evtScannerStream = null;
let evtScannerAnimFrame = null;
