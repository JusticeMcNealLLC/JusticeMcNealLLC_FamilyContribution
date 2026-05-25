#!/usr/bin/env node
'use strict';
/** Regenerate js/portal/events/main.js import list from classic-chain-loader.js */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const loaderPath = path.join(root, 'js/portal/events/classic-chain-loader.js');
const mainPath = path.join(root, 'js/portal/events/main.js');

const SHARED = [
    ['../../components/events/constants.js', 'EventsConstants (shared)'],
    ['../../components/events/helpers.js', 'EventsHelpers (shared)'],
    ['../../components/events/pills.js', 'EventsPills (shared)'],
    ['../../components/events/card.js', 'EventsCard (shared)'],
];

function parseChain() {
    const src = fs.readFileSync(loaderPath, 'utf8');
    const m = src.match(/var chain = \[([\s\S]*?)\];/);
    if (!m) throw new Error('chain array not found');
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1].replace(/\?v=.*$/, ''));
}

const chain = parseChain();
const lines = [
    '/**',
    ' * Portal Events — ESM entry (source of truth for load order).',
    ' * Production: npm run build:events → events.bundle.js (esbuild IIFE).',
    ' * Local dev (optional): <script type="module" src=".../main.js"> — many requests.',
    ' *',
    ' * Import order is synced from classic-chain-loader.js via: npm run sync:events-main',
    ' */',
    '',
];

for (const [spec, label] of SHARED) {
    lines.push(`import '${spec}'; // ${label}`);
}
lines.push("import './index.js'; // PortalEvents namespace shell");
for (const rel of chain) {
    lines.push(`import './${rel}';`);
}
lines.push("import './init.js'; // boot last (DOMContentLoaded → initEventsPage)");
lines.push('');

fs.writeFileSync(mainPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${path.relative(root, mainPath)} (${SHARED.length + 1 + chain.length + 1} imports)`);
