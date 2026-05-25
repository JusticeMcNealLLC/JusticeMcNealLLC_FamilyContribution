/**
 * Portal Events — classic script chain loader (Phase 5L.3 Option C).
 * Loaded from portal/events.html between index.js and init.js.
 * Injects the middle 34 modules in the same order as the former 29-tag HTML block (+ create/geocode.js, create step modules, raffle-builder, submit).
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
        'create/geocode.js',
        'create.js',
        'create/step-basics.js',
        'create/step-when.js',
        'create/step-pricing.js',
        'create/step-review.js',
        'create/raffle-builder.js',
        'create/submit.js',
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
