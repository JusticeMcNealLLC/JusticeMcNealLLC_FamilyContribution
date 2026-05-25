#!/usr/bin/env node
'use strict';
/** One-off: bare evt* state refs → globalThis.evt* (Phase 7.2). */
const fs = require('fs');
const path = require('path');

const eventsDir = path.join(__dirname, '..', 'js', 'portal', 'events');
const KEYS = [
    'evtCurrentUser',
    'evtCurrentUserRole',
    'evtActiveTab',
    'evtBannerFile',
    'evtEmbedImageFile',
    'evtAllEvents',
    'evtAllRsvps',
    'evtScannerStream',
    'evtScannerAnimFrame',
];

function walk(dir, out = []) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(full, out);
        else if (ent.name.endsWith('.js') && ent.name !== 'events.bundle.js' && ent.name !== 'main.js') out.push(full);
    }
    return out;
}

function migrate(src) {
    let next = src;
    for (const key of KEYS) {
        const re = new RegExp(
            `(?<!globalThis\\.|window\\.|function |async function )\\b${key}\\b`,
            'g'
        );
        next = next.replace(re, `globalThis.${key}`);
    }
    return next;
}

let changed = 0;
for (const file of walk(eventsDir)) {
    if (file.endsWith('core\\state.js') || file.endsWith('core/state.js')) continue;
    const before = fs.readFileSync(file, 'utf8');
    const after = migrate(before);
    if (after !== before) {
        fs.writeFileSync(file, after, 'utf8');
        changed++;
        console.log(path.relative(eventsDir, file));
    }
}
console.log(`migrate-events-state-globals: updated ${changed} file(s)`);
