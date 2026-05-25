#!/usr/bin/env node
'use strict';
/** Convert list/shell.js IIFE to ESM (Phase 7.9). */
const fs = require('fs');
const path = require('path');

const fp = path.join(__dirname, '..', 'js', 'portal', 'events', 'list', 'shell.js');
let src = fs.readFileSync(fp, 'utf8');

const iifeStart = src.search(/\(function\s*\(\)\s*\{/);
if (iifeStart < 0) {
    console.log('skip list/shell.js (no IIFE)');
    process.exit(0);
}

const preamble = src.slice(0, iifeStart).trimEnd();
let body = src.slice(iifeStart);
body = body.replace(/^\(function\s*\(\)\s*\{\s*\r?\n\s*['"]use strict['"];\s*\r?\n\r?\n?/, '');
body = body.replace(/\r?\n\}\)\(\);\s*$/, '');
body = body.split(/\r?\n/).map((line) => (line.startsWith('    ') ? line.slice(4) : line)).join('\n');

body = body.replace(/\bwindow\.(evt\w+)\s*=/g, 'globalThis.$1 =');
body = body.replace(/\bwindow\.(PortalEventsList\w+Api)\s*=/g, 'globalThis.$1 =');
body = body.replace(
    /window\.PortalEvents\s*=\s*window\.PortalEvents\s*\|\|\s*\{\};\s*\n\s*window\.PortalEvents\.list\s*=\s*\{/,
    'export const portalEventsListApi = {'
);
body = body.replace(/\bwindow\.PortalEventsList(\w+Api)\s*=/g, 'globalThis.PortalEventsList$1 =');

const footer = `
globalThis.PortalEvents = globalThis.PortalEvents || {};
globalThis.PortalEvents.list = portalEventsListApi;
`;

const out = (preamble ? `${preamble}\n\n` : '') + "'use strict';\n\n" + body.trimEnd() + '\n' + footer;
fs.writeFileSync(fp, out, 'utf8');
console.log('unwrapped list/shell.js');
