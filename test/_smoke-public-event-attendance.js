/**

 * Static smoke: public event attendance count + sign-in redirect to portal.

 * Run: node test/_smoke-public-event-attendance.js

 */

const fs = require('fs');

const path = require('path');

const assert = require('assert');



const root = path.resolve(__dirname, '..');



const indexJs = fs.readFileSync(path.join(root, 'js/events/index.js'), 'utf8');

const loginJs = fs.readFileSync(path.join(root, 'js/auth/login.js'), 'utf8');

const heroJs = fs.readFileSync(path.join(root, 'js/events/hero.js'), 'utf8');

const portalHtml = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');

const rpcMigration = path.join(root, 'supabase/migrations/092_public_event_going_count_rpc.sql');



// Public load must not embed profiles for creator

assert(/\.from\('events'\)[\s\S]{0,120}\.select\('\*'\)/.test(indexJs),

    'public event load should select events without profiles embed');

assert(!/creator:profiles!events_created_by_fkey/.test(indexJs),

    'public event load must not fetch creator profile fields');



// Count-only path (no profile_picture_url on public attendance)

assert(/pubFetchGoingCount/.test(indexJs), 'index.js should define pubFetchGoingCount');

assert(/pubRenderPublicAttendance/.test(indexJs), 'index.js should render public attendance section');

assert(/pubGenericAvatarStackHtml/.test(indexJs), 'public page uses generic avatar stack');

assert(!/profile_picture_url/.test(indexJs.match(/function pubRenderPublicAttendance[\s\S]{0,800}/)?.[0] || ''),

    'pubRenderPublicAttendance must not use profile_picture_url');



assert(/\.eq\('status', 'going'\)/.test(indexJs), 'member count uses status going');

assert(/or\('status\.eq\.going,paid\.eq\.true'\)/.test(indexJs),

    'guest count aligns with portal (going or paid)');



// No minimum threshold hiding section

assert(!/goingCount >= 3/.test(indexJs), 'public attendance must not require count >= 3');



// Primary count via RPC; fallback sum when RPC unavailable

assert(/rpc\('public_event_going_count'/.test(indexJs), 'index.js should call public_event_going_count RPC');

assert(fs.existsSync(rpcMigration), '092_public_event_going_count_rpc.sql migration must exist');

const pubFetchBlock = indexJs.match(/async function pubFetchGoingCount[\s\S]*?^}/m)?.[0] || '';

assert(/!rpcRes\.error/.test(pubFetchBlock), 'pubFetchGoingCount must handle RPC errors');
assert(/\(memberCount \|\| 0\) \+ \(guestCount \|\| 0\)/.test(pubFetchBlock),
    'pubFetchGoingCount must fall back to member + guest counts when RPC fails');



// Sign-in → portal event detail

assert(/function pubPortalLoginHref/.test(indexJs), 'pubPortalLoginHref helper required');

assert(/portal\/events\.html\?event=/.test(indexJs), 'login redirect targets portal events detail');

assert(!/redirect=\$\{encodeURIComponent\(window\.location\.href\)\}/.test(indexJs),

    'index.js must not redirect back to public page after login');



assert(/publicSlug/.test(loginJs) && /portal\/events\.html\?event=/.test(loginJs),

    'login.js maps public /events/?e= redirects to portal detail');



assert(/pubPortalLoginHref/.test(heroJs), 'hero.js sign-in uses portal login href');



assert(!/canCreateEvents/.test(indexJs), 'public index must not touch coordinator gates');

assert(!portalHtml.includes('pubFetchGoingCount'), 'portal/events.html unchanged');



console.log('public event attendance smoke: all pass');

