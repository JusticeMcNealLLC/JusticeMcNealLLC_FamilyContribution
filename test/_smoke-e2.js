// Smoke for E2 (mobile hero-visible search pill) + vlift default-on flip.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = read('css/pages/portal-events.css');
const sw   = read('sw.js');

const checks = {
    // Default-on flip
    js_default_on_comment: /Default ON\./i.test(list),
    js_opt_out_zero_query: /q === '0'/.test(list),
    js_opt_out_persists_zero: /localStorage\.setItem\(VLIFT_KEY, '0'\)/.test(list),
    js_returns_true_default: /return true;\s*\/\/ default ON/.test(list),
    js_set_writes_zero_for_off: /localStorage\.setItem\(VLIFT_KEY, v \? '1' : '0'\)/.test(list),

    // Functional: simulate _readVlift defaults
    func_default_true: (() => {
        // crude functional: check no removeItem opt-out path remains
        return !/localStorage\.removeItem\(VLIFT_KEY\)/.test(list);
    })(),

    // E2 CSS
    css_marker_e2: /Phase E2 — Mobile hero-visible search pill/.test(css),
    css_e2_hide_toggle_mobile: /@media \(max-width: 639px\)[\s\S]*body\.evt-vlift #evtSearchToggle \{ display: none/.test(css),
    css_e2_show_expand: /body\.evt-vlift #evtSearchExpand \{[\s\S]*display: block !important/.test(css),
    css_e2_pill_height: /body\.evt-vlift #evtSearchExpand input \{[\s\S]*height: 44px/.test(css),
    css_e2_pill_radius: /border-radius: 14px/.test(css),

    // SW
    sw_bumped_past_v58: /jm-portal-v(59|[6-9]\d|\d{3,})/.test(sw),
    sw_no_v58: !sw.includes("'jm-portal-v58'"),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`E2 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) {
    console.log('FAILED:', failed.join(', '));
    process.exit(1);
}
console.log('✅ ALL PASS');
