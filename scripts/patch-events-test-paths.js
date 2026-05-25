#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '..', 'test');
const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.js'));

const replacements = [
    ['js/portal/events/list.js', 'js/portal/events/list/shell.js'],
    ['../js/portal/events/list.js', '../js/portal/events/list/shell.js'],
    ['js/portal/events/raffle-model.js', 'js/portal/events/core/raffle-model.js'],
    ['../js/portal/events/raffle-model.js', '../js/portal/events/core/raffle-model.js'],
    ['js/portal/events/scrapbook.js', 'js/portal/events/detail/scrapbook.js'],
    ['js/portal/events/scanner.js', 'js/portal/events/detail/scanner.js'],
    ["'list.js'", "'list/shell.js'"],
    ["'raffle-model.js'", "'core/raffle-model.js'"],
    ["'scrapbook.js'", "'detail/scrapbook.js'"],
    ["'scanner.js'", "'detail/scanner.js'"],
    ['manage/sheet.js?v=112', 'manage/sheet.js?v=113'],
    ['chainPaths.length === 53', 'chainPaths.length === 54'],
    ['chainEntries.length === 53', 'chainEntries.length === 54'],
    ['loader chain must have 53 entries', 'loader chain must have 54 entries'],
    ['injects 53 middle scripts', 'injects 54 middle scripts'],
    ['→ list.js', '→ list/shell.js'],
    ['list.js present', 'list/shell.js present'],
    ['list.js missing', 'list/shell.js missing'],
    ['list.js still', 'list/shell.js still'],
    ['list.js lost', 'list/shell.js lost'],
    ['list.js appears', 'list/shell.js appears'],
    ['list.js must', 'list/shell.js must'],
    ['list.js not', 'list/shell.js not'],
    ['list.js does', 'list/shell.js does'],
    ['list.js missing', 'list/shell.js missing'],
    ['list.js delegates', 'list/shell.js delegates'],
    ['list.js still owns', 'list/shell.js still owns'],
    ['in list.js', 'in list/shell.js'],
    ['from list.js', 'from list/shell.js'],
    ['list.js —', 'list/shell.js —'],
    ['list.js:', 'list/shell.js:'],
    ['list.js attendee', 'list/shell.js attendee'],
    ['list.js should', 'list/shell.js should'],
    ['list.js uses', 'list/shell.js uses'],
    ['list.js integration', 'list/shell.js integration'],
    ['/js/portal/events/list.js', '/js/portal/events/list/shell.js'],
];

let touched = 0;
for (const file of files) {
    const fp = path.join(testDir, file);
    let src = fs.readFileSync(fp, 'utf8');
    let next = src;
    for (const [from, to] of replacements) {
        next = next.split(from).join(to);
    }
    if (next !== src) {
        fs.writeFileSync(fp, next, 'utf8');
        touched++;
        console.log('patched', file);
    }
}

console.log(`Done. ${touched} test file(s) updated.`);
