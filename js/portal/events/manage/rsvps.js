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
