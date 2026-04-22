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
        ordinal,
        generateSlug,
        openLightbox,
        startLiveCountdown,
        toast,
        toggleModal,
    };

    window.EventsHelpers = EventsHelpers;
})();
