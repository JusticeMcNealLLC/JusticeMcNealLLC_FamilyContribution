#!/usr/bin/env node
'use strict';
/**
 * Convert detail/*.js IIFE modules to ESM (Phase 7.6).
 * Skips detail.js orchestrator at js/portal/events/detail.js
 */
const fs = require('fs');
const path = require('path');

const DETAIL_DIR = path.join(__dirname, '..', 'js', 'portal', 'events', 'detail');

/** detailKey must match PortalEvents.detail.<key> */
const MODULES = [
    { file: 'presentation.js', key: 'presentation', exportName: 'detailPresentationApi' },
    { file: 'raffle-render.js', key: 'raffleRender', exportName: 'detailRaffleRenderApi' },
    { file: 'map-overlay.js', key: 'mapOverlay', exportName: 'detailMapOverlayApi' },
    { file: 'fragments.js', key: 'fragments', exportName: 'detailFragmentsApi' },
    { file: 'data.js', key: 'data', exportName: 'detailDataApi' },
    { file: 'sections.js', key: 'sections', exportName: 'detailSectionsApi' },
    { file: 'post-render.js', key: 'postRender', exportName: 'detailPostRenderApi' },
    { file: 'template.js', key: 'template', exportName: 'detailTemplateApi' },
];

function unwrap(src, detailKey, exportName) {
    const assignMatch = src.match(new RegExp(`window\\.PortalEvents\\.detail\\.${detailKey}\\s*=\\s*\\{`));
    if (!assignMatch) {
        console.log(`  skip ${detailKey} (no PortalEvents.detail.${detailKey})`);
        return null;
    }
    const iifeStart = src.search(/\(function\s*\(\)\s*\{/);
    if (iifeStart < 0) {
        console.log(`  skip ${detailKey} (no IIFE)`);
        return null;
    }

    const preamble = src.slice(0, iifeStart).trimEnd();
    let body = src.slice(iifeStart);
    body = body.replace(/^\(function\s*\(\)\s*\{\s*\r?\n\s*['"]use strict['"];\s*\r?\n\r?\n/, '');
    body = body.replace(/\r?\n\}\)\(\);\s*$/, '');

    const lines = body.split(/\r?\n/).map((line) => (line.startsWith('    ') ? line.slice(4) : line));
    body = lines.join('\n');

    body = body.replace(/^\s*window\.PortalEvents\s*=\s*window\.PortalEvents[^;]+;\s*\n/, '');
    body = body.replace(/^\s*window\.PortalEvents\.detail\s*=\s*window\.PortalEvents\.detail[^;]+;\s*\n/, '');

    body = body.replace(
        new RegExp(`window\\.PortalEvents\\.detail\\.${detailKey}\\s*=\\s*\\{`),
        `export const ${exportName} = {`
    );

    body = body.replace(/\bwindow\.(evt\w+)\s*=/g, 'globalThis.$1 =');

    let out = preamble ? `${preamble}\n\n` : '';
    out += "'use strict';\n\n";
    out += body.trimEnd();
    if (!out.endsWith('\n')) out += '\n';
    out += `
const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.detail = PortalEvents.detail || {};
PortalEvents.detail.${detailKey} = ${exportName};
`;
    return out;
}

let n = 0;
for (const { file, key, exportName } of MODULES) {
    const fp = path.join(DETAIL_DIR, file);
    if (!fs.existsSync(fp)) {
        console.log('missing', file);
        continue;
    }
    const out = unwrap(fs.readFileSync(fp, 'utf8'), key, exportName);
    if (!out) continue;
    fs.writeFileSync(fp, out, 'utf8');
    console.log('unwrapped', file);
    n++;
}
console.log(`unwrap-detail-iife: ${n} file(s)`);
