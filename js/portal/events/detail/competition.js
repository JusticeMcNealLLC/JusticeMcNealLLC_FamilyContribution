import { evtDataAction } from '../core/actions.js';
// ═══════════════════════════════════════════════════════════
// Portal Events — Detail competition module
// Handles registration, entry submission, voting, phase
// management, results display, and prize pool UI.
// ═══════════════════════════════════════════════════════════

// ─── Build Competition HTML for Detail Modal ────────────

async function evtBuildCompetitionHtml(event, isHost) {
    if (event.event_type !== 'competition') return '';

    try {
    const config = event.competition_config || {};
    const eventId = event.id;
    const compPh = window.EventsCompetitionPhases || {};

    const phasesRes = await supabaseClient
        .from('competition_phases')
        .select('*')
        .eq('event_id', eventId)
        .order('phase_num', { ascending: true });
    if (phasesRes.error) throw phasesRes.error;

    const entriesRes = await supabaseClient
        .from('competition_entries')
        .select('*, profiles:user_id(first_name, last_name, profile_picture_url)')
        .eq('event_id', eventId)
        .eq('moderated', false)
        .order('submitted_at', { ascending: true });
    if (entriesRes.error) throw entriesRes.error;

    const phases = phasesRes.data;
    const entries = entriesRes.data;

    const myEntry = (entries || []).find(e => e.user_id === globalThis.evtCurrentUser.id);

    const myVoteRes = await supabaseClient
        .from('competition_votes')
        .select('entry_id')
        .eq('event_id', eventId)
        .eq('voter_id', globalThis.evtCurrentUser.id)
        .maybeSingle();
    if (myVoteRes.error) throw myVoteRes.error;
    const myVote = myVoteRes.data;

    const winnersRes = await supabaseClient
        .from('competition_winners')
        .select('*, profiles:user_id(first_name, last_name, profile_picture_url), competition_entries!competition_winners_entry_id_fkey(title)')
        .eq('event_id', eventId)
        .order('place', { ascending: true });
    if (winnersRes.error) throw winnersRes.error;
    const winners = winnersRes.data;

    const contribCountRes = await supabaseClient
        .from('prize_pool_contributions')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId);
    if (contribCountRes.error) throw contribCountRes.error;
    const contributionCount = contribCountRes.count;

    const now = new Date();
    const phaseList = compPh.normalizePhases ? compPh.normalizePhases(phases) : (phases || []);
    const displayPhaseNum = compPh.resolveDisplayPhase
        ? compPh.resolveDisplayPhase(phaseList, now)
        : ((phases || []).find((p) => p.status === 'active' || p.status === 'extended')?.phase_num || 0);
    const phase2 = compPh.getPhase ? compPh.getPhase(phaseList, 2) : null;
    const phase3 = compPh.getPhase ? compPh.getPhase(phaseList, 3) : null;
    const submissionOpen = compPh.isSubmissionOpen ? compPh.isSubmissionOpen(phaseList, now) : false;
    const votingOpen = compPh.isVotingOpen ? compPh.isVotingOpen(phaseList, now) : false;
    const windowLabel = compPh.submissionWindowLabel
        ? compPh.submissionWindowLabel(phase2, now)
        : { state: 'not_configured', message: '' };
    const votingLabel = compPh.votingWindowLabel
        ? compPh.votingWindowLabel(phase3, now)
        : { state: 'not_configured', message: '' };
    const rsvpMap = window.evtAllRsvps || globalThis.evtAllRsvps || {};
    const rsvp = rsvpMap[eventId];
    const hasRsvp = typeof globalThis.evtIsCommittedGoing === 'function'
        ? window.evtIsCommittedGoing(event, rsvp)
        : (window.EventsHelpers?.rsvpIsCommittedGoing?.(event, rsvp)
            || (event?.pricing_mode === 'paid'
                ? !!(rsvp && rsvp.paid === true)
                : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true))));
    const voterCtx = { hasRsvp, hasCompEntry: !!myEntry };
    const voterEligible = compPh.isVoterEligible ? compPh.isVoterEligible(config, voterCtx) : true;
    const voterIneligibleMsg = compPh.voterEligibilityMessage
        ? compPh.voterEligibilityMessage(config)
        : '';

    const entryList = entries || [];
    const winnerList = winners || [];

    // ── Phase Timeline ──────────────────────────────────
    const phaseTimelineHtml = phaseList.length ? phaseList.map(p => {
        const isActive = p.status === 'active' || p.status === 'extended';
        const isCompleted = p.status === 'completed';
        const isCancelled = p.status === 'cancelled';

        const statusIcon = isCompleted ? '✅' : isActive ? '🔵' : isCancelled ? '❌' : '⏳';
        const statusColor = isCompleted ? 'text-emerald-600' : isActive ? 'text-blue-600' : isCancelled ? 'text-red-500' : 'text-gray-400';
        const bgColor = isActive ? 'bg-blue-50 border-blue-200' : isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200';

        const startStr = p.starts_at
            ? (compPh.formatPhaseDate ? compPh.formatPhaseDate(p.starts_at) : new Date(p.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
            : '—';
        const endStr = p.ends_at
            ? (compPh.formatPhaseDate ? compPh.formatPhaseDate(p.ends_at) : new Date(p.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))
            : '—';

        // Countdown for active phase
        let countdownHtml = '';
        if (isActive && p.ends_at) {
            const msLeft = new Date(p.ends_at) - now;
            if (msLeft > 0) {
                const daysLeft = Math.floor(msLeft / 86400000);
                const hoursLeft = Math.floor((msLeft % 86400000) / 3600000);
                countdownHtml = `<span class="text-xs font-bold text-blue-700 ml-2">${daysLeft > 0 ? daysLeft + 'd ' : ''}${hoursLeft}h left</span>`;
            }
        }

        return `
            <div class="flex items-center gap-3 p-2.5 rounded-xl border ${bgColor}">
                <span class="text-base">${statusIcon}</span>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                        <span class="text-sm font-semibold ${statusColor}">${p.name}</span>
                        ${p.status === 'extended' ? '<span class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Extended</span>' : ''}
                        ${countdownHtml}
                    </div>
                    <p class="text-xs text-gray-500">${startStr} → ${endStr}</p>
                </div>
            </div>`;
    }).join('') : `
        <div class="p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <p class="text-sm font-semibold text-gray-700">Competition phases not configured</p>
            <p class="text-xs text-gray-500 mt-0.5">Edit the event or set submission/voting windows in Manage → Comp.</p>
        </div>`;

    // ── Prize Pool Section ──────────────────────────────
    const totalPool = event.total_prize_pool_cents || 0;
    const entryFee = config.entry_fee_cents || 0;
    const housePct = config.house_pct || 0;
    const netPool = Math.round(totalPool * (1 - housePct / 100));

    let prizePoolHtml = `
        <div class="mt-4 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <span class="text-lg">💰</span>
                    <h4 class="text-sm font-bold text-gray-800">Prize Pool</h4>
                </div>
                <span class="text-lg font-extrabold text-amber-700">${formatCurrency(totalPool)}</span>
            </div>
            ${housePct > 0 ? `<p class="text-xs text-gray-500 mb-1">${housePct}% house fee → Net payout: <strong>${formatCurrency(netPool)}</strong></p>` : ''}
            ${entryFee > 0 ? `<p class="text-xs text-gray-400">${formatCurrency(entryFee)} entry fee × ${entryList.length} entries = ${formatCurrency(entryFee * entryList.length)} from fees</p>` : ''}
            <p class="text-xs text-gray-400">${contributionCount || 0} community contributions</p>
            <button ${evtDataAction('evtContributeToPrizePool', eventId)} class="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5">
                💸 Contribute to Prize Pool
            </button>
        </div>`;

    // ── Winner Tier Config Display ──────────────────────
    const tiers = event.winner_tier_config || [{ place: 1, pct: 100 }];
    let tierHtml = '';
    if (tiers.length > 0 && netPool > 0) {
        const tierEmoji = ['🥇', '🥈', '🥉'];
        tierHtml = `
            <div class="mt-2 flex items-center gap-2 flex-wrap">
                ${tiers.map(t => `<span class="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">${tierEmoji[t.place - 1] || ''} ${t.pct}% = ${formatCurrency(Math.round(netPool * t.pct / 100))}</span>`).join('')}
            </div>`;
    }

    // ── Phase 1: Registration ───────────────────────────
    let registrationHtml = '';
    if (displayPhaseNum <= 1) {
        if (myEntry) {
            registrationHtml = `
                <div class="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                    <span class="text-lg">✅</span>
                    <div>
                        <p class="text-sm font-bold text-emerald-700">You're registered as a competitor!</p>
                        <p class="text-xs text-emerald-600">Your entry will be submitted in Phase 2.</p>
                    </div>
                </div>`;
        } else {
            registrationHtml = `
                <div class="mt-4">
                    <button ${evtDataAction('evtJoinCompetition', eventId)} class="w-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                        🏆 Join as Competitor${entryFee > 0 ? ` — ${formatCurrency(entryFee)}` : ''}
                    </button>
                    <p class="text-xs text-gray-400 text-center mt-1">${entryList.length} competitor${entryList.length !== 1 ? 's' : ''} registered</p>
                </div>`;
        }
    }

    // ── Phase 2: Entry Submission ────────────────────────
    let submissionHtml = '';
    if (myEntry) {
        const hasSubmission = compPh.entryHasSubmission ? compPh.entryHasSubmission(myEntry) : !!(myEntry.file_url || myEntry.external_url);
        if (hasSubmission) {
            submissionHtml = `
                <div class="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p class="text-sm font-bold text-emerald-700">✅ Entry Submitted: "${evtEscapeHtml(myEntry.title)}"</p>
                    <p class="text-xs text-emerald-600 mt-0.5">Submitted ${new Date(myEntry.submitted_at).toLocaleDateString()}</p>
                </div>`;
        } else if (submissionOpen) {
            submissionHtml = evtBuildSubmitFormHtml(eventId, config);
        } else if (windowLabel.state === 'upcoming') {
            submissionHtml = `
                <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p class="text-sm font-semibold text-amber-800">⏳ Submissions not open yet</p>
                    <p class="text-xs text-amber-700 mt-0.5">${evtEscapeHtml(windowLabel.message)}</p>
                </div>`;
        } else if (windowLabel.state === 'closed') {
            submissionHtml = `
                <div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <p class="text-sm font-semibold text-gray-700">🔒 Submission window closed</p>
                    <p class="text-xs text-gray-500 mt-0.5">${evtEscapeHtml(windowLabel.message)}</p>
                </div>`;
        } else if (windowLabel.state === 'not_configured') {
            submissionHtml = `
                <div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <p class="text-sm font-semibold text-gray-700">Submission window pending</p>
                    <p class="text-xs text-gray-500 mt-0.5">The host has not configured submission dates yet.</p>
                </div>`;
        } else {
            submissionHtml = `
                <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p class="text-sm font-semibold text-amber-800">Submission window scheduled</p>
                    <p class="text-xs text-amber-700 mt-0.5">${evtEscapeHtml(windowLabel.message)}</p>
                </div>`;
        }
    }

    // ── Entry Gallery ───────────────────────────────────
    let galleryHtml = '';
    const showEntries = config.entries_visible_before_voting || displayPhaseNum >= 3;
    if (showEntries && entryList.length > 0) {
        const entryCards = (await Promise.all(entryList.map(async (entry) => {
            const p = entry.profiles;
            const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown';
            const initials = ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase();
            const avatar = p?.profile_picture_url
                ? `<img src="${p.profile_picture_url}" class="w-8 h-8 rounded-full object-cover" alt="">`
                : `<div class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xs font-bold">${initials}</div>`;

            const isVoted = myVote?.entry_id === entry.id;
            const voteCountDisplay = (config.vote_tally_visible || votingOpen || displayPhaseNum >= 4)
                ? `<span class="text-xs text-gray-500">${entry.vote_count} vote${entry.vote_count !== 1 ? 's' : ''}</span>`
                : '';

            let contentPreview = '';
            if (entry.entry_type === 'file' && entry.file_url) {
                const resolvedUrl = compPh.resolveCompEntryFileUrl
                    ? await compPh.resolveCompEntryFileUrl(entry.file_url)
                    : entry.file_url;
                if (entry.mime_type?.startsWith('image/') && resolvedUrl) {
                    contentPreview = `<img src="${resolvedUrl}" class="w-full h-32 object-cover rounded-lg mt-2" alt="">`;
                } else if (resolvedUrl) {
                    contentPreview = `<a href="${resolvedUrl}" target="_blank" rel="noopener" class="mt-2 inline-block text-xs text-primary font-semibold hover:underline">📎 Download ${evtEscapeHtml(entry.file_name || 'file')}</a>`;
                } else {
                    contentPreview = `<div class="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-500">📎 ${evtEscapeHtml(entry.file_name || 'File')}</div>`;
                }
            } else if (entry.entry_type === 'link' && entry.external_url) {
                contentPreview = `<a href="${entry.external_url}" target="_blank" rel="noopener" class="mt-2 block text-xs text-blue-600 hover:underline truncate">🔗 ${evtEscapeHtml(entry.external_url)}</a>`;
            }

            let voteBtn = '';
            if (votingOpen && voterEligible && !myVote && entry.user_id !== globalThis.evtCurrentUser.id) {
                voteBtn = `<button ${evtDataAction('evtCastVote', eventId, entry.id)} class="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">Vote</button>`;
            } else if (isVoted) {
                voteBtn = `<div class="mt-2 text-center text-xs font-bold text-blue-600">✓ Your Vote</div>`;
            }

            let modBtn = '';
            if (isHost && displayPhaseNum < 3) {
                modBtn = `<button ${evtDataAction('evtModerateEntry', eventId, entry.id)} class="mt-1 text-xs text-red-400 hover:text-red-600">Remove Entry</button>`;
            }

            const winnerEntry = winnerList.find(w => w.entry_id === entry.id);
            const winnerBadge = winnerEntry ? `<span class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">${['🥇', '🥈', '🥉'][winnerEntry.place - 1] || ''} ${winnerEntry.place === 1 ? '1st' : winnerEntry.place === 2 ? '2nd' : '3rd'} Place</span>` : '';

            return `
                <div class="bg-white border border-gray-200 rounded-xl p-3 ${winnerEntry ? 'ring-2 ring-amber-400' : ''}">
                    <div class="flex items-center gap-2 mb-1">
                        ${avatar}
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-gray-800 truncate">${evtEscapeHtml(name)}</p>
                            <p class="text-xs text-gray-400">${evtEscapeHtml(entry.title)}</p>
                        </div>
                        ${winnerBadge}
                    </div>
                    ${entry.description ? `<p class="text-xs text-gray-600 mt-1 line-clamp-3">${evtEscapeHtml(entry.description)}</p>` : ''}
                    ${contentPreview}
                    <div class="flex items-center justify-between mt-2">
                        ${voteCountDisplay}
                        ${modBtn}
                    </div>
                    ${voteBtn}
                </div>`;
        }))).join('');

        galleryHtml = `
            <div class="mt-5">
                <h4 class="text-sm font-bold text-gray-700 mb-3">📋 Entries (${entryList.length})</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${entryCards}</div>
            </div>`;
    } else if (!showEntries && displayPhaseNum < 3 && entryList.length > 0) {
        galleryHtml = `
            <div class="mt-5 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <p class="text-sm font-semibold text-gray-700">Entries hidden until voting</p>
                <p class="text-xs text-gray-500 mt-0.5">${entryList.length} competitor${entryList.length !== 1 ? 's' : ''} registered — gallery opens when voting begins.</p>
            </div>`;
    }

    // ── Phase 3: Voting Status ──────────────────────────
    let votingStatusHtml = '';
    if (votingOpen || displayPhaseNum === 3 || votingLabel.state !== 'not_configured') {
        if (myVote) {
            votingStatusHtml = `
                <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
                    <span class="text-lg">🗳️</span>
                    <p class="text-sm font-semibold text-blue-700">You've cast your vote!</p>
                </div>`;
        } else if (!voterEligible) {
            votingStatusHtml = `
                <div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <p class="text-sm font-semibold text-gray-700">Voting restricted</p>
                    <p class="text-xs text-gray-500 mt-0.5">${evtEscapeHtml(voterIneligibleMsg)}</p>
                </div>`;
        } else if (votingOpen && myEntry) {
            votingStatusHtml = `
                <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                    <span class="text-lg">⚠️</span>
                    <p class="text-sm text-amber-700">You can't vote for your own entry, but you can vote for others!</p>
                </div>`;
        } else if (votingLabel.state === 'upcoming') {
            votingStatusHtml = `
                <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p class="text-sm font-semibold text-amber-800">⏳ Voting not open yet</p>
                    <p class="text-xs text-amber-700 mt-0.5">${evtEscapeHtml(votingLabel.message)}</p>
                </div>`;
        } else if (votingLabel.state === 'closed' && !myVote) {
            votingStatusHtml = `
                <div class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <p class="text-sm font-semibold text-gray-700">🔒 Voting window closed</p>
                    <p class="text-xs text-gray-500 mt-0.5">${evtEscapeHtml(votingLabel.message)}</p>
                </div>`;
        } else if (votingLabel.state === 'scheduled' && !votingOpen) {
            votingStatusHtml = `
                <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p class="text-sm font-semibold text-amber-800">Voting window scheduled</p>
                    <p class="text-xs text-amber-700 mt-0.5">${evtEscapeHtml(votingLabel.message)}</p>
                </div>`;
        } else if (votingOpen) {
            votingStatusHtml = `
                <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <p class="text-sm font-semibold text-blue-800">🗳️ Voting is open</p>
                    <p class="text-xs text-blue-700 mt-0.5">${evtEscapeHtml(votingLabel.message)}</p>
                </div>`;
        }
    }

    // ── Min Entries Threshold ────────────────────────────
    let thresholdHtml = '';
    if (config.min_entries && displayPhaseNum <= 2) {
        const current = entryList.length;
        const needed = config.min_entries;
        const pct = Math.min(100, Math.round((current / needed) * 100));
        const met = current >= needed;

        thresholdHtml = `
            <div class="mt-3 p-3 ${met ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} border rounded-xl">
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-xs font-semibold ${met ? 'text-emerald-700' : 'text-amber-700'}">${met ? '✅ Minimum entries met!' : '⚠️ Minimum entries needed'}</span>
                    <span class="text-xs text-gray-500">${current} / ${needed}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div class="${met ? 'bg-emerald-500' : 'bg-amber-500'} h-2 rounded-full transition-all" style="width:${pct}%"></div>
                </div>
                ${!met ? `<p class="text-xs text-amber-600 mt-1">If not met, competition may be extended ${config.extension_days || 3} days or cancelled. Entry fees are not refunded in-app.</p>` : ''}
            </div>`;
    }

    // ── Phase 4: Results & Winners ──────────────────────
    let resultsHtml = '';
    if (displayPhaseNum >= 4 || winnerList.length > 0) {
        if (winnerList.length > 0) {
            const tierEmoji = ['🥇', '🥈', '🥉'];
            const winnerCards = winnerList.map(w => {
                const p = w.profiles;
                const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown';
                const entryTitle = w.competition_entries?.title || '';
                return `
                    <div class="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <span class="text-2xl">${tierEmoji[w.place - 1] || '🏅'}</span>
                        <div class="flex-1">
                            <p class="text-sm font-bold text-gray-900">${evtEscapeHtml(name)}</p>
                            <p class="text-xs text-gray-500">"${evtEscapeHtml(entryTitle)}"</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-extrabold text-amber-700">${formatCurrency(w.prize_amount_cents)}</p>
                            <p class="text-xs text-gray-400">${w.payout_status}</p>
                        </div>
                    </div>`;
            }).join('');

            resultsHtml = `
                <div class="mt-5">
                    <h4 class="text-sm font-bold text-gray-700 mb-3">🏆 Winners</h4>
                    <div class="space-y-2">${winnerCards}</div>
                </div>`;
        } else if (displayPhaseNum >= 4 && isHost) {
            const rankedPreview = [...entryList]
                .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
                .slice(0, 5)
                .map((entry, idx) => {
                    const p = entry.profiles;
                    const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Member';
                    return `<div class="flex items-center justify-between text-xs py-1"><span>#${idx + 1} ${evtEscapeHtml(name)} — ${evtEscapeHtml(entry.title || 'Entry')}</span><strong>${entry.vote_count || 0} votes</strong></div>`;
                }).join('');
            resultsHtml = `
                <div class="mt-4">
                    ${rankedPreview ? `<div class="mb-3 p-3 bg-white border border-gray-200 rounded-xl"><p class="text-xs font-bold text-gray-600 mb-2">Current standings (by votes)</p>${rankedPreview}</div>` : ''}
                    <button ${evtDataAction('evtFinalizeCompetition', eventId)} class="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                        🏆 Finalize Results & Announce Winners
                    </button>
                </div>`;
        }
    }

    // ── Host Phase Management ────────────────────────────
    let phaseControlHtml = '';
    if (isHost) {
        const nextPhase = phaseList.find(p => p.status === 'pending');
        const activeP = phaseList.find(p => p.status === 'active' || p.status === 'extended');

        let buttons = '';
        if (activeP && !nextPhase) {
            // All phases done or only active remaining
        }
        if (activeP) {
            buttons += `<button ${evtDataAction('evtAdvancePhase', eventId, activeP.phase_num)} class="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition">Complete Phase ${activeP.phase_num} → Next</button>`;
            if (activeP.phase_num === 2 && !activeP.extended_once) {
                buttons += `<button ${evtDataAction('evtExtendPhase', eventId, activeP.phase_num)} class="bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-amber-600 transition">Extend ${config.extension_days || 3} Days</button>`;
            }
        }
        if (!activeP && nextPhase) {
            buttons += `<button ${evtDataAction('evtStartPhase', eventId, nextPhase.phase_num)} class="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition">Start Phase ${nextPhase.phase_num}: ${nextPhase.name}</button>`;
        }

        if (buttons) {
            phaseControlHtml = `
                <div class="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                    <h5 class="text-xs font-bold text-rose-700 uppercase tracking-wide mb-2">Phase Management</h5>
                    <div class="flex flex-wrap gap-2">${buttons}</div>
                </div>`;
        }
    }

    // ── Assemble Full Section ────────────────────────────
    return `
        <div id="competition-section" class="mt-6 p-4 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🏆</span>
                <h4 class="text-sm font-bold text-gray-800">Competition</h4>
                <span class="ml-auto text-xs text-gray-500">${entryList.length} entrant${entryList.length !== 1 ? 's' : ''}</span>
            </div>

            <!-- Phase Timeline -->
            <div class="space-y-2">${phaseTimelineHtml}</div>

            ${thresholdHtml}
            ${registrationHtml}
            ${submissionHtml}
            ${votingStatusHtml}
            ${phaseControlHtml}
        </div>
        ${prizePoolHtml}
        ${tierHtml}
        ${galleryHtml}
        ${resultsHtml}
    `;
    } catch (err) {
        console.error('evtBuildCompetitionHtml:', err);
        return `
            <div id="competition-section" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p class="text-sm font-semibold text-red-800">Could not load competition</p>
                <p class="text-xs text-red-600 mt-1">${evtEscapeHtml(err.message || 'Please refresh and try again.')}</p>
            </div>`;
    }
}

