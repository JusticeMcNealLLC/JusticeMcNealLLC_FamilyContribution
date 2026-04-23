// Smoke for F1 — Greeting block (vlift only).
// "Welcome back, {name} 👋" above #evtHeaderTitle + subtitle below.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('portal/events.html');
const css  = require('./_events-css');
const list = read('js/portal/events/list.js');
const sw   = read('sw.js');

const checks = {
    html_greeting_hello:   /<p id="evtGreetingHello"[^>]*class="[^"]*hidden[^"]*evt-greeting-hello[^"]*"[^>]*>Welcome back, <span data-greeting-name>there<\/span>/.test(html),
    html_greeting_sub:     /<p id="evtGreetingSub"[^>]*class="[^"]*hidden[^"]*evt-greeting-sub[^"]*"[^>]*>Discover and join events in your community\./.test(html),
    html_title_after_hello:/evtGreetingHello[\s\S]{0,400}<h1 id="evtHeaderTitle"/.test(html),
    html_sub_after_title:  /<h1 id="evtHeaderTitle"[\s\S]{0,400}evtGreetingSub/.test(html),

    css_hello_shown_vlift: /body\.evt-vlift #evtGreetingHello \{ display: block !important; \}/.test(css),
    css_count_hidden_vlift:/body\.evt-vlift #evtHeaderCount[\s\S]{0,40}display: none !important;/.test(css),
    css_sub_shown_sm_up:   /@media \(min-width: 640px\) \{[\s\S]{0,200}body\.evt-vlift #evtGreetingSub \{ display: block !important;/.test(css),

    js_initGreeting_fn:    /function _initGreeting\(\) \{/.test(list),
    js_init_in_onready:    /_initGreeting\(\);/.test(list),
    js_reads_navname:      /document\.getElementById\('navName'\)/.test(list),

    sw_v69_or_higher: /jm-portal-v(69|[7-9]\d|\d{3,})/.test(sw),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`F1 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) { console.log('FAILED:', failed.join(', ')); process.exit(1); }
console.log('✅ ALL PASS');
