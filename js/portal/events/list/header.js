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
