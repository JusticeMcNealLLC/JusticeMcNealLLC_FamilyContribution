// Portal Events — Manage competition tab (Phase 5M.3B + §13.6.395 submission window + §13.6.396 voting window)

'use strict';

function api() {
    return window.EventsManageCompetitionApi || {};
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}
function money(cents) {
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
}

function toDatetimeLocalValue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ═══════════════════════════════════════════════════════════════
// M3b — COMPETITION TAB
// ═══════════════════════════════════════════════════════════════
async function loadComp() {
    const STATE = api().getState?.() || {};
    const eventId = STATE.eventId;
    const [phasesRes, entriesRes, votesRes, winnersRes, contribRes] = await Promise.all([
        supabaseClient.from('competition_phases').select('*').eq('event_id', eventId).order('phase_num', { ascending: true }),
        supabaseClient.from('competition_entries').select('id, user_id, title, moderated, vote_count, entry_type, file_url, external_url, profiles:user_id(first_name, last_name)').eq('event_id', eventId),
        supabaseClient.from('competition_votes').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
        supabaseClient.from('competition_winners').select('*, profiles:user_id(first_name, last_name), competition_entries!competition_winners_entry_id_fkey(title)').eq('event_id', eventId).order('place', { ascending: true }),
        supabaseClient.from('prize_pool_contributions').select('amount_cents').eq('event_id', eventId),
    ]);
    const errors = [phasesRes, entriesRes, votesRes, winnersRes, contribRes]
        .map((r) => r.error)
        .filter(Boolean);
    if (errors.length) {
        throw new Error(errors[0].message || 'Failed to load competition data');
    }
    return {
        phases:   phasesRes.data   || [],
        entries:  entriesRes.data  || [],
        voteCount: votesRes.count || 0,
        winners:  winnersRes.data  || [],
        contribs: contribRes.data  || [],
    };
}

