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

    // ─── miniMarkdown (images / links / bold / italic) ───
    // Set `escapeFirst=true` to escape raw text first (safe path).
    // Images + links allow http(s) URLs only.
    function miniMarkdown(text, escapeFirst = false) {
        if (!text) return '';
        let html = escapeFirst ? escapeHtml(text) : text;
        html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g,
            '<img src="$2" alt="$1" loading="lazy" class="ed-md-img">');
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
    // mode: 'upcoming' → Tonight | This week | This month | Later | Earlier*
    //       'past'     → Last week | Last month | Earlier
    //       'going'    → Tonight | This week | Later | Earlier*
    // *Earlier = start calendar day before today (stale still-open events)
    // Buckets with zero events are dropped. Input order preserved
    // within each bucket (caller is responsible for date-sort).
    function groupByBucket(events, mode = 'upcoming') {
        const list = Array.isArray(events) ? events : [];
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Bucket schemas
        const schema = {
            upcoming: ['Tonight', 'This week', 'This month', 'Later', 'Earlier'],
            past:     ['Last week', 'Last month', 'Earlier'],
            going:    ['Tonight', 'This week', 'Later', 'Earlier'],
        };
        const labels = schema[mode] || schema.upcoming;
        const buckets = Object.fromEntries(labels.map(l => [l, []]));

        function bucketOf(e) {
            const raw = e?.start_at || e?.start_date || e?.starts_at;
            if (!raw) return labels[labels.length - 1];
            const d = new Date(raw);
            if (isNaN(d)) return labels[labels.length - 1];
            const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const dayDiff = Math.round((startOfDay - startOfToday) / 86_400_000);

            if (mode === 'past') {
                // dayDiff is negative for past
                if (dayDiff >= -7)  return 'Last week';
                if (dayDiff >= -30) return 'Last month';
                return 'Earlier';
            }

            // upcoming / going — never put prior calendar days in Tonight
            if (dayDiff < 0)            return 'Earlier';
            if (dayDiff === 0)          return 'Tonight';
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

    // ─── Seat pricing (§13.8 adult/kid picker) ────────────
    function normalizeSeatRole(raw) {
        const v = String(raw || '').trim().toLowerCase();
        return v === 'kid' ? 'kid' : 'adult';
    }

    function adultPriceCents(event) {
        if (event?.adult_price_cents != null && Number.isFinite(Number(event.adult_price_cents))) {
            return Math.max(0, Number(event.adult_price_cents));
        }
        return Math.max(0, Number(event?.rsvp_cost_cents || 0));
    }

    function seatPriceCents(event, role) {
        const r = normalizeSeatRole(role);
        if (r === 'kid') {
            if (event?.kids_free !== false) return 0;
            const kid = Number(event?.kid_price_cents);
            return Number.isFinite(kid) && kid >= 0 ? kid : 0;
        }
        return adultPriceCents(event);
    }

    function partyBaseTotalCents(event, seats) {
        let total = 0;
        for (const seat of seats || []) {
            total += seatPriceCents(event, seat.role);
        }
        return total;
    }

    function seatPriceLabel(event, role) {
        const cents = seatPriceCents(event, role);
        if (cents <= 0) return 'Free';
        return formatMoney(cents);
    }

    function seatInfoInviteUrl(token) {
        const t = String(token || '').trim();
        if (!t) return '';
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin)
            ? window.location.origin
            : 'https://justicemcneal.com';
        return `${origin}/events/seat-info/?t=${encodeURIComponent(t)}`;
    }

    function seatInfoInvitesHtml(tokens, opts) {
        const list = Array.isArray(tokens) ? tokens.filter((row) => row && row.info_invite_token && !row.options_complete) : [];
        if (!list.length) return '';
        const title = (opts && opts.title) || 'Guest invite links';
        const sub = (opts && opts.sub) || 'Send these so guests can fill their sizes. You still handle payment.';
        const rows = list.map((row) => {
            const name = escapeHtml(row.display_name || 'Guest');
            const token = escapeHtml(row.info_invite_token);
            return `
                <div class="ed-seat-info-invite-row">
                    <span class="ed-seat-info-invite-name">${name}</span>
                    <button type="button" class="ed-seat-info-invite-copy" data-seat-info-copy="${token}">Copy invite link</button>
                </div>`;
        }).join('');
        return `
            <div class="ed-seat-info-invites" data-seat-info-invites="1">
                <p class="ed-seat-info-invites-title">${escapeHtml(title)}</p>
                <p class="ed-seat-info-invites-sub">${escapeHtml(sub)}</p>
                ${rows}
            </div>`;
    }

    function wireSeatInfoInviteCopy(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-seat-info-copy]').forEach((btn) => {
            if (btn.dataset.copyWired) return;
            btn.dataset.copyWired = '1';
            btn.addEventListener('click', async () => {
                const token = btn.getAttribute('data-seat-info-copy') || '';
                const url = seatInfoInviteUrl(token);
                if (!url) return;
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(url);
                    } else {
                        const ta = document.createElement('textarea');
                        ta.value = url;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        ta.remove();
                    }
                    const prev = btn.textContent;
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = prev || 'Copy invite link'; }, 1500);
                } catch (_) {
                    prompt('Copy this invite link:', url);
                }
            });
        });
    }

    function paymentMagicLinkUrl(token) {
        const t = String(token || '').trim();
        if (!t) return '';
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin)
            ? window.location.origin
            : 'https://justicemcneal.com';
        return `${origin}/events/payments/?t=${encodeURIComponent(t)}`;
    }

    function stashPaymentInviteToken(eventId, token) {
        const t = String(token || '').trim();
        const id = String(eventId || '').trim();
        if (!t || !id) return;
        try {
            sessionStorage.setItem(`event_pay_link_${id}`, t);
        } catch (_) { /* ignore */ }
    }

    function readPaymentInviteToken(eventId) {
        const params = new URLSearchParams(window.location.search || '');
        const fromQuery = (params.get('t') || params.get('token') || '').trim();
        if (fromQuery) return fromQuery;
        const id = String(eventId || '').trim();
        if (!id) return '';
        try {
            return String(sessionStorage.getItem(`event_pay_link_${id}`) || '').trim();
        } catch (_) {
            return '';
        }
    }

    function paymentMagicLinkHtml(tokenOrUrl, opts) {
        const options = opts && typeof opts === 'object' ? opts : {};
        let url = String(tokenOrUrl || '').trim();
        if (url && !/^https?:\/\//i.test(url)) {
            url = paymentMagicLinkUrl(url);
        }
        if (!url) return '';
        const title = options.title || 'Your payment link';
        const sub = options.sub || 'We also texted this link when SMS is enabled. Save it to manage payments anytime.';
        const safeUrl = escapeHtml(url);
        return `
            <div class="ed-seat-info-invites ed-payment-magic-link" data-payment-magic-link="1">
                <p class="ed-seat-info-invites-title">${escapeHtml(title)}</p>
                <p class="ed-seat-info-invites-sub">${escapeHtml(sub)}</p>
                <div class="ed-seat-info-invite-row">
                    <a class="ed-seat-info-invite-name" href="${safeUrl}" style="word-break:break-all;text-decoration:underline;color:var(--color-primary,#13366E)">Open My trip payments</a>
                    <button type="button" class="ed-seat-info-invite-copy" data-payment-link-copy="${safeUrl}">Copy payment link</button>
                </div>
            </div>`;
    }

    function wirePaymentMagicLinkCopy(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-payment-link-copy]').forEach((btn) => {
            if (btn.dataset.copyWired) return;
            btn.dataset.copyWired = '1';
            btn.addEventListener('click', async () => {
                const url = btn.getAttribute('data-payment-link-copy') || '';
                if (!url) return;
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(url);
                    } else {
                        const ta = document.createElement('textarea');
                        ta.value = url;
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        ta.remove();
                    }
                    const prev = btn.textContent;
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = prev || 'Copy payment link'; }, 1500);
                } catch (_) {
                    prompt('Copy this payment link:', url);
                }
            });
        });
    }

    /** Pay CTA label for member/guest RSVP (§13.8 parity). opts.mode: 'rsvp' | 'complete'; opts.partyTotalCents for multi-seat */
    function rsvpPayButtonLabel(event, role, opts) {
        const options = opts && typeof opts === 'object' ? opts : {};
        const mode = options.mode === 'complete' ? 'complete' : 'rsvp';
        const audience = options.audience === 'guest' ? 'guest' : 'member';
        const seatPrice = options.partyTotalCents != null
            ? Math.max(0, Number(options.partyTotalCents) || 0)
            : seatPriceCents(event, role);
        const guestPrefix = audience === 'guest' ? 'RSVP as Guest' : 'RSVP as Member';
        const prefix = mode === 'complete' ? 'Complete Payment' : guestPrefix;
        if (event?.pricing_mode === 'paid') {
            if (seatPrice > 0) return `${prefix} — ${formatMoney(seatPrice)}`;
            return mode === 'complete' ? prefix : `${guestPrefix} — Free`;
        }
        return guestPrefix;
    }

    /**
     * True when the member is committed Going (not Stripe-prep / abandoned checkout).
     * Paid events: require rsvp.paid or an active/past_due/completed plan.
     * Free / non-paid: status going or paid flag.
     * Works for member RSVPs and guest RSVP rows (same status/paid shape).
     */
    function rsvpIsCommittedGoing(event, rsvp, plan) {
        if (!rsvp) return false;
        const pricingPaid = event?.pricing_mode === 'paid';
        const paidFlag = rsvp.paid === true;
        const statusGoing = rsvp.status === 'going';
        if (!pricingPaid) {
            return !!(statusGoing || paidFlag);
        }
        if (paidFlag) return true;
        const planStatus = String(plan?.status || '').trim();
        if (planStatus === 'active' || planStatus === 'past_due' || planStatus === 'completed') {
            return true;
        }
        return false;
    }

    /**
     * Unified RSVP CTA state for portal/public sticky + Your RSVP card.
     * @returns {{ kind:'rsvp'|'continue'|'going', label:string, subLabel:string, showCancel:boolean, cancelMode:'cancel'|'remove'|null, cancelLabel:string|null }}
     */
    function rsvpCtaState(event, opts) {
        const options = opts && typeof opts === 'object' ? opts : {};
        const rsvp = options.rsvp || null;
        const plan = options.plan || null;
        const hasDraft = !!options.hasDraft;
        const pricingPaid = event?.pricing_mode === 'paid';
        const isGoing = !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));
        const committed = rsvpIsCommittedGoing(event, rsvp, plan);
        const amountPaid = Math.max(0, Number(plan?.amount_paid_cents) || Number(rsvp?.amount_paid_cents) || 0);
        const totalDue = Math.max(0, Number(plan?.total_due_cents) || 0);
        const remaining = plan != null
            ? Math.max(0, Number(plan.remaining_cents != null ? plan.remaining_cents : (totalDue - amountPaid)) || 0)
            : null;
        const planStatus = String(plan?.status || '').trim();
        const paidFull = !!(rsvp?.paid
            || planStatus === 'completed'
            || (remaining === 0 && amountPaid > 0));
        const unpaidGoing = !!(pricingPaid && isGoing && !committed);

        if (committed) {
            let subLabel = '';
            if (!pricingPaid) {
                subLabel = '';
            } else if (paidFull) {
                subLabel = 'Paid in full';
            } else {
                const paidCount = options.installmentsPaid;
                const totalCount = options.installmentsTotal;
                if (paidCount != null && totalCount != null && Number(totalCount) > 0) {
                    subLabel = `Paid ${Number(paidCount)}/${Number(totalCount)}`;
                } else if (totalDue > 0) {
                    subLabel = `Paid ${formatMoney(amountPaid)} / ${formatMoney(totalDue)}`;
                } else {
                    subLabel = 'Payment in progress';
                }
            }
            const cancelMode = pricingPaid
                ? (paidFull ? 'remove' : (planStatus === 'active' || planStatus === 'past_due' ? 'cancel' : (rsvp?.paid ? 'remove' : null)))
                : null;
            return {
                kind: 'going',
                label: 'Going',
                subLabel,
                showCancel: !!cancelMode,
                cancelMode,
                cancelLabel: cancelMode === 'remove' ? 'Remove RSVP' : (cancelMode === 'cancel' ? 'Cancel' : null),
            };
        }

        if (hasDraft || unpaidGoing || (pricingPaid && planStatus === 'setup' && amountPaid <= 0 && isGoing)) {
            return {
                kind: 'continue',
                label: 'Continue RSVP',
                subLabel: '',
                showCancel: false,
                cancelMode: null,
                cancelLabel: null,
            };
        }

        return {
            kind: 'rsvp',
            label: 'RSVP',
            subLabel: '',
            showCancel: false,
            cancelMode: null,
            cancelLabel: null,
        };
    }

    // ─── validatePhone (RSVP contact — §13.8) ─────────────
    function validatePhone(raw) {
        const trimmed = String(raw || '').trim();
        if (!trimmed) return { error: 'Phone number is required.' };
        const digits = trimmed.replace(/\D/g, '');
        if (digits.length < 10) {
            return { error: 'Enter a valid 10-digit US phone number (or include country code).' };
        }
        if (digits.length > 15) return { error: 'Phone number is too long.' };
        return { value: trimmed };
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

    /**
     * Themed confirm dialog (replaces window.confirm for RSVP → Stripe).
     * @param {{ title?: string, message?: string, confirmLabel?: string, cancelLabel?: string, showCancel?: boolean }} opts
     * @returns {Promise<boolean>}
     */
    function confirmDialog(opts = {}) {
        const title = opts.title || 'Confirm payment';
        const message = opts.message == null ? '' : String(opts.message);
        const confirmLabel = opts.confirmLabel || 'Continue to checkout';
        const cancelLabel = opts.cancelLabel || 'Cancel';
        const showCancel = opts.showCancel !== false;

        return new Promise((resolve) => {
            document.getElementById('evtConfirmDialog')?.remove();

            const root = document.createElement('div');
            root.id = 'evtConfirmDialog';
            root.className = 'evt-confirm-dialog';
            root.setAttribute('role', 'dialog');
            root.setAttribute('aria-modal', 'true');
            root.setAttribute('aria-labelledby', 'evtConfirmDialogTitle');

            const paragraphs = message.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
            const bodyHtml = paragraphs.length
                ? paragraphs.map((p) =>
                    `<p class="evt-confirm-dialog__text">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`
                ).join('')
                : '<p class="evt-confirm-dialog__text">Proceed to checkout?</p>';

            const actionsClass = showCancel
                ? 'evt-confirm-dialog__actions'
                : 'evt-confirm-dialog__actions evt-confirm-dialog__actions--single';
            const cancelBtn = showCancel
                ? `<button type="button" class="evt-confirm-dialog__btn evt-confirm-dialog__btn--cancel" data-evt-confirm-dismiss>${escapeHtml(cancelLabel)}</button>`
                : '';

            root.innerHTML =
                '<div class="evt-confirm-dialog__backdrop" data-evt-confirm-dismiss></div>' +
                '<div class="evt-confirm-dialog__panel">' +
                  `<h2 id="evtConfirmDialogTitle" class="evt-confirm-dialog__title">${escapeHtml(title)}</h2>` +
                  `<div class="evt-confirm-dialog__body">${bodyHtml}</div>` +
                  `<div class="${actionsClass}">` +
                    cancelBtn +
                    `<button type="button" class="evt-confirm-dialog__btn evt-confirm-dialog__btn--confirm" data-evt-confirm-ok>${escapeHtml(confirmLabel)}</button>` +
                  '</div>' +
                '</div>';

            const prevOverflow = document.body.style.overflow;
            let settled = false;
            const finish = (ok) => {
                if (settled) return;
                settled = true;
                document.removeEventListener('keydown', onKey, true);
                document.body.style.overflow = prevOverflow;
                root.remove();
                resolve(!!ok);
            };

            const onKey = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    finish(false);
                }
            };

            root.addEventListener('click', (e) => {
                if (e.target.closest('[data-evt-confirm-ok]')) {
                    e.preventDefault();
                    finish(true);
                } else if (e.target.closest('[data-evt-confirm-dismiss]')) {
                    e.preventDefault();
                    finish(false);
                }
            });

            document.addEventListener('keydown', onKey, true);
            document.body.style.overflow = 'hidden';
            document.body.appendChild(root);
            requestAnimationFrame(() => {
                root.classList.add('is-open');
                const okBtn = root.querySelector('[data-evt-confirm-ok]');
                if (okBtn) okBtn.focus();
            });
        });
    }

    /**
     * Themed one-button alert (replaces window.alert).
     * @param {string|{ title?: string, message?: string, okLabel?: string }} opts
     * @returns {Promise<boolean>}
     */
    function alertDialog(opts = {}) {
        if (typeof opts === 'string') opts = { message: opts };
        return confirmDialog({
            title: opts.title || 'Please check this step',
            message: opts.message == null ? '' : String(opts.message),
            confirmLabel: opts.okLabel || opts.confirmLabel || 'OK',
            showCancel: false,
        });
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
        confirmDialog,
        alertDialog,
        validatePhone,
        normalizeSeatRole,
        adultPriceCents,
        seatPriceCents,
        seatPriceLabel,
        partyBaseTotalCents,
        seatInfoInviteUrl,
        seatInfoInvitesHtml,
        wireSeatInfoInviteCopy,
        paymentMagicLinkUrl,
        paymentMagicLinkHtml,
        wirePaymentMagicLinkCopy,
        stashPaymentInviteToken,
        readPaymentInviteToken,
        rsvpPayButtonLabel,
        rsvpIsCommittedGoing,
        rsvpCtaState,
    };

    window.EventsHelpers = EventsHelpers;
})();
