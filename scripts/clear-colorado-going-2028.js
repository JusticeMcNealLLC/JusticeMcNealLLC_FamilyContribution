// Clear Going RSVPs / parties for Colorado 2028 (dry-run cleanup).
// Soft-cancels payment parties/plans, then deletes RSVPs + related rows.
// Run: node scripts/clear-colorado-going-2028.js
'use strict';

require('./load-env');

const { Client } = require('pg');

const TAG = '[clear-colorado-going-2028]';
const SLUG = 'colorado-snowboarding-2028';

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
    await c.connect();

    const ev = await c.query(
        `select id, title, pricing_mode, status from events where slug = $1`,
        [SLUG],
    );
    if (!ev.rows[0]) throw new Error(`${TAG} event not found: ${SLUG}`);
    const eventId = ev.rows[0].id;
    console.log(`${TAG} event`, ev.rows[0]);

    const before = await c.query(
        `select
           (select count(*)::int from event_rsvps where event_id = $1 and (status = 'going' or paid = true)) as member_going,
           (select count(*)::int from event_rsvps where event_id = $1 and status = 'going' and coalesce(paid,false) = false) as member_unpaid_going,
           (select count(*)::int from event_guest_rsvps where event_id = $1 and (status = 'going' or paid = true)) as guest_going,
           (select count(*)::int from event_parties where event_id = $1 and status <> 'cancelled') as open_parties,
           (select count(*)::int from event_payment_plans where event_id = $1 and status in ('setup','active','past_due')) as open_plans`,
        [eventId],
    );
    console.log(`${TAG} before`, before.rows[0]);

    await c.query('begin');

    // Cancel pending/failed installments on open plans, then cancel plans
    const plans = await c.query(
        `select id from event_payment_plans where event_id = $1`,
        [eventId],
    );
    for (const p of plans.rows) {
        await c.query(
            `update event_payment_installments
             set status = 'cancelled', updated_at = now()
             where plan_id = $1 and status in ('pending', 'failed')`,
            [p.id],
        );
    }
    await c.query(
        `update event_payment_plans
         set status = 'cancelled', next_debit_at = null, updated_at = now()
         where event_id = $1 and status <> 'cancelled'`,
        [eventId],
    );

    // Detach RSVP → party FKs, then delete parties (avoids guest ON DELETE SET NULL
    // violating event_parties_payer_guest check)
    await c.query(
        `update event_rsvps set party_id = null where event_id = $1 and party_id is not null`,
        [eventId],
    );
    await c.query(
        `update event_guest_rsvps set party_id = null where event_id = $1 and party_id is not null`,
        [eventId],
    );
    // Installments / plans may still reference party_id — null or delete children first
    await c.query(
        `delete from event_payment_installments
         where party_id in (select id from event_parties where event_id = $1)`,
        [eventId],
    );
    await c.query(
        `delete from event_payment_plans where event_id = $1`,
        [eventId],
    );
    const delParties = await c.query(
        `delete from event_parties where event_id = $1`,
        [eventId],
    );

    const delRaffleW = await c.query(`delete from event_raffle_winners where event_id = $1`, [eventId]);
    const delRaffleE = await c.query(`delete from event_raffle_entries where event_id = $1`, [eventId]);
    const delCheckin = await c.query(`delete from event_checkins where event_id = $1`, [eventId]);
    const delGuest = await c.query(`delete from event_guest_rsvps where event_id = $1`, [eventId]);
    const delMember = await c.query(`delete from event_rsvps where event_id = $1`, [eventId]);

    await c.query('commit');

    const after = await c.query(
        `select
           (select count(*)::int from event_rsvps where event_id = $1) as member_rsvps,
           (select count(*)::int from event_guest_rsvps where event_id = $1) as guest_rsvps,
           (select count(*)::int from event_parties where event_id = $1 and status <> 'cancelled') as open_parties,
           (select count(*)::int from event_payment_plans where event_id = $1 and status in ('setup','active','past_due')) as open_plans`,
        [eventId],
    );

    console.log(`${TAG} deleted`, {
        member_rsvps: delMember.rowCount,
        guest_rsvps: delGuest.rowCount,
        checkins: delCheckin.rowCount,
        raffle_entries: delRaffleE.rowCount,
        raffle_winners: delRaffleW.rowCount,
        parties: delParties.rowCount,
        plans: plans.rowCount,
    });
    console.log(`${TAG} after`, after.rows[0]);
    console.log(`${TAG} ok`);
    await c.end();
})().catch(async (err) => {
    console.error(TAG, err.message || err);
    try { await c.query('rollback'); } catch (_) { /* ignore */ }
    try { await c.end(); } catch (_) { /* ignore */ }
    process.exit(1);
});
