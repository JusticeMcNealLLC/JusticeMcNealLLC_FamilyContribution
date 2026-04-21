// js/admin/members/members-cards.js
// Pure render functions for the member list. No data fetching here.
// Spec: members_001.md §6b (card design) and §6e (empty states).

(function (global) {
    'use strict';

    const { STATUS_CONFIG, MEMBER_STATUS } = global.MembersStatus;

    // ── Helpers ──────────────────────────────────────────────────────────
    function getInitials(email, firstName, lastName) {
        if (firstName && lastName) return (firstName[0] + lastName[0]).toUpperCase();
        if (firstName) return firstName.slice(0, 2).toUpperCase();
        const name = (email || '??').split('@')[0];
        const parts = name.split(/[._-]/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    }

    function getAvatarColor(email) {
        const colors = [
            'bg-brand-100 text-brand-700',
            'bg-emerald-100 text-emerald-700',
            'bg-amber-100 text-amber-700',
            'bg-rose-100 text-rose-700',
            'bg-cyan-100 text-cyan-700',
            'bg-violet-100 text-violet-700',
            'bg-orange-100 text-orange-700',
            'bg-teal-100 text-teal-700',
        ];
        const key = email || '';
        let hash = 0;
        for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    }

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function formatMoney(cents) {
        if (typeof global.formatCurrency === 'function') return global.formatCurrency(cents || 0);
        return '$' + (((cents || 0) / 100).toFixed(2));
    }

    // Allow only #RGB / #RRGGBB / #RRGGBBAA hex colors. Anything else returns
    // null so the caller falls back to a safe default. Prevents CSS / markup
    // injection via a malformed roles.color value.
    function safeHexColor(value) {
        if (typeof value !== 'string') return null;
        return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value) ? value : null;
    }

    // ── Card render ──────────────────────────────────────────────────────
    function renderCard(member) {
        const status = member.status || MEMBER_STATUS.PENDING;
        const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
        const isDeactivated = status === MEMBER_STATUS.DEACTIVATED;
        const canResend = !member.setup_completed && !isDeactivated;

        const displayName = (member.first_name && member.last_name)
            ? `${member.first_name} ${member.last_name}`
            : (member.email || 'Unknown');

        const initials  = getInitials(member.email, member.first_name, member.last_name);
        const avatarCls = getAvatarColor(member.email);
        const photo     = member.profile_picture_url;

        const monthlyText = member.monthlyAmountCents
            ? `${formatMoney(member.monthlyAmountCents)}/mo`
            : 'No plan';
        const totalText = `Total ${formatMoney(member.totalContributedCents || 0)}`;

        const roleChips = (member.roles || []).map(r => {
            const safe = safeHexColor(r.color);
            const bg = safe ? `${safe}20` : '#e0e7ff';
            const fg = safe || '#4f46e5';
            return `<span class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                          style="background:${bg};color:${fg}">${r.icon ? escapeHtml(r.icon) + ' ' : ''}${escapeHtml(r.name)}</span>`;
        }).join('');

        const avatarBlock = photo
            ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(displayName)}"
                    class="w-[52px] h-[52px] rounded-full object-cover flex-shrink-0 border-2 border-gray-100">`
            : `<div class="w-[52px] h-[52px] rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarCls}">${escapeHtml(initials)}</div>`;

        const accentBar = isDeactivated
            ? ''
            : `<div class="absolute left-0 top-0 bottom-0 w-1 ${cfg.dot} rounded-l-2xl"></div>`;

        const wrapperOpacity = isDeactivated ? 'opacity-60' : '';

        // Overflow menu items vary by member state. The menu is rendered
        // collapsed; index.js toggles `data-open` and dispatches the actions.
        const menuItems = [
            `<button type="button" role="menuitem" data-card-action="copy-email"
                class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Copy email</button>`,
            canResend
                ? `<button type="button" role="menuitem" data-card-action="resend-invite"
                    class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Resend invite</button>`
                : '',
            isDeactivated
                ? `<button type="button" role="menuitem" data-card-action="reactivate"
                    class="w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50">Reactivate</button>`
                : `<button type="button" role="menuitem" data-card-action="deactivate"
                    class="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50">Deactivate</button>`,
        ].filter(Boolean).join('');

        const overflowMenu = `
            <div class="relative flex-shrink-0" data-card-menu>
                <button type="button" data-card-action="toggle-menu" aria-haspopup="menu" aria-expanded="false"
                    class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    title="More actions" aria-label="More actions">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 5.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
                    </svg>
                </button>
                <div role="menu" data-card-menu-list
                    class="hidden absolute right-0 top-full mt-1 z-20 min-w-[160px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    ${menuItems}
                </div>
            </div>
        `;

        return `
            <div class="relative bg-white rounded-2xl border border-gray-200/80 p-4 sm:p-5 cursor-pointer hover:border-gray-300 transition ${wrapperOpacity}"
                 data-member-id="${escapeHtml(member.id)}"
                 data-action="open-member">
                ${accentBar}
                <div class="flex items-center gap-3 sm:gap-4 pl-2">
                    ${avatarBlock}
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-sm font-semibold text-gray-900 truncate">${escapeHtml(displayName)}</span>
                            ${roleChips}
                        </div>
                        <div class="text-xs text-gray-400 truncate mt-0.5">${escapeHtml(member.email || '')}</div>
                        <div class="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>${escapeHtml(monthlyText)}</span>
                            <span class="text-gray-300">&middot;</span>
                            <span>${escapeHtml(totalText)}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.badgeBg} ${cfg.badgeText}">
                            ${escapeHtml(cfg.label)}
                        </span>
                        ${overflowMenu}
                    </div>
                </div>
            </div>
        `;
    }

    // ── Empty states per tab ─────────────────────────────────────────────
    const EMPTY_COPY = {
        all:                   { msg: 'No members yet. Start by inviting someone.', cta: true  },
        active:                { msg: 'No active members yet.',                     cta: true  },
        past_due:              { msg: '🎉 No past due members. Everyone is paid up!', cta: false },
        pending:               { msg: 'No pending invitations.',                    cta: true  },
        awaiting_subscription: { msg: 'No members awaiting subscription setup.',    cta: false },
        deactivated:           { msg: 'No deactivated members.',                    cta: false },
        attention:             { msg: '🎉 No members need attention right now.',     cta: false },
    };

    function renderEmptyState(tab) {
        const cfg = EMPTY_COPY[tab] || EMPTY_COPY.all;
        const ctaBtn = cfg.cta
            ? `<button data-action="open-invite"
                       class="mt-4 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-5 rounded-xl transition text-sm">
                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                   </svg>
                   Invite Member
               </button>`
            : '';
        return `
            <div class="bg-white rounded-2xl border border-gray-200/80 p-8 text-center">
                <p class="text-sm text-gray-500">${escapeHtml(cfg.msg)}</p>
                ${ctaBtn}
            </div>
        `;
    }

    // ── Public API ───────────────────────────────────────────────────────
    global.MemberCards = {
        renderCard,
        renderEmptyState,
        getInitials,
        getAvatarColor,
    };
})(window);