function compHtml() {
    const STATE = api().getState?.() || {};
    const e = STATE.event;
    if (e.event_type !== 'competition') {
        return api().emptyHtml?.('Not a competition', 'This is not a competition event. Set event type to "Competition" to use this tab.');
    }
    const d = STATE.tabData.comp;
    const fmt = window.formatCurrency || money;
    const cfg = e.competition_config || {};
    const compPh = window.EventsCompetitionPhases || {};
    const phases = compPh.normalizePhases ? compPh.normalizePhases(d.phases) : (d.phases || []);
    const phase2 = compPh.getPhase ? compPh.getPhase(phases, 2) : null;
    const phase3 = compPh.getPhase ? compPh.getPhase(phases, 3) : null;
    const now = new Date();
    const windowLabel = compPh.submissionWindowLabel
        ? compPh.submissionWindowLabel(phase2, now)
        : { state: 'not_configured', message: '' };
    const votingLabel = compPh.votingWindowLabel
        ? compPh.votingWindowLabel(phase3, now)
        : { state: 'not_configured', message: '' };
    const submissionOpen = compPh.isSubmissionOpen ? compPh.isSubmissionOpen(phases, now) : false;
    const votingOpen = compPh.isVotingOpen ? compPh.isVotingOpen(phases, now) : false;
    const displayPhaseNum = compPh.resolveDisplayPhase ? compPh.resolveDisplayPhase(phases, now) : 0;
    const liveEntries = d.entries.filter(x => !x.moderated);
    const moderatedEntries = d.entries.filter(x => x.moderated);
    const moderatedCount = moderatedEntries.length;
    const contribSum = d.contribs.reduce((s, c) => s + (c.amount_cents || 0), 0);
    const poolTotal = (e.total_prize_pool_cents || 0) > 0
        ? (e.total_prize_pool_cents || 0)
        : contribSum;
    const housePct = Number(cfg.house_pct || 0);
    const netPool  = Math.round(poolTotal * (1 - housePct / 100));
    const activePhase = phases.find(ph => ph.status === 'active' || ph.status === 'extended') || null;
    const entryTarget = Number(cfg.min_entries || 0);
    const entryPct = entryTarget ? Math.min(100, Math.round((liveEntries.length / entryTarget) * 100)) : 100;
    const phase2Configured = !!(phase2 && phase2.starts_at && phase2.ends_at);
    const defaultOpens = phase2?.starts_at
        || phases.find((p) => p.phase_num === 1)?.ends_at
        || e.start_date
        || '';
    const defaultCloses = phase2?.ends_at || e.end_date || '';
    const phase3Configured = !!(phase3 && phase3.starts_at && phase3.ends_at);
    const defaultVoteOpens = phase3?.starts_at || phase2?.ends_at || e.start_date || '';
    const defaultVoteCloses = phase3?.ends_at || e.end_date || '';
    const detailUrl = e.slug
        ? `/pages/portal/events.html?event=${encodeURIComponent(e.slug)}`
        : `/pages/portal/events.html?event=${encodeURIComponent(STATE.eventId)}`;

    const windowStatusTitle = submissionOpen
        ? 'Submissions open'
        : windowLabel.state === 'upcoming'
            ? 'Submissions upcoming'
            : windowLabel.state === 'closed'
                ? 'Submissions closed'
                : phase2Configured
                    ? 'Submission window scheduled'
                    : 'Configure submission window';

    const submissionWindowCard = `
        <div class="em-card mb-4">
            <div class="em-section-head"><div><h3 class="em-section-title">Submission window</h3><p class="em-section-sub">Phase 2 GFX upload window — separate from the event date.</p></div></div>
            <p class="text-sm font-semibold text-gray-800">${esc(windowStatusTitle)}</p>
            <p class="text-xs text-gray-500 mt-1">${esc(windowLabel.message || (phase2Configured ? '' : 'Set open and close times for competitor uploads.'))}</p>
            ${phase2Configured ? `
                <div class="em-money-row mt-2"><span>Opens</span><strong>${esc(compPh.formatPhaseDate ? compPh.formatPhaseDate(phase2.starts_at) : new Date(phase2.starts_at).toLocaleString())}</strong></div>
                <div class="em-money-row"><span>Closes</span><strong>${esc(compPh.formatPhaseDate ? compPh.formatPhaseDate(phase2.ends_at) : new Date(phase2.ends_at).toLocaleString())}</strong></div>
            ` : ''}
            <form id="emCompSubmissionWindowForm" class="grid sm:grid-cols-2 gap-3 mt-3">
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Opens
                    <input id="emCompSubOpens" type="datetime-local" class="em-input mt-1" value="${esc(toDatetimeLocalValue(defaultOpens))}">
                </label>
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Closes
                    <input id="emCompSubCloses" type="datetime-local" class="em-input mt-1" value="${esc(toDatetimeLocalValue(defaultCloses))}">
                </label>
                <div class="sm:col-span-2 flex flex-wrap items-center gap-2">
                    <button type="submit" id="emCompSubSave" class="em-btn-primary">Save submission window</button>
                    <a href="${esc(detailUrl)}" class="em-btn-ghost" style="text-decoration:none">Open event detail →</a>
                    <span id="emCompSubStatus" class="text-xs text-gray-400"></span>
                </div>
            </form>
            <p class="text-xs text-gray-400 mt-2">After saving, start Phase 2 on the event detail page when you are ready for uploads.</p>
        </div>`;

    const voteStatusTitle = votingOpen
        ? 'Voting open'
        : votingLabel.state === 'upcoming'
            ? 'Voting upcoming'
            : votingLabel.state === 'closed'
                ? 'Voting closed'
                : phase3Configured
                    ? 'Voting window scheduled'
                    : 'Configure voting window';

    const votingWindowCard = `
        <div class="em-card mb-4">
            <div class="em-section-head"><div><h3 class="em-section-title">Voting window</h3><p class="em-section-sub">Phase 3 member voting — after submissions close.</p></div></div>
            <p class="text-sm font-semibold text-gray-800">${esc(voteStatusTitle)}</p>
            <p class="text-xs text-gray-500 mt-1">${esc(votingLabel.message || (phase3Configured ? '' : 'Set open and close times for member voting.'))}</p>
            ${phase3Configured ? `
                <div class="em-money-row mt-2"><span>Opens</span><strong>${esc(compPh.formatPhaseDate ? compPh.formatPhaseDate(phase3.starts_at) : new Date(phase3.starts_at).toLocaleString())}</strong></div>
                <div class="em-money-row"><span>Closes</span><strong>${esc(compPh.formatPhaseDate ? compPh.formatPhaseDate(phase3.ends_at) : new Date(phase3.ends_at).toLocaleString())}</strong></div>
            ` : ''}
            <form id="emCompVotingWindowForm" class="grid sm:grid-cols-2 gap-3 mt-3">
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Opens
                    <input id="emCompVoteOpens" type="datetime-local" class="em-input mt-1" value="${esc(toDatetimeLocalValue(defaultVoteOpens))}">
                </label>
                <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Closes
                    <input id="emCompVoteCloses" type="datetime-local" class="em-input mt-1" value="${esc(toDatetimeLocalValue(defaultVoteCloses))}">
                </label>
                <div class="sm:col-span-2 flex flex-wrap items-center gap-2">
                    <button type="submit" id="emCompVoteSave" class="em-btn-primary">Save voting window</button>
                    <a href="${esc(detailUrl)}" class="em-btn-ghost" style="text-decoration:none">Open event detail →</a>
                    <span id="emCompVoteStatus" class="text-xs text-gray-400"></span>
                </div>
            </form>
            <p class="text-xs text-gray-400 mt-2">After saving, start Phase 3 on the event detail page when submissions are closed.</p>
        </div>`;

    const phaseStatusColor = { pending:'#9ca3af', active:'#4f46e5', completed:'#059669', extended:'#d97706', cancelled:'#dc2626' };
    const phaseRows = phases.length ? phases.map(ph => {
        const color = phaseStatusColor[ph.status] || '#6b7280';
        const dates = (ph.starts_at || ph.ends_at)
            ? `${ph.starts_at ? new Date(ph.starts_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'} → ${ph.ends_at ? new Date(ph.ends_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}`
            : '';
        return `
            <div class="em-attendee-card">
                <div class="em-avatar" style="background:${color}22;color:${color};font-weight:900">${ph.phase_num}</div>
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc(ph.name || 'Competition phase')}</p>
                    <p class="em-attendee-sub">${dates || 'Dates not set'}</p>
                    <div class="flex flex-wrap gap-1 mt-2"><span class="em-pill em-pill-checked" style="background:${color}22;color:${color}">${esc(ph.status || 'pending')}</span>${ph.extended_once ? '<span class="em-pill em-pill-paid">Extended</span>' : ''}</div>
                </div>
            </div>
        `;
    }).join('') : `<p class="text-xs text-gray-400 italic py-2">No phases configured yet.</p>`;

    const sortedEntries = (displayPhaseNum >= 3 || d.voteCount > 0)
        ? [...liveEntries].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
        : liveEntries;

    const entryRows = sortedEntries.length ? sortedEntries.map((entry) => {
        const p = entry.profiles || {};
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
        const hasFile = !!(entry.file_url || entry.external_url);
        const filePill = hasFile
            ? '<span class="em-pill em-pill-checked">GFX uploaded</span>'
            : '<span class="em-pill em-pill-not">Needs upload</span>';
        const votePill = (displayPhaseNum >= 3 || d.voteCount > 0)
            ? `<span class="em-pill em-pill-going">${entry.vote_count || 0} vote${(entry.vote_count || 0) === 1 ? '' : 's'}</span>`
            : '';
        return `
            <div class="em-attendee-card">
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc(name)}</p>
                    <p class="em-attendee-sub">${esc(entry.title || 'Registered')}</p>
                    <div class="flex flex-wrap gap-1 mt-2">${filePill}${votePill}<span class="em-pill em-pill-going">${esc(entry.entry_type || 'text')}</span></div>
                </div>
            </div>`;
    }).join('') : `<p class="text-xs text-gray-400 italic py-2">No competitor entries yet.</p>`;

    const moderatedRows = moderatedEntries.length ? moderatedEntries.map((entry) => {
        const p = entry.profiles || {};
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
        return `
            <div class="em-attendee-card">
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc(name)}</p>
                    <p class="em-attendee-sub">${esc(entry.title || 'Registered')} · removed from gallery</p>
                </div>
            </div>`;
    }).join('') : '';

    const winnerRows = d.winners.length ? d.winners.map(w => {
        const p = w.profiles || {};
        const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
        const entry = w.competition_entries || {};
        const medal = ['🥇','🥈','🥉'][w.place - 1] || `#${w.place}`;
        const payoutBadge = ({
            pending:    '<span class="em-pill em-pill-paid">Pending</span>',
            processing: '<span class="em-pill em-pill-paid">Processing</span>',
            paid:       '<span class="em-pill em-pill-going">Paid</span>',
            failed:     '<span class="em-pill em-pill-not">Failed</span>',
        })[w.payout_status] || '';
        return `
            <div class="em-attendee-card">
                <div class="em-avatar" style="background:#fef3c7;color:#92400e;font-size:18px">${medal}</div>
                <div class="em-attendee-main">
                    <p class="em-attendee-name">${esc(name)}</p>
                    <p class="em-attendee-sub">${esc(entry.title || 'Winning entry')} · ${fmt(w.prize_amount_cents)}${w.needs_1099 ? ' · 1099 needed' : ''}</p>
                    <div class="flex flex-wrap gap-1 mt-2">${payoutBadge}</div>
                </div>
            </div>
        `;
    }).join('') : `<p class="text-xs text-gray-400 italic py-2">No winners finalized yet.</p>`;

    return `
        <div class="em-card em-command-card mb-4">
            <p class="em-command-eyebrow">Competition command</p>
            <h3 class="em-command-title">${activePhase ? `Phase ${activePhase.phase_num}: ${esc(activePhase.name || 'Active')}` : 'Competition setup'}</h3>
            <p class="em-command-copy">${liveEntries.length} live entr${liveEntries.length === 1 ? 'y' : 'ies'}${entryTarget ? ` toward ${entryTarget} minimum` : ''}. ${d.voteCount} vote${d.voteCount === 1 ? '' : 's'} recorded with ${fmt(netPool)} net payout available.</p>
            <div class="em-op-progress" style="margin-top:14px;background:rgba(255,255,255,.22)"><span style="width:${entryPct}%;background:#a78bfa"></span></div>
        </div>

        <div class="em-metric-grid mb-4">
            <div class="em-metric"><span>Entries</span><strong>${liveEntries.length}</strong><small>${entryTarget ? `${entryPct}% of minimum` : 'No minimum set'}</small></div>
            <div class="em-metric"><span>Votes</span><strong>${d.voteCount}</strong><small>Submitted votes</small></div>
            <div class="em-metric"><span>Pool</span><strong>${fmt(poolTotal)}</strong><small>${d.contribs.length} contribution${d.contribs.length === 1 ? '' : 's'}</small></div>
            <div class="em-metric"><span>Net payout</span><strong>${fmt(netPool)}</strong><small>${housePct}% house cut</small></div>
        </div>

        ${submissionWindowCard}

        ${votingWindowCard}

        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Competitor entries <span class="text-gray-400 font-normal">· ${liveEntries.length}</span></h3><p class="em-section-sub">${displayPhaseNum >= 3 || d.voteCount > 0 ? 'Sorted by vote count during voting/results.' : 'GFX upload status per registered competitor.'}</p></div></div>
            ${entryRows}
        </div>

        ${moderatedCount ? `
        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Moderated entries <span class="text-gray-400 font-normal">· ${moderatedCount}</span></h3><p class="em-section-sub">Removed from the public gallery. Moderation actions happen on the event detail page.</p></div></div>
            ${moderatedRows}
        </div>` : ''}

        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Phases <span class="text-gray-400 font-normal">· ${phases.length}</span></h3><p class="em-section-sub">Timeline and moderation state for the competition.</p></div></div>
            ${phaseRows}
        </div>

        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Configuration</h3><p class="em-section-sub">Rules currently driving entries, voting, and payouts.</p></div></div>
            <div class="em-money-row"><span>Entry type</span><strong>${esc(cfg.entry_type || 'any')}</strong></div>
            <div class="em-money-row"><span>Entry fee</span><strong>${cfg.entry_fee_cents ? fmt(cfg.entry_fee_cents) : 'Free'}</strong></div>
            <div class="em-money-row"><span>House cut</span><strong>${housePct}%</strong></div>
            <div class="em-money-row"><span>Voter eligibility</span><strong>${esc(cfg.voter_eligibility || 'all_members')}</strong></div>
            ${moderatedCount ? `<div class="em-money-row"><span>Moderated entries</span><strong style="color:#dc2626">${moderatedCount}</strong></div>` : ''}
        </div>

        <div class="em-card">
            <div class="em-section-head"><div><h3 class="em-section-title">Winners <span class="text-gray-400 font-normal">· ${d.winners.length}</span></h3><p class="em-section-sub">Final results and payout status.</p></div></div>
            ${winnerRows}
            <p class="text-xs text-gray-400 mt-3">Manage tracks windows, standings, and payout status here. Start phases and finalize winners on the portal event detail page.</p>
        </div>
    `;
}

