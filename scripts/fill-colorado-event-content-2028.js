// Fill Colorado 2028 About / clothing / disclaimers (§13.15 line 481).
// Run: node scripts/fill-colorado-event-content-2028.js
'use strict';

require('./load-env');

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const TAG = '[fill-colorado-event-content-2028]';
const SQL_PATH = path.join(__dirname, 'fill-colorado-event-content-2028.sql');

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
    const res = await c.query(sql);
    const row = res.rows[0];
    if (!row) {
        throw new Error(`${TAG} UPDATE matched no row — create Colorado event first (line 480)`);
    }
    console.log(`${TAG} ok`, {
        id: row.id,
        slug: row.slug,
        about_tabs_len: row.about_tabs_len,
        included_items_len: row.included_items_len,
        disclaimers_len: row.disclaimers_len,
        status: row.status,
    });
    if (Number(row.about_tabs_len) !== 4
        || Number(row.included_items_len) !== 2
        || Number(row.disclaimers_len) !== 2) {
        throw new Error(`${TAG} unexpected JSON lengths`);
    }
    await c.end();
})().catch(async (err) => {
    console.error(TAG, err.message || err);
    try { await c.end(); } catch (_) { /* ignore */ }
    process.exit(1);
});
