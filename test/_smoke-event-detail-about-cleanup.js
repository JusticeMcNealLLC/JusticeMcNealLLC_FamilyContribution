// Smoke — event detail About: no RSVP catalog chips / Voting open pending
// Run: node test/_smoke-event-detail-about-cleanup.js
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

console.log('\n── Portal included teaser ───────────────────────────────────────────────');
const sections = read('js/portal/events/detail/sections.js');
const includedFn = sections.match(/function evtBuildDetailIncludedCatalogHtml[\s\S]*?\nfunction evtBuildDetailAmenity/);
includedFn
    && !includedFn[0].includes('catalogListHtml')
    && includedFn[0].includes('when you RSVP')
    && includedFn[0].includes('normalizeIncludedItems')
    ? pass('included catalog is name-only RSVP teaser')
    : fail('included catalog still uses chips or missing teaser');

console.log('\n── Amenity pending removed ──────────────────────────────────────────────');
const amenityFn = sections.match(/function evtBuildDetailAmenityResultsHtml[\s\S]*?\nfunction evtReadSeatRole/);
amenityFn
    && !amenityFn[0].includes('pendingMessageHtml')
    && /if\s*\(\s*!canShow\s*\)\s*return\s*''/.test(amenityFn[0])
    && amenityFn[0].includes('resultsHtml')
    ? pass('portal amenity: no pending; keeps resultsHtml')
    : fail('portal amenity pending still present or results missing');

const pub = read('js/events/index.js');
const pubAmenity = pub.match(/async function pubRenderAmenityResults[\s\S]*?\nfunction pubMiniMarkdown/);
pubAmenity
    && !pubAmenity[0].includes('pendingMessageHtml')
    && pubAmenity[0].includes('resultsHtml')
    ? pass('public amenity: no pending teaser')
    : fail('public amenity still shows pending');

console.log('\n── Ship ─────────────────────────────────────────────────────────────────');
const html = read('pages/portal/events.html');
html.includes('index.css?v=199') && html.includes('events.bundle.js?v=199')
    ? pass('portal ?v=199')
    : fail('portal cache not 199');

const pubHtml = read('events/index.html');
pubHtml.includes('index.js?v=195')
    ? pass('public index.js ?v=195')
    : fail('public index.js not bumped');

const sw = read('sw.js');
sw.includes("CACHE_NAME = 'jm-portal-v147'")
    ? pass('SW jm-portal-v147')
    : fail('SW not bumped');

const bundle = read('js/portal/events/events.bundle.js');
bundle.includes('when you RSVP')
    && !/function evtBuildDetailIncludedCatalogHtml[\s\S]{0,800}catalogListHtml/.test(bundle)
    ? pass('bundle has teaser, no catalogListHtml in included builder')
    : fail('bundle still has catalog chips path');

console.log(failed ? `\n✗ ${failed} check(s) failed\n` : '\n✓ detail About cleanup smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
