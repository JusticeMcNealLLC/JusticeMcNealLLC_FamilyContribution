// Portal Events — Manage Overview: Amenity voting ops (§13.13 line 469)
// Close voting + edit closes_at / results_visible; host tallies (options stay locked)

'use strict';

function api() {
    return window.EventsManageOverviewApi || {};
}

function getState() {
    return api().getState?.() || {};
}

function esc(s) {
    const el = document.createElement('span');
    el.textContent = s == null ? '' : String(s);
    return el.innerHTML;
}

function toDatetimeLocal(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizeCfg(event) {
    if (window.EventsAmenityVoting && typeof window.EventsAmenityVoting.normalizeConfig === 'function') {
        return window.EventsAmenityVoting.normalizeConfig(event?.amenity_voting);
    }
    return { enabled: false, options: [], closes_at: null, results_visible: 'after_close' };
}

function setStatus(msg, isError) {
    const el = document.getElementById('emAmenityVoteStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.className = isError ? 'text-xs text-red-600 mt-2' : 'text-xs text-gray-500 mt-2';
}

function amenityVotingHtml(event) {
    const cfg = normalizeCfg(event);
    if (!cfg.enabled) return '';

    const STATE = getState();
    const closed = window.EventsAmenityVoting?.isVotingClosed?.(cfg) === true;
    const closeLabel = cfg.closes_at
        ? new Date(cfg.closes_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit',
        })
        : 'No close time set';
    const visibilityLabel = String(cfg.results_visible || 'after_close').replace(/_/g, ' ');

    const parties = STATE.parties || [];
    const tallies = window.EventsAmenityVoting?.tallyCounts?.(
        parties,
        cfg.options.map((o) => o.id),
    ) || {};
    const provisional = parties.filter((p) => p.amenity_vote_status === 'provisional').length;
    const resultsInner = window.EventsAmenityVoting?.resultsHtml?.(cfg, tallies, { isHost: true }) || '';

    return `
        <div class="em-card mt-3" id="emAmenityVotingCard">
            <div class="em-section-head">
                <div>
                    <h3 class="em-section-title">Amenity voting</h3>
                    <p class="em-section-sub">Close voting and control when attendees see results. Option list stays locked after RSVPs.</p>
                </div>
            </div>
            <div class="em-metric-grid mb-3">
                <div class="em-metric"><span>Status</span><strong style="font-size:16px">${closed ? 'Closed' : 'Open'}</strong><small>${esc(closeLabel)}</small></div>
                <div class="em-metric"><span>Options</span><strong>${cfg.options.length}</strong><small>Locked</small></div>
                <div class="em-metric"><span>Results</span><strong style="font-size:14px">${esc(visibilityLabel)}</strong><small>Attendee visibility</small></div>
                <div class="em-metric"><span>Provisional</span><strong>${provisional}</strong><small>Not yet counted</small></div>
            </div>
            <div class="ed-amenity-results mb-3" style="background:var(--color-surface,#EEF2F6);border:1px solid var(--color-border,#D5DFEC);border-radius:12px;padding:12px">
                ${resultsInner || '<p class="text-xs text-gray-400 italic">No counted votes yet.</p>'}
            </div>
            ${!closed ? `
            <button type="button" class="em-btn-primary mb-3" id="emAmenityCloseNow" style="font-size:13px">Close voting now</button>
            ` : `
            <p class="text-xs text-gray-500 mb-3">Voting is closed. You can still change results visibility or set a later reopen time below (sets a future close).</p>
            `}
            <label class="text-xs text-gray-500 block mb-1" for="emAmenityClosesAt">Closes at</label>
            <input type="datetime-local" id="emAmenityClosesAt" class="text-sm w-full mb-3"
                value="${esc(toDatetimeLocal(cfg.closes_at))}"
                style="border:1px solid var(--color-border,#D5DFEC);border-radius:8px;padding:8px 10px">
            <label class="text-xs text-gray-500 block mb-1" for="emAmenityResultsVisible">Show results to attendees</label>
            <select id="emAmenityResultsVisible" class="text-sm w-full mb-3"
                style="border:1px solid var(--color-border,#D5DFEC);border-radius:8px;padding:8px 10px">
                <option value="after_close"${cfg.results_visible === 'after_close' ? ' selected' : ''}>After voting closes</option>
                <option value="always"${cfg.results_visible === 'always' ? ' selected' : ''}>Always</option>
                <option value="host_only"${cfg.results_visible === 'host_only' ? ' selected' : ''}>Hosts only</option>
            </select>
            <div class="flex flex-wrap gap-2">
                <button type="button" class="em-btn-primary" id="emAmenityVoteSave" style="font-size:13px">Save voting settings</button>
            </div>
            <p id="emAmenityVoteStatus" class="text-xs text-gray-500 mt-2"></p>
        </div>`;
}

async function patchAmenityVoting(nextPartial) {
    const STATE = getState();
    const e = STATE.event;
    if (!e?.id) throw new Error('Event not loaded.');
    const cfg = normalizeCfg(e);
    if (!cfg.enabled) throw new Error('Amenity voting is not enabled on this event.');

    const merged = {
        ...cfg,
        ...nextPartial,
        enabled: true,
        options: cfg.options,
    };
    const normalized = window.EventsAmenityVoting?.normalizeConfig?.(merged) || merged;
    // Keep enabled even if normalize would drop it when options < 2 (should not happen)
    normalized.enabled = true;
    normalized.options = cfg.options;

    const { data, error } = await supabaseClient
        .from('events')
        .update({ amenity_voting: normalized })
        .eq('id', e.id)
        .select('amenity_voting')
        .single();
    if (error) throw error;

    STATE.event.amenity_voting = data?.amenity_voting ?? normalized;
    api().notifyParent?.('updated', e.id);
    return STATE.event.amenity_voting;
}

async function closeVotingNow() {
    if (!confirm('Close amenity voting now? Attendees will no longer be able to cast a vote.')) return;
    setStatus('Closing voting…');
    try {
        await patchAmenityVoting({ closes_at: new Date().toISOString() });
        setStatus('Voting closed.');
        api().renderTab?.('overview');
    } catch (err) {
        setStatus(err.message || 'Could not close voting.', true);
    }
}

async function saveVotingSettings() {
    const closesEl = document.getElementById('emAmenityClosesAt');
    const visEl = document.getElementById('emAmenityResultsVisible');
    const closesRaw = closesEl?.value?.trim() || '';
    let closesAt = null;
    if (closesRaw) {
        const d = new Date(closesRaw);
        if (Number.isNaN(d.getTime())) {
            setStatus('Enter a valid close date/time.', true);
            return;
        }
        closesAt = d.toISOString();
    }
    const resultsVisible = visEl?.value || 'after_close';
    setStatus('Saving…');
    try {
        await patchAmenityVoting({
            closes_at: closesAt,
            results_visible: resultsVisible,
        });
        setStatus('Saved voting settings.');
        api().renderTab?.('overview');
        setTimeout(() => {
            const el = document.getElementById('emAmenityVoteStatus');
            if (el) {
                el.className = 'text-xs text-emerald-600 mt-2';
                el.textContent = 'Saved voting settings.';
            }
        }, 0);
    } catch (err) {
        setStatus(err.message || 'Could not save.', true);
    }
}

function wireAmenityVoting(event) {
    const cfg = normalizeCfg(event);
    if (!cfg.enabled) return;
    document.getElementById('emAmenityCloseNow')?.addEventListener('click', () => closeVotingNow());
    document.getElementById('emAmenityVoteSave')?.addEventListener('click', () => saveVotingSettings());
}

export { amenityVotingHtml, wireAmenityVoting };
