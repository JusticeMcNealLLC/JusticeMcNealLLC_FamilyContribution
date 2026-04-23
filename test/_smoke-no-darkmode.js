// Anti-regression smoke: dark mode (events_004 §D4) was removed by user request.
// This guard fails if any dark-mode artifact comes back.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('portal/events.html');
const list = read('js/portal/events/list.js');
const css  = require('./_events-css');
const sw   = read('sw.js');

const checks = {
    // HTML — toggle button + theme icon spans must NOT exist
    no_html_theme_btn: !/id="evtThemeToggle"/.test(html),
    no_html_theme_mode_attr: !/data-theme-mode/.test(html),
    no_html_theme_icons: !/evt-theme-icon/.test(html),

    // JS — theme module fully removed
    no_js_init_theme: !/_initTheme\b/.test(list),
    no_js_apply_theme: !/_applyTheme\b/.test(list),
    no_js_theme_key: !/THEME_KEY|'evt_theme'/.test(list),
    no_js_theme_modes_const: !/THEME_MODES\s*=/.test(list),
    no_js_set_theme_api: !/evtSetTheme|evtGetTheme/.test(list),
    no_js_d4_comment: !/D4 — Dark mode/.test(list),

    // CSS — every dark-mode rule and the D4 banner removed
    no_css_data_theme_dark: !/\[data-theme="dark"\]/.test(css),
    no_css_d4_banner: !/D4 — Dark mode/.test(css),
    no_css_prefers_dark: !/prefers-color-scheme:\s*dark/.test(css),

    // SW — bumped past v67 (the version that shipped E12)
    sw_bumped_past_v67: /jm-portal-v(6[8-9]|[7-9]\d|\d{3,})/.test(sw),
    sw_no_v67_literal: !sw.includes("'jm-portal-v67'"),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`Dark-mode-removed smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) {
    console.log('FAILED:', failed.join(', '));
    process.exit(1);
}
console.log('✅ ALL PASS — dark mode is fully removed');
