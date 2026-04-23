// Smoke for F3 — Underline tabs + Saved tab (vlift only).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('portal/events.html');
const css  = read('css/pages/portal-events.css');
const list = read('js/portal/events/list.js');
const sw   = read('sw.js');

const checks = {
    html_saved_tab:     /<button role="tab" type="button" data-filter="saved" class="evt-seg__btn">Saved<\/button>/.test(html),
    html_tab_order:     /data-filter="upcoming"[\s\S]{0,300}data-filter="past"[\s\S]{0,300}data-filter="going"[\s\S]{0,300}data-filter="saved"/.test(html),

    js_saved_in_state:  /\['upcoming','past','going','saved'\]/.test(list),
    js_saved_lifecycle: /if \(tab === 'saved'\) \{[\s\S]{0,300}r\.status === 'maybe'/.test(list),

    css_underline_strip:/body\.evt-vlift #evtLifecycleSeg \{[\s\S]{0,400}border-bottom: 1px solid #e5e7eb/.test(css),
    css_btn_transparent:/body\.evt-vlift #evtLifecycleSeg \.evt-seg__btn \{[\s\S]{0,600}background: transparent !important;/.test(css),
    css_active_indigo:  /body\.evt-vlift #evtLifecycleSeg \.evt-seg__btn--active \{[\s\S]{0,300}color: #4f46e5[\s\S]{0,100}border-bottom-color: #4f46e5/.test(css),
    css_reduced_motion: /@media \(prefers-reduced-motion: reduce\) \{[\s\S]{0,400}body\.evt-vlift #evtLifecycleSeg \.evt-seg__btn \{ transition: none;/.test(css),

    sw_v71_or_higher:   /jm-portal-v(7[1-9]|[8-9]\d|\d{3,})/.test(sw),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`F3 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) { console.log('FAILED:', failed.join(', ')); process.exit(1); }
console.log('✅ ALL PASS');
