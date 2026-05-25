#!/usr/bin/env node
'use strict';
/**
 * Convert create/*.js IIFE modules to ESM (Phase 7.7).
 */
const fs = require('fs');
const path = require('path');

const CREATE_DIR = path.join(__dirname, '..', 'js', 'portal', 'events', 'create');

function stripIife(src) {
    const iifeStart = src.search(/\(function\s*\(\)\s*\{/);
    if (iifeStart < 0) return null;
    const preamble = src.slice(0, iifeStart).trimEnd();
    let body = src.slice(iifeStart);
    body = body.replace(/^\(function\s*\(\)\s*\{\s*\r?\n\s*['"]use strict['"];\s*\r?\n\r?\n?/, '');
    body = body.replace(/\r?\n\}\)\(\);\s*$/, '');
    const lines = body.split(/\r?\n/).map((line) => (line.startsWith('    ') ? line.slice(4) : line));
    body = lines.join('\n');
    body = body.replace(/^\s*window\.PortalEvents\s*=\s*window\.PortalEvents[^;]+;\s*\n/, '');
    body = body.replace(/^\s*window\.PortalEvents\.create\s*=\s*window\.PortalEvents\.create[^;]+;\s*\n/, '');
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

/** @type {Array<{ file: string, kind: string, key?: string, exportName?: string }>} */
const MODULES = [
    { file: 'geocode.js', kind: 'evt-only' },
    { file: 'legacy-costs.js', kind: 'evt-only' },
    { file: 'legacy-location.js', kind: 'evt-only' },
    { file: 'legacy-preview.js', kind: 'evt-only' },
    { file: 'legacy-submit.js', kind: 'evt-only' },
    { file: 'step-basics.js', kind: 'step', key: 'basics', exportName: 'createStepBasicsApi' },
    { file: 'step-when.js', kind: 'step', key: 'when', exportName: 'createStepWhenApi' },
    { file: 'step-pricing.js', kind: 'step', key: 'pricing', exportName: 'createStepPricingApi' },
    { file: 'step-review.js', kind: 'step', key: 'review', exportName: 'createStepReviewApi' },
    { file: 'raffle-builder.js', kind: 'raffle', exportName: 'createRaffleBuilderApi' },
    { file: 'submit.js', kind: 'submit', exportName: 'createSubmitApi' },
    { file: 'sheet.js', kind: 'sheet', exportName: 'eventsCreateApi' },
];

function unwrapFile(src, spec) {
    const stripped = stripIife(src);
    if (!stripped) return null;
    let { preamble, body } = stripped;

    if (spec.kind === 'step') {
        body = body.replace(
            new RegExp(`window\\.EventsCreateSteps\\s*=\\s*window\\.EventsCreateSteps[^;]+;\\s*\\n`),
            ''
        );
        body = body.replace(
            new RegExp(`window\\.EventsCreateSteps\\.${spec.key}\\s*=\\s*\\{`),
            `export const ${spec.exportName} = {`
        );
        return finish(preamble, body, `
globalThis.EventsCreateSteps = globalThis.EventsCreateSteps || {};
globalThis.EventsCreateSteps.${spec.key} = ${spec.exportName};
`);
    }

    if (spec.kind === 'raffle') {
        body = body.replace(
            /window\.EventsCreateRaffleBuilder\s*=\s*\{/,
            `export const ${spec.exportName} = {`
        );
        return finish(preamble, body, `
globalThis.EventsCreateRaffleBuilder = ${spec.exportName};
`);
    }

    if (spec.kind === 'submit') {
        body = body.replace(
            /window\.EventsCreateSubmit\s*=\s*\{\s*submit\s*\}/,
            `export const ${spec.exportName} = { submit }`
        );
        return finish(preamble, body, `
globalThis.EventsCreateSubmit = ${spec.exportName};
`);
    }

    if (spec.kind === 'sheet') {
        body = body.replace(
            /window\.EventsCreate\s*=\s*\{\s*open,\s*close,\s*isFlagOn\s*\}/,
            `export const ${spec.exportName} = { open, close, isFlagOn }`
        );
        body = body.replace(
            /window\.PortalEvents\.create\.open\s*=\s*open;/g,
            ''
        );
        body = body.replace(
            /window\.PortalEvents\.create\.close\s*=\s*close;/g,
            ''
        );
        body = body.replace(
            /window\.PortalEvents\.create\.isFlagOn\s*=\s*isFlagOn;/g,
            ''
        );
        return finish(preamble, body, `
globalThis.EventsCreate = ${spec.exportName};
const PortalEvents = globalThis.PortalEvents = globalThis.PortalEvents || {};
PortalEvents.create = PortalEvents.create || {};
PortalEvents.create.open = ${spec.exportName}.open;
PortalEvents.create.close = ${spec.exportName}.close;
PortalEvents.create.isFlagOn = ${spec.exportName}.isFlagOn;
`);
    }

    // evt-only: unwrap IIFE only
    return finish(preamble, body, '');
}

let n = 0;
for (const spec of MODULES) {
    const fp = path.join(CREATE_DIR, spec.file);
    if (!fs.existsSync(fp)) {
        console.log('missing', spec.file);
        continue;
    }
    const out = unwrapFile(fs.readFileSync(fp, 'utf8'), spec);
    if (!out) {
        console.log('skip', spec.file);
        continue;
    }
    fs.writeFileSync(fp, out, 'utf8');
    console.log('unwrapped', spec.file);
    n++;
}
console.log(`unwrap-create-iife: ${n} file(s)`);
