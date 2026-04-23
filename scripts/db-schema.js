const { Client } = require('pg');
const c = new Client({
  host: 'db.jcrsfzcabzdeqixbewgf.supabase.co',
  port: 5432, database: 'postgres', user: 'postgres',
  password: '30Wkpoizst6gDYUS', ssl: { rejectUnauthorized: false }
});

async function run() {
  await c.connect();

  const tables = ['profiles', 'notification_preferences', 'credit_points_log', 'member_accounts', 'push_subscriptions'];
  for (const t of tables) {
    const r = await c.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [t]
    );
    console.log(`\n=== ${t.toUpperCase()} ===`);
    console.table(r.rows);
  }

  // Last sign in from auth.users
  const lsi = await c.query(`SELECT email, last_sign_in_at, confirmed_at FROM auth.users ORDER BY last_sign_in_at DESC NULLS LAST`);
  console.log('\n=== LAST SIGN IN (auth.users) ===');
  console.table(lsi.rows.map(r => ({
    email: r.email,
    last_sign_in: r.last_sign_in_at,
    confirmed: !!r.confirmed_at
  })));

  // Credit point totals per user
  const credits = await c.query(`
    SELECT p.email, SUM(cpl.points) as total_points
    FROM credit_points_log cpl
    JOIN profiles p ON p.id = cpl.user_id
    GROUP BY p.email ORDER BY total_points DESC
  `);
  console.log('\n=== CREDIT POINTS TOTALS ===');
  console.table(credits.rows);

  await c.end();
}

run().catch(e => { console.error(e.message); c.end(); });
