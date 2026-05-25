// Portal Events — Manage competition tab (Phase 5M.3B)

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

// ═══════════════════════════════════════════════════════════════
// M3b — COMPETITION TAB
// ═══════════════════════════════════════════════════════════════
async function loadComp() {
    const STATE = api().getState?.() || {};
    const eventId = STATE.eventId;
    const [phasesRes, entriesRes, votesRes, winnersRes, contribRes] = await Promise.all([
        supabaseClient.from('competition_phases').select('*').eq('event_id', eventId).order('phase_num', { ascending: true }),
        supabaseClient.from('competition_entries').select('id, user_id, title, moderated, vote_count, profiles:user_id(first_name, last_name)').eq('event_id', eventId),
        supabaseClient.from('competition_votes').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
        supabaseClient.from('competition_winners').select('*, profiles:user_id(first_name, last_name), competition_entries!competition_winners_entry_id_fkey(title)').eq('event_id', eventId).order('place', { ascending: true }),
        supabaseClient.from('prize_pool_contributions').select('amount_cents').eq('event_id', eventId),
    ]);
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
    const liveEntries = d.entries.filter(x => !x.moderated);
    const moderatedCount = d.entries.length - liveEntries.length;
    const poolTotal = (e.total_prize_pool_cents || 0) + d.contribs.reduce((s, c) => s + (c.amount_cents || 0), 0);
    const housePct = Number(cfg.house_pct || 0);
    const netPool  = Math.round(poolTotal * (1 - housePct / 100));
    const activePhase = d.phases.find(ph => ph.status === 'active') || null;
    const entryTarget = Number(cfg.min_entries || 0);
    const entryPct = entryTarget ? Math.min(100, Math.round((liveEntries.length / entryTarget) * 100)) : 100;

    const phaseStatusColor = { pending:'#9ca3af', active:'#4f46e5', completed:'#059669', extended:'#d97706', cancelled:'#dc2626' };
    const phaseRows = d.phases.length ? d.phases.map(ph => {
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
            <div class="em-metric"><span>Pool</span><strong>${fmt(poolTotal)}</strong><small>Gross prize pool</small></div>
            <div class="em-metric"><span>Net payout</span><strong>${fmt(netPool)}</strong><small>${housePct}% house cut</small></div>
        </div>

        <div class="em-card mb-3">
            <div class="em-section-head"><div><h3 class="em-section-title">Phases <span class="text-gray-400 font-normal">· ${d.phases.length}</span></h3><p class="em-section-sub">Timeline and moderation state for the competition.</p></div></div>
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
            <p class="text-xs text-gray-400 mt-3">Phase advancement and winner finalization happen on the portal detail page. Per-tab controls land in M4.</p>
        </div>
    `;
}

function wireComp() {
    const STATE = api().getState?.() || {}; /* read-only in M3b */ }

export const manageCompetitionApi = {
    loadComp,
    compHtml,
    wireComp
};

globalThis.EventsManageCompetition = manageCompetitionApi;
