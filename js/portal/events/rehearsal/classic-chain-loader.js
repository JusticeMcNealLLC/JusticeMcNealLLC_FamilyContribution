/**
 * Phase 5L.3 Option B — rehearsal-only classic script chain loader.
 * NOT referenced by production portal/events.html (see portal/events.rehearsal.html).
 *
 * Injects the middle 27 portal Events modules (between index.js and init.js) via
 * synchronous document.write so load order matches production's 29-tag block.
 */
(function () {
    var base = '../js/portal/events/';
    var chain = [
        'constants.js',
        'state.js',
        'utils.js',
        'raffle-model.js',
        'list.js',
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
        'comments.js',
        'rsvp.js',
        'create.js',
        'create/sheet.js',
        'documents.js',
        'map.js',
        'scanner.js',
        'raffle.js',
        'competition.js',
        'scrapbook.js',
        'manage/sheet.js?v=112',
    ];
    for (var i = 0; i < chain.length; i++) {
        document.write('<script src="' + base + chain[i] + '"><\/script>');
    }
})();