// ─── Build Submit Entry Form HTML ───────────────────────

function evtBuildSubmitFormHtml(eventId, config) {
    const entryType = config.entry_type || 'any';
    const maxMb = Number(config.max_file_size_mb) > 0 ? Number(config.max_file_size_mb) : 10;

    const fileInput = (entryType === 'file' || entryType === 'any') ? `
        <div id="compFileGroup">
            <label class="text-xs text-gray-600 font-semibold">Upload GFX${entryType === 'file' ? ' *' : ''}</label>
            <input type="file" id="compEntryFile" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf,video/*"
                   class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <p class="text-xs text-gray-400 mt-0.5">PNG, JPG, WebP, SVG, PDF, or video · Images/PDFs max ${maxMb}MB · Video max 50MB</p>
        </div>` : '';

    const linkInput = (entryType === 'link' || entryType === 'any') ? `
        <div>
            <label class="text-xs text-gray-600 font-semibold">External Link${entryType === 'link' ? ' *' : ''}</label>
            <input type="url" id="compEntryLink" placeholder="https://..."
                   class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
        </div>` : '';

    return `
        <div class="mt-4 p-4 bg-white border border-rose-200 rounded-xl space-y-3">
            <h5 class="text-sm font-bold text-gray-800">📤 Submit Your Entry</h5>
            <div>
                <label class="text-xs text-gray-600 font-semibold">Entry Title *</label>
                <input type="text" id="compEntryTitle" maxlength="120" placeholder="Name your entry"
                       class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            </div>
            <div>
                <label class="text-xs text-gray-600 font-semibold">Description</label>
                <textarea id="compEntryDesc" rows="2" maxlength="1000" placeholder="Describe your entry..."
                          class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"></textarea>
            </div>
            ${fileInput}
            ${linkInput}
            <button id="compSubmitBtn" ${evtDataAction('evtSubmitEntry', eventId)} class="w-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition">
                Submit Entry
            </button>
        </div>`;
}

