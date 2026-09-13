// Prep Colorado 2028 for E2E dry run (§13.15 line 482): open + amenity voting.
// Run: node scripts/prep-colorado-dry-run-2028.js
'use strict';

require('./load-env');

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const TAG = '[prep-colorado-dry-run-2028]';
const SQL_PATH = path.join(__dirname, 'prep-colorado-dry-run-2028.sql');

const c = new Client({
    host: process.env.DB_HOST || 'db.jcrsfzcabzdeqixbewgf.supabase.co',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});

(async () => {
    if (!c.password) throw new Error(`${TAG} missing DB_PASSWORD in .env`);
    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    await c.connect();
    const res = await c.query(sql);
    const row = res.rows[0];
    if (!row) throw new Error(`${TAG} UPDATE matched no row — create Colorado event first`);
    console.log(`${TAG} ok`, row);
    if (row.status !== 'open' || Number(row.amenity_options_len) < 2 || row.voting_enabled !== true) {
        throw new Error(`${TAG} prep incomplete: need open + enabled voting with ≥2 options`);
    }
    await c.end();
})().catch(async (err) => {
    console.error(TAG, err.message || err);
    try { await c.end(); } catch (_) { /* ignore */ }
    process.exit(1);
});
