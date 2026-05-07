const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'cloudflare/event-preview-worker.js'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'docs/EVENT_INVITES.md'), 'utf8');

function assert(condition, message) {
    if (!condition) {
        console.error('FAIL:', message);
        process.exit(1);
    }
}

assert(/discordbot/i.test(worker), 'preview bot regex should include Discordbot');
assert(/applebot/i.test(worker), 'preview bot regex should include Applebot/iMessage');
assert(/headers\.set\('Content-Type', 'text\/html; charset=utf-8'\)/.test(worker), 'worker should return crawler metadata as text/html');
assert(/headers\.set\('Vary', 'User-Agent'\)/.test(worker), 'worker should vary cached responses by user agent');
assert(/!ogResponse\.ok[\s\S]*return fetch\(request\)/.test(worker), 'worker should fall back to GitHub Pages when event-og fails');
assert(/orange cloud/.test(docs), 'docs should mention orange-cloud proxied DNS requirement');
assert(/Discordbot\/2\.0/.test(docs), 'docs should include Discordbot verification command');

console.log('event preview worker smoke: all pass');