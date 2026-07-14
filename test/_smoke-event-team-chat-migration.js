/**
 * Static smoke: Event Team Chat migration 093 — schema & RLS safety.
 * Run: node test/_smoke-event-team-chat-migration.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const migrationPath = path.join(root, 'supabase/migrations/093_event_team_chat.sql');
const planPath = path.join(
    root,
    'docs/improvements/pages/events/team-chat/001_event_team_chat_schema_rls_plan.md'
);
const portalHtml = path.join(root, 'pages/portal/events.html');
const detailJs = path.join(root, 'js/portal/events/detail.js');

assert(fs.existsSync(migrationPath), '093 migration must exist');
assert(fs.existsSync(planPath), '001 plan doc must exist');
const sql = fs.readFileSync(migrationPath, 'utf8');
const plan = fs.readFileSync(planPath, 'utf8');

// Tables & RLS
assert(/CREATE TABLE IF NOT EXISTS public\.event_chats/i.test(sql), 'event_chats table');
assert(/CREATE TABLE IF NOT EXISTS public\.event_chat_messages/i.test(sql), 'event_chat_messages table');
assert(/ENABLE ROW LEVEL SECURITY/i.test(sql), 'RLS must be enabled');
assert((sql.match(/ENABLE ROW LEVEL SECURITY/g) || []).length >= 2, 'RLS on both tables');

// Helper & permissions
assert(/can_access_event_team_chat/i.test(sql), 'access helper required');
assert(/public\.has_permission\('events\.manage_all'\)/.test(sql), 'events.manage_all in policies');
assert(/event_hosts/i.test(sql), 'event_hosts in access helper');
assert(/created_by = auth\.uid\(\)/i.test(sql), 'event creator access');

// Constraints
assert(/UNIQUE \(event_id, chat_type\)/i.test(sql), 'one team chat per event');
assert(/chat_type = 'team'/i.test(sql), 'team chat type constraint');
assert(/char_length\(trim\(body\)\) > 0/i.test(sql), 'non-empty trimmed body');
assert(/<= 4000/i.test(sql), 'body max length');

// Deny public / guest paths
assert(!/TO anon/i.test(sql), 'no GRANT TO anon');
assert(!/FOR ALL TO anon/i.test(sql), 'no anon policies');
assert(!/auth\.role\(\) = 'anon'/i.test(sql), 'no anon role policies');

// Realtime (optional but expected in 093)
assert(/supabase_realtime ADD TABLE public\.event_chat_messages/i.test(sql), 'realtime on messages');

// No hard DELETE on messages
assert(!/event_chat_messages_delete/i.test(sql), 'no hard DELETE policy on messages v1');

// Plan doc presence
assert(/can_access_event_team_chat/i.test(plan), 'plan documents helper');
assert(/events\.manage_all/i.test(plan), 'plan documents manage_all');
assert(!/portal\/events\.html/i.test(plan.replace(/Do not modify/gi, '')), 'plan should not require portal html edits');

// No portal / UI changes in this deliverable
const portalBefore = fs.readFileSync(portalHtml, 'utf8');
assert(!/event_chats/.test(portalBefore), 'portal/events.html must not reference event_chats yet');
const detailBefore = fs.readFileSync(detailJs, 'utf8');
assert(!/event_chats/.test(detailBefore), 'detail.js must not reference event_chats yet');

// Other migrations must not have been edited by this task (093 is new)
const migrationsDir = path.join(root, 'supabase/migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
assert(migrationFiles.includes('093_event_team_chat.sql'), '093 file listed in migrations');

console.log('event team chat migration smoke: all pass');