async function saveSubmissionWindowFromManage() {
    const STATE = api().getState?.() || {};
    const btn = document.getElementById('emCompSubSave');
    const statusEl = document.getElementById('emCompSubStatus');
    const opens = document.getElementById('emCompSubOpens')?.value;
    const closes = document.getElementById('emCompSubCloses')?.value;
    if (!opens || !closes) {
        alert('Set both open and close times for the submission window.');
        return;
    }
    const startsAt = new Date(opens);
    const endsAt = new Date(closes);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        alert('Invalid date/time values.');
        return;
    }
    if (endsAt <= startsAt) {
        alert('Close time must be after open time.');
        return;
    }

    const existing = (STATE.tabData?.comp?.phases || []).find((p) => p.phase_num === 2);
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = 'Saving…';
    try {
        const row = {
            event_id: STATE.eventId,
            phase_num: 2,
            name: 'Submission',
            description: 'Submit GFX entries during this window.',
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            status: existing?.status || 'pending',
            extended_once: existing?.extended_once || false,
        };
        const { error } = await supabaseClient
            .from('competition_phases')
            .upsert(row, { onConflict: 'event_id,phase_num' });
        if (error) throw error;
        STATE.tabData.comp = null;
        api().renderTab?.('comp');
        api().notifyParent?.('updated', STATE.eventId);
        if (statusEl) statusEl.textContent = 'Saved ✓';
    } catch (err) {
        alert('Failed to save submission window: ' + (err.message || err));
        if (statusEl) statusEl.textContent = '';
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function saveVotingWindowFromManage() {
    const STATE = api().getState?.() || {};
    const btn = document.getElementById('emCompVoteSave');
    const statusEl = document.getElementById('emCompVoteStatus');
    const opens = document.getElementById('emCompVoteOpens')?.value;
    const closes = document.getElementById('emCompVoteCloses')?.value;
    if (!opens || !closes) {
        alert('Set both open and close times for the voting window.');
        return;
    }
    const startsAt = new Date(opens);
    const endsAt = new Date(closes);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        alert('Invalid date/time values.');
        return;
    }
    if (endsAt <= startsAt) {
        alert('Close time must be after open time.');
        return;
    }

    const existing = (STATE.tabData?.comp?.phases || []).find((p) => p.phase_num === 3);
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = 'Saving…';
    try {
        const row = {
            event_id: STATE.eventId,
            phase_num: 3,
            name: 'Voting',
            description: 'Members vote on entries during this window.',
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            status: existing?.status || 'pending',
            extended_once: existing?.extended_once || false,
        };
        const { error } = await supabaseClient
            .from('competition_phases')
            .upsert(row, { onConflict: 'event_id,phase_num' });
        if (error) throw error;
        STATE.tabData.comp = null;
        api().renderTab?.('comp');
        api().notifyParent?.('updated', STATE.eventId);
        if (statusEl) statusEl.textContent = 'Saved ✓';
    } catch (err) {
        alert('Failed to save voting window: ' + (err.message || err));
        if (statusEl) statusEl.textContent = '';
    } finally {
        if (btn) btn.disabled = false;
    }
}

function wireComp() {
    document.getElementById('emCompSubmissionWindowForm')?.addEventListener('submit', (ev) => {
        ev.preventDefault();
        saveSubmissionWindowFromManage();
    });
    document.getElementById('emCompVotingWindowForm')?.addEventListener('submit', (ev) => {
        ev.preventDefault();
        saveVotingWindowFromManage();
    });
}

export const manageCompetitionApi = {
    loadComp,
    compHtml,
    wireComp
};

globalThis.EventsManageCompetition = manageCompetitionApi;
