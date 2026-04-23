// Smoke for E12 — Hero heart favorite (vlift only).
// Maps to RSVP status='maybe' (enum: going|maybe|not_going — no 'interested').
// Reuses evtHandleRsvp toggle behavior (no new flow / no schema change).
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = read('css/pages/portal-events.css');
const sw   = read('sw.js');
const mig  = read('supabase/migrations/063_events_tables.sql');

const checks = {
    // Schema invariant — confirms enum we mapped to is still correct
    schema_enum_intact: /status\s+TEXT DEFAULT 'going' CHECK \(status IN \('going','maybe','not_going'\)\)/.test(mig),
    schema_no_interested: !/'interested'/.test(mig),

    // JS — heart state derivation
    js_isFav_from_maybe: /const isFav = !!\(rsvp && rsvp\.status === 'maybe'\)/.test(list),
    js_filled_path: /<path d="M12 21s-7-4\.35-9\.5-8\.5C\.8 9\.6 2\.4 6 6 6c2 0 3\.4 1 4 2 \.6-1 2-2 4-2 3\.6 0 5\.2 3\.6 3\.5 6\.5C19 16\.65 12 21 12 21z" fill="currentColor"\/>/.test(list),
    js_outline_path: /<path stroke="currentColor" stroke-width="2"[^>]*fill="none"[^>]*d="M12 21s-7-4\.35/.test(list),
    js_aria_pressed: /aria-pressed="' \+ \(isFav \? 'true' : 'false'\)/.test(list),
    js_aria_label_toggle: /\(isFav \? 'Remove from interested' : 'Mark as interested'\)/.test(list),
    js_button_attr: /data-evt-hero-heart="' \+ esc\(event\.id\) \+ '"/.test(list),
    js_class_toggle: /heartCls = 'evt-hero-heart' \+ \(isFav \? ' evt-hero-heart--on' : ''\)/.test(list),

    // JS — placement: heart is FIRST in top-right cluster (before countP + stateP)
    js_inserted_before_pills: /\+ heartBtn \+ countP \+ stateP \+/.test(list),

    // JS — click wiring reuses evtHandleRsvp with 'maybe' (toggle)
    js_listener: /heroEl\.querySelector\('button\[data-evt-hero-heart\]'\)/.test(list),
    js_calls_handler_with_maybe: /heart\.addEventListener\('click', async \(e\) => \{[\s\S]{0,500}window\.evtHandleRsvp\(event\.id, 'maybe'\)/.test(list),
    js_disabled_during_await: /heart\.disabled = true;[\s\S]{0,400}heart\.disabled = false;/.test(list),
    js_prevents_anchor: /heart\.addEventListener[\s\S]{0,200}e\.preventDefault\(\);\s*e\.stopPropagation\(\);/.test(list),

    // CSS
    css_heart_pill: /body\.evt-vlift \.evt-hero-heart \{[\s\S]{0,400}width: 36px;[\s\S]{0,200}border-radius: 999px;/.test(css),
    css_heart_glass: /body\.evt-vlift \.evt-hero-heart \{[\s\S]{0,500}backdrop-filter: blur\(6px\)/.test(css),
    css_heart_active_state: /body\.evt-vlift \.evt-hero-heart--on \{[\s\S]{0,200}color: #f43f5e;/.test(css),
    css_heart_disabled: /body\.evt-vlift \.evt-hero-heart:disabled \{[\s\S]{0,100}cursor: progress;/.test(css),
    css_reduced_motion: /@media \(prefers-reduced-motion: reduce\) \{[\s\S]{0,300}body\.evt-vlift \.evt-hero-heart \{ transition: none;/.test(css),

    // SW
    sw_v67: /jm-portal-v67/.test(sw),
    sw_no_v66: !sw.includes("'jm-portal-v66'"),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`E12 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) {
    console.log('FAILED:', failed.join(', '));
    process.exit(1);
}
console.log('✅ ALL PASS');