// ─── Join Competition (Register as Competitor) ──────────

async function evtJoinCompetition(eventId) {
    try {
        const event = globalThis.evtAllEvents.find(e => e.id === eventId);
        const config = event?.competition_config || {};
        const entryFee = config.entry_fee_cents || 0;
        const compPh = window.EventsCompetitionPhases || {};

        const { data: phases, error: phasesErr } = await supabaseClient
            .from('competition_phases')
            .select('*')
            .eq('event_id', eventId)
            .order('phase_num', { ascending: true });
        if (phasesErr) throw phasesErr;

        if (compPh.isRegistrationOpen && !compPh.isRegistrationOpen(phases, new Date())) {
            alert('Registration is not open for this competition. Check the phase timeline for open dates.');
            return;
        }

        if (entryFee > 0) {
            // Redirect to Stripe checkout for entry fee
            const { data, error } = await callEdgeFunction('create-event-checkout', {
                event_id: eventId,
                type: 'competition_entry',
            });
            if (error) throw new Error(error);
            if (data?.url) window.location.href = data.url;
            return;
        }

        // Free registration — insert directly
        const { error } = await supabaseClient
            .from('competition_entries')
            .insert({
                event_id: eventId,
                user_id: globalThis.evtCurrentUser.id,
                title: 'Registered',
                entry_type: 'text',
            });

        if (error) {
            if (error.code === '23505') {
                alert('You are already registered for this competition!');
                return;
            }
            throw error;
        }

        alert('You are registered! Submit your entry when Phase 2 opens.');
        globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Join competition error:', err);
        alert(`Failed to join: ${err.message}`);
    }
}

