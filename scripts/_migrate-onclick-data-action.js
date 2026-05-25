#!/usr/bin/env node
/**
 * One-time migration: onclick="evtFoo(...)" → ${evtDataAction('evtFoo', ...)}
 * Run: node scripts/_migrate-onclick-data-action.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EVENTS = path.join(ROOT, 'js/portal/events');

const FILES = [
    'detail/sections.js',
    'detail/template.js',
    'detail/documents.js',
    'detail/competition.js',
    'detail/scrapbook.js',
    'detail/map-live.js',
    'detail/raffle-render.js',
    'team/tools.js',
    'team/chat.js',
    'create/legacy-preview.js',
    'create/legacy-costs.js',
    'engagement/raffle.js',
];

const IMPORT_LINE = "import { evtDataAction } from '../core/actions.js';\n";
const IMPORT_LINE_TEAM = "import { evtDataAction } from '../core/actions.js';\n";
const IMPORT_LINE_CREATE = "import { evtDataAction } from '../core/actions.js';\n";
const IMPORT_LINE_ENG = "import { evtDataAction } from '../core/actions.js';\n";

function importFor(rel) {
    const depth = rel.split('/').length - 1;
    return `import { evtDataAction } from '${ '../'.repeat(depth) + 'core/actions.js'}';\n`;
}

function migrateContent(text) {
    let n = 0;
    // onclick="evtFn()" → ${evtDataAction('evtFn')}
    text = text.replace(/onclick="(evt\w+)\(\)"/g, (_, fn) => {
        n++;
        return `\${evtDataAction('${fn}')}`;
    });
    // onclick="evtFn('${a}')" single arg
    text = text.replace(/onclick="(evt\w+)\('\$\{([^}]+)\}'\)"/g, (_, fn, arg) => {
        n++;
        return `\${evtDataAction('${fn}', ${arg})}`;
    });
    // onclick="evtFn('${a}','${b}')" two string template args
    text = text.replace(/onclick="(evt\w+)\('\$\{([^}]+)\}','\$\{([^}]+)\}'\)"/g, (_, fn, a, b) => {
        n++;
        return `\${evtDataAction('${fn}', ${a}, ${b})}`;
    });
    // onclick="evtFn('${a}','literal')" 
    text = text.replace(/onclick="(evt\w+)\('\$\{([^}]+)\}','([^']*)'\)"/g, (_, fn, a, lit) => {
        n++;
        return `\${evtDataAction('${fn}', ${a}, '${lit}')}`;
    });
    // onclick="evtFn('${a}', ${num})" — numeric second arg
    text = text.replace(/onclick="(evt\w+)\('\$\{([^}]+)\}', (\$\{[^}]+\}|\d+)\)"/g, (_, fn, a, num) => {
        n++;
        return `\${evtDataAction('${fn}', ${a}, ${num})}`;
    });
    // onclick on div: onclick="evtFn(${lat},${lng})" bare numbers
    text = text.replace(/onclick="(evt\w+)\(\$\{([^}]+)\},\$\{([^}]+)\}\)"/g, (_, fn, a, b) => {
        n++;
        return `\${evtDataAction('${fn}', ${a}, ${b})}`;
    });
    // onclick="evtFn('url')" with literal in template - evtOpenLightbox('${event.banner_url}')
    // already covered by single arg pattern

  // complex: evtDownloadDocument with evtEscapeHtml third arg
    text = text.replace(
        /onclick="evtDownloadDocument\('\$\{([^}]+)\}','\$\{([^}]+)\}','\$\{evtEscapeHtml\(([^)]+)\)\}'\)"/g,
        (_, a, b, c) => {
            n++;
            return `\${evtDataAction('evtDownloadDocument', ${a}, ${b}, evtEscapeHtml(${c}))}`;
        }
    );
    // evtViewPhoto with three escaped args
    text = text.replace(
        /onclick="evtViewPhoto\('\$\{([^}]+)\}', '\$\{evtEscapeHtml\(([^)]+)\)\}', '\$\{evtEscapeHtml\(([^)]+)\)\}'\)"/g,
        (_, url, cap, name) => {
            n++;
            return `\${evtDataAction('evtViewPhoto', ${url}, evtEscapeHtml(${cap}), evtEscapeHtml(${name}))}`;
        }
    );
    // evtDeletePhoto three args
    text = text.replace(
        /onclick="evtDeletePhoto\('\$\{([^}]+)\}', '\$\{([^}]+)\}', '\$\{([^}]+)\}'\)"/g,
        (_, a, b, c) => {
            n++;
            return `\${evtDataAction('evtDeletePhoto', ${a}, ${b}, ${c})}`;
        }
    );
    // evtCastVote / evtModerateEntry
    text = text.replace(/onclick="evtCastVote\('\$\{([^}]+)\}','\$\{([^}]+)\}'\)"/g, (_, a, b) => {
        n++;
        return `\${evtDataAction('evtCastVote', ${a}, ${b})}`;
    });
    text = text.replace(/onclick="evtModerateEntry\('\$\{([^}]+)\}','\$\{([^}]+)\}'\)"/g, (_, a, b) => {
        n++;
        return `\${evtDataAction('evtModerateEntry', ${a}, ${b})}`;
    });
    // evtInitMap('${event.id}')
    text = text.replace(/onclick="evtInitMap\('\$\{([^}]+)\}'\)"/g, (_, a) => {
        n++;
        return `\${evtDataAction('evtInitMap', ${a})}`;
    });
    // evtRemoveCostItem
    text = text.replace(/onclick="evtRemoveCostItem\('\$\{([^}]+)\}'\)"/g, (_, a) => {
        n++;
        return `\${evtDataAction('evtRemoveCostItem', ${a})}`;
    });
    // evtDrawWinner with number
    text = text.replace(/onclick="evtDrawWinner\('\$\{([^}]+)\}', (\$\{[^}]+\}|\d+)\)"/g, (_, a, b) => {
        n++;
        return `\${evtDataAction('evtDrawWinner', ${a}, ${b})}`;
    });

    return { text, n };
}

function addImport(text, rel) {
    if (text.includes("from '../core/actions.js'") || text.includes("from '../../core/actions.js'")) {
        return text;
    }
    const imp = importFor(rel);
    const idx = text.indexOf("'use strict';");
    if (idx >= 0) {
        const end = idx + "'use strict';".length;
        return text.slice(0, end) + '\n\n' + imp + text.slice(end);
    }
    return imp + text;
}

let total = 0;
for (const rel of FILES) {
    const fp = path.join(EVENTS, rel);
    if (!fs.existsSync(fp)) {
        console.warn('skip missing', rel);
        continue;
    }
    let text = fs.readFileSync(fp, 'utf8');
    const { text: migrated, n } = migrateContent(text);
    if (n === 0 && !/onclick="evt/.test(text)) {
        console.log(`${rel}: no onclick evt* (already clean?)`);
        continue;
    }
    text = addImport(migrated, rel);
    fs.writeFileSync(fp, text);
    total += n;
    const remaining = (text.match(/onclick="evt/g) || []).length;
    console.log(`${rel}: ${n} migrated, ${remaining} onclick evt* remaining`);
}
console.log(`Total replacements: ${total}`);
