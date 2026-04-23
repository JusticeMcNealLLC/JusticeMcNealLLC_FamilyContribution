// Smoke for E10 — In-header notification bell (vlift only) with red unread dot.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = read('css/pages/portal-events.css');
const sw   = read('sw.js');

const checks = {
    // JS — renderer + observer
    js_init_fn: /function _initHeaderBell\(\)/.test(list),
    js_observer_var: /let _evtBellObserver\s*=\s*null;/.test(list),
    js_vlift_gate: /_initHeaderBell[\s\S]{0,200}body\.classList\.contains\('evt-vlift'\)/.test(list),
    js_global_btn_lookup: /getElementById\('notifBtn'\)/.test(list),
    js_idempotent_guard: /getElementById\('evtHeaderBell'\)\) return/.test(list),
    js_bell_id: /bell\.id\s*=\s*'evtHeaderBell'/.test(list),
    js_bell_class: /evt-header-bell relative/.test(list),
    js_dot_id: /id="evtHeaderBellDot"/.test(list),
    js_click_forwards: /target\.click\(\)/.test(list),
    js_inserted_before_create: /wrap\.insertBefore\(bell, createBtn\)/.test(list),
    js_wire_badge_fn: /function _wireHeaderBellBadge\(\)/.test(list),
    js_badge_lookup: /getElementById\('notifBadge'\)/.test(list),
    js_dot_visibility_sync: /dot\.classList\.toggle\('hidden', !visible\)/.test(list),
    js_uses_mutation_observer: /new MutationObserver\(sync\)/.test(list),
    js_observer_filters: /attributeFilter:\s*\[\s*'style',\s*'class'\s*\]/.test(list),
    js_called_in_onready: /_applyRestoredUi\(\);[\s\S]{0,400}_initHeaderBell\(\);/.test(list),
    js_retried_after_tick: /setTimeout\(_initHeaderBell, 300\)/.test(list)
        && /setTimeout\(_initHeaderBell, 1200\)/.test(list),

    // CSS — bell + dot styles
    css_marker: /E10 — In-header notification bell/.test(css),
    css_hidden_when_off: /body:not\(\.evt-vlift\) #evtHeaderBell \{ display: none !important/.test(css),
    css_bell_class: /\.evt-header-bell \{[\s\S]*background: rgba\(255, 255, 255, .12\)/.test(css),
    css_dot_class: /\.evt-header-bell-dot \{[\s\S]*background: #ef4444/.test(css),
    css_dot_position: /\.evt-header-bell-dot \{[\s\S]*position: absolute/.test(css),
    css_dot_radius: /\.evt-header-bell-dot \{[\s\S]*border-radius: 999px/.test(css),
    css_condensed_shrinks: /evt-header--condensed \.evt-header-bell \{[\s\S]*width: 36px/.test(css),
    css_reduced_motion: /prefers-reduced-motion[\s\S]*\.evt-header-bell \{ transition: none/.test(css),

    // SW
    sw_v63: /jm-portal-v63/.test(sw),
    sw_no_v62: !sw.includes("'jm-portal-v62'"),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`E10 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) {
    console.log('FAILED:', failed.join(', '));
    process.exit(1);
}
console.log('✅ ALL PASS');
