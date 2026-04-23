// Smoke for E11 — per-bucket "See all" / "Show less" truncation (vlift only).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = require('./_events-css');
const sw   = read('sw.js');

const checks = {
    // State + threshold
    js_state_var: /let _expandedBucket\s*=\s*null;/.test(list),
    js_threshold_const: /const E_BUCKET_TRUNCATE\s*=\s*6;/.test(list),

    // Bucket renderer truncation logic
    js_renderbucket_uses_threshold: /events\.length > E_BUCKET_TRUNCATE/.test(list)
        || /total > E_BUCKET_TRUNCATE/.test(list),
    js_renderbucket_isexpanded: /isExpanded\s*=\s*\(_expandedBucket === slug\)/.test(list),
    js_renderbucket_truncated: /truncated\s*=\s*useVlift && total > E_BUCKET_TRUNCATE && !isExpanded/.test(list),
    js_renderbucket_slice: /events\.slice\(0,\s*E_BUCKET_TRUNCATE\)/.test(list),
    js_seeall_link_html: /data-evt-bucket-toggle="' \+ slug \+/.test(list),
    js_seeall_label_count: /'See all \(' \+ total \+ '\) →/.test(list),
    js_show_less_label: /Show less ↑/.test(list),
    js_seeall_only_when_vlift: /useVlift && total > E_BUCKET_TRUNCATE/.test(list),

    // Wire toggle click
    js_wire_toggle: /querySelectorAll\('button\[data-evt-bucket-toggle\]'\)\.forEach/.test(list),
    js_toggle_flips_state: /_expandedBucket = \(_expandedBucket === slug\) \? null : slug/.test(list),
    js_toggle_rerenders: /_expandedBucket =[^;]+;\s*renderEvents\(\);/.test(list),

    // Filter only the expanded bucket
    js_render_filters_expanded: /\.filter\(g => \{[\s\S]{0,400}_expandedBucket[\s\S]{0,200}return s === _expandedBucket;[\s\S]{0,40}\}\)/.test(list),
    js_self_heal: /self-heal[\s\S]{0,300}_expandedBucket = null/.test(list),

    // Reset on lifecycle tab change
    js_reset_on_tab_change: /window\.evtActiveTab = btn\.dataset\.filter;\s*\n\s*_expandedBucket = null;/.test(list),

    // CSS
    css_marker: /E11 — Per-bucket "See all" \/ "Show less" toggle/.test(css),
    css_seeall_class: /\.evt-bucket-seeall \{/.test(css),
    css_head_class: /\.evt-bucket-head \{/.test(css),
    css_hover_tint: /\.evt-bucket-seeall:hover \{ background: rgba\(99, 102, 241, .08\)/.test(css),
    css_reduced_motion: /prefers-reduced-motion[\s\S]*\.evt-bucket-seeall \{ transition: none/.test(css),

    // SW (E11 shipped at v62; bumps past are fine)
    sw_v62: /jm-portal-v(6[2-9]|[7-9]\d|\d{3,})/.test(sw),
    sw_no_v61: !sw.includes("'jm-portal-v61'"),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`E11 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) {
    console.log('FAILED:', failed.join(', '));
    process.exit(1);
}
console.log('✅ ALL PASS');