// ─── Submit Entry ───────────────────────────────────────

async function evtSubmitEntry(eventId) {
    try {
        const event = globalThis.evtAllEvents.find(e => e.id === eventId);
        const config = event?.competition_config || {};
        const compPh = window.EventsCompetitionPhases || {};

        const { data: phases } = await supabaseClient
            .from('competition_phases')
            .select('*')
            .eq('event_id', eventId)
            .order('phase_num', { ascending: true });

        if (compPh.isSubmissionOpen && !compPh.isSubmissionOpen(phases, new Date())) {
            alert('The submission window is not open. Check the phase timeline for open dates.');
            return;
        }

        const title = document.getElementById('compEntryTitle')?.value?.trim();
        if (!title) { alert('Please enter a title for your entry.'); return; }

        const desc = document.getElementById('compEntryDesc')?.value?.trim() || null;
        const fileInput = document.getElementById('compEntryFile');
        const linkInput = document.getElementById('compEntryLink');
        const file = fileInput?.files?.[0];
        const link = linkInput?.value?.trim();
        const entryTypeConfig = config.entry_type || 'any';

        if (entryTypeConfig === 'file' && !file) {
            alert('Please upload a GFX file for this competition.');
            return;
        }
        if (entryTypeConfig === 'link' && !link) {
            alert('Please provide an external link for this competition.');
            return;
        }
        if (entryTypeConfig === 'any' && !file && !link) {
            alert('Please upload a GFX file or provide an external link.');
            return;
        }

        const submitBtn = document.getElementById('compSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = file ? 'Uploading…' : 'Submitting…';
        }

        let entryType = 'text';
        let fileUrl = null;
        let fileName = null;
        let fileSizeBytes = null;
        let mimeType = null;
        let externalUrl = null;

        if (file) {
            const isVideo = file.type.startsWith('video/');
            const maxMb = Number(config.max_file_size_mb) > 0 ? Number(config.max_file_size_mb) : 10;
            const maxSize = isVideo ? 50 * 1024 * 1024 : maxMb * 1024 * 1024;
            if (file.size > maxSize) {
                alert(`File too large. Max ${isVideo ? '50MB' : maxMb + 'MB'} for ${isVideo ? 'video' : 'images/PDFs/GFX'}.`);
                return;
            }

            const ext = file.name.split('.').pop();
            const path = `${globalThis.evtCurrentUser.id}/${eventId}-${Date.now()}.${ext}`;
            const { error: upErr } = await supabaseClient.storage
                .from('competition-entries')
                .upload(path, file, { contentType: file.type });
            if (upErr) throw upErr;

            fileUrl = path;
            fileName = file.name;
            fileSizeBytes = file.size;
            mimeType = file.type;
            entryType = 'file';
        } else if (link) {
            externalUrl = link;
            entryType = 'link';
        }

        // Update existing entry (registered in Phase 1)
        const { error } = await supabaseClient
            .from('competition_entries')
            .update({
                title,
                description: desc,
                file_url: fileUrl,
                file_name: fileName,
                file_size_bytes: fileSizeBytes,
                mime_type: mimeType,
                external_url: externalUrl,
                entry_type: entryType,
                submitted_at: new Date().toISOString(),
            })
            .eq('event_id', eventId)
            .eq('user_id', globalThis.evtCurrentUser.id);

        if (error) throw error;

        alert('Entry submitted successfully! 🎉');
        globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Submit entry error:', err);
        alert(`Failed to submit: ${err.message}`);
    } finally {
        const submitBtn = document.getElementById('compSubmitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Entry';
        }
    }
}

