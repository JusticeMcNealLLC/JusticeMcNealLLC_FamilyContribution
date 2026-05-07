// F19 smoke - hero moved under chips, datechip inline with meta, no side scrim
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');
const css = require('./_events-css');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const checks = [];
const ok = (name, cond) => checks.push({ name, pass: !!cond });

// (1) DOM: hero must appear AFTER the type chips
const idxChips = html.indexOf('id="evtTypeChips"');
const idxHero = html.indexOf('id="evtHero"', idxChips); // first match AFTER chips
ok('html_hero_after_chips', idxChips > 0 && idxHero > idxChips);

// hero placeholder removed from above (only ONE evtHero in document now)
const heroMatches = (html.match(/id="evtHero"/g) || []).length;
ok('html_single_hero_mount', heroMatches === 1);

// (2) F19 CSS markers
ok('css_f19_block', /F19 -- Hero refinements/.test(css));
ok('css_datechip_bottom', /\.evt-hero-datechip\s*{[^}]*top:\s*auto[^}]*bottom:\s*1\.25rem/m.test(css));
ok('css_side_no_scrim', /\.evt-hero-side\s*{[^}]*background:\s*none\s*!important/m.test(css));
ok('css_side_desc_transparent', /\.evt-hero-side__desc\s*{[^}]*background:\s*transparent\s*!important/m.test(css));
ok('css_portal_mobile_grid_single_column', /#eventsDetailView\.portal-event-detail-v2 \.portal-event-grid\s*{[^}]*display:\s*block[^}]*grid-template-columns:\s*minmax\(0,1fr\)/m.test(css));
ok('css_portal_mobile_rail_hidden', /#eventsDetailView\.portal-event-detail-v2 \.portal-event-rail\s*{[^}]*display:\s*none/m.test(css));
ok('css_phone_featured_hero_block', /F22 \u2014 Phone featured hero compaction/.test(css));
ok('css_phone_featured_hero_taller', /@media \(max-width:\s*639px\)[\s\S]*\.evt-hero-vlift > a\s*{[^}]*height:\s*264px\s*!important/m.test(css));
ok('css_phone_featured_hero_cta_full_width', /@media \(max-width:\s*639px\)[\s\S]*\.evt-hero-cta\s*{[^}]*width:\s*calc\(100% - 32px\)/m.test(css));

// (3) SW bumped
const m = sw.match(/jm-portal-v(\d+)/);
ok('sw_v87_or_higher', m && parseInt(m[1], 10) >= 87);

const pass = checks.filter(c => c.pass).length;
const total = checks.length;
checks.forEach(c => console.log((c.pass ? '  ok ' : '  FAIL ') + c.name));
console.log(`\nF19 smoke: ${pass}/${total} ` + (pass === total ? 'pass ALL PASS' : 'FAIL'));
process.exit(pass === total ? 0 : 1);
