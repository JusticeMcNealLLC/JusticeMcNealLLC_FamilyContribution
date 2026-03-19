// ═══════════════════════════════════════════════════════════
// Portal Events — Raffle Draw & Winner Display
// Digital raffle draw using crypto-random selection,
// celebration animation, and winner persistence.
// ═══════════════════════════════════════════════════════════

/* ── Open the Raffle Draw Modal ───────────────────────── */
async function evtOpenRaffleDraw(eventId) {
    const event = evtAllEvents.find(e => e.id === eventId);
    if (!event || !event.raffle_enabled) return;

    const modal = document.getElementById('raffleDrawModal');
    const content = document.getElementById('raffleDrawContent');
    if (!modal || !content) return;

    content.innerHTML = `<div class="text-center py-8"><div class="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto"></div><p class="text-sm text-gray-500 mt-3">Loading raffle pool…</p></div>`;
    evtToggleModal('raffleDrawModal', true);

    try {
        // Load all paid/valid raffle entries with profile info
        const { data: entries, error } = await supabaseClient
            .from('event_raffle_entries')
            .select('id, user_id, guest_token, profiles:user_id(first_name, last_name, profile_picture_url)')
            .eq('event_id', eventId)
            .eq('paid', true);

        if (error) throw error;

        // For paid events, also include entries where raffle is bundled (paid=true is already set by webhook)
        // For free events with raffle, only paid entries qualify
        const pool = entries || [];

        // Load existing winners to exclude them from pool
        const { data: existingWinners } = await supabaseClient
            .from('event_raffle_winners')
            .select('user_id, guest_token, place')
            .eq('event_id', eventId);
        const wonUserIds = new Set((existingWinners || []).map(w => w.user_id).filter(Boolean));
        const wonGuestTokens = new Set((existingWinners || []).map(w => w.guest_token).filter(Boolean));
        const alreadyDrawnCount = (existingWinners || []).length;

        const eligible = pool.filter(e =>
            !(e.user_id && wonUserIds.has(e.user_id)) &&
            !(e.guest_token && wonGuestTokens.has(e.guest_token))
        );

        const prizes = event.raffle_prizes || [];
        const winnerCount = event.raffle_winner_count || prizes.length || 1;
        const remainingDraws = Math.max(0, winnerCount - alreadyDrawnCount);

        // Render draw UI
        content.innerHTML = evtRenderDrawUI(eventId, eligible, prizes, alreadyDrawnCount, remainingDraws, existingWinners || []);

    } catch (err) {
        console.error('Raffle draw error:', err);
        content.innerHTML = `<div class="text-center py-8"><p class="text-sm text-red-600">Failed to load raffle pool. Please try again.</p></div>`;
    }
}

/* ── Render the Draw UI ──────────────────────────────── */
function evtRenderDrawUI(eventId, eligible, prizes, alreadyDrawnCount, remainingDraws, existingWinners) {
    // Show existing winners
    let winnersHtml = '';
    if (existingWinners.length > 0) {
        winnersHtml = `
        <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <h4 class="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Already Drawn</h4>
            ${existingWinners.map(w => `
                <div class="flex items-center gap-2 text-sm py-1">
                    <span class="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-bold">${w.place}</span>
                    <span class="text-gray-700">${w.user_id ? 'Member' : 'Guest'}</span>
                </div>
            `).join('')}
        </div>`;
    }

    if (remainingDraws <= 0) {
        return `
            <div class="text-center py-4">
                <span class="text-4xl">🏆</span>
                <h3 class="text-lg font-bold text-gray-900 mt-2">All Winners Drawn!</h3>
                <p class="text-sm text-gray-500 mt-1">The raffle is complete.</p>
            </div>
            ${winnersHtml}
            <button onclick="evtToggleModal('raffleDrawModal',false)" class="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition">Close</button>`;
    }

    const nextPlace = alreadyDrawnCount + 1;
    const nextPrize = prizes[nextPlace - 1];

    return `
        <div class="text-center">
            <span class="text-4xl">🎰</span>
            <h3 class="text-lg font-bold text-gray-900 mt-2">Raffle Draw</h3>
            <p class="text-sm text-gray-500 mt-1">${eligible.length} eligible entries • ${remainingDraws} draw${remainingDraws > 1 ? 's' : ''} remaining</p>
        </div>

        ${winnersHtml}

        <div class="mt-4 p-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl text-center">
            <p class="text-xs font-bold text-violet-600 uppercase tracking-wide">Drawing for Place #${nextPlace}</p>
            ${nextPrize ? `<p class="text-sm font-semibold text-gray-800 mt-1">${evtEscapeHtml(nextPrize.label || nextPrize)}</p>` : ''}
        </div>

        <div id="raffleAnimation" class="mt-4 h-20 flex items-center justify-center hidden">
            <div class="text-center">
                <div class="text-3xl animate-bounce" id="raffleEmoji">🎲</div>
                <p class="text-sm text-gray-500 mt-1 animate-pulse">Drawing…</p>
            </div>
        </div>
        <div id="raffleWinnerResult" class="mt-4 hidden"></div>

        ${eligible.length > 0 ? `
        <button id="drawWinnerBtn" onclick="evtDrawWinner('${eventId}', ${nextPlace})" class="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
            🎲 Draw Winner #${nextPlace}
        </button>` : `
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
            <p class="text-sm text-red-600 font-semibold">No eligible entries remaining</p>
        </div>`}

        <button onclick="evtToggleModal('raffleDrawModal',false)" class="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition">Close</button>`;
}

