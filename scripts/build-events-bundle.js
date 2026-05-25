#!/usr/bin/env node
'use strict';
/**
 * Build portal/events/events.bundle.js — single classic script (Phase 5L.4 / option 7).
 * Order: shared components/events → index → classic-chain-loader manifest → init (last).
 *
 * Run: node scripts/build-events-bundle.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const eventsDir = path.join(root, 'js/portal/events');
const loaderPath = path.join(eventsDir, 'classic-chain-loader.js');
const outPath = path.join(eventsDir, 'events.bundle.js');

const SHARED = [
    'js/components/events/constants.js',
    'js/components/events/helpers.js',
    'js/components/events/pills.js',
    'js/components/events/card.js',
];

function parseChain() {
    const src = fs.readFileSync(loaderPath, 'utf8');
    const m = src.match(/var chain = \[([\s\S]*?)\];/);
    if (!m) throw new Error('classic-chain-loader.js: chain array not found');
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1].replace(/\?v=.*$/, ''));
}

function readPart(rel) {
    const abs = path.join(root, rel.replace(/\//g, path.sep));
    if (!fs.existsSync(abs)) throw new Error(`missing: ${rel}`);
    return fs.readFileSync(abs, 'utf8');
}

const chain = parseChain();
const banner = [
    '/* Portal Events — production bundle (generated; do not edit by hand) */',
    `/* Built: ${new Date().toISOString()} */`,
    `/* Modules: ${SHARED.length} shared + index + ${chain.length} chain + init */`,
    '',
].join('\n');

const chunks = [banner];

function append(rel) {
    chunks.push(`\n;/* ===== ${rel} ===== */\n`);
    chunks.push(readPart(rel));
}

for (const rel of SHARED) append(rel);
append('js/portal/events/index.js');
for (const rel of chain) append(path.posix.join('js/portal/events', rel));
append('js/portal/events/init.js');

const body = chunks.join('');
fs.writeFileSync(outPath, body, 'utf8');

const kb = (Buffer.byteLength(body, 'utf8') / 1024).toFixed(1);
console.log(`Wrote ${path.relative(root, outPath)} (${kb} KB, ${SHARED.length + 1 + chain.length + 1} files)`);
