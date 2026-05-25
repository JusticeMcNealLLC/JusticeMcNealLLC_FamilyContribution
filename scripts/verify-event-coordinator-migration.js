/**
 * DB verification for migration 091.
 * Requires repo-root .env (copy from .env.example).
 *
 *   node scripts/verify-event-coordinator-migration.js pre
 *   node scripts/verify-event-coordinator-migration.js apply
 *   node scripts/verify-event-coordinator-migration.js post
 *   node scripts/verify-event-coordinator-migration.js all
 */
require('./load-env');

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROLE_ID = '00000000-0000-0000-0000-000000000003';
const mode = process.argv[2] || 'pre';

const client = new Client({
    host: process.env.DB_HOST || 'db.jcrsfzcabzdeqixbewgf.supabase.co',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});

async function q(label, sql, params = []) {
    const res = await client.query(sql, params);
    console.log(`\n=== ${label} ===`);
    if (!res.rows.length) console.log('(no rows)');
    else console.table(res.rows);
    return res.rows;
}

async function preApply() {
    await q('Pre: Event Coordinator role', `
        SELECT id, name, is_system
        FROM roles
        WHERE name = 'Event Coordinator'
           OR id = $1::uuid
    `, [ROLE_ID]);

    await q('Pre: Raffle-related policies', `
        SELECT schemaname, tablename, policyname, cmd,
               LEFT(COALESCE(qual::text, ''), 140) AS qual_preview,
               LEFT(COALESCE(with_check::text, ''), 140) AS with_check_preview
        FROM pg_policies
        WHERE tablename IN ('event_raffle_winners')
           OR (schemaname = 'storage' AND tablename = 'objects' AND policyname ILIKE '%raffle%')
        ORDER BY schemaname, tablename, policyname
    `);

    await q('Pre: schema_migrations for 091', `
        SELECT version, name
        FROM supabase_migrations.schema_migrations
        WHERE version LIKE '%091%' OR name ILIKE '%event_coordinator%'
        ORDER BY version
    `);
}

async function applyMigration() {
    const sqlPath = path.join(__dirname, '../supabase/migrations/091_event_coordinator_rbac_and_rls.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('\n=== Applying migration 091 SQL ===');
    await client.query(sql);
    console.log('OK: migration SQL executed');
}

async function postApply() {
    await q('Post: role row', `
        SELECT id, name, color, icon, position, is_system
        FROM roles
        WHERE id = $1::uuid
    `, [ROLE_ID]);

    const perms = await q('Post: role_permissions', `
        SELECT role_id, permission
        FROM role_permissions
        WHERE role_id = $1::uuid
        ORDER BY permission
    `, [ROLE_ID]);

    const forbidden = await q('Post: forbidden permissions (expect 0 rows)', `
        SELECT role_id, permission
        FROM role_permissions
        WHERE role_id = $1::uuid
          AND (
            permission LIKE 'admin.%'
            OR permission LIKE 'finance.%'
            OR permission LIKE 'content.%'
          )
    `, [ROLE_ID]);

    const policies = await q('Post: patched policies', `
        SELECT schemaname, tablename, policyname, cmd, qual::text AS qual, with_check::text AS with_check
        FROM pg_policies
        WHERE policyname IN ('raffle_winners_update_admin', 'raffle_prizes_delete')
        ORDER BY schemaname, tablename, policyname
    `);

    const winner = policies.find((p) => p.policyname === 'raffle_winners_update_admin');
    const del = policies.find((p) => p.policyname === 'raffle_prizes_delete');
    const permKeys = perms.map((p) => p.permission).sort();
    const ok =
        perms.length === 3 &&
        JSON.stringify(permKeys) === JSON.stringify(['events.banners', 'events.create', 'events.manage_all']) &&
        forbidden.length === 0 &&
        (winner?.qual || '').includes('has_permission') &&
        (del?.qual || '').includes('has_permission') &&
        (del?.qual || '').includes('event-raffle-prizes');

    console.log('\n=== Post: automated checks ===', ok ? 'PASSED' : 'FAILED');
    return ok;
}

async function main() {
    const pw = process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;
    if (!pw) {
        console.error('Missing DB_PASSWORD in .env (copy .env.example → .env and fill in).');
        process.exit(1);
    }
    await client.connect();
    console.log('Connected to', process.env.DB_HOST || 'db.jcrsfzcabzdeqixbewgf.supabase.co');

    try {
        if (mode === 'pre') await preApply();
        else if (mode === 'apply') await applyMigration();
        else if (mode === 'post') await postApply();
        else if (mode === 'all') {
            await preApply();
            await applyMigration();
            await postApply();
        } else {
            console.error('Usage: pre | apply | post | all');
            process.exit(1);
        }
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
