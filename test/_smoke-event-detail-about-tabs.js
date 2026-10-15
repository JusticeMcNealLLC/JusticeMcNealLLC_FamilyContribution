// Smoke — event detail About tabs and creator lodging tab support
// Run: node test/_smoke-event-detail-about-tabs.js
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✕ ${msg}`); failed++; }

console.log('\n── Event detail About tabs ─────────────────────────────────────────────');
const helperSource = read('js/components/events/about-tabs.js');
const markdownHelpers = read('js/components/events/helpers.js');
const css = read('css/pages/portal/events/detail.css');
const postRender = read('js/portal/events/detail/post-render.js');

css.includes('flex-wrap:wrap') && css.includes('overflow:visible')
    ? pass('About choices wrap instead of hiding later tabs')
    : fail('About choices still depend on a horizontally hidden tab strip');

postRender.includes('EventsAboutTabs.wireAboutTabs')
    ? pass('portal detail wires About tab interactions after render')
    : fail('portal detail does not wire About tab interactions');

console.log('\n── Direct interaction regression ───────────────────────────────────────');
const buttons = ['overview', 'itinerary', 'covered', 'bring', 'lodging'].map((id, index) => ({
    id,
    attrs: { 'data-about-tab': id },
    classList: {
        toggle(name, on) { this[name] = on; },
    },
    setAttribute(name, value) { this.attrs[name] = value; },
    getAttribute(name) { return this.attrs[name] || null; },
    closest() { return this; },
    scrollIntoView() {},
    index,
}));
const panels = buttons.map((button, index) => ({
    attrs: { 'data-about-panel': button.id },
    classList: {
        toggle(name, on) { this[name] = on; },
    },
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; },
    getAttribute(name) { return this.attrs[name] || null; },
    index,
}));
const wrap = {
    dataset: {},
    listener: null,
    matches(selector) { return selector === '[data-about-tabs-root]'; },
    querySelectorAll(selector) {
        if (selector === '[data-about-tab]') return buttons;
        if (selector === '[data-about-panel]') return panels;
        if (selector === '[data-about-tabs-root]') return [];
        return [];
    },
    addEventListener(type, handler) {
        if (type === 'click') this.listener = handler;
    },
    contains(node) { return buttons.includes(node); },
};

const context = {
    window: {
        EventsHelpers: {
            escapeHtml(value) { return String(value ?? ''); },
            miniMarkdown(value) { return String(value || ''); },
        },
    },
    document: {},
};
context.globalThis = context;
vm.runInNewContext(helperSource, context, { filename: 'about-tabs.js' });
context.EventsAboutTabs.wireAboutTabs(wrap);
if (typeof wrap.listener !== 'function') {
    fail('directly supplied About root is wired');
} else {
    wrap.listener({ target: buttons[4] });
    const active = panels.find((panel) => panel.getAttribute('data-about-panel') === 'lodging');
    const hidden = panels.filter((panel) => panel !== active).every((panel) => panel.attrs.hidden === '');
    !active.attrs.hidden && hidden
        ? pass('later About choices activate their matching panels')
        : fail('later About choices do not activate their matching panels');
}

console.log('\n── Creator portal lodging tab ─────────────────────────────────────────');
const aboutStep = read('js/portal/events/create/step-about.js');
const submit = read('js/portal/events/create/submit.js');
aboutStep.includes('ecAboutAddLodging')
    && aboutStep.includes("_addTab('Lodging & travel')")
    ? pass('creator can add a Lodging & travel tab from the About step')
    : fail('creator About step has no Lodging & travel shortcut');
submit.includes('about_tabs: aboutTabs')
    ? pass('creator submission persists custom About tabs')
    : fail('creator submission does not persist custom About tabs');

console.log('\n── Colorado lodging copy ──────────────────────────────────────────────');
const sql = read('scripts/fill-colorado-event-content-2028.sql');
markdownHelpers.includes('https?:\\/\\/')
    && markdownHelpers.includes("target=\"_blank\"")
    ? pass('About markdown preserves safe external hyperlinks')
    : fail('About markdown does not preserve external hyperlinks');
sql.includes('[three different Airbnbs](https://www.airbnb.com/)')
    && sql.includes('pricing and availability are not known yet')
    && sql.includes('send a message to everyone who RSVPs')
    ? pass('Colorado seed contains the requested lodging update')
    : fail('Colorado seed is missing the requested lodging update');

console.log(failed ? `\n✕ ${failed} check(s) failed\n` : '\n✓ event detail About smoke: ALL PASS\n');
process.exit(failed ? 1 : 0);
