// Smoke for E6 — Festival-grade featured hero (vlift only).
// Verifies: vlift hero markup branch, date/time row above title, bottom dark fade,
// bottom CTA bar wired to existing evtHandleRsvp (no new flows / no schema change),
// LLC-context CTA labels, legacy hero branch preserved, CSS rules present, SW bumped.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = read('css/pages/portal-events.css');
const init = read('js/portal/events/init.js');
const sw   = read('sw.js');

const checks = {
    // JS — vlift hero branch
    js_vlift_branch_gate: /const useVlift = document\.body\.classList\.contains\('evt-vlift'\);\s*\n\s*if \(useVlift\) \{/.test(list),
    js_wrapper_div: /<div class="evt-hero-vlift relative">/.test(list),
    js_fade_overlay: /class="evt-hero-fade absolute inset-x-0 bottom-0 pointer-events-none"/.test(list),
    js_meta_block: /class="evt-hero-meta absolute inset-x-0 bottom-0/.test(list),
    js_date_time_row_above_title: /Date\/time row ABOVE the title[\s\S]{0,800}<h2 class="text-3xl sm:text-4xl/.test(list),
    js_cal_icon: /calIcon = '<svg[^']*<rect x="3" y="5"/.test(list),
    js_clk_icon: /clkIcon = '<svg[^']*<circle cx="12" cy="12" r="9"/.test(list),
    js_pin_icon_conditional: /pinIcon = loc\s*\?\s*'<svg/.test(list),

    // CTA bar
    js_cta_button: /data-evt-hero-cta="' \+ esc\(event\.id\) \+ '"/.test(list),
    js_cta_label_going: /'✓ You\\'re going'/.test(list),
    js_cta_label_competition: /'Buy Raffle Ticket'/.test(list),
    js_cta_label_default: /'RSVP — I\\'m going'/.test(list),
    js_cta_class_going: /'evt-hero-cta evt-hero-cta--going'/.test(list),
    js_cta_wires_handler: /ctaBtn\.addEventListener\('click', async \(e\) => \{[\s\S]{0,400}window\.evtHandleRsvp\(event\.id, 'going'\)/.test(list),
    js_cta_disabled_during_await: /ctaBtn\.disabled = true;[\s\S]{0,600}ctaBtn\.disabled = false;/.test(list),
    js_cta_prevents_anchor: /e\.preventDefault\(\);\s*e\.stopPropagation\(\);/.test(list),

    // Legacy hero branch preserved
    js_legacy_branch: /\} else \{\s*\n\s*heroEl\.innerHTML =\s*\n\s*'<a href="' \+ href \+ '" data-evt-hero=/.test(list),
    js_legacy_aspect: /aspect-\[4\/5\] sm:aspect-\[16\/10\]/.test(list),

    // Hero anchor click handler unchanged (still works for both branches)
    js_anchor_click_handler: /heroEl\.querySelector\('a\[data-evt-hero\]'\)/.test(list),

    // Reuse of existing evtHandleRsvp (locked invariant)
    invariant_handler_exposed: /window\.evtHandleRsvp = evtHandleRsvp/.test(init),

    // CSS
    css_hero_vlift_aspect: /body\.evt-vlift \.evt-hero-vlift > a \{[\s\S]{0,300}aspect-ratio: 4 \/ 5;[\s\S]{0,200}min-height: 62vh;/.test(css),
    css_desktop_aspect: /@media \(min-width: 640px\) \{[\s\S]{0,200}body\.evt-vlift \.evt-hero-vlift > a \{[\s\S]{0,200}aspect-ratio: 16 \/ 10;/.test(css),
    css_fade_gradient: /body\.evt-vlift \.evt-hero-fade \{[\s\S]{0,400}rgba\(0,0,0,\.85\) 100%/.test(css),
    css_meta_zindex: /body\.evt-vlift \.evt-hero-meta \{[\s\S]{0,100}z-index: 2;/.test(css),
    css_cta_pill: /body\.evt-vlift \.evt-hero-cta \{[\s\S]{0,500}height: 56px;[\s\S]{0,400}border-radius: 18px;/.test(css),
    css_cta_going_variant: /body\.evt-vlift \.evt-hero-cta--going \{[\s\S]{0,200}#10b981/.test(css),
    css_cta_disabled: /body\.evt-vlift \.evt-hero-cta:disabled \{[\s\S]{0,100}cursor: progress;/.test(css),
    css_reduced_motion: /@media \(prefers-reduced-motion: reduce\) \{[\s\S]{0,300}body\.evt-vlift \.evt-hero-cta \{ transition: none;/.test(css),

    // SW
    sw_v65_or_higher: /jm-portal-v(6[5-9]|[7-9]\d|\d{3,})/.test(sw),
    sw_no_v64: !sw.includes("'jm-portal-v64'"),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`E6 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) {
    console.log('FAILED:', failed.join(', '));
    process.exit(1);
}
console.log('✅ ALL PASS');
