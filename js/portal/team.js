// ═══════════════════════════════════════════════════════════
// Meet the Team — Phase 3A
// Loads leadership + members from profiles, renders cards,
// org chart, and role definitions.
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ─── Role Hierarchy & Definitions ───────────────────────
    const ROLE_ORDER = [
        'President', 'Vice President', 'Treasurer', 'Secretary', 'Event Coordinator'
    ];

    const ROLE_DEFS = {
        'President': {
            icon: '👑',
            color: 'amber',
            desc: 'Manages the LLC, portal, and investments. Handles final approvals and strategic decisions.'
        },
        'Vice President': {
            icon: '⭐',
            color: 'blue',
            desc: 'Supports the President and steps in when needed. Co-manages daily operations.'
        },
        'Treasurer': {
            icon: '💰',
            color: 'emerald',
            desc: 'Tracks finances, reconciles accounts, and oversees the budget and investment allocation.'
        },
        'Secretary': {
            icon: '📋',
            color: 'purple',
            desc: 'Records meeting minutes, manages documents, and handles family communications.'
        },
        'Event Coordinator': {
            icon: '🎉',
            color: 'pink',
            desc: 'Plans and manages family events — meetups, BBQs, celebrations, and trips.'
        }
    };

    const COLOR_MAP = {
        amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200',   ring: 'ring-amber-400' },
        blue:    { bg: 'bg-blue-100',     text: 'text-blue-700',    border: 'border-blue-200',     ring: 'ring-blue-400' },
        emerald: { bg: 'bg-emerald-100',  text: 'text-emerald-700', border: 'border-emerald-200',  ring: 'ring-emerald-400' },
        purple:  { bg: 'bg-purple-100',   text: 'text-purple-700',  border: 'border-purple-200',   ring: 'ring-purple-400' },
        pink:    { bg: 'bg-pink-100',     text: 'text-pink-700',    border: 'border-pink-200',     ring: 'ring-pink-400' },
        indigo:  { bg: 'bg-indigo-100',   text: 'text-indigo-700',  border: 'border-indigo-200',   ring: 'ring-indigo-400' },
        gray:    { bg: 'bg-gray-100',     text: 'text-gray-600',    border: 'border-gray-200',     ring: 'ring-gray-300' },
        brand:   { bg: 'bg-brand-100',    text: 'text-brand-700',   border: 'border-brand-200',    ring: 'ring-brand-400' },
    };

    // ─── Init ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        // Wait for auth
        if (typeof supabaseClient === 'undefined') return;
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) { window.location.href = '../login.html'; return; }

        await loadTeam();
        renderRoleDefinitions();
    });

    // ─── Load All Active Members ───────────────────────────
    async function loadTeam() {
        const { data: members, error } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, title, role, profile_picture_url, bio, displayed_badge, created_at, is_active')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (error || !members) {
            console.error('Failed to load team:', error);
            return;
        }

        // Only show members with a leadership title assigned
        const leaders = members.filter(m => m.title && ROLE_ORDER.includes(m.title));

        // Sort leaders by role hierarchy
        leaders.sort((a, b) => {
            const ai = ROLE_ORDER.indexOf(a.title);
            const bi = ROLE_ORDER.indexOf(b.title);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

        renderLeadership(leaders);
        renderOrgChart(leaders);
    }

    // ─── Render Leadership Cards ────────────────────────────
    function renderLeadership(leaders) {
        const grid = document.getElementById('leadershipGrid');
        if (!grid) return;

        if (leaders.length === 0) {
            grid.innerHTML = '<p class="text-sm text-gray-400 col-span-2 text-center py-8">No leadership roles assigned yet.</p>';
            return;
        }

        grid.innerHTML = leaders.map(m => buildCard(m, true)).join('');
    }

    // ─── Build a Member Card ────────────────────────────────
    function buildCard(member, isLeader) {
        const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Member';
        const initials = ((member.first_name || '?')[0] + (member.last_name || '')[0]).toUpperCase();
        const title = member.title || 'Member';
        const roleDef = ROLE_DEFS[title] || ROLE_DEFS['Member'];
        const colors = COLOR_MAP[roleDef.color] || COLOR_MAP.gray;

        const avatarSize = isLeader ? 'w-16 h-16' : 'w-14 h-14';
        const initialsSize = isLeader ? 'text-xl' : 'text-lg';

        let avatar;
        if (member.profile_picture_url) {
            avatar = `<img src="${member.profile_picture_url}" alt="${fullName}" class="${avatarSize} rounded-full object-cover ring-2 ${colors.ring} ring-offset-2">`;
        } else {
            avatar = `<div class="${avatarSize} rounded-full ${colors.bg} flex items-center justify-center ring-2 ${colors.ring} ring-offset-2">
                <span class="${initialsSize} font-bold ${colors.text}">${initials}</span>
            </div>`;
        }

        // Badge overlay
        let badgeHtml = '';
        if (member.displayed_badge && typeof buildNavBadgeOverlay === 'function') {
            badgeHtml = `<div class="absolute -bottom-1 -right-1">${buildNavBadgeOverlay(member.displayed_badge)}</div>`;
        }

        // Member since
        const since = member.created_at ? new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';

        const bio = member.bio ? `<p class="text-xs text-gray-400 mt-1 line-clamp-2">${escapeHtml(member.bio)}</p>` : '';

        return `
            <a href="profile.html?id=${member.id}" class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition group">
                <div class="relative flex-shrink-0">
                    ${avatar}
                    ${badgeHtml}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <h3 class="text-sm font-bold text-gray-900 truncate group-hover:text-brand-600 transition">${escapeHtml(fullName)}</h3>
                        ${isLeader ? `<span class="text-sm">${roleDef.icon}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-2 mt-0.5">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text}">${title}</span>
                        ${since ? `<span class="text-[10px] text-gray-400">Since ${since}</span>` : ''}
                    </div>
                    ${bio}
                </div>
                <svg class="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>`;
    }

    // ─── Org Chart ──────────────────────────────────────────
    function renderOrgChart(leaders) {
        const container = document.getElementById('orgChart');
        if (!container) return;

        if (leaders.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">Org chart will appear when leadership roles are assigned.</p>';
            return;
        }

        // Find President (top of chart)
        const president = leaders.find(l => l.title === 'President');
        const otherLeaders = leaders.filter(l => l.title !== 'President');

        let html = '<div class="flex flex-col items-center gap-4">';

        // President at top
        if (president) {
            html += buildOrgNode(president, true);
        }

        // Connector line
        if (otherLeaders.length > 0) {
            html += '<div class="w-px h-6 bg-gray-200"></div>';
        }

        // Other leadership
        if (otherLeaders.length > 0) {
            html += '<div class="flex flex-wrap justify-center gap-4">';
            otherLeaders.forEach(l => { html += buildOrgNode(l, false); });
            html += '</div>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    function buildOrgNode(member, isTop) {
        const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Member';
        const initials = ((member.first_name || '?')[0] + (member.last_name || '')[0]).toUpperCase();
        const title = member.title || 'Member';
        const roleDef = ROLE_DEFS[title] || ROLE_DEFS['Member'];
        const colors = COLOR_MAP[roleDef.color] || COLOR_MAP.gray;
        const size = isTop ? 'w-14 h-14' : 'w-11 h-11';
        const textSize = isTop ? 'text-lg' : 'text-sm';

        let avatar;
        if (member.profile_picture_url) {
            avatar = `<img src="${member.profile_picture_url}" alt="${fullName}" class="${size} rounded-full object-cover ring-2 ${colors.ring} ring-offset-1">`;
        } else {
            avatar = `<div class="${size} rounded-full ${colors.bg} flex items-center justify-center ring-2 ${colors.ring} ring-offset-1">
                <span class="${textSize} font-bold ${colors.text}">${initials}</span>
            </div>`;
        }

        return `
            <a href="profile.html?id=${member.id}" class="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-50 transition">
                ${avatar}
                <div class="text-center">
                    <p class="text-xs font-semibold text-gray-900 leading-tight">${escapeHtml(fullName)}</p>
                    <p class="text-[10px] ${colors.text} font-medium">${roleDef.icon} ${title}</p>
                </div>
            </a>`;
    }

    function buildOrgNodeSmall(member) {
        const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Member';
        const initials = ((member.first_name || '?')[0] + (member.last_name || '')[0]).toUpperCase();

        let avatar;
        if (member.profile_picture_url) {
            avatar = `<img src="${member.profile_picture_url}" alt="${fullName}" class="w-9 h-9 rounded-full object-cover">`;
        } else {
            avatar = `<div class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <span class="text-xs font-bold text-gray-500">${initials}</span>
            </div>`;
        }

        return `
            <a href="profile.html?id=${member.id}" class="flex flex-col items-center gap-1 hover:opacity-80 transition">
                ${avatar}
                <span class="text-[9px] text-gray-500 text-center leading-tight max-w-[56px] truncate">${escapeHtml(member.first_name || fullName)}</span>
            </a>`;
    }

    // ─── Role Definitions ───────────────────────────────────
    function renderRoleDefinitions() {
        const container = document.getElementById('roleDefinitions');
        if (!container) return;

        container.innerHTML = ROLE_ORDER.map(title => {
            const def = ROLE_DEFS[title] || ROLE_DEFS['Member'];
            const colors = COLOR_MAP[def.color] || COLOR_MAP.gray;
            return `
                <div class="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div class="w-9 h-9 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0 text-base">${def.icon}</div>
                    <div>
                        <h3 class="text-sm font-semibold text-gray-900">${title}</h3>
                        <p class="text-xs text-gray-500 mt-0.5">${def.desc}</p>
                    </div>
                </div>`;
        }).join('');
    }

    // ─── Helpers ────────────────────────────────────────────
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

})();
