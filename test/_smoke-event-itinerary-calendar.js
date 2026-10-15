'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function must(rel, needle, label) {
    const source = read(rel);
    if (!source.includes(needle)) throw new Error(`${label}: missing ${needle}`);
}

must('js/components/events/itinerary.js', 'normalizeConfig', 'shared itinerary helper');
must('js/components/events/itinerary.js', 'calendarHtml', 'shared itinerary helper');
must('js/components/events/itinerary.js', 'syncDaysToRange', 'shared itinerary helper');
must('js/components/events/itinerary.js', 'activities', 'same-day activity model');
must('js/components/events/about-tabs.js', 'EventsItinerary.calendarHtml', 'About tab calendar integration');
must('js/portal/events/main.js', "import '../../components/events/itinerary.js'", 'portal shared import');
must('js/events/index.js', 'itinerary: event.itinerary', 'public event itinerary pass-through');
must('js/portal/events/detail.js', 'itinerary: event.itinerary', 'portal event itinerary pass-through');
must('js/portal/events/create/step-itinerary.js', 'data-itinerary-activity', 'creator same-day activity editor');
must('js/portal/events/main.js', "import './create/step-itinerary.js'", 'creator step import');
must('js/portal/events/create/sheet.js', 'itinerary:', 'creator state itinerary field');
must('js/portal/events/create/submit.js', '            itinerary,', 'creator submit itinerary field');
must('supabase/migrations/20261015010000_event_itinerary.sql', 'ADD COLUMN IF NOT EXISTS itinerary', 'itinerary migration');

const colorado = read('scripts/fill-colorado-event-content-2028.sql');
[
    ['Colorado itinerary column', 'itinerary = $itinerary$'],
    ['arrival rest day', 'Arrival & rest day'],
    ['snowboarding activity', 'Snowboarding'],
    ['ice skating activity', 'Ice skating'],
    ['snow tubing activity', 'Snow tubing'],
    ['departure rest day', 'Departure & rest day'],
].forEach(([label, needle]) => must('scripts/fill-colorado-event-content-2028.sql', needle, label));

const amenity = read('scripts/prep-colorado-dry-run-2028.sql');
[
    '"label": "Snowboarding"',
    '"label": "Snow tubing"',
    '"label": "Ice skating"',
    '"label": "Group dinner night"',
].forEach((needle) => must('scripts/prep-colorado-dry-run-2028.sql', needle, 'Colorado amenity option'));

const runtime = {};
runtime.window = runtime;
vm.runInNewContext(read('js/components/events/itinerary.js'), runtime);
const Itinerary = runtime.EventsItinerary;
const range = Itinerary.dateKeysForRange(
    '2027-12-14T05:00:00.000Z',
    '2027-12-19T04:59:59.000Z',
    'America/New_York',
);
if (range.join(',') !== '2027-12-14,2027-12-15,2027-12-16,2027-12-17,2027-12-18') {
    throw new Error(`Colorado range should be five local dates, got ${range.join(',')}`);
}
const config = Itinerary.syncDaysToRange({
    enabled: true,
    days: [{
        id: 'day-3',
        date: '2027-12-16',
        title: 'Mountain + ice skating',
        activities: [
            { id: 'a1', title: 'Snowboarding', details: '' },
            { id: 'a2', title: 'Ice skating', details: '<unsafe>' },
        ],
    }],
}, '2027-12-14', '2027-12-18', 'America/New_York');
if (config.days.length !== 5 || config.days[2].activities.length !== 2) {
    throw new Error('Itinerary should keep five days and multiple same-day activities');
}
const blankEditorConfig = Itinerary.syncDaysToRange({ enabled: true, days: [] }, '2027-12-14', '2027-12-14', 'America/New_York');
blankEditorConfig.days[0].activities.push({ id: 'blank', title: '', details: '' });
if (Itinerary.normalizeConfig(blankEditorConfig).days[0].activities.length !== 1) {
    throw new Error('Creator editor should preserve a blank activity row until it is filled');
}
const rendered = Itinerary.calendarHtml(config, {
    start_date: '2027-12-14',
    end_date: '2027-12-18',
    timezone: 'America/New_York',
});
if (!rendered.includes('data-itinerary-calendar') || !rendered.includes('Snowboarding') || !rendered.includes('Ice skating') || rendered.includes('<unsafe>')) {
    throw new Error('Calendar should render activities and escape activity details');
}
if (!rendered.includes('Tue, Dec 14') || !rendered.includes('Wed, Dec 15') || !rendered.includes('Thu, Dec 16') || !rendered.includes('Fri, Dec 17') || !rendered.includes('Sat, Dec 18')) {
    throw new Error('Colorado calendar should label Dec 14-18 as Tue-Sat');
}
const firstGridStart = rendered.indexOf('<div class="evt-itinerary-grid">');
const firstDayCell = rendered.indexOf('data-itinerary-date="2027-12-14"');
const leadingCells = rendered.slice(firstGridStart, firstDayCell).match(/evt-itinerary-day-spacer/g) || [];
if (leadingCells.length !== 2) {
    throw new Error(`Colorado Dec 14 should start under Tuesday with 2 leading cells, got ${leadingCells.length}`);
}

console.log('event itinerary calendar smoke: all pass');
