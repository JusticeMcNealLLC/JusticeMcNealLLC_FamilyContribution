#!/usr/bin/env node
'use strict';
/** Convert detail.js orchestrator IIFE to ESM (Phase 7.10). */
const fs = require('fs');
const path = require('path');

const fp = path.join(__dirname, '..', 'js', 'portal', 'events', 'detail.js');
let src = fs.readFileSync(fp, 'utf8');

const iifeStart = src.search(/\(function\s*\(\)\s*\{/);
if (iifeStart < 0) {
    console.log('skip detail.js (no IIFE)');
    process.exit(0);
}

const preamble = src.slice(0, iifeStart).trimEnd();
let body = src.slice(iifeStart);
body = body.replace(/^\(function\s*\(\)\s*\{\s*\r?\n\s*['"]use strict['"];\s*\r?\n\r?\n?/, '');
body = body.replace(/\r?\n\}\)\(\);\s*\/\/.*end IIFE.*\s*$/, '');
body = body.replace(/\r?\n\}\)\(\);\s*$/, '');
body = body.split(/\r?\n/).map((line) => (line.startsWith('    ') ? line.slice(4) : line)).join('\n');

body = body.replace(
    /window\.PortalEvents\s*=\s*window\.PortalEvents\s*\|\|\s*\{\};\s*\nconst detail = window\.PortalEvents\.detail/,
    'const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};\nconst detail = PortalEvents.detail'
);
body = body.replace(/=\s*window\.PortalEvents\.detail/g, '= PortalEvents.detail');
body = body.replace(/\bwindow\.(evt\w+)\s*=/g, 'globalThis.$1 =');
body = body.replace(/\bdetail\.(\w+)\s*=\s*window\.(evt\w+)/g, 'detail.$1 = globalThis.$2');
body = body.replace(/\bdetail\.(\w+)\s*=\s*globalThis\.(evt\w+)/g, 'detail.$1 = globalThis.$2');
body = body.replace(/if\s*\(window\.PortalEvents\.detail\./g, 'if (PortalEvents.detail.');
body = body.replace(/if\s*\(window\.PortalEvents\.team\)/g, 'if (PortalEvents.team)');

const footer = `
export const detailOrchestratorApi = {
    register: detail.register,
    get: detail.get,
    open: globalThis.evtOpenDetail,
    namespace: detail,
};
`;

const out = (preamble ? `${preamble}\n\n` : '') + "'use strict';\n\n" + body.trimEnd() + '\n' + footer;
fs.writeFileSync(fp, out, 'utf8');
console.log('unwrapped detail.js');
