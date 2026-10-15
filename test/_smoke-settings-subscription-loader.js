// Smoke — settings subscription loader and service-worker recovery assets
// Run: node test/_smoke-settings-subscription-loader.js
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('pages/portal/settings.html');
const settings = read('js/portal/settings.js');
const sw = read('sw.js');

assert(
    /<script type="module" src="\.\.\/\.\.\/js\/portal\/settings\.js"><\/script>/.test(html),
    'settings.js should load as a module'
);
assert(
    settings.includes("import { loadSubscription } from '../pages/portal/loaders/subscription.js';"),
    'settings.js should import loadSubscription'
);
assert(sw.includes("'/pages/portal/settings.html'"), 'service worker should cache the settings page');
assert(sw.includes("'/js/portal/settings.js'"), 'service worker should cache settings.js');
assert(sw.includes("'/js/pages/portal/loaders/subscription.js'"), 'service worker should cache the subscription loader');
assert(
    /if \(e\.request\.mode === 'navigate'\)\s*\{\s*return;\s*\}/.test(sw),
    'service worker should not synthesize 503 responses for navigations'
);

console.log('settings subscription loader smoke: all pass');
