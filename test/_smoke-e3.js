// Smoke for E3 — inline category chip rail (vlift only).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('portal/events.html');
const list = read('js/portal/events/list.js');
const css  = require('./_events-css');
const sw   = read('sw.js');

const checks = {
    // HTML — chip rail container + 4 chips
    html_chip_rail_present: /id="evtTypeChips"[^>]*role="tablist"/.test(html),
    html_chip_hidden_default: /id="evtTypeChips"[^>]*\bhidden\b/.test(html),
    html_chip_all: /class="evt-type-chip evt-type-chip--active"[^>]*aria-selected="true"[\s\S]{0,80}>All</.test(html)
        || /data-type="all"[\s\S]{0,160}>All</.test(html),
    html_chip_llc: /data-type="llc"[\s\S]{0,160}>\s*<span[^>]*>💼<\/span>\s*LLC/.test(html),
    html_chip_member: /data-type="member"[\s\S]{0,160}>\s*<span[^>]*>👥<\/span>\s*Member/.test(html),
    html_chip_competition: /data-type="competition"[\s\S]{0,160}>\s*<span[^>]*>🏆<\/span>\s*Competition/.test(html),

    // CSS — vlift reveal + dropdown hide + chip styles
    css_e3_marker: /E3 — Inline category chip rail/.test(css),
    css_e3_show_vlift: /body\.evt-vlift #evtTypeChips \{ display: flex; \}/.test(css),
    css_e3_hide_dropdown: /body\.evt-vlift #evtTypeMenuBtn[\s\S]*display: none !important/.test(css),
    css_e3_chip_active_gradient: /\.evt-type-chip--active \{[\s\S]*linear-gradient\(135deg, #6366f1/.test(css),
    css_e3_chip_radius: /\.evt-type-chip \{[\s\S]*border-radius: 999px/.test(css),
    css_e3_chip_height: /\.evt-type-chip \{[\s\S]*height: 36px/.test(css),
    css_e3_reduced_motion: /prefers-reduced-motion[\s\S]*\.evt-type-chip \{ transition: none/.test(css),

    // JS — sync helper + chip click wiring + restored sync
    js_sync_helper: /function _syncTypeChips\(type\)/.test(list),
    js_chip_rail_lookup: /document\.getElementById\('evtTypeChips'\)/.test(list),
    js_chip_click_wires: /chipRail\.querySelectorAll\('\.evt-type-chip'\)\.forEach/.test(list),
    js_chip_mirrors_legacy_menu: /chipRail[\s\S]{0,800}getElementById\('evtTypeMenuBtn'\)/.test(list),
    js_chip_persists: /chipRail[\s\S]{0,2000}_persistState\(\);\s*renderEvents\(\);/.test(list),
    js_restore_calls_sync: /function _applyRestoredUi[\s\S]{0,2000}_syncTypeChips\(_activeType\)/.test(list),
    js_legacy_menu_calls_sync: /closeMenu\(\);[\s\S]{0,200}|_syncTypeChips\(_activeType\);\s*closeMenu/.test(list),
    js_clear_filters_calls_sync: /_syncTypeChips\('all'\);\s*_persistState/.test(list),

    // SW (E3 shipped at v61; bumps past are fine)
    sw_v61: /jm-portal-v(6[1-9]|[7-9]\d|\d{3,})/.test(sw),
    sw_no_v60: !sw.includes("'jm-portal-v60'"),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`E3 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) {
    console.log('FAILED:', failed.join(', '));
    process.exit(1);
}
console.log('✅ ALL PASS');
