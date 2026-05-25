#!/usr/bin/env node
'use strict';
/** Convert compat/global-reexports.js IIFE to ESM (Phase 7.11). */
const fs = require('fs');
const path = require('path');

const fp = path.join(__dirname, '..', 'js', 'portal', 'events', 'compat', 'global-reexports.js');
let src = fs.readFileSync(fp, 'utf8');

const iifeStart = src.search(/\(function\s*\(\)\s*\{/);
if (iifeStart < 0) {
    console.log('skip global-reexports.js');
    process.exit(0);
}

const preamble = src.slice(0, iifeStart).trimEnd();
let body = src.slice(iifeStart);
body = body.replace(/^\(function\s*\(\)\s*\{\s*\r?\n\s*['"]use strict['"];\s*\r?\n\r?\n?/, '');
body = body.replace(/\r?\n\}\)\(\);\s*$/, '');
body = body.split(/\r?\n/).map((line) => (line.startsWith('    ') ? line.slice(4) : line)).join('\n');

const out = (preamble ? `${preamble}\n\n` : '') + "'use strict';\n\n" + body.trimEnd() + '\n';
fs.writeFileSync(fp, out, 'utf8');
console.log('unwrapped compat/global-reexports.js');
