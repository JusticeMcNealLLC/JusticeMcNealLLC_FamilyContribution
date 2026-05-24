/* ════════════════════════════════════════════════════════════
   Portal Events — Detail post-render hooks (Phase 5H.6.1–5H.6.2)
   Classic IIFE; loads after detail/sections.js, before detail.js.
   Avatar paint, comments load, host dropdown listener, ticket QR canvas paint.
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

    function evtRenderDetailQrCanvases(ctx) {
        if (!ctx || !ctx.event) return;
        const { event, rsvp, memberGoing } = ctx;
        if (!memberGoing || event.checkin_mode !== 'attendee_ticket') return;
        if (!rsvp || !rsvp.qr_token) return;
        if (typeof QRCode === 'undefined') return;

        const canvas = document.getElementById('myTicketQR');
        if (!canvas) return;

        QRCode.toCanvas(
            canvas,
            `${window.location.origin}/events/?e=${event.slug}&ticket=${rsvp.qr_token}`,
            { width: 180, margin: 2 }
        );
    }

    window.PortalEvents.detail.postRender = {
        runBasics: evtRunDetailPostRenderBasics,
        renderQrCanvases: evtRenderDetailQrCanvases,
    };

    window.evtRunDetailPostRenderBasics = evtRunDetailPostRenderBasics;
    window.evtRenderDetailQrCanvases = evtRenderDetailQrCanvases;
})();
