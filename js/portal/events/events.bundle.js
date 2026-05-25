/* Portal Events — production bundle (generated; do not edit by hand) */
/* Built: 2026-05-25T17:14:17.082Z */
/* Modules: 4 shared + index + 55 chain + init */

;/* ===== js/components/events/constants.js ===== */
/* ════════════════════════════════════════════════════════════
   Events — Shared Constants
   Single source of truth for category emoji, type colors,
   gradients, status colors, and tag labels.

   Used by: portal/events, /events/ (public), admin/events.
   Loaded BEFORE all surface-specific event modules.

   Surface namespace : window.EventsConstants
   Legacy aliases    : window.PUB_*, window.EVT_*, etc.
                       (legacy modules redefine these locally
                        — that's fine, values are identical)
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // ─── Category → emoji ─────────────────────────────────
    const CATEGORY_EMOJI = {
        party:      '🎉',
        birthday:   '🎂',
        hangout:    '🤝',
        game_night: '🎮',
        cookout:    '🍖',
        trip:       '🏔️',
        retreat:    '🏖️',
        dinner:     '🍽️',
        holiday:    '🎄',
        investment: '💼',
        annual:     '📅',
        other:      '📌',
    };

    // ─── Category → modern tag classes (portal cards) ─────
    const CATEGORY_TAG = {
        birthday:   { cls: 'evt-tag--pink',   label: 'Birthday' },
        party:      { cls: 'evt-tag--orange', label: 'Party' },
        hangout:    { cls: 'evt-tag--green',  label: 'Hangout' },
        game_night: { cls: 'evt-tag--purple', label: 'Game Night' },
        cookout:    { cls: 'evt-tag--orange', label: 'Cookout' },
        trip:       { cls: 'evt-tag--teal',   label: 'Trip' },
        retreat:    { cls: 'evt-tag--teal',   label: 'Retreat' },
        dinner:     { cls: 'evt-tag--blue',   label: 'Dinner' },
        holiday:    { cls: 'evt-tag--blue',   label: 'Holiday' },
        investment: { cls: 'evt-tag--blue',   label: 'Investment' },
        annual:     { cls: 'evt-tag--purple', label: 'Annual' },
    };
    const DEFAULT_TAG = { cls: 'evt-tag--purple', label: 'Event' };

    // ─── Category → card gradient (no banner fallback) ────
    // events_003 §7.3 — muted, photographic-feeling palette.
    // Each gradient is anchored on a deeper, darker color so the
    // white text + emoji watermark remains legible without the
    // saturated, cartoony feel of the previous palette.
    const CATEGORY_GRADIENT = {
        birthday:   'linear-gradient(135deg,#831843,#ec4899)',  // wine → rose
        party:      'linear-gradient(135deg,#1e1b4b,#6366f1)',  // deep indigo → brand
        hangout:    'linear-gradient(135deg,#14532d,#4ade80)',  // forest → light green
        game_night: 'linear-gradient(135deg,#0f172a,#475569)',  // slate
        cookout:    'linear-gradient(135deg,#7c2d12,#f97316)',  // rust → amber
        trip:       'linear-gradient(135deg,#0c4a6e,#0ea5e9)',  // deep teal → sky
        retreat:    'linear-gradient(135deg,#0c4a6e,#0ea5e9)',  // deep teal → sky
        dinner:     'linear-gradient(135deg,#422006,#d97706)',  // umber → amber
        holiday:    'linear-gradient(135deg,#052e16,#16a34a)',  // forest → green
        investment: 'linear-gradient(135deg,#0f172a,#475569)',  // slate
        annual:     'linear-gradient(135deg,#1e1b4b,#6366f1)',  // deep indigo → brand
        celebration:'linear-gradient(135deg,#4a044e,#d946ef)',  // deep purple → fuchsia
        competition:'linear-gradient(135deg,#052e16,#16a34a)',  // forest → green
        fundraiser: 'linear-gradient(135deg,#422006,#d97706)',  // umber → amber
        volunteer:  'linear-gradient(135deg,#14532d,#4ade80)',  // forest → light green
        meeting:    'linear-gradient(135deg,#0f172a,#475569)',  // slate
        other:      'linear-gradient(135deg,#1f2937,#6b7280)',  // charcoal
    };
    const DEFAULT_GRADIENT = 'linear-gradient(135deg,#1f2937,#6b7280)';

    // ─── Event type → color tokens ────────────────────────
    // Portal flavor (Tailwind classes) and Public flavor (raw colors).
    const TYPE_COLORS_PORTAL = {
        llc:         { bg: 'bg-amber-100', text: 'text-amber-700', label: 'LLC' },
        member:      { bg: 'bg-brand-100', text: 'text-brand-700', label: 'Member' },
        competition: { bg: 'bg-rose-100',  text: 'text-rose-700',  label: 'Competition' },
    };
    const TYPE_COLORS_PUBLIC = {
        llc:         { bg: '#f7f7f7', color: '#222', label: 'LLC Event' },
        member:      { bg: '#f7f7f7', color: '#222', label: 'Member Event' },
        competition: { bg: '#f7f7f7', color: '#222', label: 'Competition' },
    };

    // ─── Event status → Tailwind chip class ───────────────
    const STATUS_COLORS = {
        draft:     'bg-gray-100 text-gray-600',
        open:      'bg-emerald-100 text-emerald-700',
        confirmed: 'bg-blue-100 text-blue-700',
        active:    'bg-violet-100 text-violet-700',
        completed: 'bg-gray-100 text-gray-500',
        cancelled: 'bg-red-100 text-red-600',
    };

    // ─── LLC event document types (portal detail + manage) ─
    const EVENT_DOC_TYPES = [
        { value: 'plane_ticket', label: '✈️ Plane Ticket', perMember: true },
        { value: 'group_ticket', label: '🎫 Group Ticket / Pass', perMember: false },
        { value: 'itinerary', label: '📋 Itinerary', perMember: false },
        { value: 'receipt', label: '🧾 Receipt', perMember: false },
        { value: 'other', label: '📎 Other', perMember: false },
    ];

    // ─── Pricing modes (from events_001.md) ───────────────
    const PRICING_MODES = {
        fully_paid:           { label: 'Fully Paid' },
        free_event_paid_raffle: { label: 'Free Event · Paid Raffle' },
        fully_free:           { label: 'Fully Free' },
    };

    // ─── Public exports ───────────────────────────────────
    const EventsConstants = {
        CATEGORY_EMOJI,
        CATEGORY_TAG,
        DEFAULT_TAG,
        CATEGORY_GRADIENT,
        DEFAULT_GRADIENT,
        TYPE_COLORS_PORTAL,
        TYPE_COLORS_PUBLIC,
        STATUS_COLORS,
        EVENT_DOC_TYPES,
        PRICING_MODES,
    };

    window.EventsConstants = EventsConstants;
})();

;/* ===== js/components/events/helpers.js ===== */
/* ════════════════════════════════════════════════════════════
   Events — Shared Helpers
   Pure utility functions used across portal/events,
   /events/ (public), and admin/events.

   Surface namespace : window.EventsHelpers
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    // ─── escapeHtml ───────────────────────────────────────
    function escapeHtml(str) {
        if (str == null) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    // ─── miniMarkdown (bold / italic / links) ─────────────
    // Set `escapeFirst=true` to escape raw text first (safe path).
    function miniMarkdown(text, escapeFirst = false) {
        if (!text) return '';
        let html = escapeFirst ? escapeHtml(text) : text;
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener">$1</a>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        return html;
    }

    // ─── formatMoney ──────────────────────────────────────
    function formatMoney(cents, opts = {}) {
        const n = Number(cents) || 0;
        const dollars = n / 100;
        const showCents = opts.showCents !== false && (dollars % 1 !== 0);
        return '$' + dollars.toLocaleString('en-US', {
            minimumFractionDigits: showCents ? 2 : 0,
            maximumFractionDigits: showCents ? 2 : 0,
        });
    }

    // ─── formatDate ───────────────────────────────────────
    // mode: 'short' (Sat Jun 14) | 'long' (Saturday, June 14, 2026)
    //       | 'time' (7:30 PM) | 'datetime' (Sat Jun 14 · 7:30 PM)
    //       | 'relative' (in 3 days · today · 2 hours ago)
    function formatDate(input, mode = 'short') {
        if (!input) return '';
        const d = input instanceof Date ? input : new Date(input);
        if (isNaN(d)) return '';

        if (mode === 'time') {
            return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }
        if (mode === 'long') {
            return d.toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
            });
        }
        if (mode === 'datetime') {
            const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            return `${date} · ${time}`;
        }
        if (mode === 'relative') {
            return relativeTime(d);
        }
        // default 'short'
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    function relativeTime(d) {
        const ms = d - new Date();
        const future = ms > 0;
        const abs = Math.abs(ms);
        const min = 60_000, hr = 3_600_000, day = 86_400_000;
        if (abs < min) return future ? 'in moments' : 'just now';
        if (abs < hr) {
            const m = Math.round(abs / min);
            return future ? `in ${m}m` : `${m}m ago`;
        }
        if (abs < day) {
            const h = Math.round(abs / hr);
            return future ? `in ${h}h` : `${h}h ago`;
        }
        const days = Math.round(abs / day);
        if (days === 0) return 'today';
        if (days === 1) return future ? 'tomorrow' : 'yesterday';
        if (days < 7) return future ? `in ${days} days` : `${days} days ago`;
        return formatDate(d, 'short');
    }

    // ─── ordinal suffix ───────────────────────────────────
    function ordinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    // ─── slug from title ──────────────────────────────────
    function generateSlug(title) {
        return String(title || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 60)
            + '-' + Date.now().toString(36);
    }

    // ─── Lightbox (image preview) ─────────────────────────
    // Singleton element reused across opens. Click-to-close.
    function openLightbox(imgUrl) {
        if (!imgUrl) return;
        let lb = document.querySelector('.evt-lightbox');
        if (!lb) {
            lb = document.createElement('div');
            lb.className = 'evt-lightbox';
            lb.setAttribute('role', 'dialog');
            lb.setAttribute('aria-label', 'Image preview');
            lb.innerHTML =
                '<button class="evt-lightbox-close" aria-label="Close preview">' +
                  '<svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>' +
                  '</svg>' +
                '</button>' +
                '<img src="" alt="Event banner full size">';
            const close = () => {
                lb.classList.remove('active');
                document.body.style.overflow = '';
                setTimeout(() => { if (!lb.classList.contains('active')) lb.remove(); }, 250);
            };
            lb.addEventListener('click', (e) => {
                if (e.target === lb || e.target.closest('.evt-lightbox-close')) close();
            });
            document.body.appendChild(lb);
        }
        lb.querySelector('img').src = imgUrl;
        requestAnimationFrame(() => lb.classList.add('active'));
        document.body.style.overflow = 'hidden';
    }

    // ─── Live countdown ───────────────────────────────────
    // Returns a stop() function. Updates badgeEl every 60s
    // (or every 1s when within 1 hour of start). When the
    // event goes live, badgeEl is replaced with a "Live" pill.
    function startLiveCountdown(startDate, badgeEl, opts = {}) {
        if (!badgeEl) return () => {};
        const start = startDate instanceof Date ? startDate : new Date(startDate);
        const liveClass = opts.liveClass || 'evt-status-badge evt-status-live';
        const dotClass  = opts.dotClass  || 'evt-status-dot';
        let timer = null;
        let stopped = false;

        function render() {
            const ms = start - new Date();
            if (ms <= 0) {
                badgeEl.className = liveClass;
                badgeEl.innerHTML = `<span class="${dotClass} pulse"></span>Live`;
                stop();
                return;
            }
            const d = Math.floor(ms / 86_400_000);
            const h = Math.floor((ms % 86_400_000) / 3_600_000);
            const m = Math.floor((ms % 3_600_000) / 60_000);
            const s = Math.floor((ms % 60_000) / 1_000);
            let lbl;
            if (d > 0)      lbl = `${d}d ${h}h`;
            else if (h > 0) lbl = `${h}h ${m}m`;
            else            lbl = `${m}m ${s}s`;
            const inner = `<span class="${dotClass}${d === 0 ? ' pulse' : ''}"></span>${lbl}`;
            // If badgeEl is the wrapper, look for inner badge; otherwise update directly.
            const inner_badge = badgeEl.querySelector?.('.evt-status-badge');
            if (inner_badge) inner_badge.innerHTML = inner;
            else             badgeEl.innerHTML = inner;
        }

        function schedule() {
            if (stopped) return;
            const ms = start - new Date();
            const interval = ms <= 3_600_000 ? 1_000 : 60_000;
            timer = setInterval(() => {
                render();
                const remaining = start - new Date();
                if (remaining <= 3_600_000 && interval === 60_000) {
                    clearInterval(timer);
                    schedule(); // upgrade cadence
                }
            }, interval);
        }

        function stop() {
            stopped = true;
            if (timer) { clearInterval(timer); timer = null; }
        }

        render();
        schedule();
        return stop;
    }

    // ─── Toast (lightweight) ──────────────────────────────
    function toast(message, opts = {}) {
        const el = document.createElement('div');
        el.textContent = message;
        const variant = opts.variant || 'default';
        const variants = {
            default: 'bg-gray-900 text-white',
            success: 'bg-emerald-600 text-white',
            error:   'bg-red-600 text-white',
        };
        el.className =
            'fixed top-6 left-1/2 -translate-x-1/2 ' +
            (variants[variant] || variants.default) +
            ' text-sm font-semibold px-4 py-2 rounded-xl shadow-lg z-[70] transition-opacity duration-300';
        document.body.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, opts.duration || 1500);
    }

    // ─── relativeDate (card-display short label) ──────────
    // events_003 §8.6 — distinct from relativeTime ("3h ago" style).
    // Returns short, scannable card labels:
    //   today after 5pm → "Tonight"
    //   today           → "Today"
    //   tomorrow        → "Tomorrow"
    //   ≤6 days future  → "in N days"
    //   else            → "Sat Jun 14"
    //   past            → "Sat Jun 14"
    function relativeDate(input) {
        if (!input) return '';
        const d = input instanceof Date ? input : new Date(input);
        if (isNaN(d)) return '';
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfDay   = new Date(d.getFullYear(),   d.getMonth(),   d.getDate());
        const dayDiff = Math.round((startOfDay - startOfToday) / 86_400_000);
        if (dayDiff === 0) {
            return d.getHours() >= 17 ? 'Tonight' : 'Today';
        }
        if (dayDiff === 1)  return 'Tomorrow';
        if (dayDiff === -1) return 'Yesterday';
        if (dayDiff > 1 && dayDiff <= 6) return `in ${dayDiff} days`;
        return formatDate(d, 'short');
    }

    // ─── groupByBucket (time-bucket grouping) ─────────────
    // events_003 §8.7 — returns [{ label, events: [] }, ...]
    // mode: 'upcoming' → Tonight | This week | This month | Later
    //       'past'     → Last week | Last month | Earlier
    //       'going'    → Tonight | This week | Later
    // Buckets with zero events are dropped. Input order preserved
    // within each bucket (caller is responsible for date-sort).
    function groupByBucket(events, mode = 'upcoming') {
        const list = Array.isArray(events) ? events : [];
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Bucket schemas
        const schema = {
            upcoming: ['Tonight', 'This week', 'This month', 'Later'],
            past:     ['Last week', 'Last month', 'Earlier'],
            going:    ['Tonight', 'This week', 'Later'],
        };
        const labels = schema[mode] || schema.upcoming;
        const buckets = Object.fromEntries(labels.map(l => [l, []]));

        function bucketOf(e) {
            const raw = e?.start_at || e?.start_date || e?.starts_at;
            if (!raw) return labels[labels.length - 1];
            const d = new Date(raw);
            if (isNaN(d)) return labels[labels.length - 1];
            const dayDiff = Math.round((d - startOfToday) / 86_400_000);

            if (mode === 'past') {
                // dayDiff is negative for past
                if (dayDiff >= -7)  return 'Last week';
                if (dayDiff >= -30) return 'Last month';
                return 'Earlier';
            }

            // upcoming / going
            if (dayDiff <= 0)           return 'Tonight';   // today (any hour) or already started
            if (dayDiff <= 7)           return 'This week';
            if (mode === 'going')       return 'Later';
            if (dayDiff <= 30)          return 'This month';
            return 'Later';
        }

        for (const e of list) {
            const b = bucketOf(e);
            if (buckets[b]) buckets[b].push(e);
        }
        return labels
            .map(label => ({ label, events: buckets[label] }))
            .filter(g => g.events.length > 0);
    }

    // ─── Toggle a modal (legacy parity) ───────────────────
    function toggleModal(id, show) {
        const modal = document.getElementById(id);
        if (!modal) return;
        if (show) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } else {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // ─── Public exports ───────────────────────────────────
    const EventsHelpers = {
        escapeHtml,
        miniMarkdown,
        formatMoney,
        formatDate,
        relativeTime,
        relativeDate,
        groupByBucket,
        ordinal,
        generateSlug,
        openLightbox,
        startLiveCountdown,
        toast,
        toggleModal,
    };

    window.EventsHelpers = EventsHelpers;
})();

;/* ===== js/components/events/pills.js ===== */
/* ════════════════════════════════════════════════════════════
   Events — Shared Pill / Badge Renderers
   String-returning helpers for status, type, and RSVP pills.
   These are the canonical visual vocabulary used by every
   event surface (portal list/detail, public, admin).

   Surface namespace : window.EventsPills
   Depends on        : window.EventsConstants
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.EventsConstants || {};

    // ─── Status pill ──────────────────────────────────────
    // Reflects event lifecycle status (draft / open / etc.)
    function statusPill(status) {
        const cls = (C.STATUS_COLORS && C.STATUS_COLORS[status]) ||
                    'bg-gray-100 text-gray-600';
        const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
        return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}">${label}</span>`;
    }

    // ─── Live / Soon / Past / Cancelled state pill ────────
    // Distinct from `statusPill` — this is time-derived, not
    // lifecycle-derived. Inline Tailwind utilities (no CSS deps).
    // Reads either `start_date`/`end_date` or `start_at`/`end_at`.
    function statePill(event) {
        if (!event) return '';
        const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap';
        if (event.status === 'cancelled') {
            return `<span class="${base} bg-red-50 text-red-700">Cancelled</span>`;
        }
        const now    = new Date();
        const startRaw = event.start_date || event.start_at || event.starts_at;
        const endRaw   = event.end_date   || event.end_at   || event.ends_at;
        const start  = startRaw ? new Date(startRaw) : null;
        const end    = endRaw   ? new Date(endRaw)   : null;
        if (!start || isNaN(start)) return '';
        if (start <= now && (!end || end >= now)) {
            return `<span class="${base} bg-rose-50 text-rose-700">`
                 + `<span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>Live</span>`;
        }
        if (end && end < now) {
            return `<span class="${base} bg-gray-100 text-gray-500">Past</span>`;
        }
        const ms = start - now;
        if (ms <= 86_400_000) {
            return `<span class="${base} bg-amber-50 text-amber-700">Soon</span>`;
        }
        return '';
    }

    // ─── Countdown chip (events_003 §8.6) ─────────────────
    // Compact "starts in N" chip for ≤72h-out events. Returns
    // '' when out of window so card footer collapses cleanly.
    function countdownChip(event) {
        if (!event || event.status === 'cancelled') return '';
        const startRaw = event.start_date || event.start_at || event.starts_at;
        if (!startRaw) return '';
        const start = new Date(startRaw);
        if (isNaN(start)) return '';
        const ms = start - new Date();
        if (ms <= 0) return ''; // already started — statePill handles "Live"
        if (ms > 72 * 3_600_000) return '';

        const hours = ms / 3_600_000;
        let label;
        if (hours < 1) {
            const m = Math.max(1, Math.round(ms / 60_000));
            label = `Starts in ${m}m`;
        } else if (hours < 24) {
            label = `Starts in ${Math.round(hours)}h`;
        } else {
            const days = Math.round(hours / 24);
            label = days === 1 ? 'Tomorrow' : `In ${days} days`;
        }
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-brand-50 text-brand-700">`
             + `<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">`
             + `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`
             + `</svg>${label}</span>`;
    }

    // ─── Type pill (LLC / Member / Competition) ───────────
    // `flavor` = 'portal' (Tailwind chip) | 'public' (raw style)
    function typePill(eventType, flavor = 'portal') {
        if (flavor === 'public') {
            const tc = (C.TYPE_COLORS_PUBLIC && C.TYPE_COLORS_PUBLIC[eventType]) ||
                       C.TYPE_COLORS_PUBLIC?.llc ||
                       { bg: '#f7f7f7', color: '#222', label: 'Event' };
            return `<span class="evt-tag" style="background:${tc.bg};color:${tc.color}">${tc.label}</span>`;
        }
        const tc = (C.TYPE_COLORS_PORTAL && C.TYPE_COLORS_PORTAL[eventType]) ||
                   C.TYPE_COLORS_PORTAL?.llc ||
                   { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Event' };
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${tc.bg} ${tc.text} whitespace-nowrap">${tc.label}</span>`;
    }

    // ─── Category tag (uses .evt-tag--* classes) ──────────
    function categoryTag(category) {
        const tag = (C.CATEGORY_TAG && C.CATEGORY_TAG[category]) ||
                    C.DEFAULT_TAG ||
                    { cls: 'evt-tag--purple', label: 'Event' };
        return `<span class="evt-tag ${tag.cls}">${tag.label}</span>`;
    }

    // ─── RSVP-status chip (Going / Maybe / Waitlist / —) ──
    function rsvpChip(rsvp) {
        if (!rsvp || !rsvp.status) return '';
        const map = {
            going:        { cls: 'bg-brand-50 text-brand-700',    label: '✓ Going' },
            maybe:        { cls: 'bg-amber-50 text-amber-700',    label: '~ Maybe' },
            not_going:    { cls: 'bg-gray-100 text-gray-500',     label: 'Not going' },
            waitlist:     { cls: 'bg-violet-50 text-violet-700',  label: 'Waitlisted' },
            cancelled:    { cls: 'bg-red-50 text-red-600',        label: 'Cancelled' },
        };
        const m = map[rsvp.status];
        if (!m) return '';
        return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${m.cls}">${m.label}</span>`;
    }

    // ─── Public exports ───────────────────────────────────
    const EventsPills = {
        statusPill,
        statePill,
        typePill,
        categoryTag,
        rsvpChip,
        countdownChip,
    };

    window.EventsPills = EventsPills;
})();

;/* ===== js/components/events/card.js ===== */
/* ════════════════════════════════════════════════════════════
   Events — Shared Event Card Renderer
   String-returning card renderer used by:
     • portal/events list grid (M1, redesigned events_003)
     • admin/events card grid  (M3)

   Mobile-first. Heavy inline Tailwind. Returns HTML string.

   Usage:
     EventsCard.render(event, {
       rsvp: rsvpRecordOrNull,
       href: '?event=' + event.slug,
       variant: 'portal' | 'admin',
       adminMeta: { rsvps: 12, revenue: 14000 },        // admin only
       attendees: [{ profile_picture_url, first_name }] // portal only, optional
     })

   Surface namespace : window.EventsCard
   Depends on        : window.EventsConstants, window.EventsHelpers,
                       window.EventsPills
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.EventsConstants || {};
    const H = window.EventsHelpers   || {};
    const P = window.EventsPills     || {};

    // ─── Helpers ──────────────────────────────────────────
    function _startDate(event) {
        const raw = event.start_date || event.start_at || event.starts_at;
        if (!raw) return null;
        const d = new Date(raw);
        return isNaN(d) ? null : d;
    }

    function _bannerBg(event) {
        if (event.banner_url) {
            return `background:linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.45)),url('${H.escapeHtml(event.banner_url)}') center/cover`;
        }
        const grad = (C.CATEGORY_GRADIENT && C.CATEGORY_GRADIENT[event.category]) ||
                     C.DEFAULT_GRADIENT ||
                     'linear-gradient(135deg,#1f2937,#6b7280)';
        return `background:${grad}`;
    }

    function _emptyBannerEmoji(event) {
        if (event.banner_url) return '';
        const emoji = (C.CATEGORY_EMOJI && C.CATEGORY_EMOJI[event.category]) || '📅';
        return `<div class="absolute inset-0 flex items-center justify-center text-6xl opacity-40 pointer-events-none select-none">${emoji}</div>`;
    }

    // C2 — Tappable category chip overlay (events_003 §3.11 / §8.5)
    // Shows on every card with a category. Sets _activeCategory via
    // data-evt-cat click handler wired in list.js _wireCardClicks.
    function _categoryChip(event) {
        if (!event || !event.category) return '';
        const emoji = (C.CATEGORY_EMOJI && C.CATEGORY_EMOJI[event.category]) || '📅';
        const label = (C.CATEGORY_TAG && C.CATEGORY_TAG[event.category]?.label) || event.category;
        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        return `<button type="button" data-evt-cat="${esc(event.category)}"
            class="evt-cat-chip absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-center text-base leading-none hover:scale-110 active:scale-95 transition-transform"
            aria-label="Filter by ${esc(label)}" title="Filter by ${esc(label)}">${emoji}</button>`;
    }

    // Date stamp (header row, NOT overlay) — events_003 §8.6
    // Pinned LLC events get a small 📌 overlay — events_003 §8.8
    function _dateStamp(event) {
        const d = _startDate(event);
        if (!d) return '<div class="w-11"></div>';
        const day = d.getDate();
        const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const isPinnedLlc = event && event.is_pinned && event.event_type === 'llc';
        const pin = isPinnedLlc
            ? '<span class="evt-date-pin" aria-label="Pinned LLC event" title="Pinned">📌</span>'
            : '';
        const dow = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        return `<div class="relative shrink-0 text-center min-w-[44px]">
            ${pin}
            <div class="text-[20px] leading-none font-extrabold text-gray-900">${day}</div>
            <div class="text-[10px] tracking-wider font-bold text-brand-600 mt-0.5">${mon}</div>
            <div class="evt-date-stamp-dow text-[9px] tracking-wider font-semibold text-gray-400 mt-0.5">${dow}</div>
        </div>`;
    }

    function _relativeLabel(event) {
        const d = _startDate(event);
        if (!d || !H.relativeDate) return '';
        const lbl = H.relativeDate(d);
        if (!lbl) return '';
        return `<span class="text-[12px] font-semibold text-gray-500">${lbl}</span>`;
    }

    // Meta row: "Category · Type · Location" (text, not chips)
    function _meta(event) {
        const parts = [];
        const catLabel = (C.CATEGORY_TAG && C.CATEGORY_TAG[event.category]?.label) || null;
        if (catLabel) parts.push(catLabel);
        const tc = (C.TYPE_COLORS_PORTAL && C.TYPE_COLORS_PORTAL[event.event_type]);
        if (tc?.label) parts.push(tc.label);
        const loc = event.location_nickname || event.location_text;
        if (loc) parts.push(H.escapeHtml ? H.escapeHtml(loc) : loc);
        const time = _startDate(event);
        if (time && H.formatDate) parts.push(H.formatDate(time, 'time'));
        if (!parts.length) return '';
        return `<p class="text-[13px] text-gray-500 truncate mt-1" data-evt-legacy-meta>${parts.join(' · ')}</p>`;
    }

    // Avatar stack — events_003 §8.6 (max 4 + overflow count)
    function _avatarStack(attendees) {
        const list = Array.isArray(attendees) ? attendees : [];
        if (!list.length) return '';
        const visible = list.slice(0, 4);
        const overflow = Math.max(0, list.length - 4);
        const pieces = visible.map((a) => {
            const name = H.escapeHtml ? H.escapeHtml(a.first_name || '') : (a.first_name || '');
            if (a.profile_picture_url) {
                const url = H.escapeHtml ? H.escapeHtml(a.profile_picture_url) : a.profile_picture_url;
                return `<img src="${url}" alt="${name}" loading="lazy" class="w-7 h-7 rounded-full ring-2 ring-white object-cover bg-gray-100">`;
            }
            const initial = (a.first_name || '?').trim().charAt(0).toUpperCase() || '?';
            return `<span class="w-7 h-7 rounded-full ring-2 ring-white bg-brand-100 text-brand-700 text-[11px] font-bold inline-flex items-center justify-center">${initial}</span>`;
        });
        if (overflow > 0) {
            pieces.push(`<span class="w-7 h-7 rounded-full ring-2 ring-white bg-gray-100 text-gray-600 text-[11px] font-bold inline-flex items-center justify-center">+${overflow}</span>`);
        }
        return `<div class="flex -space-x-2">${pieces.join('')}</div>`;
    }

    // Going ribbon (top of card) — events_003 §8.6
    function _goingRibbon(rsvp) {
        if (!rsvp || rsvp.status !== 'going') return '';
        return `<div class="evt-going-ribbon bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider px-4 py-1 flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>You're going
        </div>`;
    }

    function _adminFooter(event, adminMeta) {
        const rsvps   = adminMeta?.rsvps   ?? 0;
        const revenue = adminMeta?.revenue ?? 0;
        const revStr  = H.formatMoney ? H.formatMoney(revenue) : `$${(revenue/100).toFixed(0)}`;
        return `<div class="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
            <span class="font-semibold text-gray-700">${rsvps}</span> RSVPs
            <span class="text-gray-300">·</span>
            <span class="font-semibold text-gray-700">${revStr}</span> revenue
            <span class="ml-auto">${P.statusPill ? P.statusPill(event.status) : ''}</span>
        </div>`;
    }

    // ─── Main render (events_003 §8.6) ────────────────────
    function render(event, opts = {}) {
        if (!event) return '';
        const variant = opts.variant || 'portal';
        const href    = opts.href || `?event=${encodeURIComponent(event.slug || '')}`;
        const title   = H.escapeHtml ? H.escapeHtml(event.title || 'Untitled event') : (event.title || '');

        const stateP    = P.statePill     ? P.statePill(event)            : '';
        const countP    = (variant === 'portal' && P.countdownChip)
                            ? P.countdownChip(event) : '';
        const ribbon    = (variant === 'portal') ? _goingRibbon(opts.rsvp) : '';
        const stack     = (variant === 'portal') ? _avatarStack(opts.attendees) : '';

        // F7 — vlift date overlay chip (vertical white card on banner top-left)
        const _d = _startDate(event);
        const _day = _d ? _d.getDate() : '';
        const _mon = _d ? _d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
        const _dow = _d ? _d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() : '';
        const dataDate = _d ? ` data-evt-day="${_day}" data-evt-mon="${_mon}"` : '';
        const dateChipOverlay = _d
            ? `<div class="evt-card-date-chip" aria-hidden="true"><span class="evt-card-date-mon">${_mon}</span><span class="evt-card-date-day">${_day}</span><span class="evt-card-date-dow" data-f15-dow>${_dow}</span></div>`
            : '';
        // F7 — RSVP footer outline button (portal vlift only; rendered for all, CSS gates)
        const isGoing = !!(opts.rsvp && opts.rsvp.status === 'going');
        const rsvpFooter = (variant === 'portal')
            ? `<button type="button" data-evt-card-rsvp="${event.id}" class="evt-card-rsvp${isGoing ? ' evt-card-rsvp--on' : ''}" aria-pressed="${isGoing ? 'true' : 'false'}">${isGoing ? '✓ Going' : 'Details'}</button>`
            : '';

        // F15 — Split meta (vlift): type/host line, then icon rows for location + time.
        // Legacy _meta() still emitted (hidden under vlift) so non-vlift stays intact.
        const _tcLabel = (C.TYPE_COLORS_PORTAL && C.TYPE_COLORS_PORTAL[event.event_type]?.label) || '';
        const _catLabel = (C.CATEGORY_TAG && C.CATEGORY_TAG[event.category]?.label) || '';
        const f15TypeHost = (_tcLabel || _catLabel)
            ? `<p class="evt-card-f15-type" data-f15-type>${[_tcLabel, _catLabel].filter(Boolean).map(s => H.escapeHtml ? H.escapeHtml(s) : s).join(' \u00B7 ')}</p>`
            : '';
        const _f15Loc = event.location_nickname || event.location_text || '';
        const _f15Time = (_d && H.formatDate) ? H.formatDate(_d, 'time') : '';
        const f15LocRow = _f15Loc
            ? `<p class="evt-card-f15-row" data-f15-loc><svg class="evt-card-f15-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s7-7.58 7-13a7 7 0 10-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg><span class="truncate">${H.escapeHtml ? H.escapeHtml(_f15Loc) : _f15Loc}</span></p>`
            : '';
        const f15TimeRow = _f15Time
            ? `<p class="evt-card-f15-row" data-f15-time><svg class="evt-card-f15-ico" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5l3 2"/></svg><span>${H.escapeHtml ? H.escapeHtml(_f15Time) : _f15Time}</span></p>`
            : '';
        const f15Body = (f15TypeHost || f15LocRow || f15TimeRow)
            ? `<div class="evt-card-f15" data-f15>${f15TypeHost}${f15LocRow}${f15TimeRow}</div>`
            : '';
        // F15 — Compact footer (vlift): attendee cluster + "N going" left, compact RSVP pill right.
        // opts.goingCount = true total (members + guests); falls back to avatar list length.
        const _goingCount = (opts.goingCount != null) ? opts.goingCount : (Array.isArray(opts.attendees) ? opts.attendees.length : 0);
        const f15GoingLabel = _goingCount > 0
            ? `<span class="evt-card-f15-going">${_goingCount} going</span>`
            : '';
        const f15RsvpPill = (variant === 'portal')
            ? `<button type="button" data-evt-card-rsvp="${event.id}" data-f15-rsvp class="evt-card-f15-rsvp${isGoing ? ' evt-card-f15-rsvp--on' : ''}" aria-pressed="${isGoing ? 'true' : 'false'}">${isGoing ? '✓ Going' : 'Details'}</button>`
            : '';
        const f15Footer = (variant === 'portal')
            ? `<div class="evt-card-f15-foot" data-f15-foot><div class="evt-card-f15-foot__left">${stack}${f15GoingLabel}</div>${f15RsvpPill}</div>`
            : '';

        return `<a href="${href}" data-evt-card="${event.id}"${dataDate} class="group block bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden transition md:hover:shadow-md md:hover:-translate-y-0.5">
            ${ribbon}
            <div class="px-4 pt-3 pb-2 flex items-center gap-3 evt-card-header-row">
                ${_dateStamp(event)}
                <div class="flex-1 min-w-0 flex items-center justify-end">
                    ${_relativeLabel(event)}
                </div>
            </div>
            <div class="relative w-full aspect-[16/9] evt-card-banner" style="${_bannerBg(event)}">
                ${_emptyBannerEmoji(event)}
                ${dateChipOverlay}
                ${_categoryChip(event)}
                ${stateP ? `<div class="absolute top-3 right-3">${stateP}</div>` : ''}
            </div>
            <div class="p-4">
                <h3 class="text-base font-bold text-gray-900 line-clamp-2 leading-snug">${title}</h3>
                ${f15Body}
                ${_meta(event)}
                ${(stack || countP) ? `<div class="mt-3 flex items-center justify-between gap-3" data-evt-legacy-stack>
                    <div class="min-w-0">${stack}</div>
                    <div class="shrink-0">${countP}</div>
                </div>` : ''}
                ${rsvpFooter}
                ${f15Footer}
                ${variant === 'admin' ? _adminFooter(event, opts.adminMeta) : ''}
            </div>
        </a>`;
    }

    // ─── Skeleton placeholder ─────────────────────────────
    function skeleton() {
        return `<div class="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden animate-pulse">
            <div class="px-4 pt-3 pb-2 flex items-center gap-3">
                <div class="w-11 h-9 bg-gray-100 rounded"></div>
                <div class="flex-1"></div>
                <div class="w-14 h-3 bg-gray-100 rounded"></div>
            </div>
            <div class="w-full aspect-[16/9] bg-gray-100"></div>
            <div class="p-4 space-y-2">
                <div class="h-4 bg-gray-100 rounded w-3/4"></div>
                <div class="h-3 bg-gray-100 rounded w-1/2"></div>
                <div class="h-7 bg-gray-100 rounded-full w-1/3 mt-3"></div>
            </div>
        </div>`;
    }

    window.EventsCard = { render, skeleton };
})();


;/* ===== js/portal/events/index.js ===== */
/* ════════════════════════════════════════════════════════════

   Portal Events — Namespace shell  (M1)

   Establishes `window.PortalEvents` so feature modules

   (list, detail, create, etc.) can register themselves

   without polluting the global scope further.



   Loaded BEFORE core/state.js (via classic-chain-loader) so

   subsequent modules can attach. Requires

   `js/components/events/constants.js` in the page first.



   Existing legacy `evt*` globals are preserved unchanged

   for backward compat with not-yet-refactored modules

   (rsvp.js, detail/comments.js, detail/map-live.js, detail/competition.js, etc.).

   ════════════════════════════════════════════════════════════ */

(function () {

    'use strict';

    window.PortalEvents = window.PortalEvents || {};



    var C = window.EventsConstants || {};

    window.PortalEvents.constants = {

        CATEGORY_EMOJI: C.CATEGORY_EMOJI,

        TYPE_COLORS: C.TYPE_COLORS_PORTAL,

        STATUS_COLORS: C.STATUS_COLORS,

    };



    // Sub-namespaces are created lazily by their owners:

    //   PortalEvents.list   ← list.js   (M1)

    //   PortalEvents.detail ← detail.js (M2)

    //   PortalEvents.create ← create/sheet.js (M4)

    //   PortalEvents.manage ← manage/   (M3)

    // Future (Phase 5): call window.PortalEvents.initEventsPage() here

    //   once the HTML is switched to a single module entry.

})();


;/* ===== js/portal/events/core/state.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Shared State
// All mutable state referenced across event modules lives here.
// ═══════════════════════════════════════════════════════════

let evtCurrentUser = null;
let evtCurrentUserRole = null;
let evtActiveTab = 'upcoming';
let evtBannerFile = null;
let evtEmbedImageFile = null;
let evtAllEvents = [];
let evtAllRsvps = {};      // event_id → rsvp record
let evtScannerStream = null;
let evtScannerAnimFrame = null;

;/* ===== js/portal/events/core/utils.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Utilities
// Pure helpers shared across event modules.
// ═══════════════════════════════════════════════════════════

// ─── Badge chip helper (works even without quests/config.js) ──
const EVT_BADGE_EMOJI = { founding_member:'🏅', shutterbug:'📸', streak_master:'🔥', streak_legend:'⚡', first_seed:'🌱', four_figures:'💵', quest_champion:'🎯', fidelity_linked:'🏦', birthday_vip:'🎂' };
function evtBadgeChip(badgeKey) {
    if (!badgeKey) return '';
    if (typeof buildNavBadgeOverlay === 'function') return buildNavBadgeOverlay(badgeKey);
    return `<div class="badge-chip-overlay">${EVT_BADGE_EMOJI[badgeKey] || '❓'}</div>`;
}

function evtToggleModal(id, show) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function evtGenerateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 60)
        + '-' + Date.now().toString(36);
}

function evtEscapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function evtHandleBannerSelect() {
    const file = document.getElementById('bannerFile').files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be under 5 MB.');
        return;
    }
    evtBannerFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('bannerPreview').src = e.target.result;
        document.getElementById('bannerPreviewWrap').classList.remove('hidden');
        document.getElementById('bannerUploadHint').classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function evtHandleEmbedImageSelect() {
    const file = document.getElementById('embedImageFile').files[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
        alert('Please choose a PNG, JPG, or WebP image.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be under 5 MB.');
        return;
    }
    evtEmbedImageFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('embedImagePreview').src = e.target.result;
        document.getElementById('embedImagePreviewWrap').classList.remove('hidden');
        document.getElementById('embedImageUploadHint').classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// ─── Page Navigation (list ↔ detail) ────────────────────

function evtNavigateToEvent(slug) {
    if (slug && typeof slug === 'object') slug = slug.slug || slug.id || '';
    if (!slug) return;
    const url = new URL(window.location);
    url.searchParams.set('event', slug);
    history.pushState({ view: 'detail', slug }, '', url);
    evtRouteByUrl();
}

function evtNavigateToList() {
    const url = new URL(window.location);
    url.searchParams.delete('event');
    history.pushState({ view: 'list' }, '', url);
    evtRouteByUrl();
}

function evtRouteByUrl() {
    const slug = new URLSearchParams(window.location.search).get('event');
    const listView = document.getElementById('eventsListView');
    const detailView = document.getElementById('eventsDetailView');
    if (!listView || !detailView) return;

    if (slug) {
        // Show detail, hide list
        listView.classList.add('hidden');
        detailView.classList.remove('hidden');
        detailView.innerHTML = '<div class="flex items-center justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent"></div></div>';
        evtLoadDetailBySlug(slug);
    } else {
        // Show list, hide detail
        detailView.classList.add('hidden');
        detailView.innerHTML = '';
        listView.classList.remove('hidden');
        document.title = 'Events | Justice McNeal LLC';
        if (typeof evtCleanupMap === 'function') evtCleanupMap();
        // Remove action strip
        if (typeof evtCleanupBottomNav === 'function') evtCleanupBottomNav();
    }
}

async function evtLoadDetailBySlug(slug) {
    // Find event in cache first, otherwise query by slug
    let event = evtAllEvents.find(e => e.slug === slug);
    if (event) {
        evtOpenDetail(event.id);
        return;
    }
    // Not in cache — fetch full event data
    const { data, error } = await supabaseClient
        .from('events')
        .select('*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)')
        .eq('slug', slug)
        .maybeSingle();
    if (error || !data) {
        const detailView = document.getElementById('eventsDetailView');
        if (detailView) {
            detailView.innerHTML = `
                <div class="max-w-md mx-auto text-center py-20 px-4">
                    <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <h2 class="text-lg font-bold text-gray-900 mb-1">Event not found</h2>
                    <p class="text-sm text-gray-500 mb-6">This event may have been removed or the link is incorrect.</p>
                    <button onclick="evtNavigateToList()" class="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                        Back to Events
                    </button>
                </div>`;
        }
        document.title = 'Event Not Found | Justice McNeal LLC';
        return;
    }
    // Merge into cache so evtOpenDetail can find it
    if (!evtAllEvents.find(e => e.id === data.id)) {
        evtAllEvents.push(data);
    }
    evtOpenDetail(data.id);
}

function evtCopyShareUrl(slug) {
    let url;
    if (slug) {
        url = `https://justicemcneal.com/events/?e=${slug}`;
        if (typeof evtCurrentUser !== 'undefined' && evtCurrentUser?.id) {
            url += `&ref=${evtCurrentUser.id.slice(0, 8)}`;
        }
    } else {
        url = document.getElementById('shareUrl')?.value;
    }
    if (!url) return;

    // Prefer native share sheet, fallback to clipboard
    if (navigator.share) {
        navigator.share({ title: 'Check out this event', url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url).then(() => {
            const toast = document.createElement('div');
            toast.textContent = 'Link copied!';
            toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg z-[999] transition-opacity duration-300';
            document.body.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1500);
        });
    }
}

// ═══════════════════════════════════════════════════════════
// Download ICS
// ═══════════════════════════════════════════════════════════
function evtDownloadIcs(eventId) {
    const e = (evtAllEvents || []).find(ev => ev.id === eventId);
    if (!e) return;
    const start = new Date(e.start_date);
    const end   = e.end_date ? new Date(e.end_date) : new Date(start.getTime() + 7200000);
    const fmt   = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const uid   = `${e.id}@justicemcnealllc.com`;

    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//JusticeMcNealLLC//Events//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${e.title.replace(/[,;\\]/g, '')}`,
        `DESCRIPTION:${(e.description || '').replace(/\n/g, '\\n').slice(0, 500)}`,
        `LOCATION:${(e.location_text || '').replace(/[,;\\]/g, '')}`,
        `URL:${window.location.origin}/events/?e=${e.slug}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${e.slug || 'event'}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.evtDownloadIcs = evtDownloadIcs;

;/* ===== js/portal/events/core/vendor-loader.js ===== */
/**
 * Portal Events — lazy CDN vendors (QR, jsQR, Leaflet).
 * Loaded on demand so events.html does not block on three CDN scripts.
 */
(function (root) {
    'use strict';

    const SRC = {
        qrcode: 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js',
        jsqr: 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
        leafletJs: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        leafletCss: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    };

    const scriptPromises = {};

    function loadScript(src, isReady) {
        if (isReady()) return Promise.resolve(isReady());
        if (!scriptPromises[src]) {
            scriptPromises[src] = new Promise((resolve, reject) => {
                const existing = document.querySelector(`script[src="${src}"]`);
                const script = existing || document.createElement('script');
                script.src = src;
                script.async = true;
                script.onload = () => (isReady() ? resolve(isReady()) : reject(new Error(`Vendor did not initialize: ${src}`)));
                script.onerror = () => reject(new Error(`Vendor failed to load: ${src}`));
                if (!existing) document.head.appendChild(script);
            });
        }
        return scriptPromises[src];
    }

    let leafletCssPromise = null;
    function loadLeafletCss() {
        if (document.querySelector(`link[href="${SRC.leafletCss}"]`)) return Promise.resolve();
        if (!leafletCssPromise) {
            leafletCssPromise = new Promise((resolve, reject) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = SRC.leafletCss;
                link.crossOrigin = '';
                link.onload = () => resolve();
                link.onerror = () => reject(new Error('Leaflet CSS failed to load'));
                document.head.appendChild(link);
            });
        }
        return leafletCssPromise;
    }

    async function ensureQRCode() {
        return loadScript(SRC.qrcode, () => root.QRCode);
    }

    async function ensureJsQR() {
        return loadScript(SRC.jsqr, () => root.jsQR);
    }

    async function ensureLeaflet() {
        await loadLeafletCss();
        return loadScript(SRC.leafletJs, () => root.L);
    }

    root.PortalEvents = root.PortalEvents || {};
    root.PortalEvents.vendors = { ensureQRCode, ensureJsQR, ensureLeaflet };
    root.evtEnsureQRCode = ensureQRCode;
    root.evtEnsureJsQR = ensureJsQR;
    root.evtEnsureLeaflet = ensureLeaflet;
})(typeof window !== 'undefined' ? window : globalThis);

;/* ===== js/portal/events/core/raffle-model.js ===== */
// Shared raffle model helpers for event creation, details, and drawing.
(function (root) {
    'use strict';

    const VERSION = 2;
    const DEFAULT_EMOJI = '🎁';
    const DRAW_MODES = new Set(['specific_item', 'random_item', 'winner_choice']);

    function createDefaultConfig() {
        return normalizeConfig({
            version: VERSION,
            winner_count: 10,
            categories: [
                createCategory({ id: 'medium', label: 'Medium Items', sort_order: 10, winner_count: 7, draw_mode: 'random_item' }),
                createCategory({ id: 'large', label: 'Large Items', sort_order: 20, winner_count: 2, draw_mode: 'specific_item' }),
                createCategory({ id: 'grand', label: 'Grand Prize', sort_order: 30, winner_count: 1, draw_mode: 'specific_item' }),
            ],
            items: [],
        });
    }

    function createCategory(overrides = {}) {
        const label = cleanText(overrides.label) || 'Prize Tier';
        return {
            ...overrides,
            id: cleanId(overrides.id) || makeId('cat', label, Date.now()),
            label,
            sort_order: toInt(overrides.sort_order, 10),
            winner_count: toNullableInt(overrides.winner_count),
            draw_mode: DRAW_MODES.has(overrides.draw_mode) ? overrides.draw_mode : 'specific_item',
        };
    }

    function createItem(overrides = {}) {
        const name = cleanText(overrides.name) || 'Prize item';
        return {
            ...overrides,
            id: cleanId(overrides.id) || makeId('item', name, Date.now()),
            category_id: cleanId(overrides.category_id) || 'general',
            name,
            image_url: cleanText(overrides.image_url) || null,
            emoji: cleanText(overrides.emoji) || DEFAULT_EMOJI,
            quantity: Math.max(1, toInt(overrides.quantity, 1)),
            sort_order: toInt(overrides.sort_order, 10),
        };
    }

    function normalizeConfig(rawPrizes, options = {}) {
        if (!rawPrizes) return emptyConfig(options);
        if (Array.isArray(rawPrizes)) return normalizeLegacyArray(rawPrizes, options);
        if (typeof rawPrizes === 'string') return normalizeLegacyArray([rawPrizes], options);
        if (typeof rawPrizes !== 'object') return emptyConfig(options);

        const base = { ...rawPrizes, version: VERSION };
        const rawCategories = Array.isArray(rawPrizes.categories) ? rawPrizes.categories : [];
        const rawItems = Array.isArray(rawPrizes.items) ? rawPrizes.items : [];
        const categories = rawCategories.map((category, index) => normalizeCategory(category, index));
        const categoryIds = new Set(categories.map(category => category.id));
        const fallbackCategory = categories[0]?.id || 'general';
        const items = rawItems.map((item, index) => normalizeItem(item, index, categoryIds, fallbackCategory));

        return finalizeConfig({
            ...base,
            categories: sortCategories(categories),
            items: sortItems(items),
        });
    }

    function getOrderedCategories(config) {
        return sortCategories(normalizeConfig(config).categories || []);
    }

    function getItemsForCategory(config, categoryId) {
        const normalized = normalizeConfig(config);
        return getItemsForCategoryRaw(normalized, categoryId);
    }

    function getTotalWinnerCount(config) {
        const normalized = normalizeConfig(config);
        return getOrderedCategories(normalized).reduce((sum, category) => {
            return sum + getCategoryWinnerCount(normalized, category);
        }, 0);
    }

    function getDrawQueue(config, existingWinners = []) {
        const normalized = normalizeConfig(config);
        const drawn = buildDrawnIndex(existingWinners);
        const slots = [];
        let place = 1;

        getOrderedCategories(normalized).forEach(category => {
            const items = getItemsForCategory(normalized, category.id);
            const winnerCount = getCategoryWinnerCount(normalized, category);
            if (category.draw_mode === 'specific_item') {
                let emitted = 0;
                items.forEach(item => {
                    for (let copy = 1; copy <= item.quantity && emitted < winnerCount; copy++) {
                        slots.push(makeSlot(place++, category, item, 'assigned', copy));
                        emitted++;
                    }
                });
                return;
            }

            const selectionStatus = category.draw_mode === 'winner_choice' ? 'pending_choice' : 'assigned';
            for (let index = 0; index < winnerCount; index++) {
                slots.push(makeSlot(place++, category, null, selectionStatus, index + 1));
            }
        });

        return slots.filter(slot => !isSlotDrawn(slot, drawn));
    }

    function validateConfig(config) {
        const normalized = normalizeConfig(config);
        const errors = [];
        if (!normalized.categories.length) errors.push('Add at least one raffle category.');
        if (!normalized.items.length) errors.push('Add at least one raffle prize item.');

        getOrderedCategories(normalized).forEach(category => {
            const items = getItemsForCategory(normalized, category.id);
            const itemQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
            const winnerCount = getCategoryWinnerCount(normalized, category);
            if (!items.length) errors.push(`${category.label} needs at least one prize item.`);
            if ((category.draw_mode === 'specific_item' || category.draw_mode === 'random_item') && winnerCount > itemQuantity) {
                errors.push(`${category.label} has more winners than available prize quantity.`);
            }
        });

        return { valid: errors.length === 0, errors, config: normalized };
    }

    function emptyConfig(options = {}) {
        return finalizeConfig({
            version: VERSION,
            winner_count: toInt(options.winner_count, 0),
            categories: [],
            items: [],
        });
    }

    function normalizeLegacyArray(rawPrizes, options = {}) {
        const items = rawPrizes
            .map((prize, index) => legacyPrizeToItem(prize, index))
            .filter(Boolean);
        const category = createCategory({
            id: 'general',
            label: options.category_label || 'Raffle Prizes',
            sort_order: 10,
            winner_count: items.reduce((sum, item) => sum + item.quantity, 0),
            draw_mode: 'specific_item',
        });
        return finalizeConfig({
            version: VERSION,
            winner_count: category.winner_count,
            categories: items.length ? [category] : [],
            items,
        });
    }

    function legacyPrizeToItem(prize, index) {
        if (typeof prize === 'string') {
            const name = cleanText(prize);
            if (!name) return null;
            return createItem({ id: makeId('item', name, index + 1), category_id: 'general', name, sort_order: (index + 1) * 10 });
        }
        if (!prize || typeof prize !== 'object') return null;
        const name = cleanText(prize.description || prize.name || prize.prize_description);
        if (!name) return null;
        const place = toInt(prize.place, index + 1);
        return createItem({
            ...prize,
            id: cleanId(prize.id || prize.prize_id) || makeId('item', name, place),
            category_id: 'general',
            name,
            sort_order: place * 10,
        });
    }

    function normalizeCategory(category, index) {
        return createCategory({
            ...category,
            id: cleanId(category?.id) || makeId('cat', category?.label || 'category', index + 1),
            label: category?.label || `Prize Tier ${index + 1}`,
            sort_order: category?.sort_order ?? ((index + 1) * 10),
        });
    }

    function normalizeItem(item, index, categoryIds, fallbackCategory) {
        const categoryId = cleanId(item?.category_id);
        return createItem({
            ...item,
            id: cleanId(item?.id) || makeId('item', item?.name || 'item', index + 1),
            category_id: categoryIds.has(categoryId) ? categoryId : fallbackCategory,
            sort_order: item?.sort_order ?? ((index + 1) * 10),
        });
    }

    function finalizeConfig(config) {
        const categories = sortCategories(config.categories || []);
        const items = sortItems(config.items || []);
        const winnerCount = categories.reduce((sum, category) => {
            return sum + getCategoryWinnerCount({ ...config, items }, category);
        }, 0);
        return {
            ...config,
            version: VERSION,
            winner_count: toInt(config.winner_count, winnerCount) || winnerCount,
            categories,
            items,
        };
    }

    function getCategoryWinnerCount(config, category) {
        const explicit = toNullableInt(category.winner_count);
        if (explicit != null) return explicit;
        return getItemsForCategoryRaw(config, category.id).reduce((sum, item) => sum + item.quantity, 0);
    }

    function makeSlot(place, category, item, selectionStatus, copyIndex) {
        return {
            place,
            category_id: category.id,
            category_label: category.label,
            draw_mode: category.draw_mode,
            prize_id: item?.id || null,
            prize_name: item?.name || null,
            prize_image_url: item?.image_url || null,
            prize_emoji: item?.emoji || DEFAULT_EMOJI,
            selection_status: selectionStatus,
            quantity_index: copyIndex,
        };
    }

    function buildDrawnIndex(existingWinners) {
        const index = { place: new Set(), prizeCount: new Map(), categoryCount: new Map() };
        (Array.isArray(existingWinners) ? existingWinners : []).forEach(winner => {
            if (winner?.place != null) index.place.add(Number(winner.place));
            if (winner?.prize_id) {
                const key = String(winner.prize_id);
                index.prizeCount.set(key, (index.prizeCount.get(key) || 0) + 1);
            }
            if (winner?.category_id) {
                const key = String(winner.category_id);
                index.categoryCount.set(key, (index.categoryCount.get(key) || 0) + 1);
            }
        });
        return index;
    }

    function isSlotDrawn(slot, drawn) {
        if (drawn.place.has(slot.place)) return true;
        if (slot.prize_id) {
            const drawnForPrize = drawn.prizeCount.get(slot.prize_id) || 0;
            if (drawnForPrize > 0) {
                drawn.prizeCount.set(slot.prize_id, drawnForPrize - 1);
                return true;
            }
        }
        const drawnInCategory = drawn.categoryCount.get(slot.category_id) || 0;
        if (!slot.prize_id && drawnInCategory > 0) {
            drawn.categoryCount.set(slot.category_id, drawnInCategory - 1);
            return true;
        }
        return false;
    }

    function getItemsForCategoryRaw(config, categoryId) {
        return sortItems((config.items || []).filter(item => item.category_id === categoryId));
    }

    function sortCategories(categories) {
        return [...categories].sort((a, b) => sortByOrderThenText(a, b, 'label'));
    }

    function sortItems(items) {
        return [...items].sort((a, b) => sortByOrderThenText(a, b, 'name'));
    }

    function sortByOrderThenText(a, b, textKey) {
        const orderDiff = toInt(a.sort_order, 0) - toInt(b.sort_order, 0);
        if (orderDiff) return orderDiff;
        return String(a[textKey] || a.id || '').localeCompare(String(b[textKey] || b.id || ''));
    }

    function cleanText(value) {
        return value == null ? '' : String(value).trim();
    }

    function cleanId(value) {
        return cleanText(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    }

    function makeId(prefix, seed, suffix) {
        const slug = cleanText(seed).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || 'item';
        return cleanId(`${prefix}_${slug}_${suffix}`);
    }

    function toInt(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
    }

    function toNullableInt(value) {
        if (value === '' || value == null) return null;
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : null;
    }

    const api = {
        VERSION,
        DEFAULT_EMOJI,
        normalizeConfig,
        createDefaultConfig,
        createCategory,
        createItem,
        getOrderedCategories,
        getItemsForCategory,
        getTotalWinnerCount,
        getDrawQueue,
        validateConfig,
    };

    root.EventsRaffleModel = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;

    // ── Phase 2 bridge — PortalEvents namespace exposure ─────────────────────
    // window.EventsRaffleModel above is the primary classic-script global.
    // PortalEvents.raffleModel is a namespaced alias for Phase 5 bridge use.
    if (typeof root.PortalEvents === 'undefined') root.PortalEvents = {};
    root.PortalEvents.raffleModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
;/* ===== js/portal/events/list/search.js ===== */
// Portal Events — List search + suggestions (Phase 5M.2A)
(function () {
    'use strict';

    const C = window.EventsConstants || {};
    const SEARCH_HIST_KEY = 'evt_search_hist_v1';
    const SEARCH_HIST_MAX = 8;
    const SEARCH_HIST_SHOW = 5;
    const QUICK_CATS = ['cookout', 'birthday', 'trip', 'party'];

    function api() {
        return window.PortalEventsListSearchApi || {};
    }

    function _readHistory() {
        try {
            const raw = sessionStorage.getItem(SEARCH_HIST_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];
        } catch (_) { return []; }
    }
    function _writeHistory(arr) {
        try { sessionStorage.setItem(SEARCH_HIST_KEY, JSON.stringify(arr.slice(0, SEARCH_HIST_MAX))); }
        catch (_) { /* quota / private */ }
    }
    function _pushHistory(q) {
        const s = (q || '').trim();
        if (s.length < 2) return;
        const lc = s.toLowerCase();
        const list = _readHistory().filter(x => x.toLowerCase() !== lc);
        list.unshift(s);
        _writeHistory(list);
    }
    function _removeHistory(q) {
        const lc = (q || '').toLowerCase();
        _writeHistory(_readHistory().filter(x => x.toLowerCase() !== lc));
    }
    function _clearHistory() { try { sessionStorage.removeItem(SEARCH_HIST_KEY); } catch (_) {} }

    function _escapeAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    function renderSearchSuggest() {
        const expand = document.getElementById('evtSearchExpand');
        const input  = document.getElementById('evtSearchInput');
        if (!expand || !input) return;
        if (expand.classList.contains('hidden')) { hideSearchSuggest(); return; }
        if ((input.value || '').trim() !== '') { hideSearchSuggest(); return; }

        let host = document.getElementById('evtSearchSuggest');
        if (!host) {
            host = document.createElement('div');
            host.id = 'evtSearchSuggest';
            host.className = 'evt-search-suggest absolute left-0 right-0 mt-2 top-full rounded-xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden z-40';
            host.setAttribute('role', 'listbox');
            expand.appendChild(host);
        }

        const hist = _readHistory().slice(0, SEARCH_HIST_SHOW);
        const parts = [];

        if (hist.length) {
            parts.push('<div class="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-gray-500">Recent</div>');
            parts.push('<ul>');
            hist.forEach(q => {
                const qa = _escapeAttr(q);
                parts.push(
                    '<li class="evt-suggest-row flex items-center gap-2 px-3 py-2 hover:bg-brand-50 cursor-pointer" data-suggest-q="' + qa + '" role="option">' +
                        '<span class="text-gray-400" aria-hidden="true">🕐</span>' +
                        '<span class="flex-1 min-w-0 truncate text-sm text-gray-800">' + qa + '</span>' +
                        '<button type="button" class="evt-suggest-remove p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" data-suggest-rm="' + qa + '" aria-label="Remove from history" title="Remove">' +
                            '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
                        '</button>' +
                    '</li>'
                );
            });
            parts.push(
                '<li class="evt-suggest-clear flex items-center gap-2 px-3 py-2 border-t border-gray-100 hover:bg-gray-50 cursor-pointer text-xs text-gray-500" data-suggest-clear="1" role="option">' +
                    '<span aria-hidden="true">🗑</span><span>Clear search history</span>' +
                '</li>'
            );
            parts.push('</ul>');
        }

        parts.push('<div class="px-3 ' + (hist.length ? 'pt-3' : 'pt-2') + ' pb-1 text-[11px] uppercase tracking-wide text-gray-500">Quick categories</div>');
        parts.push('<div class="evt-suggest-chip-row flex flex-wrap gap-2 px-3 pb-3">');
        QUICK_CATS.forEach(cat => {
            const emoji = (C.CATEGORY_EMOJI && C.CATEGORY_EMOJI[cat]) || '📅';
            const label = (C.CATEGORY_TAG && C.CATEGORY_TAG[cat]?.label) || cat;
            parts.push(
                '<button type="button" class="evt-suggest-chip inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-brand-50 border border-gray-200 text-sm text-gray-700" data-suggest-cat="' + cat + '">' +
                    '<span aria-hidden="true">' + emoji + '</span><span>' + label + '</span>' +
                '</button>'
            );
        });
        parts.push('</div>');

        host.innerHTML = parts.join('');
    }

    function hideSearchSuggest() {
        const host = document.getElementById('evtSearchSuggest');
        if (host) host.innerHTML = '';
    }

    function wireSuggestClicks() {
        const expand = document.getElementById('evtSearchExpand');
        if (!expand || expand.dataset.suggestWired === '1') return;
        expand.dataset.suggestWired = '1';
        expand.addEventListener('click', (e) => {
            const rm = e.target.closest('[data-suggest-rm]');
            if (rm) {
                e.preventDefault(); e.stopPropagation();
                _removeHistory(rm.getAttribute('data-suggest-rm'));
                renderSearchSuggest();
                return;
            }
            const clr = e.target.closest('[data-suggest-clear]');
            if (clr) {
                e.preventDefault(); e.stopPropagation();
                _clearHistory();
                renderSearchSuggest();
                return;
            }
            const row = e.target.closest('[data-suggest-q]');
            if (row) {
                e.preventDefault(); e.stopPropagation();
                const q = row.getAttribute('data-suggest-q') || '';
                const input = document.getElementById('evtSearchInput');
                const clear = document.getElementById('evtSearchClear');
                if (input) { input.value = q; clear?.classList.toggle('hidden', !q); }
                api().setSearchQuery?.(q);
                _pushHistory(q);
                api().persistState?.();
                hideSearchSuggest();
                api().renderEvents?.();
                return;
            }
            const chip = e.target.closest('[data-suggest-cat]');
            if (chip) {
                e.preventDefault(); e.stopPropagation();
                const cat = chip.getAttribute('data-suggest-cat') || '';
                const prev = api().getActiveCategory?.() || '';
                api().setActiveCategory?.((prev === cat) ? '' : cat);
                api().persistState?.();
                hideSearchSuggest();
                api().renderEvents?.();
            }
        });
        document.addEventListener('click', (e) => {
            const host = document.getElementById('evtSearchSuggest');
            if (!host || !host.innerHTML) return;
            if (expand.contains(e.target) || document.getElementById('evtSearchToggle')?.contains(e.target)) return;
            hideSearchSuggest();
        });
    }

    function setupSearch() {
        const toggle = document.getElementById('evtSearchToggle');
        const expand = document.getElementById('evtSearchExpand');
        const input  = document.getElementById('evtSearchInput');
        const clear  = document.getElementById('evtSearchClear');

        if (toggle && expand && input) {
            toggle.addEventListener('click', () => {
                const willOpen = expand.classList.contains('hidden');
                expand.classList.toggle('hidden', !willOpen);
                toggle.setAttribute('aria-expanded', String(willOpen));
                if (willOpen) {
                    setTimeout(() => input.focus(), 50);
                    renderSearchSuggest();
                } else if (input.value) {
                    input.value = '';
                    api().setSearchQuery?.('');
                    clear?.classList.add('hidden');
                    api().persistState?.();
                    api().renderEvents?.();
                    hideSearchSuggest();
                } else {
                    hideSearchSuggest();
                }
            });
        }

        if (!input) return;
        wireSuggestClicks();

        input.addEventListener('input', () => {
            const q = input.value.trim();
            clear?.classList.toggle('hidden', !q);
            if (q === '') renderSearchSuggest(); else hideSearchSuggest();
            const prev = api().getSearchDebounce?.();
            if (prev) clearTimeout(prev);
            const id = setTimeout(() => {
                api().setSearchQuery?.(q);
                if (q.length >= 2) _pushHistory(q);
                api().persistState?.();
                api().renderEvents?.();
            }, 120);
            api().setSearchDebounce?.(id);
        });

        clear?.addEventListener('click', () => {
            input.value = '';
            clear.classList.add('hidden');
            api().setSearchQuery?.('');
            api().persistState?.();
            api().renderEvents?.();
            input.focus();
            renderSearchSuggest();
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const q = input.value.trim();
                if (q.length >= 2) {
                    const prev = api().getSearchDebounce?.();
                    if (prev) clearTimeout(prev);
                    api().setSearchQuery?.(q);
                    _pushHistory(q);
                    api().persistState?.();
                    hideSearchSuggest();
                    api().renderEvents?.();
                }
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                if (input.value) {
                    clear?.click();
                } else if (expand) {
                    expand.classList.add('hidden');
                    toggle?.setAttribute('aria-expanded', 'false');
                    toggle?.focus();
                    hideSearchSuggest();
                }
            }
        });
    }

    window.PortalEventsListSearch = {
        setupSearch,
        renderSearchSuggest,
        hideSearchSuggest,
        wireSuggestClicks,
        pushHistory: _pushHistory,
        readHistory: _readHistory,
    };
})();

;/* ===== js/portal/events/list/right-rail.js ===== */
// Portal Events — List right rail: mini calendar, RSVPs, stats (Phase 5M.2A)
(function () {
    'use strict';

    const H = window.EventsHelpers || {};

    function api() {
        return window.PortalEventsListRightRailApi || {};
    }

    function _toIsoDate(d) {
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function renderMiniCalendar() {
        const mount = document.getElementById('evtRailSlotCalendar');
        if (!mount) return;
        if (!document.body.classList.contains('evt-vlift')) { mount.innerHTML = ''; return; }

        const today = new Date();
        let miniCalMonth = api().getMiniCalMonth?.();
        if (!miniCalMonth) {
            miniCalMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            api().setMiniCalMonth?.(miniCalMonth);
        }
        const monthStart = new Date(miniCalMonth);
        const year = monthStart.getFullYear();
        const month = monthStart.getMonth();
        const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const evtDays = new Set();
        (window.evtAllEvents || []).forEach(ev => {
            if (!ev || !ev.start_date) return;
            const d = new Date(ev.start_date);
            if (d.getFullYear() === year && d.getMonth() === month) {
                evtDays.add(_toIsoDate(d));
            }
        });

        const firstDow = monthStart.getDay();
        const gridStart = new Date(year, month, 1 - firstDow);
        const todayIso = _toIsoDate(today);
        const activeDay = api().getActiveDay?.() || '';

        const dayHeaders = ['SUN','MON','TUE','WED','THU','FRI','SAT']
            .map(d => '<div class="evt-mcal-dow">' + d + '</div>').join('');

        let cells = '';
        for (let i = 0; i < 42; i++) {
            const d = new Date(gridStart);
            d.setDate(gridStart.getDate() + i);
            const iso = _toIsoDate(d);
            const isOther = d.getMonth() !== month;
            const isToday = iso === todayIso;
            const hasEvt = evtDays.has(iso);
            const isActive = iso === activeDay;
            const cls = ['evt-mcal-day'];
            if (isOther) cls.push('evt-mcal-day--other');
            if (isToday) cls.push('evt-mcal-day--today');
            if (hasEvt) cls.push('evt-mcal-day--has');
            if (isActive) cls.push('evt-mcal-day--active');
            cells += '<button type="button" class="' + cls.join(' ') +
                '" data-mcal-day="' + iso + '" aria-label="' +
                d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) +
                '">' + d.getDate() + '</button>';
        }

        mount.innerHTML =
            '<div class="evt-mcal" role="group" aria-label="Mini calendar">' +
                '<p class="evt-mcal-section-heading">Calendar</p>' +
                '<div class="evt-mcal-head">' +
                    '<button type="button" class="evt-mcal-nav" data-mcal-prev aria-label="Previous month">&lsaquo;</button>' +
                    '<span class="evt-mcal-title">' + monthLabel + '</span>' +
                    '<button type="button" class="evt-mcal-nav" data-mcal-next aria-label="Next month">&rsaquo;</button>' +
                '</div>' +
                '<div class="evt-mcal-dow-row">' + dayHeaders + '</div>' +
                '<div class="evt-mcal-grid">' + cells + '</div>' +
                (activeDay
                    ? '<button type="button" class="evt-mcal-clear" data-mcal-clear>Clear day filter</button>'
                    : '') +
            '</div>';

        mount.querySelector('[data-mcal-prev]')?.addEventListener('click', () => {
            api().setMiniCalMonth?.(new Date(year, month - 1, 1));
            renderMiniCalendar();
        });
        mount.querySelector('[data-mcal-next]')?.addEventListener('click', () => {
            api().setMiniCalMonth?.(new Date(year, month + 1, 1));
            renderMiniCalendar();
        });
        mount.querySelector('[data-mcal-clear]')?.addEventListener('click', () => {
            api().setActiveDay?.('');
            api().renderEvents?.();
        });
        mount.querySelectorAll('[data-mcal-day]').forEach(btn => {
            btn.addEventListener('click', () => {
                const iso = btn.getAttribute('data-mcal-day');
                const cur = api().getActiveDay?.() || '';
                api().setActiveDay?.((cur === iso) ? '' : iso);
                api().renderEvents?.();
            });
        });

        const rail = document.getElementById('evtRightRail');
        if (rail) rail.classList.remove('hidden');
    }

    function renderMyRsvps() {
        const mount = document.getElementById('evtRailSlotRsvps');
        if (!mount) return;
        if (!document.body.classList.contains('evt-vlift')) { mount.innerHTML = ''; return; }

        const all   = window.evtAllEvents || [];
        const rsvps = window.evtAllRsvps  || {};
        const esc   = H.escapeHtml || (s => String(s == null ? '' : s));
        const now   = Date.now();

        const mine = all
            .filter(ev => {
                const r = rsvps[ev.id];
                if (!r || r.status !== 'going') return false;
                const t = new Date(ev.start_date).getTime();
                return !isNaN(t) && t >= now;
            })
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        if (!mine.length) { mount.innerHTML = ''; return; }

        const total = mine.length;
        const rows = mine.slice(0, 3).map(ev => {
            const d = new Date(ev.start_date);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const hasBanner = !!ev.banner_url;
            const thumbStyle = hasBanner
                ? ('background: url(\'' + esc(ev.banner_url) + '\') center/cover;')
                : 'background: linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);';
            return '<button type="button" class="evt-myrsvp-row" data-evt-myrsvp="' + esc(ev.id) + '">' +
                '<span class="evt-myrsvp-thumb" aria-hidden="true" style="' + thumbStyle + '"></span>' +
                '<span class="evt-myrsvp-body">' +
                    '<span class="evt-myrsvp-title">' + esc(ev.title || 'Untitled event') + '</span>' +
                    '<span class="evt-myrsvp-meta">' + esc(dateStr) + ', ' + esc(timeStr) + '</span>' +
                '</span>' +
            '</button>';
        }).join('');

        mount.innerHTML =
            '<div class="evt-myrsvps">' +
                '<div class="evt-myrsvps-head">' +
                    '<h3 class="evt-myrsvps-title">Your Upcoming RSVPs</h3>' +
                    '<span class="evt-myrsvps-count">' + total + '</span>' +
                '</div>' +
                '<div class="evt-myrsvps-list">' + rows + '</div>' +
                '<button type="button" class="evt-myrsvps-all" data-evt-myrsvps-all>View All My Events</button>' +
            '</div>';

        mount.querySelectorAll('[data-evt-myrsvp]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-evt-myrsvp');
                const ev = all.find(e => e.id === id);
                if (!ev) return;
                if (ev.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(ev.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(ev.id);
                }
            });
        });
        mount.querySelector('[data-evt-myrsvps-all]')?.addEventListener('click', () => {
            document.querySelector('[data-filter="going"]')?.click();
        });

        const rail = document.getElementById('evtRightRail');
        if (rail) rail.classList.remove('hidden');
    }

    function renderStatsCard() {
        const mount = document.getElementById('evtRailSlotStats');
        if (!mount) return;
        if (!document.body.classList.contains('evt-vlift')) { mount.innerHTML = ''; return; }

        const all   = window.evtAllEvents || [];
        const rsvps = window.evtAllRsvps  || {};

        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth();

        const thisMonth = all.filter(ev => {
            const d = new Date(ev.start_date);
            return d.getFullYear() === y && d.getMonth() === m;
        }).length;

        const going = Object.values(rsvps).filter(r => r && r.status === 'going').length;

        const communities = new Set();
        all.forEach(ev => { if (ev && ev.event_type) communities.add(ev.event_type); });

        mount.innerHTML =
            '<div class="evt-stats">' +
                '<h3 class="evt-stats-title">Events Overview</h3>' +
                '<div class="evt-stats-row">' +
                    '<span class="evt-stats-icon evt-stats-icon--purple" aria-hidden="true">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
                    '</span>' +
                    '<span class="evt-stats-body"><span class="evt-stats-label">This Month</span><span class="evt-stats-sub">Upcoming events</span></span>' +
                    '<span class="evt-stats-value">' + thisMonth + '</span>' +
                '</div>' +
                '<div class="evt-stats-row">' +
                    '<span class="evt-stats-icon evt-stats-icon--green" aria-hidden="true">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
                    '</span>' +
                    '<span class="evt-stats-body"><span class="evt-stats-label">You\u2019re Going</span><span class="evt-stats-sub">Events</span></span>' +
                    '<span class="evt-stats-value">' + going + '</span>' +
                '</div>' +
                '<div class="evt-stats-row">' +
                    '<span class="evt-stats-icon evt-stats-icon--blue" aria-hidden="true">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
                    '</span>' +
                    '<span class="evt-stats-body"><span class="evt-stats-label">Communities</span><span class="evt-stats-sub">Active communities</span></span>' +
                    '<span class="evt-stats-value">' + communities.size + '</span>' +
                '</div>' +
                '<button type="button" class="evt-stats-link" data-evt-stats-all>View Full Calendar</button>' +
            '</div>';

        mount.querySelector('[data-evt-stats-all]')?.addEventListener('click', () => {
            const viewBtn = document.querySelector('[data-view="calendar"]');
            if (viewBtn) viewBtn.click();
        });

        const rail = document.getElementById('evtRightRail');
        if (rail) rail.classList.remove('hidden');
    }

    window.PortalEventsListRightRail = {
        renderMiniCalendar,
        renderMyRsvps,
        renderStatsCard,
    };
})();

;/* ===== js/portal/events/list/header.js ===== */
// Portal Events — List header count, greeting, notification bell (Phase 5M.2A)
(function () {
    'use strict';

    const H = window.EventsHelpers || {};

    let _evtBellObserver = null;

    function renderHeaderGreeting() {
        const title = document.getElementById('evtHeaderTitle');
        if (!title) return;
        const name = (window.evtCurrentUserName || '').trim();
        if (document.body.classList.contains('evt-vlift')) {
            const old = document.getElementById('evtHeaderGreeting');
            if (old) old.remove();
            const slot = document.querySelector('#evtGreetingHello [data-greeting-name]');
            if (slot && name) slot.textContent = name;
            return;
        }
        let g = document.getElementById('evtHeaderGreeting');
        if (!name) { if (g) g.remove(); return; }
        if (!g) {
            g = document.createElement('small');
            g.id = 'evtHeaderGreeting';
            g.className = 'evt-header-greeting block text-xs text-gray-400 mb-1';
            title.parentNode.insertBefore(g, title);
        }
        const esc = (H.escapeHtml || (s => String(s == null ? '' : s)));
        g.textContent = 'Hey ' + esc(name) + ' 👋';
    }

    function renderHeaderCount() {
        const el = document.getElementById('evtHeaderCount');
        if (!el) return;
        const all = window.evtAllEvents || [];
        const rsvps = window.evtAllRsvps || {};
        const now = new Date();
        const upcoming = all.filter(e =>
            e.status !== 'cancelled' && e.status !== 'draft' &&
            new Date(e.start_date) >= now
        ).length;
        const going = Object.values(rsvps).filter(r => r.status === 'going').length;
        const parts = [];
        if (going) parts.push(going + ' going');
        parts.push(upcoming + ' upcoming');
        el.textContent = parts.join(' · ');

        renderHeaderGreeting();
    }

    function wireHeaderBellBadge() {
        const badge = document.getElementById('notifBadge');
        const dot = document.getElementById('evtHeaderBellDot');
        if (!dot) return;
        const sync = () => {
            if (!badge) { dot.classList.add('hidden'); return; }
            const txt = (badge.textContent || '').trim();
            const visible = !!txt && getComputedStyle(badge).display !== 'none';
            dot.classList.toggle('hidden', !visible);
        };
        sync();
        if (!badge) return;
        try { _evtBellObserver?.disconnect(); } catch (_) {}
        _evtBellObserver = new MutationObserver(sync);
        _evtBellObserver.observe(badge, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    }

    function initHeaderBell() {
        if (!document.body.classList.contains('evt-vlift')) return;
        const header = document.getElementById('evtPageHeader');
        if (!header) return;
        const globalBtn = document.getElementById('notifBtn');
        if (!globalBtn) return;
        if (document.getElementById('evtHeaderBell')) return;

        const wrap = header.querySelector('.flex.items-end.justify-between') || header.firstElementChild;
        if (!wrap) return;

        const bell = document.createElement('button');
        bell.id = 'evtHeaderBell';
        bell.type = 'button';
        bell.setAttribute('aria-label', 'Notifications');
        bell.className = 'evt-header-bell relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-white/90 hover:text-white shrink-0';
        bell.innerHTML =
            '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">' +
                '<path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.17V11a6 6 0 10-12 0v3.17a2 2 0 01-.6 1.43L4 17h5m6 0a3 3 0 11-6 0"/>' +
            '</svg>' +
            '<span id="evtHeaderBellDot" class="evt-header-bell-dot hidden" aria-hidden="true"></span>';

        bell.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const target = document.getElementById('notifBtn');
            if (target) target.click();
        });

        const createBtn = wrap.querySelector('#createEventBtn');
        if (createBtn) wrap.insertBefore(bell, createBtn);
        else wrap.appendChild(bell);

        wireHeaderBellBadge();
    }

    window.PortalEventsListHeader = {
        renderHeaderCount,
        renderHeaderGreeting,
        initHeaderBell,
        wireHeaderBellBadge,
    };
})();

;/* ===== js/portal/events/list/filters.js ===== */
// Portal Events — List filters, persistence, lifecycle/type/date UI (Phase 5M.2B)
(function () {
    'use strict';

    const C = window.EventsConstants || {};

    const STATE_KEY = 'evt_list_state_v1';
    let _activeType = 'all';
    let _activeCategory = '';
    let _activeDate = 'any'; // 'any' | 'today' | 'week' | 'weekend' | 'month'

    function api() {
        return window.PortalEventsListFiltersApi || {};
    }

    function persistState() {
        try {
            sessionStorage.setItem(STATE_KEY, JSON.stringify({
                q:   api().getSearchQuery?.() ?? '',
                t:   _activeType,
                c:   _activeCategory,
                v:   api().getActiveView?.() ?? 'list',
                tab: window.evtActiveTab || 'upcoming',
            }));
        } catch (_) { /* quota / private mode — silent */ }
    }

    function restoreState() {
        try {
            const raw = sessionStorage.getItem(STATE_KEY);
            if (!raw) return;
            const s = JSON.parse(raw) || {};
            if (typeof s.t === 'string') _activeType = s.t;
            if (typeof s.c === 'string') _activeCategory = s.c;
            if (typeof s.tab === 'string' && ['upcoming', 'past', 'going', 'saved'].includes(s.tab)) {
                window.evtActiveTab = s.tab;
            }
        } catch (_) { /* corrupt payload — ignore */ }
    }

    function syncTypeChips(type) {
        const t = type || 'all';
        document.querySelectorAll('#evtTypeChips .evt-type-chip').forEach(c => {
            const on = (c.dataset.type || 'all') === t;
            c.classList.toggle('evt-type-chip--active', on);
            c.setAttribute('aria-selected', on ? 'true' : 'false');
        });
    }

    function applyRestoredUi() {
        const tab = window.evtActiveTab || 'upcoming';
        document.querySelectorAll('#evtLifecycleSeg .evt-seg__btn').forEach(b => {
            const on = b.dataset.filter === tab;
            b.classList.toggle('evt-seg__btn--active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        const menuBtn = document.getElementById('evtTypeMenuBtn');
        if (menuBtn) {
            menuBtn.dataset.type = _activeType;
            const opt = document.querySelector('#evtTypeMenu .evt-type-opt[data-type="' + _activeType + '"]');
            if (opt) {
                const label = opt.textContent.replace(/\s+events?$/i, '').trim();
                const labelEl = menuBtn.querySelector('[data-type-label]');
                if (labelEl) labelEl.textContent = label;
                document.querySelectorAll('#evtTypeMenu .evt-type-opt').forEach(o =>
                    o.classList.toggle('evt-type-opt--active', o === opt)
                );
            }
            const sel = document.getElementById('typeFilter');
            if (sel) sel.value = _activeType;
        }
        syncTypeChips(_activeType);
        const q = api().getSearchQuery?.() ?? '';
        if (q) {
            const input  = document.getElementById('evtSearchInput');
            const clear  = document.getElementById('evtSearchClear');
            const expand = document.getElementById('evtSearchExpand');
            const toggle = document.getElementById('evtSearchToggle');
            if (input) input.value = q;
            if (clear) clear.classList.remove('hidden');
            if (expand) expand.classList.remove('hidden');
            if (toggle) toggle.setAttribute('aria-expanded', 'true');
        }
        api().applyViewChrome?.();
    }

    function matchesType(ev) {
        if (_activeType === 'all') return true;
        return ev.event_type === _activeType;
    }

    function matchesCategory(ev) {
        if (!_activeCategory) return true;
        return ev.category === _activeCategory;
    }

    function matchesLifecycle(ev) {
        const tab = window.evtActiveTab || 'upcoming';
        const now = new Date();
        const start = new Date(ev.start_date);
        const rsvps = window.evtAllRsvps || {};
        if (tab === 'upcoming') {
            if (ev.status === 'completed') return false;
            return start >= now ||
                ev.status === 'active' ||
                ev.status === 'open' ||
                ev.status === 'confirmed' ||
                ev.status === 'draft';
        }
        if (tab === 'past') {
            return ev.status === 'completed' || start < now;
        }
        if (tab === 'going') {
            const r = rsvps[ev.id];
            return r && r.status === 'going';
        }
        if (tab === 'saved') {
            const r = rsvps[ev.id];
            return r && r.status === 'maybe';
        }
        return true;
    }

    function matchesDate(ev) {
        const activeDay = api().getActiveDay?.() ?? '';
        if (activeDay) {
            const d = new Date(ev.start_date);
            const iso = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0');
            if (iso !== activeDay) return false;
        }
        if (_activeDate === 'any') return true;
        const d = new Date(ev.start_date);
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth(), dy = now.getDate();
        if (_activeDate === 'today') {
            return d.getFullYear() === y && d.getMonth() === m && d.getDate() === dy;
        }
        if (_activeDate === 'week') {
            const day = now.getDay();
            const start = new Date(y, m, dy - day);
            const end = new Date(y, m, dy + (6 - day), 23, 59, 59);
            return d >= start && d <= end;
        }
        if (_activeDate === 'weekend') {
            const day = now.getDay();
            const satOffset = (6 - day + 7) % 7;
            const sat = new Date(y, m, dy + satOffset);
            const sun = new Date(y, m, dy + satOffset + 1, 23, 59, 59);
            return d >= sat && d <= sun;
        }
        if (_activeDate === 'month') {
            return d.getFullYear() === y && d.getMonth() === m;
        }
        return true;
    }

    function renderActiveFilterPill() {
        let host = document.getElementById('evtActiveFilters');
        if (!host) {
            const strip = document.getElementById('evtFilterStrip');
            if (!strip || !strip.parentNode) return;
            host = document.createElement('div');
            host.id = 'evtActiveFilters';
            host.className = 'evt-active-filters mt-2 flex flex-wrap gap-2';
            strip.parentNode.insertBefore(host, strip.nextSibling);
        }
        if (!_activeCategory) { host.innerHTML = ''; return; }
        const esc = (window.EventsHelpers && window.EventsHelpers.escapeHtml) || (s => String(s == null ? '' : s));
        const emoji = (C.CATEGORY_EMOJI && C.CATEGORY_EMOJI[_activeCategory]) || '📅';
        const label = (C.CATEGORY_TAG && C.CATEGORY_TAG[_activeCategory]?.label) || _activeCategory;
        host.innerHTML =
            '<button type="button" data-clear-cat ' +
            'class="evt-active-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold hover:bg-brand-100">' +
                '<span aria-hidden="true">' + emoji + '</span>' +
                '<span>' + esc(label) + '</span>' +
                '<span aria-hidden="true" class="text-brand-500">×</span>' +
                '<span class="sr-only">Clear ' + esc(label) + ' filter</span>' +
            '</button>';
        host.querySelector('[data-clear-cat]')?.addEventListener('click', () => {
            _activeCategory = '';
            persistState();
            api().renderEvents?.();
        });
    }

    function switchLifecycleTab(tab) {
        window.evtActiveTab = tab;
        persistState();
        document.querySelectorAll('#evtLifecycleSeg .evt-seg__btn').forEach(b => {
            const on = b.dataset.filter === tab;
            b.classList.toggle('evt-seg__btn--active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        api().renderEvents?.();
    }

    function clearFiltersForEmptySearch() {
        api().setSearchQuery?.('');
        _activeType = 'all';
        _activeCategory = '';
        const menuBtn = document.getElementById('evtTypeMenuBtn');
        if (menuBtn) {
            menuBtn.dataset.type = 'all';
            const labelEl = menuBtn.querySelector('[data-type-label]');
            if (labelEl) labelEl.textContent = 'All';
        }
        document.querySelectorAll('#evtTypeMenu .evt-type-opt').forEach(o =>
            o.classList.toggle('evt-type-opt--active', o.dataset.type === 'all')
        );
        syncTypeChips('all');
        persistState();
        api().renderEvents?.();
    }

    function setActiveType(type) {
        _activeType = type || 'all';
    }

    function setActiveCategory(cat) {
        _activeCategory = cat || '';
    }

    function toggleActiveCategory(cat) {
        _activeCategory = (_activeCategory === cat) ? '' : cat;
    }

    function initDateMenu() {
        const btn = document.getElementById('evtDateMenuBtn');
        const menu = document.getElementById('evtDateMenu');
        if (!btn || !menu) return;
        const close = () => {
            menu.classList.add('hidden');
            btn.setAttribute('aria-expanded', 'false');
        };
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const willOpen = menu.classList.contains('hidden');
            menu.classList.toggle('hidden', !willOpen);
            btn.setAttribute('aria-expanded', String(willOpen));
        });
        document.addEventListener('click', e => {
            if (!menu.contains(e.target) && e.target !== btn) close();
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
        menu.querySelectorAll('.evt-date-opt').forEach(opt => {
            opt.addEventListener('click', () => {
                _activeDate = opt.dataset.date || 'any';
                btn.dataset.date = _activeDate;
                const labelEl = btn.querySelector('[data-date-label]');
                if (labelEl) labelEl.textContent = _activeDate === 'any' ? 'Date' : opt.textContent.trim();
                menu.querySelectorAll('.evt-date-opt').forEach(o =>
                    o.classList.toggle('evt-date-opt--active', o === opt));
                close();
                api().renderEvents?.();
            });
        });
    }

    function initFilterChips() {
        const segBtns = Array.from(document.querySelectorAll('#evtLifecycleSeg .evt-seg__btn'));
        segBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                segBtns.forEach(b => {
                    b.classList.remove('evt-seg__btn--active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('evt-seg__btn--active');
                btn.setAttribute('aria-selected', 'true');
                window.evtActiveTab = btn.dataset.filter;
                api().setExpandedBucket?.(null);
                persistState();
                api().renderEvents?.();
            });
        });

        const menuBtn = document.getElementById('evtTypeMenuBtn');
        const menu    = document.getElementById('evtTypeMenu');
        if (menuBtn && menu) {
            const closeMenu = () => {
                menu.classList.add('hidden');
                menuBtn.setAttribute('aria-expanded', 'false');
            };
            menuBtn.addEventListener('click', e => {
                e.stopPropagation();
                const willOpen = menu.classList.contains('hidden');
                menu.classList.toggle('hidden', !willOpen);
                menuBtn.setAttribute('aria-expanded', String(willOpen));
            });
            document.addEventListener('click', e => {
                if (!menu.contains(e.target) && e.target !== menuBtn) closeMenu();
            });
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') closeMenu();
            });
            menu.querySelectorAll('.evt-type-opt').forEach(opt => {
                opt.addEventListener('click', () => {
                    _activeType = opt.dataset.type || 'all';
                    menuBtn.dataset.type = _activeType;
                    const label = opt.textContent.replace(/\s+events?$/i, '').trim();
                    const labelEl = menuBtn.querySelector('[data-type-label]');
                    if (labelEl) labelEl.textContent = label;
                    menu.querySelectorAll('.evt-type-opt').forEach(o =>
                        o.classList.toggle('evt-type-opt--active', o === opt)
                    );
                    const sel = document.getElementById('typeFilter');
                    if (sel) sel.value = _activeType;
                    syncTypeChips(_activeType);
                    closeMenu();
                    persistState();
                    api().renderEvents?.();
                });
            });
        }

        const chipRail = document.getElementById('evtTypeChips');
        if (chipRail) {
            chipRail.querySelectorAll('.evt-type-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const t = chip.dataset.type || 'all';
                    if (t === _activeType) return;
                    _activeType = t;
                    syncTypeChips(t);
                    const mBtn = document.getElementById('evtTypeMenuBtn');
                    if (mBtn) {
                        mBtn.dataset.type = t;
                        const opt = document.querySelector('#evtTypeMenu .evt-type-opt[data-type="' + t + '"]');
                        if (opt) {
                            const label = opt.textContent.replace(/\s+events?$/i, '').trim();
                            const labelEl = mBtn.querySelector('[data-type-label]');
                            if (labelEl) labelEl.textContent = label;
                            document.querySelectorAll('#evtTypeMenu .evt-type-opt').forEach(o =>
                                o.classList.toggle('evt-type-opt--active', o === opt)
                            );
                        }
                    }
                    const sel = document.getElementById('typeFilter');
                    if (sel) sel.value = t;
                    persistState();
                    api().renderEvents?.();
                });
            });
        }

        document.getElementById('emptyCreateBtn')?.addEventListener('click', () => {
            document.getElementById('createEventBtn')?.click();
        });

        initDateMenu();
    }

    restoreState();

    window.PortalEventsListFilters = {
        persistState,
        restoreState,
        applyRestoredUi,
        syncTypeChips,
        matchesType,
        matchesCategory,
        matchesLifecycle,
        matchesDate,
        renderActiveFilterPill,
        switchLifecycleTab,
        clearFiltersForEmptySearch,
        initFilterChips,
        initDateMenu,
        getActiveType: () => _activeType,
        setActiveType,
        getActiveCategory: () => _activeCategory,
        setActiveCategory,
        toggleActiveCategory,
    };
})();

;/* ===== js/portal/events/list/calendar.js ===== */
// Portal Events — List full calendar view + day modal (Phase 5M.2B)
(function () {
    'use strict';

    const C = window.EventsConstants || {};
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function api() {
        return window.PortalEventsListCalendarApi || {};
    }

    function localDateKey(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    }

    function groupEventsByDay(events) {
        const F = window.PortalEventsListFilters;
        const map = {};
        events.forEach(ev => {
            if (!ev || !ev.start_date || ev.status === 'cancelled') return;
            if (api().notHidden && !api().notHidden(ev)) return;
            if (F && !F.matchesType(ev)) return;
            if (F && !F.matchesCategory(ev)) return;
            const k = localDateKey(new Date(ev.start_date));
            (map[k] = map[k] || []).push(ev);
        });
        Object.keys(map).forEach(k => {
            map[k].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        });
        return map;
    }

    function closeDayModal() {
        const modal = document.getElementById('evtDayModal');
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    function openDayModal(dateKey) {
        const modal = document.getElementById('evtDayModal');
        const title = document.getElementById('evtDayModalTitle');
        const body  = document.getElementById('evtDayModalBody');
        if (!modal || !title || !body) return;

        const all = window.evtAllEvents || [];
        const attendees = window.evtAttendees || {};
        const counts = window.evtAttendeeCounts || {};
        const byDay = groupEventsByDay(all);
        const items = byDay[dateKey] || [];
        const miniCard = api().miniCard;

        const [y, m, d] = dateKey.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        title.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        if (!items.length) {
            body.innerHTML = '<div class="text-center text-sm text-gray-500 py-6">No events on this day.</div>';
        } else if (typeof miniCard === 'function') {
            body.innerHTML = '<div class="flex flex-col gap-2">' +
                items.map(ev => miniCard(ev, attendees[ev.id] || [], counts[ev.id])
                    .replace('snap-start shrink-0 w-[76%] sm:w-64', 'w-full')
                ).join('') +
            '</div>';
        } else {
            body.innerHTML = '<div class="text-center text-sm text-gray-500 py-6">No events on this day.</div>';
        }

        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        if (!modal.dataset.wired) {
            modal.dataset.wired = '1';
            modal.addEventListener('click', (e) => {
                if (e.target.closest('[data-day-close]')) { closeDayModal(); }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeDayModal();
            });
        }
    }

    function wireCalendarClicks() {
        const mount = document.getElementById('evtCalendarMount');
        if (!mount || mount.dataset.calWired === '1') return;
        mount.dataset.calWired = '1';
        mount.addEventListener('click', (e) => {
            const nav = e.target.closest('[data-cal-nav]');
            if (nav) {
                e.preventDefault();
                const dir = nav.getAttribute('data-cal-nav');
                let calMonth = api().getCalMonth?.();
                if (dir === 'today') {
                    const now = new Date();
                    calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                } else if (calMonth) {
                    const delta = (dir === 'prev') ? -1 : 1;
                    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + delta, 1);
                }
                api().setCalMonth?.(calMonth);
                renderCalendar();
                return;
            }
            const dayBtn = e.target.closest('[data-cal-day]');
            if (dayBtn) {
                e.preventDefault();
                openDayModal(dayBtn.getAttribute('data-cal-day'));
            }
        });
    }

    function renderCalendar() {
        const mount = document.getElementById('evtCalendarMount');
        if (!mount) return;

        const esc = (window.EventsHelpers && window.EventsHelpers.escapeHtml) || (s => String(s == null ? '' : s));
        let calMonth = api().getCalMonth?.();
        if (!calMonth) {
            const now = new Date();
            calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            api().setCalMonth?.(calMonth);
        }
        const year  = calMonth.getFullYear();
        const month = calMonth.getMonth();
        const first = new Date(year, month, 1);
        const last  = new Date(year, month + 1, 0);
        const leadBlank = first.getDay();
        const daysInMonth = last.getDate();
        const todayKey = localDateKey(new Date());

        const all = window.evtAllEvents || [];
        const byDay = groupEventsByDay(all);

        const parts = [];
        parts.push(
            '<div class="evt-cal-header flex items-center justify-between mb-3">' +
                '<div class="flex items-center gap-1">' +
                    '<button type="button" class="evt-cal-nav" data-cal-nav="prev" aria-label="Previous month">' +
                        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>' +
                    '</button>' +
                    '<button type="button" class="evt-cal-nav" data-cal-nav="next" aria-label="Next month">' +
                        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>' +
                    '</button>' +
                '</div>' +
                '<h3 class="evt-cal-title text-base font-semibold text-gray-900">' + MONTH_NAMES[month] + ' ' + year + '</h3>' +
                '<button type="button" class="evt-cal-today text-xs font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-md hover:bg-brand-50" data-cal-nav="today">Today</button>' +
            '</div>'
        );

        parts.push('<div class="evt-cal-weekdays grid grid-cols-7 gap-1 mb-1">');
        DAY_SHORT.forEach(d => {
            parts.push('<div class="text-center text-[11px] font-semibold tracking-wide text-gray-500 py-1">' + d + '</div>');
        });
        parts.push('</div>');

        parts.push('<div class="evt-cal-grid grid grid-cols-7 gap-1">');
        for (let i = 0; i < leadBlank; i++) {
            parts.push('<div class="evt-cal-cell evt-cal-cell--blank" aria-hidden="true"></div>');
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            const key = localDateKey(dateObj);
            const dayEvents = byDay[key] || [];
            const count = dayEvents.length;
            const isToday = (key === todayKey);
            const hasEv = count > 0;

            let dots = '';
            if (hasEv) {
                const shown = dayEvents.slice(0, 3);
                dots = '<div class="evt-cal-dots">' +
                    shown.map(ev => {
                        const grad = (C.CATEGORY_GRADIENT && C.CATEGORY_GRADIENT[ev.category]) || C.DEFAULT_GRADIENT || 'linear-gradient(135deg,#6366f1,#8b5cf6)';
                        const m = /#([0-9a-f]{3,6})/i.exec(grad);
                        const color = m ? ('#' + m[1]) : '#6366f1';
                        return '<span class="evt-cal-dot" style="background:' + color + '"></span>';
                    }).join('') +
                    (count > 3 ? '<span class="evt-cal-dot-more">+' + (count - 3) + '</span>' : '') +
                '</div>';
            }

            const clsCell = 'evt-cal-cell' +
                (hasEv ? ' evt-cal-cell--has' : '') +
                (isToday ? ' evt-cal-cell--today' : '');

            parts.push(
                '<button type="button" class="' + clsCell + '" data-cal-day="' + key + '" ' +
                    (hasEv ? 'aria-label="' + count + ' event' + (count > 1 ? 's' : '') + ' on ' + esc(dateObj.toDateString()) + '"' : 'aria-label="' + esc(dateObj.toDateString()) + '"') +
                    (hasEv ? '' : ' aria-disabled="false"') +
                '>' +
                    '<span class="evt-cal-daynum">' + d + '</span>' +
                    dots +
                '</button>'
            );
        }
        parts.push('</div>');

        mount.innerHTML = parts.join('');
        wireCalendarClicks();
    }

    window.PortalEventsListCalendar = {
        renderCalendar,
        wireCalendarClicks,
        openDayModal,
        closeDayModal,
        groupEventsByDay,
        localDateKey,
    };
})();

;/* ===== js/portal/events/list/hero-rails.js ===== */
// Portal Events — List hero, going rail, top picks, live banner (Phase 5M.2C)
(function () {
    'use strict';

    const C = window.EventsConstants || {};
    const H = window.EventsHelpers   || {};
    const P = window.EventsPills     || {};

    function api() {
        return window.PortalEventsListHeroRailsApi || {};
    }

    function pickHero(events) {
        return events.find(e =>
            e.is_featured === true &&
            e.status !== 'cancelled' &&
            e.status !== 'draft'
        ) || null;
    }

    function heroBg(event, stripGradient) {
        const url = event.banner_url;
        if (url) {
            const safe = String(url).replace(/'/g, "%27");
            if (stripGradient) {
                // vlift: ::before pseudo-element handles all darkening
                return "background: url('" + safe + "') center/cover;";
            }
            return "background: linear-gradient(0deg, rgba(0,0,0,.65), rgba(0,0,0,.05) 55%), url('" + safe + "') center/cover;";
        }
        const grad = (C.CATEGORY_GRADIENT && (C.CATEGORY_GRADIENT[event.category] || C.CATEGORY_GRADIENT.default))
                   || 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)';
        return "background: " + grad + ";";
    }

    function renderHero(event, rsvp) {
        const heroEl = document.getElementById('evtHero');
        if (!heroEl) return;
        if (!event) { heroEl.innerHTML = ''; return; }

        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        const start = new Date(event.start_date);
        const rel = H.relativeDate ? H.relativeDate(start) : '';
        const time = H.formatDate ? H.formatDate(event.start_date, 'time') : '';
        const dateLine = [rel, time].filter(Boolean).join(' · ');
        const loc = event.location_nickname || event.location_text || '';
        const stateP = (P.statePill ? P.statePill(event) : '') || '';
        const countP = (P.countdownChip ? P.countdownChip(event) : '') || '';
        const goingRibbon = (rsvp && rsvp.status === 'going')
            ? '<div class="absolute top-3 left-3 z-10 inline-flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm">✓ Going</div>'
            : '';
        // E12 — Heart favorite (vlift hero only). Maps to RSVP status='maybe'
        // ↔ null since the rsvp_status enum is (going|maybe|not_going) — no
        // 'interested' value. 'maybe' is already wired as the ❤️ Interested
        // affordance in detail.js, so this is the same semantic state.
        const isFav = !!(rsvp && rsvp.status === 'maybe');
        const heartCls = 'evt-hero-heart' + (isFav ? ' evt-hero-heart--on' : '');
        const heartPath = isFav
            // Filled heart
            ? '<path d="M12 21s-7-4.35-9.5-8.5C.8 9.6 2.4 6 6 6c2 0 3.4 1 4 2 .6-1 2-2 4-2 3.6 0 5.2 3.6 3.5 6.5C19 16.65 12 21 12 21z" fill="currentColor"/>'
            // Outline heart
            : '<path stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none" d="M12 21s-7-4.35-9.5-8.5C.8 9.6 2.4 6 6 6c2 0 3.4 1 4 2 .6-1 2-2 4-2 3.6 0 5.2 3.6 3.5 6.5C19 16.65 12 21 12 21z"/>';
        const heartBtn = '<button type="button" data-evt-hero-heart="' + esc(event.id) + '"' +
            ' aria-label="' + (isFav ? 'Remove from interested' : 'Mark as interested') + '"' +
            ' aria-pressed="' + (isFav ? 'true' : 'false') + '"' +
            ' class="' + heartCls + '">' +
                '<svg viewBox="0 0 24 24" class="w-5 h-5" aria-hidden="true">' + heartPath + '</svg>' +
            '</button>';
        const href = event.slug
            ? ('?event=' + encodeURIComponent(event.slug))
            : 'javascript:void(0)';

        const useVlift = document.body.classList.contains('evt-vlift');

        if (useVlift) {
            // E6 — Festival hero: date/time row above title + bottom RSVP CTA bar
            const dateLong = (() => {
                try { return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
                catch (_) { return ''; }
            })();
            const timeShort = time || (() => {
                try { return start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
                catch (_) { return ''; }
            })();
            const calIcon = '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M3 9h18M8 3v4M16 3v4"/></svg>';
            const clkIcon = '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7v5l3 2"/></svg>';
            const pinIcon = loc
                ? '<svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s7-7.58 7-13a7 7 0 10-14 0c0 5.42 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>'
                : '';

            // CTA — always "View Details"; navigates to the event detail page.

            // F14 — Featured-event hero refresh (vlift): kicker label, vertical
            // date chip, host line, right-side description block, solid View
            // Details button. All new elements gated by CSS under body.evt-vlift.
            const _titleCase = (s) => {
                if (!s) return '';
                const str = String(s);
                if (str.toLowerCase() === 'llc') return 'LLC';
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            };
            const hostTypeLabel = _titleCase(event.event_type || '');
            const hostCatLabel  = _titleCase(event.category || '');
            const hostLine = [
                hostTypeLabel ? ('Hosted by ' + hostTypeLabel) : '',
                hostCatLabel
            ].filter(Boolean).join(' \u00B7 ');
            const fDay = (() => { try { return start.getDate(); } catch(_) { return ''; } })();
            const fMon = (() => { try { return start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(); } catch(_) { return ''; } })();
            const fDow = (() => { try { return start.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(); } catch(_) { return ''; } })();
            const descRaw = event.description ? String(event.description).trim() : '';
            const descShort = descRaw.length > 180 ? (descRaw.slice(0, 177) + '\u2026') : descRaw;

            heroEl.innerHTML =
                '<div class="evt-hero-vlift relative">' +
                '<a href="' + href + '" data-evt-hero="' + esc(event.id) + '"' +
                ' class="block relative rounded-3xl overflow-hidden text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"' +
                ' style="' + heroBg(event, true) + '">' +
                    goingRibbon +
                    '<div class="absolute top-3 right-3 z-10 flex items-center gap-1.5">' + countP + stateP + '</div>' +
                    // F14 — FEATURED EVENT kicker (vlift only; only shown when admin-featured)
                    (event.is_featured ? '<span class="evt-hero-kicker" data-f14-kicker>FEATURED EVENT</span>' : '') +
                    // Bottom-edge dark fade for legibility
                    '<div class="evt-hero-fade absolute inset-x-0 bottom-0 pointer-events-none" aria-hidden="true"></div>' +
                    '<div class="evt-hero-meta absolute inset-x-0 bottom-0 p-5 sm:p-6">' +
                        // F20 — Date chip now INSIDE meta as a flex child so it
                        // stretches to the same height as the text column beside it
                        '<div class="evt-hero-datechip" data-f14-datechip aria-hidden="true">' +
                            (fMon ? '<span class="evt-hero-datechip__mon">' + esc(fMon) + '</span>' : '') +
                            (fDay !== '' ? '<span class="evt-hero-datechip__day">' + esc(fDay) + '</span>' : '') +
                            (fDow ? '<span class="evt-hero-datechip__dow">' + esc(fDow) + '</span>' : '') +
                        '</div>' +
                        // Text column
                        '<div class="evt-hero-meta-body">' +
                            // E7 — Avatar cluster
                            attendeeCluster(event.id) +
                            '<h2 class="text-xl sm:text-4xl font-extrabold tracking-tight drop-shadow-md line-clamp-2">' + esc(event.title || 'Untitled event') + '</h2>' +
                            // F14 — Host line
                            (hostLine
                                ? '<p class="evt-hero-host" data-f14-host>' + esc(hostLine) + '</p>'
                                : '') +
                            // F20 — Time + location on the same line
                            ((timeShort || loc)
                                ? '<div class="evt-hero-timeloc" data-f14-timeloc>' +
                                    (timeShort ? '<span class="inline-flex items-center gap-1">' + clkIcon + esc(timeShort) + '</span>' : '') +
                                    (loc ? '<span class="inline-flex items-center gap-1">' + pinIcon + esc(loc) + '</span>' : '') +
                                  '</div>'
                                : '') +
                        '</div>' +
                    '</div>' +
                    // F14 — Right-side description block + solid View Details button (desktop only via CSS)
                    // NOTE: must NOT be an <a> — nested <a> inside the banner anchor causes
                    // the browser to auto-close the outer banner <a> early, breaking layout
                    // (DOM gets re-parented and the banner background ends up wrapping the
                    // description). Use a <span> styled as a button; the outer banner anchor
                    // already navigates to the same event detail page on click.
                    '<div class="evt-hero-side" data-f14-side>' +
                        (descShort ? '<p class="evt-hero-side__desc">' + esc(descShort) + '</p>' : '') +
                        '<span class="evt-hero-side__cta" data-f14-cta data-evt-hero-details="' + esc(event.id) + '" role="button" aria-hidden="true">View Details</span>' +
                    '</div>' +
                '</a>' +
                // View Details button — absolutely positioned at bottom center of
                // the banner card (outside <a> to avoid nested interactive elements).
                '<button type="button" data-evt-hero-cta="' + esc(event.id) + '" class="evt-hero-cta" aria-label="View details for ' + esc(event.title || 'this event') + '">' +
                    'View Details' +
                '</button>' +
                '</div>';

            // Wire View Details CTA → navigate to event detail page
            const ctaBtn = heroEl.querySelector('button[data-evt-hero-cta]');
            if (ctaBtn) {
                ctaBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (href && href !== 'javascript:void(0)') {
                        window.location.href = href;
                    } else if (typeof window.evtNavigateToEvent === 'function') {
                        window.evtNavigateToEvent(event);
                    } else if (typeof window.evtOpenDetail === 'function') {
                        window.evtOpenDetail(event);
                    }
                });
            }

            // E7 — Wire cluster click → navigate to event detail (where the
            // existing Interested/Attendees card lives). No new modal added.
            const cluster = heroEl.querySelector('button[data-evt-hero-going]');
            if (cluster) {
                cluster.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof window.evtNavigateToEvent === 'function') {
                        window.evtNavigateToEvent(event);
                    } else if (typeof window.evtOpenDetail === 'function') {
                        window.evtOpenDetail(event);
                    } else if (event.slug) {
                        window.location.href = '?event=' + encodeURIComponent(event.slug);
                    }
                });
            }

            // E12 — Heart favorite toggles RSVP status='maybe' (semantic
            // "interested"; enum is going|maybe|not_going). evtHandleRsvp
            // toggles off when called with the existing status, so calling
            // it with 'maybe' when already maybe will clear it.
            const heart = heroEl.querySelector('button[data-evt-hero-heart]');
            if (heart) {
                heart.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof window.evtHandleRsvp !== 'function') return;
                    try {
                        heart.disabled = true;
                        await window.evtHandleRsvp(event.id, 'maybe');
                    } catch (err) {
                        console.error('Hero heart toggle failed', err);
                    } finally {
                        heart.disabled = false;
                    }
                });
            }
        } else {
            heroEl.innerHTML =
                '<a href="' + href + '" data-evt-hero="' + esc(event.id) + '"' +
                ' class="block relative rounded-3xl overflow-hidden text-white shadow-[0_10px_40px_rgba(79,70,229,0.18)] aspect-[4/5] sm:aspect-[16/10] focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-300"' +
                ' style="' + heroBg(event) + '">' +
                    goingRibbon +
                    '<div class="absolute top-3 right-3 z-10 flex items-center gap-1.5">' + countP + stateP + '</div>' +
                    '<div class="absolute inset-x-0 bottom-0 p-5 sm:p-6">' +
                        '<div class="text-[11px] font-bold uppercase tracking-[0.14em] text-white/75">' + esc(dateLine) + '</div>' +
                        '<h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5 drop-shadow-sm line-clamp-2">' + esc(event.title || 'Untitled event') + '</h2>' +
                        (loc ? '<p class="text-sm text-white/85 mt-1 truncate">' + esc(loc) + '</p>' : '') +
                    '</div>' +
                '</a>';
        }

        // Click → detail navigation (preserve modifier-click for new tab)
        const link = heroEl.querySelector('a[data-evt-hero]');
        if (link) {
            link.addEventListener('click', e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                if (event.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(event.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(event.id);
                }
            });
        }
    }

    // =========================================================
    function attendeeCluster(eventId) {
        const list = (window.evtAttendees && window.evtAttendees[eventId]) || [];
        if (!list.length) return '';
        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        const bubs = list.slice(0, 5).map((p, i) => {
            const pic = p && p.profile_picture_url;
            const first = (p && p.first_name) || '';
            const initial = (first.trim().charAt(0) || '?').toUpperCase();
            const ml = i === 0 ? '' : ' -ml-2';
            const inner = pic
                ? '<img src="' + esc(pic) + '" alt="" loading="lazy" class="w-full h-full object-cover" />'
                : '<span class="evt-hero-cluster-init">' + esc(initial) + '</span>';
            return '<span class="evt-hero-cluster-bub' + ml + '" title="' + esc(first) + '">' + inner + '</span>';
        }).join('');
        const trueCount = (window.evtAttendeeCounts && window.evtAttendeeCounts[eventId]) || list.length;
        const labelN = String(trueCount);
        return '<button type="button" data-evt-hero-going="' + esc(eventId) + '"' +
            ' class="evt-hero-cluster" aria-label="See who is going">' +
                '<span class="evt-hero-cluster-stack">' + bubs + '</span>' +
                '<span class="evt-hero-cluster-label">' + labelN + ' going</span>' +
            '</button>';
    }

    function renderLiveBanner(events) {
        const el = document.getElementById('evtLiveBanner');
        if (!el) return;
        const now = new Date();
        const live = (events || []).filter(e => {
            if (e.status === 'cancelled' || e.status === 'draft') return false;
            const start = new Date(e.start_date);
            if (isNaN(start) || start > now) return false;
            const endRaw = e.end_date || e.end_at || e.ends_at;
            const end = endRaw ? new Date(endRaw) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
            return now <= end;
        });
        if (!live.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }

        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        const first = live[0];
        const label = live.length === 1
            ? esc(first.title || 'An event') + ' is happening now'
            : live.length + ' events happening now';
        const href = (live.length === 1 && first.slug)
            ? '?event=' + encodeURIComponent(first.slug)
            : 'javascript:void(0)';

        el.classList.remove('hidden');
        el.innerHTML =
            '<a href="' + href + '" data-evt-live="' + esc(first.id) + '"' +
            ' class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">' +
                '<span class="relative flex w-2.5 h-2.5 shrink-0">' +
                    '<span class="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60"></span>' +
                    '<span class="relative rounded-full bg-rose-600 w-2.5 h-2.5"></span>' +
                '</span>' +
                '<span class="flex-1 truncate">' + label + '</span>' +
                (live.length === 1 ? '<span aria-hidden="true" class="text-rose-500">→</span>' : '') +
            '</a>';

        const link = el.querySelector('a[data-evt-live]');
        if (link && live.length === 1) {
            link.addEventListener('click', e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                if (first.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(first.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(first.id);
                }
            });
        }
    }

    // =========================================================
    // Phase B1 — "You're going" rail (events_003 §5.2)
    //   Shows events where user RSVP status='going', future
    //   only, excluding the hero event. Hidden when empty.
    // =========================================================
    function renderGoingRail(events, rsvps, attendees, heroId, eventsById) {
        const rail   = document.getElementById('evtGoingRail');
        const scroll = document.getElementById('evtGoingRailScroll');
        if (!rail || !scroll) return;

        const now = new Date();
        const going = (events || []).filter(e => {
            if (e.id === heroId) return false;
            if (e.status === 'cancelled' || e.status === 'draft') return false;
            if (api().notHidden && !api().notHidden(e)) return false;
            const r = rsvps[e.id];
            if (!r || r.status !== 'going') return false;
            return new Date(e.start_date) >= now;
        }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        if (!going.length) { rail.classList.add('hidden'); scroll.innerHTML = ''; return; }

        rail.classList.remove('hidden');
        const counts = window.evtAttendeeCounts || {};
        scroll.innerHTML = going.map(ev => miniCard(ev, attendees[ev.id] || [], counts[ev.id])).join('');

        // Wire clicks
        scroll.querySelectorAll('a[data-evt-mini]').forEach(link => {
            const id = link.getAttribute('data-evt-mini');
            const ev = eventsById[id];
            if (!ev) return;
            link.addEventListener('click', e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                if (ev.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(ev.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(ev.id);
                }
            });
        });
    }

    function miniCard(event, attendees, goingCount) {
        const esc = H.escapeHtml || (s => String(s == null ? '' : s));
        const d = new Date(event.start_date);
        const day = d.getDate();
        const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const rel = H.relativeDate ? H.relativeDate(d) : '';
        const href = event.slug ? ('?event=' + encodeURIComponent(event.slug)) : 'javascript:void(0)';
        const title = esc(event.title || 'Untitled event');
        const loc = event.location_nickname || event.location_text || '';

        let bannerStyle;
        if (event.banner_url) {
            const safe = String(event.banner_url).replace(/'/g, '%27');
            bannerStyle = "background: linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55)), url('" + safe + "') center/cover;";
        } else {
            const grad = (C.CATEGORY_GRADIENT && (C.CATEGORY_GRADIENT[event.category] || C.DEFAULT_GRADIENT))
                       || 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)';
            bannerStyle = 'background: ' + grad + ';';
        }

        const attCount = (goingCount != null) ? goingCount : (attendees || []).length;
        const attLine = attCount
            ? '<span class="text-[11px] text-gray-500 truncate">' + attCount + ' going</span>'
            : '';
        const isPinnedLlc = event.is_pinned && event.event_type === 'llc';
        const pin = isPinnedLlc
            ? '<span class="evt-date-pin evt-date-pin--mini" aria-label="Pinned LLC event" title="Pinned">📌</span>'
            : '';

        return '<a href="' + href + '" data-evt-mini="' + esc(event.id) + '"' +
            ' class="snap-start shrink-0 w-[76%] sm:w-64 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">' +
                '<div class="relative aspect-[16/9]" style="' + bannerStyle + '">' +
                    '<div class="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 text-center shadow-sm">' +
                        pin +
                        '<div class="text-[14px] leading-none font-extrabold text-gray-900">' + day + '</div>' +
                        '<div class="text-[9px] tracking-wider font-bold text-brand-600 mt-0.5">' + mon + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="p-3">' +
                    '<h3 class="text-sm font-bold text-gray-900 line-clamp-1 leading-snug">' + title + '</h3>' +
                    '<p class="text-[12px] text-gray-500 truncate mt-0.5">' + (rel ? esc(rel) : '') + (loc && rel ? ' · ' : '') + esc(loc) + '</p>' +
                    (attLine ? '<div class="mt-1.5">' + attLine + '</div>' : '') +
                '</div>' +
            '</a>';
    }

    // =========================================================
    // E5 — Top Picks rail (vlift only)
    //   Conditional on >=2 pinned-LLC future events (excluding hero).
    //   Hidden during search, on Past tab, on Going tab, when vlift off.
    // =========================================================
    function renderTopPicks(events, attendees, heroId, eventsById) {
        const rail   = document.getElementById('evtTopPicks');
        const scroll = document.getElementById('evtTopPicksScroll');
        if (!rail || !scroll) return;

        const useVlift = document.body.classList.contains('evt-vlift');
        const tab = window.evtActiveTab || 'upcoming';
        const inSearch = !!((api().getSearchQuery?.() || '')).trim();
        if (!useVlift || tab !== 'upcoming' || inSearch) {
            rail.classList.add('hidden');
            scroll.innerHTML = '';
            return;
        }

        const now = new Date();
        const picks = (events || []).filter(e =>
            e.id !== heroId &&
            e.is_pinned &&
            e.event_type === 'llc' &&
            e.status !== 'cancelled' && e.status !== 'draft' &&
            (api().notHidden ? api().notHidden(e) : true) &&
            new Date(e.start_date) >= now
        ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        if (picks.length < 2) {
            rail.classList.add('hidden');
            scroll.innerHTML = '';
            return;
        }

        rail.classList.remove('hidden');
        const counts = window.evtAttendeeCounts || {};
        scroll.innerHTML = picks.map(ev => miniCard(ev, attendees[ev.id] || [], counts[ev.id])).join('');

        // Wire mini-card clicks (reuse same data-evt-mini hook as going rail)
        scroll.querySelectorAll('a[data-evt-mini]').forEach(link => {
            const id = link.getAttribute('data-evt-mini');
            const ev = eventsById[id];
            if (!ev) return;
            link.addEventListener('click', e => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                if (ev.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(ev.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(ev.id);
                }
            });
        });

        // "See all" → activate LLC type filter (closest equivalent to "pinned-only")
        const seeAll = document.getElementById('evtTopPicksSeeAll');
        if (seeAll && !seeAll.dataset.wired) {
            seeAll.dataset.wired = '1';
            seeAll.addEventListener('click', e => {
                e.preventDefault();
                window.PortalEventsListFilters.setActiveType('llc');
                window.PortalEventsListFilters.syncTypeChips('llc');
                const menuBtn = document.getElementById('evtTypeMenuBtn');
                if (menuBtn) {
                    menuBtn.dataset.type = 'llc';
                    const labelEl = menuBtn.querySelector('[data-type-label]');
                    if (labelEl) labelEl.textContent = 'LLC';
                    document.querySelectorAll('#evtTypeMenu .evt-type-opt').forEach(o =>
                        o.classList.toggle('evt-type-opt--active', o.dataset.type === 'llc')
                    );
                }
                const sel = document.getElementById('typeFilter');
                if (sel) sel.value = 'llc';
                api().persistState?.();
                api().renderEvents?.();
            });
        }
    }


    window.PortalEventsListHeroRails = {
        pickHero,
        heroBg,
        attendeeCluster,
        renderHero,
        renderLiveBanner,
        renderGoingRail,
        miniCard,
        renderTopPicks,
    };
})();

;/* ===== js/portal/events/list/buckets.js ===== */
// Portal Events — List event buckets (Phase 5M.2C)
(function () {
    'use strict';

    const H = window.EventsHelpers || {};
    const Card = window.EventsCard;
    const E_BUCKET_TRUNCATE = 6;

    function api() {
        return window.PortalEventsListBucketsApi || {};
    }

    const E_BUCKET_EMOJI = {
        'tonight':            '🌜',
        'today':              '🔥',
        'tomorrow':           '⏭️',
        'this week':          '✨',
        'this weekend':       '🎡',
        'next week':          '🗓️',
        'later this month':   '📅',
        'this month':         '📅',
        'next month':         '🌱',
        'future':             '🗓️',
        'past':               '🕰️',
        'earlier':            '🕰️',
    };
    function bucketLabelEmoji(label) {
        if (!label) return '';
        const l = String(label).toLowerCase().trim();
        if (/^results for/i.test(label)) return '🔎 ' + label;
        const e = E_BUCKET_EMOJI[l];
        return e ? (e + ' ' + label) : label;
    }

    function renderBucket(label, events, rsvps, attendees) {
        if (!events.length) return '';
        const slug = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const useVlift = document.body.classList.contains('evt-vlift');

        // E11 — Truncate vlift buckets over threshold unless this bucket is expanded
        const total = events.length;
        const isExpanded = ((api().getExpandedBucket?.() ?? null) === slug);
        const truncated = useVlift && total > E_BUCKET_TRUNCATE && !isExpanded;
        const visible = truncated ? events.slice(0, E_BUCKET_TRUNCATE) : events;

        const counts = window.evtAttendeeCounts || {};
        const cards = visible.map(ev => Card.render(ev, {
            rsvp: rsvps[ev.id] || null,
            href: ev.slug ? ('?event=' + encodeURIComponent(ev.slug)) : 'javascript:void(0)',
            variant: 'portal',
            attendees: attendees[ev.id] || [],
            goingCount: counts[ev.id] || (attendees[ev.id] || []).length,
        })).join('');

        // F8 — Create-event tile: prepend to the first upcoming-tab bucket when user can create
        let createTile = '';
        if (useVlift && !(api().getCreateTileInjected?.()) && (window.evtActiveTab || 'upcoming') === 'upcoming') {
            const canCreate = typeof canCreateEvents === 'function' && canCreateEvents();
            if (canCreate) {
                createTile =
                    '<button type="button" data-evt-create-tile class="evt-create-tile" aria-label="Create new event">' +
                        '<span class="evt-create-tile__plus" aria-hidden="true">+</span>' +
                        '<span class="evt-create-tile__label">Create Event</span>' +
                        '<span class="evt-create-tile__hint">Add a new event to the calendar</span>' +
                    '</button>';
                api().setCreateTileInjected?.(true);
            }
        }

        // F9 — vlift bucket header: drop emoji prefix, add "N events" count pill
        const displayLabel = useVlift ? String(label) : label;
        const safeLabel = (H.escapeHtml || (s => s))(displayLabel);
        const countPill = useVlift
            ? '<span class="evt-bucket-count">' + total + (total === 1 ? ' event' : ' events') + '</span>'
            : '';

        // E11 — Header link: "See all (N) →" when truncated, "Show less" when expanded
        let headerLink = '';
        if (useVlift && total > E_BUCKET_TRUNCATE) {
            if (truncated) {
                headerLink = '<button type="button" data-evt-bucket-toggle="' + slug +
                    '" class="evt-bucket-seeall text-xs font-semibold text-brand-600 hover:text-brand-700">' +
                    'See all (' + total + ') →</button>';
            } else {
                headerLink = '<button type="button" data-evt-bucket-toggle="' + slug +
                    '" class="evt-bucket-seeall text-xs font-semibold text-brand-600 hover:text-brand-700">' +
                    'Show less ↑</button>';
            }
        }
        const headerCls = useVlift
            ? 'evt-bucket-head flex items-end justify-between mb-3'
            : '';
        const titleCls = useVlift
            ? 'evt-bucket-title'
            : 'text-xs font-bold uppercase tracking-[0.14em] text-gray-500';

        const header = useVlift
            ? '<header class="' + headerCls + '"><h2 class="' + titleCls + '">' + safeLabel + '</h2><div class="flex items-center gap-2">' + countPill + headerLink + '</div></header>'
            : '<h2 class="' + titleCls + ' mb-3">' + safeLabel + '</h2>';

        return '<section data-bucket="' + slug + '">' +
            header +
            '<div class="evt-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' + cards + createTile + '</div>' +
        '</section>';
    }

    // =========================================================
    // =========================================================

    window.PortalEventsListBuckets = {
        renderBucket,
        bucketLabelEmoji,
        E_BUCKET_TRUNCATE,
    };
})();

;/* ===== js/portal/events/list/shell.js ===== */
/* ════════════════════════════════════════════════════════════
   Portal Events — List shell (orchestrator; events_003 A2 + A3)

   • Editorial hero card per spec §4.3 LOCKED selection rule
   • Bucketed groups via H.groupByBucket (Today / This week /
     Later this month / Next month / Future)
   • Segmented control (Upcoming / Past / Going) + collapsed
     search + type-menu popover
   • Single scoped attendee query per spec §12.1 (no N+1)
   • Two-tier search per spec §4.4 LOCKED
   • Going rail + live banner CONTAINERS rendered (population
     deferred to Phase B)

   Surface namespace : window.PortalEvents.list
   Globals preserved : evtLoadEvents, evtRenderEvents,
                       evtRenderFeatured (no-op stub),
                       evtUpdateHeroStats (no-op stub),
                       evtSetupSearch, evtInitFilterChips,
                       evtRenderCard
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const C = window.EventsConstants || {};
    const H = window.EventsHelpers   || {};
    const P = window.EventsPills     || {};
    const Card = window.EventsCard;

    // ─── Local UI state ───────────────────────────────────
    let _searchQuery    = '';
    let _activeView     = 'list'; // D1 — 'list' | 'calendar'
    let _calMonth       = null;   // D1 — Date at first of viewed month
    let _searchDebounce = null;
    let _expandedBucket = null;   // E11 — slug of bucket the user "See all"-ed; null = normal
    let _createTileInjected = false; // F8 — ensures only one Create tile per render
    let _miniCalMonth = null;     // F10 — Date pointing to first day of displayed month
    let _activeDay = '';          // F10 — ISO yyyy-mm-dd filter from mini calendar click

    const STATE_KEY = 'evt_list_state_v1';
    function _restoreListSessionState() {
        try {
            const raw = sessionStorage.getItem(STATE_KEY);
            if (!raw) return;
            const s = JSON.parse(raw) || {};
            if (typeof s.q === 'string') _searchQuery = s.q;
            if (typeof s.v === 'string' && (s.v === 'list' || s.v === 'calendar')) _activeView = s.v;
        } catch (_) { /* corrupt payload — ignore */ }
    }
    _restoreListSessionState();

    function _persistState() {
        return window.PortalEventsListFilters.persistState();
    }

    // =========================================================
    // D3 — Search (list/search.js — PortalEventsListSearch)
    // =========================================================
    function setupSearch() {
        return window.PortalEventsListSearch.setupSearch();
    }

    // D1 — Full calendar (list/calendar.js) + view toggle chrome
    // =========================================================
    function _renderCalendar() {
        return window.PortalEventsListCalendar.renderCalendar();
    }

    function _initViewToggle() {
        const btn = document.getElementById('evtViewToggle');
        if (!btn || btn.dataset.wired === '1') return;
        btn.dataset.wired = '1';
        btn.addEventListener('click', () => {
            _activeView = (_activeView === 'calendar') ? 'list' : 'calendar';
            _persistState();
            _applyViewChrome();
            renderEvents();
        });
    }

    function _applyViewChrome() {
        const btn = document.getElementById('evtViewToggle');
        const listIcon = btn?.querySelector('.evt-view-icon--list');
        const calIcon  = btn?.querySelector('.evt-view-icon--calendar');
        if (btn) {
            btn.setAttribute('aria-pressed', _activeView === 'calendar' ? 'true' : 'false');
            btn.setAttribute('data-view', _activeView);
            btn.setAttribute('aria-label', _activeView === 'calendar' ? 'Switch to list view' : 'Switch to calendar view');
        }
        // When in calendar view, show the calendar icon label (indicates what clicking does — NO, show list icon so user knows they'll return to list)
        // UX: show the icon of the *other* view, i.e. what you'll switch to.
        if (listIcon && calIcon) {
            listIcon.classList.toggle('hidden', _activeView === 'list');       // show list icon when in calendar (to return)
            calIcon.classList.toggle('hidden', _activeView === 'calendar');    // show calendar icon when in list (to go to cal)
        }
        document.body.classList.toggle('evt-view--calendar', _activeView === 'calendar');
    }

    // =========================================================
    // E1/E4/E9 — Phase E premium visual lift (flagged via ?vlift=1
    // or localStorage('evt_vlift'='1')). Items shipped:
    //   E1  Gradient editorial header
    //   E4  Emoji-tagged bucket labels
    //   E9  Header fade-in motion polish (reduced-motion respected)
    // Toggle is sticky once enabled via query string.
    // =========================================================
    const VLIFT_KEY = 'evt_vlift';
    function _readVlift() {
        // Default ON. Opt-out via ?vlift=0 (sticky in localStorage as '0').
        try {
            const url = new URL(window.location.href);
            const q = url.searchParams.get('vlift');
            if (q === '1') {
                try { localStorage.setItem(VLIFT_KEY, '1'); } catch (_) {}
                return true;
            }
            if (q === '0') {
                try { localStorage.setItem(VLIFT_KEY, '0'); } catch (_) {}
                return false;
            }
            const stored = (() => { try { return localStorage.getItem(VLIFT_KEY); } catch (_) { return null; } })();
            if (stored === '0') return false;     // explicit opt-out persists
            return true;                           // default ON
        } catch (_) { return true; }
    }
    function _initVlift() {
        const on = _readVlift();
        try {
            document.body.classList.toggle('evt-vlift', on);
            if (on) document.documentElement.dataset.vlift = '1';
            else delete document.documentElement.dataset.vlift;
        } catch (_) {}
        try { window.evtSetVlift = function (v) {
            try { localStorage.setItem(VLIFT_KEY, v ? '1' : '0'); } catch (_) {}
            document.body.classList.toggle('evt-vlift', !!v);
        }; } catch (_) {}
        try { window.evtIsVlift = function () { return document.body.classList.contains('evt-vlift'); }; } catch (_) {}
    }

    // =========================================================
    // F1 — Greeting hydration (vlift only)
    // Reads first name from the global nav (#navName, hydrated by
    // layout.js → loadNavProfile after auth). Falls back to "there".
    // =========================================================
    function _initGreeting() {
        if (!document.body.classList.contains('evt-vlift')) return;
        const slot = document.querySelector('#evtGreetingHello [data-greeting-name]');
        if (!slot) return;
        const apply = () => {
            const fromState = (window.evtCurrentUserName || '').trim();
            if (fromState) { slot.textContent = fromState; return true; }
            const navEl = document.getElementById('navName');
            const name = (navEl && navEl.textContent || '').trim();
            if (name) { slot.textContent = name; return true; }
            return false;
        };
        if (apply()) return;
        // Poll briefly (nav mounts async via pageShell + loadNavProfile)
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            if (apply() || tries > 20) clearInterval(t);
        }, 300);
    }

    // =========================================================
    // D2 — Swipe gestures + long-press context sheet (events_004 §D2)
    // Mobile-only. Touch-only. Reduced-motion respected.
    // =========================================================
    const _hiddenIds = new Set();   // session-only hide list
    const SWIPE_THRESHOLD = 56;     // px to commit reveal
    const SWIPE_MAX       = 120;    // px max drag
    const LONGPRESS_MS    = 500;
    const LONGPRESS_MOVE  = 8;      // px tolerance before cancelling long-press
    let _activeSwipe = null;        // { card, startX, startY, dx, locked }
    let _longPressTimer = null;
    let _longPressFired = false;

    function _isMobileTouch() {
        return ('ontouchstart' in window) && window.innerWidth < 640;
    }
    function _prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // Filter helper used by going-rail render to drop session-hidden ids.
    function _notHidden(ev) { return !_hiddenIds.has(ev?.id); }

    function _resetSwipeCard(card) {
        if (!card) return;
        card.classList.remove('evt-swipe--revealed', 'evt-swipe--dragging');
        card.style.transform = '';
        const action = card.querySelector('.evt-swipe-action');
        if (action) action.style.opacity = '';
    }

    function _ensureSwipeAction(card, eventId) {
        let action = card.querySelector('.evt-swipe-action');
        if (action) return action;
        action = document.createElement('button');
        action.type = 'button';
        action.className = 'evt-swipe-action';
        action.setAttribute('data-swipe-cancel', eventId);
        action.setAttribute('aria-label', 'Cancel RSVP');
        action.innerHTML =
            '<span class="evt-swipe-action__icon" aria-hidden="true">' +
                '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
            '</span>' +
            '<span class="evt-swipe-action__label">Cancel</span>';
        // Wrap card content so we can translate it independently
        card.classList.add('evt-swipe-host');
        card.appendChild(action);
        return action;
    }

    function _initSwipeGestures() {
        if (!_isMobileTouch()) return;

        // ── Swipe-left on going-rail mini cards ─────────────
        const rail = document.getElementById('evtGoingRailScroll');
        if (rail && rail.dataset.swipeWired !== '1') {
            rail.dataset.swipeWired = '1';
            rail.addEventListener('touchstart', (e) => {
                const card = e.target.closest('a[data-evt-mini]');
                if (!card) return;
                // Reset any other revealed card
                rail.querySelectorAll('.evt-swipe--revealed').forEach(c => { if (c !== card) _resetSwipeCard(c); });
                const t = e.touches[0];
                _activeSwipe = { card, startX: t.clientX, startY: t.clientY, dx: 0, locked: null };
                _ensureSwipeAction(card, card.getAttribute('data-evt-mini') || '');
            }, { passive: true });

            rail.addEventListener('touchmove', (e) => {
                if (!_activeSwipe) return;
                const t = e.touches[0];
                const dx = t.clientX - _activeSwipe.startX;
                const dy = t.clientY - _activeSwipe.startY;
                if (_activeSwipe.locked === null) {
                    // Lock axis after small movement; vertical scroll wins by default
                    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
                    _activeSwipe.locked = (Math.abs(dx) > Math.abs(dy)) ? 'x' : 'y';
                    if (_activeSwipe.locked === 'x') _activeSwipe.card.classList.add('evt-swipe--dragging');
                }
                if (_activeSwipe.locked !== 'x') return;
                // Only allow leftward drag
                const clamped = Math.max(-SWIPE_MAX, Math.min(0, dx));
                _activeSwipe.dx = clamped;
                _activeSwipe.card.style.transform = 'translateX(' + clamped + 'px)';
                const action = _activeSwipe.card.querySelector('.evt-swipe-action');
                if (action) action.style.opacity = String(Math.min(1, Math.abs(clamped) / SWIPE_THRESHOLD));
            }, { passive: true });

            const finish = () => {
                if (!_activeSwipe) return;
                const { card, dx, locked } = _activeSwipe;
                _activeSwipe = null;
                if (locked !== 'x') { _resetSwipeCard(card); return; }
                if (Math.abs(dx) >= SWIPE_THRESHOLD) {
                    card.classList.remove('evt-swipe--dragging');
                    card.classList.add('evt-swipe--revealed');
                    card.style.transform = '';   // CSS class drives final position
                    const action = card.querySelector('.evt-swipe-action');
                    if (action) action.style.opacity = '1';
                } else {
                    _resetSwipeCard(card);
                }
            };
            rail.addEventListener('touchend', finish, { passive: true });
            rail.addEventListener('touchcancel', finish, { passive: true });

            // Tap on revealed action → confirm cancel; tap on revealed card → reset
            rail.addEventListener('click', (e) => {
                const cancelBtn = e.target.closest('[data-swipe-cancel]');
                if (cancelBtn) {
                    e.preventDefault(); e.stopPropagation();
                    const id = cancelBtn.getAttribute('data-swipe-cancel') || '';
                    _confirmCancelRsvp(id);
                    return;
                }
                const revealed = e.target.closest('.evt-swipe--revealed');
                if (revealed) {
                    e.preventDefault(); e.stopPropagation();
                    _resetSwipeCard(revealed);
                }
            });
        }

        // ── Long-press on any list card → context sheet ────
        const groups = document.getElementById('evtGroups');
        if (groups && groups.dataset.lpWired !== '1') {
            groups.dataset.lpWired = '1';
            const cancelLp = () => {
                if (_longPressTimer) { clearTimeout(_longPressTimer); _longPressTimer = null; }
            };
            groups.addEventListener('touchstart', (e) => {
                const card = e.target.closest('a[data-evt-card], a[data-evt-mini], a[data-evt-hero]');
                if (!card) return;
                _longPressFired = false;
                const t = e.touches[0];
                const startX = t.clientX, startY = t.clientY;
                cancelLp();
                _longPressTimer = setTimeout(() => {
                    _longPressFired = true;
                    const id = card.getAttribute('data-evt-card') || card.getAttribute('data-evt-mini') || card.getAttribute('data-evt-hero') || '';
                    _openContextSheet(id);
                }, LONGPRESS_MS);
                const moveHandler = (mv) => {
                    const m = mv.touches[0];
                    if (Math.abs(m.clientX - startX) > LONGPRESS_MOVE || Math.abs(m.clientY - startY) > LONGPRESS_MOVE) cancelLp();
                };
                const endHandler = () => {
                    cancelLp();
                    groups.removeEventListener('touchmove', moveHandler);
                    groups.removeEventListener('touchend', endHandler);
                    groups.removeEventListener('touchcancel', endHandler);
                };
                groups.addEventListener('touchmove', moveHandler, { passive: true });
                groups.addEventListener('touchend', endHandler, { passive: true });
                groups.addEventListener('touchcancel', endHandler, { passive: true });
            }, { passive: true });

            // Suppress nav click immediately after a long-press fires
            groups.addEventListener('click', (e) => {
                if (_longPressFired) {
                    _longPressFired = false;
                    e.preventDefault(); e.stopPropagation();
                }
            }, true);
        }
    }

    async function _confirmCancelRsvp(eventId) {
        if (!eventId) return;
        const all = window.evtAllEvents || [];
        const ev  = all.find(x => x.id === eventId);
        const title = (ev && ev.title) ? ev.title : 'this event';
        if (!window.confirm('Cancel your RSVP for "' + title + '"?')) return;
        try {
            if (typeof window.evtHandleRsvp === 'function') {
                // evtHandleRsvp toggles off when called with the existing status
                await window.evtHandleRsvp(eventId, 'going');
            }
        } catch (err) {
            console.error('Cancel RSVP failed', err);
        }
    }

    // =========================================================
    // D2 — Context sheet (long-press menu)
    // =========================================================
    function _ensureContextSheet() {
        let sheet = document.getElementById('evtContextSheet');
        if (sheet) return sheet;
        sheet = document.createElement('div');
        sheet.id = 'evtContextSheet';
        sheet.className = 'evt-context-sheet hidden fixed inset-0 z-[75]';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.innerHTML =
            '<div class="absolute inset-0 bg-black/40" data-ctx-close="1"></div>' +
            '<div class="evt-context-sheet__panel absolute inset-x-0 bottom-0 sm:inset-0 sm:m-auto sm:max-w-sm sm:h-fit sm:rounded-2xl bg-white rounded-t-2xl shadow-2xl overflow-hidden">' +
                '<div class="px-4 pt-3 pb-2 border-b border-gray-100">' +
                    '<h3 id="evtContextTitle" class="text-sm font-semibold text-gray-900 truncate"></h3>' +
                '</div>' +
                '<ul class="py-1">' +
                    '<li><button type="button" data-ctx-act="share"   class="evt-context-row"><span aria-hidden="true">🔗</span><span>Share link</span></button></li>' +
                    '<li><button type="button" data-ctx-act="copy"    class="evt-context-row"><span aria-hidden="true">📋</span><span>Copy link</span></button></li>' +
                    '<li><button type="button" data-ctx-act="ics"     class="evt-context-row"><span aria-hidden="true">📅</span><span>Add to calendar</span></button></li>' +
                    '<li><button type="button" data-ctx-act="hide"    class="evt-context-row evt-context-row--danger"><span aria-hidden="true">🙈</span><span>Hide from list</span></button></li>' +
                    '<li class="border-t border-gray-100 mt-1"><button type="button" data-ctx-close="1" class="evt-context-row evt-context-row--cancel"><span>Cancel</span></button></li>' +
                '</ul>' +
            '</div>';
        document.body.appendChild(sheet);
        sheet.addEventListener('click', (e) => {
            if (e.target.closest('[data-ctx-close]')) { _closeContextSheet(); return; }
            const row = e.target.closest('[data-ctx-act]');
            if (!row) return;
            const act = row.getAttribute('data-ctx-act');
            const id  = sheet.dataset.eventId || '';
            _runContextAction(act, id);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !sheet.classList.contains('hidden')) _closeContextSheet();
        });
        return sheet;
    }

    function _openContextSheet(eventId) {
        if (!eventId) return;
        const all = window.evtAllEvents || [];
        const ev  = all.find(x => x.id === eventId);
        if (!ev) return;
        const sheet = _ensureContextSheet();
        sheet.dataset.eventId = eventId;
        const title = sheet.querySelector('#evtContextTitle');
        if (title) title.textContent = ev.title || 'Event';
        sheet.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }
    function _closeContextSheet() {
        const sheet = document.getElementById('evtContextSheet');
        if (!sheet) return;
        sheet.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    async function _runContextAction(act, eventId) {
        const all = window.evtAllEvents || [];
        const ev  = all.find(x => x.id === eventId);
        if (!ev) { _closeContextSheet(); return; }
        const url = _eventShareUrl(ev);

        if (act === 'share') {
            try {
                if (navigator.share) {
                    await navigator.share({ title: ev.title || 'Event', url });
                } else {
                    await _copyToClipboard(url);
                    _toast('Link copied');
                }
            } catch (_) { /* user dismissed */ }
            _closeContextSheet();
            return;
        }
        if (act === 'copy') {
            await _copyToClipboard(url);
            _toast('Link copied');
            _closeContextSheet();
            return;
        }
        if (act === 'ics') {
            _downloadIcs(ev);
            _closeContextSheet();
            return;
        }
        if (act === 'hide') {
            _hiddenIds.add(eventId);
            _toast('Hidden for this session');
            _closeContextSheet();
            renderEvents();
            return;
        }
    }

    function _eventShareUrl(ev) {
        const origin = location.origin;
        const base = origin + (location.pathname.includes('/portal/') ? location.pathname.split('?')[0] : '/portal/events.html');
        return ev.slug ? (base + '?event=' + encodeURIComponent(ev.slug)) : base;
    }

    async function _copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (_) { /* fall through */ }
        try {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            return true;
        } catch (_) { return false; }
    }

    function _toast(msg) {
        let t = document.getElementById('evtToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'evtToast';
            t.className = 'evt-toast';
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.classList.add('evt-toast--show');
        clearTimeout(t._hideT);
        t._hideT = setTimeout(() => t.classList.remove('evt-toast--show'), 1800);
    }

    function _icsDate(d) {
        const pad = n => String(n).padStart(2, '0');
        return d.getUTCFullYear()
            + pad(d.getUTCMonth() + 1)
            + pad(d.getUTCDate()) + 'T'
            + pad(d.getUTCHours())
            + pad(d.getUTCMinutes())
            + pad(d.getUTCSeconds()) + 'Z';
    }
    function _icsEscape(s) {
        return String(s == null ? '' : s)
            .replace(/\\/g, '\\\\')
            .replace(/\r?\n/g, '\\n')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;');
    }
    function _downloadIcs(ev) {
        const start = new Date(ev.start_date);
        const endRaw = ev.end_date || ev.end_at || ev.ends_at;
        const end = endRaw ? new Date(endRaw) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
        const uid = (ev.id || ('evt-' + Date.now())) + '@justicemcneal';
        const url = _eventShareUrl(ev);
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//JusticeMcNeal//Portal Events//EN',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            'UID:' + uid,
            'DTSTAMP:' + _icsDate(new Date()),
            'DTSTART:' + _icsDate(start),
            'DTEND:'   + _icsDate(end),
            'SUMMARY:' + _icsEscape(ev.title || 'Event'),
            'DESCRIPTION:' + _icsEscape((ev.description || '') + '\n\n' + url),
            'URL:' + _icsEscape(url),
        ];
        if (ev.location_text || ev.location_nickname) {
            lines.push('LOCATION:' + _icsEscape(ev.location_text || ev.location_nickname));
        }
        lines.push('END:VEVENT', 'END:VCALENDAR');
        const ics = lines.join('\r\n');
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const a = document.createElement('a');
        const slug = ev.slug || ev.id || 'event';
        a.href = URL.createObjectURL(blob);
        a.download = slug + '.ics';
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }

    function _applyRestoredUi() {
        return window.PortalEventsListFilters.applyRestoredUi();
    }

    // =========================================================
    // Data loading
    // =========================================================
    async function loadEvents() {
        try {
            const { data: events, error } = await supabaseClient
                .from('events')
                .select('*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)')
                .in('status', ['open', 'confirmed', 'active', 'completed'])
                .order('start_date', { ascending: true });

            if (error) throw error;
            window.evtAllEvents = events || [];

            // Drafts (admin-created, only visible to creator)
            if (typeof canManageEvents === 'function' && canManageEvents() && evtCurrentUser) {
                const { data: drafts } = await supabaseClient
                    .from('events')
                    .select('*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)')
                    .eq('status', 'draft')
                    .eq('created_by', evtCurrentUser.id)
                    .order('created_at', { ascending: false });
                if (drafts && drafts.length) {
                    window.evtAllEvents = [...drafts, ...window.evtAllEvents];
                }
            }

            const ids = window.evtAllEvents.map(e => e.id);

            // User's own RSVPs
            window.evtAllRsvps = {};
            if (evtCurrentUser && ids.length) {
                const { data: rsvps } = await supabaseClient
                    .from('event_rsvps')
                    .select('*')
                    .eq('user_id', evtCurrentUser.id)
                    .in('event_id', ids);
                (rsvps || []).forEach(r => { window.evtAllRsvps[r.event_id] = r; });
            }

            // Scoped attendee query (events_003 §12.1 LOCKED)
            // ONE query — filtered by event_id IN currentIds + status='going'
            // Cap 5 avatars / event client-side. Never N+1.
            // evtAttendees      = up-to-5 profile objects (for avatar stack)
            // evtAttendeeCounts = true total including guests (for "N going" label)
            window.evtAttendees = {};
            window.evtAttendeeCounts = {};
            if (ids.length) {
                const [{ data: going, error: aErr }, { data: guestGoing, error: gErr }] = await Promise.all([
                    supabaseClient
                        .from('event_rsvps')
                        .select('event_id, profiles:user_id(profile_picture_url, first_name)')
                        .eq('status', 'going')
                        .in('event_id', ids),
                    supabaseClient
                        .from('event_guest_rsvps')
                        .select('event_id, status, paid')
                        .in('event_id', ids),
                ]);
                if (!aErr && going) {
                    going.forEach(row => {
                        if (!row.profiles) return;
                        const list = (window.evtAttendees[row.event_id] ||= []);
                        if (list.length < 5) list.push(row.profiles);
                        window.evtAttendeeCounts[row.event_id] = (window.evtAttendeeCounts[row.event_id] || 0) + 1;
                    });
                }
                if (!gErr && guestGoing) {
                    guestGoing.forEach(row => {
                        if (row.status === 'going' || row.paid === true) {
                            window.evtAttendeeCounts[row.event_id] = (window.evtAttendeeCounts[row.event_id] || 0) + 1;
                        }
                    });
                }
            }

            renderEvents();
        } catch (err) {
            console.error('Failed to load events:', err);
            const groups = document.getElementById('evtGroups');
            if (groups) {
                groups.innerHTML = '<p class="text-sm text-red-500 text-center py-8">Failed to load events. Please refresh.</p>';
            }
        }
    }

    // =========================================================
    // Skeletons
    // =========================================================
    function renderSkeletons() {
        const groups = document.getElementById('evtGroups');
        if (!groups || !Card) return;
        let html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">';
        for (let i = 0; i < 4; i++) html += Card.skeleton();
        html += '</div>';
        groups.innerHTML = html;
    }

    // =========================================================
    // =========================================================
    // Header (list/header.js — PortalEventsListHeader)
    // =========================================================
    function _renderHeaderCount() {
        return window.PortalEventsListHeader.renderHeaderCount();
    }
    function _initHeaderBell() {
        return window.PortalEventsListHeader.initHeaderBell();
    }

    // Hero + rails (list/hero-rails.js — PortalEventsListHeroRails)
    // =========================================================
    function _pickHero(events) {
        return window.PortalEventsListHeroRails.pickHero(events);
    }
    function _renderHero(event, rsvp) {
        return window.PortalEventsListHeroRails.renderHero(event, rsvp);
    }
    function _renderLiveBanner(events) {
        return window.PortalEventsListHeroRails.renderLiveBanner(events);
    }
    function _renderGoingRail(events, rsvps, attendees, heroId, eventsById) {
        return window.PortalEventsListHeroRails.renderGoingRail(events, rsvps, attendees, heroId, eventsById);
    }
    function _miniCard(event, attendees, goingCount) {
        return window.PortalEventsListHeroRails.miniCard(event, attendees, goingCount);
    }
    function _renderTopPicks(events, attendees, heroId, eventsById) {
        return window.PortalEventsListHeroRails.renderTopPicks(events, attendees, heroId, eventsById);
    }

    // Buckets (list/buckets.js — PortalEventsListBuckets)
    // =========================================================
    function _renderBucket(label, events, rsvps, attendees) {
        return window.PortalEventsListBuckets.renderBucket(label, events, rsvps, attendees);
    }

    // F10–F12 — Right rail (list/right-rail.js — PortalEventsListRightRail)
    // =========================================================
    function _renderMiniCalendar() {
        return window.PortalEventsListRightRail.renderMiniCalendar();
    }
    function _renderMyRsvps() {
        return window.PortalEventsListRightRail.renderMyRsvps();
    }
    function _renderStatsCard() {
        return window.PortalEventsListRightRail.renderStatsCard();
    }

    // Wire card click navigation (anchor hrefs are real but we hijack
    // for SPA detail-view open when running in the unified portal).
    function _wireCardClicks(scope, eventsById) {
        // F8 — Create-event tile click → existing create flow
        scope.querySelectorAll('button[data-evt-create-tile]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('createEventBtn')?.click();
            });
        });
        // E11 — bucket "See all" / "Show less" toggle (delegated)
        scope.querySelectorAll('button[data-evt-bucket-toggle]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                const slug = btn.getAttribute('data-evt-bucket-toggle');
                _expandedBucket = (_expandedBucket === slug) ? null : slug;
                renderEvents();
            });
        });
        scope.querySelectorAll('a[data-evt-card]').forEach(link => {
            const id = link.getAttribute('data-evt-card');
            const ev = eventsById[id];
            if (!ev) return;
            link.addEventListener('click', e => {
                // C2 — tap-category-emoji-to-filter: intercept before nav
                const catBtn = e.target.closest('button[data-evt-cat]');
                if (catBtn && link.contains(catBtn)) {
                    e.preventDefault();
                    e.stopPropagation();
                    const cat = catBtn.getAttribute('data-evt-cat');
                    window.PortalEventsListFilters.toggleActiveCategory(cat);
                    _persistState();
                    renderEvents();
                    return;
                }
                // F7 — footer details button opens detail; RSVP actions live elsewhere.
                const rsvpBtn = e.target.closest('button[data-evt-card-rsvp]');
                if (rsvpBtn && link.contains(rsvpBtn)) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (ev.slug && typeof window.evtNavigateToEvent === 'function') {
                        window.evtNavigateToEvent(ev.slug);
                    } else if (typeof window.evtOpenDetail === 'function') {
                        window.evtOpenDetail(ev.id);
                    }
                    return;
                }
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                if (ev.slug && typeof window.evtNavigateToEvent === 'function') {
                    window.evtNavigateToEvent(ev.slug);
                } else if (typeof window.evtOpenDetail === 'function') {
                    window.evtOpenDetail(ev.id);
                }
            });
        });
    }

    function _renderActiveFilterPill() {
        return window.PortalEventsListFilters.renderActiveFilterPill();
    }

    // =========================================================
    // Phase B2 — Live banner (events_003 §5.3)
    //   Single-line banner above the filter strip whenever
    //   ≥ 1 event is currently in [start, end] window.
    // =========================================================
    function _matchesType(ev) {
        return window.PortalEventsListFilters.matchesType(ev);
    }
    function _matchesCategory(ev) {
        return window.PortalEventsListFilters.matchesCategory(ev);
    }
    function _matchesLifecycle(ev) {
        return window.PortalEventsListFilters.matchesLifecycle(ev);
    }
    function _matchesDate(ev) {
        return window.PortalEventsListFilters.matchesDate(ev);
    }

    // =========================================================
    // MAIN render
    // =========================================================
    function renderEvents() {
        const groupsEl = document.getElementById('evtGroups');
        const heroEl   = document.getElementById('evtHero');
        const empty    = document.getElementById('emptyState');
        const calMount = document.getElementById('evtCalendarMount');
        if (!groupsEl || !Card) return;

        _createTileInjected = false; // F8 — reset per render so tile appears in first bucket only

        _renderHeaderCount();
        _renderActiveFilterPill();

        // ─── D1 CALENDAR MODE — events_004 §D1 ──────────────
        // Calendar is its own render surface. When active: hide the list/hero/rail/banner
        // and show the month grid. Respects _activeType + _activeCategory filters.
        if (_activeView === 'calendar') {
            if (heroEl) heroEl.innerHTML = '';
            const rail   = document.getElementById('evtGoingRail');
            const banner = document.getElementById('evtLiveBanner');
            if (rail)   rail.classList.add('hidden');
            if (banner) banner.classList.add('hidden');
            groupsEl.innerHTML = '';
            empty?.classList.add('hidden');
            if (calMount) calMount.classList.remove('hidden');
            _renderCalendar();
            return;
        }
        if (calMount) { calMount.classList.add('hidden'); calMount.innerHTML = ''; }

        const all       = window.evtAllEvents || [];
        const rsvps     = window.evtAllRsvps  || {};
        const attendees = window.evtAttendees || {};
        const eventsById = {};
        all.forEach(e => { eventsById[e.id] = e; });

        // ─── SEARCH MODE — events_003 §4.4 LOCKED ───────────
        // Non-empty query disables bucketing.
        // Two-tier flat sort: title-match → description-match,
        // both within tier sorted by date ascending.
        // Hide hero + going rail.
        if (_searchQuery) {
            if (heroEl) heroEl.innerHTML = '';
            const rail = document.getElementById('evtGoingRail');
            if (rail) rail.classList.add('hidden');
            const banner = document.getElementById('evtLiveBanner');
            if (banner) banner.classList.add('hidden');
            const picks = document.getElementById('evtTopPicks');
            if (picks) picks.classList.add('hidden');

            const q = _searchQuery.toLowerCase();
            const titleHits = [];
            const descHits  = [];
            all.forEach(e => {
                if (e.status === 'cancelled') return;
                if (!_notHidden(e)) return;
                if (!_matchesCategory(e)) return;
                if ((e.title || '').toLowerCase().includes(q)) {
                    titleHits.push(e);
                } else if ((e.description || '').toLowerCase().includes(q)) {
                    descHits.push(e);
                }
            });
            const byDateAsc = (a, b) => new Date(a.start_date) - new Date(b.start_date);
            titleHits.sort(byDateAsc);
            descHits.sort(byDateAsc);
            const flat = titleHits.concat(descHits);

            if (!flat.length) {
                groupsEl.innerHTML = '';
                empty?.classList.remove('hidden');
                _renderEmptyCopy();
                return;
            }
            empty?.classList.add('hidden');
            groupsEl.innerHTML = _renderBucket(
                'Results for "' + _searchQuery + '"',
                flat, rsvps, attendees
            );
            _wireCardClicks(groupsEl, eventsById);
            return;
        }

        // ─── NORMAL MODE — bucketed ─────────────────────────
        const filtered = all.filter(e => _matchesType(e) && _matchesCategory(e) && _matchesLifecycle(e) && _matchesDate(e) && _notHidden(e));
        const tab = window.evtActiveTab || 'upcoming';

        // Pick hero only on Upcoming tab
        const hero = (tab === 'upcoming') ? _pickHero(filtered) : null;
        _renderHero(hero, hero ? rsvps[hero.id] : null);

        // Phase B1/B2 — Live banner + Going rail (upcoming tab only)
        if (tab === 'upcoming') {
            _renderLiveBanner(all);
            _renderGoingRail(all, rsvps, attendees, hero ? hero.id : null, eventsById);
            // E5 — Top Picks rail (vlift only; gated inside renderer)
            _renderTopPicks(filtered, attendees, hero ? hero.id : null, eventsById);
        } else {
            const rail = document.getElementById('evtGoingRail');
            if (rail) rail.classList.add('hidden');
            const banner = document.getElementById('evtLiveBanner');
            if (banner) banner.classList.add('hidden');
            const picks = document.getElementById('evtTopPicks');
            if (picks) picks.classList.add('hidden');
        }

        const rest = hero ? filtered.filter(e => e.id !== hero.id) : filtered;

        if (!rest.length && !hero) {
            groupsEl.innerHTML = '';
            empty?.classList.remove('hidden');
            _renderEmptyCopy();
            return;
        }
        empty?.classList.add('hidden');

        // Bucket the remaining events
        const mode = tab === 'past' ? 'past' : (tab === 'going' ? 'going' : 'upcoming');
        let groups;
        if (typeof H.groupByBucket === 'function') {
            groups = H.groupByBucket(rest, mode);
        } else {
            groups = [{ label: 'Events', events: rest }];
        }

        // Within each bucket: pinned LLC first, then by date (asc/desc by tab)
        const dir = (tab === 'past') ? -1 : 1;
        groups.forEach(g => {
            g.events.sort((a, b) => {
                const ap = (a.is_pinned && a.event_type === 'llc') ? 0 : 1;
                const bp = (b.is_pinned && b.event_type === 'llc') ? 0 : 1;
                if (ap !== bp) return ap - bp;
                return dir * (new Date(a.start_date) - new Date(b.start_date));
            });
        });

        // E11 — self-heal: if expanded slug no longer exists in current groups, clear it
        if (_expandedBucket) {
            const slugs = groups.map(g => String(g.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
            if (!slugs.includes(_expandedBucket)) _expandedBucket = null;
        }

        groupsEl.innerHTML = groups
            .filter(g => g.events.length)
            .filter(g => {
                // E11 — when a bucket is expanded, only render that one
                if (!_expandedBucket) return true;
                const s = String(g.label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                return s === _expandedBucket;
            })
            .map(g => _renderBucket(g.label, g.events, rsvps, attendees))
            .join('');

        // F8 — If no buckets rendered (e.g. all events are the hero) but user can create,
        // inject the standalone create tile so it's still reachable.
        if (!_createTileInjected && document.body.classList.contains('evt-vlift') && tab === 'upcoming') {
            const canCreate = typeof canCreateEvents === 'function' && canCreateEvents();
            if (canCreate) {
                const tileWrap =
                    '<div class="evt-card-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">' +
                        '<button type="button" data-evt-create-tile class="evt-create-tile" aria-label="Create new event">' +
                            '<span class="evt-create-tile__plus" aria-hidden="true">+</span>' +
                            '<span class="evt-create-tile__label">Create Event</span>' +
                            '<span class="evt-create-tile__hint">Add a new event to the calendar</span>' +
                        '</button>' +
                    '</div>';
                groupsEl.innerHTML += tileWrap;
                _createTileInjected = true;
            }
        }

        _wireCardClicks(groupsEl, eventsById);
        _renderMiniCalendar(); // F10 — right-rail mini calendar
        _renderMyRsvps();      // F11 — right-rail "Your Upcoming RSVPs"
        _renderStatsCard();    // F12 — right-rail "Events Overview"
    }

    // =========================================================
    // Empty state — per-viewer (events_003 §8.10 / B4)
    //
    // Five variants (network-error handled separately, Phase C):
    //   • Search has results=0  → "No events match …" + Clear filters
    //   • Upcoming + canCreate  → "No events yet" + Create CTA
    //   • Upcoming + !canCreate → "No events on the books" + Browse past
    //   • Past                  → "No past events yet"
    //   • Going                 → "Not going to any events"
    //
    // The 📌 marker appears inline with _dateStamp (card.js §8.8).
    // Lottie illustration lazy-upgrades when cat-playing.json available.
    // =========================================================
    function _renderEmptyCopy() {
        const tab     = window.evtActiveTab || 'upcoming';
        const titleEl = document.getElementById('emptyTitle');
        const subEl   = document.getElementById('emptySubtext');
        const ctaBtn  = document.getElementById('emptyCreateBtn');
        const secBtn  = document.getElementById('emptySecondaryBtn');

        const canCreate = typeof canCreateEvents === 'function' && canCreateEvents();

        let title, sub, showCta = false, secText = '', secAction = null;

        if (_searchQuery) {
            title   = 'No events match "' + _searchQuery + '"';
            sub     = 'Try a shorter term, or clear your filters to see everything.';
            secText = 'Clear filters';
            secAction = () => {
                const input = document.getElementById('evtSearchInput');
                const clear = document.getElementById('evtSearchClear');
                if (input) input.value = '';
                clear?.classList.add('hidden');
                window.PortalEventsListFilters.clearFiltersForEmptySearch();
            };
        } else if (tab === 'past') {
            title = 'No past events yet';
            sub   = 'Past events will appear here after they wrap up.';
        } else if (tab === 'going') {
            title = 'Not going to any events';
            sub   = 'RSVP to an event to see it here.';
        } else if (canCreate) {
            // Upcoming + can create — editorial CTA
            title   = 'No events yet';
            sub     = "Create your family's first one.";
            showCta = true;
        } else {
            // Upcoming + cannot create — calm + secondary browse-past
            title   = 'No events on the books';
            sub     = "Check back soon — we'll post new gatherings here.";
            secText = 'Browse past events';
            secAction = () => _switchLifecycleTab('past');
        }

        if (titleEl) titleEl.textContent = title;
        if (subEl)   subEl.textContent   = sub;

        if (ctaBtn) ctaBtn.classList.toggle('hidden', !showCta);
        if (secBtn) {
            secBtn.classList.toggle('hidden', !secText);
            if (secText) {
                secBtn.textContent = secText;
                secBtn.onclick = secAction; // replace any prior handler
            } else {
                secBtn.onclick = null;
            }
        }

        _upgradeEmptyIllo();
    }

    function _switchLifecycleTab(tab) {
        return window.PortalEventsListFilters.switchLifecycleTab(tab);
    }

    // Lazy Lottie upgrade for the empty-state illustration.
    // Uses existing cat-playing.json (assets/lottie/) as the fallback per spec §7.9.
    // Loads lottie-web from jsDelivr once, on first empty render only.
    let _lottieLoading = false;
    let _lottieUpgraded = false;
    function _upgradeEmptyIllo() {
        if (_lottieUpgraded) return;
        const slot = document.getElementById('emptyIllo');
        if (!slot) return;

        const go = () => {
            if (_lottieUpgraded) return;
            if (!window.lottie || typeof window.lottie.loadAnimation !== 'function') return;
            // Replace SVG with animation only if slot still has placeholder
            try {
                slot.innerHTML = '';
                slot.classList.add('evt-empty-illo--lottie');
                window.lottie.loadAnimation({
                    container: slot,
                    renderer: 'svg',
                    loop: true,
                    autoplay: true,
                    path: '/assets/lottie/cat-playing.json',
                });
                _lottieUpgraded = true;
            } catch (_) { /* keep fallback SVG */ }
        };

        if (window.lottie) { go(); return; }
        if (_lottieLoading) return;
        _lottieLoading = true;
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js';
        s.async = true;
        s.onload = go;
        s.onerror = () => { /* keep fallback SVG silently */ };
        document.head.appendChild(s);
    }

    function initFilterChips() {
        return window.PortalEventsListFilters.initFilterChips();
    }

    // =========================================================
    // Search setup — delegated to list/search.js
    // =========================================================

    // Sticky condensing header (events_003 §6.2)
    // =========================================================
    function _initStickyHeader() {
        const header   = document.getElementById('evtPageHeader');
        const sentinel = document.getElementById('evtHeaderSentinel');
        const strip    = document.getElementById('evtFilterStrip');
        if (!header || !sentinel) return;

        // Publish header height as a CSS var so the sticky filter strip
        // can dock right below it (avoids overlap on iOS Safari).
        const updateHeaderVar = () => {
            const h = header.getBoundingClientRect().height;
            document.documentElement.style.setProperty('--evt-header-h', h + 'px');
        };
        updateHeaderVar();
        window.addEventListener('resize', updateHeaderVar);

        if (!('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                header.classList.toggle('evt-header--condensed', !e.isIntersecting);
                // Recompute after class toggle (height changes)
                requestAnimationFrame(updateHeaderVar);
            });
        }, { threshold: 0 });
        io.observe(sentinel);
    }

    // =========================================================
    // Mobile FAB (events_003 §8.9 / B3 scroll-hide)
    // =========================================================
    function _initMobileFab() {
        const fab = document.getElementById('evtCreateFab');
        if (!fab) return;
        const canCreate = typeof canCreateEvents === 'function' && canCreateEvents();
        if (!canCreate) return;
        fab.classList.remove('hidden');
        fab.classList.add('flex');
        fab.addEventListener('click', () => {
            document.getElementById('createEventBtn')?.click();
        });

        // B3 — scroll-hide (hide on scroll-down, show on scroll-up)
        let lastY = window.scrollY || 0;
        let ticking = false;
        const TH = 8; // movement threshold in px
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const y = window.scrollY || 0;
                const dy = y - lastY;
                if (y < 20) {
                    fab.classList.remove('evt-fab--hidden');
                } else if (dy > TH) {
                    fab.classList.add('evt-fab--hidden');
                } else if (dy < -TH) {
                    fab.classList.remove('evt-fab--hidden');
                }
                if (Math.abs(dy) > TH) lastY = y;
                ticking = false;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });

        // Hide when a modal (create/detail) is open — listens for body
        // class toggle that other modules already use.
        const mo = new MutationObserver(() => {
            const modalOpen = document.body.classList.contains('modal-open') ||
                              document.body.classList.contains('overflow-hidden');
            fab.classList.toggle('evt-fab--modal-hidden', modalOpen);
        });
        mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    // =========================================================
    // C1 — Pull-to-refresh (events_003 §6.5)
    //   Mobile-only. Pulls down from top of page when scrollY=0
    //   trigger a reload via evtLoadEvents. Excluded when the
    //   touch originates inside the horizontal going rail (that
    //   rail has its own x-scroll and shouldn't cross-trigger).
    //   Respects prefers-reduced-motion (keyframe still runs but
    //   the rubber-band translate is skipped).
    // =========================================================
    function _initPullToRefresh() {
        // Only meaningful on touch/mobile; desktop bails early.
        if (!('ontouchstart' in window)) return;
        // Mobile viewport gate — matches the FAB / mobile-only treatment
        const isMobile = () => window.innerWidth < 640;
        if (!isMobile()) return;

        const TRIGGER = 60;     // px — pull distance to commit
        const MAX     = 120;    // px — max rubber-band translate
        const DAMPING = 0.45;

        // Build indicator once
        let ind = document.getElementById('evtPtrIndicator');
        if (!ind) {
            ind = document.createElement('div');
            ind.id = 'evtPtrIndicator';
            ind.className = 'evt-ptr';
            ind.innerHTML =
                '<svg class="evt-ptr-spin" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
                    '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5" ' +
                    'stroke-linecap="round" stroke-dasharray="40 60"/>' +
                '</svg>';
            document.body.appendChild(ind);
        }

        let startY = 0, dy = 0, pulling = false, committed = false, refreshing = false;

        const inRail = (target) => !!(target && target.closest && target.closest('#evtGoingRailScroll'));
        const anyModal = () => document.body.classList.contains('modal-open') ||
                               document.body.classList.contains('overflow-hidden');

        const setOffset = (v) => {
            ind.style.transform = 'translate(-50%,' + v + 'px)';
            ind.style.opacity = String(Math.min(1, Math.abs(v) / TRIGGER));
        };

        const reset = () => {
            pulling = false;
            committed = false;
            dy = 0;
            ind.classList.remove('evt-ptr--active', 'evt-ptr--refreshing');
            ind.style.transform = '';
            ind.style.opacity = '';
        };

        document.addEventListener('touchstart', e => {
            if (refreshing) return;
            if (anyModal()) return;
            if (window.scrollY > 0) return;
            if (inRail(e.target)) return;
            startY = e.touches[0].clientY;
            pulling = true;
            dy = 0;
        }, { passive: true });

        document.addEventListener('touchmove', e => {
            if (!pulling || refreshing) return;
            const y = e.touches[0].clientY;
            dy = (y - startY) * DAMPING;
            if (dy <= 0) { reset(); return; }
            if (dy > MAX) dy = MAX;
            ind.classList.add('evt-ptr--active');
            setOffset(dy);
            committed = dy >= TRIGGER;
            ind.classList.toggle('evt-ptr--ready', committed);
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (!pulling || refreshing) return;
            if (!committed) { reset(); return; }
            refreshing = true;
            ind.classList.add('evt-ptr--refreshing');
            ind.classList.remove('evt-ptr--ready');
            ind.style.transform = 'translate(-50%,' + TRIGGER + 'px)';
            ind.style.opacity = '1';
            const done = () => { refreshing = false; reset(); };
            try {
                const p = (typeof window.evtLoadEvents === 'function')
                    ? window.evtLoadEvents()
                    : Promise.resolve();
                Promise.resolve(p).finally(() => setTimeout(done, 300));
            } catch (_) { done(); }
        });
    }


    function _bindListModuleApis() {
        window.PortalEventsListSearchApi = {
            getSearchQuery: () => _searchQuery,
            setSearchQuery: (q) => { _searchQuery = q; },
            getActiveCategory: () => window.PortalEventsListFilters.getActiveCategory(),
            setActiveCategory: (c) => window.PortalEventsListFilters.setActiveCategory(c),
            persistState: _persistState,
            renderEvents: renderEvents,
            getSearchDebounce: () => _searchDebounce,
            setSearchDebounce: (id) => { _searchDebounce = id; },
        };
        window.PortalEventsListFiltersApi = {
            getSearchQuery: () => _searchQuery,
            setSearchQuery: (q) => { _searchQuery = q; },
            getActiveView: () => _activeView,
            setActiveView: (v) => { _activeView = v; },
            getActiveDay: () => _activeDay,
            setActiveDay: (d) => { _activeDay = d; },
            getExpandedBucket: () => _expandedBucket,
            setExpandedBucket: (b) => { _expandedBucket = b; },
            applyViewChrome: _applyViewChrome,
            renderEvents: renderEvents,
        };
        window.PortalEventsListCalendarApi = {
            getCalMonth: () => _calMonth,
            setCalMonth: (d) => { _calMonth = d; },
            notHidden: _notHidden,
            miniCard: (ev, att, cnt) => window.PortalEventsListHeroRails.miniCard(ev, att, cnt),
        };
        window.PortalEventsListHeroRailsApi = {
            getSearchQuery: () => _searchQuery,
            notHidden: _notHidden,
            persistState: _persistState,
            renderEvents: renderEvents,
        };
        window.PortalEventsListBucketsApi = {
            getExpandedBucket: () => _expandedBucket,
            setExpandedBucket: (b) => { _expandedBucket = b; },
            getCreateTileInjected: () => _createTileInjected,
            setCreateTileInjected: (v) => { _createTileInjected = v; },
        };
        window.PortalEventsListRightRailApi = {
            getMiniCalMonth: () => _miniCalMonth,
            setMiniCalMonth: (d) => { _miniCalMonth = d; },
            getActiveDay: () => _activeDay,
            setActiveDay: (d) => { _activeDay = d; },
            renderEvents: renderEvents,
        };
    }
    _bindListModuleApis();

    window.evtLoadEvents      = loadEvents;
    window.evtRenderEvents    = renderEvents;
    window.evtRenderFeatured  = function () { /* folded into hero+bucket pinned-first sort */ };
    window.evtUpdateHeroStats = function () { _renderHeaderCount(); };
    window.evtSetupSearch     = setupSearch;
    window.evtInitFilterChips = initFilterChips;
    window.evtRenderCard = function (event) {
        const rsvps = window.evtAllRsvps || {};
        const attendees = window.evtAttendees || {};
        const counts = window.evtAttendeeCounts || {};
        return Card ? Card.render(event, {
            rsvp: rsvps[event.id] || null,
            attendees: attendees[event.id] || [],
            goingCount: counts[event.id] || (attendees[event.id] || []).length,
            variant: 'portal',
        }) : '';
    };

    // =========================================================
    // PortalEvents.list public surface
    //
    // Phase 3A: expanded namespace. All entries remain closure-
    // scoped — this is a discovery surface for Phase 5 splitting.
    // No behavior change; all classic-script globals preserved.
    // =========================================================
    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.list = {
        // ── Core public API (init.js consumers) ─────────────
        load:              loadEvents,
        render:            renderEvents,
        setupSearch:       setupSearch,
        initFilterChips:   initFilterChips,
        // ── Sub-renderers ────────────────────────────────────
        renderHero:        _renderHero,
        pickHero:          _pickHero,
        renderSkeletons:   renderSkeletons,
        renderCalendar:    _renderCalendar,
        renderGoingRail:   _renderGoingRail,
        renderTopPicks:    _renderTopPicks,
        renderMiniCalendar: _renderMiniCalendar,
        renderMyRsvps:     _renderMyRsvps,
        renderStatsCard:   _renderStatsCard,
        renderBucket:      _renderBucket,
        // ── Filter predicates ────────────────────────────────
        matchesType:       _matchesType,
        matchesCategory:   _matchesCategory,
        matchesLifecycle:  _matchesLifecycle,
        matchesDate:       _matchesDate,
        // ── UI initializers ──────────────────────────────────
        initStickyHeader:  _initStickyHeader,
        initMobileFab:     _initMobileFab,
    };

    // Mobile-only: relocate the search input row + filter button next to it,
    // above the chip rail. On desktop, restore them to their original DOM
    // homes so the existing search-toggle expand UX keeps working unchanged.
    function _initMobileFilterStrip() {
        const searchExpand = document.getElementById('evtSearchExpand');
        const mSearchHost  = document.getElementById('evtMobileSearchHost');
        const filterRow2   = document.getElementById('evtFilterRow2');
        if (!searchExpand || !mSearchHost) return;

        // Remember original parent so we can restore on resize-up
        if (!searchExpand.dataset.dHome) {
            searchExpand.dataset.dHome = '1';
            searchExpand._dHomeParent = searchExpand.parentElement;
            searchExpand._dHomeNext   = searchExpand.nextSibling;
        }

        const mq = window.matchMedia('(max-width: 639px)');
        const apply = () => {
            if (mq.matches) {
                // Mobile: move search into mobile row, hide the desktop filter row
                if (searchExpand.parentElement !== mSearchHost) {
                    mSearchHost.appendChild(searchExpand);
                }
                searchExpand.classList.remove('hidden', 'mt-2');
                if (filterRow2) filterRow2.classList.add('hidden');
            } else {
                // Desktop: restore search to filterRow2
                if (searchExpand.parentElement !== searchExpand._dHomeParent) {
                    searchExpand._dHomeParent.insertBefore(
                        searchExpand,
                        searchExpand._dHomeNext && searchExpand._dHomeNext.parentElement === searchExpand._dHomeParent
                            ? searchExpand._dHomeNext : null
                    );
                    // Re-hide unless user has an active search
                    if (!_searchQuery) searchExpand.classList.add('hidden');
                    searchExpand.classList.add('mt-2');
                }
                if (filterRow2) filterRow2.classList.remove('hidden');
            }
        };
        apply();
        if (mq.addEventListener) mq.addEventListener('change', apply);
        else if (mq.addListener) mq.addListener(apply);
    }

    // Show skeletons ASAP, init sticky header + FAB once DOM is ready
    function _onReady() {
        const groupsEl = document.getElementById('evtGroups');
        // Only paint skeletons if nothing has been rendered yet (avoid
        // clobbering a prior render when seed data arrives before
        // DOMContentLoaded, e.g. during tests or quick cache hits).
        if (groupsEl && !groupsEl.innerHTML.trim()) renderSkeletons();
        _initStickyHeader();
        _initMobileFab();
        _initPullToRefresh();
        _initViewToggle();
        _initVlift();
        _initSwipeGestures();
        _initGreeting();
        _initMobileFilterStrip();
        _applyRestoredUi();
        // E10 — Notification bell in gradient header (vlift only).
        // Try immediately, then again after a tick so the global nav (which
        // mounts #notifBtn / #notifBadge async via pageShell) has time to render.
        _initHeaderBell();
        setTimeout(_initHeaderBell, 300);
        setTimeout(_initHeaderBell, 1200);
        // Fallback: observe body for #notifBtn appearing (handles slow pageShell mounts).
        if (document.body.classList.contains('evt-vlift') && !document.getElementById('evtHeaderBell')) {
            const _bellMountObs = new MutationObserver(() => {
                if (document.getElementById('notifBtn') && !document.getElementById('evtHeaderBell')) {
                    _initHeaderBell();
                    if (document.getElementById('evtHeaderBell')) {
                        try { _bellMountObs.disconnect(); } catch (_) {}
                    }
                }
            });
            _bellMountObs.observe(document.body, { childList: true, subtree: true });
            // Safety: stop watching after 15s even if nothing mounted
            setTimeout(() => { try { _bellMountObs.disconnect(); } catch (_) {} }, 15000);
        }
    }
    if (document.readyState !== 'loading') _onReady();
    else document.addEventListener('DOMContentLoaded', _onReady, { once: true });

    // events_006 — Re-render hero when admin toggles featured status via manage sheet
    document.addEventListener('events:manage:updated', function () {
        if (typeof window.evtLoadEvents === 'function') window.evtLoadEvents();
    });
})();

;/* ===== js/portal/events/team/chat.js ===== */
/* ════════════════════════════════════════════════════════════
   Portal Events — Team Chat (Phase 5B)
   Classic IIFE; loads before detail.js.
   Preserves window.evtOpenTeamChat / evtSendTeamChatMessage / evtCleanupTeamChat.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.team = window.PortalEvents.team || {};

    const EVT_TEAM_CHAT_MAX_LEN = 4000;

    function injectTeamChatStyles() {
        if (document.getElementById('evtTeamChatStyles')) return;
        const style = document.createElement('style');
        style.id = 'evtTeamChatStyles';
        style.textContent = `
        .evt-team-chat { display: flex; flex-direction: column; gap: 10px; min-height: 200px; }
        .evt-team-chat-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .evt-team-chat-back {
            border: 1px solid #e5e7eb; background: #fff; color: #374151; border-radius: 8px;
            padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .evt-team-chat-head strong { display: block; font-size: 15px; color: #111827; line-height: 1.25; }
        .evt-team-chat-head span { display: block; font-size: 12px; color: #6b7280; margin-top: 2px; }
        .evt-team-chat-messages {
            display: flex; flex-direction: column; gap: 10px; max-height: min(42vh, 320px);
            overflow-y: auto; padding: 8px 4px; border: 1px solid #f3f4f6; border-radius: 12px; background: #f9fafb;
        }
        .evt-team-chat-empty, .evt-team-chat-status, .evt-team-chat-unavailable {
            font-size: 13px; color: #6b7280; text-align: center; padding: 16px 8px; line-height: 1.4;
        }
        .evt-team-chat-unavailable { color: #b45309; background: #fffbeb; border-radius: 10px; border: 1px solid #fde68a; }
        .evt-team-chat-msg { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; }
        .evt-team-chat-msg-meta { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
        .evt-team-chat-msg-name { font-size: 12px; font-weight: 700; color: #111827; }
        .evt-team-chat-msg-time { font-size: 11px; color: #9ca3af; white-space: nowrap; }
        .evt-team-chat-msg-body { font-size: 14px; color: #374151; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
        .evt-team-chat-composer { display: flex; flex-direction: column; gap: 8px; }
        .evt-team-chat-composer textarea {
            width: 100%; resize: vertical; min-height: 56px; max-height: 120px; padding: 10px 12px;
            border: 1px solid #d1d5db; border-radius: 10px; font-size: 14px; font-family: inherit;
        }
        .evt-team-chat-composer textarea:disabled { background: #f3f4f6; }
        .evt-team-chat-send {
            align-self: flex-end; padding: 10px 16px; border-radius: 10px; border: none;
            background: #4f46e5; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
        }
        .evt-team-chat-send:disabled { opacity: .55; cursor: not-allowed; }
        `;
        document.head.appendChild(style);
    }

    function canCreateTeamChat(event) {
        if (!event || !evtCurrentUser?.id) return false;
        if (event.created_by === evtCurrentUser.id) return true;
        return typeof canManageEvents === 'function' && canManageEvents();
    }

    function friendlyError(err) {
        if (!err) return 'Something went wrong. Please try again.';
        const msg = (err.message || '').toLowerCase();
        if (err.code === '42501' || msg.includes('permission') || msg.includes('row-level security') || msg.includes('policy')) {
            return 'Team chat is not available for your account on this event.';
        }
        if (msg.includes('jwt') || msg.includes('not authenticated')) return 'Please sign in again to use team chat.';
        return err.message || 'Unable to complete this action.';
    }

    function displayName(profile) {
        if (!profile) return 'Member';
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        return name || 'Member';
    }

    function formatTime(iso) {
        if (!iso) return '';
        try {
            return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        } catch (_) {
            return '';
        }
    }

    function cleanup() {
        const state = window.__evtTeamChatState;
        if (state?.channel) {
            try { supabaseClient.removeChannel(state.channel); } catch (_) { /* ignore */ }
        }
        window.__evtTeamChatState = null;
    }

    async function ensureChat(event, eventId) {
        const { data: existing, error: selErr } = await supabaseClient
            .from('event_chats')
            .select('id, event_id, chat_type, created_at')
            .eq('event_id', eventId)
            .eq('chat_type', 'team')
            .maybeSingle();
        if (selErr) return { chat: null, error: selErr };
        if (existing) return { chat: existing, error: null };

        if (!canCreateTeamChat(event)) {
            return { chat: null, error: null, notStarted: true };
        }

        const { data: created, error: insErr } = await supabaseClient
            .from('event_chats')
            .insert({
                event_id: eventId,
                chat_type: 'team',
                created_by: evtCurrentUser.id,
            })
            .select('id, event_id, chat_type, created_at')
            .single();

        if (insErr?.code === '23505') {
            const { data: again, error: againErr } = await supabaseClient
                .from('event_chats')
                .select('id, event_id, chat_type, created_at')
                .eq('event_id', eventId)
                .eq('chat_type', 'team')
                .maybeSingle();
            return { chat: again, error: againErr };
        }
        return { chat: created, error: insErr };
    }

    async function loadMessages(chatId, eventId) {
        const { data: rows, error } = await supabaseClient
            .from('event_chat_messages')
            .select('id, chat_id, event_id, sender_id, body, created_at, updated_at, deleted_at')
            .eq('chat_id', chatId)
            .eq('event_id', eventId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })
            .limit(200);
        if (error) return { messages: [], profilesById: {}, error };

        const messages = rows || [];
        const senderIds = [...new Set(messages.map(m => m.sender_id).filter(Boolean))];
        const profilesById = {};
        if (senderIds.length) {
            const { data: profiles } = await supabaseClient
                .from('profiles')
                .select('id, first_name, last_name')
                .in('id', senderIds);
            (profiles || []).forEach(p => { profilesById[p.id] = p; });
        }
        return { messages, profilesById, error: null };
    }

    function messagesHtml(state) {
        if (!state?.messages?.length) {
            return '<p class="evt-team-chat-empty">No messages yet. Start the team conversation.</p>';
        }
        return state.messages.map(m => {
            const profile = state.profilesById[m.sender_id];
            const name = evtEscapeHtml(displayName(profile));
            const time = evtEscapeHtml(formatTime(m.created_at));
            const body = evtEscapeHtml(m.body || '');
            return `<article class="evt-team-chat-msg" data-msg-id="${m.id}">
            <div class="evt-team-chat-msg-meta">
                <span class="evt-team-chat-msg-name">${name}</span>
                <time class="evt-team-chat-msg-time">${time}</time>
            </div>
            <div class="evt-team-chat-msg-body">${body}</div>
        </article>`;
        }).join('');
    }

    function refreshMessageList() {
        const state = window.__evtTeamChatState;
        const el = document.getElementById('evtTeamChatMessages');
        if (!state || !el) return;
        el.innerHTML = messagesHtml(state);
        el.scrollTop = el.scrollHeight;
    }

    function handleRealtime(payload) {
        const state = window.__evtTeamChatState;
        if (!state || !payload?.new) return;
        const row = payload.new;
        if (row.event_id !== state.eventId || row.chat_id !== state.chatId) return;

        if (payload.eventType === 'INSERT') {
            if (row.deleted_at) return;
            if (state.messages.some(m => m.id === row.id)) return;
            state.messages.push(row);
            state.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            refreshMessageList();
            if (row.sender_id && !state.profilesById[row.sender_id]) {
                supabaseClient
                    .from('profiles')
                    .select('id, first_name, last_name')
                    .eq('id', row.sender_id)
                    .maybeSingle()
                    .then(({ data }) => {
                        if (data && window.__evtTeamChatState?.eventId === state.eventId) {
                            window.__evtTeamChatState.profilesById[data.id] = data;
                            refreshMessageList();
                        }
                    });
            }
            return;
        }

        if (payload.eventType === 'UPDATE') {
            const idx = state.messages.findIndex(m => m.id === row.id);
            if (row.deleted_at) {
                if (idx >= 0) {
                    state.messages.splice(idx, 1);
                    refreshMessageList();
                }
                return;
            }
            if (idx >= 0) state.messages[idx] = row;
            else state.messages.push(row);
            state.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            refreshMessageList();
        }
    }

    function subscribe(chatId, eventId) {
        const state = window.__evtTeamChatState;
        if (!state) return;
        if (state.channel) {
            try { supabaseClient.removeChannel(state.channel); } catch (_) { /* ignore */ }
            state.channel = null;
        }
        state.channel = supabaseClient
            .channel(`evt-team-chat-${eventId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'event_chat_messages',
                filter: `event_id=eq.${eventId}`,
            }, (payload) => handleRealtime({ eventType: 'INSERT', new: payload.new }))
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'event_chat_messages',
                filter: `event_id=eq.${eventId}`,
            }, (payload) => handleRealtime({ eventType: 'UPDATE', new: payload.new }))
            .subscribe();
    }

    function renderPanel(eventId, opts) {
        const { loading, unavailable, notStarted, canCompose } = opts;
        const backClick = `evtOpenTeamToolsPanel('${eventId}')`;
        let body = '';

        if (loading) {
            body = '<p class="evt-team-chat-status">Loading team chat…</p>';
        } else if (unavailable) {
            body = `<p class="evt-team-chat-unavailable">${evtEscapeHtml(unavailable)}</p>
            <button type="button" class="evt-team-chat-back" onclick="${backClick}">← Back to Team tools</button>`;
        } else if (notStarted) {
            body = `<p class="evt-team-chat-unavailable">Team chat has not been started yet. Ask the event creator or a coordinator to open Team Chat first.</p>
            <button type="button" class="evt-team-chat-back" onclick="${backClick}">← Back to Team tools</button>`;
        } else {
            const state = window.__evtTeamChatState;
            body = `
            <div id="evtTeamChatMessages" class="evt-team-chat-messages">${messagesHtml(state)}</div>
            <div id="evtTeamChatStatus" class="evt-team-chat-status" aria-live="polite"></div>
            ${canCompose ? `
            <div class="evt-team-chat-composer">
                <textarea id="evtTeamChatInput" maxlength="${EVT_TEAM_CHAT_MAX_LEN}" rows="3" placeholder="Message the team…" aria-label="Team chat message"></textarea>
                <button type="button" id="evtTeamChatSendBtn" class="evt-team-chat-send" onclick="evtSendTeamChatMessage('${eventId}')">Send</button>
            </div>` : ''}`;
        }

        return `
        <div class="evt-team-chat">
            <div class="evt-team-chat-toolbar">
                <button type="button" class="evt-team-chat-back" onclick="${backClick}">← Tools</button>
            </div>
            <div class="evt-team-chat-head">
                <strong>Team Chat</strong>
                <span>Private chat for this event team</span>
            </div>
            ${body}
        </div>`;
    }

    async function open(eventId) {
        if (typeof window.evtInjectTeamToolsStyles === 'function') window.evtInjectTeamToolsStyles();
        injectTeamChatStyles();
        cleanup();

        const event = (window.evtAllEvents || evtAllEvents).find(e => e.id === eventId);
        if (!event) return;

        let bar = document.getElementById('evtCtaBar');
        if (!bar && typeof window.evtEnsureCtaBarShell === 'function') {
            bar = window.evtEnsureCtaBarShell();
        }
        if (!bar) return;
        if (typeof window.evtApplyDesktopTeamToolsOverlay === 'function') {
            window.evtApplyDesktopTeamToolsOverlay(bar);
        }
        const panel = document.getElementById('evtCtaPanel');
        if (!panel) return;

        const closeBtn = '<button type="button" class="evt-cta-panel-close" onclick="evtCloseCtaPanel()" aria-label="Close">×</button>';
        bar.classList.add('evt-cta-bar-expanded');
        panel.classList.remove('hidden');
        panel.classList.add('evt-team-chat-panel');
        panel.innerHTML = `${closeBtn}${renderPanel(eventId, { loading: true })}`;

        const ensure = await ensureChat(event, eventId);
        if (ensure.error) {
            panel.innerHTML = `${closeBtn}${renderPanel(eventId, {
                unavailable: friendlyError(ensure.error),
            })}`;
            return;
        }
        if (ensure.notStarted || !ensure.chat) {
            panel.innerHTML = `${closeBtn}${renderPanel(eventId, { notStarted: true })}`;
            return;
        }

        const chatId = ensure.chat.id;
        const loaded = await loadMessages(chatId, eventId);
        if (loaded.error) {
            panel.innerHTML = `${closeBtn}${renderPanel(eventId, {
                unavailable: friendlyError(loaded.error),
            })}`;
            return;
        }

        window.__evtTeamChatState = {
            eventId,
            chatId,
            messages: loaded.messages,
            profilesById: loaded.profilesById,
            channel: null,
        };

        panel.innerHTML = `${closeBtn}${renderPanel(eventId, { canCompose: true })}`;
        refreshMessageList();
        subscribe(chatId, eventId);

        const input = document.getElementById('evtTeamChatInput');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(eventId);
                }
            });
        }
    }

    async function send(eventId) {
        const state = window.__evtTeamChatState;
        if (!state || state.eventId !== eventId || !state.chatId) return;

        const input = document.getElementById('evtTeamChatInput');
        const sendBtn = document.getElementById('evtTeamChatSendBtn');
        const statusEl = document.getElementById('evtTeamChatStatus');
        if (!input) return;

        const body = (input.value || '').trim();
        if (!body) {
            if (statusEl) statusEl.textContent = 'Enter a message to send.';
            return;
        }
        if (body.length > EVT_TEAM_CHAT_MAX_LEN) {
            if (statusEl) statusEl.textContent = `Message must be ${EVT_TEAM_CHAT_MAX_LEN} characters or fewer.`;
            return;
        }

        if (sendBtn) sendBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'Sending…';

        const { data, error } = await supabaseClient
            .from('event_chat_messages')
            .insert({
                chat_id: state.chatId,
                event_id: eventId,
                sender_id: evtCurrentUser.id,
                body,
            })
            .select('id, chat_id, event_id, sender_id, body, created_at, updated_at, deleted_at')
            .single();

        if (sendBtn) sendBtn.disabled = false;

        if (error) {
            if (statusEl) statusEl.textContent = friendlyError(error);
            return;
        }

        input.value = '';
        if (statusEl) statusEl.textContent = '';

        if (data && !data.deleted_at && !state.messages.some(m => m.id === data.id)) {
            state.messages.push(data);
            if (!state.profilesById[evtCurrentUser.id] && evtCurrentUser) {
                state.profilesById[evtCurrentUser.id] = {
                    id: evtCurrentUser.id,
                    first_name: evtCurrentUser.first_name,
                    last_name: evtCurrentUser.last_name,
                };
            }
            state.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            refreshMessageList();
        }
    }

    window.PortalEvents.team.chat = {
        open,
        send,
        cleanup,
        ensureChat,
        loadMessages,
        subscribe,
        maxLength: EVT_TEAM_CHAT_MAX_LEN,
    };

    window.evtOpenTeamChat = open;
    window.evtSendTeamChatMessage = send;
    window.evtCleanupTeamChat = cleanup;
})();

;/* ===== js/portal/events/team/tools.js ===== */
/* ════════════════════════════════════════════════════════════
   Portal Events — Team Tools & CTA bar (Phase 5C)
   Classic IIFE; loads after team/chat.js, before detail.js.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.team = window.PortalEvents.team || {};

    const EVT_CTA_ICONS = {
        check:  '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>',
        ticket: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/></svg>',
        lock:   '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>',
        manage: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
    };

    function injectTeamToolsStyles() {
        if (document.getElementById('evtTeamToolsStyles')) return;
        const style = document.createElement('style');
        style.id = 'evtTeamToolsStyles';
        style.textContent = `
        .evt-team-tool-list { display: flex; flex-direction: column; gap: 8px; }
        .evt-team-tool-btn {
            display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
            width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid #e5e7eb;
            background: #fff; color: #111827; font-size: 14px; font-weight: 600; text-align: left; cursor: pointer;
        }
        .evt-team-tool-btn:disabled { opacity: .55; cursor: not-allowed; }
        .evt-team-tool-main { line-height: 1.25; }
        .evt-team-tool-sub { font-size: 12px; font-weight: 500; color: #6b7280; line-height: 1.35; }
        .evt-cta-btn.evt-cta-team { background: #fff; color: #4f46e5; border: 2px solid #c7d2fe; }
        .evt-cta-btn.evt-cta-raffle-locked { background: #f3f4f6; color: #9ca3af; border: 1.5px solid #e5e7eb; box-shadow: none; cursor: not-allowed; }
        .evt-cta-footnote { margin: 0; padding: 0 4px 2px; text-align: center; font-size: 11px; line-height: 1.35; color: #6b7280; font-weight: 600; }
        .ed-raffle-locked-block { text-align: center; }
        .ed-raffle-locked-hint { margin: 8px 0 0; font-size: 12px; line-height: 1.4; color: #6b7280; font-weight: 600; font-style: normal; }
        .ed-raffle-btn.ed-raffle-btn-locked { background: #ebebeb; color: #999; border: none; cursor: not-allowed; width: 100%; }
        @media (min-width: 1024px) {
            .evt-cta-bar.evt-cta-floating-shell.evt-team-tools-overlay {
                display: flex !important; position: fixed; inset: 0; z-index: 60;
                align-items: center; justify-content: center; padding: 24px;
                background: rgba(15, 23, 42, .45);
            }
            .evt-cta-bar.evt-cta-floating-shell.evt-team-tools-overlay .evt-cta-actions { display: none !important; }
            .evt-cta-bar.evt-cta-floating-shell .evt-cta-panel {
                position: relative; width: min(420px, 100%); max-height: 80vh;
                overflow: auto; border: 1px solid #e5e7eb; border-radius: 16px;
                background: #fff; box-shadow: 0 12px 38px rgba(15, 23, 42, .16); padding: 16px;
            }
            .evt-cta-bar.evt-cta-floating-shell .evt-cta-panel.hidden { display: none; }
            .evt-cta-bar.evt-cta-floating-shell .evt-cta-panel-close {
                position: absolute; top: 10px; right: 10px; width: 30px; height: 30px;
                border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; color: #374151;
                font-size: 20px; line-height: 1; font-weight: 700; cursor: pointer;
            }
            .evt-cta-bar.evt-cta-floating-shell .evt-cta-panel-head {
                padding-right: 34px; margin-bottom: 12px;
            }
            .evt-cta-bar.evt-cta-floating-shell .evt-cta-panel-head strong {
                display: block; color: #111827; font-size: 15px; line-height: 1.25;
            }
            .evt-cta-bar.evt-cta-floating-shell .evt-cta-panel-head span {
                display: block; margin-top: 3px; color: #6b7280; font-size: 12px; line-height: 1.35;
            }
            .evt-cta-bar.evt-cta-floating-shell .evt-cta-panel.evt-team-chat-panel {
                width: min(480px, 100%);
            }
        }
        `;
        document.head.appendChild(style);
    }

    function raffleLockedCtaBtnHtml() {
        return `<button type="button" class="evt-cta-btn evt-cta-raffle-locked" disabled aria-disabled="true">${EVT_CTA_ICONS.ticket} Enter Raffle</button>`;
    }

    function canUseEventScanner(event, canManageEvent) {
        const checkinEnabled = event.checkin_enabled !== false;
        return checkinEnabled && canManageEvent
            && event.checkin_mode === 'attendee_ticket'
            && ['open', 'confirmed', 'active'].includes(event.status);
    }

    function teamToolsRow(label, sub, onClick, disabled) {
        const subHtml = sub ? `<span class="evt-team-tool-sub">${sub}</span>` : '';
        if (disabled) {
            return `<button type="button" class="evt-team-tool-btn" disabled aria-disabled="true"><span class="evt-team-tool-main">${label}</span>${subHtml}</button>`;
        }
        return `<button type="button" class="evt-team-tool-btn" onclick="${onClick}"><span class="evt-team-tool-main">${label}</span>${subHtml}</button>`;
    }

    function buildTeamToolsPanelHtml(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, opts) {
        const { canManageEvent } = opts;
        const rsvpEnabled = event.rsvp_enabled !== false;
        const raffleEnabled = !!event.raffle_enabled;
        const canRsvp = rsvpEnabled && ['open', 'confirmed', 'active'].includes(event.status) && !entriesClosed;
        const hasGoingRsvp = typeof window.evtIsGoingRsvp === 'function'
            ? window.evtIsGoingRsvp(rsvp)
            : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));
        const rows = [];

        rows.push(teamToolsRow('Team Chat', 'Private team coordination', `evtCloseCtaPanel();evtOpenTeamChat('${eventId}')`, false));

        if (rsvpEnabled) {
            if (!canRsvp) {
                rows.push(teamToolsRow('RSVP as Myself', 'RSVP is closed for this event', '', true));
            } else if (eventIsFull && !hasGoingRsvp) {
                rows.push(teamToolsRow('RSVP as Myself', 'Event is full', '', true));
            } else if (hasGoingRsvp) {
                rows.push(teamToolsRow('RSVP as Myself', "You're RSVP'd — tap to update", `evtCloseCtaPanel();evtHandleRsvp('${eventId}','going')`, false));
            } else if (event.pricing_mode === 'paid') {
                rows.push(teamToolsRow('RSVP as Myself', `Paid RSVP — ${formatCurrency(event.rsvp_cost_cents)}`, `evtCloseCtaPanel();evtHandleRsvp('${eventId}','going')`, false));
            } else {
                rows.push(teamToolsRow('RSVP as Myself', 'Count yourself as going', `evtCloseCtaPanel();evtHandleRsvp('${eventId}','going')`, false));
            }
        }

        if (raffleEnabled) {
            const raffleBundled = typeof window.evtIsRaffleBundledWithPaidRsvp === 'function'
                ? window.evtIsRaffleBundledWithPaidRsvp(event)
                : (event.pricing_mode === 'paid' && rsvpEnabled);
            if (raffleBundled) {
                rows.push(teamToolsRow('Enter Raffle', rsvp?.paid ? 'Included with your paid RSVP' : 'Included with paid RSVP', '', true));
            } else if (myRaffleEntry) {
                rows.push(teamToolsRow('Enter Raffle', 'Already entered', '', true));
            } else if (entriesClosed) {
                rows.push(teamToolsRow('Enter Raffle', 'Entries are closed', '', true));
            } else if (!hasGoingRsvp) {
                rows.push(teamToolsRow('Enter Raffle', 'RSVP first to enter the raffle', '', true));
            } else {
                rows.push(teamToolsRow('Enter Raffle', event.raffle_entry_cost_cents > 0 ? formatCurrency(event.raffle_entry_cost_cents) : 'Free entry', `evtOpenCtaPanel('raffle','${eventId}')`, false));
            }
        }

        if (hasGoingRsvp) {
            rows.push(teamToolsRow('View Ticket', 'Your RSVP confirmation', `evtOpenCtaPanel('ticket','${eventId}')`, false));
        }

        if (canUseEventScanner(event, canManageEvent)) {
            rows.push(teamToolsRow('Scanner', 'Scan attendee QR codes', `evtCloseCtaPanel();evtOpenScanner('${eventId}')`, false));
        }

        if (canManageEvent) {
            const manageClick = `evtCloseCtaPanel();(window.EventsManage?window.EventsManage.open('${eventId}',{source:'portal'}):(window.location='../admin/events.html?id=${eventId}'))`;
            rows.push(teamToolsRow('Manage Event', 'Hosts, RSVP, raffle, settings', manageClick, false));
        }

        return `<div class="evt-team-tool-list">${rows.join('')}</div>`;
    }

    function ensureCtaBarShell() {
        let bar = document.getElementById('evtCtaBar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'evtCtaBar';
            bar.className = 'evt-cta-bar evt-cta-floating-shell';
            bar.dataset.evtFloatingShell = '1';
            bar.innerHTML = '<div id="evtCtaPanel" class="evt-cta-panel"></div><div class="evt-cta-actions" hidden aria-hidden="true"></div>';
            document.body.appendChild(bar);
            document.body.classList.add('evt-cta-active');
        }
        return bar;
    }

    function applyDesktopTeamToolsOverlay(bar) {
        if (!bar || !window.matchMedia('(min-width: 1024px)').matches) return;
        bar.classList.add('evt-cta-floating-shell', 'evt-team-tools-overlay');
        bar.dataset.evtFloatingShell = '1';
        if (!bar.dataset.evtOverlayCloseBound) {
            bar.dataset.evtOverlayCloseBound = '1';
            bar.addEventListener('click', (e) => {
                if (e.target === bar) closeCtaPanel();
            });
        }
    }

    function closeCtaPanel() {
        if (typeof window.evtCleanupTeamChat === 'function') window.evtCleanupTeamChat();
        const panel = document.getElementById('evtCtaPanel');
        const bar = document.getElementById('evtCtaBar');
        if (panel) {
            panel.classList.add('hidden');
            panel.classList.remove('evt-team-chat-panel');
            panel.innerHTML = '';
        }
        if (bar) {
            bar.classList.remove('evt-cta-bar-expanded', 'evt-team-tools-overlay');
            if (bar.dataset.evtFloatingShell === '1') {
                bar.classList.remove('evt-cta-floating-shell');
                delete bar.dataset.evtFloatingShell;
                cleanupBottomNav();
                return;
            }
        }
    }

    function openCtaPanel(kind, eventId) {
        const event = (window.evtAllEvents || evtAllEvents).find(e => e.id === eventId);
        if (!event) return;
        const bar = ensureCtaBarShell();
        const panel = document.getElementById('evtCtaPanel');
        if (!panel) return;
        if (bar.dataset.evtFloatingShell === '1') bar.classList.add('evt-team-tools-overlay');

        const rsvp = (window.evtAllRsvps || evtAllRsvps)[eventId];
        const closeBtn = '<button type="button" class="evt-cta-panel-close" onclick="evtCloseCtaPanel()" aria-label="Close">×</button>';
        bar.classList.add('evt-cta-bar-expanded');
        panel.classList.remove('hidden');

        const memberGoing = typeof window.evtIsGoingRsvp === 'function'
            ? window.evtIsGoingRsvp(rsvp)
            : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));

        if (kind === 'ticket') {
            const hasQr = memberGoing && rsvp?.qr_token && event.checkin_mode === 'attendee_ticket';
            panel.innerHTML = `
            ${closeBtn}
            <div class="evt-cta-panel-head"><strong>You're going</strong><span>${evtEscapeHtml(event.title || 'Event')}</span></div>
            <div class="evt-cta-ticket-card">
                ${hasQr ? '<canvas id="evtCtaTicketQR"></canvas><p>Show this QR code at check-in</p>' : '<div class="ed-notice"><span class="ed-notice-emoji">✅</span><div><p class="ed-notice-title">You are on the RSVP list</p><p class="ed-notice-sub">No QR ticket is required for this event.</p></div></div>'}
            </div>`;
            if (hasQr) {
                const canvas = document.getElementById('evtCtaTicketQR');
                const qrUrl = `${window.location.origin}/events/?e=${event.slug}&ticket=${rsvp.qr_token}`;
                (async () => {
                    try {
                        const QRCode = typeof window.evtEnsureQRCode === 'function'
                            ? await window.evtEnsureQRCode()
                            : window.QRCode;
                        if (QRCode && canvas?.isConnected) {
                            QRCode.toCanvas(canvas, qrUrl, { width: 172, margin: 2 });
                        }
                    } catch (err) {
                        console.warn('CTA ticket QR failed:', err);
                    }
                })();
            }
            return;
        }

        const raffleBundled = typeof window.evtIsRaffleBundledWithPaidRsvp === 'function'
            ? window.evtIsRaffleBundledWithPaidRsvp(event)
            : (event.pricing_mode === 'paid' && event.rsvp_enabled !== false);
        if (raffleBundled) {
            panel.innerHTML = `
            ${closeBtn}
            <div class="evt-cta-panel-head"><strong>Raffle included</strong><span>Raffle entry is included when you complete your paid RSVP for this event.</span></div>`;
            return;
        }

        if (!memberGoing) {
            panel.innerHTML = `
            ${closeBtn}
            <div class="evt-cta-panel-head"><strong>RSVP first</strong><span>Once you are going, this same member RSVP will be used for the raffle entry.</span></div>
            <button type="button" onclick="window.evtCtaRaffleIntent='${eventId}';evtHandleRsvp('${eventId}','going')" class="evt-raffle-buy">RSVP to Enter Raffle</button>`;
            return;
        }

        const cost = event.raffle_entry_cost_cents || 0;
        panel.innerHTML = `
        ${closeBtn}
        <div class="evt-cta-panel-head"><strong>Enter the raffle</strong><span>${cost > 0 ? 'Confirm to start checkout. Raffle tickets are non-refundable.' : 'One tap and you are in the draw.'}</span></div>
        <button type="button" onclick="${cost > 0 ? `evtHandleRaffleEntry('${eventId}')` : `evtHandleFreeRaffleEntry('${eventId}')`}" class="evt-raffle-buy">${cost > 0 ? `Buy Raffle Entry — ${formatCurrency(cost)}` : 'Enter Raffle — Free'}</button>`;
    }

    function openTeamToolsPanel(eventId) {
        injectTeamToolsStyles();
        if (typeof window.evtCleanupTeamChat === 'function') window.evtCleanupTeamChat();
        const event = (window.evtAllEvents || evtAllEvents).find(e => e.id === eventId);
        if (!event) return;

        const ctx = window.__evtTeamToolsCtx || {};
        const rsvp = (window.evtAllRsvps || evtAllRsvps)[eventId];
        const myRaffleEntry = ctx.eventId === eventId ? ctx.myRaffleEntry : null;
        const entriesClosed = ctx.eventId === eventId ? !!ctx.entriesClosed : false;
        const eventIsFull = ctx.eventId === eventId ? !!ctx.eventIsFull : false;
        const canManageEvent = ctx.eventId === eventId ? !!ctx.canManageEvent : false;

        let bar = document.getElementById('evtCtaBar');
        if (!bar) bar = ensureCtaBarShell();
        applyDesktopTeamToolsOverlay(bar);
        const panel = document.getElementById('evtCtaPanel');
        if (!panel) return;

        const closeBtn = '<button type="button" class="evt-cta-panel-close" onclick="evtCloseCtaPanel()" aria-label="Close">×</button>';
        const actionsHtml = buildTeamToolsPanelHtml(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, { canManageEvent });

        bar.classList.add('evt-cta-bar-expanded');
        panel.classList.remove('hidden');
        panel.innerHTML = `
        ${closeBtn}
        <div class="evt-cta-panel-head"><strong>Event Tools</strong><span>Team coordination and your personal RSVP, raffle, and ticket.</span></div>
        ${actionsHtml}`;

        if (!window.__evtTeamToolsEscBound) {
            window.__evtTeamToolsEscBound = true;
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;
                const p = document.getElementById('evtCtaPanel');
                if (p && !p.classList.contains('hidden')) closeCtaPanel();
            });
        }
    }

    function cleanupBottomNav() {
        if (typeof window.evtCleanupTeamChat === 'function') window.evtCleanupTeamChat();
        const el = document.getElementById('evtCtaBar');
        if (el) el.remove();
        const hint = document.querySelector('.bottom-tab-bar .swipe-hint');
        if (hint) hint.style.display = '';
        document.body.classList.remove('evt-cta-active');
        if (typeof window.evtCleanupHeroCollapse === 'function') window.evtCleanupHeroCollapse();
    }

    function initBottomNav(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, isHost, canAccessTeamHub) {
        cleanupBottomNav();
        injectTeamToolsStyles();

        const rsvpEnabled  = event.rsvp_enabled !== false;
        const raffleEnabled = !!event.raffle_enabled;
        const teamHubAccess = !!canAccessTeamHub || isHost
            || (typeof canAccessAdminDashboard === 'function' && canAccessAdminDashboard());

        if (!isHost && !teamHubAccess && !rsvpEnabled && !raffleEnabled) return;

        const isClosed = event.status === 'completed' || event.status === 'cancelled';
        const canRsvp  = rsvpEnabled && ['open','confirmed','active'].includes(event.status) && !entriesClosed;

        let primaryBtn   = '';
        let secondaryBtn = '';
        let ctaFootnote  = '';

        const teamBtn = `<button type="button" class="evt-cta-btn evt-cta-team" onclick="evtOpenTeamToolsPanel('${eventId}')" aria-label="Open event team tools">Team</button>`;

        if (isHost) {
            primaryBtn = `<button type="button" class="evt-cta-btn evt-cta-manage" onclick="window.EventsManage ? window.EventsManage.open('${eventId}',{source:'portal'}) : (window.location='../admin/events.html?id=${eventId}')">${EVT_CTA_ICONS.manage} Manage Event</button>`;
            if (teamHubAccess) secondaryBtn = teamBtn;
        } else if (teamHubAccess) {
            primaryBtn = teamBtn;
        } else {
            if (rsvpEnabled) {
                if (rsvp?.paid) {
                    primaryBtn = `<button class="evt-cta-btn evt-cta-rsvp-done" onclick="evtOpenCtaPanel('ticket','${eventId}')">${EVT_CTA_ICONS.ticket} RSVP'd · Ticket</button>`;
                } else if (rsvp?.status === 'going') {
                    primaryBtn = `<button class="evt-cta-btn evt-cta-rsvp-done" onclick="evtOpenCtaPanel('ticket','${eventId}')">${EVT_CTA_ICONS.ticket} Going · Ticket</button>`;
                } else if (canRsvp && !eventIsFull && event.pricing_mode === 'paid') {
                    primaryBtn = `<button class="evt-cta-btn evt-cta-rsvp" onclick="evtHandleRsvp('${eventId}','going')">RSVP — ${formatCurrency(event.rsvp_cost_cents)}</button>`;
                } else if (canRsvp && !eventIsFull) {
                    primaryBtn = `<button class="evt-cta-btn evt-cta-rsvp" onclick="evtHandleRsvp('${eventId}','going')">RSVP</button>`;
                } else if (eventIsFull) {
                    primaryBtn = `<button class="evt-cta-btn evt-cta-disabled" disabled>${EVT_CTA_ICONS.lock} Full</button>`;
                } else {
                    primaryBtn = `<button class="evt-cta-btn evt-cta-disabled" disabled>${EVT_CTA_ICONS.lock} ${isClosed ? 'Closed' : 'RSVP Closed'}</button>`;
                }
            }

            if (raffleEnabled) {
                const raffleIncluded = typeof window.evtIsRaffleBundledWithPaidRsvp === 'function'
                    ? window.evtIsRaffleBundledWithPaidRsvp(event)
                    : (event.pricing_mode === 'paid' && rsvpEnabled);
                const memberGoingNav = typeof window.evtIsGoingRsvp === 'function'
                    ? window.evtIsGoingRsvp(rsvp)
                    : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));
                if (!raffleIncluded) {
                    const hasPrimary = !!primaryBtn;
                    const activeCls = hasPrimary ? 'evt-cta-raffle-outline' : 'evt-cta-raffle';
                    let raffleSlot = '';
                    if (myRaffleEntry) {
                        raffleSlot = `<button class="evt-cta-btn evt-cta-raffle-done" disabled>${EVT_CTA_ICONS.check} Entered</button>`;
                    } else if (entriesClosed) {
                        raffleSlot = `<button class="evt-cta-btn evt-cta-disabled" disabled>${EVT_CTA_ICONS.lock} Entries Closed</button>`;
                    } else if (!memberGoingNav) {
                        raffleSlot = raffleLockedCtaBtnHtml();
                        ctaFootnote = '<p class="evt-cta-footnote">RSVP first to enter the raffle</p>';
                    } else if (event.raffle_entry_cost_cents > 0) {
                        raffleSlot = `<button class="evt-cta-btn ${activeCls}" onclick="evtOpenCtaPanel('raffle','${eventId}')">${EVT_CTA_ICONS.ticket} Raffle — ${formatCurrency(event.raffle_entry_cost_cents)}</button>`;
                    } else {
                        raffleSlot = `<button class="evt-cta-btn ${activeCls}" onclick="evtOpenCtaPanel('raffle','${eventId}')">${EVT_CTA_ICONS.ticket} Enter Raffle</button>`;
                    }
                    if (hasPrimary) {
                        secondaryBtn = raffleSlot;
                    } else {
                        primaryBtn = raffleSlot;
                    }
                }
            }
        }

        if (!primaryBtn && !secondaryBtn) return;

        const bar = document.createElement('div');
        bar.id = 'evtCtaBar';
        bar.className = 'evt-cta-bar' + (ctaFootnote ? ' evt-cta-bar-has-footnote' : '');
        bar.innerHTML = `<div id="evtCtaPanel" class="evt-cta-panel hidden"></div><div class="evt-cta-actions">${primaryBtn + secondaryBtn}</div>${ctaFootnote}`;
        document.body.appendChild(bar);
        document.body.classList.add('evt-cta-active');

        const hint = document.querySelector('.bottom-tab-bar .swipe-hint');
        if (hint) hint.style.display = 'none';
    }

    window.PortalEvents.team.tools = {
        injectStyles: injectTeamToolsStyles,
        ensureCtaBarShell,
        applyDesktopTeamToolsOverlay,
        buildPanelHtml: buildTeamToolsPanelHtml,
        open: openTeamToolsPanel,
        closePanel: closeCtaPanel,
        openCtaPanel,
        initBottomNav,
        cleanupBottomNav,
        raffleLockedCtaBtnHtml,
    };

    window.evtInjectTeamToolsStyles = injectTeamToolsStyles;
    window.evtEnsureCtaBarShell = ensureCtaBarShell;
    window.evtApplyDesktopTeamToolsOverlay = applyDesktopTeamToolsOverlay;
    window.evtOpenTeamToolsPanel = openTeamToolsPanel;
    window.evtCloseCtaPanel = closeCtaPanel;
    window.evtOpenCtaPanel = openCtaPanel;
    window.evtInitBottomNav = initBottomNav;
    window.evtCleanupBottomNav = cleanupBottomNav;
})();

;/* ===== js/portal/events/detail/presentation.js ===== */
/* ════════════════════════════════════════════════════════════
   Portal Events — Detail presentation helpers (Phase 5D.1)
   Classic IIFE; loads after team/tools.js, before detail.js.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.detail = window.PortalEvents.detail || {};

    function evtMiniMarkdown(text) {
        if (!text) return '';
        let html = evtEscapeHtml(text);
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        return html;
    }

    function evtOpenLightbox(imgUrl) {
        if (!imgUrl) return;
        const lb = document.createElement('div');
        lb.className = 'evt-lightbox';
        lb.innerHTML = `<button class="evt-lightbox-close" aria-label="Close"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button><img src="${imgUrl}" alt="Event banner">`;
        lb.onclick = e => { if (e.target === lb || e.target.closest('.evt-lightbox-close')) { lb.classList.remove('active'); setTimeout(() => lb.remove(), 250); } };
        document.body.appendChild(lb);
        requestAnimationFrame(() => lb.classList.add('active'));
    }

    function evtInitSectionAnimations() {
        const sections = document.querySelectorAll('#eventsDetailView .ed-card');
        if (!sections.length) return;
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('ed-visible'); obs.unobserve(e.target); } });
        }, { threshold: 0.08 });
        sections.forEach((s, i) => { s.style.animationDelay = `${i * 0.06}s`; obs.observe(s); });
    }

    var _evtCountdownInterval = null;
    function evtStartLiveCountdown(startDate) {
        if (_evtCountdownInterval) clearInterval(_evtCountdownInterval);
        const badgeEl = document.querySelector('#eventsDetailView .evt-status-badge');
        if (!badgeEl) return;

        function tick() {
            const ms = new Date(startDate) - new Date();
            if (ms <= 0) {
                badgeEl.className = 'evt-status-badge evt-status-live';
                badgeEl.innerHTML = '<span class="evt-status-dot pulse"></span>Live';
                clearInterval(_evtCountdownInterval);
                return;
            }
            const d = Math.floor(ms / 86400000);
            const h = Math.floor((ms % 86400000) / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            let lbl;
            if (d > 0) lbl = `${d}d ${h}h`;
            else if (h > 0) lbl = `${h}h ${m}m`;
            else lbl = `${m}m ${s}s`;
            badgeEl.innerHTML = `<span class="evt-status-dot${d === 0 ? ' pulse' : ''}"></span>${lbl}`;
        }
        const msUntil = new Date(startDate) - new Date();
        const interval = msUntil < 3600000 ? 1000 : 60000;
        _evtCountdownInterval = setInterval(tick, interval);
        if (interval === 60000) {
            const upgradeIn = msUntil - 3600000;
            if (upgradeIn > 0) {
                setTimeout(() => { clearInterval(_evtCountdownInterval); _evtCountdownInterval = setInterval(tick, 1000); }, upgradeIn);
            }
        }
    }

    window.PortalEvents.detail.presentation = {
        miniMarkdown: evtMiniMarkdown,
        openLightbox: evtOpenLightbox,
        initSectionAnimations: evtInitSectionAnimations,
        startLiveCountdown: evtStartLiveCountdown,
    };

    window.evtMiniMarkdown = evtMiniMarkdown;
    window.evtOpenLightbox = evtOpenLightbox;
    window.evtInitSectionAnimations = evtInitSectionAnimations;
    window.evtStartLiveCountdown = evtStartLiveCountdown;
})();

;/* ===== js/portal/events/detail/raffle-render.js ===== */
/* ════════════════════════════════════════════════════════════
   Portal Events — Detail raffle render helpers (Phase 5D.2)
   Classic IIFE; loads after detail/presentation.js, before detail.js.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.detail = window.PortalEvents.detail || {};

    function _raffleSectionHead(title) {
        return `<div class="ed-section-head"><h3>${title}</h3></div>`;
    }

    function evtDetailRaffleConfig(event) {
        if (!window.EventsRaffleModel) return event?.raffle_prizes || [];
        return window.EventsRaffleModel.normalizeConfig(event?.raffle_prizes || []);
    }

    function evtDetailRaffleCategories(config) {
        if (!window.EventsRaffleModel) return [];
        return window.EventsRaffleModel.getOrderedCategories(config);
    }

    function evtDetailRaffleItems(config, categoryId) {
        if (!window.EventsRaffleModel) return [];
        return window.EventsRaffleModel.getItemsForCategory(config, categoryId);
    }

    function evtDetailRaffleWinnerCount(config, event) {
        if (window.EventsRaffleModel) return window.EventsRaffleModel.getTotalWinnerCount(config);
        return event?.raffle_winner_count || (Array.isArray(event?.raffle_prizes) ? event.raffle_prizes.length : 0);
    }

    function evtDetailDrawModeLabel(drawMode) {
        if (drawMode === 'random_item') return 'Random prize assigned';
        if (drawMode === 'winner_choice') return 'Winner chooses from this tier';
        return 'Drawing specific prizes';
    }

    function evtDetailPrizeMedia(item) {
        if (item?.image_url) return `<img src="${evtEscapeHtml(item.image_url)}" alt="" loading="lazy">`;
        return `<span>${evtEscapeHtml(item?.emoji || window.EventsRaffleModel?.DEFAULT_EMOJI || '🎁')}</span>`;
    }

    function evtDetailRafflePrizeItems(config) {
        return evtDetailRaffleCategories(config).flatMap(category => evtDetailRaffleItems(config, category.id));
    }

    function evtDetailRafflePrizesHtml(event) {
        const config = evtDetailRaffleConfig(event);
        const items = evtDetailRafflePrizeItems(config);
        if (!items.length) return '';

        return `<div class="ed-raffle-prize-rail">${items.map(item => `
        <article class="ed-raffle-prize-tile" title="${evtEscapeHtml(item.name)}">
            <div class="ed-raffle-prize-media">${evtDetailPrizeMedia(item)}</div>
            <p>${evtEscapeHtml(item.name)}</p>
        </article>
    `).join('')}</div>`;
    }

    function evtDetailRaffleWinnersHtml(winners) {
        if (!winners.length) return '';
        const rows = winners.map(w => {
            const initials = w.profiles ? `${w.profiles.first_name?.[0] || ''}${w.profiles.last_name?.[0] || ''}`.toUpperCase() : '';
            const avatar = w.profiles?.profile_picture_url
                ? `<img src="${evtEscapeHtml(w.profiles.profile_picture_url)}" alt="" loading="lazy">`
                : `<span>${evtEscapeHtml(initials || (w.guest_token ? 'G' : 'W'))}</span>`;
            const prize = w.selection_status === 'pending_choice' ? 'Choosing later' : (w.prize_description || 'Prize pending');
            const emoji = evtEscapeHtml(w.prize_emoji || '🎁');
            return `<article class="ed-winner-card">
            <div class="ed-winner-avatar">${avatar}<b>${w.place}</b></div>
            <div class="ed-winner-copy"><span>${emoji}</span><p>${evtEscapeHtml(prize)}</p></div>
        </article>`;
        }).join('');
        return `<div class="ed-winners ed-winners-compact">${_raffleSectionHead('Winners')}<div class="ed-winner-rail">${rows}</div></div>`;
    }

    function evtRaffleLockedDesktopHtml(eventId, showTeamHint) {
        const mobileHint = showTeamHint
            ? `<p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the RSVP button in the bar below, or open <button type="button" class="ed-link-btn" onclick="evtOpenTeamToolsPanel('${eventId}')">Team</button> to RSVP as yourself.</p>`
            : `<p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the RSVP button in the sticky bar below, then enter the raffle.</p>`;
        return `<div class="ed-raffle-desktop-action ed-raffle-locked-block">
        <button type="button" class="ed-raffle-btn ed-raffle-btn-locked" disabled aria-disabled="true">🎟️ Enter Raffle</button>
        <p class="ed-raffle-locked-hint">RSVP first to enter the raffle</p>
    </div>${mobileHint}`;
    }

    window.PortalEvents.detail.raffleRender = {
        config: evtDetailRaffleConfig,
        categories: evtDetailRaffleCategories,
        items: evtDetailRaffleItems,
        winnerCount: evtDetailRaffleWinnerCount,
        drawModeLabel: evtDetailDrawModeLabel,
        prizesHtml: evtDetailRafflePrizesHtml,
        winnersHtml: evtDetailRaffleWinnersHtml,
        lockedDesktopHtml: evtRaffleLockedDesktopHtml,
    };

    window.evtDetailRaffleConfig = evtDetailRaffleConfig;
    window.evtDetailRaffleCategories = evtDetailRaffleCategories;
    window.evtDetailRaffleItems = evtDetailRaffleItems;
    window.evtDetailRaffleWinnerCount = evtDetailRaffleWinnerCount;
    window.evtDetailDrawModeLabel = evtDetailDrawModeLabel;
    window.evtDrawModeLabel = evtDetailDrawModeLabel;
    window.evtDetailRafflePrizesHtml = evtDetailRafflePrizesHtml;
    window.evtDetailRaffleWinnersHtml = evtDetailRaffleWinnersHtml;
    window.evtRaffleLockedDesktopHtml = evtRaffleLockedDesktopHtml;
})();

;/* ===== js/portal/events/detail/map-overlay.js ===== */
/* ════════════════════════════════════════════════════════════
   Portal Events — Detail fullscreen map overlay (Phase 5D.3)
   Classic IIFE; loads after detail/raffle-render.js, before detail.js.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.detail = window.PortalEvents.detail || {};

    let _fullscreenMap = null;
    let _fullscreenMapCoords = null;

    async function evtOpenFullscreenMap(lat, lng, label) {
        const overlay = document.getElementById('fullscreenMapOverlay');
        if (!overlay) return;

        try {
            if (typeof window.evtEnsureLeaflet === 'function') await window.evtEnsureLeaflet();
        } catch (err) {
            console.error('Leaflet load error:', err);
            return;
        }
        if (typeof L === 'undefined') return;

        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        const dirBtn = document.getElementById('fullscreenMapDirections');
        if (dirBtn) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const addr = encodeURIComponent(label || `${lat},${lng}`);
            dirBtn.href = isIOS
                ? `https://maps.apple.com/?daddr=${addr}`
                : `https://www.google.com/maps/dir/?api=1&destination=${addr}`;
        }

        setTimeout(() => {
            _fullscreenMapCoords = { lat, lng };
            if (_fullscreenMap) { _fullscreenMap.remove(); _fullscreenMap = null; }
            _fullscreenMap = L.map('fullscreenMapContainer', {
                zoomControl: true,
                attributionControl: false,
                dragging: true,
                scrollWheelZoom: true
            }).setView([lat, lng], 16);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_fullscreenMap);
            L.marker([lat, lng]).addTo(_fullscreenMap).bindPopup(evtEscapeHtml(label || 'Event Location')).openPopup();
            setTimeout(() => _fullscreenMap.invalidateSize(), 50);
        }, 50);
    }

    function evtRecenterFullscreenMap() {
        if (!_fullscreenMap || !_fullscreenMapCoords) return;
        _fullscreenMap.setView([_fullscreenMapCoords.lat, _fullscreenMapCoords.lng], 16, { animate: true, duration: 0.5 });
    }

    function evtCloseFullscreenMap() {
        const overlay = document.getElementById('fullscreenMapOverlay');
        if (overlay) overlay.classList.add('hidden');
        if (_fullscreenMap) { _fullscreenMap.remove(); _fullscreenMap = null; }
        document.body.style.overflow = '';
    }

    window.PortalEvents.detail.mapOverlay = {
        open: evtOpenFullscreenMap,
        recenter: evtRecenterFullscreenMap,
        close: evtCloseFullscreenMap,
    };

    window.evtOpenFullscreenMap = evtOpenFullscreenMap;
    window.evtRecenterFullscreenMap = evtRecenterFullscreenMap;
    window.evtCloseFullscreenMap = evtCloseFullscreenMap;
})();

;/* ===== js/portal/events/detail/fragments.js ===== */
/* ════════════════════════════════════════════════════════════
   Portal Events — Detail HTML fragment helpers (Phase 5F-prep)
   Classic IIFE; loads after detail/map-overlay.js, before detail.js.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.detail = window.PortalEvents.detail || {};

    function metaRow(icon, label, value, extra) {
        return `<div class="ed-meta-row">
        <div class="ed-meta-icon">${icon}</div>
        <div class="ed-meta-text">
            <span class="ed-meta-label">${label}</span>
            <span class="ed-meta-value">${value}</span>
            ${extra || ''}
        </div>
    </div>`;
    }

    function pill(text, cls) {
        return `<span class="ed-pill ${cls || ''}">${text}</span>`;
    }

    function card(content, extraCls) {
        return `<div class="ed-card ${extraCls || ''}">${content}</div>`;
    }

    function notice(emoji, title, sub) {
        return `<div class="ed-notice">
        <span class="ed-notice-emoji">${emoji}</span>
        <div><p class="ed-notice-title">${title}</p><p class="ed-notice-sub">${sub}</p></div>
    </div>`;
    }

    function sectionHead(title) {
        return `<div class="ed-section-head"><h3>${title}</h3></div>`;
    }

    window.PortalEvents.detail.fragments = {
        metaRow,
        pill,
        card,
        notice,
        sectionHead,
    };

    window.evtEdMetaRow = metaRow;
    window.evtEdPill = pill;
    window.evtEdCard = card;
    window.evtEdNotice = notice;
    window.evtEdSectionHead = sectionHead;
})();

;/* ===== js/portal/events/detail/data.js ===== */
/* ════════════════════════════════════════════════════════════
   Portal Events — Detail data context loader (Phase 5H.1)
   Classic IIFE; loads after detail/fragments.js, before detail.js.
   Fetches Supabase data and derived flags for evtOpenDetail().
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.detail = window.PortalEvents.detail || {};

    async function evtLoadDetailContext(eventId) {
        const events = window.evtAllEvents || evtAllEvents;
        const rsvpMap = window.evtAllRsvps || evtAllRsvps;
        const event = events.find(e => e.id === eventId);
        if (!event) return null;

        const rsvp = rsvpMap[eventId];
        const start = new Date(event.start_date);
        const end = event.end_date ? new Date(event.end_date) : null;
        const dateStr = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const endTimeStr = end ? end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
        const typeColors = (window.EventsConstants && window.EventsConstants.TYPE_COLORS_PORTAL) || {};
        const tc = typeColors[event.event_type] || typeColors.member;
        const isLlc = event.event_type === 'llc';
        const isComp = event.event_type === 'competition';

        const [{ data: rsvps }, { data: guestRsvps }] = await Promise.all([
            supabaseClient
                .from('event_rsvps')
                .select('user_id, status, paid, profiles!event_rsvps_user_id_fkey(id, first_name, last_name, profile_picture_url)')
                .eq('event_id', eventId),
            supabaseClient
                .from('event_guest_rsvps')
                .select('id, guest_name, guest_email, status, paid')
                .eq('event_id', eventId),
        ]);
        const goingList = (rsvps || []).filter(r => (typeof window.evtIsGoingRsvp === 'function' ? window.evtIsGoingRsvp(r) : (r.status === 'going' || r.paid === true)));
        const maybeList = (rsvps || []).filter(r => r.status === 'maybe');
        const notGoingList = (rsvps || []).filter(r => r.status === 'not_going');
        const guestGoingList = (guestRsvps || []).filter(g => g.status === 'going' || g.paid === true);

        const { data: checkins, count: checkinCount } = await supabaseClient
            .from('event_checkins')
            .select('user_id, profiles!event_checkins_user_id_fkey(first_name, last_name, profile_picture_url)', { count: 'exact' })
            .eq('event_id', eventId);

        let costItems = [];
        if (isLlc) {
            const { data: ci } = await supabaseClient
                .from('event_cost_items')
                .select('*')
                .eq('event_id', eventId)
                .order('sort_order', { ascending: true });
            costItems = ci || [];
        }

        let waitlist = [];
        let myWaitlistEntry = null;
        if (isLlc) {
            const { data: wl } = await supabaseClient
                .from('event_waitlist')
                .select('*, profiles:user_id(first_name, last_name)')
                .eq('event_id', eventId)
                .order('position', { ascending: true });
            waitlist = wl || [];
            myWaitlistEntry = waitlist.find(w => w.user_id === evtCurrentUser.id);
        }

        let raffleEntryCount = 0;
        let myRaffleEntry = null;
        let raffleWinners = [];
        if (event.raffle_enabled) {
            const { count: rCount } = await supabaseClient
                .from('event_raffle_entries')
                .select('id', { count: 'exact', head: true })
                .eq('event_id', eventId);
            raffleEntryCount = rCount || 0;
            const { data: myEntry } = await supabaseClient
                .from('event_raffle_entries')
                .select('*')
                .eq('event_id', eventId)
                .eq('user_id', evtCurrentUser.id)
                .maybeSingle();
            myRaffleEntry = myEntry;
            const { data: winners } = await supabaseClient
                .from('event_raffle_winners')
                .select('*, profiles:user_id(first_name, last_name, profile_picture_url)')
                .eq('event_id', eventId)
                .order('place', { ascending: true });
            raffleWinners = winners || [];
        }

        const isCreator = event.created_by === evtCurrentUser.id;
        const { data: hostRecord } = await supabaseClient
            .from('event_hosts')
            .select('id')
            .eq('event_id', eventId)
            .eq('user_id', evtCurrentUser.id)
            .maybeSingle();
        const canManageEvent = isCreator || !!hostRecord || (typeof canManageEvents === 'function' && canManageEvents());
        const canAccessTeamHub = canManageEvent || (typeof canAccessAdminDashboard === 'function' && canAccessAdminDashboard());
        const isHost = canManageEvent;
        const canCreateTeamChat = isCreator || (typeof canManageEvents === 'function' && canManageEvents());

        let creatorProfile = (event.creator && event.creator.id) ? { ...event.creator } : null;
        if (event.created_by) {
            const { data: cp } = await supabaseClient
                .from('profiles')
                .select('id, first_name, last_name, profile_picture_url, displayed_badge, title, bio')
                .eq('id', event.created_by)
                .maybeSingle();
            if (cp) creatorProfile = { ...(creatorProfile || {}), ...cp };
            else if (!creatorProfile) {
                creatorProfile = {
                    id: event.created_by,
                    first_name: '',
                    last_name: '',
                    profile_picture_url: null,
                    displayed_badge: null,
                    title: 'Member',
                    bio: null,
                };
            }
        }
        const cpName = creatorProfile ? ([creatorProfile.first_name, creatorProfile.last_name].filter(Boolean).join(' ') || 'Member') : '';
        const cpInitials = creatorProfile ? ((creatorProfile.first_name || '?')[0] + (creatorProfile.last_name || '')[0]).toUpperCase() : '';
        const cpBadge = creatorProfile ? evtBadgeChip(creatorProfile.displayed_badge) : '';
        const cpTitle = creatorProfile ? (creatorProfile.title || 'Member') : '';

        const memberGoing = typeof window.evtIsGoingRsvp === 'function' ? window.evtIsGoingRsvp(rsvp) : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));
        const hasRsvp = rsvp && (memberGoing || rsvp.status === 'maybe');
        const documentsHtml = await evtBuildDocumentsHtml(event, isHost, hasRsvp);
        const mapHtml = evtBuildMapHtml(event, hasRsvp, isHost);
        const competitionHtml = isComp ? await evtBuildCompetitionHtml(event, isHost) : '';
        const scrapbookHtml = await evtBuildScrapbookHtml(event, !!hasRsvp);

        const showTime = !event.gate_time || hasRsvp || isHost;
        const showLocation = !event.gate_location || hasRsvp || isHost;
        const showNotes = !event.gate_notes || hasRsvp || isHost;

        const isClosed = event.status === 'completed' || event.status === 'cancelled';
        const isPast = new Date(event.start_date) < new Date() && event.status !== 'active';
        const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();
        const entriesClosed = isClosed || isPast || deadlinePassed;
        const rsvpEnabled = event.rsvp_enabled !== false;
        const canRsvp = rsvpEnabled && ['open', 'confirmed', 'active'].includes(event.status) && !entriesClosed;
        const eventIsFull = isLlc && event.max_participants && goingList.length >= event.max_participants;

        return {
            eventId,
            event,
            rsvp,
            start,
            dateStr,
            timeStr,
            endTimeStr,
            tc,
            isLlc,
            isComp,
            goingList,
            maybeList,
            notGoingList,
            guestGoingList,
            checkins,
            checkinCount,
            costItems,
            waitlist,
            myWaitlistEntry,
            raffleEntryCount,
            myRaffleEntry,
            raffleWinners,
            isCreator,
            canManageEvent,
            canAccessTeamHub,
            isHost,
            canCreateTeamChat,
            creatorProfile,
            cpName,
            cpInitials,
            cpBadge,
            cpTitle,
            memberGoing,
            hasRsvp,
            documentsHtml,
            mapHtml,
            competitionHtml,
            scrapbookHtml,
            showTime,
            showLocation,
            showNotes,
            isClosed,
            isPast,
            deadlinePassed,
            entriesClosed,
            rsvpEnabled,
            canRsvp,
            eventIsFull,
        };
    }

    window.evtLoadDetailContext = evtLoadDetailContext;
    window.PortalEvents.detail.data = {
        loadContext: evtLoadDetailContext,
    };
})();

;/* ===== js/portal/events/detail/sections.js ===== */
/* ════════════════════════════════════════════════════════════
   Portal Events — Detail section HTML builders (Phase 5H.2–5H.5)
   Classic IIFE; loads after detail/data.js, before detail.js.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.detail = window.PortalEvents.detail || {};

    const _edPill = window.evtEdPill;
    const _edNotice = window.evtEdNotice;
    const _edSectionHead = window.evtEdSectionHead;

    function evtBuildDetailRsvpSectionHtml(ctx) {
        const {
            eventId,
            event,
            rsvp,
            isHost,
            canAccessTeamHub,
            rsvpEnabled,
            canRsvp,
            eventIsFull,
            entriesClosed,
            isClosed,
            isPast,
            deadlinePassed,
        } = ctx;

        let rsvpButtons = '';
        if (!rsvpEnabled) {
            rsvpButtons = _edNotice('ℹ️', 'Informational Event', 'RSVP is not required for this event');
        } else if (isHost) {
            const teamBtnHtml = canAccessTeamHub
                ? `<button type="button" onclick="evtOpenTeamToolsPanel('${eventId}')" class="ed-outline-btn" aria-label="Open event team tools">Team</button>`
                : '';
            rsvpButtons = `
            <div class="ed-rsvp-confirmed">
                <div class="ed-rsvp-confirmed-row">
                    <div class="ed-rsvp-confirmed-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>
                    <div><span class="ed-rsvp-confirmed-title">You're hosting!</span><span class="ed-rsvp-confirmed-sub">You're automatically counted as attending.</span></div>
                </div>
            </div>
            <div class="ed-rsvp-host-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
                ${teamBtnHtml}
                <button type="button" onclick="window.EventsManage ? window.EventsManage.open('${eventId}',{source:'portal'}) : (window.location='../admin/events.html?id=${eventId}')" class="ed-outline-btn">Manage Event</button>
            </div>
            ${canAccessTeamHub ? '<p class="ed-hint">Use <strong>Team</strong> for RSVP as yourself, raffle entry, and your ticket.</p>' : ''}`;
        } else if (canRsvp && !eventIsFull && event.pricing_mode === 'paid') {
            if (rsvp?.paid) {
                rsvpButtons = `
                <div class="ed-rsvp-confirmed">
                    <div class="ed-rsvp-confirmed-row">
                        <div class="ed-rsvp-confirmed-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>
                        <div><span class="ed-rsvp-confirmed-title">You're going!</span><span class="ed-rsvp-confirmed-sub">Non-refundable · Contact admin for changes</span></div>
                    </div>
                </div>`;
            } else {
                rsvpButtons = `
                <button onclick="evtHandleRsvp('${eventId}','going')" class="ed-primary-btn">RSVP — ${formatCurrency(event.rsvp_cost_cents)}</button>
                <button onclick="evtMessageHost('${eventId}')" class="ed-outline-btn">Message Host</button>
                <p class="ed-hint">Non-refundable unless cancelled by staff${event.raffle_enabled ? ' · Includes raffle entry' : ''}</p>`;
            }
        } else if (canRsvp && !eventIsFull) {
            if (rsvp?.status === 'going') {
                rsvpButtons = `
                <div class="ed-rsvp-confirmed">
                    <div class="ed-rsvp-confirmed-row">
                        <div class="ed-rsvp-confirmed-check"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg></div>
                        <div><span class="ed-rsvp-confirmed-title">You're going!</span><span class="ed-rsvp-confirmed-sub">We'll see you there.</span></div>
                    </div>
                </div>
                <button onclick="evtHandleRsvp('${eventId}','going')" class="ed-outline-btn">Update RSVP</button>`;
            } else {
                const interestedActive = rsvp?.status === 'maybe' ? ' active' : '';
                rsvpButtons = `
                <button onclick="evtHandleRsvp('${eventId}','going')" class="ed-primary-btn">RSVP</button>
                <button onclick="evtMessageHost('${eventId}')" class="ed-outline-btn">Message Host</button>
                <div class="ed-rsvp-secondary">
                    <button onclick="evtHandleRsvp('${eventId}','maybe')" class="ed-rsvp-sm${interestedActive ? ' active' : ''}">❤️ Interested</button>
                </div>`;
            }
        }
        if (rsvpEnabled && !isHost && entriesClosed && !rsvpButtons) {
            let closedReason = '';
            if (isClosed) closedReason = event.status === 'cancelled' ? 'Event cancelled' : 'Event ended';
            else if (isPast) closedReason = 'Event has already started';
            else if (deadlinePassed) closedReason = 'RSVP deadline passed';
            if (rsvp) {
                const statusEmoji = rsvp.status === 'going' ? '✅' : rsvp.status === 'maybe' ? '❤️' : '❌';
                const statusLabel = rsvp.status === 'going' ? 'Going' : rsvp.status === 'maybe' ? 'Interested' : 'Not Going';
                rsvpButtons = _edNotice(statusEmoji, `Your RSVP: ${statusLabel}`, closedReason);
            } else {
                rsvpButtons = _edNotice('🔒', 'RSVP Closed', closedReason);
            }
        }
        return rsvpButtons;
    }

    function evtBuildDetailRaffleSectionHtml(ctx) {
        const {
            eventId,
            event,
            rsvp,
            myRaffleEntry,
            raffleEntryCount,
            raffleWinners,
            memberGoing,
            isHost,
            canAccessTeamHub,
            rsvpEnabled,
            entriesClosed,
            isClosed,
            isPast,
            deadlinePassed,
        } = ctx;

        if (!event.raffle_enabled) return '';

        const raffleConfig = window.evtDetailRaffleConfig(event);
        const prizeCount = window.evtDetailRaffleWinnerCount(raffleConfig, event);
        const prizesHtml = window.evtDetailRafflePrizesHtml(event);

        let entryStatusHtml = '';
        const hasRaffleRsvp = memberGoing;
        const raffleBundled = typeof window.evtIsRaffleBundledWithPaidRsvp === 'function'
            ? window.evtIsRaffleBundledWithPaidRsvp(event)
            : (event.pricing_mode === 'paid' && rsvpEnabled);
        if (myRaffleEntry) {
            entryStatusHtml = `<div class="ed-raffle-entry-chip">🎟️ Entered</div>`;
        } else if (entriesClosed && !myRaffleEntry) {
            let lockedReason = '';
            if (isClosed) lockedReason = event.status === 'cancelled' ? 'Event cancelled' : 'Event ended';
            else if (isPast) lockedReason = 'Event in progress';
            else if (deadlinePassed) lockedReason = 'RSVP deadline passed';
            entryStatusHtml = `<div class="ed-notice"><span class="ed-notice-emoji">🔒</span><div><p class="ed-notice-title">Entries Closed</p><p class="ed-notice-sub">${lockedReason}</p></div></div>`;
        } else if (raffleBundled && !rsvp?.paid) {
            entryStatusHtml = `<p class="ed-hint" style="font-style:italic">Raffle entry included with paid RSVP</p>`;
        } else if (!hasRaffleRsvp) {
            entryStatusHtml = window.evtRaffleLockedDesktopHtml(eventId, isHost && canAccessTeamHub);
        } else if (event.raffle_entry_cost_cents > 0 && !entriesClosed) {
            entryStatusHtml = `<div class="ed-raffle-desktop-action"><button onclick="evtHandleRaffleEntry('${eventId}')" class="ed-raffle-btn">🎟️ Buy Raffle Entry — ${formatCurrency(event.raffle_entry_cost_cents)}</button><p class="ed-hint">Non-refundable raffle ticket</p></div><p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the sticky CTA below to enter the raffle.</p>`;
        } else if ((!event.raffle_entry_cost_cents || event.raffle_entry_cost_cents === 0) && !entriesClosed) {
            entryStatusHtml = `<div class="ed-raffle-desktop-action"><button onclick="evtHandleFreeRaffleEntry('${eventId}')" class="ed-raffle-btn">🎟️ Enter Raffle — Free</button></div><p class="ed-hint ed-raffle-mobile-hint" style="font-style:italic">Use the sticky CTA below to enter the raffle.</p>`;
        }

        let winnersHtml = '';
        if (raffleWinners.length > 0) {
            winnersHtml = window.evtDetailRaffleWinnersHtml(raffleWinners);
        }

        const rafflePills = [
            event.pricing_mode !== 'paid' && event.raffle_entry_cost_cents > 0 ? _edPill(`🎟️ Entry: ${formatCurrency(event.raffle_entry_cost_cents)}`) : '',
            event.pricing_mode === 'paid' ? _edPill('✅ Included with RSVP') : '',
            !event.raffle_entry_cost_cents && event.pricing_mode !== 'paid' ? _edPill('🎟️ Free entry') : '',
        ].filter(Boolean).join('');

        return `
            <div class="ed-raffle-compact">
                <div class="ed-raffle-compact-head">
                    <div>${_edSectionHead('Raffle')}<div class="ed-raffle-compact-info-row"><p>${raffleEntryCount} ${raffleEntryCount === 1 ? 'entry' : 'entries'}${prizeCount ? ` · ${prizeCount} ${prizeCount === 1 ? 'winner' : 'winners'}` : ''}</p>${rafflePills}</div></div>
                </div>
                <div class="ed-raffle-content-grid">
                    ${prizesHtml ? `<div class="ed-raffle-panel">${_edSectionHead('Prizes')}${prizesHtml}</div>` : `<p class="ed-hint" style="font-style:italic">Prizes to be announced</p>`}
                    ${winnersHtml ? `<div class="ed-raffle-panel">${winnersHtml}</div>` : ''}
                </div>
                ${entryStatusHtml ? `<div class="ed-raffle-entry-status">${entryStatusHtml}</div>` : ''}
            </div>`;
    }

    function evtBuildDetailHostControlsHtml(ctx) {
        const { eventId, event, isHost, isLlc } = ctx;
        if (!isHost) return '';

        let primaryBtn = '';
        let dropdownItems = '';
        if (event.status === 'draft') primaryBtn = `<button onclick="evtUpdateStatus('${eventId}','open')" class="evt-host-btn primary">Publish Event</button>`;
        if (['open', 'confirmed', 'active'].includes(event.status)) {
            if (!primaryBtn) primaryBtn = `<button onclick="evtUpdateStatus('${eventId}','completed')" class="evt-host-btn primary">Mark Completed</button>`;
            else dropdownItems += `<button onclick="evtUpdateStatus('${eventId}','completed')">✓ Mark Completed</button>`;
            dropdownItems += `<button onclick="evtCancelEvent('${eventId}')" class="danger">✕ Cancel Event</button>`;
            if (isLlc) dropdownItems += `<button onclick="evtRescheduleEvent('${eventId}')">📅 Reschedule</button>`;
        }
        dropdownItems += `<button onclick="evtDuplicateEvent('${eventId}')">📋 Duplicate Event</button>`;
        if (typeof canManageEvents === 'function' && canManageEvents()) dropdownItems += `<button onclick="evtDeleteEvent('${eventId}')" class="danger">🗑 Delete Event</button>`;
        const manageOnClick = `if(window.EventsManage){window.EventsManage.open('${eventId}',{source:'portal'})}else{this.nextElementSibling.classList.toggle('open')}`;
        return `
            ${_edSectionHead('Host Controls')}
            <div class="evt-host-primary">${primaryBtn}<div class="evt-host-more-wrap"><button class="evt-host-more-btn" onclick="${manageOnClick}" aria-label="Manage event"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;display:inline-block;vertical-align:-3px;margin-right:6px"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Manage event</button><div class="evt-host-dropdown">${dropdownItems}</div></div></div>`;
    }

    function evtBuildDetailWaitlistHtml(ctx) {
        const {
            eventId,
            event,
            rsvp,
            isLlc,
            goingList,
            waitlist,
            myWaitlistEntry,
        } = ctx;

        if (!isLlc || !event.max_participants) return '';

        const isFull = goingList.length >= event.max_participants;
        const canRsvpWl = ['open', 'confirmed', 'active'].includes(event.status);
        const activeWaitlist = waitlist.filter(w => ['waiting', 'offered'].includes(w.status));
        if (!isFull || !canRsvpWl) return '';

        const hasOffer = myWaitlistEntry?.status === 'offered' && myWaitlistEntry.offer_expires_at && new Date(myWaitlistEntry.offer_expires_at) > new Date();
        const isWaiting = myWaitlistEntry?.status === 'waiting';
        let waitlistAction = '';
        if (hasOffer) {
            const expiresStr = new Date(myWaitlistEntry.offer_expires_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            waitlistAction = `
                    <div class="ed-notice ed-notice-highlight">
                        <span class="ed-notice-emoji">🎉</span>
                        <div style="flex:1">
                            <p class="ed-notice-title">A spot opened up for you!</p>
                            <p class="ed-notice-sub">Complete your RSVP by ${expiresStr}</p>
                            <button onclick="evtClaimWaitlistSpot('${eventId}')" class="ed-primary-btn" style="margin-top:10px">Claim Spot — ${formatCurrency(event.rsvp_cost_cents)}</button>
                        </div>
                    </div>`;
        } else if (isWaiting) {
            const pos = activeWaitlist.findIndex(w => w.user_id === evtCurrentUser.id) + 1;
            waitlistAction = `
                    <div class="ed-notice" style="justify-content:space-between">
                        <div><p class="ed-notice-title">You're #${pos} on the waitlist</p><p class="ed-notice-sub">We'll notify you if a spot opens</p></div>
                        <button onclick="evtLeaveWaitlist('${eventId}')" class="ed-link-btn danger">Leave</button>
                    </div>`;
        } else if (!rsvp?.paid) {
            waitlistAction = `<button onclick="evtJoinWaitlist('${eventId}')" class="ed-action-btn">Join Waitlist</button>
                    <p class="ed-hint">No payment required to join the waitlist</p>`;
        }
        return `${_edSectionHead('Waitlist')}<p class="ed-sub-count">${activeWaitlist.length} waiting</p>${waitlistAction}`;
    }

    function evtBuildDetailGraceNoticeHtml(ctx) {
        const { eventId, event, rsvp } = ctx;
        if (!event.rescheduled_at || !event.grace_window_end || new Date(event.grace_window_end) <= new Date()) {
            return '';
        }
        const graceEnd = new Date(event.grace_window_end).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
        return `<div class="ed-notice ed-notice-warn">
            <span class="ed-notice-emoji">📅</span>
            <div>
                <p class="ed-notice-title">This event was rescheduled</p>
                <p class="ed-notice-sub">Request a full refund until <strong>${graceEnd}</strong> if the new date doesn't work.</p>
                ${rsvp?.paid ? `<button onclick="evtRequestGraceRefund('${eventId}')" class="ed-link-btn danger" style="margin-top:8px">Request Full Refund</button>` : ''}
            </div>
        </div>`;
    }

    function evtBuildDetailCostBreakdownHtml(ctx) {
        const { event, isLlc, isHost, costItems } = ctx;
        const showBreakdownToAttendees = event.show_cost_breakdown !== false;
        if (!isLlc || costItems.length === 0 || !(showBreakdownToAttendees || isHost)) {
            return '';
        }

        const CATEGORY_ICONS = { lodging: '🏠', transportation: '🚗', food: '🍕', gear: '🎿', entertainment: '🎭', other: '📦' };
        const included = costItems.filter(i => i.included_in_buyin);
        const oop = costItems.filter(i => !i.included_in_buyin);
        const totalIncluded = included.reduce((s, i) => s + (i.total_cost_cents || 0), 0);
        const totalOop = oop.reduce((s, i) => s + (i.avg_per_person_cents || 0), 0);
        const minP = event.min_participants || event.max_participants || 0;
        const baseBuyIn = minP > 0 ? Math.ceil(totalIncluded / minP) : 0;
        const llcCut = Math.round(baseBuyIn * (event.llc_cut_pct || 0) / 100);
        const finalBuyIn = baseBuyIn + llcCut;
        const lockedLabel = event.cost_breakdown_locked ? ` ${_edPill('🔒 Locked', 'ed-pill-muted')}` : '';
        const hostOnlyLabel = !showBreakdownToAttendees ? ` ${_edPill('Host Only', 'ed-pill-muted')}` : '';

        const itemRows = costItems.map(i => `
            <div class="ed-cost-item">
                <div class="ed-cost-item-left"><span class="ed-cost-item-icon">${CATEGORY_ICONS[i.category] || '📦'}</span><span>${evtEscapeHtml(i.name)}</span></div>
                <div class="ed-cost-item-right">
                    ${i.included_in_buyin
                        ? `<span class="ed-cost-item-amount">${formatCurrency(i.total_cost_cents)}</span>${_edPill('INCLUDED', 'ed-pill-green')}`
                        : `<span class="ed-cost-item-amount" style="color:#8b8b8b">~${formatCurrency(i.avg_per_person_cents)}/pp</span>${_edPill('OOP', 'ed-pill-muted')}`}
                </div>
            </div>`).join('');

        return `
            ${_edSectionHead(`Cost Breakdown${lockedLabel}${hostOnlyLabel}`)}
            <div class="ed-cost-list">${itemRows}</div>
            <div class="ed-cost-summary">
                <div class="ed-cost-line"><span>Total Included</span><span>${formatCurrency(totalIncluded)}</span></div>
                <div class="ed-cost-line"><span>Min Participants</span><span>${minP}</span></div>
                <div class="ed-cost-divider"></div>
                <div class="ed-cost-line ed-cost-line-bold"><span>💡 Suggested Buy-In</span><span>${formatCurrency(finalBuyIn)}/person</span></div>
                <div class="ed-cost-line ed-cost-line-bold"><span>💳 Actual RSVP</span><span>${formatCurrency(event.rsvp_cost_cents)}/person</span></div>
                ${event.llc_cut_pct > 0 ? `<div class="ed-cost-line ed-cost-line-muted"><span>Includes ${event.llc_cut_pct}% LLC contribution</span><span>+${formatCurrency(llcCut)}</span></div>` : ''}
                <div class="ed-cost-line"><span>✈ Est. Out-of-Pocket</span><span>~${formatCurrency(totalOop)}/person</span></div>
                <div class="ed-cost-divider thick"></div>
                <div class="ed-cost-line ed-cost-total"><span>💰 Est. Total/Person</span><span>~${formatCurrency((event.rsvp_cost_cents || finalBuyIn) + totalOop)}</span></div>
            </div>`;
    }

    function evtBuildDetailHeroStatusBadgeHtml(ctx) {
        const { event, isPast } = ctx;
        let badgeLabel = '';
        let badgeCls = '';
        let dotPulse = false;
        if (event.status === 'cancelled') { badgeLabel = 'Cancelled'; badgeCls = 'evt-status-cancelled'; }
        else if (event.status === 'completed' || isPast) { badgeLabel = 'Ended'; badgeCls = 'evt-status-ended'; }
        else if (event.status === 'active') { badgeLabel = 'Live'; badgeCls = 'evt-status-live'; dotPulse = true; }
        else {
            const msUntil = new Date(event.start_date) - new Date();
            const d = Math.floor(msUntil / 86400000);
            const h = Math.floor((msUntil % 86400000) / 3600000);
            const m = Math.floor((msUntil % 3600000) / 60000);
            if (d > 0) badgeLabel = `${d}d ${h}h`;
            else if (h > 0) badgeLabel = `${h}h ${m}m`;
            else badgeLabel = `${m}m`;
            badgeCls = 'evt-status-soon';
            dotPulse = d === 0;
        }
        return `<span class="evt-status-badge ${badgeCls}"><span class="evt-status-dot${dotPulse ? ' pulse' : ''}"></span>${badgeLabel}</span>`;
    }

    function evtBuildDetailTransportNoticeHtml(ctx) {
        const { event, isLlc } = ctx;
        if (!isLlc || event.transportation_enabled === false || !event.transportation_mode) {
            return '';
        }
        const isProvided = event.transportation_mode === 'llc_provides';
        return `<div class="ed-context-row"><span>${isProvided ? '✈️' : '🧳'}</span><div><strong>${isProvided ? 'LLC provides transportation' : 'Self-arranged transportation'}</strong><p>${isProvided ? 'Tickets will appear in documents when available.' : `Members book their own travel${event.transportation_estimate_cents ? ` — est. ~${formatCurrency(event.transportation_estimate_cents)}` : ''}.`}</p></div></div>`;
    }

    function evtBuildDetailLocationNoticeHtml(ctx) {
        const { event, isLlc } = ctx;
        if (!isLlc || !event.location_required) {
            return '';
        }
        return _edNotice('📍', 'Location sharing required', "You'll need to enable location sharing at check-in");
    }

    function evtBuildDetailThresholdHtml(ctx) {
        const { event, isLlc, isHost, goingList } = ctx;
        if (!isLlc || !event.min_participants || isHost) {
            return '';
        }
        const currentGoing = goingList.length;
        const minNeeded = event.min_participants;
        const isMet = currentGoing >= minNeeded;
        const deadlineStr = event.rsvp_deadline ? new Date(event.rsvp_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
        const socialThreshold = Math.min(Math.floor(minNeeded * 0.5), 3);
        const showExactCount = currentGoing >= socialThreshold;
        let socialText = '';
        if (isMet) socialText = `Event confirmed · ${currentGoing} going${event.max_participants ? ' · ' + (event.max_participants - currentGoing) + ' spots left' : ''}`;
        else if (showExactCount) socialText = `${currentGoing} going toward ${minNeeded} needed`;
        else socialText = `Minimum of ${minNeeded} needed to confirm`;
        return `<div class="ed-context-row"><span>${isMet ? '✅' : '⚠️'}</span><div><strong>${isMet ? 'Minimum met' : 'Minimum threshold'}</strong><p>${socialText}${event.rsvp_deadline ? ` · RSVP by ${deadlineStr}` : ''}</p></div></div>`;
    }

    function evtBuildDetailAttendeePreviewHtml(ctx) {
        const { eventId, goingList, guestGoingList, maybeList } = ctx;
        const totalGoing = goingList.length + guestGoingList.length;
        if (totalGoing <= 0 && maybeList.length <= 0) {
            return '';
        }
        const _allAvatars = [
            ...goingList.map(r => {
                const p = r.profiles;
                return { type: 'member', id: p?.id, name: evtEscapeHtml((p?.first_name || '') + ' ' + (p?.last_name || '')).trim(), img: p?.profile_picture_url || null };
            }),
            ...guestGoingList.map(g => ({ type: 'guest', name: evtEscapeHtml(g.guest_name || 'Guest'), img: null }))
        ];
        window._edAvatarData = window._edAvatarData || {};
        window._edAvatarData[eventId] = { avatars: _allAvatars, totalGoing, maybeCount: maybeList.length };
        const countParts = [];
        if (totalGoing > 0) countParts.push(`${totalGoing} going`);
        if (maybeList.length > 0) countParts.push(`${maybeList.length} interested`);
        return `
            <div class="ed-attendee-row" id="edAttendeeRow-${eventId}">
                <div class="ed-avatar-stack" id="edAvatarStack-${eventId}"></div>
                <span class="ed-attendee-count">${countParts.join(' · ')}</span>
            </div>`;
    }

    function evtBuildDetailShareCardHtml(ctx) {
        const { event } = ctx;
        return `
                        <p class="ed-summary-heading">Share This Event</p>
                        <div class="ed-share-row">
                            <button class="ed-share-btn" title="Copy link" onclick="(function(){navigator.clipboard.writeText(window.location.href);const b=this;b.classList.add('ed-share-btn-copied');setTimeout(()=>b.classList.remove('ed-share-btn-copied'),1500)}).call(this)">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                            </button>
                            <a class="ed-share-btn" title="Share on Facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}" target="_blank" rel="noopener">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            </a>
                            <a class="ed-share-btn" title="Share on X" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(event.title)}" target="_blank" rel="noopener">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            </a>
                            <a class="ed-share-btn" title="Share on Instagram" href="https://instagram.com" target="_blank" rel="noopener">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                            </a>
                        </div>`;
    }

    function evtBuildDetailOrganizerHtml(ctx) {
        const { event, isLlc, creatorProfile, cpName, cpInitials, cpBadge } = ctx;
        if (!isLlc && event.created_by) {
            const avatarImg = creatorProfile.profile_picture_url
                ? `<img src="${creatorProfile.profile_picture_url}" class="ed-org-avatar" alt="${evtEscapeHtml(cpName)}">`
                : `<div class="ed-org-avatar ed-org-avatar-fallback">${cpInitials}</div>`;
            const avatarEl = cpBadge
                ? `<div style="position:relative;flex-shrink:0">${avatarImg}<div style="position:absolute;bottom:-2px;right:-2px;transform:scale(.65);transform-origin:bottom right">${cpBadge}</div></div>`
                : avatarImg;
            return `
            <a href="profile.html?id=${creatorProfile.id}" class="ed-org-block">
                <div class="ed-org-block-row">
                    ${avatarEl}
                    <div>
                        <span class="ed-org-block-label">Hosted By</span>
                        <span class="ed-org-name-row"><span class="ed-org-name">${evtEscapeHtml(cpName)}</span><svg class="ed-org-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></span>
                    </div>
                </div>
            </a>
        `;
        }
        if (isLlc) {
            return `
            <div class="ed-org-block ed-org-block-llc">
                <div class="ed-org-block-row">
                    <div class="ed-org-avatar ed-org-avatar-llc">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                    </div>
                    <div>
                        <span class="ed-org-block-label">Hosted By</span>
                        <span class="ed-org-name">LLC</span>
                    </div>
                </div>
            </div>
        `;
        }
        return '';
    }

    function evtBuildDetailTeamHubHtml(ctx) {
        const { eventId, canAccessTeamHub, isHost } = ctx;
        if (!canAccessTeamHub || isHost) return '';
        return `
            <div class="ed-card ed-card-rsvp event-detail-card-tight portal-action-card">
                <p class="ed-summary-heading">Event Team</p>
                <p class="ed-hint">Staff tools for coordination and your own attendance.</p>
                <button type="button" onclick="evtOpenTeamToolsPanel('${eventId}')" class="ed-outline-btn" aria-label="Open event team tools">Team</button>
            </div>`;
    }

    function evtBuildDetailRelatedEventsHtml(ctx) {
        const { eventId } = ctx;
        if (typeof evtAllEvents === 'undefined' || evtAllEvents.length <= 1) return '';
        const upcoming = evtAllEvents.filter(e => e.id !== eventId && e.status !== 'cancelled').slice(0, 4);
        if (!upcoming.length) return '';
        const cards = upcoming.map(e => {
            const d = new Date(e.start_date);
            const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const imgHtml = e.banner_url ? `<img src="${e.banner_url}" alt="" loading="lazy">` : `<div style="height:120px;background:linear-gradient(135deg,#6366f1,#8b5cf6)"></div>`;
            const onclickHandler = e.slug ? `evtNavigateToEvent('${e.slug}')` : `evtOpenDetail('${e.id}')`;
            return `<div class="evt-related-card" onclick="${onclickHandler}">${imgHtml}<div class="evt-related-card-body"><p class="evt-related-card-title">${evtEscapeHtml(e.title)}</p><p class="evt-related-card-meta">${dateLabel}${e.location_nickname ? ' · ' + evtEscapeHtml(e.location_nickname) : ''}</p></div></div>`;
        }).join('');
        return `${_edSectionHead('More Events')}<div class="evt-related-scroll">${cards}</div>`;
    }

    function evtBuildDetailMobileAttendeesHtml(ctx) {
        const { eventId, goingList, guestGoingList, maybeList } = ctx;
        const totalGoing = goingList.length + guestGoingList.length;
        if (totalGoing <= 0 && maybeList.length <= 0) return '';
        return `
                    <div class="ed-mobile-attendees-card">
                        <div class="ed-avatar-stack ed-avatar-stack-sm" id="edAvatarStackMobile-${eventId}"></div>
                        <span class="ed-mobile-att-count">${totalGoing > 0 ? `${totalGoing} going` : ''}${totalGoing > 0 && maybeList.length > 0 ? ' · ' : ''}${maybeList.length > 0 ? `${maybeList.length} interested` : ''}</span>
                    </div>`;
    }

    function evtBuildDetailMobileHostedHtml(ctx) {
        const { isLlc, creatorProfile, cpName, cpInitials, cpBadge } = ctx;
        if (!creatorProfile && !isLlc) return '';
        return `
                    <div class="ed-mobile-hosted-card" ${creatorProfile ? `onclick="window.location.href='profile.html?id=${creatorProfile.id}'" style="cursor:pointer"` : ''}>
                        <div class="ed-mh-avatar-wrap" style="position:relative;flex-shrink:0">
                            ${creatorProfile?.profile_picture_url
                                ? `<img src="${creatorProfile.profile_picture_url}" class="ed-mh-avatar" alt="${evtEscapeHtml(cpName)}">`
                                : `<div class="ed-mh-avatar ed-mh-avatar-fallback">${isLlc ? `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>` : cpInitials}</div>`
                            }
                            ${cpBadge ? cpBadge : ''}
                        </div>
                        <div class="ed-mh-body">
                            <span class="ed-mh-label">Hosted by</span>
                            <span class="ed-mh-name">${isLlc ? 'Justice McNeal LLC' : evtEscapeHtml(cpName)}</span>
                            ${!isLlc ? `<span class="ed-mh-sub">Organizer of this event</span>` : ''}
                        </div>
                        ${creatorProfile ? `<svg class="ed-mh-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>` : ''}
                    </div>`;
    }

    function evtBuildDetailPageHeaderActionsHtml(ctx) {
        const { eventId, event } = ctx;
        return `
                    <button onclick="evtCopyShareUrl('${event.slug}')" class="ed-page-header-btn" aria-label="Share event">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                        <span class="ed-page-header-btn-label">Share</span>
                    </button>
                    <button onclick="event.stopPropagation();evtDownloadIcs('${eventId}')" class="ed-page-header-btn ed-page-header-btn-cal" aria-label="Add to calendar">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <span class="ed-page-header-btn-label">Add to Calendar</span>
                    </button>
                    <button onclick="event.stopPropagation();evtDownloadIcs('${eventId}')" class="ed-page-header-btn ed-page-header-btn-bookmark" aria-label="Save event">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                    </button>`;
    }

    function evtBuildDetailAttendeeBreakdownHtml(ctx) {
        const { isHost, goingList, maybeList, checkins, checkinCount } = ctx;
        if (!isHost) return '';

        function buildPersonRow(p) {
            const initials = ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase() || '?';
            const avatar = p?.profile_picture_url
                ? `<img src="${p.profile_picture_url}" class="w-7 h-7 rounded-full object-cover" alt="">`
                : `<div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold">${initials}</div>`;
            return `<div class="flex items-center gap-2">${avatar}<span class="text-sm text-gray-700">${evtEscapeHtml(p?.first_name || '')} ${evtEscapeHtml(p?.last_name || '')}</span></div>`;
        }

        const checkinRows = (checkins || []).map(c => buildPersonRow(c.profiles)).join('') || `<p class="text-xs text-gray-400 italic ml-6">None</p>`;

        return `
            <div>
                ${_edSectionHead('Attendee Breakdown')}
                <div class="mb-3">
                    <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">✅</span><span class="text-xs font-bold text-emerald-700 uppercase tracking-wide">Going (${goingList.length})</span></div>
                    <div class="space-y-1.5 ml-6">${goingList.length ? goingList.map(r => buildPersonRow(r.profiles)).join('') : '<p class="text-xs text-gray-400 italic">None</p>'}</div>
                </div>
                <div class="mb-3">
                    <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">❤️</span><span class="text-xs font-bold text-pink-700 uppercase tracking-wide">Interested (${maybeList.length})</span></div>
                    <div class="space-y-1.5 ml-6">${maybeList.length ? maybeList.map(r => buildPersonRow(r.profiles)).join('') : '<p class="text-xs text-gray-400 italic">None</p>'}</div>
                </div>
                <div>
                    <div class="flex items-center gap-2 mb-1.5"><span class="text-sm">📍</span><span class="text-xs font-bold text-violet-700 uppercase tracking-wide">Checked In (${checkinCount || 0})</span></div>
                    <div class="space-y-1.5 ml-6">${checkinRows}</div>
                </div>
            </div>`;
    }

    window.evtBuildDetailRsvpSectionHtml = evtBuildDetailRsvpSectionHtml;
    window.evtBuildDetailRaffleSectionHtml = evtBuildDetailRaffleSectionHtml;
    window.evtBuildDetailHostControlsHtml = evtBuildDetailHostControlsHtml;
    window.evtBuildDetailWaitlistHtml = evtBuildDetailWaitlistHtml;
    window.evtBuildDetailGraceNoticeHtml = evtBuildDetailGraceNoticeHtml;
    window.evtBuildDetailCostBreakdownHtml = evtBuildDetailCostBreakdownHtml;
    window.evtBuildDetailAttendeeBreakdownHtml = evtBuildDetailAttendeeBreakdownHtml;
    window.evtBuildDetailHeroStatusBadgeHtml = evtBuildDetailHeroStatusBadgeHtml;
    window.evtBuildDetailTransportNoticeHtml = evtBuildDetailTransportNoticeHtml;
    window.evtBuildDetailLocationNoticeHtml = evtBuildDetailLocationNoticeHtml;
    window.evtBuildDetailThresholdHtml = evtBuildDetailThresholdHtml;
    window.evtBuildDetailAttendeePreviewHtml = evtBuildDetailAttendeePreviewHtml;
    window.evtBuildDetailShareCardHtml = evtBuildDetailShareCardHtml;
    window.evtBuildDetailOrganizerHtml = evtBuildDetailOrganizerHtml;
    window.evtBuildDetailTeamHubHtml = evtBuildDetailTeamHubHtml;
    window.evtBuildDetailRelatedEventsHtml = evtBuildDetailRelatedEventsHtml;
    window.evtBuildDetailMobileAttendeesHtml = evtBuildDetailMobileAttendeesHtml;
    window.evtBuildDetailMobileHostedHtml = evtBuildDetailMobileHostedHtml;
    window.evtBuildDetailPageHeaderActionsHtml = evtBuildDetailPageHeaderActionsHtml;

    window.PortalEvents.detail.sections = {
        buildRsvpSectionHtml: evtBuildDetailRsvpSectionHtml,
        buildRaffleSectionHtml: evtBuildDetailRaffleSectionHtml,
        buildHostControlsHtml: evtBuildDetailHostControlsHtml,
        buildWaitlistHtml: evtBuildDetailWaitlistHtml,
        buildGraceNoticeHtml: evtBuildDetailGraceNoticeHtml,
        buildCostBreakdownHtml: evtBuildDetailCostBreakdownHtml,
        buildAttendeeBreakdownHtml: evtBuildDetailAttendeeBreakdownHtml,
        buildHeroStatusBadgeHtml: evtBuildDetailHeroStatusBadgeHtml,
        buildTransportNoticeHtml: evtBuildDetailTransportNoticeHtml,
        buildLocationNoticeHtml: evtBuildDetailLocationNoticeHtml,
        buildThresholdHtml: evtBuildDetailThresholdHtml,
        buildAttendeePreviewHtml: evtBuildDetailAttendeePreviewHtml,
        buildShareCardHtml: evtBuildDetailShareCardHtml,
        buildOrganizerHtml: evtBuildDetailOrganizerHtml,
        buildTeamHubHtml: evtBuildDetailTeamHubHtml,
        buildRelatedEventsHtml: evtBuildDetailRelatedEventsHtml,
        buildMobileAttendeesHtml: evtBuildDetailMobileAttendeesHtml,
        buildMobileHostedHtml: evtBuildDetailMobileHostedHtml,
        buildPageHeaderActionsHtml: evtBuildDetailPageHeaderActionsHtml,
    };
})();

;/* ===== js/portal/events/detail/post-render.js ===== */
/* ════════════════════════════════════════════════════════════
   Portal Events — Detail post-render hooks (Phase 5H.6.1–5H.6.4)
   Classic IIFE; loads after detail/sections.js, before detail.js.
   Avatar paint, comments, host dropdown, ticket QR canvas, inline Leaflet maps,
   sidebar countdown, Team Tools context, bottom nav init.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.detail = window.PortalEvents.detail || {};

    function _buildAvatarHtml(avatars, overflow, sm) {
        const cls = sm ? 'ed-avatar ed-avatar-sm' : 'ed-avatar';
        return avatars.map(a => {
            if (a.img) {
                return `<div class="${cls}" ${a.id ? `onclick="window.location.href='profile.html?id=${a.id}'" style="cursor:pointer"` : ''} title="${a.name}" role="button"><img src="${a.img}" alt=""></div>`;
            }
            const ini = a.name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
            const gc = a.type === 'guest' ? ' ed-avatar-guest' : '';
            return `<div class="${cls}${gc}" title="${a.name}"><span>${ini}</span></div>`;
        }).join('') + (overflow > 0 ? `<div class="${cls} ed-avatar-overflow"><span>+${overflow}</span></div>` : '');
    }

    function _paintAttendeeAvatars(eventId) {
        setTimeout(() => {
            const row = document.getElementById(`edAttendeeRow-${eventId}`);
            const stack = document.getElementById(`edAvatarStack-${eventId}`);
            const data = window._edAvatarData?.[eventId];
            if (!row || !stack || !data) return;

            function paintAvatars() {
                const countEl = row.querySelector('.ed-attendee-count');
                const countW = countEl ? countEl.offsetWidth + 12 : 90;
                const available = row.offsetWidth - countW;
                const maxAvatars = Math.min(5, available > 0 ? Math.max(1, Math.floor((available - 40) / 32) + 1) : 3);
                const shown = data.avatars.slice(0, maxAvatars);
                stack.innerHTML = _buildAvatarHtml(shown, data.avatars.length - shown.length, false);
            }
            paintAvatars();
            if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(paintAvatars).observe(row);
            }

            const mobileStack = document.getElementById(`edAvatarStackMobile-${eventId}`);
            if (mobileStack && data) {
                const shown = data.avatars.slice(0, 4);
                mobileStack.innerHTML = _buildAvatarHtml(shown, data.avatars.length - shown.length, true);
            }
        }, 0);
    }

    function _bindHostDropdownOutsideClick() {
        document.addEventListener('click', (e) => {
            const dd = document.querySelector('.evt-host-dropdown.open');
            if (dd && !dd.parentElement.contains(e.target)) dd.classList.remove('open');
        }, { once: false });
    }

    function evtRunDetailPostRenderBasics(ctx) {
        const eventId = ctx && ctx.eventId;
        if (!eventId) return;

        if (typeof window.evtLoadComments === 'function') {
            window.evtLoadComments(eventId);
        }

        _bindHostDropdownOutsideClick();
        _paintAttendeeAvatars(eventId);
    }

    async function evtRenderDetailQrCanvases(ctx) {
        if (!ctx || !ctx.event) return;
        const { event, rsvp, memberGoing } = ctx;
        if (!memberGoing || event.checkin_mode !== 'attendee_ticket') return;
        if (!rsvp || !rsvp.qr_token) return;

        const canvas = document.getElementById('myTicketQR');
        if (!canvas) return;

        try {
            const QRCode = typeof window.evtEnsureQRCode === 'function'
                ? await window.evtEnsureQRCode()
                : window.QRCode;
            if (!QRCode) return;
            QRCode.toCanvas(
                canvas,
                `${window.location.origin}/events/?e=${event.slug}&ticket=${rsvp.qr_token}`,
                { width: 180, margin: 2 }
            );
        } catch (err) {
            console.warn('Ticket QR render failed:', err);
        }
    }

    async function evtInitDetailInlineMaps(ctx) {
        if (!ctx || !ctx.event) return;
        const { event, showLocation } = ctx;
        if (!showLocation || !event.location_lat || !event.location_lng) return;

        try {
            if (typeof window.evtEnsureLeaflet === 'function') await window.evtEnsureLeaflet();
        } catch (err) {
            console.warn('Inline map library failed:', err);
            return;
        }
        if (typeof L === 'undefined') return;

        const lat = event.location_lat;
        const lng = event.location_lng;
        const locationText = event.location_text || '';
        const escapeHtml = typeof window.evtEscapeHtml === 'function' ? window.evtEscapeHtml : (s) => String(s);

        function initMap(id) {
            const mapEl = document.getElementById(id);
            if (!mapEl) return;
            const dMap = L.map(id, {
                zoomControl: false,
                attributionControl: false,
                dragging: true,
                scrollWheelZoom: false,
                tap: true,
            }).setView([lat, lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(dMap);
            L.marker([lat, lng]).addTo(dMap);
            setTimeout(() => dMap.invalidateSize(), 100);
            dMap.on('click', () => {
                if (typeof window.evtOpenFullscreenMap === 'function') {
                    window.evtOpenFullscreenMap(lat, lng, escapeHtml(locationText));
                }
            });
        }

        initMap('detailEventMap');
        initMap('detailEventMapMobile');
    }

    function evtRunDetailPostRenderUi(ctx) {
        if (!ctx || !ctx.event || !ctx.eventId) return;

        const {
            event,
            eventId,
            isPast,
            isClosed,
            rsvp,
            myRaffleEntry,
            entriesClosed,
            eventIsFull,
            isHost,
            canAccessTeamHub,
            canCreateTeamChat,
        } = ctx;

        if (!isPast && !isClosed) {
            const _cdTarget = new Date(event.start_date).getTime();
            const _cdEls = ['edCdDays', 'edCdHours', 'edCdMins', 'edCdSecs'].map((id) => document.getElementById(id));
            const _cdCard = document.getElementById('edCountdownCard');
            function _tickCd() {
                const diff = _cdTarget - Date.now();
                if (!_cdEls[0] || diff < 0) { if (_cdCard) _cdCard.style.display = 'none'; return; }
                const d = Math.floor(diff / 86400000);
                const h = Math.floor((diff % 86400000) / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                _cdEls[0].textContent = String(d).padStart(2, '0');
                _cdEls[1].textContent = String(h).padStart(2, '0');
                _cdEls[2].textContent = String(m).padStart(2, '0');
                _cdEls[3].textContent = String(s).padStart(2, '0');
            }
            _tickCd();
            const _cdTimer = setInterval(_tickCd, 1000);
            const _cdCleanup = () => clearInterval(_cdTimer);
            window.addEventListener('popstate', _cdCleanup, { once: true });
            document.addEventListener('evtDetailUnmount', _cdCleanup, { once: true });
        }

        window.__evtTeamToolsCtx = {
            eventId,
            myRaffleEntry,
            entriesClosed,
            eventIsFull,
            canManageEvent: isHost,
            canAccessTeamHub,
            canCreateTeamChat,
        };
        if (typeof window.evtInitBottomNav === 'function') {
            window.evtInitBottomNav(event, eventId, rsvp, myRaffleEntry, entriesClosed, eventIsFull, isHost, canAccessTeamHub);
        }
    }

    window.PortalEvents.detail.postRender = {
        runBasics: evtRunDetailPostRenderBasics,
        renderQrCanvases: evtRenderDetailQrCanvases,
        initInlineMaps: evtInitDetailInlineMaps,
        runUi: evtRunDetailPostRenderUi,
    };

    window.evtRunDetailPostRenderBasics = evtRunDetailPostRenderBasics;
    window.evtRenderDetailQrCanvases = evtRenderDetailQrCanvases;
    window.evtInitDetailInlineMaps = evtInitDetailInlineMaps;
    window.evtRunDetailPostRenderUi = evtRunDetailPostRenderUi;
})();

;/* ===== js/portal/events/detail/template.js ===== */
/* ════════════════════════════════════════════════════════════
   Portal Events — Detail page template shell (Phase 5I.1)
   Classic IIFE; loads after detail/post-render.js, before detail.js.
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.detail = window.PortalEvents.detail || {};

    function evtBuildDetailTemplate(templateCtx) {
        const _edCard = window.evtEdCard;
        const _edSectionHead = window.evtEdSectionHead;
        const evtEscapeHtml = window.evtEscapeHtml;
        const {
            event,
            eventId,
            start,
            timeStr,
            tc,
            cpName,
            showTime,
            showLocation,
            showNotes,
            isPast,
            isClosed,
            deadlinePassed,
            rsvpEnabled,
            bannerBg,
            heroStatusBadgeHtml,
            pageHeaderActionsHtml,
            mobileAttendeesHtml,
            mobileHostedHtml,
            descHtml,
            descIsLong,
            eventContextHtml,
            attendeePreviewHtml,
            organizerHtml,
            waitlistHtml,
            thresholdHtml,
            costBreakdownHtml,
            locationReqHtml,
            graceHtml,
            raffleHtml,
            mapHtml,
            competitionHtml,
            scrapbookHtml,
            relatedHtml,
            rsvpButtons,
            teamHubCardHtml,
            qrHtml,
            documentsHtml,
            shareCardHtml,
        } = templateCtx;

        return `
        <!-- ─── Detail Page Header ─── -->
        <div class="ed-page-header">
            <div class="ed-page-header-inner">
                <button onclick="evtNavigateToList()" class="ed-page-header-back" aria-label="Back to events">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                    <span class="ed-page-header-back-label">Back to Events</span>
                </button>
                <div class="ed-page-header-title">
                    <h2>Event Details</h2>
                    <p class="ed-page-header-sub">Discover and join events in your community.</p>
                </div>
                <div class="ed-page-header-actions">
                    ${pageHeaderActionsHtml}
                </div>
            </div>
        </div>

        <!-- ─── Two-column layout: hero+content LEFT, summary sidebar RIGHT ─── -->
        <div class="ed-content event-detail-shell portal-event-shell">
            <div class="ed-detail-body event-detail-grid portal-event-grid">
                <div class="ed-main event-detail-main portal-event-story">

                <!-- ─── Immersive Hero ─── -->
                <div class="ed-hero" style="${bannerBg}" ${event.banner_url ? `onclick="evtOpenLightbox('${event.banner_url}')"` : ''} role="img" aria-label="Event banner">
                    <div class="ed-hero-scrim"></div>
                    <div class="ed-hero-nav">
                        ${heroStatusBadgeHtml}
                        <div class="ed-hero-pill-row">
                            <button onclick="event.stopPropagation();evtNavigateToList()" class="ed-hero-pill evt-hero-back-btn" title="Back" aria-label="Back to events">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="ed-hero-bottom-content">
                        <h1 class="ed-hero-title">${evtEscapeHtml(event.title)}</h1>
                        <p class="ed-hero-subtitle">${cpName ? `Hosted by ${evtEscapeHtml(cpName)}` : evtEscapeHtml(tc.label)}${event.category ? ` &bull; ${evtEscapeHtml((event.category || '').replace(/_/g,' '))}` : ''}</p>
                        <div class="ed-hero-info-bar">
                            <div class="ed-hero-info-item">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                                <div>
                                    <span class="ed-hero-info-main">${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                    <span class="ed-hero-info-sub">${start.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                </div>
                            </div>
                            ${showTime ? `<div class="ed-hero-info-item">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                <div>
                                    <span class="ed-hero-info-main">${timeStr}</span>
                                    <span class="ed-hero-info-sub">Start time</span>
                                </div>
                            </div>` : ''}
                            ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-hero-info-item">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                <div>
                                    <span class="ed-hero-info-main">${evtEscapeHtml(event.location_nickname || event.location_text || '')}</span>
                                    <span class="ed-hero-info-sub">${evtEscapeHtml(event.location_text && event.location_nickname ? event.location_text : '')}</span>
                                </div>
                            </div>` : ''}
                        </div>
                    </div>
                </div><!-- /ed-hero -->

                <div class="ed-content-cards portal-event-sections">
                    <!-- Quick-Info Bar (mobile only: date / time / location) -->
                    <div class="ed-qi-bar">
                        <div class="ed-qi-col">
                            <svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            <span class="ed-qi-main">${start.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                            <span class="ed-qi-sub">${start.toLocaleDateString('en-US',{weekday:'short'})}</span>
                        </div>
                        ${showTime ? `<div class="ed-qi-col">
                            <svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span class="ed-qi-main">${timeStr}</span>
                            <span class="ed-qi-sub">Start time</span>
                        </div>` : ''}
                        ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-qi-col${event.location_lat && event.location_lng ? ' ed-qi-col-loc' : ''}"${event.location_lat && event.location_lng ? ` onclick="evtOpenFullscreenMap(${event.location_lat},${event.location_lng})"` : ''}>
                            <svg class="ed-qi-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            <span class="ed-qi-main">${evtEscapeHtml(event.location_nickname || event.location_text || '')}</span>
                            <span class="ed-qi-sub">${event.location_nickname && event.location_text ? evtEscapeHtml(event.location_text) : 'Location'}</span>
                        </div>` : ''}
                    </div>
                    <!-- Mobile Map Card (S5 — hidden on desktop) -->
                    ${showLocation && event.location_lat && event.location_lng ? `
                    <div class="ed-mobile-map-card">
                        <div id="detailEventMapMobile" class="ed-mobile-map"></div>
                        <div class="ed-map-overlay ed-mobile-map-overlay">
                            <span class="ed-map-overlay-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
                            <div class="ed-map-overlay-body">
                                <p class="ed-map-overlay-name">${evtEscapeHtml(event.location_nickname || event.location_text || 'Venue')}</p>
                                ${event.location_nickname && event.location_text ? `<p class="ed-map-overlay-addr">${evtEscapeHtml(event.location_text)}</p>` : ''}
                                <a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'https://maps.apple.com/?daddr=' : 'https://www.google.com/maps/dir/?api=1&destination='}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener" class="ed-map-overlay-link">View on Maps ↗</a>
                            </div>
                        </div>
                    </div>` : ''}
                    <!-- Mobile Attendees Card (S7) -->
                    ${mobileAttendeesHtml}
                    <!-- Mobile Hosted By Card (S8) -->
                    ${mobileHostedHtml}
                    <!-- About Card -->
                    <div class="ed-about-grid event-detail-card">
                        <div class="ed-about-left">
                            <div class="ed-about-desc-col">
                                ${deadlinePassed && !isClosed && !isPast ? '<div class="ed-deadline-banner" style="margin-bottom:14px">🔒 RSVP deadline passed</div>' : ''}
                                <p class="ed-about-heading">About This Event</p>
                                <div class="ed-desc${descIsLong ? ' ed-desc-collapsed' : ''}" id="evtDescWrap">${descHtml}</div>
                                ${descIsLong ? '<button class="ed-read-more" onclick="var w=document.getElementById(\'evtDescWrap\'),c=w.classList.toggle(\'ed-desc-collapsed\');this.textContent=c?\'Read more\':\'Show less\'">Read more</button>' : ''}
                                ${eventContextHtml ? `<div class="ed-context-list">${eventContextHtml}</div>` : ''}
                            </div>
                            ${attendeePreviewHtml ? `
                            <div class="ed-about-desc-col">
                                <p class="ed-card-heading" style="margin-bottom:12px">Attendees</p>
                                ${attendeePreviewHtml}
                            </div>` : ''}
                        </div>
                        ${(organizerHtml || (showLocation && event.location_lat && event.location_lng)) ? `
                        <div class="ed-about-right">
                            ${organizerHtml ? `<div class="ed-about-org-col">${organizerHtml}</div>` : ''}
                            ${showLocation && event.location_lat && event.location_lng ? `
                            <div class="ed-about-map-col">
                                <div class="ed-map-wrap">
                                    <div id="detailEventMap" class="ed-map"></div>
                                    <div class="ed-map-overlay">
                                        <span class="ed-map-overlay-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg></span>
                                        <div class="ed-map-overlay-body">
                                            <p class="ed-map-overlay-name">${evtEscapeHtml(event.location_nickname || event.location_text || 'Venue')}</p>
                                            ${event.location_nickname && event.location_text ? `<p class="ed-map-overlay-addr">${evtEscapeHtml(event.location_text)}</p>` : ''}
                                            <a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'https://maps.apple.com/?daddr=' : 'https://www.google.com/maps/dir/?api=1&destination='}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener" class="ed-map-overlay-link">View on Maps ↗</a>
                                        </div>
                                    </div>
                                </div>
                            </div>` : ''}
                        </div>` : ''}
                    </div>

            <!-- Gated Notes Card -->
            ${showNotes && event.gated_notes ? `<div class="ed-card event-detail-card">${_edSectionHead('Attendee Details')}<p class="ed-body-text whitespace-pre-line">${evtEscapeHtml(event.gated_notes)}</p></div>` : ''}

            <!-- Attendees Card moved into about grid right column -->

            <!-- Dynamic sections (notices, QR, cost, raffle…) -->
            <!-- scannerBtn + venueQrHtml moved into Manage Event sheet -->
            ${[waitlistHtml, thresholdHtml, costBreakdownHtml, locationReqHtml, graceHtml, raffleHtml, mapHtml, competitionHtml, scrapbookHtml].filter(Boolean).map(s => _edCard(s, 'event-detail-card')).join('')}

            <!-- Stats & Breakdown moved into Manage Event sheet (EventsManage) -->

            <!-- Comments -->
            <div class="ed-card event-detail-card" id="portalCommentsSection" role="region" aria-label="Discussion">
                ${_edSectionHead('Discussion')}
                <div id="portalCommentsList" class="ed-comments-list"></div>
                <div class="ed-comment-input-row">
                    <div class="ed-comment-self-avatar" id="portalCommentSelfAvatar"></div>
                    <div class="ed-comment-input-wrap">
                        <input type="text" id="portalCommentInput" placeholder="Add a comment…" class="ed-comment-input" aria-label="Write a comment">
                        <button onclick="evtPostComment('${eventId}')" class="ed-comment-post" aria-label="Post comment">Post</button>
                    </div>
                </div>
            </div>

            <!-- Related Events -->
            ${relatedHtml ? _edCard(relatedHtml, 'event-detail-card') : ''}

            <!-- Host Controls inline card removed — opens via Manage Event sheet -->

            ${event.cancellation_note ? _edCard(`<div class="ed-cancel-banner"><p class="ed-cancel-title">Cancellation Note</p><p class="ed-cancel-text">${evtEscapeHtml(event.cancellation_note)}</p></div>`, 'event-detail-card') : ''}

                    <div style="height:80px" class="lg:hidden"></div>
                    <div style="height:32px" class="hidden lg:block"></div>
                </div><!-- /ed-content-cards -->
                </div><!-- /ed-main -->

                <!-- ─── Event Summary Sidebar ─── -->
                <div class="ed-sidebar event-detail-rail portal-event-rail">
                    <div class="ed-card ed-summary-card event-detail-card-tight portal-summary-card">
                        <p class="ed-summary-heading">Event Summary</p>
                        <div class="ed-summary-header-row">
                            ${event.banner_url ? `<img src="${event.banner_url}" class="ed-summary-thumb" alt="" loading="eager" decoding="async">` : `<div class="ed-summary-thumb ed-summary-thumb-placeholder"></div>`}
                            <div class="ed-summary-header-text">
                                <p class="ed-summary-title">${evtEscapeHtml(event.title)}</p>
                                <p class="ed-summary-sub">${cpName ? `Hosted by ${evtEscapeHtml(cpName)}` : evtEscapeHtml(tc.label)}</p>
                                ${event.category ? `<p class="ed-summary-cat">${evtEscapeHtml((event.category||'').replace(/_/g,' '))}</p>` : ''}
                            </div>
                        </div>
                        <hr class="ed-divider" style="margin:14px 0">
                        <div class="ed-summary-rows">
                            <div class="ed-summary-row">
                                <div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg></div>
                                <div>
                                    <span class="ed-summary-main">${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                    <span class="ed-summary-sub2">${start.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                                </div>
                            </div>
                            ${showTime ? `<div class="ed-summary-row">
                                <div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                                <div>
                                    <span class="ed-summary-main">${timeStr}</span>
                                    <span class="ed-summary-sub2">Start time</span>
                                </div>
                            </div>` : ''}
                            ${showLocation && (event.location_nickname || event.location_text) ? `<div class="ed-summary-row">
                                <div class="ed-summary-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"/></svg></div>
                                <div>
                                    <span class="ed-summary-main">${evtEscapeHtml(event.location_nickname || event.location_text || '')}</span>
                                    ${event.location_text && event.location_nickname ? `<span class="ed-summary-sub2">${evtEscapeHtml(event.location_text)}</span>` : ''}
                                    ${event.location_text ? `<a href="${/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'https://maps.apple.com/?daddr=' : 'https://www.google.com/maps/dir/?api=1&destination='}${encodeURIComponent(event.location_text)}" target="_blank" rel="noopener" class="ed-maps-link">View on Maps ↗</a>` : ''}
                                </div>
                            </div>` : ''}
                        </div>
                    </div>
                    ${rsvpButtons && rsvpEnabled ? `
                    <div class="ed-card ed-card-rsvp event-detail-card-tight portal-action-card">
                        <p class="ed-summary-heading">Your RSVP</p>
                        ${rsvpButtons}
                    </div>` : ''}
                    ${teamHubCardHtml}
                    ${qrHtml ? `
                    <div class="ed-card event-detail-card-tight portal-action-card portal-ticket-card">
                        ${qrHtml}
                    </div>` : ''}
                    ${documentsHtml ? `
                    <div class="ed-card event-detail-card-tight portal-action-card portal-docs-card">
                        ${documentsHtml}
                    </div>` : ''}
                    ${!isPast && !isClosed ? `
                    <div class="ed-card ed-countdown-card event-detail-card-tight portal-utility-card" id="edCountdownCard">
                        <p class="ed-summary-heading">Starts In</p>
                        <div class="ed-countdown-grid">
                            <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdDays">--</span><span class="ed-countdown-lbl">Days</span></div>
                            <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdHours">--</span><span class="ed-countdown-lbl">Hours</span></div>
                            <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdMins">--</span><span class="ed-countdown-lbl">Mins</span></div>
                            <div class="ed-countdown-cell"><span class="ed-countdown-num" id="edCdSecs">--</span><span class="ed-countdown-lbl">Secs</span></div>
                        </div>
                    </div>` : ''}
                    <div class="ed-card ed-share-card event-detail-card-tight portal-utility-card">
                        ${shareCardHtml}
                    </div>
            </div><!-- /ed-detail-body -->
        </div>
`;
    }

    window.PortalEvents.detail.template = {
        build: evtBuildDetailTemplate,
    };

    window.evtBuildDetailTemplate = evtBuildDetailTemplate;
})();

;/* ===== js/portal/events/detail.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Detail Page View  (M2 refactor)
// Renders the full event detail into #eventsDetailView
// Dark-themed immersive hero → light content cards below
//
// M2 changes:
//   • Wrapped in IIFE; registers PortalEvents.detail namespace + sub-registry.
//   • Dead hero-collapse scroll code removed — page scrolls naturally.
//   • Sticky title row via CSS (no JS scroll listener).
//   • Host "⋯ More" → "Manage event" trigger (M3 will swap the dropdown for a sheet).
//   • All legacy evt* globals preserved on window for unmodified consumers.
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ── PortalEvents.detail namespace + lightweight registry ──
    window.PortalEvents = window.PortalEvents || {};
    const detail = window.PortalEvents.detail = window.PortalEvents.detail || {};
    detail._registry = detail._registry || {};
    detail.register = function (name, fn) { detail._registry[name] = fn; };
    detail.get = function (name) { return detail._registry[name]; };

// Presentation helpers — Phase 5D.1: js/portal/events/detail/presentation.js
// Fragment helpers — Phase 5F-prep: js/portal/events/detail/fragments.js
// Detail data context — Phase 5H.1: js/portal/events/detail/data.js
// Detail section HTML — Phase 5H.2–5H.5: js/portal/events/detail/sections.js
// Detail post-render — Phase 5H.6.1–5H.6.4: js/portal/events/detail/post-render.js
// Detail template shell — Phase 5I.1: js/portal/events/detail/template.js

// Raffle render helpers — Phase 5D.2: js/portal/events/detail/raffle-render.js

// ═══════════════════════════════════════════════════════════
// Main render — evtOpenDetail
// ═══════════════════════════════════════════════════════════

async function evtOpenDetail(eventId) {
    const ctx = await window.evtLoadDetailContext(eventId);
    if (!ctx) return;

    const {
        event,
        rsvp,
        start,
        dateStr,
        timeStr,
        endTimeStr,
        tc,
        isLlc,
        isComp,
        goingList,
        maybeList,
        guestGoingList,
        checkins,
        checkinCount,
        costItems,
        waitlist,
        myWaitlistEntry,
        raffleEntryCount,
        myRaffleEntry,
        raffleWinners,
        isCreator,
        canManageEvent,
        canAccessTeamHub,
        isHost,
        canCreateTeamChat,
        creatorProfile,
        cpName,
        cpInitials,
        cpBadge,
        cpTitle,
        memberGoing,
        hasRsvp,
        documentsHtml,
        mapHtml,
        competitionHtml,
        scrapbookHtml,
        showTime,
        showLocation,
        showNotes,
        isClosed,
        isPast,
        deadlinePassed,
        entriesClosed,
        rsvpEnabled,
        canRsvp,
        eventIsFull,
    } = ctx;

    // ═══════════════════════════════════════════════════════
    // Build visual sections
    // ═══════════════════════════════════════════════════════

    const heroStatusBadgeHtml = window.evtBuildDetailHeroStatusBadgeHtml(ctx);

    // ── Banner bg ────────────────────────────────────────
    const bannerBg = event.banner_url
        ? `background-image:url('${event.banner_url}');background-size:cover;background-position:center;`
        : `background:linear-gradient(135deg, #312e81 0%, #6d28d9 50%, #a855f7 100%);`;

    const transportContextHtml = window.evtBuildDetailTransportNoticeHtml(ctx);
    const locationReqHtml = window.evtBuildDetailLocationNoticeHtml(ctx);

    // ── QR Code for attendee ticket ──────────────────────
    let qrHtml = '';
    let myCheckin = null;
    const checkinEnabled = event.checkin_enabled !== false;
    if (checkinEnabled && memberGoing && event.checkin_mode === 'attendee_ticket') {
        const { data: ci } = await supabaseClient
            .from('event_checkins')
            .select('checked_in_at')
            .eq('event_id', eventId)
            .eq('user_id', evtCurrentUser.id)
            .maybeSingle();
        myCheckin = ci;
        const checkedInTime = myCheckin ? new Date(myCheckin.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
        const checkedInDate = myCheckin ? new Date(myCheckin.checked_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

        qrHtml = `
            <div class="ed-qr-wrap">
                <div class="ed-qr-header">${myCheckin ? '✅ Checked In' : '🎫 Your Event Ticket'}</div>
                <div style="position:relative;display:inline-block">
                    <canvas id="myTicketQR" style="display:block;margin:0 auto;border-radius:12px;${myCheckin ? 'opacity:.25' : ''}"></canvas>
                    ${myCheckin ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                        <div style="width:56px;height:56px;border-radius:50%;background:#10b981;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(16,185,129,.4)">
                            <svg style="width:28px;height:28px;color:#fff" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                        </div>
                    </div>` : ''}
                </div>
                <p class="ed-qr-hint">${myCheckin ? `Scanned at ${checkedInTime} · ${checkedInDate}` : 'Show this QR code at check-in'}</p>
            </div>`;
    }

    let costBreakdownHtml = window.evtBuildDetailCostBreakdownHtml(ctx);

    const thresholdContextHtml = window.evtBuildDetailThresholdHtml(ctx);
    const eventContextHtml = [thresholdContextHtml, transportContextHtml].filter(Boolean).join('');

    const waitlistHtml = window.evtBuildDetailWaitlistHtml(ctx);
    const graceHtml = window.evtBuildDetailGraceNoticeHtml(ctx);

    const rsvpButtons = window.evtBuildDetailRsvpSectionHtml(ctx);
    const raffleHtml = window.evtBuildDetailRaffleSectionHtml(ctx);
    const attendeePreviewHtml = window.evtBuildDetailAttendeePreviewHtml(ctx);
    const shareCardHtml = window.evtBuildDetailShareCardHtml(ctx);
    const organizerHtml = window.evtBuildDetailOrganizerHtml(ctx);
    const teamHubCardHtml = window.evtBuildDetailTeamHubHtml(ctx);
    const relatedHtml = window.evtBuildDetailRelatedEventsHtml(ctx);
    const mobileAttendeesHtml = window.evtBuildDetailMobileAttendeesHtml(ctx);
    const mobileHostedHtml = window.evtBuildDetailMobileHostedHtml(ctx);
    const pageHeaderActionsHtml = window.evtBuildDetailPageHeaderActionsHtml(ctx);

    // ── Description ──────────────────────────────────────
    const rawDesc = event.description || '';
    const descHtml = rawDesc ? window.evtMiniMarkdown(rawDesc) : '<span class="ed-no-desc">No details yet — check back closer to the event.</span>';
    const descIsLong = rawDesc.length > 500;

    // ── Collapsible cost wrapper ─────────────────────────
    if (costBreakdownHtml && event.rsvp_cost_cents) {
        costBreakdownHtml = `
            <div class="evt-cost-toggle" onclick="this.classList.toggle('open');this.nextElementSibling.classList.toggle('open')" role="button" aria-expanded="false" aria-label="Toggle cost breakdown">
                <div><span class="evt-cost-toggle-label">Cost Breakdown</span></div>
                <div style="display:flex;align-items:center;gap:8px"><span class="evt-cost-toggle-price">${formatCurrency(event.rsvp_cost_cents)}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg></div>
            </div>
            <div class="evt-cost-details">${costBreakdownHtml}</div>`;
    }

    // ═══════════════════════════════════════════════════════
    // Final HTML assembly — new card-based layout
    // ═══════════════════════════════════════════════════════

    const detailView = document.getElementById('eventsDetailView');
    detailView.classList.add('event-detail-surface', 'portal-event-detail-v2');
    const templateCtx = {
        event,
        eventId,
        start,
        timeStr,
        tc,
        cpName,
        showTime,
        showLocation,
        showNotes,
        isPast,
        isClosed,
        deadlinePassed,
        rsvpEnabled,
        bannerBg,
        heroStatusBadgeHtml,
        pageHeaderActionsHtml,
        mobileAttendeesHtml,
        mobileHostedHtml,
        descHtml,
        descIsLong,
        eventContextHtml,
        attendeePreviewHtml,
        organizerHtml,
        waitlistHtml,
        thresholdHtml: '',
        costBreakdownHtml,
        locationReqHtml,
        graceHtml,
        raffleHtml,
        mapHtml,
        competitionHtml,
        scrapbookHtml,
        relatedHtml,
        rsvpButtons,
        teamHubCardHtml,
        qrHtml,
        documentsHtml,
        shareCardHtml,
    };
    detailView.innerHTML = window.evtBuildDetailTemplate(templateCtx);

    // ── Post-render setup ────────────────────────────────
    document.title = `${event.title} | Events | Justice McNeal LLC`;
    window.scrollTo({ top: 0, behavior: 'instant' });
    window.evtInitSectionAnimations();
    window.evtRunDetailPostRenderUi({
        event,
        eventId,
        isPast,
        isClosed,
        rsvp,
        myRaffleEntry,
        entriesClosed,
        eventIsFull,
        isHost,
        canAccessTeamHub,
        canCreateTeamChat,
    });
    evtInitHeroCollapse();
    window.evtRunDetailPostRenderBasics({ eventId });

    // QR canvas + inline maps after DOM render
    setTimeout(() => {
        window.evtRenderDetailQrCanvases({ event, eventId, rsvp, memberGoing });
        window.evtInitDetailInlineMaps({ event, showLocation });
    }, 100);
}

// Fullscreen map overlay — Phase 5D.3: js/portal/events/detail/map-overlay.js

// ═══════════════════════════════════════════════════════════
// Hero collapse — DEPRECATED (M2)
// Hero scrolls naturally; sticky title row handled in CSS via position:sticky.
// Functions kept as no-ops so external callers (rsvp/utils) don't crash.
// ═══════════════════════════════════════════════════════════
function evtInitHeroCollapse() { /* no-op since M2 — hero scrolls naturally */ }
function evtCleanupHeroCollapse() { /* no-op since M2 */ }

// Team Tools / CTA bar — Phase 5C: js/portal/events/team/tools.js
// Locked raffle desktop HTML — Phase 5D.2: js/portal/events/detail/raffle-render.js

// ═══════════════════════════════════════════════════════════
// Public surface — preserve legacy evt* globals + register PortalEvents.detail namespace
// ═══════════════════════════════════════════════════════════
window.evtOpenDetail            = evtOpenDetail;
window.evtInitHeroCollapse      = evtInitHeroCollapse;
window.evtCleanupHeroCollapse   = evtCleanupHeroCollapse;
detail.open                = evtOpenDetail;
detail.openLightbox        = window.evtOpenLightbox;
detail.openFullscreenMap   = window.evtOpenFullscreenMap;
detail.closeFullscreenMap  = window.evtCloseFullscreenMap;
detail.initBottomNav       = window.evtInitBottomNav;
detail.cleanupBottomNav    = window.evtCleanupBottomNav;
detail.openCtaPanel        = window.evtOpenCtaPanel;
detail.closeCtaPanel       = window.evtCloseCtaPanel;
detail.openTeamToolsPanel  = window.evtOpenTeamToolsPanel;
detail.openTeamChat        = window.evtOpenTeamChat;
detail.startLiveCountdown    = window.evtStartLiveCountdown;
detail.initSectionAnimations = window.evtInitSectionAnimations;
// Phase 3B additions — mirror remaining window.evt* globals + raffle helpers
detail.recenterFullscreenMap = window.evtRecenterFullscreenMap;
detail.initHeroCollapse      = evtInitHeroCollapse;
detail.cleanupHeroCollapse   = evtCleanupHeroCollapse;
detail.miniMarkdown          = window.evtMiniMarkdown;
detail.raffleConfig          = window.evtDetailRaffleConfig;
detail.raffleCategories      = window.evtDetailRaffleCategories;
detail.raffleItems           = window.evtDetailRaffleItems;
detail.raffleWinnerCount     = window.evtDetailRaffleWinnerCount;
detail.drawModeLabel         = window.evtDetailDrawModeLabel;
detail.rafflePrizesHtml      = window.evtDetailRafflePrizesHtml;
detail.raffleWinnersHtml     = window.evtDetailRaffleWinnersHtml;
detail.raffleLockedDesktopHtml = window.evtRaffleLockedDesktopHtml;

// Phase 5E.1 — nested namespace aliases (discoverability; flat bridges unchanged)
if (window.PortalEvents.detail.presentation) {
    detail.presentation = window.PortalEvents.detail.presentation;
}
if (window.PortalEvents.detail.raffleRender) {
    detail.raffleRender = window.PortalEvents.detail.raffleRender;
}
if (window.PortalEvents.detail.mapOverlay) {
    detail.mapOverlay = window.PortalEvents.detail.mapOverlay;
}
if (window.PortalEvents.team) {
    detail.team = window.PortalEvents.team;
}
if (window.PortalEvents.detail.fragments) {
    detail.fragments = window.PortalEvents.detail.fragments;
}
if (window.PortalEvents.detail.data) {
    detail.data = window.PortalEvents.detail.data;
}
if (window.PortalEvents.detail.sections) {
    detail.sections = window.PortalEvents.detail.sections;
}
if (window.PortalEvents.detail.postRender) {
    detail.postRender = window.PortalEvents.detail.postRender;
}
if (window.PortalEvents.detail.template) {
    detail.template = window.PortalEvents.detail.template;
}
detail.loadContext = window.evtLoadDetailContext;
detail.buildTemplate = window.evtBuildDetailTemplate;
detail.runPostRenderBasics = window.evtRunDetailPostRenderBasics;
detail.renderQrCanvases = window.evtRenderDetailQrCanvases;
detail.initInlineMaps = window.evtInitDetailInlineMaps;
detail.runPostRenderUi = window.evtRunDetailPostRenderUi;

// Pre-register known sub-modules (M3 management sheet will register itself here)
detail.register('rsvp',        { handle: () => window.evtHandleRsvp });
detail.register('raffle',      { handle: () => window.evtHandleRaffleEntry });
detail.register('competition', { build:  () => window.evtBuildCompetitionHtml });
detail.register('comments',    { load:   () => window.evtLoadComments,  post: () => window.evtPostComment });
detail.register('documents',   { build:  () => window.evtBuildDocumentsHtml });
detail.register('scrapbook',   { build:  () => window.evtBuildScrapbookHtml });
detail.register('map',         { build:  () => window.evtBuildMapHtml });
detail.register('scanner',     { open:   () => window.evtOpenScanner });

})(); // ── end IIFE ──

;/* ===== js/portal/events/detail/comments.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Detail comments / discussion
// Handles loading and posting event comments.
// ═══════════════════════════════════════════════════════════

function evtTimeAgo(dateStr) {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function evtLoadComments(eventId) {
    const list = document.getElementById('portalCommentsList');
    if (!list) return;

    // Fill self-avatar in input row
    const selfEl = document.getElementById('portalCommentSelfAvatar');
    if (selfEl) {
        const pic = window.evtCurrentUserPic;
        const initials = window.evtCurrentUserInitials || '?';
        selfEl.innerHTML = pic
            ? `<img src="${evtEscapeHtml(pic)}" alt="">`
            : initials;
    }

    let comments = null;
    try {
        const { data, error } = await supabaseClient
            .from('event_comments')
            .select('*, profile:profiles!event_comments_user_id_fkey(first_name, last_name, profile_picture_url)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true })
            .limit(100);
        if (error) throw error;
        comments = data;
    } catch (err) {
        // Table may not exist yet — hide section silently
        console.warn('Comments unavailable:', err.message || err);
        const section = document.getElementById('portalCommentsSection');
        if (section) section.style.display = 'none';
        return;
    }

    if (!comments || comments.length === 0) {
        list.innerHTML = `<div class="ed-comment-empty">
            <span class="ed-comment-empty-icon">💬</span>
            <p class="ed-comment-empty-text">No comments yet — be the first!</p>
        </div>`;
        return;
    }

    list.innerHTML = comments.map(c => {
        const name = evtEscapeHtml(`${c.profile?.first_name || ''} ${c.profile?.last_name || ''}`.trim() || 'Member');
        const avatarUrl = c.profile?.profile_picture_url;
        const initials  = ((c.profile?.first_name?.[0] || '') + (c.profile?.last_name?.[0] || '')).toUpperCase() || '?';
        const timeAgo   = evtTimeAgo(c.created_at);

        return `<div class="evt-comment">
            <div class="evt-comment-avatar">${avatarUrl ? `<img src="${evtEscapeHtml(avatarUrl)}" alt="">` : initials}</div>
            <div class="evt-comment-body">
                <div class="evt-comment-meta"><span class="evt-comment-name">${name}</span><span class="evt-comment-time">${timeAgo}</span></div>
                <p class="evt-comment-text">${evtEscapeHtml(c.body)}</p>
            </div>
        </div>`;
    }).join('');
}

async function evtPostComment(eventId) {
    const input = document.getElementById('portalCommentInput');
    const body  = (input?.value || '').trim();
    if (!body || !eventId || !evtCurrentUser) return;

    const { error } = await supabaseClient
        .from('event_comments')
        .insert({ event_id: eventId, user_id: evtCurrentUser.id, body });

    if (error) {
        console.error('Comment error:', error);
        return;
    }
    input.value = '';
    await evtLoadComments(eventId);
}

// Allow Enter key to post
document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'portalCommentInput') {
        const btn = document.querySelector('.ed-comment-post');
        btn?.click();
    }
});

window.evtPostComment = evtPostComment;

;/* ===== js/portal/events/detail/documents.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Detail documents (upload & download)
// Host: upload per-member & group docs
// Member: view & download their assigned + group docs
// ═══════════════════════════════════════════════════════════

function evtDocTypes() {
    const types = window.EventsConstants && window.EventsConstants.EVENT_DOC_TYPES;
    return types && types.length ? types : [];
}

// ─── Build Documents Section HTML ──────────────────────

async function evtBuildDocumentsHtml(event, isHost, hasRsvp) {
    const eventId = event.id;
    const isLlc = event.event_type === 'llc';
    if (!isLlc) return '';

    // Load existing documents
    const { data: docs } = await supabaseClient
        .from('event_documents')
        .select('*, profiles:target_user_id(first_name, last_name)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

    const allDocs = docs || [];
    const groupDocs = allDocs.filter(d => !d.target_user_id);
    const myDocs = allDocs.filter(d => d.target_user_id === evtCurrentUser.id);

    if (isHost) return '';

    // ── Member View: Download their docs ──
    if (!hasRsvp) return '';

    const visibleDocs = [...myDocs, ...groupDocs];
    if (visibleDocs.length === 0) return '';

    window._evtVisibleDocuments = window._evtVisibleDocuments || {};
    window._evtVisibleDocuments[eventId] = visibleDocs.map(d => ({
        id: d.id,
        doc_type: d.doc_type,
        label: d.label,
        file_name: d.file_name,
        file_path: d.file_path,
        target_user_id: d.target_user_id,
    }));

    return `
        <div class="ed-docs-launch">
            <div class="ed-docs-launch-copy">
                <span class="ed-docs-launch-icon">📄</span>
                <div>
                    <p class="ed-docs-launch-title">Documents available</p>
                    <p class="ed-docs-launch-sub">${visibleDocs.length} file${visibleDocs.length !== 1 ? 's' : ''} ready for this event</p>
                </div>
            </div>
            <button type="button" onclick="evtOpenDocumentsPanel('${eventId}')" class="ed-action-btn ed-docs-launch-btn">View Documents</button>
        </div>`;
}

function evtOpenDocumentsPanel(eventId) {
    const docs = window._evtVisibleDocuments?.[eventId] || [];
    if (!docs.length) return;
    const existing = document.getElementById('evtDocsPanelRoot');
    if (existing) existing.remove();

    const rows = docs.map(d => {
        const isPersonal = !!d.target_user_id;
        return `
            <div class="evt-doc-row">
                <span class="evt-doc-icon">${evtDocTypeIcon(d.doc_type)}</span>
                <div class="evt-doc-copy">
                    <p>${evtEscapeHtml(d.label || d.file_name || 'Document')}</p>
                    <span>${isPersonal ? 'Personal' : 'Group'} · ${evtEscapeHtml(d.file_name || '')}</span>
                </div>
                <button onclick="evtDownloadDocument('${d.id}','${d.file_path}','${evtEscapeHtml(d.file_name || 'document')}')" class="evt-doc-download">Download</button>
            </div>`;
    }).join('');

    const root = document.createElement('div');
    root.id = 'evtDocsPanelRoot';
    root.className = 'evt-docs-panel-root';
    root.innerHTML = `
        <div class="evt-docs-panel-backdrop" onclick="evtCloseDocumentsPanel()"></div>
        <section class="evt-docs-panel" role="dialog" aria-modal="true" aria-label="Event documents">
            <header class="evt-docs-panel-head">
                <div>
                    <p>Event Documents</p>
                    <h3>Your files</h3>
                </div>
                <button onclick="evtCloseDocumentsPanel()" aria-label="Close documents">×</button>
            </header>
            <div class="evt-docs-list">${rows}</div>
        </section>`;
    document.body.appendChild(root);
    requestAnimationFrame(() => root.classList.add('open'));
}

function evtCloseDocumentsPanel() {
    const root = document.getElementById('evtDocsPanelRoot');
    if (!root) return;
    root.classList.remove('open');
    setTimeout(() => root.remove(), 180);
}

// ─── Helper: Doc Type Icon ──────────────────────────────

function evtDocTypeIcon(type) {
    const icons = { plane_ticket: '✈️', group_ticket: '🎫', itinerary: '📋', receipt: '🧾', other: '📎' };
    return icons[type] || '📎';
}

// ─── Show Upload Form (positioned for target) ──────────

function evtShowUploadForm(eventId, targetUserId, targetName) {
    const form = document.getElementById('docUploadForm');
    if (!form) return;
    form.classList.remove('hidden');
    document.getElementById('docTargetUserId').value = targetUserId || '';
    document.getElementById('docEventId').value = eventId;
    document.getElementById('docUploadTarget').textContent = targetUserId
        ? `Uploading for: ${targetName}`
        : 'Uploading group document (visible to all RSVPed members)';

    // Default doc type based on target
    const typeSelect = document.getElementById('docType');
    if (targetUserId) {
        typeSelect.value = 'plane_ticket';
    } else {
        typeSelect.value = 'itinerary';
    }
}

// ─── Upload Document ────────────────────────────────────

async function evtUploadDocument() {
    const btn = document.getElementById('docUploadBtn');
    btn.disabled = true;
    btn.textContent = 'Uploading…';

    try {
        const eventId = document.getElementById('docEventId').value;
        const targetUserId = document.getElementById('docTargetUserId').value || null;
        const label = document.getElementById('docLabel').value.trim();
        const docType = document.getElementById('docType').value;
        const fileInput = document.getElementById('docFileInput');
        const file = fileInput.files[0];

        if (!label) throw new Error('Please enter a document label');
        if (!file) throw new Error('Please select a file');

        // Upload to storage
        const ext = file.name.split('.').pop();
        const storagePath = `${eventId}/${targetUserId || 'group'}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

        const { error: uploadErr } = await supabaseClient.storage
            .from('event-documents')
            .upload(storagePath, file, { contentType: file.type });

        if (uploadErr) throw uploadErr;

        // Insert DB record
        const { error: dbErr } = await supabaseClient
            .from('event_documents')
            .insert({
                event_id: eventId,
                uploaded_by: evtCurrentUser.id,
                target_user_id: targetUserId,
                doc_type: docType,
                label,
                file_path: storagePath,
                file_name: file.name,
                file_size_bytes: file.size,
                mime_type: file.type,
            });

        if (dbErr) throw dbErr;

        // Reset form and refresh detail
        document.getElementById('docUploadForm').classList.add('hidden');
        document.getElementById('docLabel').value = '';
        fileInput.value = '';

        // Re-open detail to refresh
        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Document upload error:', err);
        alert(`Upload failed: ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload';
    }
}

// ─── Download Document ──────────────────────────────────

async function evtDownloadDocument(docId, filePath, fileName) {
    try {
        const { data, error } = await supabaseClient.storage
            .from('event-documents')
            .download(filePath);

        if (error) throw error;

        // Create download link
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Download error:', err);
        alert(`Download failed: ${err.message}`);
    }
}

// ─── Mark Document as Distributed ───────────────────────

async function evtMarkDistributed(docId, eventId) {
    try {
        const { error } = await supabaseClient
            .from('event_documents')
            .update({ distributed: true })
            .eq('id', docId);
        if (error) throw error;
        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Mark distributed error:', err);
        alert(`Failed: ${err.message}`);
    }
}

// ─── Delete Document ────────────────────────────────────

async function evtDeleteDocument(docId, eventId) {
    if (!confirm('Delete this document?')) return;
    try {
        // Get file path first for storage cleanup
        const { data: doc } = await supabaseClient
            .from('event_documents')
            .select('file_path')
            .eq('id', docId)
            .single();

        if (doc?.file_path) {
            await supabaseClient.storage.from('event-documents').remove([doc.file_path]);
        }

        const { error } = await supabaseClient
            .from('event_documents')
            .delete()
            .eq('id', docId);
        if (error) throw error;

        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Delete document error:', err);
        alert(`Delete failed: ${err.message}`);
    }
}

;/* ===== js/portal/events/detail/map-live.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Detail live map (Leaflet.js + Supabase Realtime)
// Opt-in location sharing during event window + 24h
// ═══════════════════════════════════════════════════════════

let evtMapInstance = null;
let evtMapMarkers = {};          // user_id → Leaflet marker
let evtMapRealtimeSub = null;
let evtMapSharingActive = false;
let evtMapWatchId = null;

// ─── Check if Live Map Should Be Available ──────────────

function evtIsMapAvailable(event) {
    if (!event) return false;
    const now = new Date();
    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 4 * 60 * 60 * 1000); // default 4h
    const mapEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000); // + 24h

    // Map available from event start to end + 24h
    return now >= start && now <= mapEnd;
}

// ─── Build Map Section HTML ─────────────────────────────

function evtBuildMapHtml(event, hasRsvp, isHost) {
    if (event.event_type !== 'llc') return '';
    if (!hasRsvp && !isHost) return '';
    if (!evtIsMapAvailable(event)) return '';

    return `
        <div class="mt-6 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
            <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">📍</span>
                <h4 class="text-sm font-bold text-gray-800">Live Event Map</h4>
            </div>

            <!-- Privacy Banner -->
            <div class="mb-3 p-2.5 bg-white/60 border border-emerald-200 rounded-lg flex items-start gap-2">
                <svg class="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                <p class="text-xs text-emerald-700">Location sharing is <strong>opt-in only</strong>. Your position is only visible to other RSVPed members during the event. You can stop sharing at any time.</p>
            </div>

            <!-- Sharing Toggle -->
            <div class="flex items-center justify-between bg-white rounded-xl p-3 mb-3 border border-gray-100">
                <div>
                    <div class="text-sm font-semibold text-gray-800" id="mapSharingLabel">Share My Location</div>
                    <div class="text-xs text-gray-500 mt-0.5" id="mapSharingStatus">Not sharing</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="mapSharingToggle" onchange="evtToggleLocationSharing('${event.id}')" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-200 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
            </div>

            <!-- Map Container -->
            <div id="eventMapContainer" class="w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                <div class="flex items-center justify-center h-full text-sm text-gray-400">
                    <button onclick="evtInitMap('${event.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                        Open Map
                    </button>
                </div>
            </div>
        </div>`;
}

// ─── Initialize Leaflet Map ─────────────────────────────

async function evtInitMap(eventId) {
    const container = document.getElementById('eventMapContainer');
    if (!container) return;

    // Clear placeholder
    container.innerHTML = '<div id="eventMap" class="w-full h-full"></div>';

    try {
        if (typeof window.evtEnsureLeaflet === 'function') await window.evtEnsureLeaflet();
    } catch (err) {
        console.error('Leaflet load error:', err);
        container.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-red-500">Map library failed to load. Please refresh.</div>';
        return;
    }

    if (typeof L === 'undefined') {
        container.innerHTML = '<div class="flex items-center justify-center h-full text-sm text-red-500">Map library failed to load. Please refresh.</div>';
        return;
    }

    // Initialize map (default center: US center)
    const event = evtAllEvents.find(e => e.id === eventId);
    const defaultCenter = [39.8283, -98.5795];
    const defaultZoom = 4;

    evtMapInstance = L.map('eventMap', {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
    }).addTo(evtMapInstance);

    // Load existing locations
    const { data: locations } = await supabaseClient
        .from('event_locations')
        .select('*, profiles:user_id(first_name, last_name, profile_picture_url)')
        .eq('event_id', eventId)
        .eq('sharing_active', true);

    if (locations && locations.length > 0) {
        const bounds = [];
        for (const loc of locations) {
            evtAddMapMarker(loc);
            bounds.push([loc.latitude, loc.longitude]);
        }
        if (bounds.length > 0) {
            evtMapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
    }

    // Subscribe to Realtime changes
    evtMapRealtimeSub = supabaseClient
        .channel(`event-locations-${eventId}`)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'event_locations', filter: `event_id=eq.${eventId}` },
            (payload) => evtHandleLocationChange(payload)
        )
        .subscribe();
}

// ─── Add / Update Marker on Map ─────────────────────────

function evtAddMapMarker(loc) {
    if (!evtMapInstance) return;

    const name = loc.profiles
        ? `${loc.profiles.first_name || ''} ${loc.profiles.last_name || ''}`.trim()
        : 'Member';

    const isMe = loc.user_id === evtCurrentUser?.id;
    const initial = (name[0] || '?').toUpperCase();

    // Create custom icon
    const iconHtml = `<div style="
        width:32px;height:32px;border-radius:50%;
        background:${isMe ? '#10b981' : '#6366f1'};
        color:white;display:flex;align-items:center;justify-content:center;
        font-weight:700;font-size:13px;border:2px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,.2);
    ">${initial}</div>`;

    const icon = L.divIcon({
        html: iconHtml,
        className: 'event-map-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    // Remove existing marker if update
    if (evtMapMarkers[loc.user_id]) {
        evtMapInstance.removeLayer(evtMapMarkers[loc.user_id]);
    }

    const marker = L.marker([loc.latitude, loc.longitude], { icon })
        .addTo(evtMapInstance)
        .bindPopup(`<strong>${evtEscapeHtml(name)}</strong>${isMe ? ' (you)' : ''}<br><span style="font-size:11px;color:#888">Updated ${new Date(loc.updated_at).toLocaleTimeString()}</span>`);

    evtMapMarkers[loc.user_id] = marker;
}

// ─── Handle Realtime Location Changes ───────────────────

async function evtHandleLocationChange(payload) {
    if (payload.eventType === 'DELETE' || (payload.new && !payload.new.sharing_active)) {
        // Remove marker
        const userId = payload.old?.user_id || payload.new?.user_id;
        if (userId && evtMapMarkers[userId]) {
            evtMapInstance?.removeLayer(evtMapMarkers[userId]);
            delete evtMapMarkers[userId];
        }
        return;
    }

    const loc = payload.new;
    if (!loc || !loc.sharing_active) return;

    // Fetch profile info for new marker
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name, profile_picture_url')
        .eq('id', loc.user_id)
        .maybeSingle();

    evtAddMapMarker({ ...loc, profiles: profile });
}

// ─── Toggle Location Sharing ────────────────────────────

async function evtToggleLocationSharing(eventId) {
    const toggle = document.getElementById('mapSharingToggle');
    const statusEl = document.getElementById('mapSharingStatus');

    if (toggle.checked) {
        // Start sharing
        if (!('geolocation' in navigator)) {
            alert('Geolocation is not supported by your browser.');
            toggle.checked = false;
            return;
        }

        try {
            // Request permission
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                });
            });

            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            // Upsert location
            const { error } = await supabaseClient
                .from('event_locations')
                .upsert({
                    event_id: eventId,
                    user_id: evtCurrentUser.id,
                    latitude: lat,
                    longitude: lng,
                    sharing_active: true,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'event_id,user_id' });

            if (error) throw error;

            evtMapSharingActive = true;
            statusEl.textContent = 'Sharing your location';
            statusEl.classList.add('text-emerald-600');
            statusEl.classList.remove('text-gray-500');

            // Center map on user
            if (evtMapInstance) {
                evtMapInstance.setView([lat, lng], 15);
            }

            // Start watching position
            evtMapWatchId = navigator.geolocation.watchPosition(
                (newPos) => evtUpdateMyLocation(eventId, newPos),
                (err) => console.warn('Watch error:', err),
                { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
            );
        } catch (err) {
            console.error('Location sharing error:', err);
            toggle.checked = false;
            if (err.code === 1) {
                alert('Location permission denied. Please allow location access in your browser settings.');
            } else {
                alert(`Could not get your location: ${err.message}`);
            }
        }
    } else {
        // Stop sharing
        evtMapSharingActive = false;

        if (evtMapWatchId !== null) {
            navigator.geolocation.clearWatch(evtMapWatchId);
            evtMapWatchId = null;
        }

        // Mark inactive in DB
        await supabaseClient
            .from('event_locations')
            .update({ sharing_active: false, updated_at: new Date().toISOString() })
            .eq('event_id', eventId)
            .eq('user_id', evtCurrentUser.id);

        statusEl.textContent = 'Not sharing';
        statusEl.classList.remove('text-emerald-600');
        statusEl.classList.add('text-gray-500');
    }
}

// ─── Update My Location (from watchPosition) ───────────

async function evtUpdateMyLocation(eventId, pos) {
    if (!evtMapSharingActive) return;

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    await supabaseClient
        .from('event_locations')
        .upsert({
            event_id: eventId,
            user_id: evtCurrentUser.id,
            latitude: lat,
            longitude: lng,
            sharing_active: true,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'event_id,user_id' });
}

// ─── Cleanup Map Resources ──────────────────────────────

function evtCleanupMap() {
    // Stop watching
    if (evtMapWatchId !== null) {
        navigator.geolocation.clearWatch(evtMapWatchId);
        evtMapWatchId = null;
    }

    // Unsubscribe from realtime
    if (evtMapRealtimeSub) {
        supabaseClient.removeChannel(evtMapRealtimeSub);
        evtMapRealtimeSub = null;
    }

    // Destroy map
    if (evtMapInstance) {
        evtMapInstance.remove();
        evtMapInstance = null;
    }

    evtMapMarkers = {};
    evtMapSharingActive = false;
}

;/* ===== js/portal/events/detail/competition.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Detail competition module
// Handles registration, entry submission, voting, phase
// management, results display, and prize pool UI.
// ═══════════════════════════════════════════════════════════

// ─── Build Competition HTML for Detail Modal ────────────

async function evtBuildCompetitionHtml(event, isHost) {
    if (event.event_type !== 'competition') return '';

    const config = event.competition_config || {};
    const eventId = event.id;

    // Load phases
    const { data: phases } = await supabaseClient
        .from('competition_phases')
        .select('*')
        .eq('event_id', eventId)
        .order('phase_num', { ascending: true });

    // Load entries (non-moderated)
    const { data: entries } = await supabaseClient
        .from('competition_entries')
        .select('*, profiles:user_id(first_name, last_name, profile_picture_url)')
        .eq('event_id', eventId)
        .eq('moderated', false)
        .order('submitted_at', { ascending: true });

    // Load user's entry
    const myEntry = (entries || []).find(e => e.user_id === evtCurrentUser.id);

    // Load my vote
    const { data: myVote } = await supabaseClient
        .from('competition_votes')
        .select('entry_id')
        .eq('event_id', eventId)
        .eq('voter_id', evtCurrentUser.id)
        .maybeSingle();

    // Load winners
    const { data: winners } = await supabaseClient
        .from('competition_winners')
        .select('*, profiles:user_id(first_name, last_name, profile_picture_url), competition_entries!competition_winners_entry_id_fkey(title)')
        .eq('event_id', eventId)
        .order('place', { ascending: true });

    // Load prize pool contributions count
    const { count: contributionCount } = await supabaseClient
        .from('prize_pool_contributions')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId);

    // Load competitors count (all entries including moderated)
    const { count: totalEntryCount } = await supabaseClient
        .from('competition_entries')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId);

    // Determine current phase
    const now = new Date();
    const currentPhase = (phases || []).find(p => p.status === 'active') ||
        (phases || []).find(p => p.status === 'extended') ||
        { phase_num: 0, status: 'pending' };
    const activePhaseNum = currentPhase.phase_num;

    // Auto-determine which phase should be active based on time
    let displayPhaseNum = activePhaseNum;
    if (!activePhaseNum) {
        for (const p of (phases || [])) {
            if (now >= new Date(p.starts_at) && now < new Date(p.ends_at)) {
                displayPhaseNum = p.phase_num;
                break;
            }
        }
    }

    const entryList = entries || [];
    const winnerList = winners || [];
    const phaseList = phases || [];

    // ── Phase Timeline ──────────────────────────────────
    const phaseTimelineHtml = phaseList.map(p => {
        const isActive = p.status === 'active' || p.status === 'extended';
        const isCompleted = p.status === 'completed';
        const isPending = p.status === 'pending';
        const isCancelled = p.status === 'cancelled';

        const statusIcon = isCompleted ? '✅' : isActive ? '🔵' : isCancelled ? '❌' : '⏳';
        const statusColor = isCompleted ? 'text-emerald-600' : isActive ? 'text-blue-600' : isCancelled ? 'text-red-500' : 'text-gray-400';
        const bgColor = isActive ? 'bg-blue-50 border-blue-200' : isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200';

        const startStr = new Date(p.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = new Date(p.ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

        // Countdown for active phase
        let countdownHtml = '';
        if (isActive) {
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
    }).join('');

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
            <button onclick="evtContributeToPrizePool('${eventId}')" class="mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5">
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
                    <button onclick="evtJoinCompetition('${eventId}')" class="w-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                        🏆 Join as Competitor${entryFee > 0 ? ` — ${formatCurrency(entryFee)}` : ''}
                    </button>
                    <p class="text-xs text-gray-400 text-center mt-1">${entryList.length} competitor${entryList.length !== 1 ? 's' : ''} registered</p>
                </div>`;
        }
    }

    // ── Phase 2: Entry Submission ────────────────────────
    let submissionHtml = '';
    if (displayPhaseNum === 2 || (displayPhaseNum <= 2 && myEntry && !myEntry.file_url && !myEntry.external_url && myEntry.entry_type !== 'text')) {
        if (myEntry && (myEntry.file_url || myEntry.external_url || myEntry.title)) {
            submissionHtml = `
                <div class="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p class="text-sm font-bold text-emerald-700">✅ Entry Submitted: "${evtEscapeHtml(myEntry.title)}"</p>
                    <p class="text-xs text-emerald-600 mt-0.5">Submitted ${new Date(myEntry.submitted_at).toLocaleDateString()}</p>
                </div>`;
        } else if (myEntry && displayPhaseNum === 2) {
            // Show submission form
            submissionHtml = evtBuildSubmitFormHtml(eventId, config);
        }
    }

    // ── Entry Gallery ───────────────────────────────────
    let galleryHtml = '';
    const showEntries = config.entries_visible_before_voting || displayPhaseNum >= 3;
    if (showEntries && entryList.length > 0) {
        const entryCards = entryList.map(entry => {
            const p = entry.profiles;
            const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown';
            const initials = ((p?.first_name?.[0] || '') + (p?.last_name?.[0] || '')).toUpperCase();
            const avatar = p?.profile_picture_url
                ? `<img src="${p.profile_picture_url}" class="w-8 h-8 rounded-full object-cover" alt="">`
                : `<div class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xs font-bold">${initials}</div>`;

            const isVoted = myVote?.entry_id === entry.id;
            const voteCountDisplay = config.vote_tally_visible || displayPhaseNum >= 4
                ? `<span class="text-xs text-gray-500">${entry.vote_count} vote${entry.vote_count !== 1 ? 's' : ''}</span>`
                : '';

            // Entry content preview
            let contentPreview = '';
            if (entry.entry_type === 'file' && entry.file_url) {
                if (entry.mime_type?.startsWith('image/')) {
                    contentPreview = `<img src="${entry.file_url}" class="w-full h-32 object-cover rounded-lg mt-2" alt="">`;
                } else {
                    contentPreview = `<div class="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-500">📎 ${evtEscapeHtml(entry.file_name || 'File')}</div>`;
                }
            } else if (entry.entry_type === 'link' && entry.external_url) {
                contentPreview = `<a href="${entry.external_url}" target="_blank" class="mt-2 block text-xs text-blue-600 hover:underline truncate">🔗 ${evtEscapeHtml(entry.external_url)}</a>`;
            }

            // Vote button (Phase 3 only)
            let voteBtn = '';
            if (displayPhaseNum === 3 && !myVote && entry.user_id !== evtCurrentUser.id) {
                voteBtn = `<button onclick="evtCastVote('${eventId}','${entry.id}')" class="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">Vote</button>`;
            } else if (isVoted) {
                voteBtn = `<div class="mt-2 text-center text-xs font-bold text-blue-600">✓ Your Vote</div>`;
            }

            // Moderation button (host only, before voting)
            let modBtn = '';
            if (isHost && displayPhaseNum < 3) {
                modBtn = `<button onclick="evtModerateEntry('${eventId}','${entry.id}')" class="mt-1 text-xs text-red-400 hover:text-red-600">Remove Entry</button>`;
            }

            // Winner badge
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
        }).join('');

        galleryHtml = `
            <div class="mt-5">
                <h4 class="text-sm font-bold text-gray-700 mb-3">📋 Entries (${entryList.length})</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${entryCards}</div>
            </div>`;
    }

    // ── Phase 3: Voting Status ──────────────────────────
    let votingStatusHtml = '';
    if (displayPhaseNum === 3) {
        if (myVote) {
            votingStatusHtml = `
                <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
                    <span class="text-lg">🗳️</span>
                    <p class="text-sm font-semibold text-blue-700">You've cast your vote!</p>
                </div>`;
        } else if (myEntry) {
            votingStatusHtml = `
                <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                    <span class="text-lg">⚠️</span>
                    <p class="text-sm text-amber-700">You can't vote for your own entry, but you can vote for others!</p>
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
                ${!met ? `<p class="text-xs text-amber-600 mt-1">If not met, competition may be extended ${config.extension_days || 3} days or cancelled with full refund.</p>` : ''}
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
            // Host can finalize results
            resultsHtml = `
                <div class="mt-4">
                    <button onclick="evtFinalizeCompetition('${eventId}')" class="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
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
            buttons += `<button onclick="evtAdvancePhase('${eventId}', ${activeP.phase_num})" class="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition">Complete Phase ${activeP.phase_num} → Next</button>`;
            if (activeP.phase_num === 2 && !activeP.extended_once) {
                buttons += `<button onclick="evtExtendPhase('${eventId}', ${activeP.phase_num})" class="bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-amber-600 transition">Extend ${config.extension_days || 3} Days</button>`;
            }
        }
        if (!activeP && nextPhase) {
            buttons += `<button onclick="evtStartPhase('${eventId}', ${nextPhase.phase_num})" class="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition">Start Phase ${nextPhase.phase_num}: ${nextPhase.name}</button>`;
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
        <div class="mt-6 p-4 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl">
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
}

// ─── Build Submit Entry Form HTML ───────────────────────

function evtBuildSubmitFormHtml(eventId, config) {
    const entryType = config.entry_type || 'any';

    const fileInput = (entryType === 'file' || entryType === 'any') ? `
        <div id="compFileGroup">
            <label class="text-xs text-gray-600 font-semibold">Upload File</label>
            <input type="file" id="compEntryFile" accept="image/*,application/pdf,video/*"
                   class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <p class="text-xs text-gray-400 mt-0.5">Images/PDFs: max 10MB • Video: max 50MB</p>
        </div>` : '';

    const linkInput = (entryType === 'link' || entryType === 'any') ? `
        <div>
            <label class="text-xs text-gray-600 font-semibold">External Link</label>
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
            <button onclick="evtSubmitEntry('${eventId}')" class="w-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition">
                Submit Entry
            </button>
        </div>`;
}

// ─── Join Competition (Register as Competitor) ──────────

async function evtJoinCompetition(eventId) {
    try {
        const event = evtAllEvents.find(e => e.id === eventId);
        const config = event?.competition_config || {};
        const entryFee = config.entry_fee_cents || 0;

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
                user_id: evtCurrentUser.id,
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
        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Join competition error:', err);
        alert(`Failed to join: ${err.message}`);
    }
}

// ─── Submit Entry ───────────────────────────────────────

async function evtSubmitEntry(eventId) {
    try {
        const title = document.getElementById('compEntryTitle')?.value?.trim();
        if (!title) { alert('Please enter a title for your entry.'); return; }

        const desc = document.getElementById('compEntryDesc')?.value?.trim() || null;
        const fileInput = document.getElementById('compEntryFile');
        const linkInput = document.getElementById('compEntryLink');
        const file = fileInput?.files?.[0];
        const link = linkInput?.value?.trim();

        let entryType = 'text';
        let fileUrl = null;
        let fileName = null;
        let fileSizeBytes = null;
        let mimeType = null;
        let externalUrl = null;

        if (file) {
            // Validate file size
            const isVideo = file.type.startsWith('video/');
            const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
            if (file.size > maxSize) {
                alert(`File too large. Max ${isVideo ? '50MB' : '10MB'} for ${isVideo ? 'video' : 'images/PDFs'}.`);
                return;
            }

            // Upload to competition-entries bucket
            const ext = file.name.split('.').pop();
            const path = `${evtCurrentUser.id}/${eventId}-${Date.now()}.${ext}`;
            const { error: upErr } = await supabaseClient.storage
                .from('competition-entries')
                .upload(path, file, { contentType: file.type });
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabaseClient.storage
                .from('competition-entries')
                .getPublicUrl(path);

            fileUrl = publicUrl;
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
            .eq('user_id', evtCurrentUser.id);

        if (error) throw error;

        alert('Entry submitted successfully! 🎉');
        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Submit entry error:', err);
        alert(`Failed to submit: ${err.message}`);
    }
}

// ─── Cast Vote ──────────────────────────────────────────

async function evtCastVote(eventId, entryId) {
    if (!confirm('Cast your vote? This cannot be changed.')) return;

    try {
        const { error } = await supabaseClient
            .from('competition_votes')
            .insert({
                event_id: eventId,
                voter_id: evtCurrentUser.id,
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
        evtOpenDetail(eventId);
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
                moderated_by: evtCurrentUser.id,
                moderation_reason: reason || 'Removed by host',
            })
            .eq('id', entryId);

        if (error) throw error;

        alert('Entry removed.');
        evtOpenDetail(eventId);
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
        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Start phase error:', err);
        alert(`Failed: ${err.message}`);
    }
}

async function evtAdvancePhase(eventId, currentPhaseNum) {
    if (!confirm(`Complete Phase ${currentPhaseNum} and advance to next?`)) return;

    try {
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

        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Advance phase error:', err);
        alert(`Failed: ${err.message}`);
    }
}

async function evtExtendPhase(eventId, phaseNum) {
    try {
        const event = evtAllEvents.find(e => e.id === eventId);
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
        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Extend phase error:', err);
        alert(`Failed: ${err.message}`);
    }
}

// ─── Finalize Competition (Announce Winners) ────────────

async function evtFinalizeCompetition(eventId) {
    if (!confirm('Finalize results and announce winners? This cannot be undone.')) return;

    try {
        const event = evtAllEvents.find(e => e.id === eventId);
        const config = event?.competition_config || {};
        const tiers = event?.winner_tier_config || [{ place: 1, pct: 100 }];
        const totalPool = event?.total_prize_pool_cents || 0;
        const housePct = config.house_pct || 0;
        const netPool = Math.round(totalPool * (1 - housePct / 100));

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
        await evtLoadEvents();
        evtOpenDetail(eventId);
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

;/* ===== js/portal/events/detail/scrapbook.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Detail scrapbook (photo upload & gallery)
// Past events allow RSVPed members to upload photos.
// ═══════════════════════════════════════════════════════════

/**
 * Build the scrapbook HTML section for a completed event.
 * Shows a photo grid + upload button for RSVPed members.
 */
async function evtBuildScrapbookHtml(event, hasRsvp) {
    if (event.status !== 'completed') return '';

    // Load photos
    const { data: photos } = await supabaseClient
        .from('event_photos')
        .select('*, profiles:user_id(first_name, last_name, profile_picture_url)')
        .eq('event_id', event.id)
        .order('uploaded_at', { ascending: false });

    const photoList = photos || [];
    const canUpload = hasRsvp || (typeof canManageEvents === 'function' && canManageEvents());

    let galleryHtml = '';
    if (photoList.length) {
        galleryHtml = `
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                ${photoList.map(p => {
                    const name = p.profiles ? `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.trim() : 'Member';
                    const canDelete = p.user_id === evtCurrentUser.id || (typeof canManageEvents === 'function' && canManageEvents());
                    return `
                        <div class="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
                            <img src="${p.file_url}" alt="${evtEscapeHtml(p.caption || '')}" class="w-full h-full object-cover cursor-pointer" onclick="evtViewPhoto('${p.file_url}', '${evtEscapeHtml(p.caption || '')}', '${evtEscapeHtml(name)}')">
                            ${p.caption ? `<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <p class="text-white text-[10px] leading-tight truncate">${evtEscapeHtml(p.caption)}</p>
                            </div>` : ''}
                            <div class="absolute top-1 left-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                                <span class="text-white text-[9px] font-medium">${evtEscapeHtml(name)}</span>
                            </div>
                            ${canDelete ? `
                            <button onclick="evtDeletePhoto('${event.id}', '${p.id}', '${p.file_url}')" class="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs">&times;</button>
                            ` : ''}
                        </div>`;
                }).join('')}
            </div>`;
    } else {
        galleryHtml = `<p class="text-xs text-gray-400 mt-2">No photos yet. Be the first to share a memory!</p>`;
    }

    const uploadHtml = canUpload ? `
        <div class="mt-3 p-3 border-2 border-dashed border-gray-200 rounded-xl text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition" id="scrapbookDropzone" onclick="document.getElementById('scrapbookFileInput').click()">
            <input type="file" id="scrapbookFileInput" accept="image/*" multiple class="hidden" onchange="evtHandlePhotoSelect('${event.id}')">
            <svg class="w-6 h-6 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            <p class="text-xs text-gray-400">Drop photos or tap to upload</p>
            <p class="text-[10px] text-gray-300 mt-0.5">JPG, PNG, WebP • Max 10MB per photo</p>
        </div>
        <div id="scrapbookUploadProgress" class="hidden mt-2">
            <div class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-brand-500" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                <span class="text-xs text-brand-600" id="scrapbookUploadText">Uploading...</span>
            </div>
        </div>
    ` : '';

    return `
        <div class="mt-6 p-4 bg-white rounded-xl border border-gray-200/80">
            <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    📸 Scrapbook
                    <span class="text-xs font-normal text-gray-400">(${photoList.length} photo${photoList.length !== 1 ? 's' : ''})</span>
                </h4>
            </div>
            ${galleryHtml}
            ${uploadHtml}
        </div>
    `;
}

/**
 * Handle photo file selection from the file input.
 */
async function evtHandlePhotoSelect(eventId) {
    const input = document.getElementById('scrapbookFileInput');
    const files = Array.from(input?.files || []);
    if (!files.length) return;

    const progress = document.getElementById('scrapbookUploadProgress');
    const progressText = document.getElementById('scrapbookUploadText');
    if (progress) progress.classList.remove('hidden');

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    let uploaded = 0;

    for (const file of files) {
        if (!allowed.includes(file.type)) {
            alert(`Skipped "${file.name}" — only JPG, PNG, WebP, GIF allowed.`);
            continue;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert(`Skipped "${file.name}" — max 10MB per photo.`);
            continue;
        }

        if (progressText) progressText.textContent = `Uploading ${uploaded + 1} of ${files.length}...`;

        try {
            const ext = file.name.split('.').pop();
            const filePath = `${evtCurrentUser.id}/${eventId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

            const { error: uploadErr } = await supabaseClient.storage
                .from('event-photos')
                .upload(filePath, file, { upsert: false });
            if (uploadErr) throw uploadErr;

            const { data: urlData } = supabaseClient.storage
                .from('event-photos')
                .getPublicUrl(filePath);

            // Prompt for caption on first photo only
            let caption = null;
            if (files.length === 1) {
                caption = prompt('Add a caption? (optional)');
            }

            const { error: insertErr } = await supabaseClient
                .from('event_photos')
                .insert({
                    event_id: eventId,
                    user_id: evtCurrentUser.id,
                    file_url: urlData.publicUrl,
                    caption: caption || null,
                });
            if (insertErr) throw insertErr;

            uploaded++;
        } catch (err) {
            console.error('Photo upload error:', err);
            alert('Failed to upload photo: ' + (err.message || 'Unknown error'));
        }
    }

    if (progress) progress.classList.add('hidden');
    if (input) input.value = '';

    if (uploaded > 0) {
        alert(`✅ ${uploaded} photo${uploaded > 1 ? 's' : ''} uploaded!`);
        // Refresh the detail modal to show new photos
        evtOpenDetail(eventId);
    }
}

/**
 * Delete a scrapbook photo.
 */
async function evtDeletePhoto(eventId, photoId, fileUrl) {
    if (!confirm('Delete this photo?')) return;

    try {
        // Delete the DB record
        const { error } = await supabaseClient
            .from('event_photos')
            .delete()
            .eq('id', photoId);
        if (error) throw error;

        // Try to remove from storage (extract path from URL)
        try {
            const url = new URL(fileUrl);
            const path = url.pathname.split('/event-photos/')[1];
            if (path) {
                await supabaseClient.storage.from('event-photos').remove([decodeURIComponent(path)]);
            }
        } catch (e) {
            console.warn('Storage cleanup failed (non-critical):', e);
        }

        // Refresh detail
        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Delete photo error:', err);
        alert('Failed to delete photo.');
    }
}

/**
 * View a photo in a lightbox overlay.
 */
function evtViewPhoto(url, caption, name) {
    // Remove any existing lightbox
    const existing = document.getElementById('photoLightbox');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'photoLightbox';
    overlay.className = 'fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4';
    overlay.innerHTML = `
        <div class="max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <img src="${url}" alt="${caption}" class="max-w-full max-h-[80vh] rounded-lg object-contain shadow-2xl">
            ${caption || name ? `
            <div class="mt-3 text-center">
                ${caption ? `<p class="text-white text-sm">${evtEscapeHtml(caption)}</p>` : ''}
                ${name ? `<p class="text-gray-400 text-xs mt-1">📷 ${evtEscapeHtml(name)}</p>` : ''}
            </div>` : ''}
        </div>
        <button class="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light transition" onclick="document.getElementById('photoLightbox').remove()">&times;</button>
    `;
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
}

;/* ===== js/portal/events/detail/scanner.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Detail QR scanner (attendee ticket mode)
// Camera-based scanning using jsQR, processes check-ins.
// ═══════════════════════════════════════════════════════════

// Parse QR data from either URL format or legacy JSON format
function evtParseQrData(raw) {
    // URL format: https://…/events/?e={slug}&ticket={token}
    try {
        const url = new URL(raw);
        const ticket = url.searchParams.get('ticket');
        const slug = url.searchParams.get('e');
        if (ticket && slug) {
            // Resolve event_id from slug using the loaded events list
            const evt = evtAllEvents.find(ev => ev.slug === slug);
            if (evt) return { e: evt.id, t: ticket };
            // If event not in cache, return slug so caller can handle
            return { slug, t: ticket };
        }
    } catch (_) { /* not a URL */ }
    // Legacy JSON format: {"e":"uuid","t":"token"}
    try {
        const obj = JSON.parse(raw);
        if (obj.e && obj.t) return obj;
    } catch (_) { /* not JSON */ }
    return null;
}

async function evtOpenScanner(eventId) {
    try {
        if (typeof window.evtEnsureJsQR === 'function') await window.evtEnsureJsQR();
    } catch (err) {
        console.error('jsQR load error:', err);
        const result = document.getElementById('scanResult');
        if (result) result.innerHTML = '<span class="text-red-500">Scanner library failed to load. Please refresh.</span>';
        return;
    }

    evtToggleModal('scannerModal', true);
    const video = document.getElementById('scannerVideo');
    const canvas = document.getElementById('scannerCanvas');
    const result = document.getElementById('scanResult');
    result.innerHTML = '<span class="text-gray-400">Point camera at attendee\'s QR code…</span>';

    try {
        evtScannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = evtScannerStream;
        video.play();

        const ctx = canvas.getContext('2d');

        function tick() {
            if (!evtScannerStream) return;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
                    if (code) {
                        const qrData = evtParseQrData(code.data);
                        if (qrData && qrData.t) {
                            evtProcessCheckin(qrData.e || eventId, qrData.t, result);
                            return; // stop scanning
                        }
                    }
                }
            }
            evtScannerAnimFrame = requestAnimationFrame(tick);
        }

        evtScannerAnimFrame = requestAnimationFrame(tick);
    } catch (err) {
        console.error('Camera error:', err);
        result.innerHTML = '<span class="text-red-500">Camera access denied or unavailable.</span>';
    }
}

// ─── Process Check-In ───────────────────────────────────

async function evtProcessCheckin(eventId, qrToken, resultEl) {
    // Pause scanning
    if (evtScannerAnimFrame) cancelAnimationFrame(evtScannerAnimFrame);

    resultEl.innerHTML = '<span class="text-gray-500">Checking in…</span>';

    try {
        // Check if event requires location sharing
        const event = evtAllEvents.find(e => e.id === eventId);
        if (event?.location_required) {
            // Verify the member has location sharing active
            const { data: locRecord } = await supabaseClient
                .from('event_locations')
                .select('sharing_active')
                .eq('event_id', eventId)
                .eq('user_id', evtCurrentUser.id)
                .maybeSingle();

            // For the HOST scanning tickets: we check the ATTENDEE's location status
            // But since the host is the one scanning, we skip this check for the host themselves
        }

        // 1) Try member RSVP by qr_token
        const { data: rsvp, error: findErr } = await supabaseClient
            .from('event_rsvps')
            .select('id, user_id, status, profiles!event_rsvps_user_id_fkey(first_name, last_name)')
            .eq('event_id', eventId)
            .eq('qr_token', qrToken)
            .maybeSingle();

        if (findErr) throw findErr;

        if (rsvp) {
            // ── Member check-in ──
            const { data: existing } = await supabaseClient
                .from('event_checkins')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', rsvp.user_id)
                .maybeSingle();

            if (existing) {
                const name = `${rsvp.profiles?.first_name || ''} ${rsvp.profiles?.last_name || ''}`.trim();
                resultEl.innerHTML = `<span class="text-amber-600">✅ Already checked in — ${evtEscapeHtml(name)}</span>`;
                evtResumeScanner(3000);
                return;
            }

            const { error: ciErr } = await supabaseClient
                .from('event_checkins')
                .insert({
                    event_id: eventId,
                    user_id: rsvp.user_id,
                    checked_in_by: evtCurrentUser.id,
                    checkin_mode: 'attendee_ticket'
                });

            if (ciErr) throw ciErr;

            const name = `${rsvp.profiles?.first_name || ''} ${rsvp.profiles?.last_name || ''}`.trim();
            resultEl.innerHTML = `<span class="text-emerald-600 text-base">✅ Checked in — ${evtEscapeHtml(name)}</span>`;
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            evtResumeScanner(3000);
            return;
        }

        // 2) Try guest RSVP by guest_token
        const { data: guestRsvp, error: gErr } = await supabaseClient
            .from('event_guest_rsvps')
            .select('id, guest_name, guest_email, guest_token, paid')
            .eq('event_id', eventId)
            .eq('guest_token', qrToken)
            .maybeSingle();

        if (gErr) throw gErr;

        if (!guestRsvp || !guestRsvp.paid) {
            resultEl.innerHTML = '<span class="text-red-500">❌ Invalid ticket — no matching RSVP found.</span>';
            evtResumeScanner(3000);
            return;
        }

        // Check if guest already checked in
        const { data: gExisting } = await supabaseClient
            .from('event_checkins')
            .select('id')
            .eq('event_id', eventId)
            .eq('guest_token', guestRsvp.guest_token)
            .maybeSingle();

        if (gExisting) {
            resultEl.innerHTML = `<span class="text-amber-600">✅ Already checked in — ${evtEscapeHtml(guestRsvp.guest_name)} (Guest)</span>`;
            evtResumeScanner(3000);
            return;
        }

        // Create guest check-in
        const { error: gciErr } = await supabaseClient
            .from('event_checkins')
            .insert({
                event_id: eventId,
                guest_token: guestRsvp.guest_token,
                checked_in_by: evtCurrentUser.id,
                checkin_mode: 'attendee_ticket'
            });

        if (gciErr) throw gciErr;

        resultEl.innerHTML = `<span class="text-emerald-600 text-base">✅ Checked in — ${evtEscapeHtml(guestRsvp.guest_name)} (Guest)</span>`;
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        evtResumeScanner(3000);
    } catch (err) {
        console.error('Check-in error:', err);
        resultEl.innerHTML = `<span class="text-red-500">Check-in failed: ${err.message}</span>`;
        evtResumeScanner(3000);
    }
}

// ─── Resume Scanner After Delay ─────────────────────────

function evtResumeScanner(delay) {
    setTimeout(() => {
        if (evtScannerStream) {
            const video = document.getElementById('scannerVideo');
            const canvas = document.getElementById('scannerCanvas');
            const ctx = canvas.getContext('2d');
            const result = document.getElementById('scanResult');
            result.innerHTML = '<span class="text-gray-400">Point camera at next QR code…</span>';

            function tick() {
                if (!evtScannerStream) return;
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    if (typeof jsQR !== 'undefined') {
                        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
                        if (code) {
                            const qrData = evtParseQrData(code.data);
                            if (qrData && qrData.t) {
                                evtProcessCheckin(qrData.e || eventId, qrData.t, result);
                                return;
                            }
                        }
                    }
                }
                evtScannerAnimFrame = requestAnimationFrame(tick);
            }
            evtScannerAnimFrame = requestAnimationFrame(tick);
        }
    }, delay);
}

// ─── Close Scanner ──────────────────────────────────────

function evtCloseScanner() {
    if (evtScannerStream) {
        evtScannerStream.getTracks().forEach(t => t.stop());
        evtScannerStream = null;
    }
    if (evtScannerAnimFrame) {
        cancelAnimationFrame(evtScannerAnimFrame);
        evtScannerAnimFrame = null;
    }
    evtToggleModal('scannerModal', false);
}

;/* ===== js/portal/events/rsvp.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — RSVP + Status Updates
// Supports free RSVP (direct DB) and paid RSVP (Stripe).
// ═══════════════════════════════════════════════════════════

/** Member RSVP counts as "going" for raffle/ticket (parity with public pubHasRaffleEligibleRsvp). */
function evtIsGoingRsvp(rsvp) {
    return !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));
}

function evtIsRaffleEntriesOpen(event) {
    if (!event) return false;
    const now = new Date();
    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast = new Date(event.start_date) < now && event.status !== 'active';
    const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
    return !isClosed && !isPast && !deadlined;
}

/** Paid events bundle raffle with RSVP checkout (no separate raffle CTA on public page). */
function evtIsRaffleBundledWithPaidRsvp(event) {
    return event.pricing_mode === 'paid' && event.rsvp_enabled !== false;
}

function evtCanEnterMemberRaffle(event, rsvp, myRaffleEntry) {
    if (!event?.raffle_enabled || !evtIsRaffleEntriesOpen(event) || myRaffleEntry) return false;
    if (evtIsRaffleBundledWithPaidRsvp(event)) return !!(rsvp && rsvp.paid === true);
    return evtIsGoingRsvp(rsvp);
}

window.evtIsGoingRsvp = evtIsGoingRsvp;
window.evtIsRaffleEntriesOpen = evtIsRaffleEntriesOpen;
window.evtIsRaffleBundledWithPaidRsvp = evtIsRaffleBundledWithPaidRsvp;
window.evtCanEnterMemberRaffle = evtCanEnterMemberRaffle;

async function evtHandleRsvp(eventId, status) {
    try {
        // Look up event to check pricing mode
        const event = (window.evtAllEvents || evtAllEvents).find(e => e.id === eventId);
        if (!event) return;

        // ── Time-based guard (defense-in-depth) ─────────────
        const now = new Date();
        const isClosed  = event.status === 'completed' || event.status === 'cancelled';
        const isPast    = new Date(event.start_date) < now && event.status !== 'active';
        const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
        if (isClosed || isPast || deadlined) {
            alert('RSVPs are closed for this event.');
            return;
        }

        const isPaid = event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0;
        const rsvpMap = window.evtAllRsvps || evtAllRsvps;
        const existing = rsvpMap[eventId];

        // ── Paid RSVP path ──────────────────────────────────
        if (isPaid && status === 'going') {
            // If already paid, don't re-charge
            if (existing?.paid) {
                alert('You have already paid for this RSVP.');
                return;
            }

            // Show no-refund disclaimer before checkout
            const confirmPay = confirm(
                `RSVP costs ${formatCurrency(event.rsvp_cost_cents)}.\n\n` +
                'By completing your RSVP, you agree that your payment is non-refundable ' +
                'unless this event is cancelled or rescheduled by LLC staff.\n\n' +
                'Proceed to checkout?'
            );
            if (!confirmPay) return;

            // Call edge function → Stripe checkout
            const { url } = await callEdgeFunction('create-event-checkout', {
                event_id: eventId,
                type: 'rsvp',
            });

            if (url) {
                window.location.href = url;
            }
            return;
        }

        // ── Free RSVP path (original logic) ─────────────────
        if (existing) {
            // Block toggle-off for paid RSVPs (no self-refund)
            if (existing.paid) {
                alert('Paid RSVPs cannot be cancelled. Contact an admin for assistance.');
                return;
            }

            // If clicking same status, remove RSVP (toggle off)
            if (existing.status === status) {
                const { error } = await supabaseClient
                    .from('event_rsvps')
                    .delete()
                    .eq('id', existing.id);
                if (error) throw error;
                delete evtAllRsvps[eventId];
                if (window.evtAllRsvps) delete window.evtAllRsvps[eventId];
            } else {
                // Update status
                const { error } = await supabaseClient
                    .from('event_rsvps')
                    .update({ status })
                    .eq('id', existing.id);
                if (error) throw error;
                if (evtAllRsvps[eventId]) evtAllRsvps[eventId].status = status;
                if (window.evtAllRsvps?.[eventId]) window.evtAllRsvps[eventId].status = status;
            }
        } else {
            // Create or restore free RSVP. Local state can be stale after login,
            // so upsert protects the unique (event_id, user_id) row.
            const { data, error } = await supabaseClient
                .from('event_rsvps')
                .upsert({ event_id: eventId, user_id: evtCurrentUser.id, status }, { onConflict: 'event_id,user_id' })
                .select()
                .single();
            if (error) throw error;
            evtAllRsvps[eventId] = data;
            window.evtAllRsvps = window.evtAllRsvps || {};
            window.evtAllRsvps[eventId] = data;
        }

        // Refresh detail and card list
        evtRenderEvents();
        await evtOpenDetail(eventId);
        if (status === 'going' && window.evtCtaRaffleIntent === eventId) {
            window.evtCtaRaffleIntent = null;
            evtOpenCtaPanel('raffle', eventId);
        }
    } catch (err) {
        console.error('RSVP error:', err);
        alert('Failed to update RSVP. Please try again.');
    }
}

// ─── Paid Raffle Entry (Free Event + Paid Raffle mode) ──

async function evtHandleRaffleEntry(eventId) {
    try {
        const event = evtAllEvents.find(e => e.id === eventId);
        if (!event || !event.raffle_enabled) return;

        // ── Time-based guard (defense-in-depth) ─────────────
        const now = new Date();
        const isClosed  = event.status === 'completed' || event.status === 'cancelled';
        const isPast    = new Date(event.start_date) < now && event.status !== 'active';
        const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
        if (isClosed || isPast || deadlined) {
            alert('Raffle entries are closed for this event.');
            return;
        }

        if (!event.raffle_entry_cost_cents) {
            alert('Use Enter Raffle — Free for no-cost raffle entries.');
            return;
        }

        const rsvp = (window.evtAllRsvps || evtAllRsvps)[eventId];
        if (evtIsRaffleBundledWithPaidRsvp(event)) {
            alert('Raffle entry is included with your paid RSVP for this event.');
            return;
        }
        if (!evtIsGoingRsvp(rsvp)) {
            alert('Please RSVP before entering the raffle.');
            return;
        }

        const confirmPay = confirm(
            `Raffle entry costs ${formatCurrency(event.raffle_entry_cost_cents)}.\n\n` +
            'Raffle entry is non-refundable. Proceed to checkout?'
        );
        if (!confirmPay) return;

        const { url } = await callEdgeFunction('create-event-checkout', {
            event_id: eventId,
            type: 'raffle_entry',
        });

        if (url) {
            window.location.href = url;
        }
    } catch (err) {
        console.error('Raffle entry error:', err);
        alert('Failed to start raffle entry checkout. Please try again.');
    }
}

// ─── Free Raffle Entry (Signed-in Member) ───────────────

async function evtHandleFreeRaffleEntry(eventId) {
    try {
        const event = evtAllEvents.find(e => e.id === eventId);
        if (!event || !event.raffle_enabled) return;

        const now = new Date();
        const isClosed  = event.status === 'completed' || event.status === 'cancelled';
        const isPast    = new Date(event.start_date) < now && event.status !== 'active';
        const deadlined = event.rsvp_deadline && new Date(event.rsvp_deadline) < now;
        if (isClosed || isPast || deadlined) {
            alert('Raffle entries are closed for this event.');
            return;
        }

        const { data: session } = await supabaseClient.auth.getSession();
        if (!session?.session?.user) { alert('Please sign in to enter.'); return; }

        const rsvp = (window.evtAllRsvps || evtAllRsvps)[eventId];
        if (evtIsRaffleBundledWithPaidRsvp(event)) {
            alert('Raffle entry is included with your paid RSVP for this event.');
            return;
        }
        if (!evtIsGoingRsvp(rsvp)) {
            alert('Please RSVP before entering the raffle.');
            return;
        }

        const { error } = await supabaseClient
            .from('event_raffle_entries')
            .upsert({ event_id: eventId, user_id: session.session.user.id, paid: true }, { onConflict: 'event_id,user_id' });

        if (error) throw error;

        alert('You\'re entered into the raffle! Good luck! 🎟️');
        evtOpenDetail(eventId);
    } catch (err) {
        console.error('Free raffle entry error:', err);
        alert(err.message || 'Failed to enter raffle. Please try again.');
    }
}

// ─── Event Status Updates ───────────────────────────────

async function evtUpdateStatus(eventId, newStatus) {
    if (newStatus === 'cancelled' && !confirm('Are you sure you want to cancel this event?')) return;
    if (newStatus === 'completed' && !confirm('Mark this event as completed?')) return;

    try {
        const { error } = await supabaseClient
            .from('events')
            .update({ status: newStatus })
            .eq('id', eventId);
        if (error) throw error;

        await evtLoadEvents();
        evtNavigateToList();
    } catch (err) {
        console.error('Status update error:', err);
        alert('Failed to update event status.');
    }
}

// ═══════════════════════════════════════════════════════════
// LLC Event Actions — Waitlist, Cancel, Reschedule, Duplicate
// ═══════════════════════════════════════════════════════════

// ─── Join Waitlist ──────────────────────────────────────

async function evtJoinWaitlist(eventId) {
    try {
        // Get the next position
        const { data: maxPos } = await supabaseClient
            .from('event_waitlist')
            .select('position')
            .eq('event_id', eventId)
            .order('position', { ascending: false })
            .limit(1)
            .maybeSingle();

        const nextPos = (maxPos?.position || 0) + 1;

        const { error } = await supabaseClient
            .from('event_waitlist')
            .insert({
                event_id: eventId,
                user_id: evtCurrentUser.id,
                position: nextPos,
                status: 'waiting',
            });
        if (error) throw error;

        alert(`You're #${nextPos} on the waitlist! We'll notify you if a spot opens.`);
        await evtOpenDetail(eventId);
    } catch (err) {
        console.error('Join waitlist error:', err);
        alert(err.message?.includes('duplicate') ? 'You are already on the waitlist.' : 'Failed to join waitlist.');
    }
}

// ─── Leave Waitlist ─────────────────────────────────────

async function evtLeaveWaitlist(eventId) {
    if (!confirm('Leave the waitlist for this event?')) return;
    try {
        const { error } = await supabaseClient
            .from('event_waitlist')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', evtCurrentUser.id);
        if (error) throw error;

        await evtOpenDetail(eventId);
    } catch (err) {
        console.error('Leave waitlist error:', err);
        alert('Failed to leave waitlist.');
    }
}

// ─── Claim Waitlist Spot (triggers paid RSVP) ──────────

async function evtClaimWaitlistSpot(eventId) {
    try {
        const event = evtAllEvents.find(e => e.id === eventId);
        if (!event) return;

        const confirmPay = confirm(
            `A spot has opened up!\n\n` +
            `RSVP costs ${formatCurrency(event.rsvp_cost_cents)}.\n\n` +
            'By completing your RSVP, you agree that your payment is non-refundable ' +
            'unless this event is cancelled or rescheduled by LLC staff.\n\n' +
            'Proceed to checkout?'
        );
        if (!confirmPay) return;

        // Update waitlist status to 'claimed' so the spot is held
        await supabaseClient
            .from('event_waitlist')
            .update({ status: 'claimed' })
            .eq('event_id', eventId)
            .eq('user_id', evtCurrentUser.id);

        // Redirect to Stripe checkout
        const { url } = await callEdgeFunction('create-event-checkout', {
            event_id: eventId,
            type: 'rsvp',
            from_waitlist: true,
        });

        if (url) {
            window.location.href = url;
        }
    } catch (err) {
        console.error('Claim waitlist error:', err);
        alert('Failed to claim waitlist spot. Please try again.');
    }
}

// ─── Cancel Event (with refund processing) ──────────────

async function evtCancelEvent(eventId) {
    const event = evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    const isLlc = event.event_type === 'llc';
    let nonRefundableCents = 0;
    let cancellationNote = '';

    if (isLlc) {
        cancellationNote = prompt('Cancellation reason (visible to attendees):');
        if (cancellationNote === null) return; // user pressed Cancel

        const nonRefundableStr = prompt(
            'Enter the total non-refundable expenses already incurred (in dollars).\n' +
            'This amount will be deducted from each refund proportionally.\n' +
            'Enter 0 if fully refundable.',
            '0'
        );
        if (nonRefundableStr === null) return;
        nonRefundableCents = Math.round(parseFloat(nonRefundableStr || '0') * 100);
        if (isNaN(nonRefundableCents) || nonRefundableCents < 0) nonRefundableCents = 0;

        const msg = nonRefundableCents > 0
            ? `Cancel this event?\n\nNon-refundable expenses: ${formatCurrency(nonRefundableCents)}\nThis will be deducted proportionally from each attendee's refund.`
            : 'Cancel this event? All paid attendees will receive a full refund.';
        if (!confirm(msg)) return;
    } else {
        if (!confirm('Are you sure you want to cancel this event?')) return;
    }

    try {
        // Call edge function to process cancellation + refunds
        const result = await callEdgeFunction('process-event-cancellation', {
            event_id: eventId,
            reason: 'event_cancelled',
            cancellation_note: cancellationNote || 'Event cancelled by host',
            non_refundable_expenses_cents: nonRefundableCents,
        });

        alert(result.message || 'Event cancelled successfully.');
        await evtLoadEvents();
        evtNavigateToList();
    } catch (err) {
        console.error('Cancel event error:', err);
        alert('Failed to cancel event: ' + (err.message || 'Unknown error'));
    }
}

// ─── Reschedule Event (with 72h grace window) ───────────

async function evtRescheduleEvent(eventId) {
    const event = evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    const newDate = prompt('Enter new start date & time (YYYY-MM-DD HH:MM):', '');
    if (!newDate) return;

    const parsed = new Date(newDate.replace(' ', 'T'));
    if (isNaN(parsed.getTime())) {
        alert('Invalid date format. Use YYYY-MM-DD HH:MM');
        return;
    }
    if (parsed <= new Date()) {
        alert('New date must be in the future.');
        return;
    }

    const confirmMsg = `Reschedule this event to ${parsed.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })} at ${parsed.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}?\n\nAll attendees will receive a 72-hour grace window to request a full refund if the new date doesn't work for them.`;
    if (!confirm(confirmMsg)) return;

    try {
        const now = new Date();
        const graceEnd = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72h from now

        const { error } = await supabaseClient
            .from('events')
            .update({
                original_start_date: event.original_start_date || event.start_date,
                start_date: parsed.toISOString(),
                rescheduled_at: now.toISOString(),
                grace_window_end: graceEnd.toISOString(),
            })
            .eq('id', eventId);
        if (error) throw error;

        // Mark all paid RSVPs as grace-refund eligible
        await supabaseClient
            .from('event_rsvps')
            .update({ grace_refund_eligible: true })
            .eq('event_id', eventId)
            .eq('paid', true);

        alert('Event rescheduled! Attendees have been notified and have 72 hours to request a refund.');
        await evtLoadEvents();
        await evtOpenDetail(eventId);
    } catch (err) {
        console.error('Reschedule error:', err);
        alert('Failed to reschedule event.');
    }
}

// ─── Request Grace Window Refund ────────────────────────

async function evtRequestGraceRefund(eventId) {
    if (!confirm('Request a full refund because the rescheduled date doesn\'t work for you?\n\nThis action cannot be undone.')) return;

    try {
        const result = await callEdgeFunction('process-event-cancellation', {
            event_id: eventId,
            reason: 'reschedule_grace',
            user_id: evtCurrentUser.id,
            single_user_refund: true,
        });

        alert(result.message || 'Refund processed. You will receive it within 5-10 business days.');
        await evtLoadEvents();
        await evtOpenDetail(eventId);
    } catch (err) {
        console.error('Grace refund error:', err);
        alert('Failed to process refund: ' + (err.message || 'Unknown error'));
    }
}

// ─── Duplicate Event ────────────────────────────────────

async function evtDeleteEvent(eventId) {
    const event = evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    // Only allow admins to delete
    if (typeof canManageEvents !== 'function' || !canManageEvents()) {
        alert('Only users with event management permission can delete events.');
        return;
    }

    // Require typing the event title to confirm
    const typed = prompt(`This will permanently delete "${event.title}" and all associated RSVPs, check-ins, raffle entries, documents, and photos.\n\nType the event title to confirm:`);
    if (!typed || typed.trim() !== event.title.trim()) {
        if (typed !== null) alert('Event title did not match. Deletion cancelled.');
        return;
    }

    try {
        // CASCADE on FK handles child records (rsvps, checkins, guest_rsvps, raffle_entries, raffle_winners, cost_items, documents, photos, waitlist, hosts, checkins, locations, competition tables)
        const { error } = await supabaseClient
            .from('events')
            .delete()
            .eq('id', eventId);
        if (error) throw error;

        alert('Event deleted successfully.');
        evtNavigateToList();
        await evtLoadEvents();
    } catch (err) {
        console.error('Delete event error:', err);
        alert('Failed to delete event: ' + (err.message || 'Unknown error'));
    }
}

async function evtDuplicateEvent(eventId) {
    const event = evtAllEvents.find(e => e.id === eventId);
    if (!event) return;

    if (!confirm('Create a duplicate of this event? It will open in draft mode for editing.')) return;

    try {
        // Build new record without system-generated fields
        const newSlug = evtGenerateSlug(event.title + ' copy');
        const record = {
            title: event.title + ' (Copy)',
            slug: newSlug,
            description: event.description,
            event_type: event.event_type,
            category: event.category,
            member_only: event.member_only,
            banner_url: event.banner_url,
            location_text: event.location_text,
            location_url: event.location_url,
            gate_time: event.gate_time,
            gate_location: event.gate_location,
            gate_notes: event.gate_notes,
            gated_notes: event.gated_notes,
            max_participants: event.max_participants,
            pricing_mode: event.pricing_mode,
            rsvp_cost_cents: event.rsvp_cost_cents,
            raffle_enabled: event.raffle_enabled,
            raffle_prizes: event.raffle_prizes,
            raffle_entry_cost_cents: event.raffle_entry_cost_cents,
            checkin_mode: event.checkin_mode,
            created_by: evtCurrentUser.id,
            status: 'draft',
            // LLC fields
            llc_cut_pct: event.llc_cut_pct,
            invest_eligible: event.invest_eligible,
            min_participants: event.min_participants,
            cost_breakdown: event.cost_breakdown,
            transportation_mode: event.transportation_mode,
            transportation_estimate_cents: event.transportation_estimate_cents,
            location_required: event.location_required,
        };

        // Remove null/undefined values
        Object.keys(record).forEach(k => { if (record[k] == null) delete record[k]; });

        const { data: newEvent, error } = await supabaseClient
            .from('events')
            .insert(record)
            .select()
            .single();
        if (error) throw error;

        // Duplicate cost items if LLC
        if (event.event_type === 'llc') {
            const { data: origItems } = await supabaseClient
                .from('event_cost_items')
                .select('*')
                .eq('event_id', eventId)
                .order('sort_order');

            if (origItems && origItems.length > 0) {
                const newItems = origItems.map(item => ({
                    event_id: newEvent.id,
                    name: item.name,
                    category: item.category,
                    total_cost_cents: item.total_cost_cents,
                    included_in_buyin: item.included_in_buyin,
                    avg_per_person_cents: item.avg_per_person_cents,
                    notes: item.notes,
                    sort_order: item.sort_order,
                }));

                await supabaseClient.from('event_cost_items').insert(newItems);
            }
        }

        alert('Event duplicated! Opening the copy in draft mode.');
        await evtLoadEvents();
        const dupEvent = evtAllEvents.find(e => e.id === newEvent.id);
        if (dupEvent && dupEvent.slug) {
            evtNavigateToEvent(dupEvent.slug);
        } else {
            await evtOpenDetail(newEvent.id);
        }
    } catch (err) {
        console.error('Duplicate event error:', err);
        alert('Failed to duplicate event: ' + (err.message || 'Unknown error'));
    }
}

;/* ===== js/portal/events/create/geocode.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Create geocode helpers (Phase 5M.1.1)
//
// US Census (edge function) → Nominatim fallback.
// Public API: window.evtGeocodeAddress (used by create/sheet.js and legacy create.js)
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // Common US street-type abbreviations → full words for better geocoding
    const STREET_ABBREVS = {
        'crt': 'court', 'ct': 'court', 'dr': 'drive', 'st': 'street', 'ave': 'avenue',
        'blvd': 'boulevard', 'ln': 'lane', 'rd': 'road', 'pl': 'place', 'cir': 'circle',
        'pkwy': 'parkway', 'hwy': 'highway', 'trl': 'trail', 'ter': 'terrace',
        'trce': 'trace', 'cv': 'cove', 'pt': 'point', 'aly': 'alley', 'way': 'way'
    };

    // US state abbreviations → full names
    const STATE_ABBREVS = {
        'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas', 'ca': 'california',
        'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware', 'fl': 'florida', 'ga': 'georgia',
        'hi': 'hawaii', 'id': 'idaho', 'il': 'illinois', 'in': 'indiana', 'ia': 'iowa',
        'ks': 'kansas', 'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
        'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi',
        'mo': 'missouri', 'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada', 'nh': 'new hampshire',
        'nj': 'new jersey', 'nm': 'new mexico', 'ny': 'new york', 'nc': 'north carolina',
        'nd': 'north dakota', 'oh': 'ohio', 'ok': 'oklahoma', 'or': 'oregon', 'pa': 'pennsylvania',
        'ri': 'rhode island', 'sc': 'south carolina', 'sd': 'south dakota', 'tn': 'tennessee',
        'tx': 'texas', 'ut': 'utah', 'vt': 'vermont', 'va': 'virginia', 'wa': 'washington',
        'wv': 'west virginia', 'wi': 'wisconsin', 'wy': 'wyoming', 'dc': 'district of columbia'
    };

    function evtExpandAddress(raw) {
        let words = raw.trim().split(/\s+/);
        const streetTypes = new Set(Object.values(STREET_ABBREVS));
        let streetTypeIdx = -1;
        words = words.map((w, i) => {
            const lower = w.toLowerCase();
            if (STREET_ABBREVS[lower]) { streetTypeIdx = i; return STREET_ABBREVS[lower]; }
            if (streetTypes.has(lower)) { streetTypeIdx = i; }
            return w;
        });
        words = words.map(w => STATE_ABBREVS[w.toLowerCase()] || w);
        const expanded = words.join(' ');
        if (raw.includes(',')) return expanded;
        const zipMatch = expanded.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
        if (!zipMatch) return expanded;
        const beforeZip = zipMatch[1];
        const zip = zipMatch[2];
        const bParts = beforeZip.split(' ');
        let stateStart = -1;
        const stateVals = Object.values(STATE_ABBREVS);
        if (bParts.length >= 3) {
            const twoWord = (bParts[bParts.length - 2] + ' ' + bParts[bParts.length - 1]).toLowerCase();
            if (stateVals.includes(twoWord)) stateStart = bParts.length - 2;
        }
        if (stateStart < 0 && bParts.length >= 2) {
            if (stateVals.includes(bParts[bParts.length - 1].toLowerCase())) stateStart = bParts.length - 1;
        }
        if (stateStart < 0) return expanded;
        const statePart = bParts.slice(stateStart).join(' ');
        const preState = bParts.slice(0, stateStart);
        if (streetTypeIdx >= 0 && streetTypeIdx < preState.length - 1) {
            const street = preState.slice(0, streetTypeIdx + 1).join(' ');
            const city = preState.slice(streetTypeIdx + 1).join(' ');
            return `${street}, ${city}, ${statePart} ${zip}`;
        }
        return preState.join(' ') + ', ' + statePart + ' ' + zip;
    }

    async function evtGeocodeCensus(address) {
        const url = `${getFunctionUrl('geocode-address')}?address=${encodeURIComponent(address)}`;
        try {
            const resp = await fetch(url, {
                headers: { 'apikey': SUPABASE_ANON_KEY }
            });
            const data = await resp.json();
            if (data?.found) {
                return {
                    lat: data.lat,
                    lng: data.lng,
                    display: data.display
                };
            }
        } catch (err) { console.warn('Census geocoder failed:', err); }
        return null;
    }

    async function evtGeocodeNominatim(address) {
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(address)}`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const results = await resp.json();
            if (results && results.length > 0) {
                const best = results.find(r => r.class === 'place' || r.class === 'building') || results[0];
                return { lat: parseFloat(best.lat), lng: parseFloat(best.lon), display: best.display_name };
            }
        } catch (err) { console.warn('Nominatim geocoder failed:', err); }
        return null;
    }

    async function evtGeocodeAddress(address) {
        const expanded = evtExpandAddress(address);

        let result = await evtGeocodeCensus(address);
        if (result) return result;

        if (expanded !== address) {
            result = await evtGeocodeCensus(expanded);
            if (result) return result;
        }

        result = await evtGeocodeNominatim(expanded);
        if (result) return result;

        if (expanded !== address) {
            result = await evtGeocodeNominatim(address);
            if (result) return result;
        }

        return null;
    }

    window.evtExpandAddress = evtExpandAddress;
    window.evtGeocodeCensus = evtGeocodeCensus;
    window.evtGeocodeNominatim = evtGeocodeNominatim;
    window.evtGeocodeAddress = evtGeocodeAddress;
})();

;/* ===== js/portal/events/create/legacy-costs.js ===== */
// Portal Events — Legacy create: LLC cost breakdown (Phase 5M.1.5)
(function () {
    'use strict';

    const COST_CATEGORIES = [
        { value: 'lodging', label: '🏠 Lodging' },
        { value: 'transportation', label: '🚗 Transportation' },
        { value: 'food', label: '🍕 Food' },
        { value: 'gear', label: '🎿 Gear / Rentals' },
        { value: 'entertainment', label: '🎭 Entertainment' },
        { value: 'other', label: '📦 Other' },
    ];

    window.evtCostItems = window.evtCostItems || [];

    function evtToggleLlcFields() {
        const type = document.getElementById('eventType').value;
        const isLlc = type === 'llc';
        const isComp = type === 'competition';
        const llcSection = document.getElementById('llcFieldsSection');
        const compSection = document.getElementById('compFieldsSection');
        if (llcSection) llcSection.classList.toggle('hidden', !isLlc);
        if (compSection) compSection.classList.toggle('hidden', !isComp);
        if (isLlc) {
            const pm = document.getElementById('pricingMode');
            pm.value = 'paid';
            pm.dispatchEvent(new Event('change'));
            const rsvpCostGroup = document.getElementById('rsvpCostGroup');
            if (rsvpCostGroup) rsvpCostGroup.classList.add('hidden');
        }
        if (isComp) {
            document.getElementById('memberOnly').checked = true;
        }
    }

    function evtAddCostItem() {
        const id = crypto.randomUUID();
        window.evtCostItems.push({ id, name: '', category: 'other', total_cost_cents: 0, included_in_buyin: true, avg_per_person_cents: 0, notes: '' });
        evtRenderCostItems();
    }

    function evtRemoveCostItem(itemId) {
        window.evtCostItems = window.evtCostItems.filter(i => i.id !== itemId);
        evtRenderCostItems();
        evtRecalcCostSummary();
    }

    function evtRenderCostItems() {
        const container = document.getElementById('costItemsList');
        if (!container) return;
        const items = window.evtCostItems;
        container.innerHTML = items.map((item, idx) => `
        <div class="bg-white border border-gray-200 rounded-xl p-3 space-y-2" data-cost-id="${item.id}">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-gray-400">#${idx + 1}</span>
                <button type="button" onclick="evtRemoveCostItem('${item.id}')" class="text-red-400 hover:text-red-600 transition p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Item name" value="${evtEscapeHtml(item.name)}" onchange="evtUpdateCostItem('${item.id}','name',this.value)"
                       class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                <select onchange="evtUpdateCostItem('${item.id}','category',this.value)"
                        class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                    ${COST_CATEGORIES.map(c => `<option value="${c.value}" ${item.category === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-xs text-gray-500">Total Cost ($)</label>
                    <input type="number" min="0" step="1" value="${item.total_cost_cents ? (item.total_cost_cents / 100) : ''}" placeholder="0"
                           onchange="evtUpdateCostItem('${item.id}','total_cost_cents',Math.round(this.value*100))"
                           class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                </div>
                <div>
                    <label class="text-xs text-gray-500">Type</label>
                    <select onchange="evtUpdateCostItem('${item.id}','included_in_buyin',this.value==='true')"
                            class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                        <option value="true" ${item.included_in_buyin ? 'selected' : ''}>Included in Buy-In</option>
                        <option value="false" ${!item.included_in_buyin ? 'selected' : ''}>Out of Pocket</option>
                    </select>
                </div>
            </div>
            ${!item.included_in_buyin ? `
            <div>
                <label class="text-xs text-gray-500">Avg Per Person ($)</label>
                <input type="number" min="0" step="1" value="${item.avg_per_person_cents ? (item.avg_per_person_cents / 100) : ''}" placeholder="0"
                       onchange="evtUpdateCostItem('${item.id}','avg_per_person_cents',Math.round(this.value*100))"
                       class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
            </div>` : ''}
            <input type="text" placeholder="Notes / source link (optional)" value="${evtEscapeHtml(item.notes || '')}" onchange="evtUpdateCostItem('${item.id}','notes',this.value)"
                   class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 focus:border-transparent">
        </div>`).join('');
    }

    function evtUpdateCostItem(itemId, field, value) {
        const item = window.evtCostItems.find(i => i.id === itemId);
        if (item) {
            item[field] = value;
            if (field === 'included_in_buyin') evtRenderCostItems();
            evtRecalcCostSummary();
        }
    }

    function evtRecalcCostSummary() {
        const summary = document.getElementById('costSummary');
        if (!summary) return;

        const minPart = parseInt(document.getElementById('eventMinParticipants')?.value) || 0;
        const llcCutPct = parseFloat(document.getElementById('eventLlcCut').value) || 0;
        const items = window.evtCostItems;

        const totalIncluded = items.filter(i => i.included_in_buyin).reduce((sum, i) => sum + (i.total_cost_cents || 0), 0);
        const totalOop = items.filter(i => !i.included_in_buyin).reduce((sum, i) => sum + (i.avg_per_person_cents || 0), 0);

        if (items.length === 0) { summary.classList.add('hidden'); return; }
        summary.classList.remove('hidden');

        const baseBuyIn = minPart > 0 ? Math.ceil(totalIncluded / minPart) : 0;
        const llcCutAmount = Math.round(baseBuyIn * llcCutPct / 100);
        const finalBuyIn = baseBuyIn + llcCutAmount;

        document.getElementById('costTotalIncluded').textContent = formatCurrency(totalIncluded);
        document.getElementById('costMaxPart').textContent = minPart > 0 ? minPart : '—';
        document.getElementById('costBuyIn').textContent = minPart > 0 ? `${formatCurrency(finalBuyIn)}/person` : 'Set min participants';
        document.getElementById('costOop').textContent = `~${formatCurrency(totalOop)}/person`;
        document.getElementById('costGrandTotal').textContent = minPart > 0 ? `~${formatCurrency(finalBuyIn + totalOop)}` : '—';

        const llcRow = document.getElementById('costLlcCutRow');
        if (llcCutPct > 0 && minPart > 0) {
            llcRow.classList.remove('hidden');
            document.getElementById('costLlcPct').textContent = llcCutPct;
            document.getElementById('costLlcAmount').textContent = `+${formatCurrency(llcCutAmount)}`;
        } else {
            llcRow.classList.add('hidden');
        }

        const overrideInput = document.getElementById('llcRsvpOverride');
        if (minPart > 0 && overrideInput && !overrideInput.dataset.userEdited) {
            overrideInput.value = Math.ceil(finalBuyIn / 100);
            overrideInput.placeholder = `Suggested: $${Math.ceil(finalBuyIn / 100)}`;
        }
    }

    window.evtToggleLlcFields = evtToggleLlcFields;
    window.evtAddCostItem = evtAddCostItem;
    window.evtRemoveCostItem = evtRemoveCostItem;
    window.evtRenderCostItems = evtRenderCostItems;
    window.evtUpdateCostItem = evtUpdateCostItem;
    window.evtRecalcCostSummary = evtRecalcCostSummary;
})();

;/* ===== js/portal/events/create/legacy-location.js ===== */
// Portal Events — Legacy create: location validation (Phase 5M.1.5)
(function () {
    'use strict';

    window._evtLocGeoCache = null;
    let _evtLocDebounce = null;

    function evtSetLocationIcon(state) {
        const wrap    = document.getElementById('locationIcon');
        const spinner = document.getElementById('locIconSpinner');
        const check   = document.getElementById('locIconCheck');
        const warn    = document.getElementById('locIconWarn');
        if (!wrap) return;

        spinner.classList.add('hidden');
        check.classList.add('hidden');
        warn.classList.add('hidden');

        if (state === 'hide') { wrap.classList.add('hidden'); return; }
        wrap.classList.remove('hidden');
        if (state === 'spin')  spinner.classList.remove('hidden');
        if (state === 'check') check.classList.remove('hidden');
        if (state === 'warn')  warn.classList.remove('hidden');
    }

    function evtSetLocationStatus(text, color) {
        const el = document.getElementById('locationStatus');
        if (!el) return;
        if (!text) { el.classList.add('hidden'); el.textContent = ''; return; }
        el.textContent = text;
        el.className = `text-xs mt-1 ${color}`;
        el.classList.remove('hidden');
    }

    async function evtValidateLocation() {
        const input = document.getElementById('eventLocation');
        const address = input ? input.value.trim() : '';

        if (!address) {
            window._evtLocGeoCache = null;
            evtSetLocationIcon('hide');
            evtSetLocationStatus('', '');
            return;
        }

        if (window._evtLocGeoCache && window._evtLocGeoCache.address === address) return;

        evtSetLocationIcon('spin');
        evtSetLocationStatus('Validating address…', 'text-gray-400');

        const result = await window.evtGeocodeAddress(address);

        const current = input.value.trim();
        if (current !== address) return;

        window._evtLocGeoCache = { address, result };

        if (result) {
            evtSetLocationIcon('check');
            evtSetLocationStatus(`✓ ${result.display}`, 'text-green-600');
        } else {
            evtSetLocationIcon('warn');
            evtSetLocationStatus('Address not found — event will have no map pin', 'text-amber-600');
        }
    }

    function evtInitLocationValidation() {
        const input = document.getElementById('eventLocation');
        if (!input) return;

        input.addEventListener('input', () => {
            clearTimeout(_evtLocDebounce);
            _evtLocDebounce = setTimeout(evtValidateLocation, 800);
        });

        input.addEventListener('blur', () => {
            clearTimeout(_evtLocDebounce);
            evtValidateLocation();
        });
    }

    window.evtSetLocationIcon = evtSetLocationIcon;
    window.evtSetLocationStatus = evtSetLocationStatus;
    window.evtValidateLocation = evtValidateLocation;
    window.evtInitLocationValidation = evtInitLocationValidation;
})();

;/* ===== js/portal/events/create/legacy-preview.js ===== */
// Portal Events — Legacy create: preview (Phase 5M.1.5)
(function () {
    'use strict';

    function evtHandlePreview() {
        const title = document.getElementById('eventTitle').value.trim() || 'Untitled Event';
        const desc = document.getElementById('eventDescription').value.trim() || 'No description yet.';
        const start = document.getElementById('eventStart').value;
        const location = document.getElementById('eventLocation').value.trim();
        const dateStr = start ? new Date(start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
        const timeStr = start ? new Date(start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD';

        const bannerBg = evtBannerFile
            ? `background-image:url('${URL.createObjectURL(evtBannerFile)}');background-size:cover;background-position:center;`
            : `background:linear-gradient(135deg,#6366f1,#8b5cf6);`;

        const gateTime = document.getElementById('gateTime').checked;
        const gateLocation = document.getElementById('gateLocation').checked;

        document.getElementById('eventsDetailView').innerHTML = `
        <div class="relative" style="${bannerBg} min-height:280px;">
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 pointer-events-none"></div>
            <div class="absolute top-0 left-0" style="padding-top:max(1rem, env(safe-area-inset-top)); padding-left:1rem;">
                <button onclick="evtClosePreview()" class="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 hover:bg-black/50 transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    Back to Editor
                </button>
            </div>
            <div class="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <div class="mb-2"><span class="type-tag bg-amber-100 text-amber-700">PREVIEW</span></div>
                <h2 class="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg">${evtEscapeHtml(title)}</h2>
            </div>
        </div>
        <div class="p-5 sm:p-6">
            <div class="mt-4 space-y-2 text-gray-600">
                <div class="flex items-center gap-2.5">
                    <svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span class="text-lg font-bold text-gray-900">${dateStr}</span>
                </div>
                ${!gateTime ? `<div class="flex items-center gap-2.5 ml-[30px]"><span class="text-base font-semibold text-gray-700">${timeStr}</span></div>` : '<div class="flex items-center gap-2 text-gray-400 italic text-sm"><svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><span>Time revealed after RSVP</span></div>'}
                ${location && !gateLocation ? `<div class="flex items-center gap-2.5 mt-1"><svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg><span class="text-base font-semibold text-gray-700">${evtEscapeHtml(location)}</span></div>` : location && gateLocation ? '<div class="flex items-center gap-2 text-gray-400 italic text-sm"><svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><span>Location revealed after RSVP</span></div>' : ''}
            </div>
            <div class="mt-5"><p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">${evtEscapeHtml(desc)}</p></div>
            <div class="mt-6 p-4 bg-amber-50 rounded-xl text-center">
                <p class="text-sm text-amber-700 font-semibold">This is a preview — the event is not published yet.</p>
            </div>
        </div>
    `;
        evtToggleModal('createModal', false);
        document.getElementById('eventsListView')?.classList.add('hidden');
        document.getElementById('eventsDetailView')?.classList.remove('hidden');
    }

    function evtClosePreview() {
        document.getElementById('eventsDetailView').innerHTML = '';
        document.getElementById('eventsDetailView')?.classList.add('hidden');
        document.getElementById('eventsListView')?.classList.remove('hidden');
        evtToggleModal('createModal', true);
    }

    window.evtHandlePreview = evtHandlePreview;
    window.evtClosePreview = evtClosePreview;
})();

;/* ===== js/portal/events/create/legacy-submit.js ===== */
// Portal Events — Legacy create: #createEventForm submit (Phase 5M.1.5)
(function () {
    'use strict';

    async function evtHandleCreate(e) {
        e.preventDefault();

        const publishBtn = document.getElementById('publishEventBtn');
        publishBtn.disabled = true;
        publishBtn.textContent = 'Publishing…';

        try {
            const title = document.getElementById('eventTitle').value.trim();
            const slug = evtGenerateSlug(title);
            const checkinMode = document.querySelector('input[name="checkinMode"]:checked').value;
            const eventType = document.getElementById('eventType').value;
            const isLlc = eventType === 'llc';
            const checkinEnabled = document.getElementById('checkinEnabled').checked;
            const rsvpEnabled = document.getElementById('rsvpEnabled').checked;

            let bannerUrl = null;
            if (evtBannerFile) {
                const ext = evtBannerFile.name.split('.').pop();
                const path = `${slug}-${Date.now()}.${ext}`;
                const { error: upErr } = await supabaseClient.storage
                    .from('event-banners')
                    .upload(path, evtBannerFile, { contentType: evtBannerFile.type });
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabaseClient.storage
                    .from('event-banners')
                    .getPublicUrl(path);
                bannerUrl = publicUrl;
            }

            let embedImageUrl = null;
            if (evtEmbedImageFile) {
                const ext = evtEmbedImageFile.name.split('.').pop();
                const path = `embeds/${slug}-${Date.now()}.${ext}`;
                const { error: upErr } = await supabaseClient.storage
                    .from('event-banners')
                    .upload(path, evtEmbedImageFile, { contentType: evtEmbedImageFile.type });
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabaseClient.storage
                    .from('event-banners')
                    .getPublicUrl(path);
                embedImageUrl = publicUrl;
            }

            const pricingMode = document.getElementById('pricingMode').value;
            const raffleEnabled = document.getElementById('raffleEnabled').checked;
            const raffleEntryCostDollars = parseInt(document.getElementById('raffleEntryCostDollars').value) || 0;

            const maxPart = document.getElementById('eventMax').value ? parseInt(document.getElementById('eventMax').value) : null;
            const minPart = document.getElementById('eventMinParticipants')?.value ? parseInt(document.getElementById('eventMinParticipants').value) : null;
            let rsvpCostCents = 0;
            let costBreakdownSummary = null;
            const costItems = window.evtCostItems || [];
            if (isLlc && costItems.length > 0 && (minPart || maxPart)) {
                const llcCutPct = parseFloat(document.getElementById('eventLlcCut').value) || 0;
                const totalIncluded = costItems.filter(i => i.included_in_buyin).reduce((sum, i) => sum + (i.total_cost_cents || 0), 0);
                const totalOop = costItems.filter(i => !i.included_in_buyin).reduce((sum, i) => sum + (i.avg_per_person_cents || 0), 0);
                const divisor = minPart || maxPart;
                const baseBuyIn = Math.ceil(totalIncluded / divisor);
                const llcCut = Math.round(baseBuyIn * llcCutPct / 100);
                const suggestedCents = baseBuyIn + llcCut;
                costBreakdownSummary = { total_included_cents: totalIncluded, total_oop_per_person_cents: totalOop, base_buyin_cents: baseBuyIn, llc_cut_cents: llcCut, final_buyin_cents: suggestedCents };

                const overrideVal = parseInt(document.getElementById('llcRsvpOverride')?.value);
                rsvpCostCents = overrideVal > 0 ? overrideVal * 100 : suggestedCents;
            } else if (isLlc) {
                const overrideVal = parseInt(document.getElementById('llcRsvpOverride')?.value) || 0;
                rsvpCostCents = overrideVal * 100;
            } else if (!isLlc) {
                const rsvpCostDollars = parseInt(document.getElementById('rsvpCostDollars').value) || 0;
                rsvpCostCents = pricingMode === 'paid' ? rsvpCostDollars * 100 : 0;
            }

            const record = {
                created_by: evtCurrentUser.id,
                event_type: eventType,
                title,
                slug,
                category: document.getElementById('eventCategory').value,
                description: document.getElementById('eventDescription').value.trim(),
                gated_notes: document.getElementById('eventGatedNotes').value.trim() || null,
                banner_url: bannerUrl,
                embed_image_url: embedImageUrl,
                start_date: new Date(document.getElementById('eventStart').value).toISOString(),
                end_date: document.getElementById('eventEnd').value ? new Date(document.getElementById('eventEnd').value).toISOString() : null,
                timezone: document.getElementById('eventTimezone').value,
                location_nickname: document.getElementById('eventLocationNickname').value.trim() || null,
                location_text: document.getElementById('eventLocation').value.trim() || null,
                max_participants: maxPart,
                rsvp_deadline: document.getElementById('eventRsvpDeadline').value ? new Date(document.getElementById('eventRsvpDeadline').value).toISOString() : null,
                checkin_mode: checkinEnabled ? checkinMode : null,
                checkin_enabled: checkinEnabled,
                rsvp_enabled: rsvpEnabled,
                member_only: document.getElementById('memberOnly').checked,
                gate_time: document.getElementById('gateTime').checked,
                gate_location: document.getElementById('gateLocation').checked,
                gate_notes: document.getElementById('gateNotes').checked,
                pricing_mode: pricingMode,
                rsvp_cost_cents: rsvpCostCents,
                raffle_entry_cost_cents: (raffleEnabled && pricingMode !== 'paid') ? raffleEntryCostDollars * 100 : 0,
                raffle_enabled: raffleEnabled,
                status: 'open',
            };

            if (record.location_text) {
                let geo = null;
                if (window._evtLocGeoCache && window._evtLocGeoCache.address === record.location_text && window._evtLocGeoCache.result) {
                    geo = window._evtLocGeoCache.result;
                } else {
                    publishBtn.textContent = 'Validating address…';
                    geo = await window.evtGeocodeAddress(record.location_text);
                }
                if (geo) {
                    record.location_lat = geo.lat;
                    record.location_lng = geo.lng;
                } else {
                    if (!confirm('Could not verify that address on the map. The event will be created without a map pin.\n\nPublish anyway?')) {
                        publishBtn.disabled = false;
                        publishBtn.textContent = 'Publish Event';
                        return;
                    }
                }
                publishBtn.textContent = 'Publishing…';
            }

            if (isLlc) {
                record.min_participants = parseInt(document.getElementById('eventMinParticipants').value) || null;
                record.llc_cut_pct = parseFloat(document.getElementById('eventLlcCut').value) || 0;
                record.invest_eligible = document.getElementById('investEligible').checked;
                record.show_cost_breakdown = document.getElementById('showCostBreakdown').checked;
                record.cost_breakdown = costBreakdownSummary;
                const transportEnabled = document.getElementById('transportationEnabled').checked;
                record.transportation_enabled = transportEnabled;
                record.transportation_mode = transportEnabled ? document.getElementById('eventTransportation').value : null;
                record.transportation_estimate_cents = transportEnabled && document.getElementById('eventTransportation').value === 'self_arranged'
                    ? Math.round((parseFloat(document.getElementById('eventTransportEstimate').value) || 0) * 100)
                    : null;
                record.location_required = document.getElementById('locationRequired').checked;
            }

            const isComp = eventType === 'competition';
            if (isComp) {
                const tier1 = parseInt(document.getElementById('compTier1Pct').value) || 100;
                const tier2 = parseInt(document.getElementById('compTier2Pct').value) || 0;
                const tier3 = parseInt(document.getElementById('compTier3Pct').value) || 0;
                const entryFeeDollars = parseFloat(document.getElementById('compEntryFee').value) || 0;

                record.competition_config = {
                    entry_type: document.getElementById('compEntryType').value,
                    entry_fee_cents: Math.round(entryFeeDollars * 100),
                    house_pct: parseFloat(document.getElementById('compHousePct').value) || 0,
                    min_entries: parseInt(document.getElementById('compMinEntries').value) || 2,
                    extension_days: parseInt(document.getElementById('compExtensionDays').value) || 3,
                    entries_visible_before_voting: document.getElementById('compEntriesVisible').checked,
                    voter_eligibility: document.getElementById('compVoterEligibility').value,
                    vote_tally_visible: document.getElementById('compVoteTallyVisible').checked,
                };
                record.winner_tier_config = [
                    { place: 1, pct: tier1 },
                    ...(tier2 > 0 ? [{ place: 2, pct: tier2 }] : []),
                    ...(tier3 > 0 ? [{ place: 3, pct: tier3 }] : []),
                ];
                record.member_only = true;
                record.pricing_mode = entryFeeDollars > 0 ? 'paid' : 'free';
                record.rsvp_cost_cents = 0;
            }

            if (checkinEnabled && checkinMode === 'venue_scan') {
                record.venue_qr_token = crypto.randomUUID();
            }

            if (raffleEnabled) {
                record.raffle_type = document.getElementById('raffleType').value;
                record.raffle_draw_trigger = document.getElementById('raffleDrawTrigger').value;

                const prizesContainer = document.getElementById('rafflePrizesList');
                const prizeInputs = prizesContainer
                    ? prizesContainer.querySelectorAll('input[type="text"]')
                    : document.querySelectorAll('input[name="rafflePrize"]');
                const prizes = [];
                prizeInputs.forEach((input, i) => {
                    const desc = input.value.trim();
                    if (desc) prizes.push({ place: i + 1, description: desc });
                });
                record.raffle_prizes = prizes.length > 0 ? prizes : null;
            }

            const { data, error } = await supabaseClient
                .from('events')
                .insert(record)
                .select()
                .single();

            if (error) throw error;

            if (isLlc && costItems.length > 0) {
                const costRows = costItems.map((item, idx) => ({
                    event_id: data.id,
                    name: item.name,
                    category: item.category,
                    total_cost_cents: item.total_cost_cents || 0,
                    included_in_buyin: item.included_in_buyin,
                    avg_per_person_cents: item.avg_per_person_cents || 0,
                    notes: item.notes || null,
                    sort_order: idx,
                }));
                const { error: costErr } = await supabaseClient.from('event_cost_items').insert(costRows);
                if (costErr) console.error('Cost items insert error:', costErr);
            }

            if (isComp) {
                const eventStart = new Date(document.getElementById('eventStart').value);
                const p1End = document.getElementById('compPhase1End').value ? new Date(document.getElementById('compPhase1End').value) : null;
                const p2End = document.getElementById('compPhase2End').value ? new Date(document.getElementById('compPhase2End').value) : null;
                const p3End = document.getElementById('compPhase3End').value ? new Date(document.getElementById('compPhase3End').value) : null;

                const phases = [
                    { event_id: data.id, phase_num: 1, name: 'Registration', description: 'Sign up as a competitor and build the prize pool.', starts_at: eventStart.toISOString(), ends_at: p1End ? p1End.toISOString() : eventStart.toISOString(), status: 'pending' },
                    { event_id: data.id, phase_num: 2, name: 'Active Competition', description: 'Submit your entry before the deadline.', starts_at: p1End ? p1End.toISOString() : eventStart.toISOString(), ends_at: p2End ? p2End.toISOString() : eventStart.toISOString(), status: 'pending' },
                    { event_id: data.id, phase_num: 3, name: 'Voting', description: 'Vote for your favorite entry. One vote per person.', starts_at: p2End ? p2End.toISOString() : eventStart.toISOString(), ends_at: p3End ? p3End.toISOString() : eventStart.toISOString(), status: 'pending' },
                    { event_id: data.id, phase_num: 4, name: 'Results', description: 'Winners announced and prizes distributed.', starts_at: p3End ? p3End.toISOString() : eventStart.toISOString(), ends_at: document.getElementById('eventEnd').value ? new Date(document.getElementById('eventEnd').value).toISOString() : (p3End ? p3End.toISOString() : eventStart.toISOString()), status: 'pending' },
                ];
                const { error: phaseErr } = await supabaseClient.from('competition_phases').insert(phases);
                if (phaseErr) console.error('Competition phases insert error:', phaseErr);
            }

            document.getElementById('createEventForm').reset();
            evtBannerFile = null;
            evtEmbedImageFile = null;
            window.evtCostItems = [];
            window._evtLocGeoCache = null;
            window.evtSetLocationIcon('hide');
            window.evtSetLocationStatus('', '');
            document.getElementById('bannerPreviewWrap').classList.add('hidden');
            document.getElementById('bannerUploadHint').classList.remove('hidden');
            document.getElementById('embedImagePreviewWrap')?.classList.add('hidden');
            document.getElementById('embedImageUploadHint')?.classList.remove('hidden');
            document.getElementById('llcFieldsSection')?.classList.add('hidden');
            document.getElementById('compFieldsSection')?.classList.add('hidden');
            document.getElementById('costItemsList') && (document.getElementById('costItemsList').innerHTML = '');
            document.getElementById('costSummary')?.classList.add('hidden');
            evtToggleModal('createModal', false);

            await evtLoadEvents();
            evtNavigateToEvent(data.slug);
        } catch (err) {
            console.error('Create event error:', err);
            alert(`Failed to create event: ${err.message}`);
        } finally {
            publishBtn.disabled = false;
            publishBtn.textContent = 'Publish Event';
        }
    }

    window.evtHandleCreate = evtHandleCreate;
})();

;/* ===== js/portal/events/create/step-basics.js ===== */
// Portal Events — Create sheet: Basics step (Phase 5M.1.2)
(function () {
    'use strict';

    function _esc(s) {
        return window.EventsCreateSteps.esc(s);
    }

    function _setImageFile(imageFile, fileKey, previewKey) {
        const STATE = window.EventsCreateSteps.getState();
        if (!imageFile) return;
        if (!imageFile.type.match(/^image\/(png|jpeg|webp)$/)) { alert('Please choose a PNG, JPG, or WebP image.'); return; }
        if (imageFile.size > 5 * 1024 * 1024) { alert('File must be under 5 MB.'); return; }
        STATE[fileKey] = imageFile;
        const reader = new FileReader();
        reader.onload = () => {
            STATE[previewKey] = reader.result;
            window.EventsCreateSteps.render();
        };
        reader.readAsDataURL(imageFile);
    }

    function _wireImageUpload(dropId, fileId, clearId, fileKey, previewKey) {
        const STATE = window.EventsCreateSteps.getState();
        const drop = document.getElementById(dropId);
        const file = document.getElementById(fileId);

        if (drop && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
            const dt = drop.querySelector('.ec-drop-hint-desktop');
            const tt = drop.querySelector('.ec-drop-hint-touch');
            if (dt) dt.style.display = '';
            if (tt) tt.style.display = 'none';
        }

        drop?.addEventListener('click', () => file.click());
        drop?.addEventListener('dragover', (e) => {
            e.preventDefault();
            drop.classList.add('ec-banner-drop--over');
        });
        drop?.addEventListener('dragleave', (e) => {
            if (!drop.contains(e.relatedTarget)) {
                drop.classList.remove('ec-banner-drop--over');
            }
        });
        drop?.addEventListener('drop', (e) => {
            e.preventDefault();
            drop.classList.remove('ec-banner-drop--over');
            _setImageFile(e.dataTransfer?.files?.[0], fileKey, previewKey);
        });

        file?.addEventListener('change', () => _setImageFile(file.files[0], fileKey, previewKey));
        document.getElementById(clearId)?.addEventListener('click', () => {
            STATE[fileKey] = null;
            STATE[previewKey] = null;
            if (file) file.value = '';
            window.EventsCreateSteps.render();
        });
    }

    function html() {
        const STATE = window.EventsCreateSteps.getState();
        const CATEGORIES = window.EventsCreateSteps.CATEGORIES;
        const f = STATE.form;
        const types = [
            { key:'member', emoji:'👥', label:'Member event', sub:'Anyone can RSVP', enabled:true },
            { key:'llc', emoji:'🏢', label:'LLC event', sub:'Use legacy editor for now', enabled:false },
            { key:'competition', emoji:'🏆', label:'Competition', sub:'Use legacy editor for now', enabled:false },
        ];
        return `
            <div class="ec-row">
                <label class="ec-label">Event type</label>
                <div class="ec-grid-2" style="grid-template-columns:1fr 1fr 1fr">
                    ${types.map(t => `
                        <div class="ec-type-card ${f.event_type === t.key ? 'active' : ''} ${!t.enabled ? 'disabled' : ''}" data-type="${t.key}" ${!t.enabled ? 'data-disabled="1"' : ''}>
                            <div class="ec-type-emoji">${t.emoji}</div>
                            <div class="text-sm font-bold text-gray-800 mt-1">${t.label}</div>
                            <div class="text-xs text-gray-500">${t.sub}</div>
                        </div>
                    `).join('')}
                </div>
                <p class="ec-help">LLC &amp; Competition events use the legacy form — select Member to continue here.</p>
            </div>

            <div class="ec-row">
                <label class="ec-label">Title</label>
                <input id="ecTitle" class="ec-input" type="text" maxlength="120" placeholder="What's the occasion?" value="${_esc(f.title)}">
            </div>

            <div class="ec-row">
                <label class="ec-label">Category</label>
                <div style="display:flex;flex-wrap:wrap;gap:6px">
                    ${CATEGORIES.map(c =>
                        `<button type="button" class="ec-pill ${f.category === c.key ? 'active' : ''}" data-cat="${c.key}">${c.label}</button>`
                    ).join('')}
                </div>
            </div>

            <div class="ec-row">
                <label class="ec-label">Description</label>
                <textarea id="ecDesc" class="ec-input ec-textarea" maxlength="2000" placeholder="Tell members what to expect…">${_esc(f.description)}</textarea>
            </div>

            <div class="ec-row">
                <label class="ec-label">Banner image (optional)</label>
                <input id="ecBannerFile" type="file" accept="image/png,image/jpeg,image/webp" style="display:none">
                ${STATE.bannerPreviewUrl
                    ? `<div><img src="${STATE.bannerPreviewUrl}" class="ec-banner-preview" alt=""><button type="button" id="ecBannerClear" class="text-xs text-red-600 font-semibold mt-1">Remove</button></div>`
                    : `<div id="ecBannerDrop" class="ec-banner-drop">
                            <div style="font-size:28px">🖼️</div>
                            <div class="text-sm font-semibold text-gray-700 mt-1"><span class="ec-drop-hint-desktop" style="display:none">Drag &amp; drop or click to upload</span><span class="ec-drop-hint-touch">Tap to upload</span></div>
                            <div class="text-xs text-gray-400">PNG / JPG / WebP · max 5 MB</div>
                       </div>`
                }
                <p class="ec-help">Landscape image for event pages and cards.</p>
            </div>

            <div class="ec-row">
                <label class="ec-label">Embed image (optional)</label>
                <input id="ecEmbedImageFile" type="file" accept="image/png,image/jpeg,image/webp" style="display:none">
                ${STATE.embedImagePreviewUrl
                    ? `<div><img src="${STATE.embedImagePreviewUrl}" class="ec-embed-preview" alt=""><button type="button" id="ecEmbedImageClear" class="text-xs text-red-600 font-semibold mt-1">Remove</button></div>`
                    : `<div id="ecEmbedImageDrop" class="ec-banner-drop">
                            <div style="font-size:28px">▣</div>
                            <div class="text-sm font-semibold text-gray-700 mt-1"><span class="ec-drop-hint-desktop" style="display:none">Drag &amp; drop or click to upload</span><span class="ec-drop-hint-touch">Tap to upload</span></div>
                            <div class="text-xs text-gray-400">Portrait works best · PNG / JPG / WebP · max 5 MB</div>
                       </div>`
                }
                <p class="ec-help">Used only for iMessage, Discord, and other link previews. Falls back to the banner if empty.</p>
            </div>
        `;
    }

    function wire() {
        const STATE = window.EventsCreateSteps.getState();
        document.querySelectorAll('[data-type]').forEach(el => {
            el.addEventListener('click', () => {
                if (el.dataset.disabled) return;
                STATE.form.event_type = el.dataset.type;
                window.EventsCreateSteps.render();
            });
        });
        document.querySelectorAll('[data-cat]').forEach(el => {
            el.addEventListener('click', () => {
                STATE.form.category = el.dataset.cat;
                window.EventsCreateSteps.render();
            });
        });
        document.getElementById('ecTitle')?.addEventListener('input', e => STATE.form.title = e.target.value);
        document.getElementById('ecDesc')?.addEventListener('input', e => STATE.form.description = e.target.value);

        _wireImageUpload('ecBannerDrop', 'ecBannerFile', 'ecBannerClear', 'bannerFile', 'bannerPreviewUrl');
        _wireImageUpload('ecEmbedImageDrop', 'ecEmbedImageFile', 'ecEmbedImageClear', 'embedImageFile', 'embedImagePreviewUrl');
    }

    window.EventsCreateSteps = window.EventsCreateSteps || {};
    window.EventsCreateSteps.basics = { html, wire };
})();

;/* ===== js/portal/events/create/step-when.js ===== */
// Portal Events — Create sheet: When & Where step (Phase 5M.1.2)
(function () {
    'use strict';

    let _locDebounce;

    function _esc(s) {
        return window.EventsCreateSteps.esc(s);
    }

    function html() {
        const STATE = window.EventsCreateSteps.getState();
        const TIMEZONES = window.EventsCreateSteps.TIMEZONES;
        const f = STATE.form;
        return `
            <div class="ec-grid-2">
                <div class="ec-row">
                    <label class="ec-label">Starts</label>
                    <input id="ecStart" class="ec-input" type="datetime-local" value="${_esc(f.start_date)}">
                </div>
                <div class="ec-row">
                    <label class="ec-label">Ends (optional)</label>
                    <input id="ecEnd" class="ec-input" type="datetime-local" value="${_esc(f.end_date)}">
                </div>
            </div>

            <div class="ec-row">
                <label class="ec-label">Timezone</label>
                <select id="ecTz" class="ec-input">
                    ${TIMEZONES.map(tz => `<option value="${tz}" ${tz === f.timezone ? 'selected' : ''}>${tz.replace('_', ' ')}</option>`).join('')}
                </select>
            </div>

            <div class="ec-row">
                <label class="ec-label">Location nickname</label>
                <input id="ecLocNick" class="ec-input" type="text" maxlength="60" placeholder="e.g. Mom's house, Cabin in the woods" value="${_esc(f.location_nickname)}">
                <p class="ec-help">Shown on the banner instead of the full address.</p>
            </div>

            <div class="ec-row">
                <label class="ec-label">Address</label>
                <input id="ecLoc" class="ec-input" type="text" placeholder="123 Main St, City, ST" value="${_esc(f.location_text)}">
                <div id="ecLocStatus" class="ec-loc-status" style="color:#9ca3af">${STATE.geocode ? `📍 ${_esc(STATE.geocode.display || 'Located')}` : 'Type an address to geocode (optional).'}</div>
            </div>

            <div class="ec-grid-2">
                <div class="ec-row">
                    <label class="ec-label">Max attendees (optional)</label>
                    <input id="ecMax" class="ec-input" type="number" min="1" placeholder="No limit" value="${_esc(f.max_participants)}">
                </div>
                <div class="ec-row">
                    <label class="ec-label">RSVP deadline (optional)</label>
                    <input id="ecDeadline" class="ec-input" type="datetime-local" value="${_esc(f.rsvp_deadline)}">
                </div>
            </div>
        `;
    }

    function wire() {
        const STATE = window.EventsCreateSteps.getState();
        const get = id => document.getElementById(id);
        get('ecStart')?.addEventListener('input', e => STATE.form.start_date = e.target.value);
        get('ecEnd')?.addEventListener('input', e => STATE.form.end_date = e.target.value);
        get('ecTz')?.addEventListener('change', e => STATE.form.timezone = e.target.value);
        get('ecLocNick')?.addEventListener('input', e => STATE.form.location_nickname = e.target.value);
        get('ecMax')?.addEventListener('input', e => STATE.form.max_participants = e.target.value);
        get('ecDeadline')?.addEventListener('input', e => STATE.form.rsvp_deadline = e.target.value);
        const loc = get('ecLoc');
        loc?.addEventListener('input', e => {
            STATE.form.location_text = e.target.value;
            STATE.geocode = null;
            clearTimeout(_locDebounce);
            const status = get('ecLocStatus');
            if (status) { status.textContent = '…'; status.style.color = '#9ca3af'; }
            _locDebounce = setTimeout(_doGeocode, 700);
        });
    }

    async function _doGeocode() {
        const STATE = window.EventsCreateSteps.getState();
        const status = document.getElementById('ecLocStatus');
        const addr = (STATE.form.location_text || '').trim();
        if (!addr || addr.length < 6) {
            if (status) { status.textContent = 'Type an address to geocode (optional).'; status.style.color = '#9ca3af'; }
            return;
        }
        try {
            if (typeof window.evtGeocodeAddress === 'function') {
                const r = await window.evtGeocodeAddress(addr);
                if (r && r.lat && r.lng) {
                    STATE.geocode = { lat: r.lat, lng: r.lng, display: r.display || addr };
                    if (status) { status.textContent = `📍 ${STATE.geocode.display}`; status.style.color = '#059669'; }
                    return;
                }
            }
            if (status) { status.textContent = '⚠️ Could not locate — saved as text only.'; status.style.color = '#d97706'; }
        } catch (_) {
            if (status) { status.textContent = '⚠️ Geocoding error — saved as text only.'; status.style.color = '#d97706'; }
        }
    }

    window.EventsCreateSteps = window.EventsCreateSteps || {};
    window.EventsCreateSteps.when = { html, wire };
})();

;/* ===== js/portal/events/create/step-pricing.js ===== */
// Portal Events — Create sheet: Pricing step (Phase 5M.1.2)
(function () {
    'use strict';

    function _esc(s) {
        return window.EventsCreateSteps.esc(s);
    }

    function html() {
        const STATE = window.EventsCreateSteps.getState();
        const f = STATE.form;
        const modes = [
            { key:'free', label:'Free', sub:'No payment required' },
            { key:'paid', label:'Paid RSVP', sub:'Stripe checkout on RSVP' },
            { key:'free_paid_raffle', label:'Free + paid raffle', sub:'Free entry, paid raffle entries' },
        ];
        const showRsvpCost = f.pricing_mode === 'paid';
        const showRaffleConfig = f.raffle_enabled;
        const raffleBuilderHtml = window.EventsCreateSteps.raffleBuilderHtml;
        return `
            <div class="ec-row">
                <label class="ec-label">Pricing mode</label>
                <div style="display:flex;flex-direction:column;gap:8px">
                    ${modes.map(m => `
                        <label class="ec-checkbox-row" style="cursor:pointer">
                            <input type="radio" name="ecMode" value="${m.key}" ${f.pricing_mode === m.key ? 'checked' : ''}>
                            <div class="flex-1">
                                <div class="text-sm font-bold text-gray-800">${m.label}</div>
                                <div class="text-xs text-gray-500">${m.sub}</div>
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>

            ${showRsvpCost ? `
            <div class="ec-row">
                <label class="ec-label">RSVP price (USD)</label>
                <input id="ecCost" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc(f.rsvp_cost_dollars)}">
            </div>
            ` : ''}

            <div class="ec-row">
                <label class="ec-checkbox-row">
                    <input type="checkbox" id="ecRaffleEnabled" ${f.raffle_enabled ? 'checked' : ''}>
                    <div class="flex-1">
                        <div class="text-sm font-bold text-gray-800">Add a raffle</div>
                        <div class="text-xs text-gray-500">Members can buy raffle entries for prizes.</div>
                    </div>
                </label>
            </div>

            ${showRaffleConfig && typeof raffleBuilderHtml === 'function' ? `
            ${raffleBuilderHtml()}
            ` : ''}

            <div class="ec-row">
                <label class="ec-checkbox-row">
                    <input type="checkbox" id="ecMemberOnly" ${f.member_only ? 'checked' : ''}>
                    <div class="flex-1">
                        <div class="text-sm font-bold text-gray-800">Members only</div>
                        <div class="text-xs text-gray-500">Hide from the public event page; logged-in members only.</div>
                    </div>
                </label>
            </div>
        `;
    }

    function wire() {
        const STATE = window.EventsCreateSteps.getState();
        const render = window.EventsCreateSteps.render;
        const ensureRaffleConfig = window.EventsCreateSteps.ensureRaffleConfig;
        const wireRaffleBuilder = window.EventsCreateSteps.wireRaffleBuilder;

        document.querySelectorAll('input[name="ecMode"]').forEach(el => {
            el.addEventListener('change', () => { STATE.form.pricing_mode = el.value; render(); });
        });
        document.getElementById('ecCost')?.addEventListener('input', e => STATE.form.rsvp_cost_dollars = e.target.value);
        document.getElementById('ecRaffleEnabled')?.addEventListener('change', e => {
            STATE.form.raffle_enabled = e.target.checked;
            if (STATE.form.raffle_enabled) ensureRaffleConfig();
            render();
        });
        document.getElementById('ecRafflePrice')?.addEventListener('input', e => STATE.form.raffle_entry_cost_dollars = e.target.value);
        if (typeof wireRaffleBuilder === 'function') wireRaffleBuilder();
        document.getElementById('ecMemberOnly')?.addEventListener('change', e => STATE.form.member_only = e.target.checked);
    }

    window.EventsCreateSteps = window.EventsCreateSteps || {};
    window.EventsCreateSteps.pricing = { html, wire };
})();

;/* ===== js/portal/events/create/step-review.js ===== */
// Portal Events — Create sheet: Review step (Phase 5M.1.2)
(function () {
    'use strict';

    function _esc(s) {
        return window.EventsCreateSteps.esc(s);
    }

    function html() {
        const STATE = window.EventsCreateSteps.getState();
        const CATEGORIES = window.EventsCreateSteps.CATEGORIES;
        const f = STATE.form;
        const cat = CATEGORIES.find(c => c.key === f.category)?.label || f.category;
        const start = f.start_date ? new Date(f.start_date).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '—';
        const pricingLabel = ({ free:'Free', paid:`Paid · $${f.rsvp_cost_dollars || '0.00'}`, free_paid_raffle:'Free + paid raffle' })[f.pricing_mode];
        const raffleReviewHtml = window.EventsCreateSteps.raffleReviewHtml;
        return `
            <div id="ecError"></div>

            ${STATE.bannerPreviewUrl ? `<img src="${STATE.bannerPreviewUrl}" class="ec-banner-preview mb-3" alt="">` : ''}

            <div class="ec-review-card">
                <h3 class="font-bold text-gray-800 text-sm mb-2">${_esc(f.title || 'Untitled event')}</h3>
                <div class="ec-review-row"><span>Type</span><span>${f.event_type}</span></div>
                <div class="ec-review-row"><span>Category</span><span>${cat}</span></div>
                ${f.description ? `<div class="ec-review-row"><span>Description</span><span style="max-width:60%">${_esc(f.description.slice(0, 120))}${f.description.length > 120 ? '…' : ''}</span></div>` : ''}
            </div>

            <div class="ec-review-card">
                <h3 class="font-bold text-gray-800 text-sm mb-2">When & Where</h3>
                <div class="ec-review-row"><span>Starts</span><span>${start}</span></div>
                <div class="ec-review-row"><span>Timezone</span><span>${f.timezone}</span></div>
                ${f.location_nickname ? `<div class="ec-review-row"><span>Location</span><span>${_esc(f.location_nickname)}</span></div>` : ''}
                ${f.location_text ? `<div class="ec-review-row"><span>Address</span><span style="max-width:60%">${_esc(f.location_text)}${STATE.geocode ? ' 📍' : ''}</span></div>` : ''}
                ${f.max_participants ? `<div class="ec-review-row"><span>Max attendees</span><span>${f.max_participants}</span></div>` : ''}
            </div>

            <div class="ec-review-card">
                <h3 class="font-bold text-gray-800 text-sm mb-2">Pricing</h3>
                <div class="ec-review-row"><span>Mode</span><span>${pricingLabel}</span></div>
                <div class="ec-review-row"><span>Raffle</span><span>${f.raffle_enabled ? `Yes · $${f.raffle_entry_cost_dollars || '0.00'}/entry` : 'No'}</span></div>
                ${f.raffle_enabled && typeof raffleReviewHtml === 'function' ? raffleReviewHtml() : ''}
                <div class="ec-review-row"><span>Visibility</span><span>${f.member_only ? 'Members only' : 'Public'}</span></div>
            </div>

            <p class="text-xs text-gray-400 text-center">Tap <strong>Publish</strong> to go live, or <strong>Save draft</strong> to finish later.</p>
        `;
    }

    function wire() { /* no-op */ }

    window.EventsCreateSteps = window.EventsCreateSteps || {};
    window.EventsCreateSteps.review = { html, wire };
})();

;/* ===== js/portal/events/create/raffle-builder.js ===== */
// Portal Events — Create sheet: Raffle builder (Phase 5M.1.3)
(function () {
    'use strict';

    function _steps() {
        return window.EventsCreateSteps;
    }

    function _state() {
        return _steps().getState();
    }

    function _render() {
        _steps().render();
    }

    function _esc(s) {
        return _steps().esc(s);
    }

    function raffleModel() {
        if (!window.EventsRaffleModel) throw new Error('Raffle model helper is not loaded.');
        return window.EventsRaffleModel;
    }

    function ensureRaffleConfig() {
        const STATE = _state();
        const model = raffleModel();
        if (!STATE.form.raffle_config) STATE.form.raffle_config = model.createDefaultConfig();
        STATE.form.raffle_config = model.normalizeConfig(STATE.form.raffle_config);
        return STATE.form.raffle_config;
    }

    function normalizeRaffleConfig() {
        const STATE = _state();
        STATE.form.raffle_config = raffleModel().normalizeConfig(STATE.form.raffle_config);
        return STATE.form.raffle_config;
    }

    function _drawModeOptions(selected) {
        const options = [
            ['specific_item', 'Specific items'],
            ['random_item', 'Random item in category'],
            ['winner_choice', 'Winner chooses later'],
        ];
        return options.map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');
    }

    function builderHtml() {
        const STATE = _state();
        const model = raffleModel();
        const config = ensureRaffleConfig();
        const categories = model.getOrderedCategories(config);
        const items = config.items || [];
        const validation = model.validateConfig(config);
        const totalWinners = model.getTotalWinnerCount(config);
        return `
            <div class="ec-row">
                <label class="ec-label">Raffle entry price (USD)</label>
                <input id="ecRafflePrice" class="ec-input" type="number" min="0" step="0.01" placeholder="0.00" value="${_esc(STATE.form.raffle_entry_cost_dollars)}">
                <p class="ec-help">Use 0.00 for a free raffle. Prize images come later; emoji fallbacks are available now.</p>
            </div>

            <div class="ec-row ec-raffle-box">
                <div class="ec-raffle-head">
                    <div>
                        <div class="text-sm font-extrabold text-gray-900">Prize categories</div>
                        <div class="text-xs text-gray-500">Draw order follows the category order below.</div>
                    </div>
                    <button type="button" class="ec-mini-btn" data-ec-raffle-add-category>Add category</button>
                </div>
                ${categories.map((category, index) => `
                    <div class="ec-raffle-section" data-ec-category-row="${index}">
                        <div class="ec-raffle-grid">
                            <div>
                                <label class="ec-label">Category</label>
                                <input class="ec-input" data-ec-category-field="label" data-ec-category-id="${_esc(category.id)}" value="${_esc(category.label)}" maxlength="80">
                            </div>
                            <div>
                                <label class="ec-label">Draw mode</label>
                                <select class="ec-input" data-ec-category-field="draw_mode" data-ec-category-id="${_esc(category.id)}">
                                    ${_drawModeOptions(category.draw_mode)}
                                </select>
                            </div>
                            <div>
                                <label class="ec-label">Winners</label>
                                <input class="ec-input" type="number" min="0" step="1" data-ec-category-field="winner_count" data-ec-category-id="${_esc(category.id)}" value="${category.winner_count ?? ''}">
                            </div>
                            <div style="display:flex;gap:4px">
                                <button type="button" class="ec-icon-btn" title="Move up" data-ec-category-move="up" data-ec-category-id="${_esc(category.id)}">↑</button>
                                <button type="button" class="ec-icon-btn" title="Move down" data-ec-category-move="down" data-ec-category-id="${_esc(category.id)}">↓</button>
                                <button type="button" class="ec-icon-btn" title="Remove" data-ec-category-remove="${_esc(category.id)}">×</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="ec-row ec-raffle-box">
                <div class="ec-raffle-head">
                    <div>
                        <div class="text-sm font-extrabold text-gray-900">Prize items</div>
                        <div class="text-xs text-gray-500">Add the items being given away. Emoji is used when no image is uploaded.</div>
                    </div>
                    <button type="button" class="ec-mini-btn" data-ec-raffle-add-item>Add item</button>
                </div>
                ${items.length ? items.map((item, index) => {
                    const preview = STATE.prizeImagePreviews[item.id] || item.image_url || null;
                    const fileName = STATE.prizeImageFiles[item.id]?.name || null;
                    return `
                    <div class="ec-raffle-item-wrap" data-ec-item-row="${index}">
                        <div class="ec-raffle-item-grid">
                            <div>
                                <label class="ec-label">Emoji</label>
                                <input class="ec-input" data-ec-item-field="emoji" data-ec-item-id="${_esc(item.id)}" value="${_esc(item.emoji || '🎁')}" maxlength="4">
                            </div>
                            <div>
                                <label class="ec-label">Item name</label>
                                <input class="ec-input" data-ec-item-field="name" data-ec-item-id="${_esc(item.id)}" value="${_esc(item.name)}" maxlength="120">
                            </div>
                            <div>
                                <label class="ec-label">Category</label>
                                <select class="ec-input" data-ec-item-field="category_id" data-ec-item-id="${_esc(item.id)}">
                                    ${categories.map(category => `<option value="${_esc(category.id)}" ${item.category_id === category.id ? 'selected' : ''}>${_esc(category.label)}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="ec-label">Qty</label>
                                <input class="ec-input" type="number" min="1" step="1" data-ec-item-field="quantity" data-ec-item-id="${_esc(item.id)}" value="${item.quantity || 1}">
                            </div>
                            <div style="display:flex;gap:4px">
                                <button type="button" class="ec-icon-btn" title="Move up" data-ec-item-move="up" data-ec-item-id="${_esc(item.id)}">↑</button>
                                <button type="button" class="ec-icon-btn" title="Move down" data-ec-item-move="down" data-ec-item-id="${_esc(item.id)}">↓</button>
                                <button type="button" class="ec-icon-btn" title="Remove" data-ec-item-remove="${_esc(item.id)}">×</button>
                            </div>
                        </div>
                        <div class="ec-prize-img-row">
                            <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" data-ec-prize-file="${_esc(item.id)}">
                            <div class="ec-prize-img-drop" data-ec-prize-drop="${_esc(item.id)}" title="Click or drag an image here">
                                ${preview ? `<img src="${_esc(preview)}" alt="Prize image">` : `<span style="font-size:18px">📷</span>`}
                            </div>
                            <div class="ec-prize-img-label">
                                ${preview
                                    ? `<strong>${fileName ? _esc(fileName) : 'Image set'}</strong><span>Drag a new image or click the thumbnail to replace</span>`
                                    : `<strong>Prize image</strong><span>Click or drag &amp; drop a photo (PNG/JPG/WebP · max 5 MB)</span>`
                                }
                            </div>
                            ${preview ? `<button type="button" class="ec-prize-img-clear" data-ec-prize-clear="${_esc(item.id)}">Remove</button>` : ''}
                        </div>
                    </div>`;
                }).join('') : `<div class="text-xs text-gray-500 bg-white border border-dashed border-gray-300 rounded-xl p-3">No prize items yet. Add at least one item before publishing.</div>`}

                <div class="ec-raffle-summary">
                    <span class="ec-raffle-chip">${categories.length} categories</span>
                    <span class="ec-raffle-chip">${items.length} items</span>
                    <span class="ec-raffle-chip">${totalWinners} winners</span>
                </div>
                ${validation.valid ? '' : `<div class="ec-error" style="margin-top:10px">${validation.errors.map(_esc).join('<br>')}</div>`}
            </div>
        `;
    }

    function _setPrizeImage(itemId, file) {
        const STATE = _state();
        if (!file.type.match(/^image\/(png|jpeg|webp)$/)) { alert('Please use a PNG, JPG, or WebP image.'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB.'); return; }
        STATE.prizeImageFiles[itemId] = file;
        const reader = new FileReader();
        reader.onload = () => { STATE.prizeImagePreviews[itemId] = reader.result; _render(); };
        reader.readAsDataURL(file);
    }

    function _updateCategory(categoryId, field, value, rerender = false) {
        const config = ensureRaffleConfig();
        const category = config.categories.find(entry => entry.id === categoryId);
        if (!category) return;
        if (field === 'winner_count') category[field] = value === '' ? null : Math.max(0, Math.floor(Number(value) || 0));
        else category[field] = value;
        normalizeRaffleConfig();
        if (rerender) _render();
    }

    function _updateItem(itemId, field, value, rerender = false) {
        const config = ensureRaffleConfig();
        const item = config.items.find(entry => entry.id === itemId);
        if (!item) return;
        if (field === 'quantity') item[field] = Math.max(1, Math.floor(Number(value) || 1));
        else item[field] = value;
        normalizeRaffleConfig();
        if (rerender) _render();
    }

    function _renumberSortOrders(entries) {
        entries.forEach((entry, index) => entry.sort_order = (index + 1) * 10);
    }

    function _moveEntry(entries, id, direction) {
        const ordered = [...entries].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
        const index = ordered.findIndex(entry => entry.id === id);
        if (index < 0) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= ordered.length) return;
        const moving = ordered[index];
        ordered[index] = ordered[targetIndex];
        ordered[targetIndex] = moving;
        _renumberSortOrders(ordered);
        entries.splice(0, entries.length, ...ordered);
    }

    function _removeCategory(categoryId) {
        const config = ensureRaffleConfig();
        if (config.categories.length <= 1) {
            alert('Keep at least one raffle category.');
            return;
        }
        config.categories = config.categories.filter(category => category.id !== categoryId);
        const fallbackCategoryId = config.categories[0]?.id || 'general';
        config.items.forEach(item => {
            if (item.category_id === categoryId) item.category_id = fallbackCategoryId;
        });
        _renumberSortOrders(config.categories);
        normalizeRaffleConfig();
        _render();
    }

    function _removeItem(itemId) {
        const config = ensureRaffleConfig();
        config.items = config.items.filter(item => item.id !== itemId);
        _renumberSortOrders(config.items);
        normalizeRaffleConfig();
        _render();
    }

    function _moveCategory(categoryId, direction) {
        const config = ensureRaffleConfig();
        _moveEntry(config.categories, categoryId, direction);
        normalizeRaffleConfig();
        _render();
    }

    function _moveItem(itemId, direction) {
        const config = ensureRaffleConfig();
        _moveEntry(config.items, itemId, direction);
        normalizeRaffleConfig();
        _render();
    }

    function wire() {
        const STATE = _state();
        if (!STATE.form.raffle_enabled) return;
        document.querySelectorAll('[data-ec-category-field]').forEach(input => {
            input.addEventListener('input', () => _updateCategory(input.dataset.ecCategoryId, input.dataset.ecCategoryField, input.value));
            input.addEventListener('change', () => _updateCategory(input.dataset.ecCategoryId, input.dataset.ecCategoryField, input.value, true));
        });
        document.querySelectorAll('[data-ec-item-field]').forEach(input => {
            input.addEventListener('input', () => _updateItem(input.dataset.ecItemId, input.dataset.ecItemField, input.value));
            input.addEventListener('change', () => _updateItem(input.dataset.ecItemId, input.dataset.ecItemField, input.value, true));
        });
        document.querySelector('[data-ec-raffle-add-category]')?.addEventListener('click', () => {
            const model = raffleModel();
            const config = ensureRaffleConfig();
            const nextOrder = (config.categories.length + 1) * 10;
            config.categories.push(model.createCategory({ label: 'New Tier', sort_order: nextOrder, winner_count: 1 }));
            normalizeRaffleConfig();
            _render();
        });
        document.querySelector('[data-ec-raffle-add-item]')?.addEventListener('click', () => {
            const model = raffleModel();
            const config = ensureRaffleConfig();
            if (!config.categories.length) config.categories.push(model.createCategory({ id: 'general', label: 'Raffle Prizes', sort_order: 10 }));
            const nextOrder = (config.items.length + 1) * 10;
            config.items.push(model.createItem({ category_id: config.categories[0].id, name: 'New prize item', sort_order: nextOrder }));
            normalizeRaffleConfig();
            _render();
        });
        document.querySelectorAll('[data-ec-category-remove]').forEach(button => {
            button.addEventListener('click', () => _removeCategory(button.dataset.ecCategoryRemove));
        });
        document.querySelectorAll('[data-ec-item-remove]').forEach(button => {
            button.addEventListener('click', () => _removeItem(button.dataset.ecItemRemove));
        });
        document.querySelectorAll('[data-ec-category-move]').forEach(button => {
            button.addEventListener('click', () => _moveCategory(button.dataset.ecCategoryId, button.dataset.ecCategoryMove));
        });
        document.querySelectorAll('[data-ec-item-move]').forEach(button => {
            button.addEventListener('click', () => _moveItem(button.dataset.ecItemId, button.dataset.ecItemMove));
        });

        document.querySelectorAll('[data-ec-prize-drop]').forEach(zone => {
            const itemId = zone.dataset.ecPrizeDrop;
            const fileInput = document.querySelector(`[data-ec-prize-file="${CSS.escape(itemId)}"]`);
            if (!fileInput) return;

            zone.addEventListener('click', () => fileInput.click());

            zone.addEventListener('dragover', e => {
                e.preventDefault();
                zone.classList.add('ec-prize-img-drop--over');
            });
            zone.addEventListener('dragleave', e => {
                if (!zone.contains(e.relatedTarget)) zone.classList.remove('ec-prize-img-drop--over');
            });
            zone.addEventListener('drop', e => {
                e.preventDefault();
                zone.classList.remove('ec-prize-img-drop--over');
                const f = e.dataTransfer?.files?.[0];
                if (!f) return;
                _setPrizeImage(itemId, f);
            });

            fileInput.addEventListener('change', () => {
                const f = fileInput.files?.[0];
                if (!f) return;
                _setPrizeImage(itemId, f);
            });
        });
        document.querySelectorAll('[data-ec-prize-clear]').forEach(btn => {
            btn.addEventListener('click', () => {
                const itemId = btn.dataset.ecPrizeClear;
                delete STATE.prizeImageFiles[itemId];
                delete STATE.prizeImagePreviews[itemId];
                const config = ensureRaffleConfig();
                const item = config.items.find(i => i.id === itemId);
                if (item) item.image_url = null;
                _render();
            });
        });
    }

    function reviewHtml() {
        const model = raffleModel();
        const config = ensureRaffleConfig();
        return model.getOrderedCategories(config).map(category => {
            const items = model.getItemsForCategory(config, category.id);
            const itemText = items.length
                ? items.map(item => `${item.emoji || '🎁'} ${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`).join(', ')
                : 'No items yet';
            return `<div class="ec-review-row"><span>${_esc(category.label)}</span><span style="max-width:60%">${_esc(itemText)}</span></div>`;
        }).join('');
    }

    window.EventsCreateRaffleBuilder = {
        builderHtml,
        wire,
        reviewHtml,
        ensureRaffleConfig,
        normalizeRaffleConfig,
        raffleModel,
    };
})();

;/* ===== js/portal/events/create/submit.js ===== */
// Portal Events — Create sheet: Submit / storage (Phase 5M.1.4)
(function () {
    'use strict';

    let _submitting = false;

    function _steps() {
        return window.EventsCreateSteps;
    }

    function _raffleApi() {
        return window.EventsCreateRaffleBuilder;
    }

    async function submit(status) {
        if (_submitting) return;
        const steps = _steps();
        const STATE = steps.getState();
        const validateStep = steps.validateStep;
        const esc = steps.esc;
        const close = steps.close;

        if (typeof validateStep === 'function') {
            const err = validateStep();
            if (err && status === 'open') return alert(err);
        }

        const f = STATE.form;
        if (!f.title.trim()) return alert('Title is required to save.');
        if (status === 'open' && !f.start_date) return alert('Start date is required to publish.');

        const errBox = document.getElementById('ecError');
        if (errBox) errBox.innerHTML = '';

        _submitting = true;
        const nextBtn = document.getElementById('ecNextBtn');
        const draftBtn = document.getElementById('ecDraftBtn');
        const origNext = nextBtn?.textContent;
        const origDraft = draftBtn?.textContent;
        if (nextBtn) nextBtn.disabled = true;
        if (draftBtn) draftBtn.disabled = true;
        if (status === 'draft' && draftBtn) draftBtn.textContent = 'Saving…';
        if (status === 'open' && nextBtn) nextBtn.textContent = 'Publishing…';

        try {
            const userId = (window.evtCurrentUser && window.evtCurrentUser.id) || (await supabaseClient.auth.getUser()).data.user?.id;
            if (!userId) throw new Error('Not signed in.');

            const slug = (typeof window.evtGenerateSlug === 'function')
                ? window.evtGenerateSlug(f.title.trim())
                : f.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + Date.now().toString(36);

            let bannerUrl = null;
            if (STATE.bannerFile) {
                const ext = STATE.bannerFile.name.split('.').pop();
                const path = `${slug}-${Date.now()}.${ext}`;
                const up = await supabaseClient.storage
                    .from('event-banners')
                    .upload(path, STATE.bannerFile, { contentType: STATE.bannerFile.type });
                if (up.error) throw new Error('Banner upload failed: ' + up.error.message);
                bannerUrl = supabaseClient.storage.from('event-banners').getPublicUrl(path).data.publicUrl;
            }

            let embedImageUrl = null;
            if (STATE.embedImageFile) {
                const ext = STATE.embedImageFile.name.split('.').pop();
                const path = `embeds/${slug}-${Date.now()}.${ext}`;
                const up = await supabaseClient.storage
                    .from('event-banners')
                    .upload(path, STATE.embedImageFile, { contentType: STATE.embedImageFile.type });
                if (up.error) throw new Error('Embed image upload failed: ' + up.error.message);
                embedImageUrl = supabaseClient.storage.from('event-banners').getPublicUrl(path).data.publicUrl;
            }

            const rb = _raffleApi();
            const raffleConfig = f.raffle_enabled ? rb.raffleModel().normalizeConfig(rb.ensureRaffleConfig()) : null;
            if (raffleConfig) {
                const prizeUploads = Object.entries(STATE.prizeImageFiles);
                for (const [itemId, imgFile] of prizeUploads) {
                    const item = raffleConfig.items.find(i => i.id === itemId);
                    if (!item) continue;
                    const ext = imgFile.name.split('.').pop().toLowerCase() || 'jpg';
                    const path = `${slug}/${itemId}-${Date.now()}.${ext}`;
                    const up = await supabaseClient.storage
                        .from('event-raffle-prizes')
                        .upload(path, imgFile, { contentType: imgFile.type });
                    if (up.error) throw new Error(`Prize image upload failed: ${up.error.message}`);
                    item.image_url = supabaseClient.storage.from('event-raffle-prizes').getPublicUrl(path).data.publicUrl;
                }
            }

            const startISO = f.start_date ? new Date(f.start_date).toISOString() : null;
            const endISO = f.end_date ? new Date(f.end_date).toISOString() : null;
            const deadline = f.rsvp_deadline ? new Date(f.rsvp_deadline).toISOString() : null;
            const rsvpCents = f.pricing_mode === 'paid' ? Math.round(Number(f.rsvp_cost_dollars || 0) * 100) : 0;
            const raffleCents = f.raffle_enabled ? Math.round(Number(f.raffle_entry_cost_dollars || 0) * 100) : 0;
            const raffleWinnerCount = raffleConfig ? rb.raffleModel().getTotalWinnerCount(raffleConfig) : 0;

            const record = {
                created_by: userId,
                event_type: 'member',
                title: f.title.trim(),
                slug,
                category: f.category,
                description: f.description.trim() || null,
                banner_url: bannerUrl,
                embed_image_url: embedImageUrl,
                start_date: startISO,
                end_date: endISO,
                timezone: f.timezone,
                location_text: f.location_text.trim() || null,
                location_nickname: f.location_nickname.trim() || null,
                location_lat: STATE.geocode?.lat || null,
                location_lng: STATE.geocode?.lng || null,
                max_participants: f.max_participants ? Number(f.max_participants) : null,
                rsvp_deadline: deadline,
                member_only: !!f.member_only,
                pricing_mode: f.pricing_mode,
                rsvp_cost_cents: rsvpCents,
                raffle_enabled: !!f.raffle_enabled,
                raffle_entry_cost_cents: raffleCents,
                raffle_prizes: raffleConfig,
                raffle_winner_count: raffleWinnerCount,
                status,
            };

            const { data, error } = await supabaseClient.from('events').insert(record).select().single();
            if (error) throw error;

            if (typeof close === 'function') close();

            document.dispatchEvent(new CustomEvent('events:created', { detail: { event: data, status } }));

            if (status === 'open' && data.slug && typeof window.evtNavigateToEvent === 'function') {
                window.evtNavigateToEvent(data.slug);
            } else if (typeof window.evtLoadEvents === 'function') {
                window.evtLoadEvents();
            }
        } catch (e) {
            const msg = (e && e.message) ? e.message : String(e);
            const errBox2 = document.getElementById('ecError');
            if (errBox2 && typeof esc === 'function') {
                errBox2.innerHTML = `<div class="ec-error">${esc(msg)}</div>`;
            } else {
                alert('Save failed: ' + msg);
            }
        } finally {
            _submitting = false;
            if (nextBtn) { nextBtn.disabled = false; if (origNext) nextBtn.textContent = origNext; }
            if (draftBtn) { draftBtn.disabled = false; if (origDraft) draftBtn.textContent = origDraft; }
        }
    }

    window.EventsCreateSubmit = { submit };
})();

;/* ===== js/portal/events/create/sheet.js ===== */
﻿// ═══════════════════════════════════════════════════════════
// Event Create Sheet  (M4a — multi-step, Member events only)
//
// DEFAULT for all create-event entry points. Legacy #createModal
// kept as a fallback for LLC/Competition (greyed-out in Step 1).
//
// 4 steps:  Basics  →  When & Where  →  Pricing  →  Review
//
// Public surface:
//   window.EventsCreate.open()
//   window.EventsCreate.close()
//   window.EventsCreate.isFlagOn()  — kept for compatibility, always true
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── Feature flag ── always on (sheet is now the default) ─────
    function isFlagOn() { return true; }

    const STEPS = [
        { key: 'basics',  label: 'Basics' },
        { key: 'when',    label: 'When & Where' },
        { key: 'pricing', label: 'Pricing' },
        { key: 'review',  label: 'Review' },
    ];

    const STATE = {
        step: 0,
        bannerFile: null,
        bannerPreviewUrl: null,
        embedImageFile: null,
        embedImagePreviewUrl: null,
        geocode: null, // { lat, lng, display } or null
        prizeImageFiles: {},    // item.id → File
        prizeImagePreviews: {}, // item.id → data-URL
        form: {
            event_type: 'member',
            title: '',
            category: 'other',
            description: '',
            start_date: '',
            end_date: '',
            timezone: 'America/New_York',
            location_text: '',
            location_nickname: '',
            max_participants: '',
            rsvp_deadline: '',
            pricing_mode: 'free',
            rsvp_cost_dollars: '',
            raffle_enabled: false,
            raffle_entry_cost_dollars: '',
            raffle_config: null,
            member_only: false,
        },
    };

    const CATEGORIES = [
        { key:'party',         label:'🎉 Party' },
        { key:'birthday',      label:'🎂 Birthday' },
        { key:'trip',          label:'✈️ Trip' },
        { key:'cookout',       label:'🍔 Cookout' },
        { key:'game_night',    label:'🎮 Game Night' },
        { key:'meeting',       label:'📋 Meeting' },
        { key:'fundraiser',    label:'💰 Fundraiser' },
        { key:'volunteer',     label:'🤝 Volunteer' },
        { key:'celebration',   label:'🥳 Celebration' },
        { key:'other',         label:'📌 Other' },
    ];

    const TIMEZONES = [
        'America/New_York', 'America/Chicago', 'America/Denver',
        'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
    ];

    // ─── DOM injection ──────────────────────────────────────────────
    function _ensureMounted() {
        if (document.getElementById('ecSheetRoot')) return;
        const root = document.createElement('div');
        root.id = 'ecSheetRoot';
        root.innerHTML = `
            <div id="ecSheetBackdrop" class="fixed inset-0 bg-black/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200 z-[60]"></div>
            <div id="ecSheet" class="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none z-[61]">
                <div id="ecSheetPanel" class="bg-white w-full sm:max-w-2xl sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-auto translate-y-full sm:translate-y-4 sm:opacity-0 transition-all duration-300 flex flex-col" style="max-height:92vh">
                    <header class="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100 flex items-start gap-3 flex-shrink-0">
                        <div class="flex-1 min-w-0">
                            <p class="text-[11px] uppercase tracking-wide font-bold text-brand-600">Create Event <span class="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px]">BETA</span></p>
                            <h2 id="ecSheetTitle" class="text-lg sm:text-xl font-extrabold text-gray-900 truncate">New event</h2>
                            <p id="ecSheetSub" class="text-xs text-gray-400 mt-0.5"></p>
                        </div>
                        <button id="ecSheetClose" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0" aria-label="Close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </header>
                    <div id="ecSheetSteps" class="flex items-center justify-center gap-2 px-5 py-2 border-b border-gray-100 flex-shrink-0"></div>
                    <div id="ecSheetContent" class="flex-1 overflow-y-auto px-5 sm:px-6 py-5"></div>
                    <footer id="ecSheetFooter" class="px-5 sm:px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
                        <button id="ecBackBtn" class="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-2">Back</button>
                        <div class="flex items-center gap-2">
                            <button id="ecDraftBtn" class="text-sm font-semibold text-gray-600 hover:text-gray-800 px-3 py-2">Save draft</button>
                            <button id="ecNextBtn" class="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition">Next</button>
                        </div>
                    </footer>
                </div>
            </div>
            <style>
                .ec-step-dot { width:8px; height:8px; border-radius:50%; background:#e5e7eb; transition:background .15s,width .15s; }
                .ec-step-dot.active { background:#4f46e5; width:24px; border-radius:4px; }
                .ec-step-dot.done { background:#a5b4fc; }
                .ec-label { display:block; font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; margin-bottom:6px; }
                .ec-input { width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; font-size:16px; color:#111827; background:#fff; }
                .ec-input:focus { outline:none; border-color:#4f46e5; box-shadow:0 0 0 3px rgba(79,70,229,.12); }
                .ec-textarea { min-height:90px; resize:vertical; font-family:inherit; }
                .ec-help { font-size:11px; color:#9ca3af; margin-top:4px; }
                .ec-row { margin-bottom:14px; }
                .ec-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
                @media(max-width:480px) { .ec-grid-2 { grid-template-columns:1fr; } }
                .ec-type-card { padding:14px; border:2px solid #e5e7eb; border-radius:12px; cursor:pointer; transition:border-color .15s,background .15s; }
                .ec-type-card.active { border-color:#4f46e5; background:#eef2ff; }
                .ec-type-card.disabled { opacity:.45; cursor:not-allowed; }
                .ec-type-emoji { font-size:24px; line-height:1; }
                .ec-banner-drop { border:2px dashed #d1d5db; border-radius:12px; padding:24px; text-align:center; cursor:pointer; transition:border-color .15s,background .15s; }
                .ec-banner-drop:hover { border-color:#a5b4fc; background:#fafafa; }
                .ec-banner-drop--over { border-color:#4f46e5; background:#eef2ff; }
                .ec-banner-preview { width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:12px; }
                .ec-embed-preview { width:100%; max-width:240px; aspect-ratio:4/5; object-fit:cover; border-radius:12px; display:block; }
                .ec-pill { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; background:#f3f4f6; color:#374151; cursor:pointer; border:1px solid transparent; }
                .ec-pill.active { background:#4f46e5; color:#fff; }
                .ec-checkbox-row { display:flex; gap:10px; align-items:flex-start; padding:10px; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; }
                .ec-checkbox-row input { margin-top:3px; }
                .ec-review-card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:14px; margin-bottom:10px; }
                .ec-review-row { display:flex; justify-content:space-between; gap:10px; padding:6px 0; font-size:13px; border-bottom:1px solid #f1f5f9; }
                .ec-review-row:last-child { border-bottom:none; }
                .ec-review-row span:first-child { color:#6b7280; }
                .ec-review-row span:last-child { color:#111827; font-weight:600; text-align:right; }
                .ec-error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:10px 12px; border-radius:10px; font-size:13px; margin-bottom:10px; }
                .ec-loc-status { font-size:11px; margin-top:4px; }
                .ec-raffle-box { border:1px solid #e5e7eb; border-radius:14px; padding:12px; background:#fafafa; }
                .ec-raffle-section { border:1px solid #e5e7eb; border-radius:12px; padding:10px; background:#fff; margin-top:10px; }
                .ec-raffle-head { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
                .ec-raffle-grid { display:grid; grid-template-columns:1.2fr .8fr .65fr auto; gap:8px; align-items:end; }
                .ec-raffle-item-grid { display:grid; grid-template-columns:.45fr 1.1fr .9fr .55fr auto; gap:8px; align-items:end; margin-top:8px; }
                .ec-icon-btn { width:34px; height:34px; border-radius:9px; border:1px solid #e5e7eb; background:#fff; color:#4b5563; font-weight:800; display:inline-flex; align-items:center; justify-content:center; }
                .ec-icon-btn:hover { border-color:#c7d2fe; color:#4f46e5; background:#eef2ff; }
                .ec-mini-btn { border:1px solid #e5e7eb; background:#fff; color:#374151; border-radius:9px; padding:7px 10px; font-size:12px; font-weight:700; }
                .ec-mini-btn:hover { border-color:#c7d2fe; color:#4f46e5; background:#eef2ff; }
                .ec-raffle-summary { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
                .ec-raffle-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:999px; background:#eef2ff; color:#4338ca; font-size:11px; font-weight:700; }
                .ec-raffle-item-wrap { border:1px solid #e5e7eb; border-radius:12px; padding:10px; background:#fff; margin-top:8px; }
                .ec-prize-img-row { margin-top:8px; display:flex; align-items:center; gap:8px; }
                .ec-prize-img-drop { flex:0 0 auto; width:72px; height:72px; border:2px dashed #d1d5db; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-direction:column; cursor:pointer; transition:border-color .15s,background .15s; font-size:11px; color:#9ca3af; text-align:center; overflow:hidden; }
                .ec-prize-img-drop:hover, .ec-prize-img-drop--over { border-color:#4f46e5; background:#eef2ff; color:#4f46e5; }
                .ec-prize-img-drop img { width:100%; height:100%; object-fit:cover; border-radius:8px; display:block; }
                .ec-prize-img-label { flex:1; min-width:0; font-size:11px; color:#6b7280; }
                .ec-prize-img-label strong { display:block; color:#374151; font-size:12px; margin-bottom:1px; }
                .ec-prize-img-clear { border:1px solid #fecaca; background:#fef2f2; color:#dc2626; border-radius:7px; padding:4px 8px; font-size:11px; font-weight:700; white-space:nowrap; }
                .ec-prize-img-clear:hover { background:#fee2e2; }
                @media(max-width:560px) { .ec-raffle-grid, .ec-raffle-item-grid { grid-template-columns:1fr; } .ec-icon-btn { width:100%; } }
                @media(max-width:639px){ #ecSheetPanel { max-height: 94vh; } }
            </style>
        `;
        document.body.appendChild(root);

        document.getElementById('ecSheetClose').addEventListener('click', _confirmClose);
        document.getElementById('ecSheetBackdrop').addEventListener('click', _confirmClose);
        document.getElementById('ecBackBtn').addEventListener('click', _back);
        document.getElementById('ecNextBtn').addEventListener('click', _next);
        document.getElementById('ecDraftBtn').addEventListener('click', () => _submit('draft'));
    }

    // ─── Open / Close ───────────────────────────────────────────────
    function open() {
        _ensureMounted();
        STATE.step = 0;
        STATE.bannerFile = null;
        STATE.bannerPreviewUrl = null;
        STATE.embedImageFile = null;
        STATE.embedImagePreviewUrl = null;
        STATE.geocode = null;
        STATE.prizeImageFiles = {};
        STATE.prizeImagePreviews = {};
        Object.assign(STATE.form, {
            event_type: 'member', title: '', category: 'other', description: '',
            start_date: '', end_date: '', timezone: 'America/New_York',
            location_text: '', location_nickname: '',
            max_participants: '', rsvp_deadline: '',
            pricing_mode: 'free', rsvp_cost_dollars: '',
            raffle_enabled: false, raffle_entry_cost_dollars: '',
            raffle_config: null,
            member_only: false,
        });
        _render();

        const sheet = document.getElementById('ecSheet');
        const panel = document.getElementById('ecSheetPanel');
        const backdrop = document.getElementById('ecSheetBackdrop');
        sheet.classList.add('ec-open');
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
        backdrop.classList.add('opacity-100');
        requestAnimationFrame(() => {
            panel.classList.remove('translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
            panel.classList.add('translate-y-0', 'sm:opacity-100');
        });
        document.body.style.overflow = 'hidden';
    }

    function close() {
        const sheet = document.getElementById('ecSheet');
        if (!sheet || !sheet.classList.contains('ec-open')) return;
        const panel = document.getElementById('ecSheetPanel');
        const backdrop = document.getElementById('ecSheetBackdrop');
        panel.classList.add('translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
        panel.classList.remove('translate-y-0', 'sm:opacity-100');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        backdrop.classList.remove('opacity-100');
        document.body.style.overflow = '';
        setTimeout(() => sheet.classList.remove('ec-open'), 250);
    }

    function _confirmClose() {
        if (STATE.form.title || STATE.bannerFile || STATE.embedImageFile) {
            if (!confirm('Discard this event? Your draft will not be saved.')) return;
        }
        close();
    }

    // ─── Render ─────────────────────────────────────────────────────
    function _render() {
        // Step dots
        const dots = document.getElementById('ecSheetSteps');
        dots.innerHTML = STEPS.map((s, i) =>
            `<div class="ec-step-dot ${i === STATE.step ? 'active' : (i < STATE.step ? 'done' : '')}" title="${s.label}"></div>`
        ).join('');
        document.getElementById('ecSheetSub').textContent = `Step ${STATE.step + 1} of ${STEPS.length} · ${STEPS[STATE.step].label}`;

        // Footer button labels
        document.getElementById('ecBackBtn').style.visibility = STATE.step === 0 ? 'hidden' : 'visible';
        document.getElementById('ecNextBtn').textContent = STATE.step === STEPS.length - 1 ? 'Publish' : 'Next';

        // Step body
        const key = STEPS[STATE.step].key;
        const c = document.getElementById('ecSheetContent');
        const steps = window.EventsCreateSteps || {};
        if (key === 'basics' && steps.basics)  { c.innerHTML = steps.basics.html();  steps.basics.wire(); }
        if (key === 'when' && steps.when)      { c.innerHTML = steps.when.html();    steps.when.wire(); }
        if (key === 'pricing' && steps.pricing){ c.innerHTML = steps.pricing.html(); steps.pricing.wire(); }
        if (key === 'review' && steps.review)  { c.innerHTML = steps.review.html();  steps.review.wire(); }
    }

    function _raffleApi() {
        return window.EventsCreateRaffleBuilder;
    }

    function _validateStep() {
        const f = STATE.form;
        const key = STEPS[STATE.step].key;
        if (key === 'basics') {
            if (!f.title.trim()) return 'Title is required.';
            if (f.title.trim().length < 3) return 'Title must be at least 3 characters.';
            if (f.event_type !== 'member') return 'M4a only supports Member events. Use the legacy "Create Event" button for LLC or Competition.';
        }
        if (key === 'when') {
            if (!f.start_date) return 'Start date is required.';
            if (f.end_date && f.end_date < f.start_date) return 'End date must be after start date.';
            if (f.rsvp_deadline && f.rsvp_deadline > f.start_date) return 'RSVP deadline must be before the event starts.';
        }
        if (key === 'pricing') {
            if (f.pricing_mode === 'paid' && (!f.rsvp_cost_dollars || Number(f.rsvp_cost_dollars) <= 0)) return 'Paid events need a price greater than zero.';
            if (f.raffle_enabled && Number(f.raffle_entry_cost_dollars || 0) < 0) return 'Raffle entry price cannot be negative.';
            if (f.raffle_enabled) {
                const rb = _raffleApi();
                const result = rb.raffleModel().validateConfig(rb.ensureRaffleConfig());
                if (!result.valid) return result.errors[0];
            }
        }
        return null;
    }

    function _back() {
        if (STATE.step === 0) return;
        STATE.step--;
        _render();
    }

    function _next() {
        const err = _validateStep();
        if (err) return alert(err);
        if (STATE.step < STEPS.length - 1) {
            STATE.step++;
            _render();
        } else {
            _submit('open');
        }
    }

    function _submit(status) {
        window.EventsCreateSubmit.submit(status);
    }

    // ─── Helpers ────────────────────────────────────────────────────
    function _esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }

    function _bindCreateStepsApi() {
        window.EventsCreateSteps = window.EventsCreateSteps || {};
        window.EventsCreateSteps.getState = () => STATE;
        window.EventsCreateSteps.render = _render;
        window.EventsCreateSteps.validateStep = _validateStep;
        window.EventsCreateSteps.close = close;
        window.EventsCreateSteps.esc = _esc;
        window.EventsCreateSteps.CATEGORIES = CATEGORIES;
        window.EventsCreateSteps.TIMEZONES = TIMEZONES;
        const rb = _raffleApi();
        window.EventsCreateSteps.raffleBuilderHtml = rb.builderHtml;
        window.EventsCreateSteps.raffleReviewHtml = rb.reviewHtml;
        window.EventsCreateSteps.ensureRaffleConfig = rb.ensureRaffleConfig;
        window.EventsCreateSteps.wireRaffleBuilder = rb.wire;
    }

    _bindCreateStepsApi();

    // ─── Public surface ─────────────────────────────────────────────
    window.EventsCreate = { open, close, isFlagOn };

    // PortalEvents.create namespace bridge (additive — preserves window.EventsCreate)
    window.PortalEvents = window.PortalEvents || {};
    window.PortalEvents.create = window.PortalEvents.create || {};
    window.PortalEvents.create.open = open;
    window.PortalEvents.create.close = close;
    window.PortalEvents.create.isFlagOn = isFlagOn;
})();

;/* ===== js/portal/events/raffle.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Raffle Draw & Winner Display
// Digital raffle draw using crypto-random selection,
// celebration animation, and winner persistence.
// ═══════════════════════════════════════════════════════════

/* ── Open the Raffle Draw Modal ───────────────────────── */
async function evtOpenRaffleDraw(eventId, eventOverride) {
    const eventList = typeof evtAllEvents !== 'undefined' ? evtAllEvents : [];
    const event = eventOverride || eventList.find(e => e.id === eventId);
    if (!event || !event.raffle_enabled) return;
    window.__evtRaffleEventCache = window.__evtRaffleEventCache || {};
    window.__evtRaffleEventCache[eventId] = event;

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
        const existingWinners = await evtLoadRaffleWinnersForDraw(eventId);
        const wonUserIds = new Set((existingWinners || []).map(w => w.user_id).filter(Boolean));
        const wonGuestTokens = new Set((existingWinners || []).map(w => w.guest_token).filter(Boolean));
        const alreadyDrawnCount = (existingWinners || []).length;

        const eligible = pool.filter(e =>
            !(e.user_id && wonUserIds.has(e.user_id)) &&
            !(e.guest_token && wonGuestTokens.has(e.guest_token))
        );

        const raffleConfig = evtGetRaffleConfig(event);
        const drawQueue = evtGetRaffleDrawQueue(event, existingWinners || []);
        const winnerCount = event.raffle_winner_count || window.EventsRaffleModel?.getTotalWinnerCount(raffleConfig) || drawQueue.length || 1;
        const remainingDraws = Math.max(0, drawQueue.length || (winnerCount - alreadyDrawnCount));

        // Render draw UI
        content.innerHTML = evtRenderDrawUI(eventId, eligible, raffleConfig, drawQueue, alreadyDrawnCount, remainingDraws, existingWinners || []);

    } catch (err) {
        console.error('Raffle draw error:', err);
        content.innerHTML = `<div class="text-center py-8"><p class="text-sm text-red-600">Failed to load raffle pool. Please try again.</p></div>`;
    }
}

/* ── Render the Draw UI ──────────────────────────────── */
function evtRenderDrawUI(eventId, eligible, raffleConfig, drawQueue, alreadyDrawnCount, remainingDraws, existingWinners) {
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
    const nextSlot = drawQueue[0] || null;
    const nextPrizeLabel = evtPrizeSlotLabel(nextSlot) || evtLegacyPrizeLabel(raffleConfig, nextPlace);

    return `
        <div class="text-center">
            <span class="text-4xl">🎰</span>
            <h3 class="text-lg font-bold text-gray-900 mt-2">Raffle Draw</h3>
            <p class="text-sm text-gray-500 mt-1">${eligible.length} eligible entries • ${remainingDraws} draw${remainingDraws > 1 ? 's' : ''} remaining</p>
        </div>

        ${winnersHtml}

        <div class="mt-4 p-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl text-center">
            <p class="text-xs font-bold text-violet-600 uppercase tracking-wide">Drawing for Place #${nextPlace}</p>
            ${nextPrizeLabel ? `<p class="text-sm font-semibold text-gray-800 mt-1">${evtEscapeHtml(nextPrizeLabel)}</p>` : ''}
            ${nextSlot?.category_label ? `<p class="text-xs text-violet-500 mt-1">${evtEscapeHtml(nextSlot.category_label)} · ${evtDrawModeLabel(nextSlot.draw_mode)}</p>` : ''}
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

function evtGetRaffleConfig(event) {
    if (!window.EventsRaffleModel) return event?.raffle_prizes || [];
    return window.EventsRaffleModel.normalizeConfig(event?.raffle_prizes || []);
}

function evtGetRaffleDrawQueue(event, existingWinners) {
    if (!window.EventsRaffleModel) return [];
    return window.EventsRaffleModel.getDrawQueue(evtGetRaffleConfig(event), existingWinners || []);
}

function evtResolvePrizeSlot(event, existingWinners, place) {
    const queue = evtGetRaffleDrawQueue(event, existingWinners);
    let slot = queue.find(entry => entry.place === place) || queue[0] || null;
    if (!slot) return null;
    if (slot.draw_mode === 'random_item') {
        slot = evtAssignRandomPrizeSlot(event, existingWinners, slot);
    }
    return slot;
}

function evtAssignRandomPrizeSlot(event, existingWinners, slot) {
    const model = window.EventsRaffleModel;
    if (!model) return slot;
    const config = evtGetRaffleConfig(event);
    const items = model.getItemsForCategory(config, slot.category_id);
    const usedByPrize = new Map();
    (existingWinners || []).forEach(winner => {
        if (!winner.prize_id) return;
        usedByPrize.set(winner.prize_id, (usedByPrize.get(winner.prize_id) || 0) + 1);
    });
    const availableItems = items.filter(item => (usedByPrize.get(item.id) || 0) < item.quantity);
    if (!availableItems.length) return slot;
    const item = availableItems[evtCryptoRandomInt(availableItems.length)];
    return {
        ...slot,
        prize_id: item.id,
        prize_name: item.name,
        prize_image_url: item.image_url || null,
        prize_emoji: item.emoji || model.DEFAULT_EMOJI || '🎁',
        selection_status: 'assigned',
    };
}

function evtPrizeSlotLabel(slot) {
    if (!slot) return '';
    if (slot.prize_name) return slot.prize_name;
    if (slot.draw_mode === 'winner_choice') return `${slot.category_label || 'Prize tier'} choice`;
    if (slot.category_label) return slot.category_label;
    return '';
}

function evtLegacyPrizeLabel(raffleConfig, place) {
    if (Array.isArray(raffleConfig)) return raffleConfig[place - 1]?.label || raffleConfig[place - 1] || '';
    if (!window.EventsRaffleModel || !raffleConfig) return '';
    const queue = window.EventsRaffleModel.getDrawQueue(raffleConfig, []);
    return evtPrizeSlotLabel(queue.find(slot => slot.place === place));
}

function evtDrawModeLabel(drawMode) {
    if (drawMode === 'random_item') return 'Random prize assigned';
    if (drawMode === 'winner_choice') return 'Winner chooses later';
    return 'Specific prize';
}

async function evtInsertRaffleWinner(winnerRecord) {
    const result = await supabaseClient.from('event_raffle_winners').insert(winnerRecord);
    if (!result.error) return result;

    const message = result.error.message || '';
    const canRetryLegacy = /prize_id|category_id|category_label|draw_mode|prize_image_url|prize_emoji|selection_status|schema cache|column/i.test(message);
    if (!canRetryLegacy) return result;

    const legacyRecord = {
        event_id: winnerRecord.event_id,
        place: winnerRecord.place,
        user_id: winnerRecord.user_id,
        guest_token: winnerRecord.guest_token,
        prize_description: winnerRecord.prize_description,
    };
    return supabaseClient.from('event_raffle_winners').insert(legacyRecord);
}

async function evtLoadRaffleWinnersForDraw(eventId) {
    const fullSelect = 'user_id, guest_token, place, prize_id, category_id, category_label, draw_mode, prize_description, prize_image_url, prize_emoji, selection_status';
    const full = await supabaseClient
        .from('event_raffle_winners')
        .select(fullSelect)
        .eq('event_id', eventId);
    if (!full.error) return full.data || [];

    const message = full.error.message || '';
    if (!/prize_id|category_id|category_label|draw_mode|prize_image_url|prize_emoji|selection_status|schema cache|column/i.test(message)) {
        throw full.error;
    }

    const legacy = await supabaseClient
        .from('event_raffle_winners')
        .select('user_id, guest_token, place, prize_description')
        .eq('event_id', eventId);
    if (legacy.error) throw legacy.error;
    return legacy.data || [];
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

        const existingWinners = await evtLoadRaffleWinnersForDraw(eventId);

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

        const eventList = typeof evtAllEvents !== 'undefined' ? evtAllEvents : [];
        const event = window.__evtRaffleEventCache?.[eventId] || eventList.find(e => e.id === eventId);
        const slot = evtResolvePrizeSlot(event, existingWinners || [], place);
        const prizeDesc = evtPrizeSlotLabel(slot) || evtLegacyPrizeLabel(evtGetRaffleConfig(event), place) || null;

        // Insert winner record
        const winnerRecord = {
            event_id: eventId,
            place: place,
            prize_description: prizeDesc,
            prize_id: slot?.prize_id || null,
            category_id: slot?.category_id || null,
            category_label: slot?.category_label || null,
            draw_mode: slot?.draw_mode || null,
            prize_image_url: slot?.prize_image_url || null,
            prize_emoji: slot?.prize_emoji || null,
            selection_status: slot?.selection_status || 'assigned',
        };

        if (winner.user_id) {
            winnerRecord.user_id = winner.user_id;
        } else {
            winnerRecord.guest_token = winner.guest_token;
        }

        const { error } = await evtInsertRaffleWinner(winnerRecord);

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
        document.dispatchEvent(new CustomEvent('events:raffle:drawn', { detail: { eventId } }));

        // Replace draw button with "Next Draw" or "Done"
        if (btn) {
            const nextPlace = place + 1;
            const totalWinners = event?.raffle_winner_count || window.EventsRaffleModel?.getTotalWinnerCount(evtGetRaffleConfig(event)) || 1;
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

;/* ===== js/portal/events/manage/shell.js ===== */
// Portal Events — Manage sheet shell (Phase 5M.3A)
(function () {
    'use strict';

    const M3A_TABS = [
        { key: 'overview', label: 'Overview' },
        { key: 'images',   label: 'Images'   },
        { key: 'rsvps',    label: 'RSVPs'    },
        { key: 'money',    label: 'Money'    },
        { key: 'docs',     label: 'Docs'     },
        { key: 'raffle',   label: 'Raffle'   },
        { key: 'comp',     label: 'Comp'     },
        { key: 'danger',   label: 'Danger Zone' },
    ];

    function api() {
        return window.EventsManageShellApi || {};
    }

    function getState() {
        return api().getState?.() || {};
    }

        function ensureMounted() {
        if (document.getElementById('emSheetRoot')) return;
        const root = document.createElement('div');
        root.id = 'emSheetRoot';
        root.innerHTML = `
            <div id="emSheetBackdrop" class="fixed inset-0 bg-black/40 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200 z-[60]"></div>
            <div id="emSheet" class="em-sheet-hidden fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6 pointer-events-none z-[61]">
                <div id="emSheetPanel" class="bg-white w-full sm:max-w-3xl sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl pointer-events-none translate-y-full sm:translate-y-4 sm:opacity-0 transition-all duration-300 flex flex-col" style="max-height:90vh">
                    <header id="emSheetHeader" class="px-5 sm:px-6 pt-4 pb-3 border-b border-gray-100 flex items-start gap-3 flex-shrink-0">
                        <div class="flex-1 min-w-0">
                            <p class="text-[11px] uppercase tracking-wide font-bold text-brand-600">Manage Event</p>
                            <h2 id="emSheetTitle" class="text-lg sm:text-xl font-extrabold text-gray-900 truncate">…</h2>
                            <p id="emSheetSub" class="text-xs text-gray-400 mt-0.5"></p>
                        </div>
                        <button id="emSheetClose" class="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0" aria-label="Close">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </header>
                    <nav id="emSheetTabs" class="flex gap-1 px-3 sm:px-4 border-b border-gray-100 overflow-x-auto flex-shrink-0" style="scrollbar-width:none;-ms-overflow-style:none"></nav>
                    <div id="emSheetContent" class="flex-1 overflow-y-auto px-5 sm:px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"></div>
                </div>
            </div>
            <style>
                .em-sheet-hidden { display:none !important; }
                #emSheetTabs::-webkit-scrollbar { display: none; }
                .em-tab { white-space:nowrap; padding:10px 12px; font-size:13px; font-weight:600; color:#6b7280; border-bottom:2px solid transparent; transition:color .15s,border-color .15s; cursor:pointer; }
                .em-tab:hover { color:#374151; }
                .em-tab.active { color:#4f46e5; border-bottom-color:#4f46e5; }
                .em-tab.placeholder { color:#cbd5e1; }
                .em-tab.placeholder.active { color:#9ca3af; border-bottom-color:#cbd5e1; }
                .em-card { background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:16px; padding:16px; }
                .em-op-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-bottom:12px; }
                .em-op-card { min-height:150px; display:flex; flex-direction:column; gap:12px; }
                .em-op-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
                .em-op-kicker { font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#9ca3af; margin:0 0 3px; }
                .em-op-title { font-size:15px; font-weight:800; color:#111827; margin:0; line-height:1.15; }
                .em-op-icon { width:34px; height:34px; border-radius:12px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; flex-shrink:0; }
                .em-op-copy { font-size:12px; line-height:1.45; color:#6b7280; margin:0; }
                .em-op-meta { margin-top:auto; display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
                .em-op-chip { display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:999px; background:#f8fafc; color:#475569; font-size:11px; font-weight:700; }
                .em-op-progress { height:7px; border-radius:999px; overflow:hidden; background:#eef2f7; margin-top:auto; }
                .em-op-progress span { display:block; height:100%; width:0; border-radius:inherit; background:#4f46e5; }
                .em-command-card { background:linear-gradient(135deg,#111827,#312e81); color:#fff; border:0; overflow:hidden; position:relative; }
                .em-command-card:after { content:""; position:absolute; width:180px; height:180px; border-radius:50%; background:rgba(255,255,255,.08); right:-70px; top:-80px; }
                .em-command-eyebrow { font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#c7d2fe; margin:0 0 6px; }
                .em-command-title { font-size:20px; font-weight:850; margin:0; line-height:1.15; }
                .em-command-copy { font-size:12px; line-height:1.5; color:#dbeafe; margin:8px 0 0; max-width:560px; }
                .em-metric-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; }
                .em-metric { background:#fff; border:1px solid rgba(15,23,42,.06); border-radius:16px; padding:13px; min-width:0; }
                .em-metric span { display:block; font-size:10px; font-weight:800; letter-spacing:.08em; color:#94a3b8; text-transform:uppercase; }
                .em-metric strong { display:block; margin-top:5px; font-size:22px; line-height:1; color:#0f172a; }
                .em-metric small { display:block; margin-top:5px; color:#64748b; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .em-section-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:12px; }
                .em-section-title { margin:0; color:#111827; font-size:14px; font-weight:850; }
                .em-section-sub { margin:3px 0 0; color:#94a3b8; font-size:12px; line-height:1.4; }
                .em-attendee-card { display:flex; gap:12px; align-items:flex-start; padding:13px 0; border-top:1px solid #f1f5f9; }
                .em-attendee-card:first-of-type { border-top:0; padding-top:0; }
                .em-attendee-main { flex:1; min-width:0; }
                .em-attendee-name { margin:0; font-size:14px; font-weight:800; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .em-attendee-sub { margin:2px 0 0; color:#64748b; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                .em-money-layout { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(260px,.9fr); gap:12px; align-items:start; }
                .em-money-row { display:flex; justify-content:space-between; gap:14px; padding:11px 0; border-top:1px solid #f1f5f9; font-size:13px; }
                .em-money-row:first-child { border-top:0; padding-top:0; }
                .em-money-row span { color:#64748b; }
                .em-money-row strong { color:#111827; }
                .em-stat { display:flex; flex-direction:column; gap:4px; }
                .em-stat-label { font-size:11px; text-transform:uppercase; letter-spacing:.04em; font-weight:600; color:#6b7280; }
                .em-stat-num { font-size:24px; font-weight:800; color:#111827; }
                .em-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f1f5f9; }
                .em-row:last-child { border-bottom:none; }
                .em-avatar { width:32px; height:32px; border-radius:50%; background:#e0e7ff; color:#4f46e5; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; overflow:hidden; }
                .em-avatar img { width:100%; height:100%; object-fit:cover; }
                .em-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
                .em-pill-going { background:#d1fae5; color:#065f46; }
                .em-pill-maybe { background:#fce7f3; color:#9d174d; }
                .em-pill-not { background:#fee2e2; color:#991b1b; }
                .em-pill-paid { background:#fef3c7; color:#92400e; }
                .em-pill-checked { background:#ede9fe; color:#5b21b6; }
                .em-danger-card { background:#fef2f2; border:1px solid #fecaca; border-radius:14px; padding:14px; margin-bottom:10px; }
                .em-danger-title { font-weight:700; color:#991b1b; font-size:14px; }
                .em-danger-sub { font-size:12px; color:#7f1d1d; margin-top:2px; margin-bottom:10px; }
                .em-btn-danger { background:#dc2626; color:#fff; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; border:none; cursor:pointer; }
                .em-btn-danger:hover { background:#b91c1c; }
                .em-btn-ghost { background:#f3f4f6; color:#374151; padding:8px 14px; border-radius:10px; font-size:13px; font-weight:600; border:none; cursor:pointer; }
                .em-btn-ghost:hover { background:#e5e7eb; }
                .em-btn-primary { background:#4f46e5; color:#fff; padding:9px 14px; border-radius:10px; font-size:13px; font-weight:700; border:none; cursor:pointer; }
                .em-btn-primary:hover { background:#4338ca; }
                .em-btn-primary:disabled { opacity:.55; cursor:not-allowed; }
                .em-input { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:9px 11px; font-size:13px; color:#111827; background:#fff; }
                .em-input:focus { outline:none; border-color:#818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.18); }
                .em-textarea { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:9px 11px; font-size:13px; color:#111827; background:#fff; resize:vertical; min-height:92px; }
                .em-textarea:focus { outline:none; border-color:#818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.18); }
                .em-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; color:#9ca3af; }
                .em-placeholder svg { width:48px; height:48px; margin-bottom:12px; opacity:.4; }
                @media(max-width:639px){
                    #emSheetPanel { max-height: 92vh; }
                    .em-op-grid { grid-template-columns:1fr; }
                    .em-metric-grid { grid-template-columns:1fr 1fr; }
                    .em-money-layout { grid-template-columns:1fr; }
                }
                @media(min-width:640px) and (max-width:900px){ .em-op-grid { grid-template-columns:1fr 1fr; } .em-money-layout { grid-template-columns:1fr; } }
            </style>
        `;
        document.body.appendChild(root);

        document.getElementById('emSheetClose').addEventListener('click', () => api().onClose?.());
        document.getElementById('emSheetBackdrop').addEventListener('click', () => api().onClose?.());
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.getElementById('emSheet')?.classList.contains('em-open')) api().onClose?.();
        });
    }

    function renderHeader() {
        const e = getState().event;
        if (!e) return;
        document.getElementById('emSheetTitle').textContent = e.title;
        const dateStr = new Date(e.start_date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
        const typeLabel = ({ llc:'LLC', member:'Member', competition:'Competition' })[e.event_type] || e.event_type;
        document.getElementById('emSheetSub').textContent = `${typeLabel} · ${dateStr} · ${(e.status || '').toUpperCase()}`;
    }

    // ─── Tab bar ────────────────────────────────────────────────────
    function renderTabs() {
        const STATE = getState();
        const bar = document.getElementById('emSheetTabs');
        bar.innerHTML = M3A_TABS.map(t =>
            `<button class="em-tab${t.placeholder ? ' placeholder' : ''}${t.key === STATE.activeTab ? ' active' : ''}" data-tab="${t.key}">${t.label}${t.placeholder ? ' <span style="font-size:9px;opacity:.7">soon</span>' : ''}</button>`
        ).join('');
        bar.querySelectorAll('.em-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const st = getState();
                st.activeTab = btn.dataset.tab;
                renderTabs();
                api().renderTab?.(st.activeTab);
                btn.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
            });
        });
    }

    function renderContent(html) {
        document.getElementById('emSheetContent').innerHTML = html;
    }

    
    function setLoadingChrome() {
        document.getElementById('emSheetTitle').textContent = 'Loading event…';
        document.getElementById('emSheetSub').textContent = '';
        renderTabs();
        renderContent('<div class="em-placeholder"><div style="font-size:13px">Loading…</div></div>');
    }

    function openPanel() {
        const sheet = document.getElementById('emSheet');
        const panel = document.getElementById('emSheetPanel');
        const backdrop = document.getElementById('emSheetBackdrop');
        sheet.classList.remove('em-sheet-hidden');
        sheet.classList.add('em-open');
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
        backdrop.classList.add('opacity-100');
        requestAnimationFrame(() => {
            panel.classList.remove('pointer-events-none', 'translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
            panel.classList.add('pointer-events-auto', 'translate-y-0', 'sm:opacity-100');
        });
        document.body.style.overflow = 'hidden';
    }

    function closePanel() {
        const sheet = document.getElementById('emSheet');
        const panel = document.getElementById('emSheetPanel');
        const backdrop = document.getElementById('emSheetBackdrop');
        if (!sheet || !sheet.classList.contains('em-open')) return;
        panel.classList.add('pointer-events-none', 'translate-y-full', 'sm:translate-y-4', 'sm:opacity-0');
        panel.classList.remove('pointer-events-auto', 'translate-y-0', 'sm:opacity-100');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        backdrop.classList.remove('opacity-100');
        document.body.style.overflow = '';
        setTimeout(() => {
            sheet.classList.remove('em-open');
            sheet.classList.add('em-sheet-hidden');
        }, 250);
    }


    window.EventsManageShell = {
        ensureMounted,
        renderHeader,
        renderTabs,
        renderContent,
        setLoadingChrome,
        openPanel,
        closePanel,
        getTabs: () => M3A_TABS,
    };
})();

;/* ===== js/portal/events/manage/overview.js ===== */
// Portal Events — Manage overview tab (Phase 5M.3A)
(function () {
    'use strict';

    const PUBLIC_SITE_URL = 'https://justicemcneal.com';

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
    function money(cents) {
        return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
    }
    function publicEventUrl(event) {
        return PUBLIC_SITE_URL + '/events/?e=' + encodeURIComponent(event?.slug || '');
    }
    function safeFilename(value) {
        return String(value || 'event').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'event';
    }
    function downloadCanvasPng(canvasId, filename) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
    async function shareInviteUrl(url, event, btn) {
        const title = event?.title ? event.title + ' | Justice McNeal LLC' : 'Justice McNeal LLC Event';
        const text = event?.rsvp_enabled === false ? 'View event details.' : 'RSVP today.';
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                return;
            } catch (_) { /* cancelled */ }
        }
        await navigator.clipboard.writeText(url);
        if (btn) {
            btn.textContent = 'Link copied ✓';
            setTimeout(() => { btn.textContent = 'Share invite'; }, 1500);
        }
    }

    function overviewHtml() {
        const STATE = getState();
        const e = STATE.event;
        const guestGoing = STATE.guestRsvps.filter(r => r.status === 'going').length;
        const going = STATE.rsvps.filter(r => r.status === 'going').length + guestGoing;
        const maybe = STATE.rsvps.filter(r => r.status === 'maybe').length;
        const paid  = STATE.rsvps.filter(r => r.paid).length + STATE.guestRsvps.filter(r => r.paid).length;
        const checked = STATE.checkins.length;
        const revenue = paid * (e.rsvp_cost_cents || 0);
        const startLocal = new Date(e.start_date).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
        const isLlc = e.event_type === 'llc';
        const minNeeded = Number(e.min_participants || 0);
        const thresholdPct = minNeeded ? Math.min(100, Math.round((going / minNeeded) * 100)) : 0;
        const thresholdMet = minNeeded ? going >= minNeeded : false;
        const deadline = e.rsvp_deadline ? new Date(e.rsvp_deadline).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';
        const transportMode = e.transportation_mode;
        const transportEstimate = e.transportation_estimate_cents ? money(e.transportation_estimate_cents) : '';
        const thresholdCopy = thresholdMet
            ? `${going} confirmed RSVP${going === 1 ? '' : 's'}; minimum was ${minNeeded}${deadline ? ` by ${deadline}` : ''}. This event can stay confirmed.`
            : `${going} of ${minNeeded} required RSVP${minNeeded === 1 ? '' : 's'}${deadline ? ` by ${deadline}` : ''}. ${Math.max(0, minNeeded - going)} more RSVP${minNeeded - going === 1 ? '' : 's'} needed.`;

        const inviteUrl = publicEventUrl(e);
        const portalLink = `<a href="../portal/events.html?event=${encodeURIComponent(e.slug || '')}" class="em-btn-ghost" style="text-decoration:none;display:inline-block">Open in portal →</a>`;
        const thresholdCard = isLlc && minNeeded ? `
            <div class="em-card em-op-card">
                <div class="em-op-head">
                    <div><p class="em-op-kicker">Minimum</p><p class="em-op-title">${thresholdMet ? 'Threshold met' : 'Needs momentum'}</p></div>
                    <span class="em-op-icon">${thresholdMet ? '✅' : '⚠️'}</span>
                </div>
                <p class="em-op-copy">${thresholdCopy}</p>
                <div class="em-op-progress"><span style="width:${thresholdPct}%"></span></div>
                <div class="em-op-meta"><span class="em-op-chip">${thresholdPct}% filled</span><button class="em-btn-ghost" data-overview-tab="rsvps">Review RSVPs</button></div>
            </div>` : '';
        const transportCard = isLlc && transportMode ? `
            <div class="em-card em-op-card">
                <div class="em-op-head">
                    <div><p class="em-op-kicker">Transportation</p><p class="em-op-title">${transportMode === 'llc_provides' ? 'LLC provided' : 'Self-arranged'}</p></div>
                    <span class="em-op-icon">${transportMode === 'llc_provides' ? '✈️' : '🧳'}</span>
                </div>
                <p class="em-op-copy">${transportMode === 'llc_provides' ? 'Upload tickets or travel documents in Docs when they are ready for members.' : `Members book travel themselves${transportEstimate ? `, estimated around ${transportEstimate}` : ''}.`}</p>
                <div class="em-op-meta"><button class="em-btn-ghost" data-overview-tab="docs">Open Docs</button><span class="em-op-chip">${transportMode === 'llc_provides' ? 'Document handoff' : 'Member-owned'}</span></div>
            </div>` : '';
        const documentsCard = isLlc ? `
            <div class="em-card em-op-card">
                <div class="em-op-head">
                    <div><p class="em-op-kicker">Documents</p><p class="em-op-title">Handoff hub</p></div>
                    <span class="em-op-icon">📄</span>
                </div>
                <p class="em-op-copy">Upload group files or member-specific tickets here. Attendees only see a retrieval button on the event page.</p>
                <div class="em-op-meta"><button class="em-btn-primary" data-overview-tab="docs">Manage Docs</button></div>
            </div>` : '';
        const operationsHtml = [thresholdCard, transportCard, documentsCard].filter(Boolean).join('');
        const showFeaturedToggle = typeof canManageEventBanners === 'function' && canManageEventBanners();

        return `
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div class="em-card em-stat"><span class="em-stat-label">Going</span><span class="em-stat-num">${going}${e.max_participants ? `<span style="font-size:14px;color:#9ca3af;font-weight:500">/${e.max_participants}</span>` : ''}</span></div>
                <div class="em-card em-stat"><span class="em-stat-label">Interested</span><span class="em-stat-num" style="color:#db2777">${maybe}</span></div>
                <div class="em-card em-stat"><span class="em-stat-label">Checked In</span><span class="em-stat-num" style="color:#7c3aed">${checked}</span></div>
                <div class="em-card em-stat"><span class="em-stat-label">Revenue</span><span class="em-stat-num" style="color:#059669">${money(revenue)}</span></div>
            </div>

            ${operationsHtml ? `<div class="em-op-grid">${operationsHtml}</div>` : ''}

            <div class="em-card mb-3">
                <h3 class="font-bold text-gray-800 text-sm mb-3">Details</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between gap-3"><span class="text-gray-500">When</span><span class="text-gray-800 font-medium text-right">${startLocal}</span></div>
                    ${e.location_nickname ? `<div class="flex justify-between gap-3"><span class="text-gray-500">Where</span><span class="text-gray-800 font-medium text-right truncate">${esc(e.location_nickname)}</span></div>` : ''}
                    <div class="flex justify-between gap-3"><span class="text-gray-500">Status</span><span class="text-gray-800 font-medium uppercase tracking-wide text-xs">${e.status}</span></div>
                    <div class="flex justify-between gap-3"><span class="text-gray-500">Pricing</span><span class="text-gray-800 font-medium">${e.pricing_mode === 'paid' ? `Paid · ${money(e.rsvp_cost_cents)}` : 'Free'}</span></div>
                    ${e.rsvp_deadline ? `<div class="flex justify-between gap-3"><span class="text-gray-500">RSVP deadline</span><span class="text-gray-800 font-medium">${new Date(e.rsvp_deadline).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span></div>` : ''}
                </div>
            </div>

            <div class="em-card mb-3" id="emCopyEditorCard">
                <div class="em-section-head" style="margin-bottom:12px">
                    <div>
                        <h3 class="em-section-title">Event copy</h3>
                        <p class="em-section-sub">Edit the title and description shown across the portal and invite page.</p>
                    </div>
                </div>
                <form id="emCopyForm" class="space-y-3">
                    <div>
                        <label for="emCopyTitle" class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Title *</label>
                        <input id="emCopyTitle" class="em-input" type="text" maxlength="120" required value="${esc(e.title || '')}">
                    </div>
                    <div>
                        <label for="emCopyDescription" class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                        <textarea id="emCopyDescription" class="em-textarea" rows="4" maxlength="2000">${esc(e.description || '')}</textarea>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button type="submit" id="emCopySave" class="em-btn-primary">Save changes</button>
                        <button type="button" id="emCopyCancel" class="em-btn-ghost">Cancel</button>
                        <span id="emCopyStatus" class="text-xs text-gray-400"></span>
                    </div>
                </form>
            </div>

            ${showFeaturedToggle ? `
            <div class="em-card mb-3">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-bold text-gray-800 text-sm">&#9733; Featured on portal</p>
                        <p class="text-xs text-gray-500 mt-0.5">Show this event in the hero banner on the portal events page.</p>
                    </div>
                    <button id="emFeaturedToggle"
                        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${STATE.event.is_featured ? 'bg-brand-600' : 'bg-gray-200'}"
                        role="switch" aria-checked="${STATE.event.is_featured ? 'true' : 'false'}"
                        onclick="window._emToggleFeatured()"
                    >
                        <span class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${STATE.event.is_featured ? 'translate-x-5' : 'translate-x-0'}"></span>
                    </button>
                </div>
            </div>` : ''}

            <div class="em-card">
                <h3 class="font-bold text-gray-800 text-sm mb-3">Quick actions</h3>
                <div class="flex flex-wrap gap-2">
                    ${portalLink}
                    ${e.slug ? `<button class="em-btn-ghost" data-copy-invite-url>Copy invite link</button>` : ''}
                    ${e.checkin_enabled !== false && e.checkin_mode === 'attendee_ticket' && ['open','confirmed','active'].includes(e.status) ? `<button class="em-btn-ghost" onclick="window.EventsManage.close();setTimeout(()=>window.evtOpenScanner&&window.evtOpenScanner('${STATE.eventId}'),150)"><svg style="width:14px;height:14px;display:inline;vertical-align:-2px;margin-right:4px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>Scan Attendees</button>` : ''}
                </div>
                <p class="text-xs text-gray-400 mt-3">Tap any tab above for Money, Docs, Raffle, or Comp details.</p>
            </div>
            ${e.slug ? `
            <div class="em-card mt-3">
                <div class="em-section-head"><div><h3 class="em-section-title">Invitation QR</h3><p class="em-section-sub">Use this public event link on printed or digital invitations.</p></div></div>
                <canvas id="emInviteQR" style="display:block;margin:0 auto;border-radius:12px"></canvas>
                <p class="text-xs text-gray-400 text-center mt-2 break-all">${esc(inviteUrl)}</p>
                <div class="flex flex-wrap justify-center gap-2 mt-3">
                    <button class="em-btn-primary" data-share-invite-url>Share invite</button>
                    <button class="em-btn-primary" data-download-invite-qr>Download QR</button>
                    <button class="em-btn-ghost" data-copy-invite-url>Copy invite link</button>
                </div>
            </div>` : ''}
            ${e.checkin_enabled !== false && e.checkin_mode === 'venue_scan' && e.venue_qr_token ? `
            <div class="em-card mt-3">
                <h3 class="font-bold text-gray-800 text-sm mb-3">📍 Venue QR Code</h3>
                <canvas id="emVenueQR" style="display:block;margin:0 auto;border-radius:12px"></canvas>
                <p class="text-xs text-gray-400 text-center mt-2">Display this at the entrance for attendees to scan</p>
            </div>` : ''}
        `;
    }

    function wireOverview() {
        const STATE = getState();
        const e = STATE.event;
        if (!e) return;
        const inviteUrl = publicEventUrl(e);
        renderOverviewQrs(inviteUrl, e);
        document.getElementById('emSheetContent').querySelectorAll('[data-copy-invite-url]').forEach(btn => {
            btn.addEventListener('click', () => {
                navigator.clipboard.writeText(inviteUrl);
                btn.textContent = 'Copied ✓';
                setTimeout(() => { btn.textContent = 'Copy invite link'; }, 1500);
            });
        });
        document.getElementById('emSheetContent').querySelectorAll('[data-share-invite-url]').forEach(btn => {
            btn.addEventListener('click', () => shareInviteUrl(inviteUrl, e, btn));
        });
        document.getElementById('emSheetContent').querySelectorAll('[data-download-invite-qr]').forEach(btn => {
            btn.addEventListener('click', () => downloadCanvasPng('emInviteQR', `${safeFilename(e.slug || e.title || 'event')}-invite-qr.png`));
        });
        document.getElementById('emSheetContent').querySelectorAll('[data-overview-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                STATE.activeTab = btn.dataset.overviewTab;
                api().renderTabs?.();
                api().renderTab?.(STATE.activeTab);
            });
        });
        const copyForm = document.getElementById('emCopyForm');
        const copyTitle = document.getElementById('emCopyTitle');
        const copyDescription = document.getElementById('emCopyDescription');
        const copyStatus = document.getElementById('emCopyStatus');
        copyForm?.addEventListener('submit', (ev) => {
            ev.preventDefault();
            saveEventCopy(copyForm);
        });
        document.getElementById('emCopyCancel')?.addEventListener('click', () => {
            if (copyTitle) copyTitle.value = STATE.event?.title || '';
            if (copyDescription) copyDescription.value = STATE.event?.description || '';
            if (copyStatus) {
                copyStatus.className = 'text-xs text-gray-400';
                copyStatus.textContent = 'Changes discarded';
                setTimeout(() => { copyStatus.textContent = ''; }, 1800);
            }
        });
        if (STATE.editCopyOnOpen) {
            STATE.editCopyOnOpen = false;
            setTimeout(() => {
                document.getElementById('emCopyEditorCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                copyTitle?.focus();
                copyTitle?.select();
            }, 100);
        }
    }

    async function saveEventCopy(form) {
        const STATE = getState();
        const e = STATE.event;
        if (!e || !form) return;
        const titleInput = document.getElementById('emCopyTitle');
        const descriptionInput = document.getElementById('emCopyDescription');
        const saveBtn = document.getElementById('emCopySave');
        const status = document.getElementById('emCopyStatus');
        const title = (titleInput?.value || '').trim();
        const description = (descriptionInput?.value || '').trim();

        function setStatus(message, isError) {
            if (!status) return;
            status.className = isError ? 'text-xs text-red-600' : 'text-xs text-gray-400';
            status.textContent = message;
        }

        if (!title) {
            setStatus('Title is required.', true);
            titleInput?.focus();
            return;
        }

        if (saveBtn) saveBtn.disabled = true;
        setStatus('Saving...', false);

        try {
            const { data, error } = await supabaseClient
                .from('events')
                .update({ title, description: description || null })
                .eq('id', e.id)
                .select('title, description')
                .single();
            if (error) throw error;

            STATE.event.title = data?.title || title;
            STATE.event.description = data?.description || null;
            api().renderHeader?.();
            api().renderTab?.('overview');
            setTimeout(() => {
                const refreshedStatus = document.getElementById('emCopyStatus');
                if (refreshedStatus) {
                    refreshedStatus.className = 'text-xs text-emerald-600';
                    refreshedStatus.textContent = 'Saved changes.';
                    setTimeout(() => { refreshedStatus.textContent = ''; }, 2500);
                }
            }, 0);
            api().notifyParent?.('updated', e.id);
        } catch (err) {
            setStatus('Update failed: ' + (err.message || 'unknown error'), true);
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    async function ensureQrCode() {
        if (typeof window.evtEnsureQRCode === 'function') return window.evtEnsureQRCode();
        return globalThis.QRCode;
    }

    async function renderOverviewQrs(inviteUrl, e) {
        const inviteCanvas = document.getElementById('emInviteQR');
        const venueCanvas = document.getElementById('emVenueQR');
        if ((!inviteCanvas || !e.slug) && (!venueCanvas || !e.venue_qr_token)) return;
        try {
            const qr = await ensureQrCode();
            if (inviteCanvas?.isConnected && e.slug) {
                qr.toCanvas(inviteCanvas, inviteUrl, { width: 220, margin: 2, color: { dark: '#111827', light: '#ffffff' } });
            }
            if (venueCanvas?.isConnected && e.venue_qr_token) {
                qr.toCanvas(venueCanvas, `${window.location.origin}/events/?e=${encodeURIComponent(e.slug || '')}&checkin=1`, { width: 200, margin: 2 });
            }
        } catch (err) {
            console.warn('[events/manage] QR code renderer unavailable', err);
        }
    }

    async function toggleFeatured() {
        const STATE = getState();
        const btn = document.getElementById('emFeaturedToggle');
        if (!btn) return;
        const newVal = !(STATE.event.is_featured);
        btn.disabled = true;
        const { error } = await supabaseClient
            .from('events')
            .update({ is_featured: newVal })
            .eq('id', STATE.event.id);
        if (error) {
            alert('Failed to update: ' + error.message);
            btn.disabled = false;
            return;
        }
        STATE.event.is_featured = newVal;
        // Re-render overview tab to reflect new state
        api().renderTab?.('overview');
        // Notify list view to refresh hero
        document.dispatchEvent(new CustomEvent('events:manage:updated', { detail: { eventId: STATE.event.id } }));
    }

    window.EventsManageOverview = {
        overviewHtml,
        wireOverview,
        saveEventCopy,
        ensureQrCode,
        renderOverviewQrs,
        toggleFeatured,
    };
    window._emToggleFeatured = toggleFeatured;
})();

;/* ===== js/portal/events/manage/images.js ===== */
// Portal Events — Manage images tab (Phase 5M.3B)
(function () {
    'use strict';

    function api() {
        return window.EventsManageImagesApi || {};
    }

    function esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }
    function money(cents) {
        return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
    }

    // ─── Images tab ─────────────────────────────────────────────────
    // Pending file selections (set by drop-zone wiring, cleared on save)
    const imgFiles = { banner: null, embed: null };

    function imgDropZone(id, label, hint, currentUrl) {
        const STATE = api().getState?.() || {};
        const hasImg = !!currentUrl;
        return `
            <div id="${id}Zone" class="em-img-zone${hasImg ? ' em-img-zone--has' : ''}" data-zone="${id}">
                <input id="${id}FileInput" type="file" accept="image/*" style="display:none">
                <img id="${id}Preview" src="${esc(currentUrl)}" alt=""
                     style="width:100%;border-radius:10px;object-fit:cover;max-height:200px;margin-bottom:10px;${hasImg ? '' : 'display:none'}">
                <div id="${id}Prompt" style="${hasImg ? 'display:none' : ''}">
                    <svg style="width:32px;height:32px;color:#9ca3af;margin-bottom:8px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4-4a3 3 0 014 0l4 4m-4-4l1.5-1.5a3 3 0 014 0L20 16M14 8h.01M4 19h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1z"/></svg>
                    <p style="font-size:13px;font-weight:700;color:#374151;margin:0 0 2px">${label}</p>
                    <p style="font-size:11px;color:#9ca3af;margin:0">${hint}</p>
                </div>
                ${hasImg ? `<p style="font-size:11px;color:#9ca3af;margin:0 0 8px;text-align:center">Click or drop to replace</p>` : ''}
                <button type="button" class="em-btn-ghost" style="font-size:12px;padding:6px 12px" data-pick="${id}">Choose file</button>
            </div>
            <p style="font-size:11px;color:#9ca3af;margin-top:6px">Or paste a URL:</p>
            <input id="${id}UrlInput" class="em-input" type="url" placeholder="https://…" value="${esc(currentUrl)}" style="margin-top:4px">
        `;
    }

    function imagesHtml() {
        const STATE = api().getState?.() || {};
        const e = STATE.event;
        return `
            <style>
                .em-img-zone { border:2px dashed #e5e7eb; border-radius:14px; padding:24px 16px; text-align:center; cursor:pointer; transition:border-color .15s,background .15s; display:flex; flex-direction:column; align-items:center; gap:4px; }
                .em-img-zone:hover, .em-img-zone.em-drag-over { border-color:#818cf8; background:#f5f3ff; }
                .em-img-zone--has { padding:14px 16px; }
            </style>

            <div class="em-card em-command-card mb-4">
                <p class="em-command-eyebrow">Images</p>
                <h3 class="em-command-title">Banner &amp; embed image</h3>
                <p class="em-command-copy">The banner is shown at the top of the event detail page. The embed image is used for social media previews — if none is set, the banner is used as fallback.</p>
            </div>

            <div class="em-card mb-3">
                <div class="em-section-head" style="margin-bottom:12px">
                    <div>
                        <h3 class="em-section-title">Event banner</h3>
                        <p class="em-section-sub">Hero image on the public event page. Min 1200×400 px recommended.</p>
                    </div>
                </div>
                ${imgDropZone('emBanner', 'Drop image here or click to upload', 'JPG, PNG, WebP · max 10 MB', e.banner_url || '')}
            </div>

            <div class="em-card mb-4">
                <div class="em-section-head" style="margin-bottom:12px">
                    <div>
                        <h3 class="em-section-title">Embed / social preview image</h3>
                        <p class="em-section-sub">Used when the event link is shared on social media. 1200×630 px recommended. Falls back to the banner.</p>
                    </div>
                </div>
                ${imgDropZone('emEmbed', 'Drop image here or click to upload', 'JPG, PNG, WebP · max 10 MB · optional', e.embed_image_url || '')}
            </div>

            <div style="display:flex;align-items:center;gap:10px">
                <button id="emImagesSave" class="em-btn-primary">Save images</button>
                <span id="emImagesSaveStatus" style="font-size:12px;color:#6b7280"></span>
            </div>
        `;
    }

    function wireImages() {
        const STATE = api().getState?.() || {};
        const e = STATE.event;
        // Reset pending file selections when re-rendering
        imgFiles.banner = null;
        imgFiles.embed  = null;

        ['banner', 'embed'].forEach(key => {
            const zoneId   = `em${key.charAt(0).toUpperCase() + key.slice(1)}`;
            const zone     = document.getElementById(`${zoneId}Zone`);
            const fileInput= document.getElementById(`${zoneId}FileInput`);
            const urlInput = document.getElementById(`${zoneId}UrlInput`);
            const preview  = document.getElementById(`${zoneId}Preview`);
            const prompt   = document.getElementById(`${zoneId}Prompt`);
            const pickBtn  = zone?.querySelector(`[data-pick="${zoneId}"]`);
            if (!zone || !fileInput || !urlInput) return;

            function applyFile(file) {
                if (!file || !file.type.startsWith('image/')) return;
                imgFiles[key] = file;
                const reader = new FileReader();
                reader.onload = ev => {
                    preview.src = ev.target.result;
                    preview.style.display = '';
                    if (prompt) prompt.style.display = 'none';
                    urlInput.value = '';
                };
                reader.readAsDataURL(file);
            }

            // Click zone or pick button → open file picker
            zone.addEventListener('click', (ev) => {
                if (ev.target === pickBtn || pickBtn?.contains(ev.target)) return; // handled below
                fileInput.click();
            });
            pickBtn?.addEventListener('click', (ev) => { ev.stopPropagation(); fileInput.click(); });
            fileInput.addEventListener('change', () => { if (fileInput.files[0]) applyFile(fileInput.files[0]); });

            // Drag and drop
            zone.addEventListener('dragover', (ev) => { ev.preventDefault(); zone.classList.add('em-drag-over'); });
            zone.addEventListener('dragleave', () => zone.classList.remove('em-drag-over'));
            zone.addEventListener('drop', (ev) => {
                ev.preventDefault();
                zone.classList.remove('em-drag-over');
                const file = ev.dataTransfer.files?.[0];
                if (file) applyFile(file);
            });

            // URL input → live preview
            urlInput.addEventListener('input', () => {
                const val = urlInput.value.trim();
                imgFiles[key] = null; // clear pending file if URL typed manually
                if (val) { preview.src = val; preview.style.display = ''; if (prompt) prompt.style.display = 'none'; }
                else { preview.style.display = 'none'; if (prompt) prompt.style.display = ''; }
            });
        });

        document.getElementById('emImagesSave')?.addEventListener('click', async () => {
            const saveBtn = document.getElementById('emImagesSave');
            const status  = document.getElementById('emImagesSaveStatus');
            saveBtn.disabled = true;

            const slug = e.slug || e.id;

            async function resolveUrl(key, currentUrl) {
                const file = imgFiles[key];
                if (file) {
                    status.textContent = `Uploading ${key}…`;
                    const ext  = file.name.split('.').pop().toLowerCase() || 'jpg';
                    const path = key === 'embed'
                        ? `embeds/${slug}-${Date.now()}.${ext}`
                        : `${slug}-${Date.now()}.${ext}`;
                    const { error: upErr } = await supabaseClient.storage
                        .from('event-banners')
                        .upload(path, file, { contentType: file.type, upsert: true });
                    if (upErr) throw new Error(`${key} upload failed: ${upErr.message}`);
                    return supabaseClient.storage.from('event-banners').getPublicUrl(path).data.publicUrl;
                }
                // Fall back to URL input
                const zoneId  = `em${key.charAt(0).toUpperCase() + key.slice(1)}`;
                return document.getElementById(`${zoneId}UrlInput`)?.value.trim() || null;
            }

            try {
                status.textContent = 'Saving…';
                const [bannerUrl, embedUrl] = await Promise.all([
                    resolveUrl('banner', e.banner_url),
                    resolveUrl('embed',  e.embed_image_url),
                ]);

                const { error } = await supabaseClient
                    .from('events')
                    .update({ banner_url: bannerUrl, embed_image_url: embedUrl })
                    .eq('id', e.id);
                if (error) throw error;

                STATE.event.banner_url      = bannerUrl;
                STATE.event.embed_image_url = embedUrl;
                imgFiles.banner = null;
                imgFiles.embed  = null;
                status.textContent = 'Saved ✓';
                setTimeout(() => { status.textContent = ''; }, 2500);
                api().notifyParent?.('updated', e.id);
            } catch (err) {
                status.textContent = 'Error: ' + (err.message || 'save failed');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    window.EventsManageImages = {
        imagesHtml,
        wireImages
    };
})();

;/* ===== js/portal/events/manage/docs.js ===== */
// Portal Events — Manage docs tab (Phase 5M.3B)
(function () {
    'use strict';

    function api() {
        return window.EventsManageDocsApi || {};
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
    // M3b — DOCS TAB
    // ═══════════════════════════════════════════════════════════════
    async function loadDocs() {
        const STATE = api().getState?.() || {};
        const { data, error } = await supabaseClient
            .from('event_documents')
            .select('id, doc_type, label, file_name, file_size_bytes, file_path, distributed, target_user_id, created_at, profiles:target_user_id(first_name, last_name, profile_picture_url)')
            .eq('event_id', STATE.eventId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        return { docs: data || [] };
    }

    function docTypeIcon(type) {
        const STATE = api().getState?.() || {};
        return ({
            plane_ticket: '✈️', group_ticket: '🎫', itinerary: '🗺️',
            receipt: '🧾', other: '📄',
        })[type] || '📄';
    }

    function formatBytes(bytes) {
        const STATE = api().getState?.() || {};
        if (!bytes) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }

    function docsHtml() {
        const STATE = api().getState?.() || {};
        const docs = STATE.tabData.docs.docs;
        const groupDocs = docs.filter(d => !d.target_user_id);
        const memberDocs = docs.filter(d => d.target_user_id);
        const goingMembers = STATE.rsvps
            .filter(r => r.status === 'going')
            .map(r => {
                const profile = r.profiles || {};
                return {
                    id: r.user_id,
                    name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Member',
                };
            });

        const distributedCount = docs.filter(d => d.distributed).length;
        const pendingCount = docs.length - distributedCount;
        const distributedPct = docs.length ? Math.round((distributedCount / docs.length) * 100) : 0;
        const totalBytes = docs.reduce((sum, d) => sum + (d.file_size_bytes || 0), 0);

        function docRow(d) {
            const distBtn = d.distributed
                ? `<button class="em-pill em-pill-checked" data-doc-action="undistribute" data-id="${d.id}" style="border:none;cursor:pointer">Distributed ✓</button>`
                : `<button class="em-pill em-pill-paid" data-doc-action="distribute" data-id="${d.id}" style="border:none;cursor:pointer">Mark sent</button>`;
            return `
                <div class="em-attendee-card">
                    <div class="em-avatar" style="background:#fef3c7;color:#92400e;font-size:16px">${docTypeIcon(d.doc_type)}</div>
                    <div class="em-attendee-main">
                        <p class="em-attendee-name">${esc(d.label || d.file_name || 'Document')}</p>
                        <p class="em-attendee-sub">${esc(d.file_name || '')} · ${formatBytes(d.file_size_bytes)}</p>
                        <div class="flex flex-wrap gap-1 mt-2">${distBtn}<span class="em-pill em-pill-going">${d.target_user_id ? 'Member file' : 'Group file'}</span></div>
                    </div>
                    <button data-doc-action="delete" data-id="${d.id}" class="text-xs text-red-600 font-semibold hover:underline" style="background:none;border:none;cursor:pointer">Delete</button>
                </div>
            `;
        }

        function memberSection(memberDoc) {
            // Group per-member docs by user
            const byUser = {};
            memberDoc.forEach(d => {
                const uid = d.target_user_id;
                (byUser[uid] = byUser[uid] || { user: d.profiles, docs: [] }).docs.push(d);
            });
            const userList = Object.values(byUser);
            if (!userList.length) return `<p class="text-xs text-gray-400 italic py-2">No per-member documents yet.</p>`;
            return userList.map(u => {
                const p = u.user || {};
                const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
                return `
                    <div style="margin-bottom:14px">
                        <div class="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">${esc(name)} <span class="text-gray-400 font-normal">· ${u.docs.length}</span></div>
                        ${u.docs.map(docRow).join('')}
                    </div>
                `;
            }).join('');
        }

        const memberOptions = goingMembers.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
        const typeOptions = (api().getDocTypes?.() || []).map(t => `<option value="${esc(t.value)}">${esc(t.label)}</option>`).join('');

        return `
            <div class="em-card em-command-card mb-4">
                <p class="em-command-eyebrow">Document handoff</p>
                <h3 class="em-command-title">${pendingCount ? `${pendingCount} document${pendingCount === 1 ? '' : 's'} pending` : 'Documents are caught up'}</h3>
                <p class="em-command-copy">Upload group files or member-specific travel docs here. Attendees only see a retrieval button on the event page.</p>
                <div class="em-op-progress" style="margin-top:14px;background:rgba(255,255,255,.22)"><span style="width:${distributedPct}%;background:#a7f3d0"></span></div>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Total files</span><strong>${docs.length}</strong><small>${formatBytes(totalBytes)}</small></div>
                <div class="em-metric"><span>Distributed</span><strong>${distributedCount}</strong><small>${distributedPct}% complete</small></div>
                <div class="em-metric"><span>Pending</span><strong>${pendingCount}</strong><small>Need handoff</small></div>
                <div class="em-metric"><span>Member files</span><strong>${memberDocs.length}</strong><small>${groupDocs.length} group</small></div>
            </div>

            <div class="em-card mb-4">
                <div class="em-section-head"><div><h3 class="em-section-title">Upload document</h3><p class="em-section-sub">Choose who can retrieve this file from the attendee-facing document viewer.</p></div></div>
                <div class="grid sm:grid-cols-2 gap-3">
                    <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Visible to
                        <select id="emDocTargetMode" class="em-input mt-1">
                            <option value="group">Everyone RSVP'd</option>
                            <option value="member">Specific member</option>
                        </select>
                    </label>
                    <label id="emDocMemberWrap" class="text-xs font-bold uppercase tracking-wide text-gray-500 hidden">Member
                        <select id="emDocMember" class="em-input mt-1">
                            ${memberOptions || '<option value="">No RSVP\'d members yet</option>'}
                        </select>
                    </label>
                    <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Label
                        <input id="emDocLabel" type="text" class="em-input mt-1" placeholder="Flight ticket, itinerary, receipt">
                    </label>
                    <label class="text-xs font-bold uppercase tracking-wide text-gray-500">Type
                        <select id="emDocType" class="em-input mt-1">${typeOptions}</select>
                    </label>
                    <label class="text-xs font-bold uppercase tracking-wide text-gray-500 sm:col-span-2">File
                        <input id="emDocFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" class="em-input mt-1">
                    </label>
                </div>
                <div class="flex items-center justify-between gap-3 mt-3">
                    <p class="text-xs text-gray-400">Uploads live here in Manage Event. Members only see a document viewer button on the event page.</p>
                    <button id="emDocUploadBtn" class="em-btn-primary">Upload</button>
                </div>
            </div>

            <div class="em-card mb-3">
                <div class="em-section-head"><div><h3 class="em-section-title">Group documents <span class="text-gray-400 font-normal">· ${groupDocs.length}</span></h3><p class="em-section-sub">Visible to everyone with RSVP access.</p></div></div>
                ${groupDocs.length ? groupDocs.map(docRow).join('') : `<p class="text-xs text-gray-400 italic py-2">No group documents yet.</p>`}
            </div>

            <div class="em-card">
                <div class="em-section-head"><div><h3 class="em-section-title">Per-member documents <span class="text-gray-400 font-normal">· ${memberDocs.length}</span></h3><p class="em-section-sub">Private files for individual attendees, like tickets or receipts.</p></div></div>
                ${memberSection(memberDocs)}
            </div>
        `;
    }

    function wireDocs() {
        const STATE = api().getState?.() || {};
        const targetMode = document.getElementById('emDocTargetMode');
        const memberWrap = document.getElementById('emDocMemberWrap');
        const type = document.getElementById('emDocType');
        if (type) type.value = 'itinerary';
        targetMode?.addEventListener('change', () => {
            memberWrap?.classList.toggle('hidden', targetMode.value !== 'member');
            if (type) type.value = targetMode.value === 'member' ? 'plane_ticket' : 'itinerary';
        });
        document.getElementById('emDocUploadBtn')?.addEventListener('click', uploadDocFromManage);

        document.getElementById('emSheetContent').querySelectorAll('[data-doc-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = btn.dataset.docAction;
                const id = btn.dataset.id;
                if (action === 'delete') {
                    if (!confirm('Delete this document? This cannot be undone.')) return;
                    const doc = STATE.tabData.docs.docs.find(d => d.id === id);
                    if (doc?.file_path) await supabaseClient.storage.from('event-documents').remove([doc.file_path]);
                    const { error } = await supabaseClient.from('event_documents').delete().eq('id', id);
                    if (error) return alert('Delete failed: ' + error.message);
                } else {
                    const { error } = await supabaseClient
                        .from('event_documents')
                        .update({ distributed: action === 'distribute' })
                        .eq('id', id);
                    if (error) return alert('Update failed: ' + error.message);
                }
                STATE.tabData.docs = null;
                api().renderTab?.('docs');
                api().notifyParent?.('updated', STATE.eventId);
            });
        });
    }

    async function uploadDocFromManage() {
        const STATE = api().getState?.() || {};
        const btn = document.getElementById('emDocUploadBtn');
        const mode = document.getElementById('emDocTargetMode')?.value || 'group';
        const targetUserId = mode === 'member' ? (document.getElementById('emDocMember')?.value || '') : '';
        const label = (document.getElementById('emDocLabel')?.value || '').trim();
        const docType = document.getElementById('emDocType')?.value || 'other';
        const file = document.getElementById('emDocFile')?.files?.[0];

        if (mode === 'member' && !targetUserId) return alert('Choose a member for this document.');
        if (!label) return alert('Add a document label.');
        if (!file) return alert('Choose a file to upload.');

        btn.disabled = true;
        btn.textContent = 'Uploading...';
        try {
            const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
            const storagePath = `${STATE.eventId}/${targetUserId || 'group'}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
            const { error: uploadErr } = await supabaseClient.storage
                .from('event-documents')
                .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' });
            if (uploadErr) throw uploadErr;

            const { error: dbErr } = await supabaseClient
                .from('event_documents')
                .insert({
                    event_id: STATE.eventId,
                    uploaded_by: evtCurrentUser.id,
                    target_user_id: targetUserId || null,
                    doc_type: docType,
                    label,
                    file_path: storagePath,
                    file_name: file.name,
                    file_size_bytes: file.size,
                    mime_type: file.type,
                });
            if (dbErr) throw dbErr;

            STATE.tabData.docs = null;
            api().renderTab?.('docs');
            api().notifyParent?.('updated', STATE.eventId);
        } catch (err) {
            alert('Upload failed: ' + (err.message || err));
        } finally {
            btn.disabled = false;
            btn.textContent = 'Upload';
        }
    }

    window.EventsManageDocs = {
        loadDocs,
        docsHtml,
        wireDocs,
        uploadDocFromManage
    };
})();

;/* ===== js/portal/events/manage/rsvps.js ===== */
// Portal Events — Manage RSVPs tab (Phase 5M.3B)
(function () {
    'use strict';

    function api() {
        return window.EventsManageRsvpsApi || {};
    }

    function esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }
    function money(cents) {
        return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
    }

    // ─── RSVPs tab ──────────────────────────────────────────────────
    function rsvpsHtml() {
        const STATE = api().getState?.() || {};
        const e = STATE.event;
        const going = STATE.rsvps.filter(r => r.status === 'going');
        const maybe = STATE.rsvps.filter(r => r.status === 'maybe');
        const not   = STATE.rsvps.filter(r => r.status === 'not_going');
        const guestGoing = STATE.guestRsvps.filter(r => r.status === 'going');
        const checkedSet = new Set(STATE.checkins.map(c => c.user_id));
        const guestCheckedSet = new Set(STATE.checkins.map(c => c.guest_token).filter(Boolean));
        const totalGoing = going.length + guestGoing.length;
        const checkedTotal = STATE.checkins.length;
        const capacity = e.max_participants || 0;
        const capacityLeft = capacity ? Math.max(0, capacity - totalGoing) : null;
        const minNeeded = Number(e.min_participants || 0);
        const thresholdLeft = minNeeded ? Math.max(0, minNeeded - totalGoing) : 0;
        const checkedPct = totalGoing ? Math.round((checkedTotal / totalGoing) * 100) : 0;

        function memberRow(r) {
            const p = r.profiles || {};
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
            const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?';
            const avatar = p.profile_picture_url
                ? `<img src="${esc(p.profile_picture_url)}" alt="">`
                : `<span>${initials}</span>`;
            const pills = [];
            if (r.status === 'going') pills.push('<span class="em-pill em-pill-going">Going</span>');
            else if (r.status === 'maybe') pills.push('<span class="em-pill em-pill-maybe">Maybe</span>');
            else pills.push('<span class="em-pill em-pill-not">Not going</span>');
            if (r.paid) pills.push('<span class="em-pill em-pill-paid">Paid</span>');
            if (checkedSet.has(r.user_id)) pills.push('<span class="em-pill em-pill-checked">Checked in</span>');
            return `<div class="em-attendee-card"><div class="em-avatar">${avatar}</div><div class="em-attendee-main"><p class="em-attendee-name">${esc(name)}</p><p class="em-attendee-sub">Member RSVP${r.qr_token ? ' · ticket ready' : ''}</p><div class="flex flex-wrap gap-1 mt-2">${pills.join('')}</div></div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-rsvp="member" data-rsvp-id="${esc(r.id)}" data-user-id="${esc(r.user_id)}" data-paid="${r.paid ? '1' : '0'}" data-name="${esc(name)}">Remove</button></div>`;
        }

        function guestRow(g) {
            const initials = (g.guest_name || 'G').slice(0, 1).toUpperCase();
            const pills = ['<span class="em-pill em-pill-going">Guest</span>'];
            if (g.paid) pills.push('<span class="em-pill em-pill-paid">Paid</span>');
            if (guestCheckedSet.has(g.guest_token)) pills.push('<span class="em-pill em-pill-checked">Checked in</span>');
            const name = g.guest_name || 'Guest';
            return `<div class="em-attendee-card"><div class="em-avatar" style="background:#fef3c7;color:#92400e"><span>${esc(initials)}</span></div><div class="em-attendee-main"><p class="em-attendee-name">${esc(name)}</p><p class="em-attendee-sub">${esc(g.guest_email || 'Public guest')}</p><div class="flex flex-wrap gap-1 mt-2">${pills.join('')}</div></div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-rsvp="guest" data-rsvp-id="${esc(g.id)}" data-guest-token="${esc(g.guest_token)}" data-paid="${g.paid ? '1' : '0'}" data-name="${esc(name)}">Remove</button></div>`;
        }

        function section(title, list, emptyText) {
            return `
                <div class="em-card mb-3">
                    <div class="em-section-head"><div><h3 class="em-section-title">${title} <span class="text-gray-400 font-normal">· ${list.length}</span></h3></div></div>
                    ${list.length ? list.map(memberRow).join('') : `<p class="text-xs text-gray-400 italic py-2">${emptyText}</p>`}
                </div>
            `;
        }

        return `
            <div class="em-card em-command-card mb-4">
                <p class="em-command-eyebrow">Attendance command</p>
                <h3 class="em-command-title">${totalGoing ? `${totalGoing} attending` : 'No confirmed attendees yet'}</h3>
                <p class="em-command-copy">${thresholdLeft ? `${thresholdLeft} more RSVP${thresholdLeft === 1 ? '' : 's'} needed to meet the minimum.` : 'Minimum and attendance signals are in good shape.'} ${capacityLeft !== null ? `${capacityLeft} spot${capacityLeft === 1 ? '' : 's'} still available.` : 'Capacity is open-ended.'}</p>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Total going</span><strong>${totalGoing}</strong><small>${going.length} member · ${guestGoing.length} guest</small></div>
                <div class="em-metric"><span>Checked in</span><strong>${checkedTotal}</strong><small>${checkedPct}% of going</small></div>
                <div class="em-metric"><span>Interested</span><strong>${maybe.length}</strong><small>Member maybes</small></div>
                <div class="em-metric"><span>Capacity</span><strong>${capacityLeft === null ? 'Open' : capacityLeft}</strong><small>${capacity ? `${totalGoing}/${capacity} filled` : 'No max set'}</small></div>
            </div>

            ${section('Going members', going, 'No members are going yet.')}
            <div class="em-card mb-3">
                <div class="em-section-head"><div><h3 class="em-section-title">Public guests <span class="text-gray-400 font-normal">· ${guestGoing.length}</span></h3><p class="em-section-sub">Guests from the public event link and ticket flow.</p></div></div>
                ${guestGoing.length ? guestGoing.map(guestRow).join('') : '<p class="text-xs text-gray-400 italic py-2">No public guests yet.</p>'}
            </div>
            ${section('Interested', maybe, 'No interested members.')}
            ${not.length ? section('Not going', not, '') : ''}
        `;
    }

    function wireRsvps() {
        const STATE = api().getState?.() || {};
        document.getElementById('emSheetContent')?.querySelectorAll('[data-remove-rsvp]').forEach(btn => {
            btn.addEventListener('click', () => api().removeParticipationPerson?.(btn));
        });
    }

    window.EventsManageRsvps = {
        rsvpsHtml,
        wireRsvps
    };
})();

;/* ===== js/portal/events/manage/money.js ===== */
// Portal Events — Manage money tab (Phase 5M.3B)
(function () {
    'use strict';

    function api() {
        return window.EventsManageMoneyApi || {};
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
    // M3b — MONEY TAB
    // ═══════════════════════════════════════════════════════════════
    async function loadMoney() {
        const STATE = api().getState?.() || {};
        const eventId = STATE.eventId;
        const [rsvpsRes, guestRes, raffleRes, poolRes] = await Promise.all([
            supabaseClient
                .from('event_rsvps')
                .select('id, user_id, status, amount_paid_cents, paid, refunded, refund_amount_cents, stripe_payment_intent_id, profiles!event_rsvps_user_id_fkey(first_name, last_name, profile_picture_url)')
                .eq('event_id', eventId),
            supabaseClient
                .from('event_guest_rsvps')
                .select('id, guest_name, guest_email, status, paid, amount_paid_cents, stripe_payment_intent_id')
                .eq('event_id', eventId),
            supabaseClient
                .from('event_raffle_entries')
                .select('id, paid, amount_paid_cents')
                .eq('event_id', eventId),
            supabaseClient
                .from('prize_pool_contributions')
                .select('id, amount_cents')
                .eq('event_id', eventId),
        ]);
        return {
            rsvps:    rsvpsRes.data    || [],
            guests:   guestRes.data    || [],
            raffle:   raffleRes.data   || [],
            poolPays: poolRes.data     || [],
        };
    }

    function moneyHtml() {
        const STATE = api().getState?.() || {};
        const d = STATE.tabData.money;
        const isPaidEvent = STATE.event?.pricing_mode === 'paid' || Number(STATE.event?.rsvp_cost_cents || 0) > 0;
        const paidRsvps = d.rsvps.filter(r => r.paid);
        const paidGuests = d.guests.filter(g => g.paid);
        const refundedRsvps = d.rsvps.filter(r => r.refunded);
        const unpaidGoing = isPaidEvent ? STATE.rsvps.filter(r => r.status === 'going' && !r.paid).length + STATE.guestRsvps.filter(g => g.status === 'going' && !g.paid).length : 0;

        const rsvpRevenue   = paidRsvps.reduce((s, r) => s + (r.amount_paid_cents || 0), 0);
        const guestRevenue  = paidGuests.reduce((s, g) => s + (g.amount_paid_cents || 0), 0);
        const raffleRevenue = d.raffle.filter(e => e.paid).reduce((s, e) => s + (e.amount_paid_cents || 0), 0);
        const poolRevenue   = d.poolPays.reduce((s, p) => s + (p.amount_cents || 0), 0);
        const refunded      = refundedRsvps.reduce((s, r) => s + (r.refund_amount_cents || 0), 0);
        const grossRevenue  = rsvpRevenue + guestRevenue + raffleRevenue + poolRevenue;
        const netRevenue    = grossRevenue - refunded;

        const fmt = window.formatCurrency || money;
        const ticketLabel = isPaidEvent ? 'Paid RSVPs' : 'Ticketed RSVPs';

        function paymentRow({ name, sub, amount, refundedAmount, stripeId, avatarHtml, isGuest }) {
            const refundPill = refundedAmount
                ? `<span class="em-pill em-pill-not">Refunded ${fmt(refundedAmount)}</span>`
                : `<span class="em-pill em-pill-paid">${amount > 0 ? `Paid ${fmt(amount)}` : 'Ticketed'}</span>`;
            return `
                <div class="em-attendee-card">
                    <div class="em-avatar"${isGuest ? ' style="background:#fef3c7;color:#92400e"' : ''}>${avatarHtml}</div>
                    <div class="em-attendee-main">
                        <p class="em-attendee-name">${esc(name)}</p>
                        <p class="em-attendee-sub">${esc(sub)}</p>
                        <div class="flex flex-wrap gap-1 mt-2">${refundPill}${isGuest ? '<span class="em-pill em-pill-going">Guest</span>' : ''}</div>
                    </div>
                    ${stripeId ? `<a href="https://dashboard.stripe.com/payments/${encodeURIComponent(stripeId)}" target="_blank" rel="noopener" class="text-xs text-brand-600 font-semibold hover:underline whitespace-nowrap">Stripe ↗</a>` : ''}
                </div>`;
        }

        const memberRows = paidRsvps.map(r => {
            const p = r.profiles || {};
            const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member';
            const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?';
            const avatar = p.profile_picture_url ? `<img src="${esc(p.profile_picture_url)}" alt="">` : `<span>${initials}</span>`;
            return paymentRow({ name, sub: 'Member RSVP payment', amount: r.amount_paid_cents || 0, refundedAmount: r.refund_amount_cents || 0, stripeId: r.stripe_payment_intent_id, avatarHtml: avatar });
        });
        const guestRows = paidGuests.map(g => paymentRow({
            name: g.guest_name || 'Guest',
            sub: g.guest_email || 'Public guest payment',
            amount: g.amount_paid_cents || 0,
            refundedAmount: 0,
            stripeId: g.stripe_payment_intent_id,
            avatarHtml: `<span>${esc((g.guest_name || 'G').slice(0, 1).toUpperCase())}</span>`,
            isGuest: true,
        }));
        const paymentRows = [...memberRows, ...guestRows].join('') || `<p class="text-xs text-gray-400 italic py-2">No paid RSVPs yet.</p>`;

        return `
            <div class="em-card em-command-card mb-4">
                <p class="em-command-eyebrow">Money command</p>
                <h3 class="em-command-title">${fmt(netRevenue)} net collected</h3>
                <p class="em-command-copy">${grossRevenue ? `${fmt(grossRevenue)} gross across RSVP, guest, raffle, and prize-pool activity.` : (isPaidEvent ? 'No paid activity has landed yet.' : 'This free event has no RSVP revenue to collect.')} ${unpaidGoing ? `${unpaidGoing} going attendee${unpaidGoing === 1 ? '' : 's'} still show unpaid.` : (isPaidEvent ? 'No unpaid going attendees are currently flagged.' : 'Ticketed attendees are tracked for access and check-in.')}</p>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Gross</span><strong>${fmt(grossRevenue)}</strong><small>All sources</small></div>
                <div class="em-metric"><span>Net</span><strong>${fmt(netRevenue)}</strong><small>After refunds</small></div>
                <div class="em-metric"><span>Refunded</span><strong>${fmt(refunded)}</strong><small>${refundedRsvps.length} member RSVP${refundedRsvps.length === 1 ? '' : 's'}</small></div>
                <div class="em-metric"><span>${ticketLabel}</span><strong>${paidRsvps.length + paidGuests.length}</strong><small>${paidRsvps.length} member · ${paidGuests.length} guest</small></div>
            </div>

            <div class="em-money-layout">
                <div class="em-card">
                    <div class="em-section-head"><div><h3 class="em-section-title">${isPaidEvent ? 'Paid attendees' : 'Ticketed attendees'} <span class="text-gray-400 font-normal">· ${paidRsvps.length + paidGuests.length}</span></h3><p class="em-section-sub">${isPaidEvent ? 'Member and public guest RSVP payments.' : 'Members and public guests with issued event tickets.'}</p></div></div>
                    ${paymentRows}
                </div>

                <div class="em-card">
                    <div class="em-section-head"><div><h3 class="em-section-title">Revenue sources</h3><p class="em-section-sub">Quick audit of how money entered this event.</p></div></div>
                    <div class="em-money-row"><span>Member RSVP payments</span><strong>${fmt(rsvpRevenue)}</strong></div>
                    <div class="em-money-row"><span>Guest RSVP payments</span><strong>${fmt(guestRevenue)}</strong></div>
                    <div class="em-money-row"><span>Raffle entries</span><strong>${fmt(raffleRevenue)}</strong></div>
                    <div class="em-money-row"><span>Prize-pool contributions</span><strong>${fmt(poolRevenue)}</strong></div>
                    <div class="em-money-row"><span>Refunds recorded</span><strong>${fmt(refunded)}</strong></div>
                    <p class="text-xs text-gray-400 mt-3">Refunds are still handled through Stripe/dashboard tooling. This panel keeps the host-facing audit trail together.</p>
                </div>
            </div>
        `;
    }

    function wireMoney() {
        const STATE = api().getState?.() || {}; /* read-only in M3b */ }

    window.EventsManageMoney = {
        loadMoney,
        moneyHtml,
        wireMoney
    };
})();

;/* ===== js/portal/events/manage/competition.js ===== */
// Portal Events — Manage competition tab (Phase 5M.3B)
(function () {
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

    window.EventsManageCompetition = {
        loadComp,
        compHtml,
        wireComp
    };
})();

;/* ===== js/portal/events/manage/participation.js ===== */
// Portal Events — Manage participation (Phase 5M.3C)
(function () {
    'use strict';

    function api() {
        return window.EventsManageParticipationApi || {};
    }

    function esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }
    function money(cents) {
        return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
    }

    async function getParticipationResetCounts() {
        const STATE = api().getState?.() || {};
        const eventId = STATE.eventId;
        const tables = [
            ['member RSVPs', 'event_rsvps'],
            ['guest RSVPs', 'event_guest_rsvps'],
            ['check-ins', 'event_checkins'],
            ['raffle entries', 'event_raffle_entries'],
            ['raffle winners', 'event_raffle_winners'],
        ];
        const results = await Promise.all(tables.map(async ([label, table]) => {
            const { count, error } = await supabaseClient
                .from(table)
                .select('id', { count: 'exact', head: true })
                .eq('event_id', eventId);
            if (error) throw error;
            return { label, table, count: count || 0 };
        }));
        return results;
    }

    async function resetParticipation() {
        const STATE = api().getState?.() || {};
        const e = STATE.event;
        if (!e) return;
        let counts = [];
        try {
            counts = await getParticipationResetCounts();
        } catch (err) {
            alert('Could not load participation counts: ' + (err.message || 'unknown error'));
            return;
        }

        const paidTickets = STATE.rsvps.filter(r => r.paid).length + STATE.guestRsvps.filter(r => r.paid).length;
        const summary = counts.map(item => `${item.count} ${item.label}`).join('\n');
        const typed = prompt(
            `Reset participation for "${e.title}"?\n\nThis will delete:\n${summary}\n\nThe event itself, images, links, pricing, and settings stay in place. Stripe payments are NOT refunded${paidTickets ? ` (${paidTickets} paid RSVP record${paidTickets === 1 ? '' : 's'} found)` : ''}.\n\nType RESET to continue.`
        );
        if (!typed || typed.trim().toUpperCase() !== 'RESET') {
            if (typed !== null) alert('Reset cancelled.');
            return;
        }

        try {
            await callEdgeFunction('manage-event-participation', {
                action: 'reset_participation',
                event_id: e.id,
            });
            await api().refreshEventManager?.('danger');
            alert('Participation reset complete. The event is still intact.');
        } catch (err) {
            alert('Reset failed: ' + (err.message || 'unknown error'));
        }
    }

    async function removeParticipationPerson(btn) {
        const STATE = api().getState?.() || {};
        const kind = btn.dataset.removeRsvp;
        const name = btn.dataset.name || (kind === 'guest' ? 'this guest' : 'this member');
        const isPaid = btn.dataset.paid === '1';
        const warning = isPaid ? '\n\nThis was marked paid. Removing the record does not refund Stripe payments.' : '';
        if (!confirm(`Remove ${name} from this event? This also clears their check-in and raffle entry.${warning}`)) return;

        btn.disabled = true;
        btn.textContent = 'Removing...';
        try {
            if (kind === 'guest') {
                const guestToken = btn.dataset.guestToken;
                const rsvpId = btn.dataset.rsvpId;
                if (!guestToken || !rsvpId) throw new Error('Missing guest RSVP details.');
                await callEdgeFunction('manage-event-participation', {
                    action: 'remove_rsvp',
                    event_id: STATE.eventId,
                    kind: 'guest',
                    guest_token: guestToken,
                    rsvp_id: rsvpId,
                });
            } else {
                const userId = btn.dataset.userId;
                if (!userId) throw new Error('Missing member RSVP details.');
                await callEdgeFunction('manage-event-participation', {
                    action: 'remove_rsvp',
                    event_id: STATE.eventId,
                    kind: 'member',
                    user_id: userId,
                });
            }
            await api().refreshEventManager?.('rsvps');
        } catch (err) {
            alert('Remove failed: ' + (err.message || 'unknown error'));
            api().renderTab?.('rsvps');
        }
    }

    window.EventsManageParticipation = {
        getParticipationResetCounts,
        resetParticipation,
        removeParticipationPerson
    };
})();

;/* ===== js/portal/events/manage/raffle.js ===== */
// Portal Events — Manage raffle (Phase 5M.3C)
(function () {
    'use strict';

    function api() {
        return window.EventsManageRaffleApi || {};
    }

    function esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }
    function money(cents) {
        return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
    }


    const prizeImageFiles = {};
    const prizeImagePreviews = {};

    function safeFilename(value) {
        return String(value || 'event').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'event';
    }
    async function loadRaffle() {
        const STATE = api().getState?.() || {};
        const eventId = STATE.eventId;
        const [entriesRes, winnersRes, guestsRes] = await Promise.all([
            supabaseClient
                .from('event_raffle_entries')
                .select('id, user_id, guest_token, paid, amount_paid_cents, profiles:user_id(first_name, last_name, profile_picture_url)')
                .eq('event_id', eventId),
            supabaseClient
                .from('event_raffle_winners')
                .select('*, profiles:user_id(first_name, last_name, profile_picture_url)')
                .eq('event_id', eventId)
                .order('place', { ascending: true }),
            supabaseClient
                .from('event_guest_rsvps')
                .select('guest_token, guest_name, guest_email')
                .eq('event_id', eventId),
        ]);
        return {
            entries: entriesRes.data || [],
            winners: winnersRes.data || [],
            guests: guestsRes.data || [],
        };
    }

    function ord(n) {
        const s = ['th','st','nd','rd'], v = n % 100;
        return n + (s[(v-20)%10] || s[v] || s[0]);
    }

    function raffleHtml() {
        const STATE = api().getState?.() || {};
        const e = STATE.event;
        if (!e.raffle_enabled) {
            return api().emptyHtml?.('Raffle not enabled', 'Enable the raffle on the portal detail page (Edit event → Raffle).');
        }
        const d = STATE.tabData.raffle;
        const fmt = window.formatCurrency || money;
        const guestByToken = new Map((d.guests || []).map(g => [g.guest_token, g]));
        const eligibleEntries = d.entries.filter(en => en.paid || !e.raffle_entry_cost_cents);
        const memberEntries = eligibleEntries.filter(en => en.user_id);
        const guestEntries = eligibleEntries.filter(en => en.guest_token);
        const config = raffleConfig(e);
        const categories = raffleCategories(config);
        const drawQueue = raffleDrawQueue(config, d.winners);
        const winnersDrawn = d.winners.length;
        const totalPrizes = raffleTotalWinners(config) || e.raffle_winner_count || winnersDrawn;
        const remainingDraws = Math.max(0, totalPrizes - winnersDrawn);
        const allDrawn = totalPrizes > 0 && winnersDrawn >= totalPrizes;
        const canDraw = typeof window.evtOpenRaffleDraw === 'function' && eligibleEntries.length > 0 && !allDrawn;
        const drawPct = totalPrizes ? Math.round((winnersDrawn / totalPrizes) * 100) : 0;
        const raffleEntryPriceDollars = (Number(e.raffle_entry_cost_cents || 0) / 100).toFixed(2);
        const paidEventRaffleIncluded = e.pricing_mode === 'paid';
        const prizeSetupHtml = rafflePrizeSetupHtml(config, d.winners);

        const winnerRows = d.winners.length ? d.winners.map(w => {
            const p = w.profiles || {};
            const guest = w.guest_token ? guestByToken.get(w.guest_token) : null;
            const name = w.user_id ? (`${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member') : (guest?.guest_name || `Guest · ${(w.guest_token || '').slice(0,8)}`);
            const medal = ['🥇','🥈','🥉'][w.place - 1] || `#${w.place}`;
            const choiceHtml = winnerChoiceHtml(w, config, d.winners);
            return `
                <div class="em-attendee-card">
                    <div class="em-avatar" style="background:#faf5ff;color:#7c3aed;font-size:18px">${medal}</div>
                    <div class="em-attendee-main">
                        <p class="em-attendee-name">${esc(name)}</p>
                        <p class="em-attendee-sub">${ord(w.place)} place · ${esc(w.prize_description || 'Prize pending')}</p>
                        <div class="flex flex-wrap gap-1 mt-2">
                            <span class="em-pill em-pill-checked">${w.user_id ? 'Member' : 'Guest'}</span>
                            ${w.selection_status === 'pending_choice' ? '<span class="em-pill em-pill-paid">Needs prize choice</span>' : '<span class="em-pill em-pill-going">Prize assigned</span>'}
                        </div>
                        ${choiceHtml}
                    </div>
                </div>
            `;
        }).join('') : `<p class="text-xs text-gray-400 italic py-2">No winners drawn yet.</p>`;

        const entryRevenue = eligibleEntries.reduce((s, en) => s + (en.amount_paid_cents || 0), 0);
        const categoryHtml = categories.length ? categories.map(cat => {
            const items = raffleItems(config, cat.id);
            const pendingSlots = drawQueue.filter(slot => slot.category_id === cat.id).length;
            const drawnCount = Math.max(0, (cat.winner_count || 0) - pendingSlots);
            const itemPreview = items.length ? items.slice(0, 3).map(item => `${item.emoji || '🎁'} ${esc(item.name)}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`).join(', ') : 'Prize details pending';
            const extraItems = Math.max(0, items.length - 3);
            return `
                <div class="em-card em-op-card">
                    <div class="em-op-head">
                        <div class="min-w-0"><p class="em-op-kicker">Prize group</p><p class="em-op-title">${esc(cat.label || 'Prize category')}</p></div>
                        <span class="em-op-icon">🎁</span>
                    </div>
                    <p class="em-op-copy">${drawModeLabel(cat.draw_mode)} · ${drawnCount}/${cat.winner_count || 0} drawn</p>
                    <div class="em-op-progress"><span style="width:${cat.winner_count ? Math.round((drawnCount / cat.winner_count) * 100) : 0}%"></span></div>
                    <p class="em-op-copy">${itemPreview}${extraItems ? `, +${extraItems} more` : ''}</p>
                    <div class="em-op-meta"><span class="em-op-chip">${pendingSlots} left</span><span class="em-op-chip">${items.length} item${items.length === 1 ? '' : 's'}</span></div>
                </div>
            `;
        }).join('') : '';

        const nextSlot = drawQueue[0] || null;
        const nextDrawHtml = !allDrawn ? `
            <div class="em-card mb-4" style="border-color:#ddd6fe;background:#faf5ff">
                <div class="em-section-head">
                    <div>
                        <h3 class="em-section-title">Next draw</h3>
                        <p class="em-section-sub" style="color:#6d28d9">${nextSlot ? esc(prizeSlotLabel(nextSlot)) : 'Next available prize'}${nextSlot?.category_label ? ` · ${esc(nextSlot.category_label)}` : ''}</p>
                    </div>
                    <span class="em-pill em-pill-paid">${remainingDraws} remaining</span>
                </div>
                ${canDraw ? `<button id="emRaffleDrawBtn" type="button" class="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition">Draw next winner</button>` : `<p class="text-xs text-gray-500">${eligibleEntries.length ? 'Draw controls are unavailable on this page.' : 'No valid raffle entries yet.'}</p>`}
            </div>
        ` : '';

        const entryRows = eligibleEntries.length ? eligibleEntries.map(en => {
            const p = en.profiles || {};
            const guest = en.guest_token ? guestByToken.get(en.guest_token) : null;
            const name = en.user_id ? (`${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member') : (guest?.guest_name || 'Guest');
            const sub = en.user_id ? 'Member raffle entry' : (guest?.guest_email || 'Guest raffle entry');
            const tokenAttr = en.guest_token ? ` data-guest-token="${esc(en.guest_token)}"` : '';
            const userAttr = en.user_id ? ` data-user-id="${esc(en.user_id)}"` : '';
            return `<div class="em-attendee-card"><div class="em-avatar" style="background:#f5f3ff;color:#6d28d9"><span>🎟</span></div><div class="em-attendee-main"><p class="em-attendee-name">${esc(name)}</p><p class="em-attendee-sub">${esc(sub)}</p><div class="flex flex-wrap gap-1 mt-2"><span class="em-pill em-pill-checked">${en.user_id ? 'Member' : 'Guest'}</span>${en.paid ? '<span class="em-pill em-pill-paid">Paid</span>' : ''}</div></div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-raffle-entry="${esc(en.id)}"${userAttr}${tokenAttr} data-paid="${en.paid ? '1' : '0'}" data-name="${esc(name)}">Remove</button></div>`;
        }).join('') : `<p class="text-xs text-gray-400 italic py-2">No eligible entries yet.</p>`;

        return `
            <div class="em-card em-command-card mb-4">
                <p class="em-command-eyebrow">Raffle command</p>
                <h3 class="em-command-title">${allDrawn ? 'All winners drawn' : `${remainingDraws} draw${remainingDraws === 1 ? '' : 's'} remaining`}</h3>
                <p class="em-command-copy">${eligibleEntries.length ? `${eligibleEntries.length} eligible entr${eligibleEntries.length === 1 ? 'y' : 'ies'} across ${memberEntries.length} member and ${guestEntries.length} guest entries.` : 'No eligible raffle entries yet.'} ${nextSlot ? `Next up: ${esc(prizeSlotLabel(nextSlot))}.` : ''}</p>
                <div class="em-op-progress" style="margin-top:14px;background:rgba(255,255,255,.22)"><span style="width:${drawPct}%;background:#a78bfa"></span></div>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Eligible entries</span><strong>${eligibleEntries.length}</strong><small>${memberEntries.length} member · ${guestEntries.length} guest</small></div>
                <div class="em-metric"><span>Revenue</span><strong>${fmt(entryRevenue)}</strong><small>${e.raffle_entry_cost_cents ? 'Paid entries' : 'Free raffle'}</small></div>
                <div class="em-metric"><span>Prizes</span><strong>${totalPrizes || '—'}</strong><small>${categories.length} group${categories.length === 1 ? '' : 's'}</small></div>
                <div class="em-metric"><span>Drawn</span><strong>${winnersDrawn}</strong><small>${drawPct}% complete</small></div>
            </div>

            ${nextDrawHtml}

            <div class="em-money-layout">
                <div>
                    ${categories.length ? `<div class="em-op-grid" style="grid-template-columns:1fr;margin-bottom:12px">${categoryHtml}</div>` : ''}
                    <div class="em-card">
                        <div class="em-section-head"><div><h3 class="em-section-title">Winners <span class="text-gray-400 font-normal">· ${winnersDrawn}${totalPrizes ? '/' + totalPrizes : ''}</span></h3><p class="em-section-sub">Draw results and pending prize choices.</p></div></div>
                        ${winnerRows}
                        ${allDrawn ? `<p class="text-xs text-emerald-600 font-semibold mt-3">All winners drawn ✓</p>` : `<p class="text-xs text-gray-400 mt-3">Draws follow category sort order, starting with the smallest/lower-sort categories.</p>`}
                    </div>
                </div>

                <div class="em-card">
                    <div class="em-section-head"><div><h3 class="em-section-title">Configuration</h3><p class="em-section-sub">Rules currently driving the draw.</p></div></div>
                    <div class="em-money-row"><span>Type</span><strong>${esc(e.raffle_type || 'digital')}</strong></div>
                    <div class="em-money-row"><span>Draw trigger</span><strong>${esc(e.raffle_draw_trigger || 'manual')}</strong></div>
                    <div class="em-money-row"><span>Entry cost</span><strong>${e.raffle_entry_cost_cents ? fmt(e.raffle_entry_cost_cents) : 'Free'}</strong></div>
                    <div style="margin:12px 0;padding:12px;border:1px solid #eef2ff;border-radius:12px;background:#f8fafc">
                        <label for="emRaffleEntryPrice" style="display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Raffle entry price</label>
                        <div style="display:flex;gap:8px;align-items:center">
                            <span style="font-size:13px;font-weight:800;color:#475569">$</span>
                            <input id="emRaffleEntryPrice" class="em-input" type="number" min="0" max="500" step="0.01" value="${esc(raffleEntryPriceDollars)}" ${paidEventRaffleIncluded ? 'disabled' : ''} style="flex:1;min-width:0">
                            <button id="emRafflePriceSave" type="button" class="em-btn-primary" ${paidEventRaffleIncluded ? 'disabled' : ''}>Save</button>
                        </div>
                        <p id="emRafflePriceStatus" class="text-xs text-gray-400 mt-2">${paidEventRaffleIncluded ? 'Paid RSVP events include raffle entry with the RSVP, so separate raffle pricing is not used.' : 'Set 0 for a free raffle. Changes apply to future raffle checkouts only.'}</p>
                    </div>
                    <div class="em-money-row"><span>Member entries</span><strong>${memberEntries.length}</strong></div>
                    <div class="em-money-row"><span>Guest entries</span><strong>${guestEntries.length}</strong></div>
                </div>

                ${prizeSetupHtml}

                <div class="em-card mt-3">
                    <div class="em-section-head"><div><h3 class="em-section-title">Entries <span class="text-gray-400 font-normal">· ${eligibleEntries.length}</span></h3><p class="em-section-sub">Remove accidental or test raffle entries without deleting the event.</p></div></div>
                    ${entryRows}
                </div>
            </div>
        `;
    }

    function wireRaffle() {
        const STATE = api().getState?.() || {};
        const drawBtn = document.getElementById('emRaffleDrawBtn');
        if (drawBtn) {
            drawBtn.onclick = () => window.evtOpenRaffleDraw?.(STATE.eventId, STATE.event);
        }
        document.getElementById('emSheetContent')?.querySelectorAll('[data-raffle-assign-choice]').forEach(btn => {
            btn.onclick = () => assignWinnerChoice(btn.dataset.winnerId);
        });
        document.getElementById('emSheetContent')?.querySelectorAll('[data-remove-raffle-entry]').forEach(btn => {
            btn.onclick = () => removeRaffleEntry(btn);
        });
        document.getElementById('emRafflePriceSave')?.addEventListener('click', saveRaffleEntryPrice);
        document.getElementById('emRafflePrizeSave')?.addEventListener('click', () => saveRafflePrizeSetup());
        document.querySelector('[data-em-raffle-add-category]')?.addEventListener('click', () => saveRafflePrizeSetup({ addCategory: true }));
        document.querySelector('[data-em-raffle-add-item]')?.addEventListener('click', () => saveRafflePrizeSetup({ addItem: true }));
        document.querySelectorAll('[data-em-raffle-remove-category]').forEach(btn => {
            btn.addEventListener('click', () => {
                const label = btn.dataset.categoryLabel || 'this category';
                if (confirm(`Remove ${label}? Prize items in this category will move to the first remaining category.`)) {
                    saveRafflePrizeSetup({ removeCategoryId: btn.dataset.emRaffleRemoveCategory });
                }
            });
        });
        document.querySelectorAll('[data-em-raffle-remove-item]').forEach(btn => {
            btn.addEventListener('click', () => {
                const label = btn.dataset.itemLabel || 'this prize';
                if (confirm(`Remove ${label} from the raffle prize setup? Existing drawn winner records are not deleted.`)) {
                    saveRafflePrizeSetup({ removeItemId: btn.dataset.emRaffleRemoveItem });
                }
            });
        });
        wireRafflePrizeImages();
    }

    function rafflePrizeSetupHtml(config, winners = []) {
        const STATE = api().getState?.() || {};
        const model = window.EventsRaffleModel;
        if (!model) {
            return `<div class="em-card mt-3"><div class="em-section-head"><div><h3 class="em-section-title">Prize setup</h3><p class="em-section-sub">Raffle editor unavailable because the raffle model helper did not load.</p></div></div></div>`;
        }
        const normalized = model.normalizeConfig(config || []);
        const categories = model.getOrderedCategories(normalized);
        const items = normalized.items || [];
        const validation = model.validateConfig(normalized);
        const categoryOptions = categories.map(category => `<option value="${esc(category.id)}">${esc(category.label)}</option>`).join('');
        const usedPrizeIds = new Set((winners || []).map(winner => winner.prize_id).filter(Boolean));
        const drawModeOptions = (selected) => [
            ['specific_item', 'Specific items'],
            ['random_item', 'Random item in category'],
            ['winner_choice', 'Winner chooses later'],
        ].map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');

        const categoryRows = categories.length ? categories.map((category, index) => `
            <div class="em-raffle-edit-row" data-em-raffle-category-row="${esc(category.id)}" data-sort-order="${(index + 1) * 10}">
                <div>
                    <label class="em-raffle-edit-label">Category</label>
                    <input class="em-input" data-em-raffle-category-field="label" value="${esc(category.label)}" maxlength="80">
                </div>
                <div>
                    <label class="em-raffle-edit-label">Draw mode</label>
                    <select class="em-input" data-em-raffle-category-field="draw_mode">${drawModeOptions(category.draw_mode)}</select>
                </div>
                <div>
                    <label class="em-raffle-edit-label">Winners</label>
                    <input class="em-input" type="number" min="0" step="1" data-em-raffle-category-field="winner_count" value="${category.winner_count ?? ''}">
                </div>
                <button type="button" class="em-btn-ghost" data-em-raffle-remove-category="${esc(category.id)}" data-category-label="${esc(category.label)}" ${categories.length <= 1 ? 'disabled' : ''}>Remove</button>
            </div>
        `).join('') : `<p class="text-xs text-gray-400 italic py-2">No prize categories yet.</p>`;

        const itemRows = items.length ? items.map((item, index) => {
            const previewUrl = prizeImagePreviews[item.id] || item.image_url || '';
            const pendingName = prizeImageFiles[item.id]?.name || '';
            return `
            <div class="em-raffle-item-wrap" data-em-raffle-item-row="${esc(item.id)}" data-sort-order="${(index + 1) * 10}" data-image-url="${esc(item.image_url || '')}">
                <div class="em-raffle-edit-row em-raffle-item-row">
                    <div>
                        <label class="em-raffle-edit-label">Emoji</label>
                        <input class="em-input" data-em-raffle-item-field="emoji" value="${esc(item.emoji || '🎁')}" maxlength="4">
                    </div>
                    <div>
                        <label class="em-raffle-edit-label">Prize</label>
                        <input class="em-input" data-em-raffle-item-field="name" value="${esc(item.name)}" maxlength="120">
                    </div>
                    <div>
                        <label class="em-raffle-edit-label">Category</label>
                        <select class="em-input" data-em-raffle-item-field="category_id">
                            ${categories.map(category => `<option value="${esc(category.id)}" ${item.category_id === category.id ? 'selected' : ''}>${esc(category.label)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="em-raffle-edit-label">Qty</label>
                        <input class="em-input" type="number" min="1" step="1" data-em-raffle-item-field="quantity" value="${item.quantity || 1}">
                    </div>
                    <button type="button" class="em-btn-ghost" data-em-raffle-remove-item="${esc(item.id)}" data-item-label="${esc(item.name)}" ${usedPrizeIds.has(item.id) ? 'disabled title="Already assigned to a winner"' : ''}>Remove</button>
                </div>
                <div class="em-prize-img-row">
                    <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" data-em-prize-file="${esc(item.id)}">
                    <div class="em-prize-img-drop" data-em-prize-drop="${esc(item.id)}" title="Click or drag an image here">
                        ${previewUrl ? `<img src="${esc(previewUrl)}" alt="Prize image">` : '<span>📷</span>'}
                    </div>
                    <div class="em-prize-img-copy" data-em-prize-copy="${esc(item.id)}">
                        <strong>${pendingName ? esc(pendingName) : (previewUrl ? 'Image set' : 'Prize image')}</strong>
                        <span>${previewUrl ? 'Click or drop to replace. Save prize setup to keep changes.' : 'Click or drag a PNG, JPG, or WebP image here.'}</span>
                    </div>
                    ${previewUrl ? `<button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-em-prize-clear="${esc(item.id)}">Remove image</button>` : ''}
                </div>
            </div>
        `;
        }).join('') : `<p class="text-xs text-gray-400 italic py-2">No prize items yet. Add a prize before drawing winners.</p>`;

        return `
            <div class="em-card mt-3">
                <style>
                    .em-raffle-edit-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) 88px auto; gap:8px; align-items:end; padding:10px 0; border-top:1px solid #f1f5f9; }
                    .em-raffle-edit-row:first-of-type { border-top:0; padding-top:0; }
                    .em-raffle-item-wrap { padding:10px 0; border-top:1px solid #f1f5f9; }
                    .em-raffle-item-wrap:first-of-type { border-top:0; padding-top:0; }
                    .em-raffle-item-wrap .em-raffle-edit-row { border-top:0; padding:0; }
                    .em-raffle-item-row { grid-template-columns:62px minmax(0,1.2fr) minmax(0,.9fr) 70px auto; }
                    .em-raffle-edit-label { display:block; font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8; margin-bottom:5px; }
                    .em-prize-img-row { margin-top:10px; display:flex; align-items:center; gap:9px; }
                    .em-prize-img-drop { width:72px; height:72px; border:2px dashed #d1d5db; border-radius:12px; display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer; color:#9ca3af; background:#fff; flex-shrink:0; }
                    .em-prize-img-drop:hover, .em-prize-img-drop.em-drag-over { border-color:#818cf8; background:#f5f3ff; color:#4f46e5; }
                    .em-prize-img-drop img { width:100%; height:100%; object-fit:cover; display:block; }
                    .em-prize-img-drop span { font-size:19px; }
                    .em-prize-img-copy { flex:1; min-width:0; font-size:11px; color:#6b7280; line-height:1.35; }
                    .em-prize-img-copy strong { display:block; color:#374151; font-size:12px; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                    @media(max-width:700px){ .em-raffle-edit-row, .em-raffle-item-row { grid-template-columns:1fr; } }
                    @media(max-width:520px){ .em-prize-img-row { align-items:flex-start; flex-wrap:wrap; } .em-prize-img-copy { flex-basis:calc(100% - 82px); } }
                </style>
                <div class="em-section-head">
                    <div><h3 class="em-section-title">Prize setup</h3><p class="em-section-sub">Add, edit, or remove raffle prizes after event creation. Existing drawn winners stay in the winner history.</p></div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0">
                    <p class="em-raffle-edit-label" style="margin:0">Categories</p>
                    <button type="button" class="em-btn-ghost" data-em-raffle-add-category>Add category</button>
                </div>
                ${categoryRows}
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 8px;border-top:1px solid #f1f5f9;padding-top:12px">
                    <p class="em-raffle-edit-label" style="margin:0">Prize items</p>
                    <button type="button" class="em-btn-ghost" data-em-raffle-add-item>Add prize</button>
                </div>
                ${itemRows}
                ${validation.valid ? '' : `<div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">${validation.errors.map(esc).join('<br>')}</div>`}
                <div style="display:flex;align-items:center;gap:10px;margin-top:14px">
                    <button type="button" id="emRafflePrizeSave" class="em-btn-primary">Save prize setup</button>
                    <span id="emRafflePrizeStatus" class="text-xs text-gray-400">${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} · ${items.length} item${items.length === 1 ? '' : 's'}</span>
                </div>
            </div>
        `;
    }

    function collectRafflePrizeConfigFromDom() {
        const STATE = api().getState?.() || {};
        const model = window.EventsRaffleModel;
        if (!model) throw new Error('Raffle model helper is not loaded.');
        const categoryRows = Array.from(document.querySelectorAll('[data-em-raffle-category-row]'));
        const itemRows = Array.from(document.querySelectorAll('[data-em-raffle-item-row]'));
        if (!categoryRows.length && !itemRows.length) return model.normalizeConfig(STATE.event?.raffle_prizes || []);
        const categories = categoryRows.map((row, index) => {
            const field = name => row.querySelector(`[data-em-raffle-category-field="${name}"]`)?.value;
            return model.createCategory({
                id: row.dataset.emRaffleCategoryRow,
                label: field('label') || 'Prize Tier',
                draw_mode: field('draw_mode') || 'specific_item',
                winner_count: Math.max(0, Math.floor(Number(field('winner_count')) || 0)),
                sort_order: (index + 1) * 10,
            });
        });
        const fallbackCategory = categories[0]?.id || 'general';
        const categoryIds = new Set(categories.map(category => category.id));
        const items = itemRows.map((row, index) => {
            const field = name => row.querySelector(`[data-em-raffle-item-field="${name}"]`)?.value;
            const categoryId = categoryIds.has(field('category_id')) ? field('category_id') : fallbackCategory;
            return model.createItem({
                id: row.dataset.emRaffleItemRow,
                emoji: field('emoji') || model.DEFAULT_EMOJI || '🎁',
                name: field('name') || 'Prize item',
                category_id: categoryId,
                quantity: Math.max(1, Math.floor(Number(field('quantity')) || 1)),
                image_url: row.dataset.imageUrl || null,
                sort_order: (index + 1) * 10,
            });
        });
        return model.normalizeConfig({ version: 2, categories, items });
    }

    function wireRafflePrizeImages() {
        const STATE = api().getState?.() || {};
        document.querySelectorAll('[data-em-prize-drop]').forEach(zone => {
            const itemId = zone.dataset.emPrizeDrop;
            const fileInput = document.querySelector(`[data-em-prize-file="${CSS.escape(itemId)}"]`);
            if (!itemId || !fileInput) return;
            zone.addEventListener('click', () => fileInput.click());
            zone.addEventListener('dragover', event => {
                event.preventDefault();
                zone.classList.add('em-drag-over');
            });
            zone.addEventListener('dragleave', event => {
                if (!zone.contains(event.relatedTarget)) zone.classList.remove('em-drag-over');
            });
            zone.addEventListener('drop', event => {
                event.preventDefault();
                zone.classList.remove('em-drag-over');
                const file = event.dataTransfer?.files?.[0];
                if (file) setRafflePrizeImage(itemId, file);
            });
            fileInput.addEventListener('change', () => {
                const file = fileInput.files?.[0];
                if (file) setRafflePrizeImage(itemId, file);
            });
        });
        document.querySelectorAll('[data-em-prize-clear]').forEach(btn => {
            btn.addEventListener('click', () => clearRafflePrizeImage(btn.dataset.emPrizeClear));
        });
    }

    function setRafflePrizeImage(itemId, file) {
        const STATE = api().getState?.() || {};
        if (!file.type.match(/^image\/(png|jpeg|webp)$/)) { alert('Please use a PNG, JPG, or WebP image.'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB.'); return; }
        prizeImageFiles[itemId] = file;
        const reader = new FileReader();
        reader.onload = () => {
            prizeImagePreviews[itemId] = reader.result;
            const zone = document.querySelector(`[data-em-prize-drop="${CSS.escape(itemId)}"]`);
            if (zone) zone.innerHTML = `<img src="${esc(reader.result)}" alt="Prize image">`;
            const copy = document.querySelector(`[data-em-prize-copy="${CSS.escape(itemId)}"]`);
            if (copy) copy.innerHTML = `<strong>${esc(file.name)}</strong><span>Ready to upload. Save prize setup to keep this image.</span>`;
            const status = document.getElementById('emRafflePrizeStatus');
            if (status) status.textContent = 'Image selected. Save prize setup to upload it.';
        };
        reader.readAsDataURL(file);
    }

    function clearRafflePrizeImage(itemId) {
        const STATE = api().getState?.() || {};
        if (!itemId) return;
        delete prizeImageFiles[itemId];
        delete prizeImagePreviews[itemId];
        const row = document.querySelector(`[data-em-raffle-item-row="${CSS.escape(itemId)}"]`);
        if (row) row.dataset.imageUrl = '';
        const zone = document.querySelector(`[data-em-prize-drop="${CSS.escape(itemId)}"]`);
        if (zone) zone.innerHTML = '<span>📷</span>';
        const copy = document.querySelector(`[data-em-prize-copy="${CSS.escape(itemId)}"]`);
        if (copy) copy.innerHTML = '<strong>Prize image</strong><span>Image removed. Save prize setup to keep this change.</span>';
        const btn = document.querySelector(`[data-em-prize-clear="${CSS.escape(itemId)}"]`);
        if (btn) btn.remove();
        const status = document.getElementById('emRafflePrizeStatus');
        if (status) status.textContent = 'Image removed. Save prize setup to keep this change.';
    }

    async function uploadPendingRafflePrizeImages(config) {
        const STATE = api().getState?.() || {};
        const uploads = Object.entries(prizeImageFiles);
        if (!uploads.length) return config;
        const slug = safeFilename(STATE.event?.slug || STATE.event?.title || STATE.eventId || 'event');
        for (const [itemId, file] of uploads) {
            const item = (config.items || []).find(entry => entry.id === itemId);
            if (!item) continue;
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `${slug}/${itemId}-${Date.now()}.${ext}`;
            const up = await supabaseClient.storage
                .from('event-raffle-prizes')
                .upload(path, file, { contentType: file.type || 'image/jpeg' });
            if (up.error) throw new Error(`Prize image upload failed: ${up.error.message}`);
            item.image_url = supabaseClient.storage.from('event-raffle-prizes').getPublicUrl(path).data.publicUrl;
        }
        clearPrizeImageState();
        return config;
    }

    async function saveRafflePrizeSetup(action = {}) {
        const STATE = api().getState?.() || {};
        const model = window.EventsRaffleModel;
        const status = document.getElementById('emRafflePrizeStatus');
        const saveBtn = document.getElementById('emRafflePrizeSave');
        try {
            if (!model) throw new Error('Raffle model helper is not loaded.');
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
            if (status) status.textContent = Object.keys(prizeImageFiles).length ? 'Uploading prize images...' : 'Saving prize setup...';
            let config = collectRafflePrizeConfigFromDom();
            if (action.addCategory) {
                config.categories.push(model.createCategory({ label: 'New Tier', sort_order: (config.categories.length + 1) * 10, winner_count: 1 }));
            }
            if (action.addItem) {
                if (!config.categories.length) config.categories.push(model.createCategory({ id: 'general', label: 'Raffle Prizes', sort_order: 10, winner_count: 1 }));
                const category = config.categories[0];
                config.items.push(model.createItem({ category_id: category.id, name: 'New prize item', sort_order: (config.items.length + 1) * 10 }));
                category.winner_count = Math.max(Number(category.winner_count || 0), categoryPrizeQuantity(config, category.id));
            }
            if (action.removeCategoryId) {
                if (config.categories.length <= 1) throw new Error('Keep at least one prize category.');
                config.categories = config.categories.filter(category => category.id !== action.removeCategoryId);
                const fallbackCategoryId = config.categories[0]?.id || 'general';
                config.items.forEach(item => { if (item.category_id === action.removeCategoryId) item.category_id = fallbackCategoryId; });
            }
            if (action.removeItemId) {
                const alreadyDrawn = (STATE.tabData.raffle?.winners || []).some(winner => winner.prize_id === action.removeItemId);
                if (alreadyDrawn) throw new Error('This prize is already assigned to a winner and cannot be removed from setup.');
                config.items = config.items.filter(item => item.id !== action.removeItemId);
                delete prizeImageFiles[action.removeItemId];
                delete prizeImagePreviews[action.removeItemId];
                capRaffleWinnerCounts(config);
            }
            config = model.normalizeConfig(config);
            config = await uploadPendingRafflePrizeImages(config);
            const winnerCount = model.getTotalWinnerCount(config);
            if (status) status.textContent = 'Saving prize setup...';
            const { error } = await supabaseClient
                .from('events')
                .update({ raffle_prizes: config, raffle_winner_count: winnerCount })
                .eq('id', STATE.eventId);
            if (error) throw error;
            STATE.event.raffle_prizes = config;
            STATE.event.raffle_winner_count = winnerCount;
            await api().refreshEventManager?.('raffle');
        } catch (err) {
            if (status) status.textContent = 'Save failed: ' + (err.message || 'unknown error');
            else alert('Prize setup save failed: ' + (err.message || 'unknown error'));
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save prize setup'; }
        }
    }

    function categoryPrizeQuantity(config, categoryId) {
        const STATE = api().getState?.() || {};
        return (config.items || [])
            .filter(item => item.category_id === categoryId)
            .reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);
    }

    function capRaffleWinnerCounts(config) {
        const STATE = api().getState?.() || {};
        (config.categories || []).forEach(category => {
            const quantity = categoryPrizeQuantity(config, category.id);
            category.winner_count = Math.min(Number(category.winner_count || 0), quantity);
        });
    }

    async function saveRaffleEntryPrice() {
        const STATE = api().getState?.() || {};
        const input = document.getElementById('emRaffleEntryPrice');
        const btn = document.getElementById('emRafflePriceSave');
        const status = document.getElementById('emRafflePriceStatus');
        const dollars = Number(input?.value || 0);
        if (!Number.isFinite(dollars) || dollars < 0) {
            if (status) status.textContent = 'Enter a price of 0 or higher.';
            input?.focus();
            return;
        }
        if (dollars > 500) {
            if (status) status.textContent = 'Raffle entry price cannot be more than $500.';
            input?.focus();
            return;
        }
        const cents = Math.round(dollars * 100);
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Saving...';
        }
        if (status) status.textContent = 'Saving raffle price...';
        try {
            const { error } = await supabaseClient
                .from('events')
                .update({ raffle_entry_cost_cents: cents })
                .eq('id', STATE.eventId);
            if (error) throw error;
            STATE.event.raffle_entry_cost_cents = cents;
            await api().refreshEventManager?.('raffle');
        } catch (err) {
            if (status) status.textContent = 'Save failed: ' + (err.message || 'unknown error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Save';
            }
        }
    }

    async function removeRaffleEntry(btn) {
        const STATE = api().getState?.() || {};
        const name = btn.dataset.name || 'this entry';
        const isPaid = btn.dataset.paid === '1';
        const warning = isPaid ? '\n\nThis was marked paid. Removing the record does not refund Stripe payments.' : '';
        if (!confirm(`Remove raffle entry for ${name}? Any winner record for this entry will also be removed.${warning}`)) return;
        btn.disabled = true;
        btn.textContent = 'Removing...';
        try {
            await callEdgeFunction('manage-event-participation', {
                action: 'remove_raffle_entry',
                event_id: STATE.eventId,
                entry_id: btn.dataset.removeRaffleEntry,
            });
            STATE.tabData.raffle = null;
            await api().renderTabAsync?.('raffle', loadRaffle, raffleHtml, wireRaffle);
            api().notifyParent?.('updated', STATE.eventId);
        } catch (err) {
            alert('Raffle entry remove failed: ' + (err.message || 'unknown error'));
            STATE.tabData.raffle = null;
            await api().renderTabAsync?.('raffle', loadRaffle, raffleHtml, wireRaffle);
        }
    }

    function winnerChoiceHtml(winner, config, winners) {
        const STATE = api().getState?.() || {};
        if (winner.selection_status !== 'pending_choice') return '';
        const items = availableChoiceItems(config, winners, winner);
        if (!items.length) {
            return `<div class="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">No unassigned items are available in this category.</div>`;
        }
        const options = items.map(item => `<option value="${esc(item.id)}">${esc(item.emoji || '🎁')} ${esc(item.name)}${item.quantity > 1 ? ` (${item.quantity} total)` : ''}</option>`).join('');
        return `
            <div class="mt-3 flex flex-col sm:flex-row gap-2">
                <select id="emWinnerChoice_${esc(winner.id)}" class="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200">
                    ${options}
                </select>
                <button type="button" data-raffle-assign-choice="1" data-winner-id="${esc(winner.id)}" class="rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 text-xs font-bold transition">Assign prize</button>
            </div>
        `;
    }

    function availableChoiceItems(config, winners, currentWinner) {
        const STATE = api().getState?.() || {};
        const items = raffleItems(config, currentWinner.category_id);
        const used = new Map();
        (winners || []).forEach(winner => {
            if (!winner.prize_id || winner.id === currentWinner.id) return;
            if (winner.selection_status === 'pending_choice') return;
            used.set(winner.prize_id, (used.get(winner.prize_id) || 0) + 1);
        });
        return items.filter(item => (used.get(item.id) || 0) < item.quantity);
    }

    async function assignWinnerChoice(winnerId) {
        const STATE = api().getState?.() || {};
        const winner = (STATE.tabData.raffle?.winners || []).find(row => row.id === winnerId);
        if (!winner) return;
        const select = document.getElementById(`emWinnerChoice_${winnerId}`);
        const itemId = select?.value;
        if (!itemId) return alert('Choose a prize item first.');

        const config = raffleConfig(STATE.event);
        const item = raffleItems(config, winner.category_id).find(row => row.id === itemId);
        if (!item) return alert('Prize item is no longer available. Refresh and try again.');

        const { error } = await supabaseClient
            .from('event_raffle_winners')
            .update({
                prize_id: item.id,
                prize_description: item.name,
                prize_image_url: item.image_url || null,
                prize_emoji: item.emoji || window.EventsRaffleModel?.DEFAULT_EMOJI || '🎁',
                selection_status: 'assigned',
            })
            .eq('id', winnerId)
            .eq('event_id', STATE.eventId)
            .eq('selection_status', 'pending_choice');
        if (error) return alert('Prize assignment failed: ' + error.message);

        STATE.tabData.raffle = null;
        await api().renderTabAsync?.('raffle', loadRaffle, raffleHtml, wireRaffle);
        document.dispatchEvent(new CustomEvent('events:raffle:drawn', { detail: { eventId: STATE.eventId } }));
    }

    function raffleConfig(event) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel) return event?.raffle_prizes || [];
        return window.EventsRaffleModel.normalizeConfig(event?.raffle_prizes || []);
    }

    function raffleCategories(config) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel) return [];
        return window.EventsRaffleModel.getOrderedCategories(config);
    }

    function raffleItems(config, categoryId) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel) return [];
        return window.EventsRaffleModel.getItemsForCategory(config, categoryId);
    }

    function raffleTotalWinners(config) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel) return 0;
        return window.EventsRaffleModel.getTotalWinnerCount(config);
    }

    function raffleDrawQueue(config, winners) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel) return [];
        return window.EventsRaffleModel.getDrawQueue(config, winners || []);
    }

    function drawModeLabel(drawMode) {
        const STATE = api().getState?.() || {};
        if (drawMode === 'random_item') return 'Random prize assigned';
        if (drawMode === 'winner_choice') return 'Winner chooses later';
        return 'Specific prize';
    }

    function prizeSlotLabel(slot) {
        const STATE = api().getState?.() || {};
        if (!slot) return '';
        if (slot.prize_name) return slot.prize_name;
        if (slot.draw_mode === 'winner_choice') return `${slot.category_label || 'Prize tier'} choice`;
        return slot.category_label || 'Prize';
    }

    function winnerBelongsToCategory(winner, category, config) {
        const STATE = api().getState?.() || {};
        if (!winner || !category) return false;
        if (winner.category_id) return winner.category_id === category.id;
        if (winner.category_label) return winner.category_label === category.label;
        const slot = raffleSlotByPlace(config, winner.place);
        return slot?.category_id === category.id;
    }

    function raffleSlotByPlace(config, place) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel || place == null) return null;
        return window.EventsRaffleModel.getDrawQueue(config, []).find(slot => Number(slot.place) === Number(place)) || null;
    }
    function clearPrizeImageState() {
        Object.keys(prizeImageFiles).forEach(key => delete prizeImageFiles[key]);
        Object.keys(prizeImagePreviews).forEach(key => delete prizeImagePreviews[key]);
    }

    function refreshRaffle(eventId) {
        const STATE = api().getState?.() || {};
        if (eventId && eventId !== STATE.eventId) return;
        STATE.tabData.raffle = null;
        if (STATE.activeTab === 'raffle') api().renderTab?.('raffle');
    }

    document.addEventListener('events:raffle:drawn', (evt) => refreshRaffle(evt.detail?.eventId));


    window.EventsManageRaffle = {
        loadRaffle,
        raffleHtml,
        wireRaffle,
        clearPrizeImageState,
        refreshRaffle
    };
})();

;/* ===== js/portal/events/manage/danger.js ===== */
// Portal Events — Manage danger zone (Phase 5M.3C)
(function () {
    'use strict';

    function api() {
        return window.EventsManageDangerApi || {};
    }

    function esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }
    function money(cents) {
        return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
    }

    // ─── Danger Zone tab ────────────────────────────────────────────
    function dangerHtml() {
        const STATE = api().getState?.() || {};
        const e = STATE.event;
        const isCancelled = e.status === 'cancelled';
        const isCompleted = e.status === 'completed';
        const totalRsvps = STATE.rsvps.length + STATE.guestRsvps.length;
        const paidTickets = STATE.rsvps.filter(r => r.paid).length + STATE.guestRsvps.filter(r => r.paid).length;
        const checkins = STATE.checkins.length;
        const statusLabel = (e.status || 'draft').toUpperCase();

        return `
            <div class="em-card em-command-card mb-4" style="background:linear-gradient(135deg,#7f1d1d,#111827)">
                <p class="em-command-eyebrow">Danger zone</p>
                <h3 class="em-command-title">High-impact event controls</h3>
                <p class="em-command-copy">These actions change availability, visibility, or stored event records. Review attendance and money before making a destructive change.</p>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Status</span><strong style="font-size:18px">${esc(statusLabel)}</strong><small>Current lifecycle</small></div>
                <div class="em-metric"><span>RSVP records</span><strong>${totalRsvps}</strong><small>Member + guest</small></div>
                <div class="em-metric"><span>Paid tickets</span><strong>${paidTickets}</strong><small>Refund review</small></div>
                <div class="em-metric"><span>Check-ins</span><strong>${checkins}</strong><small>Attendance history</small></div>
            </div>

            ${!isCancelled && !isCompleted ? `
            <div class="em-danger-card">
                <p class="em-danger-title">Cancel event</p>
                <p class="em-danger-sub">Marks the event as cancelled. Paid RSVPs are NOT auto-refunded — handle refunds in M3b's Money tab or Stripe dashboard.</p>
                <button class="em-btn-danger" data-action="cancel">Cancel event</button>
            </div>` : ''}

            ${!isCompleted ? `
            <div class="em-danger-card" style="background:#fffbeb;border-color:#fde68a">
                <p class="em-danger-title" style="color:#92400e">Mark completed</p>
                <p class="em-danger-sub" style="color:#78350f">Closes RSVPs and locks the event. Use this after the event has ended.</p>
                <button class="em-btn-ghost" data-action="complete" style="background:#fde68a;color:#78350f">Mark completed</button>
            </div>` : ''}

            ${isCancelled ? `<div class="em-card mb-3"><div class="em-section-head"><div><h3 class="em-section-title">Event already cancelled</h3><p class="em-section-sub">Cancellation controls are hidden because this event is no longer open.</p></div></div></div>` : ''}
            ${isCompleted ? `<div class="em-card mb-3"><div class="em-section-head"><div><h3 class="em-section-title">Event completed</h3><p class="em-section-sub">Completion controls are hidden because this event has already been closed.</p></div></div></div>` : ''}

            <div class="em-danger-card" style="background:#fff7ed;border-color:#fed7aa">
                <p class="em-danger-title" style="color:#9a3412">Reset test participation</p>
                <p class="em-danger-sub" style="color:#7c2d12">Keeps the event, images, date, pricing, location, and public URL. Removes RSVPs, guest RSVPs, check-ins, raffle entries, and drawn raffle winners. This does not refund Stripe payments.</p>
                <button class="em-btn-danger" data-action="reset-participation" style="background:#ea580c">Reset participation</button>
            </div>

            <div class="em-danger-card">
                <p class="em-danger-title">Delete event permanently</p>
                <p class="em-danger-sub">Removes the event and ALL associated data: RSVPs, check-ins, raffle entries, documents, photos. You will be asked to type the event title to confirm.</p>
                <button class="em-btn-danger" data-action="delete">Delete event</button>
            </div>
        `;
    }
    function wireDanger() {
        const STATE = api().getState?.() || {};
        document.getElementById('emSheetContent').querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => runDangerAction(btn.dataset.action));
        });
    }

    async function runDangerAction(action) {
        const STATE = api().getState?.() || {};
        const e = STATE.event;
        if (!e) return;

        if (action === 'delete') {
            const typed = prompt(`Type the event title to permanently delete:\n\n"${e.title}"`);
            if (!typed || typed.trim() !== e.title.trim()) {
                if (typed !== null) alert('Title did not match. Deletion cancelled.');
                return;
            }
            try {
                const { error } = await supabaseClient.from('events').delete().eq('id', e.id);
                if (error) throw error;
                alert('Event deleted.');
                api().close?.();
                api().notifyParent?.('deleted', e.id);
            } catch (err) {
                alert('Delete failed: ' + (err.message || 'unknown error'));
            }
            return;
        }

        if (action === 'cancel') {
            if (!confirm(`Mark "${e.title}" as cancelled?`)) return;
            try {
                const { error } = await supabaseClient.from('events').update({ status: 'cancelled' }).eq('id', e.id);
                if (error) throw error;
                STATE.event.status = 'cancelled';
                api().renderHeader?.();
                api().renderTab?.('danger');
                api().notifyParent?.('updated', e.id);
            } catch (err) {
                alert('Cancel failed: ' + (err.message || 'unknown error'));
            }
            return;
        }

        if (action === 'reset-participation') {
            await api().resetParticipation?.();
            return;
        }

        if (action === 'complete') {
            if (!confirm(`Mark "${e.title}" as completed?`)) return;
            try {
                const { error } = await supabaseClient.from('events').update({ status: 'completed' }).eq('id', e.id);
                if (error) throw error;
                STATE.event.status = 'completed';
                api().renderHeader?.();
                api().renderTab?.('danger');
                api().notifyParent?.('updated', e.id);
            } catch (err) {
                alert('Complete failed: ' + (err.message || 'unknown error'));
            }
        }
    }

    window.EventsManageDanger = {
        dangerHtml,
        wireDanger,
        runDangerAction
    };
})();

;/* ===== js/portal/events/compat/global-reexports.js ===== */
/* Portal Events — Classic global re-exports (Phase 5L.4)
   Loaded last in the classic chain (before manage/sheet.js).
   Mirrors onclick handlers that expect window.evt* after all owners load. */
(function () {
    'use strict';

    function exp(name, fn) {
        if (typeof fn !== 'undefined') window[name] = fn;
    }

    exp('evtHandleRsvp', typeof evtHandleRsvp !== 'undefined' ? evtHandleRsvp : undefined);
    exp('evtHandleRaffleEntry', typeof evtHandleRaffleEntry !== 'undefined' ? evtHandleRaffleEntry : undefined);
    exp('evtOpenScanner', typeof evtOpenScanner !== 'undefined' ? evtOpenScanner : undefined);
    exp('evtOpenRaffleDraw', typeof evtOpenRaffleDraw !== 'undefined' ? evtOpenRaffleDraw : undefined);
    exp('evtDrawWinner', typeof evtDrawWinner !== 'undefined' ? evtDrawWinner : undefined);
    exp('evtToggleModal', typeof evtToggleModal !== 'undefined' ? evtToggleModal : undefined);
    exp('evtUpdateStatus', typeof evtUpdateStatus !== 'undefined' ? evtUpdateStatus : undefined);
    exp('evtCopyShareUrl', typeof evtCopyShareUrl !== 'undefined' ? evtCopyShareUrl : undefined);
    exp('evtCloseScanner', typeof evtCloseScanner !== 'undefined' ? evtCloseScanner : undefined);
    exp('evtCloseRaffleDraw', typeof evtCloseRaffleDraw !== 'undefined' ? evtCloseRaffleDraw : undefined);
    exp('evtAddCostItem', typeof evtAddCostItem !== 'undefined' ? evtAddCostItem : undefined);
    exp('evtRemoveCostItem', typeof evtRemoveCostItem !== 'undefined' ? evtRemoveCostItem : undefined);
    exp('evtUpdateCostItem', typeof evtUpdateCostItem !== 'undefined' ? evtUpdateCostItem : undefined);
    exp('evtJoinWaitlist', typeof evtJoinWaitlist !== 'undefined' ? evtJoinWaitlist : undefined);
    exp('evtLeaveWaitlist', typeof evtLeaveWaitlist !== 'undefined' ? evtLeaveWaitlist : undefined);
    exp('evtDuplicateEvent', typeof evtDuplicateEvent !== 'undefined' ? evtDuplicateEvent : undefined);
    exp('evtCancelEvent', typeof evtCancelEvent !== 'undefined' ? evtCancelEvent : undefined);
    exp('evtRescheduleEvent', typeof evtRescheduleEvent !== 'undefined' ? evtRescheduleEvent : undefined);
    exp('evtDeleteEvent', typeof evtDeleteEvent !== 'undefined' ? evtDeleteEvent : undefined);
    exp('evtClaimWaitlistSpot', typeof evtClaimWaitlistSpot !== 'undefined' ? evtClaimWaitlistSpot : undefined);
    exp('evtShowUploadForm', typeof evtShowUploadForm !== 'undefined' ? evtShowUploadForm : undefined);
    exp('evtUploadDocument', typeof evtUploadDocument !== 'undefined' ? evtUploadDocument : undefined);
    exp('evtDownloadDocument', typeof evtDownloadDocument !== 'undefined' ? evtDownloadDocument : undefined);
    exp('evtMarkDistributed', typeof evtMarkDistributed !== 'undefined' ? evtMarkDistributed : undefined);
    exp('evtDeleteDocument', typeof evtDeleteDocument !== 'undefined' ? evtDeleteDocument : undefined);
    exp('evtOpenDocumentsPanel', typeof evtOpenDocumentsPanel !== 'undefined' ? evtOpenDocumentsPanel : undefined);
    exp('evtCloseDocumentsPanel', typeof evtCloseDocumentsPanel !== 'undefined' ? evtCloseDocumentsPanel : undefined);
    exp('evtInitMap', typeof evtInitMap !== 'undefined' ? evtInitMap : undefined);
    exp('evtToggleLocationSharing', typeof evtToggleLocationSharing !== 'undefined' ? evtToggleLocationSharing : undefined);
    exp('evtJoinCompetition', typeof evtJoinCompetition !== 'undefined' ? evtJoinCompetition : undefined);
    exp('evtSubmitEntry', typeof evtSubmitEntry !== 'undefined' ? evtSubmitEntry : undefined);
    exp('evtCastVote', typeof evtCastVote !== 'undefined' ? evtCastVote : undefined);
    exp('evtModerateEntry', typeof evtModerateEntry !== 'undefined' ? evtModerateEntry : undefined);
    exp('evtContributeToPrizePool', typeof evtContributeToPrizePool !== 'undefined' ? evtContributeToPrizePool : undefined);
    exp('evtStartPhase', typeof evtStartPhase !== 'undefined' ? evtStartPhase : undefined);
    exp('evtAdvancePhase', typeof evtAdvancePhase !== 'undefined' ? evtAdvancePhase : undefined);
    exp('evtExtendPhase', typeof evtExtendPhase !== 'undefined' ? evtExtendPhase : undefined);
    exp('evtFinalizeCompetition', typeof evtFinalizeCompetition !== 'undefined' ? evtFinalizeCompetition : undefined);
    exp('evtRecalcCompTiers', typeof evtRecalcCompTiers !== 'undefined' ? evtRecalcCompTiers : undefined);
    exp('evtUploadPhoto', typeof evtHandlePhotoSelect !== 'undefined' ? evtHandlePhotoSelect : undefined);
    exp('evtDeletePhoto', typeof evtDeletePhoto !== 'undefined' ? evtDeletePhoto : undefined);
    exp('evtViewPhoto', typeof evtViewPhoto !== 'undefined' ? evtViewPhoto : undefined);
    exp('evtNavigateToEvent', typeof evtNavigateToEvent !== 'undefined' ? evtNavigateToEvent : undefined);
    exp('evtNavigateToList', typeof evtNavigateToList !== 'undefined' ? evtNavigateToList : undefined);
})();

;/* ===== js/portal/events/manage/sheet.js ===== */
// ═══════════════════════════════════════════════════════════
// Event Management Sheet  (M3a + M3b)
//
// Self-contained module. Used by both:
//   • admin/events.html  → "Manage" button on each event card
//   • portal/events.html → Host Controls "Manage event" button
//
// All 7 tabs: Overview, RSVPs, Money, Docs, Raffle, Comp, Danger Zone
//
// Public surface:
//   window.EventsManage.open(eventId, { source: 'admin' | 'portal' })
//   window.EventsManage.close()
//
// Requirements: supabaseClient (global), formatCurrency (config.js).
// Per-tab data is lazy-loaded on first switch and cached on STATE.tabData.
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    const STATE = {
        eventId: null,
        event:   null,
        rsvps:   [],
        guestRsvps: [],
        checkins: [],
        activeTab: 'overview',
        source:  'admin', // 'admin' | 'portal'
        editCopyOnOpen: false,
        tabData: {}, // lazy per-tab cache: { money, docs, raffle, comp }
    };

    const RAFFLE_PRIZE_IMAGE_FILES = {};
    const RAFFLE_PRIZE_IMAGE_PREVIEWS = {};

    function getDocTypes() {
        const types = window.EventsConstants && window.EventsConstants.EVENT_DOC_TYPES;
        return types && types.length ? types : [];
    }

    const Shell = window.EventsManageShell;
    const Overview = window.EventsManageOverview;
    const Images = window.EventsManageImages;
    const Rsvps = window.EventsManageRsvps;
    const Danger = window.EventsManageDanger;
    const Money = window.EventsManageMoney;
    const Docs = window.EventsManageDocs;
    const Raffle = window.EventsManageRaffle;
    const Comp = window.EventsManageCompetition;
    const Participation = window.EventsManageParticipation;

    function _ensureMounted() { return Shell.ensureMounted(); }
    function _renderHeader() { return Shell.renderHeader(); }
    function _renderTabs() { return Shell.renderTabs(); }
    function _renderContent(html) { return Shell.renderContent(html); }

    // ─── Data loading ───────────────────────────────────────────────
    async function _loadEventData(eventId) {
        const { data: event } = await supabaseClient
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();
        STATE.event = event;

        const { data: rsvps } = await supabaseClient
            .from('event_rsvps')
            .select('id, user_id, status, paid, qr_token, profiles!event_rsvps_user_id_fkey(id, first_name, last_name, profile_picture_url)')
            .eq('event_id', eventId);
        STATE.rsvps = rsvps || [];

        const { data: guestRsvps } = await supabaseClient
            .from('event_guest_rsvps')
            .select('id, guest_name, guest_email, guest_token, status, paid, amount_paid_cents, stripe_payment_intent_id, created_at')
            .eq('event_id', eventId);
        STATE.guestRsvps = guestRsvps || [];

        const { data: checkins } = await supabaseClient
            .from('event_checkins')
            .select('user_id, guest_token, checked_in_at')
            .eq('event_id', eventId);
        STATE.checkins = checkins || [];
    }

    // ─── Open / Close ───────────────────────────────────────────────
    async function open(eventId, opts = {}) {
        if (!eventId) return;
        Shell.ensureMounted();
        STATE.eventId = eventId;
        STATE.source  = opts.source || 'admin';
        STATE.activeTab = Shell.getTabs().some(t => t.key === opts.tab) ? opts.tab : 'overview';
        STATE.editCopyOnOpen = !!opts.editCopy;
        STATE.tabData = {};
        Raffle?.clearPrizeImageState?.();

        Shell.setLoadingChrome();
        Shell.openPanel();

        await _loadEventData(eventId);
        Shell.renderHeader();
        _renderTab(STATE.activeTab);
    }

    function close() {
        Shell.closePanel();
    }

    function _renderTab(tab) {
        if (tab === 'overview') { _renderContent(Overview.overviewHtml()); Overview.wireOverview(); return; }
        if (tab === 'images')   { _renderContent(Images.imagesHtml());   Images.wireImages();   return; }
        if (tab === 'rsvps')    { _renderContent(Rsvps.rsvpsHtml()); Rsvps.wireRsvps(); return; }
        if (tab === 'danger')   { _renderContent(Danger.dangerHtml()); Danger.wireDanger(); return; }
        // Lazy-loaded M3b tabs:
        if (tab === 'money')    return _renderTabAsync('money',  Money.loadMoney,  Money.moneyHtml,  Money.wireMoney);
        if (tab === 'docs')     return _renderTabAsync('docs',   Docs.loadDocs,   Docs.docsHtml,   Docs.wireDocs);
        if (tab === 'raffle')   return _renderTabAsync('raffle', Raffle.loadRaffle, Raffle.raffleHtml, Raffle.wireRaffle);
        if (tab === 'comp') {
            if (STATE.event?.event_type !== 'competition') { _renderContent(Comp.compHtml()); Comp.wireComp(); return; }
            return _renderTabAsync('comp', Comp.loadComp, Comp.compHtml, Comp.wireComp);
        }
    }

    async function _renderTabAsync(key, loader, render, wire) {
        if (!STATE.tabData[key]) {
            _renderContent(`<div class="em-placeholder"><div style="font-size:13px">Loading…</div></div>`);
            try {
                STATE.tabData[key] = await loader();
            } catch (err) {
                _renderContent(`<div class="em-placeholder"><p class="text-sm text-red-600">Failed to load: ${_esc(err.message || err)}</p></div>`);
                return;
            }
        }
        // Guard: user may have switched tabs while loading
        if (STATE.activeTab !== key) return;
        _renderContent(render());
        if (wire) wire();
    }

    function _overviewHtml() { return Overview.overviewHtml(); }
    function _wireOverview() { return Overview.wireOverview(); }

    async function _refreshEventManager(tab) {
        await _loadEventData(STATE.eventId);
        STATE.tabData = {};
        if (tab) STATE.activeTab = tab;
        _renderHeader();
        _renderTabs();
        _renderTab(STATE.activeTab);
        _notifyParent('updated', STATE.eventId);
    }

    function _notifyParent(type, eventId) {
        document.dispatchEvent(new CustomEvent('events:manage:' + type, { detail: { eventId } }));
    }

    // ─── Empty-state helper (used by M3b tabs when feature isn't enabled) ──
    function _emptyHtml(title, sub) {
        return `
            <div class="em-placeholder">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p class="text-sm font-semibold text-gray-500">${_esc(title)}</p>
                ${sub ? `<p class="text-xs text-gray-400 mt-1">${_esc(sub)}</p>` : ''}
            </div>
        `;
    }

    // ─── Helpers ────────────────────────────────────────────────────
    function _esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }
    function _money(cents) {
        return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
    }

    function refreshRaffle(eventId) {
        return Raffle.refreshRaffle(eventId);
    }

    window.EventsManageParticipationApi = {
        getState: () => STATE,
        refreshEventManager: _refreshEventManager,
        renderTab: _renderTab,
    };

    window.EventsManageDangerApi = {
        getState: () => STATE,
        notifyParent: _notifyParent,
        close,
        renderHeader: () => Shell.renderHeader(),
        renderTab: _renderTab,
        resetParticipation: () => Participation.resetParticipation(),
    };

    window.EventsManageRaffleApi = {
        getState: () => STATE,
        emptyHtml: _emptyHtml,
        notifyParent: _notifyParent,
        refreshEventManager: _refreshEventManager,
        renderTab: _renderTab,
        renderTabAsync: _renderTabAsync,
    };

    window.EventsManageRsvpsApi = {
        getState: () => STATE,
        removeParticipationPerson: (btn) => Participation.removeParticipationPerson(btn),
    };

    window.EventsManageImagesApi = {
        getState: () => STATE,
        notifyParent: _notifyParent,
    };

    window.EventsManageMoneyApi = {
        getState: () => STATE,
    };

    window.EventsManageDocsApi = {
        getState: () => STATE,
        getDocTypes,
        renderTab: _renderTab,
        notifyParent: _notifyParent,
    };

    window.EventsManageCompetitionApi = {
        getState: () => STATE,
        emptyHtml: _emptyHtml,
    };

    window.EventsManageShellApi = {
        getState: () => STATE,
        onClose: close,
        renderTab: _renderTab,
    };

    window.EventsManageOverviewApi = {
        getState: () => STATE,
        renderHeader: () => Shell.renderHeader(),
        renderTabs: () => Shell.renderTabs(),
        renderTab: _renderTab,
        notifyParent: _notifyParent,
    };

    // ─── Public surface ─────────────────────────────────────────────
    window.EventsManage = { open, close, refreshRaffle };

    // PortalEvents.manage namespace bridge (additive — preserves window.EventsManage)
    if (window.PortalEvents) {
        window.PortalEvents.manage = window.PortalEvents.manage || {};
        window.PortalEvents.manage.open = open;
        window.PortalEvents.manage.close = close;
        window.PortalEvents.manage.refreshRaffle = refreshRaffle;
    }

    // Also register on PortalEvents.detail registry (if available)
    if (window.PortalEvents && window.PortalEvents.detail && typeof window.PortalEvents.detail.register === 'function') {
        window.PortalEvents.detail.register('manage', { open, close });
    }
})();

;/* ===== js/portal/events/init.js ===== */
// ═══════════════════════════════════════════════════════════
// Portal Events — Init (Bootstrap + Event Listeners)
// This file must load LAST — it depends on all other modules.
// ═══════════════════════════════════════════════════════════

// ── One-time init guard (Phase 5L.2) ─────────────────────
// Prevents duplicate boot if initEventsPage() runs more than once
// (DOMContentLoaded + manual PortalEvents.initEventsPage(), or future module entry).
let _eventsPageInitialized = false;
let _eventsPopstateListenerBound = false;
let _eventsListenersBound = false;

async function initEventsPage() {
    if (_eventsPageInitialized) return;
    _eventsPageInitialized = true;
    window._eventsPageInitialized = true;

    evtCurrentUser = await checkAuth();
    if (!evtCurrentUser) return;

    // Get role for backward compat, show "Create" button based on permission
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role, first_name, last_name, profile_picture_url')
        .eq('id', evtCurrentUser.id)
        .maybeSingle();
    evtCurrentUserRole = profile?.role;
    // Expose first name for personalized greeting (events_003 §8.1 / B5)
    window.evtCurrentUserName = profile?.first_name || '';
    window.evtCurrentUserPic = profile?.profile_picture_url || null;
    window.evtCurrentUserInitials = ((profile?.first_name?.[0] || '') + (profile?.last_name?.[0] || '')).toUpperCase() || '?';

    if (typeof canCreateEvents === 'function' && canCreateEvents()) {
        document.getElementById('createEventBtn')?.classList.remove('hidden');
        document.getElementById('createEventBtn')?.classList.add('flex');
    }

    // Auto-detect timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzSel = document.getElementById('eventTimezone');
    if (tzSel) {
        for (const opt of tzSel.options) {
            if (opt.value === tz) { opt.selected = true; break; }
        }
    }

    evtSetupListeners();
    await evtLoadEvents();

    // ── URL Routing: check for ?event={slug} on initial load ──
    evtRouteByUrl();

    // ── Browser back/forward support (bind once) ──
    if (!_eventsPopstateListenerBound) {
        _eventsPopstateListenerBound = true;
        window.addEventListener('popstate', () => evtRouteByUrl());
    }
}

// Classic script bootstrap — preserved so the page initializes exactly
// as before under the current HTML script-list loading order.
document.addEventListener('DOMContentLoaded', initEventsPage);

// ─── Raffle Cost Hint Helper ────────────────────────────

function evtUpdateRaffleCostHint() {
    const costGroup = document.getElementById('raffleEntryCostGroup');
    const hint = document.getElementById('raffleCostHint');
    const mode = document.getElementById('pricingMode')?.value || 'free';
    const raffleOn = document.getElementById('raffleEnabled')?.checked;

    if (!costGroup) return;

    if (mode === 'paid') {
        // Paid RSVP → raffle included, hide cost input
        costGroup.classList.add('hidden');
        if (hint) hint.textContent = 'Raffle entry is included free with paid RSVP.';
    } else {
        // Free or RSVP-disabled → show cost input for standalone raffle ticket
        costGroup.classList.remove('hidden');
        if (hint) hint.textContent = 'This is the price for a standalone raffle ticket.';
    }
}

// ─── Event Listeners ────────────────────────────────────

function evtSetupListeners() {
    if (_eventsListenersBound) return;
    _eventsListenersBound = true;

    // Filter chips (replaces old tab-btn listeners)
    evtInitFilterChips();

    // Search
    evtSetupSearch();

    // Type filter
    document.getElementById('typeFilter').addEventListener('change', evtRenderEvents);

    // Create modal  — multi-step EventsCreate sheet is now the default.
    // Falls back to legacy #createModal only if sheet module failed to load.
    function _openCreate() {
        if (window.EventsCreate && window.EventsCreate.open) {
            window.EventsCreate.open();
        } else {
            evtToggleModal('createModal', true);
        }
    }
    document.getElementById('createEventBtn')?.addEventListener('click', _openCreate);
    document.getElementById('emptyCreateBtn')?.addEventListener('click', _openCreate);
    document.getElementById('closeCreateModal')?.addEventListener('click', () => evtToggleModal('createModal', false));
    document.getElementById('createModalOverlay')?.addEventListener('click', () => evtToggleModal('createModal', false));

    // New-create-flow reload events
    document.addEventListener('events:created', () => {
        if (typeof evtLoadEvents === 'function') evtLoadEvents();
    });

    // Scanner modal
    document.getElementById('closeScannerModal')?.addEventListener('click', evtCloseScanner);
    document.getElementById('scannerModalOverlay')?.addEventListener('click', evtCloseScanner);

    // Banner upload
    const dropzone = document.getElementById('bannerDropzone');
    const fileInput = document.getElementById('bannerFile');
    dropzone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', evtHandleBannerSelect);
    dropzone?.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('border-brand-400'); });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('border-brand-400'));
    dropzone?.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('border-brand-400');
        if (e.dataTransfer.files[0]) {
            fileInput.files = e.dataTransfer.files;
            evtHandleBannerSelect();
        }
    });

    const embedDropzone = document.getElementById('embedImageDropzone');
    const embedFileInput = document.getElementById('embedImageFile');
    embedDropzone?.addEventListener('click', () => embedFileInput?.click());
    embedFileInput?.addEventListener('change', evtHandleEmbedImageSelect);
    embedDropzone?.addEventListener('dragover', e => { e.preventDefault(); embedDropzone.classList.add('border-brand-400'); });
    embedDropzone?.addEventListener('dragleave', () => embedDropzone.classList.remove('border-brand-400'));
    embedDropzone?.addEventListener('drop', e => {
        e.preventDefault();
        embedDropzone.classList.remove('border-brand-400');
        if (e.dataTransfer.files[0]) {
            embedFileInput.files = e.dataTransfer.files;
            evtHandleEmbedImageSelect();
        }
    });

    // Create form
    document.getElementById('createEventForm')?.addEventListener('submit', evtHandleCreate);

    // Live address validation (debounced input + blur)
    evtInitLocationValidation();

    // Preview button
    document.getElementById('previewEventBtn')?.addEventListener('click', evtHandlePreview);

    // ── Pricing Mode Toggle ──────────────────────────────
    const pricingModeEl = document.getElementById('pricingMode');
    pricingModeEl?.addEventListener('change', () => {
        const mode = pricingModeEl.value;
        const rsvpCostGroup = document.getElementById('rsvpCostGroup');

        // Show RSVP cost only for 'paid' mode
        if (rsvpCostGroup) rsvpCostGroup.classList.toggle('hidden', mode !== 'paid');

        // Update raffle entry cost hint / visibility based on pricing mode
        evtUpdateRaffleCostHint();
    });

    // ── Raffle Toggle ────────────────────────────────────
    const raffleToggle = document.getElementById('raffleEnabled');
    raffleToggle?.addEventListener('change', () => {
        const config = document.getElementById('raffleConfig');
        if (config) config.classList.toggle('hidden', !raffleToggle.checked);
        evtUpdateRaffleCostHint();
    });

    // ── Winner Count → Prize Inputs ──────────────────────
    const winnerCountEl = document.getElementById('raffleWinnerCount');
    winnerCountEl?.addEventListener('change', () => {
        const count = parseInt(winnerCountEl.value) || 1;
        const container = document.getElementById('rafflePrizesList');
        if (!container) return;

        let html = '';
        for (let i = 1; i <= count; i++) {
            html += `<div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-500 w-6">#${i}</span>
                <input type="text" name="rafflePrize" data-raffle-prize placeholder="Prize for ${i}${evtOrdinalSuffix ? evtOrdinalSuffix(i) : 'th'} place" class="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500">
            </div>`;
        }
        container.innerHTML = html;
    });

    // ── Raffle Draw Modal Close ──────────────────────────
    document.getElementById('closeRaffleDrawModal')?.addEventListener('click', () => evtToggleModal('raffleDrawModal', false));
    document.getElementById('raffleDrawOverlay')?.addEventListener('click', () => evtToggleModal('raffleDrawModal', false));

    // ── LLC Event Type Toggle ────────────────────────────
    document.getElementById('eventType')?.addEventListener('change', evtToggleLlcFields);

    // ── Competition Tier Calculator ──────────────────────
    document.getElementById('compTier1Pct')?.addEventListener('input', evtRecalcCompTiers);
    document.getElementById('compTier2Pct')?.addEventListener('input', evtRecalcCompTiers);
    document.getElementById('compTier3Pct')?.addEventListener('input', evtRecalcCompTiers);

    // ── LLC Cost Builder ─────────────────────────────────
    document.getElementById('addCostItemBtn')?.addEventListener('click', evtAddCostItem);
    document.getElementById('eventMax')?.addEventListener('change', evtRecalcCostSummary);
    document.getElementById('eventMax')?.addEventListener('input', evtRecalcCostSummary);
    document.getElementById('eventMinParticipants')?.addEventListener('change', evtRecalcCostSummary);
    document.getElementById('eventMinParticipants')?.addEventListener('input', evtRecalcCostSummary);
    document.getElementById('eventLlcCut')?.addEventListener('change', evtRecalcCostSummary);
    document.getElementById('eventLlcCut')?.addEventListener('input', evtRecalcCostSummary);

    // Track manual edits to LLC RSVP override so auto-fill doesn't overwrite user input
    const llcOverride = document.getElementById('llcRsvpOverride');
    llcOverride?.addEventListener('input', () => { llcOverride.dataset.userEdited = 'true'; });
    llcOverride?.addEventListener('change', () => { llcOverride.dataset.userEdited = 'true'; });

    // ── Transportation Mode Toggle ───────────────────────
    const transportEl = document.getElementById('eventTransportation');
    transportEl?.addEventListener('change', () => {
        const group = document.getElementById('transportEstimateGroup');
        if (group) group.classList.toggle('hidden', transportEl.value !== 'self_arranged');
    });

    // ── Transportation Enable Toggle ─────────────────────
    const transportToggle = document.getElementById('transportationEnabled');
    transportToggle?.addEventListener('change', () => {
        const section = document.getElementById('transportationSection');
        if (section) section.classList.toggle('hidden', !transportToggle.checked);
    });

    // ── RSVP Enable Toggle ───────────────────────────────
    const rsvpToggle = document.getElementById('rsvpEnabled');
    rsvpToggle?.addEventListener('change', () => {
        const settings = document.getElementById('rsvpSettingsGroup');
        if (settings) settings.classList.toggle('hidden', !rsvpToggle.checked);
        // Clear gated details when RSVP is off (they depend on RSVP)
        if (!rsvpToggle.checked) {
            ['gateTime', 'gateLocation', 'gateNotes'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.checked = false;
            });
            const notes = document.getElementById('eventGatedNotes');
            if (notes) notes.value = '';
        }
    });

    // ── QR Check-In Enable Toggle ────────────────────────
    const checkinToggle = document.getElementById('checkinEnabled');
    checkinToggle?.addEventListener('change', () => {
        const section = document.getElementById('checkinModeSection');
        if (section) section.classList.toggle('hidden', !checkinToggle.checked);
    });
}

// ── Bridge exposure ──────────────────────────────────────
// Classic evt* onclick globals are assigned in compat/global-reexports.js
// (loaded at end of classic-chain-loader, before manage/sheet.js).
window.PortalEvents = window.PortalEvents || {};
window.PortalEvents.initEventsPage = initEventsPage;