/* ── Draw a Winner (crypto-random) ───────────────────── */
async function evtDrawWinner(eventId, place) {
    const btn = document.getElementById('drawWinnerBtn');
    const animEl = document.getElementById('raffleAnimation');
    const resultEl = document.getElementById('raffleWinnerResult');
    if (btn) btn.disabled = true;

    // Show animation
    if (animEl) animEl.classList.remove('hidden');

    try {
        // Re-fetch eligible pool (prevent stale data)
        const { data: entries } = await supabaseClient
            .from('event_raffle_entries')
            .select('id, user_id, guest_token, profiles:user_id(first_name, last_name, profile_picture_url)')
            .eq('event_id', eventId)
            .eq('paid', true);

        const { data: existingWinners } = await supabaseClient
            .from('event_raffle_winners')
            .select('user_id, guest_token')
            .eq('event_id', eventId);

        const wonUserIds = new Set((existingWinners || []).map(w => w.user_id).filter(Boolean));
        const wonGuestTokens = new Set((existingWinners || []).map(w => w.guest_token).filter(Boolean));
        const eligible = (entries || []).filter(e =>
            !(e.user_id && wonUserIds.has(e.user_id)) &&
            !(e.guest_token && wonGuestTokens.has(e.guest_token))
        );

        if (eligible.length === 0) {
            if (resultEl) resultEl.innerHTML = `<p class="text-sm text-red-600 text-center font-semibold">No eligible entries!</p>`;
            resultEl?.classList.remove('hidden');
            if (animEl) animEl.classList.add('hidden');
            return;
        }

        // Crypto-random selection
        const randomIndex = evtCryptoRandomInt(eligible.length);
        const winner = eligible[randomIndex];

        // Simulate draw animation (1.5s)
        await new Promise(resolve => setTimeout(resolve, 1500));

        const event = evtAllEvents.find(e => e.id === eventId);
        const prizes = event?.raffle_prizes || [];
        const prizeDesc = prizes[place - 1]?.label || prizes[place - 1] || null;

        // Insert winner record
        const winnerRecord = {
            event_id: eventId,
            place: place,
            prize_description: prizeDesc,
        };

        if (winner.user_id) {
            winnerRecord.user_id = winner.user_id;
        } else {
            winnerRecord.guest_token = winner.guest_token;
        }

        const { error } = await supabaseClient
            .from('event_raffle_winners')
            .insert(winnerRecord);

        if (error) throw error;

        // Show winner with celebration
        const p = winner.profiles;
        let name = '';
        let initials = '?';
        let avatar = '';

        if (p) {
            name = `${p.first_name || ''} ${p.last_name || ''}`.trim();
            initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase();
            avatar = p.profile_picture_url
                ? `<img src="${p.profile_picture_url}" class="w-16 h-16 rounded-full object-cover border-4 border-amber-300 shadow-lg" alt="">`
                : `<div class="w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-300 shadow-lg flex items-center justify-center text-amber-700 text-xl font-bold">${initials}</div>`;
        } else if (winner.guest_token) {
            // Look up guest name
            const { data: guestInfo } = await supabaseClient
                .from('event_guest_rsvps')
                .select('guest_name')
                .eq('guest_token', winner.guest_token)
                .maybeSingle();
            name = guestInfo?.guest_name || 'Guest';
            initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
            avatar = `<div class="w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-300 shadow-lg flex items-center justify-center text-amber-700 text-xl font-bold">${initials}</div>`;
        } else {
            name = 'Unknown';
            avatar = `<div class="w-16 h-16 rounded-full bg-amber-100 border-4 border-amber-300 shadow-lg flex items-center justify-center text-amber-700 text-xl font-bold">?</div>`;
        }

        if (animEl) animEl.classList.add('hidden');
        if (resultEl) {
            resultEl.innerHTML = `
                <div class="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl shadow-lg animate-in">
                    <div class="text-3xl mb-2">🎉🏆🎉</div>
                    ${avatar}
                    <h4 class="text-lg font-extrabold text-gray-900 mt-3">${evtEscapeHtml(name)}</h4>
                    <p class="text-sm text-amber-700 font-semibold mt-1">${place}${evtOrdinalSuffix(place)} Place Winner!</p>
                    ${prizeDesc ? `<p class="text-sm text-gray-600 mt-1">🎁 ${evtEscapeHtml(prizeDesc)}</p>` : ''}
                </div>`;
            resultEl.classList.remove('hidden');
        }

        // Confetti burst
        evtCelebrate();

        // Replace draw button with "Next Draw" or "Done"
        if (btn) {
            const nextPlace = place + 1;
            const totalWinners = event?.raffle_winner_count || prizes.length || 1;
            if (nextPlace <= totalWinners) {
                btn.textContent = `🎲 Draw Winner #${nextPlace}`;
                btn.onclick = () => evtDrawWinner(eventId, nextPlace);
                btn.disabled = false;
            } else {
                btn.textContent = '🏆 All Winners Drawn!';
                btn.classList.replace('bg-violet-600', 'bg-emerald-600');
                btn.classList.replace('hover:bg-violet-700', 'hover:bg-emerald-700');
                btn.onclick = () => {
                    evtToggleModal('raffleDrawModal', false);
                    evtOpenDetail(eventId); // Refresh detail
                };
                btn.disabled = false;
            }
        }

    } catch (err) {
        console.error('Draw error:', err);
        if (animEl) animEl.classList.add('hidden');
        if (resultEl) {
            resultEl.innerHTML = `<p class="text-sm text-red-600 text-center font-semibold">Draw failed: ${err.message}</p>`;
            resultEl.classList.remove('hidden');
        }
        if (btn) btn.disabled = false;
    }
}