// ─── Cast Vote ──────────────────────────────────────────

async function evtCastVote(eventId, entryId) {
    if (!confirm('Cast your vote? This cannot be changed.')) return;

    try {
        const event = globalThis.evtAllEvents.find(e => e.id === eventId);
        const config = event?.competition_config || {};
        const compPh = window.EventsCompetitionPhases || {};

        const { data: phases } = await supabaseClient
            .from('competition_phases')
            .select('*')
            .eq('event_id', eventId)
            .order('phase_num', { ascending: true });

        if (compPh.isVotingOpen && !compPh.isVotingOpen(phases, new Date())) {
            alert('The voting window is not open. Check the phase timeline for open dates.');
            return;
        }

        const { data: myEntry } = await supabaseClient
            .from('competition_entries')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', globalThis.evtCurrentUser.id)
            .maybeSingle();

        const rsvp = (window.evtAllRsvps || globalThis.evtAllRsvps || {})[eventId];
        const hasRsvp = typeof globalThis.evtIsCommittedGoing === 'function'
            ? window.evtIsCommittedGoing(event, rsvp)
            : (window.EventsHelpers?.rsvpIsCommittedGoing?.(event, rsvp)
                || (event?.pricing_mode === 'paid'
                    ? !!(rsvp && rsvp.paid === true)
                    : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true))));

        if (compPh.isVoterEligible && !compPh.isVoterEligible(config, { hasRsvp, hasCompEntry: !!myEntry })) {
            alert(compPh.voterEligibilityMessage ? compPh.voterEligibilityMessage(config) : 'You are not eligible to vote in this competition.');
            return;
        }

        const { error } = await supabaseClient
            .from('competition_votes')
            .insert({
                event_id: eventId,
                voter_id: globalThis.evtCurrentUser.id,
                entry_id: entryId,
            });

        if (error) {
            if (error.message?.includes('Self-voting')) {
                alert('You cannot vote for your own entry!');
                return;
            }
            if (error.code === '23505') {
                alert('You have already voted in this competition!');
                return;
            }
            throw error;
        }

        alert('Vote cast! 🗳️');
        globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Vote error:', err);
        alert(`Failed to vote: ${err.message}`);
    }
}

