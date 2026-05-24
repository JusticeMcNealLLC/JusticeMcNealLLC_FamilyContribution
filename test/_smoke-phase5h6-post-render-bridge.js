// ═══════════════════════════════════════════════════════════
// Phase 5H.6 static smoke — detail/post-render.js (5H.6.1)
//
// Verifies:
//   • detail/post-render.js exists and exposes evtRunDetailPostRenderBasics
//   • portal/events.html load order: sections → post-render → detail
//   • detail.js delegates post-render basics; still owns QR/Leaflet/countdown/Team Tools
//   • No type="module"; init.js remains last
//
// Run: node test/_smoke-phase5h6-post-render-bridge.js
// ═══════════════════════════════════════════════════════════
'use strict';

const fs   = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

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

const postRender = read('js/portal/events/detail/post-render.js');
const detail = read('js/portal/events/detail.js');
const sections = read('js/portal/events/detail/sections.js');
const html = read('portal/events.html');

console.log('\n── Phase 5H.6.1 — detail/post-render.js ───────────────────────────────────');

fs.existsSync(path.join(root, 'js/portal/events/detail/post-render.js'))
    ? pass('js/portal/events/detail/post-render.js exists')
    : fail('js/portal/events/detail/post-render.js missing');

postRender.includes('(function ()')
    ? pass('detail/post-render.js is classic IIFE')
    : fail('detail/post-render.js must be a classic IIFE');

