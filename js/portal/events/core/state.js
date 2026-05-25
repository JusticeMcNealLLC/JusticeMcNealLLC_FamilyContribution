// ═══════════════════════════════════════════════════════════
// Portal Events — Shared State
// Mutable state for all event modules (Phase 7.2: EventsState + globalThis bridge).
// ═══════════════════════════════════════════════════════════

export const EventsState = {
    evtCurrentUser: null,
    evtCurrentUserRole: null,
    evtActiveTab: 'upcoming',
    evtBannerFile: null,
    evtEmbedImageFile: null,
    evtAllEvents: [],
    evtAllRsvps: {},      // event_id → rsvp record
    evtScannerStream: null,
    evtScannerAnimFrame: null,
};

/** Legacy/global access until all callers use import { EventsState }. */
for (const key of Object.keys(EventsState)) {
    Object.defineProperty(globalThis, key, {
        get() { return EventsState[key]; },
        set(v) { EventsState[key] = v; },
        enumerable: true,
        configurable: true,
    });
}
