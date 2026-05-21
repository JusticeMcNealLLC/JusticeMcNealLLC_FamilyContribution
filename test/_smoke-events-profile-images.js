/**
 * Static smoke: Events page profile image / creator profile fetch safety.
 * Run: node test/_smoke-events-profile-images.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

const files = {
    detail: 'js/portal/events/detail.js',
    init: 'js/portal/events/init.js',
    map: 'js/portal/events/map.js',
    list: 'js/portal/events/list.js',
    comments: 'js/portal/events/comments.js',
};

const src = {};
for (const [k, rel] of Object.entries(files)) {
    src[k] = fs.readFileSync(path.join(root, rel), 'utf8');
}

// Creator fetch in detail must not use .single() (406 when 0 rows)
const creatorBlock = src.detail.match(
    /from\('profiles'\)[\s\S]{0,400}\.eq\('id', event\.created_by\)[\s\S]{0,80}(?:\.maybeSingle|\.single)\(\)/
);
assert(creatorBlock, 'detail.js should fetch creator profile by event.created_by');
assert(/\.maybeSingle\(\)/.test(creatorBlock[0]), 'detail.js creator profile must use maybeSingle()');
assert(!/\.single\(\)/.test(creatorBlock[0]), 'detail.js creator profile must not use single()');

// Prefer embedded list creator + stub fallback when row missing/invisible
assert(/event\.creator/.test(src.detail), 'detail.js should use event.creator from list load when available');
assert(/profile_picture_url: null/.test(src.detail), 'detail.js should stub creator when profile row unavailable');

// Organizer/host UI should not require a successful profile row
assert(/if \(!isLlc && event\.created_by\)/.test(src.detail), 'detail organizer block should key off created_by, not truthy profile');

// Init current-user profile (comments composer pic) — maybeSingle
const initProfile = src.init.match(
    /from\('profiles'\)[\s\S]{0,200}\.eq\('id', evtCurrentUser\.id\)[\s\S]{0,40}(?:\.maybeSingle|\.single)\(\)/
);
assert(initProfile && /\.maybeSingle\(\)/.test(initProfile[0]), 'init.js own profile fetch must use maybeSingle()');

// Map realtime marker profile fetch
const mapProfile = src.map.match(
    /from\('profiles'\)[\s\S]{0,200}\.eq\('id', loc\.user_id\)[\s\S]{0,40}(?:\.maybeSingle|\.single)\(\)/
);
assert(mapProfile && /\.maybeSingle\(\)/.test(mapProfile[0]), 'map.js profile fetch must use maybeSingle()');

// Attendee avatars already degrade when embed is null
assert(/buildPersonRow/.test(src.detail), 'detail.js should have buildPersonRow fallback');
assert(/profile_picture_url\s*\?/.test(src.detail), 'detail.js buildPersonRow should branch on profile_picture_url');

assert(/if \(!row\.profiles\) return/.test(src.list), 'list.js attendee stack should skip null embedded profiles');

// Scope: no schema/RLS/html edits in this smoke
assert(!fs.existsSync(path.join(root, 'supabase/migrations/092_events_profile_images.sql')), 'no unapproved migration added');

console.log('events profile images smoke: all pass');