/\bexport\s+(default|const|let|var|function|class|\{)/.test(postRender)
    ? fail('detail/post-render.js must not use native export')
    : pass('detail/post-render.js has no native export');

postRender.includes('function evtRunDetailPostRenderBasics')
    ? pass('evtRunDetailPostRenderBasics defined in detail/post-render.js')
    : fail('evtRunDetailPostRenderBasics missing from detail/post-render.js');

postRender.includes('window.evtRunDetailPostRenderBasics = evtRunDetailPostRenderBasics')
    ? pass('window.evtRunDetailPostRenderBasics assigned')
    : fail('window.evtRunDetailPostRenderBasics not assigned');

postRender.includes('PortalEvents.detail.postRender')
    ? pass('PortalEvents.detail.postRender namespace present')
    : fail('PortalEvents.detail.postRender namespace missing');

postRender.includes('runBasics: evtRunDetailPostRenderBasics')
    ? pass('PortalEvents.detail.postRender.runBasics present')
    : fail('PortalEvents.detail.postRender.runBasics missing');

postRender.includes('window.evtLoadComments')
    ? pass('post-render delegates comments to evtLoadComments')
    : fail('post-render must call window.evtLoadComments');

postRender.includes('window._edAvatarData')
    ? pass('post-render reads window._edAvatarData for avatar paint')
    : fail('post-render must use window._edAvatarData');

postRender.includes('evt-host-dropdown')
    ? pass('host dropdown outside-click listener in post-render.js')
    : fail('host dropdown listener missing from post-render.js');

!postRender.includes('QRCode')
    ? pass('post-render.js does not reference QRCode (5H.6.1 scope)')
    : fail('post-render.js must not move QR logic in 5H.6.1');

!postRender.includes('L.map')
    ? pass('post-render.js does not reference Leaflet L.map (5H.6.1 scope)')
    : fail('post-render.js must not move Leaflet in 5H.6.1');

!postRender.includes('evtInitBottomNav')
    ? pass('post-render.js does not reference evtInitBottomNav (5H.6.1 scope)')
    : fail('post-render.js must not move Team Tools in 5H.6.1');

sections.includes('window._edAvatarData')
    ? pass('sections.js still seeds window._edAvatarData (contract)')
    : fail('sections.js must still seed _edAvatarData for avatar paint');

console.log('\n── Phase 5H.6 — portal/events.html load order ──────────────────────────────');

const sectionsTag = 'src="../js/portal/events/detail/sections.js"';
const postRenderTag = 'src="../js/portal/events/detail/post-render.js"';
const detailTag = 'src="../js/portal/events/detail.js"';

html.includes(postRenderTag)
    ? pass('detail/post-render.js script tag in events.html')
    : fail('detail/post-render.js script tag missing from events.html');

const sectionsIdx = html.indexOf(sectionsTag);
const postRenderIdx = html.indexOf(postRenderTag);
const detailIdx = html.indexOf(detailTag);

sectionsIdx >= 0 && postRenderIdx >= 0 && detailIdx >= 0
    && sectionsIdx < postRenderIdx && postRenderIdx < detailIdx
    ? pass('load order: sections.js → post-render.js → detail.js')
    : fail('sections → post-render → detail load order incorrect');

console.log('\n── Phase 5H.6 — detail.js orchestrator ─────────────────────────────────────');

detail.includes('async function evtOpenDetail')
    ? pass('evtOpenDetail still defined in detail.js')
    : fail('evtOpenDetail missing from detail.js');

detail.includes('window.evtRunDetailPostRenderBasics({ eventId })')
    ? pass('evtOpenDetail delegates post-render basics')
    : fail('detail.js must call window.evtRunDetailPostRenderBasics');

detail.includes('detail.postRender = window.PortalEvents.detail.postRender')
    ? pass('detail.postRender bridge present')
    : fail('detail.postRender bridge missing');

detail.includes('detail.runPostRenderBasics = window.evtRunDetailPostRenderBasics')
    ? pass('detail.runPostRenderBasics bridge present')
    : fail('detail.runPostRenderBasics bridge missing');

!detail.includes('evtLoadComments(eventId)')
    ? pass('evtLoadComments call moved out of detail.js')
    : fail('evtLoadComments should not remain inline in detail.js');

!detail.includes('edAvatarStackMobile-${eventId}')
    ? pass('avatar paint logic moved out of detail.js')
    : fail('avatar paint should not remain inline in detail.js');

detail.includes('QRCode.toCanvas')
    ? pass('detail.js still owns QRCode.toCanvas (5H.6.2+ slice)')
    : fail('detail.js must still contain QR canvas paint');

detail.includes('_initMap(\'detailEventMap\')')
    ? pass('detail.js still owns inline Leaflet init')
    : fail('detail.js must still contain inline map init');

detail.includes('__evtTeamToolsCtx')
    ? pass('detail.js still owns Team Tools context assignment')
    : fail('detail.js must still assign __evtTeamToolsCtx');

detail.includes('evtInitBottomNav')
    ? pass('detail.js still calls evtInitBottomNav')
    : fail('detail.js must still call evtInitBottomNav');

detail.includes('_tickCd')
    ? pass('detail.js still owns sidebar countdown (_tickCd)')
    : fail('detail.js must still contain sidebar countdown');

console.log('\n── Phase 5H.6 — module mode / init.js last ──────────────────────────────');

/<script[^>]+src="\.\.\/js\/portal\/events\/[^"]+\.js"[^>]*type="module"/.test(html)
    ? fail('portal Events scripts must not use type="module" yet')
    : pass('no type="module" on portal Events scripts');

const portalBlock = html.slice(html.indexOf('<!-- Events modules'));
const moduleSection = portalBlock.slice(0, portalBlock.indexOf('sw-register'));
const portalScripts = [...moduleSection.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/g)]
    .map((m) => m[1])
    .filter((s) => s.includes('portal/events'));

portalScripts.length && portalScripts[portalScripts.length - 1] === '../js/portal/events/init.js'
    ? pass('init.js remains last among portal Events scripts')
    : fail('init.js must be the last portal/events script before sw-register');

console.log('\n═══════════════════════════════════════════════════════════');
if (failed === 0) {
    console.log(`Phase 5H.6 smoke: ALL ${passed} CHECKS PASSED`);
    process.exit(0);
}
console.log(`Phase 5H.6 smoke: ${failed} FAIL(S), ${passed} pass`);
failures.forEach((f) => console.log(`  - ${f}`));
process.exit(1);
