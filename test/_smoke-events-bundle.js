'use strict';
/**
 * Phase 5L.4 — production events.bundle.js vs chain manifest.
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
const loaderPath = path.join(root, 'js/portal/events/classic-chain-loader.js');
const html = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');

check('events.bundle.js exists', fs.existsSync(bundlePath));
const bundle = fs.readFileSync(bundlePath, 'utf8');
const loader = fs.readFileSync(loaderPath, 'utf8');
const chain = [...loader.match(/var chain = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1].replace(/\?v=.*$/, ''));

check('bundle includes index.js', bundle.includes('Portal Events — Namespace shell'));
check('bundle includes init.js', bundle.includes('Portal Events — Init'));
check('bundle includes manage/sheet.js', bundle.includes('manage/sheet.js') || bundle.includes('EventsManage'));
check('chain length still 55', chain.length === 55);
check('chain includes core/vendor-loader.js', chain.includes('core/vendor-loader.js'));

for (const rel of ['core/state.js', 'list/shell.js', 'compat/global-reexports.js', 'manage/sheet.js']) {
    check(`bundle contains ${rel}`, bundle.includes(`/* ===== js/portal/events/${rel} ===== */`));
}

check('HTML loads bundle only', /events\.bundle\.js/.test(html) && !html.includes('classic-chain-loader.js'));
check('HTML does not preload QR/map CDN scripts', !html.includes('cdn.jsdelivr.net/npm/qrcode') && !html.includes('jsqr') && !html.includes('leaflet@1.9.4/dist/leaflet.js'));
check('bundle includes vendor-loader source', bundle.includes('evtEnsureLeaflet'));
check('build script exists', fs.existsSync(path.join(root, 'scripts/build-events-bundle.js')));

console.log(`\n${'═'.repeat(54)}`);
console.log(`Events bundle smoke: ${passed + failed} checks — ${passed} pass, ${failed} fail`);
process.exit(failed > 0 ? 1 : 0);