// ─── Moderate Entry (Admin/Host removes entry) ──────────

async function evtModerateEntry(eventId, entryId) {
    const reason = prompt('Reason for removing this entry:');
    if (reason === null) return;

    try {
        const { error } = await supabaseClient
            .from('competition_entries')
            .update({
                moderated: true,
                moderated_by: globalThis.evtCurrentUser.id,
                moderation_reason: reason || 'Removed by host',
            })
            .eq('id', entryId);

        if (error) throw error;

        alert('Entry removed.');
        globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Moderate entry error:', err);
        alert(`Failed to remove: ${err.message}`);
    }
}

// ─── Contribute to Prize Pool ───────────────────────────

async function evtContributeToPrizePool(eventId) {
    const dollars = prompt('How much would you like to contribute? ($)');
    if (!dollars) return;
    const cents = Math.round(parseFloat(dollars) * 100);
    if (!cents || cents < 100) { alert('Minimum contribution is $1.'); return; }

    try {
        const { data, error } = await callEdgeFunction('create-event-checkout', {
            event_id: eventId,
            type: 'prize_pool',
            amount_cents: cents,
        });
        if (error) throw new Error(error);
        if (data?.url) window.location.href = data.url;
    } catch (err) {
        console.error('Prize pool contribution error:', err);
        alert(`Failed: ${err.message}`);
    }
}

