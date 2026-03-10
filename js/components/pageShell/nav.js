// ─── Page Shell: Nav Builder ─────────────────────────────
// Builds the nav HTML, footer, tab bar, and notification panel.
// Injects into placeholder elements.
// ─────────────────────────────────────────────────────────

(function () {
    var PS      = window.PageShell;
    var SVG     = PS.SVG;
    var p       = PS.p;
    var dLink   = PS.dLink;
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

    // ─── Context-Aware Mobile Header Actions ───────────
    var contextTitle = '';
    var contextActions = '';
    if (!isAdmin) {
        switch (active) {
            case 'feed':
                contextTitle = 'Family Feed';
                contextActions =
                    '<button id="newPostBtn" class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center hover:bg-brand-200 transition" title="New Post">' +
                        '<svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.plus) + '</svg>' +
                    '</button>' +
                    '<button id="notifBtn" class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition relative" title="Notifications">' +
                        '<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.bell) + '</svg>' +
                        '<span id="notifBadge" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">0</span>' +
                    '</button>';
                break;
            case 'history':
                contextTitle = 'History'; break;
            case 'events':
                contextTitle = 'Events'; break;
            case 'quests':
                contextTitle = 'Quests'; break;
            case 'milestones':
                contextTitle = 'Milestones'; break;
            case 'investments':
                contextTitle = 'Portfolio'; break;
            case 'settings':
                contextTitle = 'Settings'; break;
            case 'profile':
                contextTitle = 'Profile'; break;
            default:
                contextTitle = '';
        }
    }

    // ─── Build per page-type ─────────────────────────────
    var desktopLinks, tabsInner, adminBadge = '';

    if (isAdmin) {
        adminBadge = '<span class="bg-brand-100 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full">Admin</span>';

        desktopLinks =
            dLink('index.html', 'Admin Hub', 'hub') +
            dLink('invite.html', 'Invite', 'invite') +
            dLink('../portal/index.html', 'My Portal', '_');

        tabsInner =
            '<div class="max-w-sm mx-auto grid grid-cols-2 px-4 gap-2 relative">' +
                '<div class="swipe-hint" aria-hidden="true">' +
                    '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"></path></svg>' +
                    '<span class="swipe-hint-label">More</span>' +
                '</div>' +
                mTab('index.html', p(SVG.hub), 'Admin Hub', 'hub') +
                mTab('../portal/index.html', p(SVG.home), 'My Portal', '_') +
            '</div>';

    } else {
        desktopLinks =
            dLink('feed.html', 'Feed', 'feed') +
            dLink('index.html', 'Dashboard', 'dashboard') +
            dLink('family-tree.html', 'Family Tree', 'family-tree') +
            dLink('events.html', 'Events', 'events') +
            dLink('investments.html', 'Investments', 'investments') +
            '<div class="relative" id="desktopMoreWrap">' +
                '<button id="desktopMoreBtn" class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition flex items-center gap-1">' +
                    'More' +
                    '<svg class="w-3.5 h-3.5 transition-transform" id="desktopMoreChev" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>' +
                '</button>' +
                '<div class="desktop-more-dropdown" id="desktopMoreDD">' +
                    '<a href="history.html" class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition ' + ('history' === active ? 'text-brand-600 bg-brand-50 font-medium' : 'text-gray-700 hover:bg-gray-50') + '">' +
                        '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.history) + '</svg>History</a>' +
                    '<a href="quests.html" class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition ' + ('quests' === active ? 'text-brand-600 bg-brand-50 font-medium' : 'text-gray-700 hover:bg-gray-50') + '">' +
                        '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.quest) + '</svg>Quests</a>' +
                    '<a href="milestones.html" class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition ' + ('milestones' === active ? 'text-brand-600 bg-brand-50 font-medium' : 'text-gray-700 hover:bg-gray-50') + '">' +
                        '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.trophy) + '</svg>Milestones</a>' +
                    '<a href="settings.html" class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition ' + ('settings' === active ? 'text-brand-600 bg-brand-50 font-medium' : 'text-gray-700 hover:bg-gray-50') + '">' +
                        '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.gear) + p(SVG.gearDot) + '</svg>Settings</a>' +
                '</div>' +
            '</div>';

        tabsInner =
            '<div class="max-w-lg mx-auto grid grid-cols-5 px-2 relative">' +
                '<div class="swipe-hint" aria-hidden="true">' +
                    '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"></path></svg>' +
                    '<span class="swipe-hint-label">More</span>' +
                '</div>' +
                mTab('feed.html', p(SVG.feed), 'Feed', 'feed') +
                '<div class="dock-slot" data-dock-slot="2">' + mTab('events.html', p(SVG.bell), 'Events', 'events') + '</div>' +
                centerTab('index.html', p(SVG.home), 'Dashboard', 'dashboard') +
                '<div class="dock-slot" data-dock-slot="4">' + mTab('extra-deposit.html', p(SVG.deposit), 'Deposit', 'extra-deposit') + '</div>' +
                profileTab() +
            '</div>';
    }

    // ─── Build right-side of desktop nav ───────────────
    var desktopRight = '';

    if (isAdmin) {
        desktopRight =
            '<div class="w-px h-6 bg-gray-200 mx-2" id="navDivider"></div>' +
            '<div id="navProfileSection" class="flex items-center gap-2 mr-1 hidden">' +
                '<div class="relative w-7 h-7 flex-shrink-0">' +
                    '<div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">' +
                        '<span id="navProfileInitials" class="text-brand-600 text-xs font-bold"></span>' +
                        '<img id="navProfileImg" class="w-full h-full object-cover hidden" alt="">' +
                    '</div>' +
                    '<div id="navBadgeOverlay"></div>' +
                '</div>' +
                '<span id="navProfileName" class="text-sm font-medium text-gray-700 max-w-[100px] truncate"></span>' +
            '</div>' +
            '<button id="logoutBtn" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition">Sign Out</button>';
    } else {
        desktopRight =
            '<div class="w-px h-6 bg-gray-200 mx-2" id="navDivider"></div>' +
            '<div class="relative flex items-center" id="profileDropdownWrap">' +
                '<a href="profile.html" id="navProfileLink" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition hidden">' +
                    '<div class="relative w-7 h-7 flex-shrink-0">' +
                        '<div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">' +
                            '<span id="navProfileInitials" class="text-brand-600 text-xs font-bold"></span>' +
                            '<img id="navProfileImg" class="w-full h-full object-cover hidden" alt="">' +
                        '</div>' +
                        '<div id="navBadgeOverlay"></div>' +
                    '</div>' +
                    '<span id="navProfileName" class="text-sm font-medium text-gray-700 max-w-[100px] truncate"></span>' +
                '</a>' +
                '<button id="profileDropdownBtn" class="p-1.5 rounded-lg hover:bg-gray-100 transition hidden" aria-haspopup="true" aria-expanded="false">' +
                    '<svg class="w-4 h-4 text-gray-400 transition-transform" id="profileChevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>' +
                '</button>' +
                '<div id="profileDropdown" class="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-gray-200/80 shadow-lg shadow-gray-200/50 py-1.5 hidden z-50 opacity-0 translate-y-1" style="transition: opacity 0.15s ease, transform 0.15s ease;">' +
                    '<a href="settings.html" class="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition rounded-lg mx-1 ' + ('settings' === active ? 'text-brand-600 bg-brand-50/60 font-medium' : '') + '">' +
                        '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                            p(SVG.gear) + p(SVG.gearDot) +
                        '</svg>' +
                        'Settings' +
                    '</a>' +
                    '<div class="border-t border-gray-100 my-1"></div>' +
                    '<button id="logoutBtn" class="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition w-full text-left rounded-lg mx-1" style="width:calc(100% - 0.5rem);">' +
                        '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                            p(SVG.logout) +
                        '</svg>' +
                        'Sign Out' +
                    '</button>' +
                '</div>' +
            '</div>';
    }

    // ─── Nav HTML ────────────────────────────────────────
    var logo = logoBlock();

    var feedMobileRow = '';
    if (active === 'feed' && !isAdmin) {
        feedMobileRow =
        '<div class="flex justify-between items-center h-14 md:hidden">' +
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
        '</div>';
    }

    var navHTML =
    '<nav class="sticky top-0 z-40 glass border-b border-gray-200/60">' +
        '<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">' +
            feedMobileRow +
            '<div class="' + (feedMobileRow ? 'hidden md:flex' : 'flex') + ' justify-between items-center ' + (feedMobileRow ? 'md:h-16' : 'h-14 md:h-16') + '">' +
                '<div class="flex items-center gap-3">' +
                    logo +
                    '<span class="font-bold text-lg text-gray-900">Justice McNeal</span>' +
                    adminBadge +
                '</div>' +
                '<div class="hidden md:flex items-center gap-1">' +
                    desktopLinks +
                    desktopRight +
                '</div>' +
            '</div>' +
        '</div>' +
    '</nav>';

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
                '<div class="nav-drawer-grid" id="navDrawerGrid">' + gridItems + '</div>' +
            '</div>';
    }

    // ─── Inject into placeholders ────────────────────────
    var np = document.getElementById('nav-placeholder');
    var fp = document.getElementById('footer-placeholder');
    var tp = document.getElementById('tabs-placeholder');

    if (np) np.outerHTML = navHTML;
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
})();
