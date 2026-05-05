// DB Audit Script — run with: node scripts/db-audit.js
const { Client } = require('pg');

const client = new Client({
  host: 'db.jcrsfzcabzdeqixbewgf.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.DB_PASSWORD || 'N1Svp3ECWO0m8TKu',
  ssl: { rejectUnauthorized: false }
});

async function schemaAudit() {
  await client.connect();
  console.log('✅ DB CONNECTION: SUCCESS\n');

  const tables = ['profiles', 'notification_preferences', 'credit_points_log', 'member_accounts', 'push_subscriptions'];
  for (const t of tables) {
    const r = await client.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [t]
    );
    console.log(`\n=== ${t.toUpperCase()} COLUMNS ===`);
    console.table(r.rows);
  }

  // Check last_sign_in_at in auth.users
  const lsi = await client.query(`SELECT email, last_sign_in_at FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST`);
  console.log('\n=== LAST SIGN IN ===');
  console.table(lsi.rows);

  await client.end();
}

async function audit() {
  await client.connect();
  console.log('✅ DB CONNECTION: SUCCESS\n');

  // 1. Profiles
  const profiles = await client.query(`
    SELECT email, role, setup_completed, first_name, last_name, created_at
    FROM profiles ORDER BY created_at
  `);
  console.log('=== PROFILES (' + profiles.rows.length + ' total) ===');
  console.table(profiles.rows);

  // 2. Subscriptions
  const subs = await client.query(`
    SELECT p.email, s.status, s.current_amount_cents, s.stripe_subscription_id, s.created_at
    FROM subscriptions s JOIN profiles p ON p.id = s.user_id
    ORDER BY s.created_at
  `);
  console.log('=== SUBSCRIPTIONS (' + subs.rows.length + ' total) ===');
  console.table(subs.rows);

  // 3. All public tables
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  console.log('=== ALL PUBLIC TABLES ===');
  console.log(tables.rows.map(r => r.table_name).join(', '));

  // 3b. Find invite table
  const inviteTable = tables.rows.find(r => r.table_name.includes('invit'));
  if (inviteTable) {
    const invites = await client.query(`SELECT * FROM ${inviteTable.table_name} ORDER BY created_at DESC LIMIT 15`);
    console.log(`\n=== ${inviteTable.table_name.toUpperCase()} (recent 15) ===`);
    console.table(invites.rows);
  }

  // 4. App settings
  const settings = await client.query(`SELECT key, value FROM app_settings ORDER BY key`);
  console.log('\n=== APP SETTINGS ===');
  console.table(settings.rows);

  // 5. Members with setup_completed = false (onboarding stuck)
  const stuck = await client.query(`
    SELECT email, role, created_at FROM profiles
    WHERE setup_completed = false ORDER BY created_at
  `);
  console.log('\n=== ⚠️  MEMBERS STUCK IN ONBOARDING (setup_completed=false) ===');
  console.table(stuck.rows);

  await client.end();
}

audit().catch(err => {
  console.error('ERROR:', err.message);
  client.end();
});

schemaAudit().catch(err => {
  console.error('SCHEMA AUDIT ERROR:', err.message);
});
