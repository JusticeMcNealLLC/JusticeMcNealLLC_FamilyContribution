#!/usr/bin/env node
'use strict';
/** Convert list/*.js IIFE modules to ESM (Phase 7.4). Skips list/shell.js */
const fs = require('fs');
const path = require('path');

const LIST = path.join(__dirname, '..', 'js', 'portal', 'events', 'list');
const SKIP = new Set(['shell.js']);

function unwrap(src) {
    const exportMatch = src.match(/window\.(PortalEventsList\w+)\s*=\s*\{/);
    if (!exportMatch) {
        console.log('  skip (no window.PortalEventsList* export)');
        return null;
    }
    const exportName = exportMatch[1];

    const iifeStart = src.search(/\(function\s*\(\)\s*\{/);
    if (iifeStart < 0) {
        console.log('  skip (no IIFE)');
        return null;
    }

    const preamble = src.slice(0, iifeStart).trimEnd();
    let body = src.slice(iifeStart);
    body = body.replace(/^\(function\s*\(\)\s*\{\s*\r?\n\s*['"]use strict['"];\s*\r?\n\r?\n/, '');
    body = body.replace(/\r?\n\}\)\(\);\s*$/, '');

    const lines = body.split(/\r?\n/);
    const unindented = lines.map((line) => (line.startsWith('    ') ? line.slice(4) : line));
    body = unindented.join('\n').trimEnd();

    body = body.replace(
        new RegExp(`window\\.${exportName}\\s*=\\s*\\{`),
        `export const ${exportName} = {`
    );

    let out = preamble ? `${preamble}\n\n` : '';
    out += "'use strict';\n\n";
    out += `${body}\n`;
    out += `globalThis.${exportName} = ${exportName};\n`;
    return out;
}

let n = 0;
for (const name of fs.readdirSync(LIST).filter((f) => f.endsWith('.js'))) {
    if (SKIP.has(name)) continue;
    const file = path.join(LIST, name);
    const src = fs.readFileSync(file, 'utf8');
    const out = unwrap(src);
    if (!out) continue;
    fs.writeFileSync(file, out, 'utf8');
    console.log('unwrapped', name);
    n++;
}
console.log(`unwrap-list-iife: ${n} file(s)`);
