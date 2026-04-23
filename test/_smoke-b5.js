// Smoke test for events_003 B5 pinned marker (§8.8)
const fs = require('fs');
const path = 'd:/SMOJO/Online/Buisness/JusticeMcNealLLC_02';
const window = {};
global.window = window;
// Minimal document stub for EventsHelpers.escapeHtml
global.document = {
    createElement: () => {
        let t = '';
        return {
            set textContent(v) { t = String(v); },
            get textContent() { return t; },
            get innerHTML() {
                const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
                return t.replace(/[&<>"']/g, c => map[c]);
            }
        };
    }
};
[
    'js/components/events/constants.js',
    'js/components/events/helpers.js',
    'js/components/events/pills.js',
    'js/components/events/card.js',
].forEach(f => { eval(fs.readFileSync(path + '/' + f, 'utf8')); });

const EventsCard = window.EventsCard;
const now = new Date();
const inH = h => new Date(now.getTime() + h * 3600_000).toISOString();

const pinned    = { id: '1', slug: 'x', title: 'Annual LLC', event_type: 'llc',    is_pinned: true,  start_date: inH(72), status: 'open' };
const notPin    = { id: '2', slug: 'y', title: 'Cookout',    event_type: 'llc',    is_pinned: false, start_date: inH(72), status: 'open' };
const memberPin = { id: '3', slug: 'z', title: 'Bday',       event_type: 'member', is_pinned: true,  start_date: inH(72), status: 'open' };

const h1 = EventsCard.render(pinned, {});
const h2 = EventsCard.render(notPin, {});
const h3 = EventsCard.render(memberPin, {});

const results = {
    pinned_llc_has_marker:       h1.includes('📌'),
    pinned_llc_has_css_class:    h1.includes('evt-date-pin'),
    not_pinned_has_no_marker:    !h2.includes('📌'),
    pinned_member_has_no_marker: !h3.includes('📌'),
    skeleton_nonempty:           typeof EventsCard.skeleton === 'function' && EventsCard.skeleton().length > 0,
};

console.log(JSON.stringify(results, null, 2));
const allPass = Object.values(results).every(Boolean);
console.log(allPass ? '\n✅ ALL PASS' : '\n❌ FAIL');
process.exit(allPass ? 0 : 1);