// ─── Phase Management (Host/Admin) ──────────────────────

async function evtStartPhase(eventId, phaseNum) {
    try {
        const { error } = await supabaseClient
            .from('competition_phases')
            .update({ status: 'active' })
            .eq('event_id', eventId)
            .eq('phase_num', phaseNum);

        if (error) throw error;
        globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Start phase error:', err);
        alert(`Failed: ${err.message}`);
    }
}

async function evtAdvancePhase(eventId, currentPhaseNum) {
    if (!confirm(`Complete Phase ${currentPhaseNum} and advance to next?`)) return;

    try {
        if (currentPhaseNum === 2) {
            const event = globalThis.evtAllEvents.find(e => e.id === eventId);
            const minEntries = event?.competition_config?.min_entries;
            if (minEntries) {
                const { count } = await supabaseClient
                    .from('competition_entries')
                    .select('id', { count: 'exact', head: true })
                    .eq('event_id', eventId)
                    .eq('moderated', false);
                const liveCount = count || 0;
                if (liveCount < minEntries) {
                    const proceed = confirm(
                        `Only ${liveCount} live entr${liveCount === 1 ? 'y' : 'ies'} (minimum ${minEntries}). Advance anyway? You can extend Phase 2 instead if you need more time.`
                    );
                    if (!proceed) return;
                }
            }
        }

        // Mark current phase completed
        const { error: e1 } = await supabaseClient
            .from('competition_phases')
            .update({ status: 'completed' })
            .eq('event_id', eventId)
            .eq('phase_num', currentPhaseNum);
        if (e1) throw e1;

        // Start next phase
        const nextNum = currentPhaseNum + 1;
        if (nextNum <= 4) {
            const { error: e2 } = await supabaseClient
                .from('competition_phases')
                .update({ status: 'active' })
                .eq('event_id', eventId)
                .eq('phase_num', nextNum);
            if (e2) throw e2;
        }

        globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Advance phase error:', err);
        alert(`Failed: ${err.message}`);
    }
}

async function evtExtendPhase(eventId, phaseNum) {
    try {
        const event = globalThis.evtAllEvents.find(e => e.id === eventId);
        const config = event?.competition_config || {};
        const extensionDays = config.extension_days || 3;

        // Get current phase to extend its end date
        const { data: phase } = await supabaseClient
            .from('competition_phases')
            .select('ends_at')
            .eq('event_id', eventId)
            .eq('phase_num', phaseNum)
            .single();

        if (!phase) throw new Error('Phase not found');

        const newEnd = new Date(phase.ends_at);
        newEnd.setDate(newEnd.getDate() + extensionDays);

        const { error } = await supabaseClient
            .from('competition_phases')
            .update({
                status: 'extended',
                ends_at: newEnd.toISOString(),
                extended_once: true,
            })
            .eq('event_id', eventId)
            .eq('phase_num', phaseNum);

        if (error) throw error;

        alert(`Phase extended by ${extensionDays} days.`);
        globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Extend phase error:', err);
        alert(`Failed: ${err.message}`);
    }
}

// ─── Finalize Competition (Announce Winners) ────────────

