// Smoke test for events_003 §Phase E (initial slice: E1 + E4 + E9).
// Flag: ?vlift=1 / localStorage('evt_vlift'='1') -> body.evt-vlift.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = require('./_events-css');
const sw   = read('sw.js');

const checks = {
    // JS — flag plumbing
    js_vlift_key: /VLIFT_KEY = 'evt_vlift'/.test(list),
    js_bucket_emoji_table: /E_BUCKET_EMOJI = \{/.test(list),
    js_bucket_emoji_today: /'today':\s*'🔥'/.test(list),
    js_bucket_emoji_week: /'this week':\s*'✨'/.test(list),
    js_bucket_emoji_results_for: /\^results for/i.test(list),
    js_read_vlift_fn: /function _readVlift\(\)/.test(list),
    js_init_vlift_fn: /function _initVlift\(\)/.test(list),
    js_query_param_check: /searchParams\.get\('vlift'\)/.test(list),
    js_localstorage_persist: /localStorage\.setItem\(VLIFT_KEY, '1'\)/.test(list),
    js_body_class_toggle: /document\.body\.classList\.toggle\('evt-vlift'/.test(list),
    js_public_set: /window\.evtSetVlift = function/.test(list),
    js_public_get: /window\.evtIsVlift = function/.test(list),
    js_init_in_onready: /_initVlift\(\);\s*_initSwipeGestures\(\);/.test(list),

    // JS — bucket label integration
    js_render_bucket_uses_vlift: /useVlift = document\.body\.classList\.contains\('evt-vlift'\)/.test(list),
    js_render_bucket_displays_emoji: /useVlift \? _bucketLabelEmoji\(label\) : label/.test(list),

    // CSS — gradient header (E1)
    css_marker: /Phase E — Premium Visual Lift/.test(css),
    css_vlift_header_gradient: /body\.evt-vlift #evtPageHeader \{[\s\S]*linear-gradient\(160deg, #4f46e5 0%, #6d28d9 55%, #4c1d95 100%\)/.test(css),
    css_vlift_header_title_white: /body\.evt-vlift #evtPageHeader #evtHeaderTitle[\s\S]*color: #ffffff/.test(css),
    css_vlift_header_count_dim: /body\.evt-vlift #evtPageHeader #evtHeaderCount[\s\S]*rgba\(255,255,255,\.78\)/.test(css),
    css_vlift_create_btn_translucent: /body\.evt-vlift #evtPageHeader #createEventBtn[\s\S]*rgba\(255,255,255,\.18\)/.test(css),
    css_vlift_header_fade_kf: /@keyframes evtHeaderFade/.test(css),

    // CSS — emoji bucket labels (E4)
    css_vlift_bucket_normalcase: /body\.evt-vlift section\[data-bucket\] > h2[\s\S]*text-transform: none/.test(css),

    // CSS — motion polish (E9)
    css_vlift_chip_press: /body\.evt-vlift \.evt-seg__btn:active[\s\S]*scale\(0\.97\)/.test(css),
    css_vlift_reduced_motion: /prefers-reduced-motion[\s\S]*evt-vlift #evtPageHeader \{ animation: none/.test(css),

    // SW
    sw_bumped_past_v57: /jm-portal-v(5[8-9]|[6-9]\d|\d{3,})/.test(sw),
    sw_no_v57: !sw.includes("'jm-portal-v57'"),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`E1+E4+E9 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) {
    console.log('FAILED:', failed.join(', '));
    process.exit(1);
}
console.log('✅ ALL PASS');
