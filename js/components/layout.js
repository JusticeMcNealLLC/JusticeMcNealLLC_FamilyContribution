// Shared layout component — injects nav, footer, and mobile tab bar
// Usage: <body data-layout="portal|admin" data-page="dashboard|history|..." class="...">
// Must load AFTER supabase-js + config.js but BEFORE auth/shared.js

(function () {
    const body = document.body;
    const layout = body.dataset.layout;
    const activePage = body.dataset.page || '';
    if (!layout) return;

    const isPortal = layout === 'portal';
    const isAdmin = layout === 'admin';

    // ── SVG Icons ──────────────────────────────────────
    const icons = {
        home: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>',
        invest: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>',
        history: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        settings: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
        signout: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>',
        hub: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg>',
        members: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>',
        invite: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>',
        portal: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>',
    };

    // ── Helpers ─────────────────────────────────────────
    const activeClass = 'px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg';
    const inactiveClass = 'px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition';

    function dLink(href, label, pageId) {
        return `<a href="${href}" class="${activePage === pageId ? activeClass : inactiveClass}">${label}</a>`;
    }

    function mTab(href, label, icon, pageId) {
        return `<a href="${href}" class="${activePage === pageId ? 'tab-active' : 'tab-inactive'}">${icon}<span>${label}</span></a>`;
    }

    // ── Build content by layout type ───────────────────
    let desktopLinks, mobileTabs, badgeHtml = '', settingsHref;

    if (isPortal) {
        settingsHref = 'settings.html';
        desktopLinks = [
            dLink('index.html', 'Dashboard', 'dashboard'),
            dLink('investments.html', 'Investments', 'investments'),
            dLink('history.html', 'History', 'history'),
            dLink('settings.html', 'Settings', 'settings'),
        ].join('\n');

        mobileTabs = [
            mTab('index.html', 'Home', icons.home, 'dashboard'),
            mTab('investments.html', 'Invest', icons.invest, 'investments'),
            mTab('history.html', 'History', icons.history, 'history'),
            mTab('settings.html', 'Settings', icons.settings, 'settings'),
            `<button id="logoutBtnMobile" class="tab-inactive">${icons.signout}<span>Sign Out</span></button>`,
        ].join('\n');
    } else {
        settingsHref = '../portal/settings.html';
        badgeHtml = '<span class="bg-brand-100 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full">Admin</span>';

        desktopLinks = [
            dLink('index.html', 'Hub', 'hub'),
            dLink('members.html', 'Members', 'members'),
            dLink('invite.html', 'Invite', 'invite'),
            dLink('deposits.html', 'Deposits', 'deposits'),
            dLink('transactions.html', 'Transactions', 'transactions'),
            '<div class="w-px h-6 bg-gray-200 mx-1"></div>',
            dLink('../portal/index.html', 'My Portal', ''),
        ].join('\n');

        mobileTabs = [
            mTab('index.html', 'Hub', icons.hub, 'hub'),
            mTab('members.html', 'Members', icons.members, 'members'),
            mTab('invite.html', 'Invite', icons.invite, 'invite'),
            mTab('../portal/index.html', 'Portal', icons.portal, ''),
            `<button id="logoutBtnMobile" class="tab-inactive">${icons.signout}<span>Sign Out</span></button>`,
        ].join('\n');
    }

    // ── Create Nav ─────────────────────────────────────
    const nav = document.createElement('nav');
    nav.className = 'sticky top-0 z-40 glass border-b border-gray-200/60';
    nav.innerHTML = `
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-14 md:h-16">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
                        <span class="text-white font-bold text-sm">JM</span>
                    </div>
                    <span class="font-bold text-lg text-gray-900 hidden sm:inline">Justice McNeal</span>
                    ${badgeHtml}
                </div>
                <div class="flex items-center gap-2">
                    <a href="${settingsHref}" id="navProfileMobile" class="md:hidden w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border border-gray-200" title="Profile">
                        <span id="navInitialsMobile" class="text-xs font-bold text-brand-600"></span>
                        <img id="navAvatarMobile" class="w-full h-full object-cover hidden" alt="">
                    </a>
                    <div class="hidden md:flex items-center gap-1">
                        ${desktopLinks}
                        <div class="w-px h-6 bg-gray-200 mx-2"></div>
                        <a href="${settingsHref}" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition" title="Profile settings">
                            <div id="navAvatar" class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                <span id="navInitials" class="text-xs font-bold text-brand-600"></span>
                                <img id="navAvatarImg" class="w-full h-full object-cover hidden" alt="">
                            </div>
                            <span id="navName" class="text-sm font-medium text-gray-700 max-w-[100px] truncate"></span>
                        </a>
                        <button id="logoutBtn" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition">Sign Out</button>
                    </div>
                </div>
            </div>
        </div>`;

    // ── Create Footer ──────────────────────────────────
    const footer = document.createElement('footer');
    footer.className = 'hidden md:block border-t border-gray-200/60 mt-auto';
    footer.innerHTML = `
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="flex items-center justify-between text-sm text-gray-400">
                <p>&copy; ${new Date().getFullYear()} Justice McNeal LLC</p>
                <p>Family Contribution Portal</p>
            </div>
        </div>`;

    // ── Create Mobile Tab Bar ──────────────────────────
    const tabBar = document.createElement('div');
    tabBar.className = 'bottom-tab-bar md:hidden';
    tabBar.innerHTML = `<div class="max-w-lg mx-auto grid grid-cols-5 px-2">${mobileTabs}</div>`;

    // ── Insert into DOM ────────────────────────────────
    const main = document.querySelector('main');
    if (main) {
        main.before(nav);
        main.after(footer);
        footer.after(tabBar);
    }
})();

// ── Load profile data into nav (called from shared.js after auth) ──
function loadNavProfile() {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        supabaseClient
            .from('profiles')
            .select('first_name, last_name, profile_picture_url')
            .eq('id', session.user.id)
            .single()
            .then(({ data: profile }) => {
                if (!profile) return;
                const firstName = profile.first_name || '';
                const lastName = profile.last_name || '';
                const initials = ((firstName[0] || '') + (lastName[0] || '')).toUpperCase() || '?';
                const photoUrl = profile.profile_picture_url;

                // Desktop
                const nameEl = document.getElementById('navName');
                const initialsEl = document.getElementById('navInitials');
                const imgEl = document.getElementById('navAvatarImg');
                if (nameEl) nameEl.textContent = firstName;
                if (initialsEl) initialsEl.textContent = initials;

                // Mobile
                const mInitialsEl = document.getElementById('navInitialsMobile');
                const mImgEl = document.getElementById('navAvatarMobile');
                if (mInitialsEl) mInitialsEl.textContent = initials;

                if (photoUrl) {
                    const url = photoUrl + '?t=' + Date.now();
                    if (imgEl) { imgEl.src = url; imgEl.classList.remove('hidden'); }
                    if (initialsEl) initialsEl.classList.add('hidden');
                    if (mImgEl) { mImgEl.src = url; mImgEl.classList.remove('hidden'); }
                    if (mInitialsEl) mInitialsEl.classList.add('hidden');
                }
            });
    });
}
