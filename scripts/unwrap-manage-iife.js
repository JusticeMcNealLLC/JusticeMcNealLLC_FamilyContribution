#!/usr/bin/env node
'use strict';
/** Convert manage/*.js IIFE modules to ESM (Phase 7.8). */
const fs = require('fs');
const path = require('path');

const MANAGE_DIR = path.join(__dirname, '..', 'js', 'portal', 'events', 'manage');

function stripIife(src) {
    const iifeStart = src.search(/\(function\s*\(\)\s*\{/);
    if (iifeStart < 0) return null;
    const preamble = src.slice(0, iifeStart).trimEnd();
    let body = src.slice(iifeStart);
    body = body.replace(/^\(function\s*\(\)\s*\{\s*\r?\n\s*['"]use strict['"];\s*\r?\n\r?\n?/, '');
    body = body.replace(/\r?\n\}\)\(\);\s*$/, '');
    const lines = body.split(/\r?\n/).map((line) => (line.startsWith('    ') ? line.slice(4) : line));
    body = lines.join('\n');
    body = body.replace(/\bwindow\.(_em\w+)\s*=/g, 'globalThis.$1 =');
    body = body.replace(/\bwindow\.(evt\w+)\s*=/g, 'globalThis.$1 =');
    return { preamble, body };
}

function finish(preamble, body, footer) {
    let out = preamble ? `${preamble}\n\n` : '';
    out += "'use strict';\n\n";
    out += body.trimEnd();
    if (!out.endsWith('\n')) out += '\n';
    out += footer;
    return out;
}

/** @type {Array<{ file: string, global: string, exportName: string, kind?: string }>} */
const MODULES = [
    { file: 'shell.js', global: 'EventsManageShell', exportName: 'manageShellApi' },
    { file: 'overview.js', global: 'EventsManageOverview', exportName: 'manageOverviewApi' },
    { file: 'images.js', global: 'EventsManageImages', exportName: 'manageImagesApi' },
    { file: 'docs.js', global: 'EventsManageDocs', exportName: 'manageDocsApi' },
    { file: 'rsvps.js', global: 'EventsManageRsvps', exportName: 'manageRsvpsApi' },
    { file: 'money.js', global: 'EventsManageMoney', exportName: 'manageMoneyApi' },
    { file: 'competition.js', global: 'EventsManageCompetition', exportName: 'manageCompetitionApi' },
    { file: 'participation.js', global: 'EventsManageParticipation', exportName: 'manageParticipationApi' },
    { file: 'raffle.js', global: 'EventsManageRaffle', exportName: 'manageRaffleApi' },
    { file: 'danger.js', global: 'EventsManageDanger', exportName: 'manageDangerApi' },
    { file: 'sheet.js', global: 'EventsManage', exportName: 'eventsManageApi', kind: 'sheet' },
];

function unwrapModule(src, spec) {
    const stripped = stripIife(src);
    if (!stripped) return null;
    let { preamble, body } = stripped;

    if (spec.kind === 'sheet') {
        body = body.replace(
            /window\.EventsManage\s*=\s*\{\s*open,\s*close,\s*refreshRaffle\s*\}/,
            `export const ${spec.exportName} = { open, close, refreshRaffle }`
        );
        body = body.replace(
            /if\s*\(window\.PortalEvents\)\s*\{[\s\S]*?window\.PortalEvents\.manage\.refreshRaffle\s*=\s*refreshRaffle;\s*\}/,
            ''
        );
        body = body.replace(
            /if\s*\(window\.PortalEvents\s*&&\s*window\.PortalEvents\.detail[\s\S]*?\}\s*\n/,
            ''
        );
        body = body.replace(/\bwindow\.(EventsManage\w+Api)\s*=/g, 'globalThis.$1 =');
        return finish(preamble, body, `
globalThis.EventsManage = ${spec.exportName};
const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.manage = PortalEvents.manage || {};
PortalEvents.manage.open = ${spec.exportName}.open;
PortalEvents.manage.close = ${spec.exportName}.close;
PortalEvents.manage.refreshRaffle = ${spec.exportName}.refreshRaffle;
if (PortalEvents.detail && typeof PortalEvents.detail.register === 'function') {
    PortalEvents.detail.register('manage', { open, close });
}
`);
    }

    const re = new RegExp(`window\\.${spec.global}\\s*=\\s*\\{`);
    if (!re.test(body)) {
        console.log(`  skip ${spec.file} (no window.${spec.global})`);
        return null;
    }
    body = body.replace(re, `export const ${spec.exportName} = {`);
    return finish(preamble, body, `
globalThis.${spec.global} = ${spec.exportName};
`);
}

let n = 0;
for (const spec of MODULES) {
    const fp = path.join(MANAGE_DIR, spec.file);
    const out = unwrapModule(fs.readFileSync(fp, 'utf8'), spec);
    if (!out) continue;
    fs.writeFileSync(fp, out, 'utf8');
    console.log('unwrapped', spec.file);
    n++;
}
console.log(`unwrap-manage-iife: ${n} file(s)`);
