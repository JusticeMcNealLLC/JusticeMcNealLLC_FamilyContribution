// Smoke for F2 — 2-col desktop shell (vlift only; >=lg).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('portal/events.html');
const css  = read('css/pages/portal-events.css');
const sw   = read('sw.js');

const checks = {
    html_shell_wrap:    /<div id="evtShell"[^>]*class="[^"]*max-w-5xl[^"]*"/.test(html),
    html_shell_main:    /<div class="evt-shell-main">/.test(html),
    html_right_rail:    /<aside id="evtRightRail" class="evt-shell-rail hidden"[^>]*aria-label="Events sidebar"/.test(html),
    html_rail_slots:    /evtRailSlotCalendar[\s\S]{0,200}evtRailSlotRsvps[\s\S]{0,200}evtRailSlotStats/.test(html),

    css_wider_vlift:    /body\.evt-vlift #evtShell \{ max-width: 80rem; \}/.test(css),
    css_grid_at_lg:     /@media \(min-width: 1024px\) \{[\s\S]{0,400}body\.evt-vlift #evtShell \{[\s\S]{0,200}display: grid;[\s\S]{0,200}grid-template-columns: minmax\(0, 1fr\) 320px/.test(css),
    css_rail_sticky:    /body\.evt-vlift #evtRightRail \{[\s\S]{0,400}position: sticky;[\s\S]{0,200}top: calc\(var\(--evt-header-h/.test(css),
    css_rail_shown_lg:  /body\.evt-vlift #evtRightRail \{[\s\S]{0,300}display: flex !important;/.test(css),
    css_header_widen:   /body\.evt-vlift #evtPageHeader > div \{ max-width: 80rem !important; \}/.test(css),

    sw_v70_or_higher:   /jm-portal-v(7[0-9]|[8-9]\d|\d{3,})/.test(sw),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`F2 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) { console.log('FAILED:', failed.join(', ')); process.exit(1); }
console.log('✅ ALL PASS');
