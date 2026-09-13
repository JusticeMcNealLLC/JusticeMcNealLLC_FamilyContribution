// Backfill Keystone lat/lng for Colorado trip map (does not touch status).
// Run: node scripts/apply-colorado-map-coords-2028.js
'use strict';
require('./load-env');
const { Client } = require('pg');

const LAT = 39.605;
const LNG = -105.95417;
const SLUG = 'colorado-snowboarding-2028';

const c = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});

(async () => {
    await c.connect();
    const r = await c.query(
        `UPDATE events
         SET location_lat = $1, location_lng = $2
         WHERE slug = $3
         RETURNING slug, location_text, location_nickname, location_lat, location_lng, status`,
        [LAT, LNG, SLUG],
    );
    if (!r.rows.length) {
        console.error('[apply-colorado-map-coords] event not found:', SLUG);
        process.exit(1);
    }
    console.log('[apply-colorado-map-coords] ok', r.rows[0]);
    await c.end();
})().catch(async (e) => {
    console.error(e);
    try { await c.end(); } catch (_) { /* ignore */ }
    process.exit(1);
});
