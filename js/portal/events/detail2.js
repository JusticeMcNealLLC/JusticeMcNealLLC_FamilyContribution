// ─── Events2: Detail Bridge ───────────────────────────────
// Loaded on events2.html.
// Exposes window.EV2Detail.open(id) which navigates to the
// full detail page with the event ID as a query parameter.
// ──────────────────────────────────────────────────────────

window.EV2Detail = {
    open: function (eventId) {
        if (!eventId) return;
        window.location.href = 'events2-detail.html?id=' + encodeURIComponent(eventId);
    }
};
