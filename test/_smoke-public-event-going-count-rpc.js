/**
 * Static smoke: migration 092 public_event_going_count RPC.
 * Run: node test/_smoke-public-event-going-count-rpc.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const migrationPath = path.join(
    root,
    'supabase/migrations/092_public_event_going_count_rpc.sql'
);

assert(fs.existsSync(migrationPath), 'migration file 092 must exist');
const sql = fs.readFileSync(migrationPath, 'utf8');
const sqlNoComments = sql.replace(/--[^\n]*/g, '');

assert(/public_event_going_count/.test(sql), 'function public_event_going_count must exist');
assert(/RETURNS\s+integer/i.test(sql), 'function must return integer');
assert(/SECURITY\s+DEFINER/i.test(sql), 'function must use SECURITY DEFINER');
assert(/SET\s+search_path\s*=\s*public/i.test(sql), 'function must set search_path = public');

assert(/event_rsvps/i.test(sql), 'must count event_rsvps');
assert(/event_guest_rsvps/i.test(sql), 'must count event_guest_rsvps');
assert(/status\s*=\s*'going'/i.test(sql), 'must filter member/guest status going');
assert(/paid\s*=\s*TRUE/i.test(sql), 'guest count must include paid = TRUE');

assert(
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.public_event_going_count\(uuid\)\s+TO\s+anon,\s*authenticated/i.test(sql),
    'must grant execute to anon and authenticated'
);

const profileFields = [
    'first_name',
    'last_name',
    'profile_picture_url',
    'displayed_badge',
    'title',
    'bio',
];
for (const field of profileFields) {
    assert(!sqlNoComments.includes(field), `migration must not reference profile field ${field}`);
}

// Aggregate only — no row payloads
assert(!/SELECT\s+\*/i.test(sqlNoComments), 'must not SELECT * from RSVP tables');
assert(!/RETURN\s+QUERY/i.test(sqlNoComments), 'must not return RSVP rows');
assert(!/RETURNS\s+TABLE/i.test(sqlNoComments), 'must not return a table of RSVP data');
assert(!/guest_name/i.test(sqlNoComments), 'must not expose guest_name');
assert(!/guest_email/i.test(sqlNoComments), 'must not expose guest_email');
assert(!/user_id/i.test(sqlNoComments), 'must not expose user_id in output');

console.log('public event going count RPC migration smoke: all pass');
