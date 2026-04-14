// ─── Page Shell: Nav Builder ─────────────────────────────
// Builds the desktop sidebar, mobile header, footer, tab bar,
// drawer, and notification panel. Injects into placeholder elements.
// Desktop: sticky left sidebar.  Mobile: unchanged bottom-tab UX.
// ─────────────────────────────────────────────────────────

(function () {
    var PS      = window.PageShell;
    var SVG     = PS.SVG;
    var p       = PS.p;
    var mTab    = PS.mTab;
    var centerTab = PS.centerTab;
    var profileTab = PS.profileTab;
    var logoBlock  = PS.logoBlock;

    var body     = document.body;
    var pageType = body.dataset.pageType || 'portal';
    var active   = body.dataset.activePage || '';
    var isAdmin  = pageType === 'admin';

    // Store for other modules
    PS._active   = active;
    PS._isAdmin  = isAdmin;
    PS._pageType = pageType;

    // ─── Extra icon paths (admin pages) ─────────────────
    var XI = {
        calendar:   'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        shield:     'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
        banknote:   'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
        flag:       'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9',
        paint:      'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
        doc:        'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
        calculator: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
        swap:       'M8 7h12m0 0l-4-4m4 4l-4 4m0 5H4m0 0l4 4m-4-4l4-4',
    };

    // ─── Sidebar link builders ──────────────────────────
    function sLink(href, label, icon, pageKey, icon2) {
        var on = pageKey === active;
        var cls = on
            ? 'flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm font-medium bg-brand-50 text-brand-600 border-l-[3px] border-brand-500 transition-colors'
            : 'flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm text-gray-600 border-l-[3px] border-transparent hover:bg-gray-50 hover:text-gray-900 transition-colors';
        var ic = on ? 'text-brand-500' : 'text-gray-400';
        return '<a href="' + href + '" class="' + cls + '">' +
            '<svg class="w-5 h-5 flex-shrink-0 ' + ic + '" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            p(icon) + (icon2 ? p(icon2) : '') + '</svg><span>' + label + '</span></a>';
    }

    function aLink(href, label, icon, pageKey) {
        var on = pageKey === active;
        var cls = on
            ? 'nav-admin-link-active flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm font-medium text-white transition-colors'
            : 'nav-admin-link flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm transition-colors';
        var ic = on ? 'text-blue-300' : 'text-slate-400';
        return '<a href="' + href + '" class="' + cls + '">' +
            '<svg class="w-5 h-5 flex-shrink-0 ' + ic + '" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
            p(icon) + '</svg><span>' + label + '</span></a>';
    }

    function adminSection(label) {
        return '<div class="px-3 pt-3 pb-1"><p class="text-[10px] font-bold uppercase tracking-widest" style="color:rgba(148,163,184,0.6);">' + label + '</p></div>';
    }

    // ─── Build per page-type ─────────────────────────────
    var tabsInner, adminBadge = '';

    if (isAdmin) {
        adminBadge = '<span class="bg-brand-100 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full">Admin</span>';

        tabsInner =
            '<div class="max-w-sm mx-auto grid grid-cols-2 px-4 gap-2 relative">' +
                '<div class="swipe-hint" aria-hidden="true"></div>' +
                mTab('index.html', p(SVG.hub), 'Admin Hub', 'hub') +
                mTab('../portal/index.html', p(SVG.home), 'My Portal', '_') +
            '</div>';
    } else {
        tabsInner =
            '<div class="max-w-lg mx-auto grid grid-cols-5 px-2 relative">' +
                '<div class="swipe-hint" aria-hidden="true"></div>' +
                mTab('feed.html', p(SVG.feed), 'Feed', 'feed') +
                '<div class="dock-slot" data-dock-slot="2">' + mTab('events.html', p(SVG.bell), 'Events', 'events') + '</div>' +
                centerTab('index.html', p(SVG.home), 'Dashboard', 'dashboard') +
                '<div class="dock-slot" data-dock-slot="4">' + mTab('extra-deposit.html', p(SVG.deposit), 'Deposit', 'extra-deposit') + '</div>' +
                profileTab() +
            '</div>';
    }

    // ─── Desktop Sidebar ─────────────────────────────────
    var sideHTML = '';
    var logo = logoBlock();

    if (!isAdmin) {
        // Portal sidebar
        var morePages = ['investments','milestones','contribution','extra-deposit','history','family-tree','team','finances','settings'];
        var moreOpen = morePages.indexOf(active) !== -1;

        var moreLinks =
            sLink('investments.html', 'Investments', SVG.invest, 'investments') +
            sLink('milestones.html', 'Milestones', SVG.trophy, 'milestones') +
            sLink('contribution.html', 'Contribute', SVG.heart, 'contribution') +
            sLink('extra-deposit.html', 'Deposit', SVG.deposit, 'extra-deposit') +
            sLink('history.html', 'History', SVG.history, 'history') +
            sLink('family-tree.html', 'Family Tree', SVG.person, 'family-tree') +
            sLink('team.html', 'Team', SVG.team, 'team') +
            sLink('my-finances.html', 'My Finances', SVG.wallet, 'finances') +
            sLink('settings.html', 'Settings', SVG.gear, 'settings', SVG.gearDot);

        sideHTML =
        '<nav id="sideNav" class="hidden md:flex flex-col w-64 flex-shrink-0 bg-white border-r border-gray-200/80 h-screen sticky top-0 z-30">' +
            /* Logo */
            '<div class="flex justify-center px-4 pt-7 pb-2">' +
                '<a href="index.html" class="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md hover:shadow-lg transition-shadow select-none bg-gradient-to-br from-brand-500 to-brand-700 overflow-hidden" title="Dashboard" data-brand-logo>' +
                    '<span class="text-white font-bold text-lg" data-brand-fallback>JM</span>' +
                    '<img class="w-full h-full object-contain hidden" alt="Logo" data-brand-img>' +
                '</a>' +
            '</div>' +
            '<div class="text-center pb-5">' +
                '<p class="text-sm font-bold text-gray-800">Justice McNeal</p>' +
                '<p class="text-xs text-gray-400 mt-0.5">Family Portal</p>' +
            '</div>' +
            /* Links + More accordion */
            '<div class="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4 sidenav-scroll">' +
                sLink('index.html', 'Dashboard', SVG.home, 'dashboard') +
                sLink('feed.html', 'Feed', SVG.feed, 'feed') +
                sLink('quests.html', 'Quests', SVG.quest, 'quests') +
                sLink('events.html', 'Events', SVG.bell, 'events') +
                '<div class="pt-2">' +
                    '<button id="navMoreBtn" aria-expanded="' + (moreOpen ? 'true' : 'false') + '" class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors">' +
                        '<span class="flex items-center gap-2">More' +
                            (moreOpen ? '<span class="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block flex-shrink-0"></span>' : '') +
                        '</span>' +
                        '<svg id="navMoreChev" class="w-4 h-4 transition-transform' + (moreOpen ? ' rotate-180' : '') + '" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>' +
                    '</button>' +
                    '<div id="navMoreContent" class="mt-0.5 space-y-0.5 pl-1' + (moreOpen ? '' : ' hidden') + '">' +
                        moreLinks +
                    '</div>' +
                '</div>' +
                /* Admin View link — shown by auth/shared.js for admin users */
                '<div class="pt-4 hidden" id="sideNavAdminSection">' +
                    '<div class="border-t border-gray-100 mb-3"></div>' +
                    '<a href="../admin/index.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors">' +
                        '<svg class="w-5 h-5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(XI.shield) + '</svg>' +
                        '<span>Switch to Admin</span>' +
                    '</a>' +
                '</div>' +
            '</div>' +
            /* Profile section (portal) — starts hidden, profile-loader shows it */
            '<div id="navProfileLink" class="hidden border-t border-gray-100 px-3 py-3">' +
                '<span id="profileDropdownBtn" class="hidden"></span>' +
                '<div id="navProfileWrap">' +
                    '<div id="navProfileDrop" class="nav-profile-expand">' +
                        '<div class="pb-1 space-y-0.5">' +
                            '<a href="profile.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">' +
                                '<svg class="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.person) + '</svg>' +
                                '<span>My Profile</span>' +
                            '</a>' +
                            '<a href="settings.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">' +
                                '<svg class="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.gear) + p(SVG.gearDot) + '</svg>' +
                                '<span>Settings</span>' +
                            '</a>' +
                            '<div class="border-t border-gray-100 my-1"></div>' +
                            '<button id="logoutBtn" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors">' +
                                '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.logout) + '</svg>' +
                                '<span>Sign out</span>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<button id="navProfileBtn" aria-expanded="false" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">' +
                        '<div class="relative w-9 h-9 flex-shrink-0">' +
                            '<div class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden" style="box-shadow:0 0 0 2px #c7d2fe;">' +
                                '<span id="navProfileInitials" class="text-brand-600 text-xs font-bold"></span>' +
                                '<img id="navProfileImg" class="w-full h-full object-cover hidden" alt="">' +
                            '</div>' +
                            '<div id="navBadgeOverlay"></div>' +
                        '</div>' +
                        '<span id="navProfileName" class="flex-1 text-left text-sm font-semibold text-gray-800"></span>' +
                        '<svg id="navProfileChev" class="w-4 h-4 text-gray-400 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</nav>';

    } else {
        /* ─── Admin sidebar (dark slate theme) ─────────── */
        sideHTML =
        '<nav id="sideNav" class="hidden md:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 z-30" style="background:#0f172a;">' +
            '<div class="px-4 pt-6 pb-4">' +
                '<div class="flex items-center gap-3">' +
                    '<a href="index.html" class="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md select-none bg-gradient-to-br from-brand-500 to-brand-700 overflow-hidden" title="Admin Hub" data-brand-logo>' +
                        '<span class="text-white font-bold text-xs tracking-wide" data-brand-fallback>JM</span>' +
                        '<img class="w-full h-full object-contain hidden" alt="Logo" data-brand-img>' +
                    '</a>' +
                    '<div>' +
                        '<p class="text-white font-bold text-sm leading-tight">Justice McNeal</p>' +
                        '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mt-0.5" style="background:rgba(99,102,241,0.22);color:#a5b4fc;">Admin</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="mx-4 border-t mb-2" style="border-color:rgba(255,255,255,0.08);"></div>' +
            '<div class="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4 sidenav-scroll">' +
                aLink('index.html', 'Admin Hub', SVG.hub, 'hub') +
                adminSection('People') +
                aLink('members.html', 'Members', SVG.team, 'members') +
                aLink('invite.html', 'Invite', SVG.invite, 'invite') +
                aLink('family-approvals.html', 'Approvals', SVG.heart, 'family-approvals') +
                aLink('roles.html', 'Roles', XI.shield, 'roles') +
                adminSection('Finance') +
                aLink('deposits.html', 'Deposits', SVG.deposit, 'deposits') +
                aLink('transactions.html', 'Transactions', SVG.history, 'transactions') +
                aLink('payouts.html', 'Payouts', SVG.wallet, 'payouts') +
                aLink('profits.html', 'Profits', SVG.invest, 'profits') +
                aLink('expenses.html', 'Expenses', XI.banknote, 'expenses') +
                aLink('tax-prep.html', 'Tax Prep', XI.calculator, 'tax-prep') +
                adminSection('Content') +
                aLink('investments.html', 'Investments', SVG.invest, 'investments') +
                aLink('events.html', 'Events', XI.calendar, 'events') +
                aLink('quests.html', 'Quests', SVG.quest, 'quests') +
                aLink('notifications.html', 'Notifications', SVG.bell, 'notifications') +
                adminSection('Design') +
                aLink('brand.html', 'Brand', XI.paint, 'brand') +
                aLink('banners.html', 'Banners', XI.flag, 'banners') +
                aLink('documents.html', 'Documents', XI.doc, 'documents') +
                /* Switch to Portal */
                '<div class="pt-4">' +
                    '<div class="border-t mb-3" style="border-color:rgba(255,255,255,0.08);"></div>' +
                    '<a href="../portal/index.html" class="nav-admin-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
                        '<svg class="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(XI.swap) + '</svg>' +
                        '<span>Switch to Portal</span>' +
                    '</a>' +
                '</div>' +
            '</div>' +
            /* Profile section (admin) — starts hidden, profile-loader shows it */
            '<div id="navProfileSection" class="hidden px-3 pb-4" style="border-top:1px solid rgba(255,255,255,0.08);">' +
                '<div class="pt-3" id="navProfileWrap">' +
                    '<div id="navProfileDrop" class="nav-profile-expand">' +
                        '<div class="pb-1 space-y-0.5">' +
                            '<a href="../portal/profile.html" class="nav-admin-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
                                '<svg class="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.person) + '</svg>' +
                                '<span>My Profile</span>' +
                            '</a>' +
                            '<a href="../portal/settings.html" class="nav-admin-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
                                '<svg class="w-5 h-5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.gear) + p(SVG.gearDot) + '</svg>' +
                                '<span>Settings</span>' +
                            '</a>' +
                            '<div class="border-t my-1" style="border-color:rgba(255,255,255,0.08);"></div>' +
                            '<button id="logoutBtn" class="nav-admin-signout w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors">' +
                                '<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.logout) + '</svg>' +
                                '<span>Sign out</span>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<button id="navProfileBtn" aria-expanded="false" class="nav-admin-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors">' +
                        '<div class="relative w-9 h-9 flex-shrink-0">' +
                            '<div class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden" style="box-shadow:0 0 0 2px rgba(255,255,255,0.2);">' +
                                '<span id="navProfileInitials" class="text-brand-600 text-xs font-bold"></span>' +
                                '<img id="navProfileImg" class="w-full h-full object-cover hidden" alt="">' +
                            '</div>' +
                            '<div id="navBadgeOverlay"></div>' +
                        '</div>' +
                        '<span id="navProfileName" class="flex-1 text-left text-sm font-semibold text-slate-200"></span>' +
                        '<svg id="navProfileChev" class="w-4 h-4 text-slate-500 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</nav>';
    }

    // ─── Mobile Header (md:hidden) ───────────────────────
    var mobileHeaderHTML = '';

    if (active === 'feed' && !isAdmin) {
        /* Feed page: special mobile row with New Post + Logo + Notifications */
        mobileHeaderHTML =
        '<nav id="mobileHeader" class="sticky top-0 z-40 glass border-b border-gray-200/60 md:hidden">' +
            '<div class="max-w-5xl mx-auto px-4">' +
                '<div class="flex justify-between items-center h-14">' +
                    '<button id="newPostBtn" class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center hover:bg-brand-200 transition" title="New Post">' +
                        '<svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.plus) + '</svg>' +
                    '</button>' +
                    '<div class="flex items-center gap-2">' +
                        logo +
                        '<span class="font-bold text-lg text-gray-900">Justice McNeal</span>' +
                    '</div>' +
                    '<button id="notifBtn" class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition relative" title="Notifications">' +
                        '<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.heart) + '</svg>' +
                        '<span id="notifBadge" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">0</span>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</nav>';
    } else {
        /* Generic mobile header: logo + name + badge */
        mobileHeaderHTML =
        '<nav id="mobileHeader" class="sticky top-0 z-40 glass border-b border-gray-200/60 md:hidden">' +
            '<div class="max-w-5xl mx-auto px-4">' +
                '<div class="flex items-center h-14 gap-3">' +
                    logo +
                    '<span class="font-bold text-lg text-gray-900">Justice McNeal</span>' +
                    adminBadge +
                '</div>' +
            '</div>' +
        '</nav>';
    }

    // ─── Footer HTML ─────────────────────────────────────
    var footerHTML =
    '<footer class="hidden md:block border-t border-gray-200/60 mt-auto">' +
        '<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">' +
            '<div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">' +
                '<p>&copy; 2026 Justice McNeal LLC</p>' +
                '<p>Family Contribution Portal</p>' +
            '</div>' +
        '</div>' +
    '</footer>';

    // ─── Mobile Tab Bar HTML ─────────────────────────────
    var tabsHTML =
    '<div class="bottom-tab-bar md:hidden" id="bottomTabBar">' +
        tabsInner +
    '</div>';

    // ─── Nav Drawer (swipe-up page grid) — portal AND admin ──
    var drawerHTML = '';
    if (isAdmin) {
        var adminDrawerPages = [
            { href: 'index.html',           page: 'hub',    icon: SVG.hub,    label: 'Admin Hub' },
            { href: 'invite.html',          page: 'invite', icon: SVG.invite, label: 'Invite Member' },
            { href: '../portal/index.html', page: '_',      icon: SVG.home,   label: 'My Portal' },
        ];
        var adminGridItems = '';
        for (var ai = 0; ai < adminDrawerPages.length; ai++) {
            var ap = adminDrawerPages[ai];
            var aActiveCls = ap.page === active ? ' active-page' : '';
            var aIconSvg = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(ap.icon) + '</svg>';
            adminGridItems += '<a href="' + ap.href + '" class="nav-drawer-item' + aActiveCls + '">' +
                '<div class="drawer-icon">' + aIconSvg + '</div>' +
                '<span>' + ap.label + '</span>' +
            '</a>';
        }
        drawerHTML =
            '<div class="nav-drawer-backdrop md:hidden" id="navDrawerBackdrop"></div>' +
            '<div class="nav-drawer md:hidden" id="navDrawer">' +
                '<div class="nav-drawer-handle" id="navDrawerHandle"></div>' +
                '<div class="px-4 pb-1 flex items-center justify-between">' +
                    '<span class="text-sm font-bold text-gray-900">Admin Navigation</span>' +
                '</div>' +
                '<div class="nav-drawer-grid" id="navDrawerGrid">' + adminGridItems + '</div>' +
            '</div>';
    } else {
        var drawerPages = [
            { href: 'feed.html',        page: 'feed',        icon: SVG.feed,    label: 'Feed' },
            { href: 'index.html',       page: 'dashboard',   icon: SVG.home,    label: 'Dashboard' },
            { href: 'events.html',      page: 'events',      icon: SVG.bell,    label: 'Events' },
            { href: 'investments.html',  page: 'investments', icon: SVG.invest,  label: 'Invest' },
            { href: 'history.html',     page: 'history',     icon: SVG.history, label: 'History' },
            { href: 'quests.html',      page: 'quests',      icon: SVG.quest,   label: 'Quests' },
            { href: 'milestones.html',  page: 'milestones',  icon: SVG.trophy,  label: 'Milestones' },
            { href: 'settings.html',    page: 'settings',    icon: SVG.gear,    label: 'Settings', icon2: SVG.gearDot },
            { href: 'contribution.html',  page: 'contribution',  icon: SVG.plus,    label: 'Contribute' },
            { href: 'extra-deposit.html', page: 'extra-deposit', icon: SVG.deposit, label: 'Deposit' },
            { href: 'family-tree.html',   page: 'family-tree',   icon: SVG.person,  label: 'Family Tree' },
            { href: 'team.html',        page: 'team',        icon: SVG.team,    label: 'Team' },
            { href: 'profile.html',     page: 'profile',     icon: SVG.person,  label: 'Profile' },
            { href: 'my-finances.html',page: 'finances',    icon: SVG.wallet,  label: 'My Finances' },
        ];

        var gridItems = '';
        for (var di = 0; di < drawerPages.length; di++) {
            var dp = drawerPages[di];
            var activeCls = dp.page === active ? ' active-page' : '';
            var iconSvg = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(dp.icon) + (dp.icon2 ? p(dp.icon2) : '') + '</svg>';
            gridItems += '<a href="' + dp.href + '" class="nav-drawer-item' + activeCls + '" data-drawer-page="' + dp.page + '" data-drawer-href="' + dp.href + '" data-drawer-label="' + dp.label + '" data-drawer-icon=\'' + dp.icon + '\'>' +
                '<div class="drawer-icon">' + iconSvg + '</div>' +
                '<span>' + dp.label + '</span>' +
            '</a>';
        }

        drawerHTML =
            '<div class="nav-drawer-backdrop md:hidden" id="navDrawerBackdrop"></div>' +
            '<div class="nav-drawer md:hidden" id="navDrawer">' +
                '<div class="nav-drawer-handle" id="navDrawerHandle"></div>' +
                '<div class="px-4 pb-1 flex items-center justify-between">' +
                    '<span class="text-sm font-bold text-gray-900">All Pages</span>' +
                    '<button class="dock-customize-btn" id="dockCustomizeBtn">' +
                        '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>' +
                        '<span>Customize</span>' +
                    '</button>' +
                '</div>' +
                '<div class="dock-preview hidden" id="dockPreview"></div>' +
                '<div class="nav-drawer-grid-wrap">' +
                    '<div class="nav-drawer-grid" id="navDrawerGrid">' + gridItems + '</div>' +
                '</div>' +
            '</div>';
    }

    // ─── Inject into placeholders ────────────────────────
    var np = document.getElementById('nav-placeholder');
    var fp = document.getElementById('footer-placeholder');
    var tp = document.getElementById('tabs-placeholder');

    if (np) np.outerHTML = sideHTML + mobileHeaderHTML;
    if (fp) fp.outerHTML = footerHTML;
    if (tp) tp.outerHTML = tabsHTML;

    // Inject drawer into body
    if (drawerHTML) {
        var drawerContainer = document.createElement('div');
        drawerContainer.innerHTML = drawerHTML;
        while (drawerContainer.firstChild) {
            document.body.appendChild(drawerContainer.firstChild);
        }
    }

    // ─── Notifications Panel (slide-down sheet) ─────────
    if (!isAdmin) {
        var notifPanel =
            '<div class="notif-backdrop" id="notifBackdrop"></div>' +
            '<div class="notif-panel" id="notifPanel">' +
                '<div class="notif-panel-header">' +
                    '<div class="flex items-center gap-2">' +
                        '<button id="notifCloseBtn" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition -ml-1">' +
                            '<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>' +
                        '</button>' +
                        '<h3 class="text-base font-bold text-gray-900">Notifications</h3>' +
                    '</div>' +
                    '<button id="notifMarkAllBtn" class="text-xs font-semibold text-brand-600 hover:text-brand-700 transition">Mark all read</button>' +
                '</div>' +
                '<div class="notif-panel-body" id="notifPanelBody">' +
                    '<div class="notif-empty" id="notifEmpty">' +
                        '<svg class="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="' + SVG.bell + '"></path></svg>' +
                        '<p class="text-sm text-gray-400">No notifications yet</p>' +
                    '</div>' +
                    '<div id="notifList" class="notif-list"></div>' +
                '</div>' +
            '</div>';
        var notifContainer = document.createElement('div');
        notifContainer.innerHTML = notifPanel;
        while (notifContainer.firstChild) {
            document.body.appendChild(notifContainer.firstChild);
        }
    }

    // ─── DOM restructure: sidebar + content wrapper ──────
    // Wraps all page content beside the sidebar on desktop (md+).
    // Mobile layout stays unchanged (flex-col, sidebar hidden).
    var sideNav = document.getElementById('sideNav');
    if (sideNav) {
        body.classList.add('md:flex-row');

        var contentWrap = document.createElement('div');
        contentWrap.id = 'pageContent';
        contentWrap.className = 'flex-1 flex flex-col min-w-0';

        // IDs of elements that must stay as direct body children (fixed/overlay)
        var skipIds = ['sideNav','bottomTabBar','navDrawerBackdrop','navDrawer','notifBackdrop','notifPanel'];
        var skip = {};
        for (var si = 0; si < skipIds.length; si++) skip[skipIds[si]] = true;

        // Collect all current body children
        var nodes = [];
        var c = body.firstChild;
        while (c) { nodes.push(c); c = c.nextSibling; }

        // Move non-skip nodes into the wrapper
        for (var ni = 0; ni < nodes.length; ni++) {
            if (nodes[ni].nodeType === 1 && skip[nodes[ni].id]) continue;
            contentWrap.appendChild(nodes[ni]);
        }

        // Insert: sideNav first, then content wrapper
        body.insertBefore(contentWrap, body.firstChild);
        body.insertBefore(sideNav, contentWrap);

        // ── Restore sidebar scroll position ──────────────
        var scrollEl = sideNav.querySelector('.sidenav-scroll');
        if (scrollEl) {
            var scrollKey = 'sideNavScroll';
            var saved = sessionStorage.getItem(scrollKey);
            if (saved) {
                requestAnimationFrame(function() {
                    scrollEl.scrollTop = parseInt(saved, 10);
                });
            }

            // Save position before navigating away
            var allLinks = sideNav.querySelectorAll('a[href]');
            for (var li = 0; li < allLinks.length; li++) {
                allLinks[li].addEventListener('click', function() {
                    sessionStorage.setItem(scrollKey, scrollEl.scrollTop);
                });
            }
        }
    }
})();
