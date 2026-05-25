'use strict';
/**
 * Phase 6 — main.js + esbuild production bundle.
 * Run: node test/_smoke-events-bundle.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function check(label, ok, detail) {
    if (ok) { console.log(`  ✓ ${label}`); passed++; }
    else { console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); failed++; }
}

const bundlePath = path.join(root, 'js/portal/events/events.bundle.js');
const mainPath = path.join(root, 'js/portal/events/main.js');
const html = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');

check('main.js exists', fs.existsSync(mainPath));
check('events.bundle.js exists', fs.existsSync(bundlePath));
check('main.js uses ESM imports', fs.readFileSync(mainPath, 'utf8').includes("import './init.js'"));
check('build uses esbuild', fs.readFileSync(path.join(root, 'scripts/build-events-bundle.js'), 'utf8').includes('esbuild'));

const bundle = fs.readFileSync(bundlePath, 'utf8');
check('bundle includes init boot', bundle.includes('PortalEvents.initEventsPage = initEventsPage'));
check('bundle includes vendor loader', bundle.includes('evtEnsureLeaflet'));
check('bundle includes list shell', bundle.includes('window.evtLoadEvents = loadEvents'));
check('bundle from esbuild banner', bundle.includes('production bundle from main.js'));

const mainSrc = fs.readFileSync(mainPath, 'utf8');
const chain = [...mainSrc.matchAll(/import\s+['"]\.\/([^'"]+)['"]/g)].map((m) => m[1]).filter((p) => p !== 'index.js' && p !== 'init.js');
check('chain length 55', chain.length === 55);

const main = fs.readFileSync(mainPath, 'utf8');
check('main imports list/shell', main.includes("import './list/shell.js'"));
check('main imports manage/sheet', main.includes("import './manage/sheet.js'"));
check('main imports engagement/rsvp', main.includes("import './engagement/rsvp.js'"));
check('classic-chain-loader removed', !fs.existsSync(path.join(root, 'js/portal/events/classic-chain-loader.js')));

check('HTML loads bundle only', /events\.bundle\.js/.test(html) && !html.includes('classic-chain-loader.js'));
check('HTML does not load main.js directly in prod', !html.includes('main.js?v=') && !/events\/main\.js/.test(html));

console.log(`\n${'═'.repeat(54)}`);
console.log(`Events bundle smoke: ${passed + failed} checks — ${passed} pass, ${failed} fail`);
process.exit(failed > 0 ? 1 : 0);
