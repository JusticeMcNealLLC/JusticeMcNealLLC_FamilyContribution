/**
 * Static smoke: public event member RSVP sign-in prompt.
 * Run: node test/_smoke-public-event-member-rsvp-prompt.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

const indexJs = fs.readFileSync(path.join(root, 'js/events/index.js'), 'utf8');
const bodyJs = fs.readFileSync(path.join(root, 'js/events/body.js'), 'utf8');
const rsvpJs = fs.readFileSync(path.join(root, 'js/events/rsvp.js'), 'utf8');
const portalHtml = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');

assert(/function pubMemberRsvpPromptHtml/.test(indexJs), 'pubMemberRsvpPromptHtml helper required');
assert(/public-member-rsvp-inline/.test(indexJs), 'compact inline member prompt markup required');
assert(/Already a member\?/.test(indexJs), 'member prompt copy required');
assert(/public-member-rsvp-link/.test(indexJs), 'Sign in to RSVP link required');
assert(/Sign in to RSVP/.test(indexJs), 'Sign in to RSVP label required');
assert(!/full member event page/.test(indexJs), 'guest prompt must not use tall explanatory copy');
assert(/pubPortalLoginHref/.test(indexJs), 'must reuse pubPortalLoginHref');
assert(/portal\/events\.html\?event=/.test(indexJs), 'redirect must target portal event detail');
assert(/pub-member-rsvp-btn/.test(indexJs), 'members-only notice keeps prominent sign-in button');

assert(/pubMemberRsvpPromptHtml/.test(indexJs), 'sidebar guest card includes member prompt');
assert(/guestRsvpSection/.test(indexJs), 'guest RSVP section shell remains');
assert(/pubHandleGuestRsvp/.test(indexJs) || /pubHandleGuestRsvp/.test(rsvpJs),
    'guest RSVP handler must remain');

assert(/pubMemberRsvpPromptHtml/.test(bodyJs), 'mobile CTA RSVP panel includes member prompt');
assert(/RSVP as Guest/.test(bodyJs), 'guest RSVP CTA path remains');

const eventsJs = [indexJs, bodyJs, rsvpJs].join('\n');
const forbidden = [
    [/profiles.*guestEmail|guest_email.*profiles/i, 'profile lookup from guest email'],
    [/member.*exists|account.*exists|belongs to a member/i, 'membership existence message'],
    [/rpc\(.*member|rpc\(.*account/i, 'account lookup RPC'],
    [/\.from\('profiles'\)[\s\S]{0,80}guest/i, 'profiles query tied to guest RSVP'],
    [/signInWithPassword[\s\S]{0,200}guestEmail/i, 'auto-login from guest form'],
];
for (const [re, label] of forbidden) {
    assert(!re.test(eventsJs), `must not add ${label}`);
}

assert(!portalHtml.includes('pubMemberRsvpPromptHtml'), 'portal/events.html unchanged');
assert(!fs.readdirSync(path.join(root, 'supabase/migrations')).some((f) => f.includes('member_rsvp')),
    'no new migrations for member RSVP prompt');

console.log('public event member RSVP prompt smoke: all pass');
