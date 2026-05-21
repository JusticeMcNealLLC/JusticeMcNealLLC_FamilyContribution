/**
 * Static smoke: Event Coordinator migration 091 — source safety checks.
 * Run: node test/_smoke-event-coordinator-rls-migration.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const migrationPath = path.join(
    root,
    'supabase/migrations/091_event_coordinator_rbac_and_rls.sql'
);

assert(fs.existsSync(migrationPath), 'migration file must exist');
const sql = fs.readFileSync(migrationPath, 'utf8');

const EVENT_COORDINATOR_ID = '00000000-0000-0000-0000-000000000003';

assert(sql.includes(EVENT_COORDINATOR_ID), 'Event Coordinator role UUID must be present');
assert(/Event Coordinator/.test(sql), 'role name Event Coordinator must be present');

// Only these three permissions for coordinator role (role_permissions INSERT only)
const rolePermBlock = sql.match(
    /INSERT\s+INTO\s+role_permissions[\s\S]*?ON\s+CONFLICT/i
);
assert(rolePermBlock, 'role_permissions INSERT block must exist');
const grantedPerms = [...rolePermBlock[0].matchAll(
    new RegExp(`'${EVENT_COORDINATOR_ID}',\\s*'([^']+)'`, 'g')
)].map((m) => m[1]);

assert.strictEqual(grantedPerms.length, 3, `expected 3 role_permissions rows, got ${grantedPerms.length}`);
assert.deepStrictEqual(
    [...grantedPerms].sort(),
    ['events.banners', 'events.create', 'events.manage_all'].sort(),
    'Event Coordinator must have only events.create, events.manage_all, events.banners'
);

// Forbidden grants (strip line comments so "Does NOT grant admin.dashboard" is ignored)
const sqlNoComments = sql.replace(/--[^\n]*/g, '');
const forbiddenPatterns = [
    [/INSERT\s+INTO\s+role_permissions[\s\S]*'admin\./i, 'admin.* permission in role_permissions'],
    [/INSERT\s+INTO\s+role_permissions[\s\S]*'finance\./i, 'finance.* in role_permissions'],
    [/INSERT\s+INTO\s+role_permissions[\s\S]*'content\./i, 'content.* in role_permissions'],
];
for (const [re, label] of forbiddenPatterns) {
    assert(!re.test(sqlNoComments), `migration must not grant ${label}`);
}

// No profiles.role / sync trigger changes (executable SQL only)
assert(!/ALTER\s+TABLE\s+profiles/i.test(sqlNoComments), 'must not alter profiles table');
assert(!/profiles\.role/i.test(sqlNoComments), 'must not reference profiles.role in SQL');
assert(!/sync_profile_role/i.test(sqlNoComments), 'must not modify sync_profile_role');

// Part B — raffle winners
assert(/event_raffle_winners/i.test(sql), 'must reference event_raffle_winners');
assert(/raffle_winners_update_admin/i.test(sql), 'must patch raffle_winners_update_admin');
assert(/public\.has_permission\('events\.manage_all'\)/.test(sql), 'must use has_permission(events.manage_all)');

// Part C — storage bucket
assert(/event-raffle-prizes/.test(sql), 'must reference event-raffle-prizes bucket');
assert(/raffle_prizes_delete/i.test(sql), 'must patch raffle_prizes_delete');

// Optional draft policy excluded
assert(!/events_select_manage_all_drafts/i.test(sql), 'must not include optional draft SELECT policy');

console.log('event coordinator RLS migration smoke: all pass');
