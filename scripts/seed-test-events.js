// Seed test events for /portal/events visual testing.
// Inserts ~10 varied events as Justin. Run with: node scripts/seed-test-events.js
// Cleanup: node scripts/seed-test-events.js --clean
const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres:N1Svp3ECWO0m8TKu@db.jcrsfzcabzdeqixbewgf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

const TAG = '[seed-test-events]'; // marker in description for cleanup

const NOW = new Date();
const addDays = (d) => new Date(NOW.getTime() + d * 86400000);
const setTime = (d, h, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };

const BANNERS = [
  'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80', // birthday cake
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80', // concert
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80', // classroom
  'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1200&q=80', // string lights
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=80',   // raffle tickets
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80', // dinner
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80', // sunset
  'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80', // park
];

function buildEvents(creatorId) {
  return [
    { event_type:'llc',         category:'celebration',   title:'Birthday Cook Out',           start: setTime(addDays(0), 19, 30), location_text:'The Grove Park',         location_nickname:'The Grove Park',     banner: BANNERS[0], desc:'Join us for food, music, and good vibes as we celebrate together!' },
    { event_type:'member',      category:'social',        title:'Movie Night Under the Stars', start: setTime(addDays(1), 20, 0),  location_text:'Backyard Patio',          location_nickname:'Backyard',           banner: BANNERS[3], desc:'Outdoor screening with snacks. Bring a chair!' },
    { event_type:'competition', category:'raffle',        title:'Spring Raffle Draw',          start: setTime(addDays(2), 18, 0),  location_text:'Community Hall',          location_nickname:'Community Hall',     banner: BANNERS[4], desc:'$10 entry. Three prizes drawn live.' },
    { event_type:'llc',         category:'meeting',       title:'Quarterly Members Meeting',   start: setTime(addDays(5), 19, 0),  location_text:'Main Office',             location_nickname:'HQ',                 banner: BANNERS[2], desc:'Q2 financials, upcoming projects, open floor.' },
    { event_type:'member',      category:'food',          title:'Family Potluck Dinner',       start: setTime(addDays(7), 17, 30), location_text:'Mom\u2019s House',         location_nickname:'Mom House',          banner: BANNERS[5], desc:'Bring a dish. We supply drinks and dessert.' },
    { event_type:'competition', category:'sports',        title:'Saturday Pickup Basketball',  start: setTime(addDays(9), 11, 0),  location_text:'Fayetteville Park Court', location_nickname:'Fayetteville Park',  banner: BANNERS[7], desc:'5 on 5, winners stay. All skill levels.' },
    { event_type:'llc',         category:'fundraiser',    title:'Annual Charity Cookout',      start: setTime(addDays(14), 16, 0), location_text:'Riverside Pavilion',      location_nickname:'Riverside',          banner: BANNERS[1], desc:'Live music, raffle, BBQ \u2014 proceeds to scholarship fund.' },
    { event_type:'member',      category:'celebration',   title:'Graduation Party',            start: setTime(addDays(20), 18, 0), location_text:'Central Park Lawn',       location_nickname:'Central Park',       banner: BANNERS[6], desc:'Celebrating our graduates! Cake at 7pm.' },
    { event_type:'llc',         category:'workshop',      title:'Investing 101 Workshop',      start: setTime(addDays(28), 18, 30),location_text:'Library Conference Room', location_nickname:'Library',            banner: BANNERS[2], desc:'Intro to index funds, dollar-cost averaging, and Roth IRAs.' },
    { event_type:'competition', category:'raffle',        title:'Holiday Mega Raffle',         start: setTime(addDays(45), 19, 0), location_text:'Grand Hall',              location_nickname:'Grand Hall',         banner: BANNERS[4], desc:'$25 entry. Five-figure prize pool. Must be present to win.' },
  ].map((e, i) => ({
    ...e,
    slug: 'seed-' + Date.now().toString(36) + '-' + i,
    created_by: creatorId,
  }));
}

(async () => {
  await c.connect();
  const me = await c.query("select id from profiles where email='mcneal.justin99@gmail.com'");
  if (!me.rows[0]) throw new Error('Justin profile not found');
  const creatorId = me.rows[0].id;

  if (process.argv.includes('--clean')) {
    const res = await c.query("delete from events where gated_notes = $1 or description like $2 returning id", [TAG, '%' + TAG + '%']);
    console.log(`${TAG} cleaned ${res.rowCount} rows`);
    await c.end();
    return;
  }

  const events = buildEvents(creatorId);
  let inserted = 0;
  for (const e of events) {
    await c.query(
      `insert into events
        (created_by, event_type, category, title, slug, description, gated_notes, banner_url, start_date,
         end_date, location_text, location_nickname, status, pricing_mode, member_only)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'open','free',false)
       on conflict (slug) do nothing`,
      [
        e.created_by, e.event_type, e.category, e.title, e.slug,
        e.desc,
        TAG,
        e.banner,
        e.start.toISOString(),
        new Date(e.start.getTime() + 2 * 3600 * 1000).toISOString(),
        e.location_text, e.location_nickname,
      ]
    );
    inserted++;
  }
  console.log(`${TAG} inserted ${inserted} events for ${creatorId}`);
  await c.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
