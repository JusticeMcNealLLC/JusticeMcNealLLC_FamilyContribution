#!/usr/bin/env node
'use strict';
/**
 * Verify js/portal/events/main.js import manifest (every file exists, init last).
 * Run: npm run verify:events-main
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mainPath = path.join(root, 'js/portal/events/main.js');
const eventsDir = path.join(root, 'js/portal/events');

const main = fs.readFileSync(mainPath, 'utf8');
const imports = [...main.matchAll(/import\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

let failed = 0;
for (const spec of imports) {
    const filePath = spec.startsWith('../../')
        ? path.join(root, 'js', spec.replace(/^\.\.\/\.\.\//, ''))
        : path.join(eventsDir, spec.replace(/^\.\//, ''));
    if (!fs.existsSync(filePath)) {
        console.error(`Missing: ${spec} → ${path.relative(root, filePath)}`);
        failed++;
    }
}

const middle = [...main.matchAll(/import\s+['"]\.\/([^'"]+)['"]/g)].map((m) => m[1]);
const lastRel = middle[middle.length - 1];
if (imports[imports.length - 1] !== './init.js') {
    console.error('Last import must be ./init.js');
    failed++;
}

const sheetIdx = middle.indexOf('manage/sheet.js');
const reexportsIdx = middle.indexOf('compat/global-reexports.js');
if (reexportsIdx < 0 || sheetIdx < 0 || reexportsIdx >= sheetIdx) {
    console.error('Order: compat/global-reexports.js must precede manage/sheet.js');
    failed++;
}

if (middle.indexOf('engagement/rsvp.js') < 0 || middle.indexOf('engagement/raffle.js') < 0) {
    console.error('main.js must import engagement/rsvp.js and engagement/raffle.js');
    failed++;
}

if (failed) {
    console.error(`verify-events-main: ${failed} problem(s)`);
    process.exit(1);
}
console.log(`verify-events-main: OK (${imports.length} imports, ${middle.length} middle modules)`);
