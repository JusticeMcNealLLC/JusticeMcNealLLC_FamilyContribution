// Apply migration 116 + print Colorado going count.
// Run: node scripts/apply-going-count-paid-only.js
'use strict';
require('./load-env');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const c = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});

(async () => {
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260904010000_116_public_event_going_count_paid_only.sql');
    await c.connect();
    await c.query(fs.readFileSync(sqlPath, 'utf8'));
    const r = await c.query(
        `select public_event_going_count(id) as n, pricing_mode
         from events where slug = 'colorado-snowboarding-2028'`
    );
    console.log('[apply-going-count-paid-only] ok', r.rows[0]);
    await c.end();
})().catch(async (e) => {
    console.error(e);
    try { await c.end(); } catch (_) { /* ignore */ }
    process.exit(1);
});
