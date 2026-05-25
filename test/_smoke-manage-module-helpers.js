'use strict';
/**
 * Manage tab modules must not call sheet-private helpers (_raffle*, bare STATE).
 * Run: node test/_smoke-manage-module-helpers.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const manageDir = path.join(ROOT, 'js/portal/events/manage');
const sheetPath = path.join(manageDir, 'sheet.js');

let passed = 0;
let failed = 0;

function check(label, ok, detail) {
    if (ok) { console.log(`  ✓ ${label}`); passed++; }
    else { console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); failed++; }
}

const tabFiles = fs.readdirSync(manageDir).filter((f) => f.endsWith('.js') && f !== 'sheet.js');
const badPatterns = [
    [/\b_raffle[A-Z]/, '_raffle* private helper'],
    [/\b_saveRaffle/, '_saveRaffle* private helper'],
    [/\b_wireRaffle/, '_wireRaffle* private helper'],
    [/\b_runDangerAction\b/, '_runDangerAction (use runDangerAction)'],
    [/\b_getParticipationResetCounts\b/, '_getParticipationResetCounts'],
    [/\b_money\b/, 'bare _money (use money or formatCurrency)'],
];

console.log('\n── manage/*.js helper hygiene (excludes sheet.js) ────────────────────────');
for (const file of tabFiles) {
    const src = fs.readFileSync(path.join(manageDir, file), 'utf8');
    for (const [re, label] of badPatterns) {
        check(`${file}: no ${label}`, !re.test(src));
    }
    const usesBareState = /\bSTATE\./.test(src);
    const resolvesStateViaApi = /\.getState\s*\?\.\s*\(\s*\)|\.getState\s*\(\s*\)/.test(src);
    if (usesBareState && !resolvesStateViaApi) {
        check(`${file}: STATE uses getState()`, false, 'bare STATE reference without api().getState()');
    } else if (usesBareState) {
        check(`${file}: STATE via getState()`, true);
    }
}

const shell = fs.readFileSync(path.join(manageDir, 'shell.js'), 'utf8');
check('shell.js defines getState()', shell.includes('function getState()'));
check('shell.js uses api().renderTab', shell.includes('api().renderTab'));

const loader = fs.readFileSync(path.join(ROOT, 'js/portal/events/classic-chain-loader.js'), 'utf8');
check('chain includes compat/global-reexports.js', loader.includes("'compat/global-reexports.js'"));
check('manage sheet cache bust v=113', loader.includes("'manage/sheet.js?v=113'"));

const constants = fs.readFileSync(path.join(ROOT, 'js/components/events/constants.js'), 'utf8');
check('EventsConstants.EVENT_DOC_TYPES defined', constants.includes('EVENT_DOC_TYPES'));

console.log(`\n${'═'.repeat(54)}`);
console.log(`Manage helper smoke: ${passed + failed} checks — ${passed} pass, ${failed} fail`);
process.exit(failed > 0 ? 1 : 0);
