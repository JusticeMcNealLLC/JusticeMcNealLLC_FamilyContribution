/**
 * Portal Events — dev chain manifest (Phase 5L.3 Option C).
 * Dev-only unbundled loader (optional). Production: main.js → esbuild → events.bundle.js.
 * Import order is mirrored in main.js (npm run sync:events-main).
 * Chain: 55 middle modules (core incl. vendor-loader, list, detail, create, manage, compat) + index + init via build script.
 */
(function () {
    var base = '../js/portal/events/';
    var chain = [
        'core/state.js',
        'core/utils.js',
        'core/vendor-loader.js',
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
