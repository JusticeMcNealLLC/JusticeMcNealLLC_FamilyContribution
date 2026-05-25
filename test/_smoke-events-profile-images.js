/**
 * Static smoke: Events page profile image / creator profile fetch safety.
 * Run: node test/_smoke-events-profile-images.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

const files = {
    data: 'js/portal/events/detail/data.js',
    sections: 'js/portal/events/detail/sections.js',
    init: 'js/portal/events/init.js',
    map: 'js/portal/events/detail/map-live.js',
    list: 'js/portal/events/list/shell.js',
};

const src = {};
for (const [k, rel] of Object.entries(files)) {
    src[k] = fs.readFileSync(path.join(root, rel), 'utf8');
}

const creatorBlock = src.data.match(
    /from\('profiles'\)[\s\S]{0,400}\.eq\('id', event\.created_by\)[\s\S]{0,80}(?:\.maybeSingle|\.single)\(\)/
);
assert(creatorBlock, 'detail/data.js should fetch creator profile by event.created_by');
assert(/\.maybeSingle\(\)/.test(creatorBlock[0]), 'detail/data.js creator profile must use maybeSingle()');
assert(!/\.single\(\)/.test(creatorBlock[0]), 'detail/data.js creator profile must not use single()');

assert(/event\.creator/.test(src.data), 'detail/data.js should use event.creator from list load when available');
assert(/profile_picture_url: null/.test(src.data), 'detail/data.js should stub creator when profile row unavailable');

assert(/if \(!isLlc && event\.created_by\)/.test(src.sections), 'detail/sections.js organizer block should key off created_by');

const initProfile = src.init.match(
    /from\('profiles'\)[\s\S]{0,200}\.eq\('id', evtCurrentUser\.id\)[\s\S]{0,40}(?:\.maybeSingle|\.single)\(\)/
);
assert(initProfile && /\.maybeSingle\(\)/.test(initProfile[0]), 'init.js own profile fetch must use maybeSingle()');

const mapProfile = src.map.match(
    /from\('profiles'\)[\s\S]{0,200}\.eq\('id', loc\.user_id\)[\s\S]{0,40}(?:\.maybeSingle|\.single)\(\)/
);
assert(mapProfile && /\.maybeSingle\(\)/.test(mapProfile[0]), 'map-live.js profile fetch must use maybeSingle()');

assert(/buildPersonRow/.test(src.sections), 'detail/sections.js should have buildPersonRow fallback');
assert(/profile_picture_url\s*\?/.test(src.sections), 'detail/sections.js buildPersonRow should branch on profile_picture_url');

assert(/if \(!row\.profiles\) return/.test(src.list), 'list/shell.js attendee stack should skip null embedded profiles');

assert(!fs.existsSync(path.join(root, 'supabase/migrations/092_events_profile_images.sql')), 'no unapproved migration added');

console.log('events profile images smoke: all pass');
