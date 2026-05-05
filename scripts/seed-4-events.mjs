// seed-4-events.mjs — inserts 4 test events via Supabase REST API (no pg driver needed)
// Run: node scripts/seed-4-events.mjs
// Clean up: node scripts/seed-4-events.mjs --clean

const SUPABASE_URL  = 'https://jcrsfzcabzdeqixbewgf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcnNmemNhYnpkZXFpeGJld2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NDI0MzEsImV4cCI6MjA4NDAxODQzMX0.yZvjcuMUqf-0ktDeh_wWhd9vuar2htDeE279sUHPNpA';
const EMAIL    = 'mcneal.justin99@gmail.com';
const PASSWORD = 'Monday23!';
const TAG      = '[seed-4]';

const h = (tok) => ({
    'Content-Type':  'application/json',
    'apikey':        SUPABASE_ANON,
    'Authorization': `Bearer ${tok}`,
    'Prefer':        'return=representation',
});

async function api(path, method = 'GET', body, tok) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        method,
        headers: h(tok),
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
    return text ? JSON.parse(text) : null;
}

// Sign in and get access token
async function signIn() {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const data = await res.json();
    if (!data.access_token) throw new Error('Sign-in failed: ' + JSON.stringify(data));
    return data.access_token;
}

const NOW = Date.now();
const addDays = (d) => new Date(NOW + d * 86400000).toISOString();

const EVENTS = [
    {
        title:             'Rooftop Cookout',
        event_type:        'member',
        category:          'social',
        start_date:        addDays(2),
        end_date:          addDays(2),
        location_text:     'Downtown Rooftop Venue',
        location_nickname: 'The Rooftop',
        banner_url:        'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80',
        description:       `${TAG} Good food, great views, and even better people. Bring an appetite.`,
        member_only:       false,
        status:            'open',
        raffle_entry_cost_cents: null,
    },
    {
        title:             'Game Night',
        event_type:        'member',
        category:          'social',
        start_date:        addDays(5),
        end_date:          addDays(5),
        location_text:     'Family Lounge',
        location_nickname: 'Family Lounge',
        banner_url:        'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80',
        description:       `${TAG} Board games, card games, and snacks all night. Friendly competition encouraged.`,
        member_only:       false,
        status:            'open',
        raffle_entry_cost_cents: null,
    },
    {
        title:             'Investing 101 Workshop',
        event_type:        'llc',
        category:          'workshop',
        start_date:        addDays(10),
        end_date:          addDays(10),
        location_text:     'Library Conference Room',
        location_nickname: 'Library',
        banner_url:        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80',
        description:       `${TAG} Index funds, Roth IRAs, and dollar-cost averaging. Beginner-friendly session.`,
        member_only:       false,
        status:            'open',
        raffle_entry_cost_cents: null,
    },
    {
        title:             'Spring Raffle Draw',
        event_type:        'competition',
        category:          'raffle',
        start_date:        addDays(15),
        end_date:          addDays(15),
        location_text:     'Community Hall',
        location_nickname: 'Community Hall',
        banner_url:        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=80',
        description:       `${TAG} Three prizes drawn live. Must be present to win.`,
        member_only:       false,
        status:            'open',
        raffle_entry_cost_cents: 1000,
    },
];

const isClean = process.argv.includes('--clean');

(async () => {
    const tok = await signIn();
    console.log('Signed in ✓');

    // Get creator profile id
    const [profile] = await api(`/profiles?email=eq.${encodeURIComponent(EMAIL)}&select=id`, 'GET', undefined, tok);
    if (!profile) throw new Error('Profile not found');
    const creatorId = profile.id;

    if (isClean) {
        // Delete events whose description contains the tag
        const existing = await api(`/events?description=ilike.*${encodeURIComponent(TAG)}*&select=id,title`, 'GET', undefined, tok);
        if (!existing.length) { console.log('Nothing to clean.'); return; }
        for (const ev of existing) {
            await api(`/events?id=eq.${ev.id}`, 'DELETE', undefined, tok);
            console.log('Deleted:', ev.title);
        }
        console.log('Clean done.');
        return;
    }

    const rows = EVENTS.map((e, i) => ({
        ...e,
        created_by: creatorId,
        slug: `seed4-${Date.now().toString(36)}-${i}`,
    }));

    const inserted = await api('/events', 'POST', rows, tok);
    console.log(`Inserted ${inserted.length} events:`);
    inserted.forEach(e => console.log(' •', e.title, `(${e.id})`));
})().catch(err => { console.error(err.message); process.exit(1); });
