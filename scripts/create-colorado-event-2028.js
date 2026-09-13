// Apply Colorado 2028 staging draft (§13.15 line 480).
// Run: node scripts/create-colorado-event-2028.js
'use strict';

require('./load-env');

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const TAG = '[create-colorado-event-2028]';
const SQL_PATH = path.join(__dirname, 'create-colorado-event-2028.sql');

const c = new Client({
    host: process.env.DB_HOST || 'db.jcrsfzcabzdeqixbewgf.supabase.co',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});

(async () => {
    if (!c.password) {
        throw new Error(`${TAG} missing DB_PASSWORD in .env`);
    }
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    await c.connect();
    const me = await c.query("select id from profiles where email='mcneal.justin99@gmail.com'");
    if (!me.rows[0]) {
        throw new Error(`${TAG} Justin profile not found — cannot set created_by`);
    }
    const res = await c.query(sql);
    const row = res.rows[0];
    if (!row) {
        throw new Error(`${TAG} INSERT returned no row (creator missing or SQL failed)`);
    }
    console.log(`${TAG} ok`, {
        id: row.id,
        slug: row.slug,
        adult_price_cents: row.adult_price_cents,
        kids_free: row.kids_free,
        capacity_mode: row.capacity_mode,
        fund_deadline: row.fund_deadline,
        start_date: row.start_date,
        status: row.status,
        created_by: me.rows[0].id,
    });
    await c.end();
})().catch(async (err) => {
    console.error(TAG, err.message || err);
    try { await c.end(); } catch (_) { /* ignore */ }
    process.exit(1);
});
