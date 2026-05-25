#!/usr/bin/env node
'use strict';
/** Convert index.js namespace shell IIFE to ESM (Phase 7.11). */
const fs = require('fs');
const path = require('path');

const fp = path.join(__dirname, '..', 'js', 'portal', 'events', 'index.js');
let src = fs.readFileSync(fp, 'utf8');

const iifeStart = src.search(/\(function\s*\(\)\s*\{/);
if (iifeStart < 0) {
    console.log('skip index.js');
    process.exit(0);
}

const preamble = src.slice(0, iifeStart).trimEnd();
let body = src.slice(iifeStart);
body = body.replace(/^\(function\s*\(\)\s*\{\s*\r?\n\s*['"]use strict['"];\s*\r?\n\r?\n?/, '');
body = body.replace(/\r?\n\}\)\(\);\s*$/, '');
body = body.split(/\r?\n/).map((line) => (line.startsWith('    ') ? line.slice(4) : line)).join('\n');

body = body.replace(
    /window\.PortalEvents\s*=\s*window\.PortalEvents\s*\|\|\s*\{\};/,
    'const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};'
);
body = body.replace(
    /window\.PortalEvents\.constants\s*=\s*\{/,
    'export const portalEventsConstants = {'
);
body = body.replace(/var C = window\.EventsConstants/g, 'const C = globalThis.EventsConstants');

const footer = `
PortalEvents.constants = portalEventsConstants;
export { PortalEvents };
`;

const out = (preamble ? `${preamble}\n\n` : '') + "'use strict';\n\n" + body.trimEnd() + '\n' + footer;
fs.writeFileSync(fp, out, 'utf8');
console.log('unwrapped index.js');