/* ── Crypto-Secure Random Integer ────────────────────── */
function evtCryptoRandomInt(max) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
}

/* ── Ordinal Suffix ──────────────────────────────────── */
function evtOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

/* ── Celebration Effect (confetti burst) ─────────────── */
function evtCelebrate() {
    const container = document.getElementById('raffleDrawContent') || document.body;
    const colors = ['#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#3b82f6', '#ec4899'];

    for (let i = 0; i < 60; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: ${4 + Math.random() * 6}px;
            height: ${4 + Math.random() * 6}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            top: 50%;
            left: ${10 + Math.random() * 80}%;
            opacity: 1;
            pointer-events: none;
            z-index: 100;
            animation: evtConfettiFall ${1 + Math.random() * 1.5}s ease-out forwards;
        `;
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        container.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }

    // Inject keyframes if not already present
    if (!document.getElementById('evtConfettiStyle')) {
        const style = document.createElement('style');
        style.id = 'evtConfettiStyle';
        style.textContent = `
            @keyframes evtConfettiFall {
                0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
                100% { transform: translateY(${150 + Math.random() * 100}px) rotate(${360 + Math.random() * 360}deg) scale(0.5); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

/* ── Close Raffle Draw Modal ─────────────────────────── */
function evtCloseRaffleDraw() {
    evtToggleModal('raffleDrawModal', false);
}
