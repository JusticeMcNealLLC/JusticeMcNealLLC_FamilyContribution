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

postRender.includes('function evtRenderDetailQrCanvases')
    ? pass('evtRenderDetailQrCanvases defined in detail/post-render.js')
    : fail('evtRenderDetailQrCanvases missing from detail/post-render.js');

postRender.includes('window.evtRenderDetailQrCanvases = evtRenderDetailQrCanvases')
    ? pass('window.evtRenderDetailQrCanvases assigned')
    : fail('window.evtRenderDetailQrCanvases not assigned');

postRender.includes('renderQrCanvases: evtRenderDetailQrCanvases')
    ? pass('PortalEvents.detail.postRender.renderQrCanvases present')
    : fail('PortalEvents.detail.postRender.renderQrCanvases missing');

postRender.includes('QRCode.toCanvas')
    ? pass('post-render.js owns QRCode.toCanvas (Phase 5H.6.2)')
    : fail('post-render.js must contain QRCode.toCanvas');

postRender.includes('myTicketQR')
    ? pass('post-render.js targets #myTicketQR canvas')
    : fail('post-render.js must paint #myTicketQR');

postRender.includes('function evtInitDetailInlineMaps')
    ? pass('evtInitDetailInlineMaps defined in detail/post-render.js')
    : fail('evtInitDetailInlineMaps missing from detail/post-render.js');

postRender.includes('window.evtInitDetailInlineMaps = evtInitDetailInlineMaps')
    ? pass('window.evtInitDetailInlineMaps assigned')
    : fail('window.evtInitDetailInlineMaps not assigned');

postRender.includes('initInlineMaps: evtInitDetailInlineMaps')
    ? pass('PortalEvents.detail.postRender.initInlineMaps present')
    : fail('PortalEvents.detail.postRender.initInlineMaps missing');

postRender.includes("initMap('detailEventMap')") && postRender.includes("initMap('detailEventMapMobile')")
    ? pass('post-render.js inits desktop + mobile inline maps')
    : fail('post-render.js must init detailEventMap and detailEventMapMobile');

postRender.includes('L.map') && postRender.includes('evtOpenFullscreenMap')
    ? pass('post-render.js owns inline Leaflet + fullscreen click (Phase 5H.6.3)')
    : fail('post-render.js must contain inline Leaflet init');

postRender.includes('function evtRunDetailPostRenderUi')
    ? pass('evtRunDetailPostRenderUi defined in detail/post-render.js (Phase 5H.6.4)')
    : fail('evtRunDetailPostRenderUi missing from detail/post-render.js');

postRender.includes('window.evtRunDetailPostRenderUi = evtRunDetailPostRenderUi')
    ? pass('window.evtRunDetailPostRenderUi assigned')
    : fail('window.evtRunDetailPostRenderUi not assigned');

postRender.includes('runUi: evtRunDetailPostRenderUi')
    ? pass('PortalEvents.detail.postRender.runUi present')
    : fail('PortalEvents.detail.postRender.runUi missing');

postRender.includes('function _tickCd')
    ? pass('post-render.js owns sidebar countdown (_tickCd) (Phase 5H.6.4)')
    : fail('post-render.js must contain _tickCd');

postRender.includes('edCountdownCard')
    ? pass('post-render.js targets #edCountdownCard sidebar countdown')
    : fail('post-render.js must reference edCountdownCard');

postRender.includes('__evtTeamToolsCtx')
    ? pass('post-render.js owns Team Tools context assignment (Phase 5H.6.4)')
    : fail('post-render.js must assign __evtTeamToolsCtx');

postRender.includes('window.evtInitBottomNav')
    ? pass('post-render.js calls evtInitBottomNav (Phase 5H.6.4)')
    : fail('post-render.js must call window.evtInitBottomNav');

sections.includes('window._edAvatarData')
    ? pass('sections.js still seeds window._edAvatarData (contract)')
    : fail('sections.js must still seed _edAvatarData for avatar paint');