async function evtFinalizeCompetition(eventId) {
    if (!confirm('Finalize results and announce winners? This cannot be undone.')) return;

    try {
        const event = globalThis.evtAllEvents.find(e => e.id === eventId);
        const config = event?.competition_config || {};
        const tiers = event?.winner_tier_config || [{ place: 1, pct: 100 }];
        const totalPool = event?.total_prize_pool_cents || 0;
        const housePct = config.house_pct || 0;
        const netPool = Math.round(totalPool * (1 - housePct / 100));
        const compPh = window.EventsCompetitionPhases || {};

        const { data: phases } = await supabaseClient
            .from('competition_phases')
            .select('*')
            .eq('event_id', eventId)
            .order('phase_num', { ascending: true });

        if (compPh.isVotingClosed && !compPh.isVotingClosed(phases, new Date())) {
            alert('Voting must be closed before finalizing results. Wait until the voting window ends or complete Phase 3.');
            return;
        }

        const { count: existingWinnerCount, error: winnersCheckErr } = await supabaseClient
            .from('competition_winners')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', eventId);
        if (winnersCheckErr) throw winnersCheckErr;
        if ((existingWinnerCount || 0) > 0) {
            alert('Winners have already been finalized for this competition.');
            return;
        }

        // Get entries sorted by vote count
        const { data: entries } = await supabaseClient
            .from('competition_entries')
            .select('id, user_id, title, vote_count')
            .eq('event_id', eventId)
            .eq('moderated', false)
            .order('vote_count', { ascending: false });

        if (!entries || entries.length === 0) {
            alert('No entries to finalize.');
            return;
        }

        const totalVotes = entries.reduce((sum, e) => sum + (e.vote_count || 0), 0);
        if (totalVotes === 0 && !confirm('No votes were cast. Finalize anyway with zero-vote results?')) {
            return;
        }

        // Determine winners — handle ties
        const winners = [];
        let currentRank = 1;

        for (const tier of tiers) {
            if (currentRank > entries.length) break;

            const targetVoteCount = entries[currentRank - 1].vote_count;

            // Find all entries tied at this rank
            const tiedEntries = entries.filter(e =>
                e.vote_count === targetVoteCount &&
                !winners.some(w => w.entry_id === e.id)
            );

            // Split this tier's prize among tied entries
            const tierPrize = Math.round(netPool * tier.pct / 100);
            const splitPrize = Math.round(tierPrize / tiedEntries.length);

            for (const entry of tiedEntries) {
                winners.push({
                    event_id: eventId,
                    entry_id: entry.id,
                    user_id: entry.user_id,
                    place: tier.place,
                    prize_amount_cents: splitPrize,
                    payout_status: splitPrize > 0 ? 'pending' : 'paid',
                    needs_1099: splitPrize >= 60000, // $600 threshold
                });
            }

            currentRank += tiedEntries.length;
        }

        // Insert winners
        if (winners.length > 0) {
            const { error } = await supabaseClient
                .from('competition_winners')
                .insert(winners);
            if (error) throw error;
        }

        // Mark Phase 4 as completed
        await supabaseClient
            .from('competition_phases')
            .update({ status: 'completed' })
            .eq('event_id', eventId)
            .eq('phase_num', 4);

        // Mark event as completed
        await supabaseClient
            .from('events')
            .update({ status: 'completed' })
            .eq('id', eventId);

        alert('Competition finalized! Winners announced! 🏆🎉');
        await globalThis.evtLoadEvents();
        globalThis.evtOpenDetail(eventId);
    } catch (err) {
        console.error('Finalize competition error:', err);
        alert(`Failed: ${err.message}`);
    }
}

// ─── Tier Total Calculator ──────────────────────────────

function evtRecalcCompTiers() {
    const t1 = parseInt(document.getElementById('compTier1Pct')?.value) || 0;
    const t2 = parseInt(document.getElementById('compTier2Pct')?.value) || 0;
    const t3 = parseInt(document.getElementById('compTier3Pct')?.value) || 0;
    const totalEl = document.getElementById('compTierTotal');
    const total = t1 + t2 + t3;
    if (totalEl) {
        totalEl.textContent = `Total: ${total}%`;
        totalEl.classList.toggle('text-red-500', total !== 100);
        totalEl.classList.toggle('text-gray-400', total === 100);
    }
}

// PortalEvents.competition namespace bridge (additive — preserves evt* globals)
window.PortalEvents = window.PortalEvents || {};
window.PortalEvents.competition = window.PortalEvents.competition || {};
window.PortalEvents.competition.buildHtml = evtBuildCompetitionHtml;
window.PortalEvents.competition.buildSubmitFormHtml = evtBuildSubmitFormHtml;
window.PortalEvents.competition.join = evtJoinCompetition;
window.PortalEvents.competition.submitEntry = evtSubmitEntry;
window.PortalEvents.competition.castVote = evtCastVote;
window.PortalEvents.competition.moderateEntry = evtModerateEntry;
window.PortalEvents.competition.contributeToPrizePool = evtContributeToPrizePool;
window.PortalEvents.competition.startPhase = evtStartPhase;
window.PortalEvents.competition.advancePhase = evtAdvancePhase;
window.PortalEvents.competition.extendPhase = evtExtendPhase;
window.PortalEvents.competition.finalize = evtFinalizeCompetition;
window.PortalEvents.competition.recalcTiers = evtRecalcCompTiers;

import { publishGlobals } from '../compat/publish-globals.js';
publishGlobals({
    evtBuildCompetitionHtml,
    evtBuildSubmitFormHtml,
    evtJoinCompetition,
    evtSubmitEntry,
    evtCastVote,
    evtModerateEntry,
    evtContributeToPrizePool,
    evtStartPhase,
    evtAdvancePhase,
    evtExtendPhase,
    evtFinalizeCompetition,
    evtRecalcCompTiers,
});

export { evtRecalcCompTiers };
