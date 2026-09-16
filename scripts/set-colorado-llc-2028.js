// Flip Colorado 2028 to LLC without touching pricing, guests, or status.
// Run: node scripts/set-colorado-llc-2028.js
'use strict';
require('./load-env');
const { Client } = require('pg');

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
    if (!c.password) {
        throw new Error('[set-colorado-llc-2028] missing DB_PASSWORD in .env');
    }
    await c.connect();
    const r = await c.query(
        `UPDATE events
         SET event_type = 'llc',
             member_only = FALSE,
             pricing_mode = 'paid'
         WHERE slug = $1
         RETURNING id, slug, event_type, member_only, pricing_mode,
                   adult_price_cents, rsvp_cost_cents, kids_free, status`,
        [SLUG],
    );
    if (!r.rows.length) {
        throw new Error(`[set-colorado-llc-2028] event not found: ${SLUG}`);
    }
    console.log('[set-colorado-llc-2028] ok', r.rows[0]);
    await c.end();
})().catch(async (err) => {
    console.error('[set-colorado-llc-2028]', err.message || err);
    try { await c.end(); } catch (_) { /* ignore */ }
    process.exit(1);
});
