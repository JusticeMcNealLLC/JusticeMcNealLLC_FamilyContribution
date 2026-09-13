// Verify Colorado 2028 E2E dry-run readiness / completion (§13.15 line 482).
// Run:
//   node scripts/verify-colorado-dry-run-2028.js --pre
//   node scripts/verify-colorado-dry-run-2028.js --post
'use strict';

require('./load-env');

const { Client } = require('pg');

const TAG = '[verify-colorado-dry-run-2028]';
const SLUG = 'colorado-snowboarding-2028';
const mode = process.argv.includes('--post') ? 'post' : 'pre';

const c = new Client({
    host: process.env.DB_HOST || 'db.jcrsfzcabzdeqixbewgf.supabase.co',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});

let failed = 0;
function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.log(`  ✗ ${msg}`); failed++; }

(async () => {
    if (!c.password) throw new Error(`${TAG} missing DB_PASSWORD in .env`);
    await c.connect();

    const evRes = await c.query(
        `SELECT id, slug, status, amenity_voting, adult_price_cents, kids_free,
                jsonb_array_length(COALESCE(about_tabs, '[]'::jsonb)) AS about_len,
                jsonb_array_length(COALESCE(included_items, '[]'::jsonb)) AS included_len,
                jsonb_array_length(COALESCE(disclaimers, '[]'::jsonb)) AS disc_len
         FROM events WHERE slug = $1`,
        [SLUG]
    );
    const ev = evRes.rows[0];
    if (!ev) {
        fail(`event ${SLUG} not found`);
        process.exit(1);
    }

    console.log(`\n── ${TAG} ${mode} ── ${ev.id}`);

    if (mode === 'pre') {
        ev.status === 'open' ? pass('status open') : fail(`status is ${ev.status}, want open`);
        const av = ev.amenity_voting || {};
        const opts = Array.isArray(av.options) ? av.options : [];
        av.enabled === true && opts.length >= 2
            ? pass(`amenity voting enabled (${opts.length} options)`)
            : fail('amenity voting not enabled with ≥2 options');
        Number(ev.adult_price_cents) === 100000 && ev.kids_free === true
            ? pass('pricing $1000 adult / kids free')
            : fail('pricing not locked Colorado values');
        Number(ev.about_len) >= 1 && Number(ev.included_len) >= 2 && Number(ev.disc_len) >= 2
            ? pass('about / included / disclaimers present')
            : fail('content columns incomplete (run fill script)');
    } else {
        const parties = await c.query(
            `SELECT id, status, amenity_vote_status, amenity_vote_option_id
             FROM event_parties WHERE event_id = $1 ORDER BY created_at DESC LIMIT 5`,
            [ev.id]
        );
        parties.rows.length >= 1
            ? pass(`event_parties present (${parties.rows.length})`)
            : fail('no event_parties — complete guest RSVP');

        const counted = parties.rows.some((p) => p.amenity_vote_status === 'counted'
            || p.amenity_vote_status === 'provisional');
        counted
            ? pass('amenity vote provisional or counted on a party')
            : fail('no amenity vote on parties');

        const plans = await c.query(
            `SELECT id, status FROM event_payment_plans WHERE event_id = $1 LIMIT 5`,
            [ev.id]
        );
        plans.rows.length >= 1
            ? pass(`event_payment_plans present (${plans.rows.length})`)
            : fail('no event_payment_plans — complete Checkout + webhook');

        const sms = await c.query(
            `SELECT message_type, COUNT(*)::int AS n
             FROM sms_messages
             WHERE event_id = $1
               AND message_type IN ('event_invite', 'event_payment_link')
             GROUP BY message_type`,
            [ev.id]
        );
        const byType = Object.fromEntries(sms.rows.map((r) => [r.message_type, r.n]));
        (byType.event_invite || 0) >= 1
            ? pass('sms_messages event_invite present')
            : fail('no event_invite SMS row');
        (byType.event_payment_link || 0) >= 1
            ? pass('sms_messages event_payment_link present')
            : fail('no event_payment_link SMS row (magic-link path)');
    }

    await c.end();
    console.log(failed ? `\n${TAG} ${mode}: ${failed} failed\n` : `\n${TAG} ${mode}: ALL PASS\n`);
    process.exit(failed ? 1 : 0);
})().catch(async (err) => {
    console.error(TAG, err.message || err);
    try { await c.end(); } catch (_) { /* ignore */ }
    process.exit(1);
});
