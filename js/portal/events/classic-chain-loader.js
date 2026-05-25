/**
 * Portal Events — classic script chain loader (Phase 5L.3 Option C).
 * Loaded from portal/events.html between index.js and init.js.
 * Injects 54 middle modules (core, list, detail, create, manage, compat re-exports).
 */
(function () {
    var base = '../js/portal/events/';
    var chain = [
        'core/state.js',
        'core/utils.js',
        'core/raffle-model.js',
        'list/search.js',
        'list/right-rail.js',
        'list/header.js',
        'list/filters.js',
        'list/calendar.js',
        'list/hero-rails.js',
        'list/buckets.js',
        'list/shell.js',
        'team/chat.js',
        'team/tools.js',
        'detail/presentation.js',
        'detail/raffle-render.js',
        'detail/map-overlay.js',
        'detail/fragments.js',
        'detail/data.js',
        'detail/sections.js',
        'detail/post-render.js',
        'detail/template.js',
        'detail.js',
        'detail/comments.js',
        'detail/documents.js',
        'detail/map-live.js',
        'detail/competition.js',
        'detail/scrapbook.js',
        'detail/scanner.js',
        'rsvp.js',
        'create/geocode.js',
        'create/legacy-costs.js',
        'create/legacy-location.js',
        'create/legacy-preview.js',
        'create/legacy-submit.js',
        'create/step-basics.js',
        'create/step-when.js',
        'create/step-pricing.js',
        'create/step-review.js',
        'create/raffle-builder.js',
        'create/submit.js',
        'create/sheet.js',
        'raffle.js',
        'manage/shell.js',
        'manage/overview.js',
        'manage/images.js',
        'manage/docs.js',
        'manage/rsvps.js',
        'manage/money.js',
        'manage/competition.js',
        'manage/participation.js',
        'manage/raffle.js',
        'manage/danger.js',
        'compat/global-reexports.js',
        'manage/sheet.js?v=113',
    ];
    for (var i = 0; i < chain.length; i++) {
        document.write('<script src="' + base + chain[i] + '"><\/script>');
    }
})();
