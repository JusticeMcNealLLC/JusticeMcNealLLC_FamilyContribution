#!/usr/bin/env node
/** Phase 8 — delegated actions; no inline onclick="evt* in source. */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const eventsDir = path.join(root, 'js/portal/events');
let pass = 0;
let fail = 0;

function check(label, ok) {
    if (ok) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ ${label}`); }
}

function walk(dir, out = []) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'rehearsal') continue;
            walk(p, out);
        } else if (ent.name.endsWith('.js') && ent.name !== 'events.bundle.js') {
            out.push(p);
        }
    }
    return out;
}

console.log('\n── Phase 8 — action delegate ─────────────────────────────');

const actions = fs.readFileSync(path.join(eventsDir, 'core/actions.js'), 'utf8');
check('core/actions.js defines evtDataAction', /export function evtDataAction/.test(actions));
check('core/actions.js installs delegate', /installEvtActionDelegate/.test(actions));

const main = fs.readFileSync(path.join(eventsDir, 'main.js'), 'utf8');
check('main.js imports core/actions.js', main.includes("import './core/actions.js'"));
check('main.js imports list/manage-sync.js', main.includes("import './list/manage-sync.js'"));

const init = fs.readFileSync(path.join(eventsDir, 'init.js'), 'utf8');
check('init.js uses direct imports (no evtHandler)', !init.includes('evtHandler('));
check('init.js imports evtCloseScanner', init.includes("from './detail/scanner.js'"));

const offenders = [];
for (const fp of walk(eventsDir)) {
    const rel = path.relative(eventsDir, fp).replace(/\\/g, '/');
    const text = fs.readFileSync(fp, 'utf8');
    if (/onclick\s*=\s*["']evt/.test(text) && !rel.includes('core/actions.js')) {
        offenders.push(rel);
    }
}
check('no onclick="evt* in portal/events source', offenders.length === 0);
if (offenders.length) {
    offenders.forEach((o) => console.log(`      ${o}`));
}

check('rehearsal classic-chain-loader removed', !fs.existsSync(path.join(eventsDir, 'rehearsal/classic-chain-loader.js')));

const html = fs.readFileSync(path.join(root, 'pages/portal/events.html'), 'utf8');
check('events.html map buttons use data-evt-action', html.includes('data-evt-action="evtCloseFullscreenMap"'));
check('events.html has no onclick="evt', !/onclick\s*=\s*["']evt/.test(html));

check('CONTRIBUTING.md exists', fs.existsSync(path.join(eventsDir, 'CONTRIBUTING.md')));

console.log(`\nPhase 8 actions smoke: ${fail} fail, ${pass} pass\n`);
process.exit(fail ? 1 : 0);
