// Smoke for F5 — Icon chips (vlift): emoji hidden, SVG icons shown for LLC/Member/Competition.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('portal/events.html');
const css  = require('./_events-css');
const sw   = read('sw.js');

const checks = {
    html_llc_icon:        /data-type="llc"[\s\S]{0,400}data-f5-emoji[\s\S]{0,100}data-f5-icon/.test(html),
    html_member_icon:     /data-type="member"[\s\S]{0,400}data-f5-emoji[\s\S]{0,100}data-f5-icon/.test(html),
    html_competition_icon:/data-type="competition"[\s\S]{0,400}data-f5-emoji[\s\S]{0,100}data-f5-icon/.test(html),

    css_hide_emoji:       /body\.evt-vlift #evtTypeChips \[data-f5-emoji\] \{ display: none !important; \}/.test(css),
    css_show_icon:        /body\.evt-vlift #evtTypeChips \[data-f5-icon\][\s\S]{0,100}display: inline-block !important;/.test(css),

    sw_v73_or_higher:     /jm-portal-v(7[3-9]|[8-9]\d|\d{3,})/.test(sw),
};

let pass = 0, fail = 0;
for (const [k, v] of Object.entries(checks)) {
    console.log(`${v ? '✓' : '✗'} ${k}`);
    v ? pass++ : fail++;
}
console.log(`\nF5 smoke: ${pass}/${pass + fail} pass`);
console.log(fail === 0 ? '✅ ALL PASS' : `❌ ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
