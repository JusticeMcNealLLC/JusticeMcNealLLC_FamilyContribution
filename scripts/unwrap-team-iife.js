#!/usr/bin/env node
'use strict';
/** Convert team/*.js IIFE modules to ESM (Phase 7.5). */
const fs = require('fs');
const path = require('path');

const TEAM = path.join(__dirname, '..', 'js', 'portal', 'events', 'team');

const MODULES = [
    { file: 'chat.js', key: 'chat', exportName: 'teamChatApi' },
    { file: 'tools.js', key: 'tools', exportName: 'teamToolsApi' },
];

function unwrap(src, teamKey, exportName) {
    const assignMatch = src.match(new RegExp(`window\\.PortalEvents\\.team\\.${teamKey}\\s*=\\s*\\{`));
    if (!assignMatch) {
        console.log(`  skip (no PortalEvents.team.${teamKey})`);
        return null;
    }
    const iifeStart = src.search(/\(function\s*\(\)\s*\{/);
    if (iifeStart < 0) {
        console.log('  skip (no IIFE)');
        return null;
    }

    const preamble = src.slice(0, iifeStart).trimEnd();
    let body = src.slice(iifeStart);
    body = body.replace(/^\(function\s*\(\)\s*\{\s*\r?\n\s*['"]use strict['"];\s*\r?\n\r?\n/, '');
    body = body.replace(/\r?\n\}\)\(\);\s*$/, '');

    const lines = body.split(/\r?\n/).map((line) => (line.startsWith('    ') ? line.slice(4) : line));
    body = lines.join('\n');

    body = body.replace(
        /^\s*window\.PortalEvents\s*=\s*window\.PortalEvents[^;]+;\s*\n/,
        ''
    );
    body = body.replace(
        /^\s*window\.PortalEvents\.team\s*=\s*window\.PortalEvents\.team[^;]+;\s*\n/,
        ''
    );

    body = body.replace(
        new RegExp(`window\\.PortalEvents\\.team\\.${teamKey}\\s*=\\s*\\{`),
        `export const ${exportName} = {`
    );

    body = body.replace(/\bwindow\.(evt\w+)\s*=/g, 'globalThis.$1 =');

    let out = preamble ? `${preamble}\n\n` : '';
    out += "'use strict';\n\n";
    out += body.trimEnd();
    if (!out.endsWith('\n')) out += '\n';
    out += `
const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.team = PortalEvents.team || {};
PortalEvents.team.${teamKey} = ${exportName};
`;
    return out;
}

let n = 0;
for (const { file, key, exportName } of MODULES) {
    const fp = path.join(TEAM, file);
    const out = unwrap(fs.readFileSync(fp, 'utf8'), key, exportName);
    if (!out) continue;
    fs.writeFileSync(fp, out, 'utf8');
    console.log('unwrapped', file);
    n++;
}
console.log(`unwrap-team-iife: ${n} file(s)`);