console.log('\n── Phase 5H.6 — portal/events.html load order ──────────────────────────────');

const sectionsTag = 'src="../js/portal/events/detail/sections.js"';
const postRenderTag = 'src="../js/portal/events/detail/post-render.js"';
const templateTag = 'src="../js/portal/events/detail/template.js"';
const detailTag = 'src="../js/portal/events/detail.js"';

html.includes(postRenderTag)
    ? pass('detail/post-render.js script tag in events.html')
    : fail('detail/post-render.js script tag missing from events.html');

html.includes(templateTag)
    ? pass('detail/template.js script tag in events.html (Phase 5I.1)')
    : fail('detail/template.js script tag missing from events.html');

const sectionsIdx = html.indexOf(sectionsTag);
const postRenderIdx = html.indexOf(postRenderTag);
const templateIdx = html.indexOf(templateTag);
const detailIdx = html.indexOf(detailTag);

sectionsIdx >= 0 && postRenderIdx >= 0 && templateIdx >= 0 && detailIdx >= 0
    && sectionsIdx < postRenderIdx && postRenderIdx < templateIdx && templateIdx < detailIdx
    ? pass('load order: sections.js → post-render.js → template.js → detail.js')
    : fail('sections → post-render → template → detail load order incorrect');

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

detail.includes('detail.renderQrCanvases = window.evtRenderDetailQrCanvases')
    ? pass('detail.renderQrCanvases bridge present')
    : fail('detail.renderQrCanvases bridge missing');

detail.includes('detail.initInlineMaps = window.evtInitDetailInlineMaps')
    ? pass('detail.initInlineMaps bridge present')
    : fail('detail.initInlineMaps bridge missing');

detail.includes('window.evtRenderDetailQrCanvases({ event, eventId, rsvp, memberGoing })')
    ? pass('evtOpenDetail delegates QR canvas paint')
    : fail('detail.js must call window.evtRenderDetailQrCanvases');

detail.includes('window.evtInitDetailInlineMaps({ event, showLocation })')
    ? pass('evtOpenDetail delegates inline map init')
    : fail('detail.js must call window.evtInitDetailInlineMaps');

!detail.includes('QRCode.toCanvas')
    ? pass('QRCode.toCanvas moved out of detail.js')
    : fail('QRCode.toCanvas should not remain in detail.js');

!detail.includes("_initMap('detailEventMap')") && !detail.match(/L\.map\s*\(/)
    ? pass('inline Leaflet moved out of detail.js')
    : fail('inline Leaflet should not remain in detail.js');

!detail.includes('evtLoadComments(eventId)')
    ? pass('evtLoadComments call moved out of detail.js')
    : fail('evtLoadComments should not remain inline in detail.js');

!detail.includes('edAvatarStackMobile-${eventId}')
    ? pass('avatar paint logic moved out of detail.js')
    : fail('avatar paint should not remain inline in detail.js');

detail.includes('window.evtRunDetailPostRenderUi({')
    ? pass('evtOpenDetail delegates post-render UI (Phase 5H.6.4)')
    : fail('detail.js must call window.evtRunDetailPostRenderUi');

detail.includes('detail.runPostRenderUi = window.evtRunDetailPostRenderUi')
    ? pass('detail.runPostRenderUi bridge present')
    : fail('detail.runPostRenderUi bridge missing');

!detail.includes('__evtTeamToolsCtx')
    ? pass('Team Tools context moved out of detail.js')
    : fail('__evtTeamToolsCtx should not remain in detail.js');

!detail.match(/evtInitBottomNav\s*\(/)
    ? pass('evtInitBottomNav call moved out of detail.js')
    : fail('evtInitBottomNav should not be called inline in detail.js');

!detail.includes('function _tickCd')
    ? pass('sidebar countdown moved out of detail.js')
    : fail('_tickCd should not remain in detail.js');

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
