// ═══════════════════════════════════════════════════════════
// Phase 5I.1 static smoke — detail/template.js
//
// Verifies mechanical template shell extraction from detail.js.
//
// Run: node test/_smoke-phase5i-template-shell.js
// ═══════════════════════════════════════════════════════════
'use strict';

const fs   = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const { parseClassicChain, isProductionLoaded, chainOrderOk, productionEventsBootLast } = require('./_portal-events-classic-chain.js');

let passed = 0;
let failed = 0;
const failures = [];

function pass(msg) { console.log(`  ✓ ${msg}`); passed++; }
function fail(msg, detail) {
    console.log(`  ✗ ${msg}`);
    if (detail) console.log(`    detail: ${detail}`);
    failed++;
    failures.push(msg);
}
function read(relPath) {
    return fs.readFileSync(path.join(root, relPath), 'utf8');
}

const template = read('js/portal/events/detail/template.js');
const detail = read('js/portal/events/detail.js');
const html = read('pages/portal/events.html');

console.log('\n── Phase 5I.1 — detail/template.js ───────────────────────────────────────');

fs.existsSync(path.join(root, 'js/portal/events/detail/template.js'))
    ? pass('js/portal/events/detail/template.js exists')
    : fail('js/portal/events/detail/template.js missing');

template.includes('(function ()')
    ? pass('detail/template.js is classic IIFE')
    : fail('detail/template.js must be a classic IIFE');

/\bexport\s+(default|const|let|var|function|class|\{)/.test(template)
    ? fail('detail/template.js must not use native export')
    : pass('detail/template.js has no native export');

template.includes('function evtBuildDetailTemplate')
    ? pass('evtBuildDetailTemplate defined in detail/template.js')
    : fail('evtBuildDetailTemplate missing from detail/template.js');

template.includes('window.evtBuildDetailTemplate = evtBuildDetailTemplate')
    ? pass('window.evtBuildDetailTemplate assigned')
    : fail('window.evtBuildDetailTemplate not assigned');

template.includes('PortalEvents.detail.template')
    ? pass('PortalEvents.detail.template namespace present')
    : fail('PortalEvents.detail.template namespace missing');

template.includes('build: evtBuildDetailTemplate')
    ? pass('PortalEvents.detail.template.build present')
    : fail('PortalEvents.detail.template.build missing');

template.includes('window.evtEdCard')
    ? pass('template.js uses window.evtEdCard fragment helper')
    : fail('template.js must use window.evtEdCard');

template.includes('window.evtEdSectionHead')
    ? pass('template.js uses window.evtEdSectionHead fragment helper')
    : fail('template.js must use window.evtEdSectionHead');

template.includes('window.evtEscapeHtml')
    ? pass('template.js uses window.evtEscapeHtml')
    : fail('template.js must use window.evtEscapeHtml');

[
    'detailEventMap',
    'detailEventMapMobile',
    'portalCommentsList',
    'edCountdownCard',
].forEach((id) => {
    template.includes(id)
        ? pass(`template.js contains stable id: ${id}`)
        : fail(`template.js must contain id ${id}`);
});

template.includes('${qrHtml}')
    ? pass('template.js injects qrHtml sidebar slot (myTicketQR from detail.js pre-template)')
    : fail('template.js must interpolate qrHtml for ticket card');

detail.includes('myTicketQR')
    ? pass('detail.js still builds myTicketQR canvas in qrHtml pre-template')
    : fail('detail.js must still contain myTicketQR in qrHtml builder');

console.log('\n── Phase 5I.1 — portal/events.html load order ──────────────────────────────');

const classicChain = parseClassicChain(root);

isProductionLoaded(html, classicChain, '../js/portal/events/detail/template.js')
    ? pass('detail/template.js in production load (HTML or classic-chain-loader)')
    : fail('detail/template.js missing from production load');

chainOrderOk(classicChain, 'detail/post-render.js', 'detail/template.js', 'detail.js')
    ? pass('load order: post-render.js → template.js → detail.js')
    : fail('post-render → template → detail load order incorrect');

console.log('\n── Phase 5I.1 — detail.js orchestrator ─────────────────────────────────────');

detail.includes('async function evtOpenDetail')
    ? pass('evtOpenDetail still defined in detail.js')
    : fail('evtOpenDetail missing from detail.js');

detail.includes('window.evtBuildDetailTemplate(templateCtx)')
    ? pass('detail.js delegates template build to evtBuildDetailTemplate')
    : fail('detail.js must call window.evtBuildDetailTemplate(templateCtx)');

!detail.includes('detailView.innerHTML = `')
    ? pass('detailView.innerHTML template moved out of detail.js')
    : fail('detail.js must not contain inline detailView.innerHTML template');

detail.includes('const templateCtx = {')
    ? pass('detail.js builds templateCtx before template render')
    : fail('detail.js must build templateCtx object');

!detail.includes('venueQrHtml') && !detail.includes('scannerBtn')
    ? pass('dead venueQrHtml/scannerBtn pre-template code removed from detail.js (Phase 5I.2)')
    : fail('detail.js must not contain venueQrHtml or scannerBtn dead code');

!detail.includes('evtBuildDetailHostControlsHtml') && !detail.includes('evtBuildDetailAttendeeBreakdownHtml')
    ? pass('unused host/attendee breakdown builders not called from detail.js (Phase 5I.2)')
    : fail('detail.js must not call unused hostControls or attendeeBreakdown builders');

detail.includes('detail.buildTemplate = window.evtBuildDetailTemplate')
    ? pass('detail.buildTemplate bridge present')
    : fail('detail.buildTemplate bridge missing');

detail.includes('detail.template = window.PortalEvents.detail.template')
    ? pass('detail.template bridge present')
    : fail('detail.template bridge missing');

detail.includes('window.evtRunDetailPostRenderUi({')
    ? pass('post-render UI delegation unchanged in detail.js')
    : fail('detail.js must still call evtRunDetailPostRenderUi');

console.log('\n── Phase 5I.1 — module mode / init.js last ──────────────────────────────');

/<script[^>]+src="\.\.\/js\/portal\/events\/[^"]+\.js"[^>]*type="module"/.test(html)
    ? fail('portal Events scripts must not use type="module" yet')
    : pass('no type="module" on portal Events scripts');

const portalBlock = html.slice(html.indexOf('<!-- Events modules'));
const moduleSection = portalBlock.slice(0, portalBlock.indexOf('sw-register'));
const portalScripts = [...moduleSection.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)]
    .map((m) => m[1])
    .filter((s) => s.includes('portal/events'));

productionEventsBootLast(portalScripts)
    ? pass('events boot script is last before sw-register (bundle or init.js)')
    : fail('events.bundle.js or init.js must be the last portal/events script before sw-register');

console.log('\n═══════════════════════════════════════════════════════════');
if (failed === 0) {
    console.log(`Phase 5I.1 smoke: ALL ${passed} CHECKS PASSED`);
    process.exit(0);
}
console.log(`Phase 5I.1 smoke: ${failed} FAIL(S), ${passed} pass`);
failures.forEach((f) => console.log(`  - ${f}`));
process.exit(1);
