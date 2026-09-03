/* ════════════════════════════════════════════════════════════
   Events — Amenity voting helper (config + results display)
   Surface: window.EventsAmenityVoting
   Casting lives in RSVP (§13.13); detail uses this for read-only results.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const LABEL_MAX = 80;
    const DESC_MAX = 240;
    const OPTIONS_MAX = 10;
    const RESULTS_VISIBLE = ['after_close', 'always', 'host_only'];

    function escapeHtml(str) {
        if (window.EventsHelpers && typeof window.EventsHelpers.escapeHtml === 'function') {
            return window.EventsHelpers.escapeHtml(str);
        }
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function defaultConfig() {
        return {
            enabled: false,
            options: [],
            closes_at: null,
            results_visible: 'after_close',
        };
    }

    function normalizeOptions(items) {
        if (!Array.isArray(items)) return [];
        const out = [];
        const seenLabels = new Set();
        for (const raw of items) {
            if (!raw || typeof raw !== 'object') continue;
            const label = String(raw.label || '').trim().slice(0, LABEL_MAX);
            if (!label) continue;
            const key = label.toLowerCase();
            if (seenLabels.has(key)) continue;
            seenLabels.add(key);
            const id = String(raw.id || '').trim() || `amenity-${out.length + 1}`;
            const description = String(raw.description || '').trim().slice(0, DESC_MAX);
            out.push({
                id,
                label,
                ...(description ? { description } : {}),
            });
            if (out.length >= OPTIONS_MAX) break;
        }
        return out;
    }

    function normalizeConfig(raw) {
        const base = defaultConfig();
        if (!raw || typeof raw !== 'object') return base;
        const options = normalizeOptions(raw.options);
        let resultsVisible = String(raw.results_visible || base.results_visible).trim();
        if (!RESULTS_VISIBLE.includes(resultsVisible)) resultsVisible = base.results_visible;
        let closesAt = raw.closes_at;
        if (closesAt != null && closesAt !== '') {
            const d = new Date(closesAt);
            closesAt = Number.isNaN(d.getTime()) ? null : d.toISOString();
        } else {
            closesAt = null;
        }
        return {
            enabled: raw.enabled === true && options.length >= 2,
            options,
            closes_at: closesAt,
            results_visible: resultsVisible,
        };
    }

    function isVotingClosed(config, now) {
        const cfg = normalizeConfig(config);
        if (!cfg.closes_at) return false;
        const t = now instanceof Date ? now : new Date();
        return new Date(cfg.closes_at) <= t;
    }

    function canShowResults(config, ctx) {
        const cfg = normalizeConfig(config);
        if (!cfg.enabled) return false;
        const isHost = !!(ctx && (ctx.isHost || ctx.canManageEvent));
        if (isHost) return true;
        if (cfg.results_visible === 'host_only') return false;
        if (cfg.results_visible === 'always') return true;
        return isVotingClosed(cfg, ctx && ctx.now);
    }

    function tallyCounts(parties, optionIds) {
        const ids = new Set(Array.isArray(optionIds) ? optionIds : []);
        const tallies = {};
        for (const id of ids) tallies[id] = 0;
        for (const row of (parties || [])) {
            if (!row || row.amenity_vote_status !== 'counted') continue;
            const optId = row.amenity_vote_option_id;
            if (!optId || !ids.has(optId)) continue;
            tallies[optId] = (tallies[optId] || 0) + 1;
        }
        return tallies;
    }

    function totalVotes(tallies) {
        return Object.values(tallies || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
    }

    function resultsHtml(config, tallies, opts) {
        const cfg = normalizeConfig(config);
        if (!cfg.enabled) return '';
        const options = cfg.options;
        const counts = tallies || {};
        const total = totalVotes(counts);
        const isHost = !!(opts && opts.isHost);
        const maxCount = Math.max(0, ...options.map((o) => Number(counts[o.id]) || 0));

        if (total <= 0) {
            if (!isHost) return '';
            return `
                <div class="ed-amenity-results-inner">
                    <p class="ed-amenity-results-heading">Amenity vote results</p>
                    <p class="ed-hint">No counted votes yet. Votes appear after RSVPs are committed.</p>
                </div>`;
        }

        const rows = options.map((opt) => {
            const count = Number(counts[opt.id]) || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const leader = count > 0 && count === maxCount ? ' ed-amenity-row-leader' : '';
            return `
                <div class="ed-amenity-row${leader}">
                    <div class="ed-amenity-row-head">
                        <span class="ed-amenity-label">${escapeHtml(opt.label)}</span>
                        <span class="ed-amenity-count">${count} vote${count === 1 ? '' : 's'} · ${pct}%</span>
                    </div>
                    <div class="ed-amenity-bar" aria-hidden="true"><span class="ed-amenity-bar-fill" style="width:${pct}%"></span></div>
                    ${opt.description ? `<p class="ed-amenity-desc">${escapeHtml(opt.description)}</p>` : ''}
                </div>`;
        }).join('');

        return `
            <div class="ed-amenity-results-inner">
                <p class="ed-amenity-results-heading">Amenity vote results</p>
                <p class="ed-amenity-results-sub">${total} counted vote${total === 1 ? '' : 's'}</p>
                <div class="ed-amenity-rows">${rows}</div>
            </div>`;
    }

    function pendingMessageHtml(config) {
        const cfg = normalizeConfig(config);
        if (!cfg.enabled) return '';
        const closed = isVotingClosed(cfg);
        const closeLabel = cfg.closes_at
            ? new Date(cfg.closes_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            : '';
        return `
            <div class="ed-amenity-pending">
                <p class="ed-amenity-pending-title">${closed ? 'Voting closed' : 'Voting open'}</p>
                <p class="ed-hint">${closed
                    ? 'Results will appear here when organizers publish them.'
                    : `Results shown after voting closes${closeLabel ? ` (${closeLabel})` : ''}. Cast your vote when you RSVP.`}</p>
            </div>`;
    }

    function needsVote(event) {
        const cfg = normalizeConfig(event && event.amenity_voting);
        if (!cfg.enabled) return false;
        return !isVotingClosed(cfg);
    }

    function formFieldsHtml(config, opts) {
        const cfg = normalizeConfig(config);
        if (!cfg.enabled || isVotingClosed(cfg)) return '';
        const prefix = (opts && opts.idPrefix) || 'amenityVote';
        const name = `${prefix}-group`;
        const fields = cfg.options.map((opt) => {
            const fieldId = `${prefix}-${opt.id}`;
            return `
                <label class="ed-amenity-vote-opt" style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px;padding:10px;border:1px solid #d5dfec;border-radius:12px;background:#fff;cursor:pointer">
                    <input type="radio" name="${escapeHtml(name)}" id="${escapeHtml(fieldId)}" value="${escapeHtml(opt.id)}" data-amenity-vote="${escapeHtml(opt.id)}" required style="margin-top:3px;width:18px;height:18px;accent-color:#13366e;flex-shrink:0">
                    <span style="min-width:0">
                        <span style="display:block;font-size:13px;font-weight:700;color:#0b2545;margin-bottom:4px">${escapeHtml(opt.label)}</span>
                        ${opt.description ? `<span style="display:block;font-size:12px;line-height:1.5;color:#374151">${escapeHtml(opt.description)}</span>` : ''}
                    </span>
                </label>
            `;
        }).join('');
        return `
            <div class="ed-amenity-vote" data-amenity-vote-root="${escapeHtml(prefix)}" style="margin:12px 0">
                <p style="font-size:13px;font-weight:700;color:#0b2545;margin:0 0 8px">Amenity preference <span class="text-red-500">*</span></p>
                <p class="ed-hint" style="margin:0 0 8px">Pick one option for your party. Your vote counts after RSVP is complete.</p>
                ${fields}
            </div>
        `;
    }

    function readVoteFromRoot(root) {
        const scope = root || document;
        const checked = scope.querySelector('[data-amenity-vote]:checked');
        return checked ? String(checked.getAttribute('data-amenity-vote') || checked.value || '').trim() : '';
    }

    function validateVote(config, optionId) {
        const cfg = normalizeConfig(config);
        if (!cfg.enabled || isVotingClosed(cfg)) return null;
        const id = String(optionId || '').trim();
        if (!id) return 'Please select an amenity preference.';
        const valid = cfg.options.some((o) => o.id === id);
        if (!valid) return 'Please select a valid amenity option.';
        return null;
    }

    function voteStatusForRsvp(event, seatPriceCents) {
        const price = Number(seatPriceCents) || 0;
        if (price > 0) return 'provisional';
        return 'counted';
    }

    function scrollToVoteField(root) {
        const scope = root || document;
        const wrap = scope.querySelector('.ed-amenity-vote') || scope.querySelector('[data-amenity-vote-root]');
        if (wrap) {
            wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const first = wrap.querySelector('[data-amenity-vote]');
            if (first && typeof first.focus === 'function') first.focus();
        }
    }

    const api = {
        defaultConfig,
        normalizeConfig,
        normalizeOptions,
        isVotingClosed,
        canShowResults,
        tallyCounts,
        totalVotes,
        resultsHtml,
        pendingMessageHtml,
        needsVote,
        formFieldsHtml,
        readVoteFromRoot,
        validateVote,
        voteStatusForRsvp,
        scrollToVoteField,
    };

    globalThis.EventsAmenityVoting = api;
})();
