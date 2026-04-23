// Smoke for E7 — Hero "Interested" / Going avatar cluster (vlift only).
// Verifies: helper exists, reuses window.evtAttendees (no new query),
// injects above date/time row in hero meta, click navigates to detail,
// CSS rules present, SW bumped, E10 mount-observer fallback present.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const list = read('js/portal/events/list.js');
const css  = read('css/pages/portal-events.css');
const sw   = read('sw.js');

const checks = {
    // JS — helper
    js_helper_fn: /function _attendeeCluster\(eventId\) \{/.test(list),
    js_uses_existing_attendees: /window\.evtAttendees && window\.evtAttendees\[eventId\]/.test(list),
    js_no_new_query: !/from\(['"]event_rsvps['"]\)[\s\S]{0,200}_attendeeCluster/.test(list),
    js_caps_at_5: /list\.slice\(0, 5\)/.test(list),
    js_renders_image_when_pic: /<img src="' \+ esc\(pic\)/.test(list),
    js_initial_fallback: /evt-hero-cluster-init/.test(list),
    js_overlap_stack: /' -ml-2'/.test(list),
    js_label_5plus: /list\.length >= 5 \? '5\+' : String\(list\.length\)/.test(list),
    js_button_attr: /data-evt-hero-going="' \+ esc\(eventId\) \+ '"/.test(list),

    // JS — injection point
    js_injected_above_meta: /_attendeeCluster\(event\.id\) \+\s*\n\s*\/\/ Date\/time row ABOVE the title/.test(list),

    // JS — click wiring
    js_cluster_listener: /heroEl\.querySelector\('button\[data-evt-hero-going\]'\)/.test(list),
    js_cluster_navigates: /cluster\.addEventListener\('click'[\s\S]{0,400}window\.evtNavigateToEvent\(event\)/.test(list),
    js_cluster_prevents: /cluster\.addEventListener[\s\S]{0,200}e\.preventDefault\(\);\s*e\.stopPropagation\(\);/.test(list),

    // E10 mount-observer fallback (shipped same turn)
    js_bell_mount_observer: /_bellMountObs = new MutationObserver/.test(list),
    js_bell_observer_disconnect: /_bellMountObs\.disconnect/.test(list),
    js_bell_observer_safety: /setTimeout\(\(\) => \{ try \{ _bellMountObs\.disconnect/.test(list),

    // CSS
    css_cluster_pill: /body\.evt-vlift \.evt-hero-cluster \{[\s\S]{0,500}border-radius: 999px;/.test(css),
    css_cluster_glass: /body\.evt-vlift \.evt-hero-cluster \{[\s\S]{0,600}backdrop-filter: blur\(6px\)/.test(css),
    css_bub_size: /body\.evt-vlift \.evt-hero-cluster-bub \{[\s\S]{0,400}width: 26px;[\s\S]{0,200}border: 2px solid #ffffff/.test(css),
    css_bub_img: /body\.evt-vlift \.evt-hero-cluster-bub img \{[\s\S]{0,200}object-fit: cover/.test(css),
    css_label: /body\.evt-vlift \.evt-hero-cluster-label \{[\s\S]{0,200}white-space: nowrap/.test(css),
    css_reduced_motion: /@media \(prefers-reduced-motion: reduce\) \{[\s\S]{0,300}body\.evt-vlift \.evt-hero-cluster \{ transition: none;/.test(css),

    // SW
    sw_v66_or_higher: /jm-portal-v(6[6-9]|[7-9]\d|\d{3,})/.test(sw),
    sw_no_v65: !sw.includes("'jm-portal-v65'"),
};

const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
const passed = Object.keys(checks).length - failed.length;
console.log(`E7 smoke: ${passed}/${Object.keys(checks).length} pass`);
if (failed.length) {
    console.log('FAILED:', failed.join(', '));
    process.exit(1);
}
console.log('✅ ALL PASS');
