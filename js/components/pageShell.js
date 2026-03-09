// ─── Page Shell ─────────────────────────────────────────
// Renders nav, footer and mobile tab bar for every portal & admin page.
//
// Usage — add data attributes to <body>:
//   data-page-type="portal"  or  data-page-type="admin"
//   data-active-page="dashboard|investments|history|settings|hub|invite"
//
// Then drop three placeholders into the HTML:
//   <div id="nav-placeholder"></div>
//   <div id="footer-placeholder"></div>
//   <div id="tabs-placeholder"></div>
//
// This script runs synchronously (IIFE) so the elements are ready
// before auth/shared.js wires up logout handlers on DOMContentLoaded.
// ─────────────────────────────────────────────────────────

(function () {
    const body     = document.body;
    const pageType = body.dataset.pageType || 'portal';
    const active   = body.dataset.activePage || '';
    const isAdmin  = pageType === 'admin';

    // ─── SVG icon paths ──────────────────────────────────
    const SVG = {
        home:    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        feed:    'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2',
        invest:  'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
        history: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        gear:    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.11 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        gearDot: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
        logout:  'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
        hub:     'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
        invite:  'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
        person:  'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        trophy:  'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
        quest:   'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
        plus:    'M12 4v16m8-8H4',
        bell:    'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
        heart:   'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    };

    // ─── Helpers ─────────────────────────────────────────
    function p(d) {
        return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="' + d + '"></path>';
    }

    function dLink(href, label, page) {
        if (page === active) {
            return '<a href="' + href + '" class="px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg">' + label + '</a>';
        }
        return '<a href="' + href + '" class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">' + label + '</a>';
    }

    function mTab(href, svgInner, label, page, extra) {
        var cls = page === active ? 'tab-active' : 'tab-inactive';
        return '<a href="' + href + '" class="' + cls + (extra || '') + '">' +
            '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgInner + '</svg>' +
            '<span>' + label + '</span></a>';
    }

    // Elevated center tab (Instagram-style)
    function centerTab(href, svgInner, label, page) {
        var cls = page === active ? 'tab-center tab-center-active' : 'tab-center';
        return '<a href="' + href + '" class="' + cls + '">' +
            '<div class="tab-center-icon">' +
                '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgInner + '</svg>' +
            '</div>' +
            '<span>' + label + '</span></a>';
    }

    // Profile avatar tab (rightmost)
    function profileTab() {
        var cls = 'profile' === active ? 'tab-active' : 'tab-inactive';
        return '<a href="profile.html" class="' + cls + '" id="profileTab">' +
            '<div class="relative w-7 h-7">' +
                '<div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border-2 ' + ('profile' === active ? 'border-brand-500' : 'border-gray-200') + '">' +
                    '<span id="tabProfileInitials" class="text-brand-600 text-[10px] font-bold"></span>' +
                    '<img id="tabProfileImg" class="w-full h-full object-cover hidden" alt="">' +
                '</div>' +

            '</div>' +
            '<span>Profile</span></a>';
    }

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
                    '<a href="notifications.html" class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition relative" title="Notifications">' +
                        '<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.bell) + '</svg>' +
                        '<span id="notifBadge" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">0</span>' +
                    '</a>';
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
            '<div class="max-w-lg mx-auto grid grid-cols-3 px-2">' +
                mTab('index.html', p(SVG.hub), 'Hub', 'hub') +
                mTab('invite.html', p(SVG.invite), 'Invite', 'invite') +
                mTab('../portal/index.html', p(SVG.person), 'Portal', '_') +
            '</div>';

    } else {
        // Primary desktop links (always visible)
        desktopLinks =
            dLink('feed.html', 'Feed', 'feed') +
            dLink('index.html', 'Dashboard', 'dashboard') +
            dLink('events.html', 'Events', 'events') +
            dLink('investments.html', 'Investments', 'investments') +
            // "More" dropdown for secondary pages
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
                '<div class="swipe-hint"></div>' +
                mTab('feed.html', p(SVG.feed), 'Feed', 'feed') +
                '<div class="dock-slot" data-dock-slot="2">' + mTab('events.html', p(SVG.bell), 'Events', 'events') + '</div>' +
                centerTab('index.html', p(SVG.home), 'Dashboard', 'dashboard') +
                '<div class="dock-slot" data-dock-slot="4">' + mTab('investments.html', p(SVG.invest), 'Invest', 'investments') + '</div>' +
                profileTab() +
            '</div>';
    }

    // ─── Build right-side of desktop nav ───────────────
    var desktopRight = '';

    if (isAdmin) {
        // Admin: simple profile + sign out (no dropdown needed — only 3 links)
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
        // Portal: profile link + dropdown with Settings + Sign Out
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
    var logoBlock =
        '<div class="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center overflow-hidden" data-brand-logo>' +
            '<span class="text-white font-bold text-sm" data-brand-fallback>JM</span>' +
            '<img class="w-full h-full object-contain hidden" alt="Logo" data-brand-img>' +
        '</div>';

    // Feed page: special mobile header — [+ New Post] [Logo] [❤ Notifs]
    var feedMobileRow = '';
    if (active === 'feed' && !isAdmin) {
        feedMobileRow =
        '<div class="flex justify-between items-center h-14 md:hidden">' +
            '<button id="newPostBtn" class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center hover:bg-brand-200 transition" title="New Post">' +
                '<svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.plus) + '</svg>' +
            '</button>' +
            '<div class="flex items-center gap-2">' +
                logoBlock +
                '<span class="font-bold text-lg text-gray-900">Justice McNeal</span>' +
            '</div>' +
            '<a href="notifications.html" class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition relative" title="Notifications">' +
                '<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + p(SVG.heart) + '</svg>' +
                '<span id="notifBadge" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">0</span>' +
            '</a>' +
        '</div>';
    }

    var navHTML =
    '<nav class="sticky top-0 z-40 glass border-b border-gray-200/60">' +
        '<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">' +
            feedMobileRow +
            '<div class="' + (feedMobileRow ? 'hidden md:flex' : 'flex') + ' justify-between items-center ' + (feedMobileRow ? 'md:h-16' : 'h-14 md:h-16') + '">' +
                '<div class="flex items-center gap-3">' +
                    logoBlock +
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

    // ─── Nav Drawer (swipe-up page grid) — portal only ──
    var drawerHTML = '';
    if (!isAdmin) {
        // All portal pages for the drawer grid
        var drawerPages = [
            { href: 'feed.html',        page: 'feed',        icon: SVG.feed,    label: 'Feed' },
            { href: 'index.html',       page: 'dashboard',   icon: SVG.home,    label: 'Dashboard' },
            { href: 'events.html',      page: 'events',      icon: SVG.bell,    label: 'Events' },
            { href: 'investments.html',  page: 'investments', icon: SVG.invest,  label: 'Invest' },
            { href: 'history.html',     page: 'history',     icon: SVG.history, label: 'History' },
            { href: 'quests.html',      page: 'quests',      icon: SVG.quest,   label: 'Quests' },
            { href: 'milestones.html',  page: 'milestones',  icon: SVG.trophy,  label: 'Milestones' },
            { href: 'settings.html',    page: 'settings',    icon: SVG.gear,    label: 'Settings', icon2: SVG.gearDot },
            { href: 'contribution.html',page: 'contribution',icon: SVG.plus,    label: 'Contribute' },
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
})();


// ─── Desktop More Dropdown Logic ────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    var moreBtn = document.getElementById('desktopMoreBtn');
    var moreDD  = document.getElementById('desktopMoreDD');
    var moreChev = document.getElementById('desktopMoreChev');
    if (!moreBtn || !moreDD) return;

    moreBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var isOpen = moreDD.classList.contains('open');
        moreDD.classList.toggle('open', !isOpen);
        if (moreChev) moreChev.style.transform = isOpen ? '' : 'rotate(180deg)';
    });
    document.addEventListener('click', function(e) {
        if (!document.getElementById('desktopMoreWrap')?.contains(e.target)) {
            moreDD.classList.remove('open');
            if (moreChev) moreChev.style.transform = '';
        }
    });
});


// ─── Nav Drawer: Swipe, Open/Close, Dock Customization ─
(function() {
    var tabBar   = document.getElementById('bottomTabBar');
    var drawer   = document.getElementById('navDrawer');
    var backdrop = document.getElementById('navDrawerBackdrop');
    if (!tabBar || !drawer || !backdrop) return;

    var isOpen = false;
    var startY = 0, currentY = 0, dragging = false;
    var savedScrollY = 0; // for iOS scroll lock
    var editMode = false; // dock customize mode

    // ─── Open / Close helpers ───────────────────────
    function openDrawer() {
        isOpen = true;
        drawer.classList.add('open');
        backdrop.classList.add('open');
        // iOS-robust scroll lock: freeze body in place
        savedScrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = '-' + savedScrollY + 'px';
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
        isOpen = false;
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, savedScrollY);
        // Exit dock edit mode if it was open
        if (editMode) doExitEditMode();
    }

    // ─── Swipe-up on tab bar to open ────────────────────
    tabBar.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
        dragging = false;
    }, { passive: true });

    tabBar.addEventListener('touchmove', function(e) {
        e.preventDefault(); // always block scroll on tab bar
        var dy = startY - e.touches[0].clientY;
        if (dy > 30 && !isOpen) {
            dragging = true;
            openDrawer();
        }
    }, { passive: false });

    // ─── Swipe-down on drawer to close ──────────────────
    var drawerStartY = 0;
    drawer.addEventListener('touchstart', function(e) {
        drawerStartY = e.touches[0].clientY;
        currentY = 0;
        drawer.classList.add('dragging');
    }, { passive: true });

    drawer.addEventListener('touchmove', function(e) {
        e.preventDefault(); // prevent body scroll bleed on iOS
        currentY = e.touches[0].clientY - drawerStartY;
        if (currentY > 0) {
            drawer.style.transform = 'translateY(' + currentY + 'px)';
        }
    }, { passive: false });

    drawer.addEventListener('touchend', function() {
        drawer.classList.remove('dragging');
        drawer.style.transform = '';
        if (currentY > 80) {
            closeDrawer();
        }
        currentY = 0;
    });

    // Backdrop close
    backdrop.addEventListener('click', closeDrawer);

    // ─── Dock Customization (Edit Mode) ─────────────────
    var drawerItems = document.querySelectorAll('.nav-drawer-item');
    var dockSlots = document.querySelectorAll('.dock-slot');
    var customizeBtn = document.getElementById('dockCustomizeBtn');
    var dockPreview = document.getElementById('dockPreview');

    // Build page catalog from drawer DOM
    var pageCatalog = {};
    drawerItems.forEach(function(item) {
        pageCatalog[item.dataset.drawerPage] = {
            page: item.dataset.drawerPage,
            href: item.dataset.drawerHref,
            label: item.dataset.drawerLabel,
            icon: item.dataset.drawerIcon
        };
    });

    // Slot 1=Feed, 3=Contribute, 5=Profile are permanent
    var LOCKED_DOCK = { '1': 'feed', '3': 'dashboard', '5': 'profile' };
    var CUSTOM_SLOTS = ['2', '4'];
    var DEFAULT_CUSTOM = { '2': 'events', '4': 'investments' };

    function getSavedDock() {
        try { var s = localStorage.getItem('jm_dock_config'); return s ? JSON.parse(s) : null; }
        catch(e) { return null; }
    }

    function saveDockConfig(config) {
        localStorage.setItem('jm_dock_config', JSON.stringify(config));
        if (typeof supabaseClient !== 'undefined') {
            supabaseClient.auth.getSession().then(function(res) {
                if (res.data?.session?.user?.id) {
                    supabaseClient.from('profiles').update({ dock_config: config })
                        .eq('id', res.data.session.user.id);
                }
            });
        }
    }

    function getCurrentDockConfig() {
        var saved = getSavedDock();
        if (saved) return saved;
        var config = {};
        for (var s in DEFAULT_CUSTOM) {
            var pg = pageCatalog[DEFAULT_CUSTOM[s]];
            if (pg) config[s] = { page: pg.page, href: pg.href, label: pg.label, icon: pg.icon };
        }
        return config;
    }

    function updateDockSlot(slotNum, info) {
        var slot = document.querySelector('[data-dock-slot="' + slotNum + '"]');
        if (!slot) return;
        if (!info) {
            slot.innerHTML = '';
            slot.classList.add('dock-slot-empty');
            return;
        }
        slot.classList.remove('dock-slot-empty');
        var act = document.body.dataset.activePage || '';
        var cls = info.page === act ? 'tab-active' : 'tab-inactive';
        slot.innerHTML =
            '<a href="' + info.href + '" class="' + cls + '">' +
                '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="' + info.icon + '"></path>' +
                '</svg>' +
                '<span>' + info.label + '</span></a>';
    }

    // Apply dock on load
    function applyDockConfig() {
        var config = getCurrentDockConfig();
        CUSTOM_SLOTS.forEach(function(s) { updateDockSlot(s, config[s] || null); });
    }
    applyDockConfig();

    // ─── iOS link preview block + tap handler ───────────
    drawerItems.forEach(function(item) {
        item.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        var tapX = 0, tapY = 0, moved = false;
        item.addEventListener('touchstart', function(e) {
            e.preventDefault();
            tapX = e.touches[0].clientX;
            tapY = e.touches[0].clientY;
            moved = false;
        }, { passive: false });
        item.addEventListener('touchmove', function(e) {
            if (Math.abs(e.touches[0].clientX - tapX) > 10 || Math.abs(e.touches[0].clientY - tapY) > 10) moved = true;
        }, { passive: true });
        item.addEventListener('touchend', function() {
            if (moved) return;
            if (editMode) {
                handleEditTap(item);
            } else {
                var href = item.getAttribute('href') || item.dataset.drawerHref;
                if (href) window.location.href = href;
            }
        });
    });

    // ─── Edit Mode Functions ────────────────────────────
    function buildDockPreview() {
        var config = getCurrentDockConfig();
        var html = '<div class="dock-preview-label">Your Dock</div><div class="dock-preview-slots">';
        for (var i = 1; i <= 5; i++) {
            var s = String(i);
            var isLocked = !!LOCKED_DOCK[s];
            var info = isLocked ? pageCatalog[LOCKED_DOCK[s]] : (config[s] || null);
            var isCenter = s === '3';
            var cls = 'dock-preview-slot' + (isLocked ? ' locked' : '') + (isCenter ? ' center' : '') + (!info && !isLocked ? ' empty' : '');
            html += '<div class="' + cls + '" data-preview-slot="' + s + '">';
            if (info) {
                html += '<div class="dock-preview-icon' + (isCenter ? ' center-icon' : '') + '"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="' + info.icon + '"></path></svg></div>';
                html += '<span>' + info.label + '</span>';
                if (!isLocked) html += '<button class="dock-preview-remove" data-remove-slot="' + s + '">&times;</button>';
            } else {
                html += '<div class="dock-preview-icon empty-icon"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></div>';
                html += '<span>Empty</span>';
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    function getDockedPages() {
        var config = getCurrentDockConfig();
        var d = {};
        for (var s in LOCKED_DOCK) d[LOCKED_DOCK[s]] = true;
        CUSTOM_SLOTS.forEach(function(s) { if (config[s]) d[config[s].page] = true; });
        return d;
    }

    function wireRemoveButtons() {
        if (!dockPreview) return;
        dockPreview.querySelectorAll('.dock-preview-remove').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                removeFromDock(this.dataset.removeSlot);
            });
        });
    }

    function refreshEditUI() {
        if (!dockPreview) return;
        dockPreview.innerHTML = buildDockPreview();
        var docked = getDockedPages();
        drawerItems.forEach(function(it) {
            it.classList.toggle('docked', !!docked[it.dataset.drawerPage]);
        });
        wireRemoveButtons();
    }

    function doExitEditMode() {
        editMode = false;
        drawer.classList.remove('dock-edit-active');
        if (customizeBtn) {
            customizeBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Customize</span>';
            customizeBtn.classList.remove('done');
        }
        if (dockPreview) dockPreview.classList.add('hidden');
        drawerItems.forEach(function(it) { it.classList.remove('docked'); });
        saveDockConfig(getCurrentDockConfig());
        applyDockConfig();
    }

    function enterEditMode() {
        editMode = true;
        drawer.classList.add('dock-edit-active');
        if (customizeBtn) {
            customizeBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Done</span>';
            customizeBtn.classList.add('done');
        }
        if (dockPreview) dockPreview.classList.remove('hidden');
        refreshEditUI();
        if (navigator.vibrate) navigator.vibrate(10);
    }

    if (customizeBtn) {
        customizeBtn.addEventListener('click', function() {
            if (editMode) doExitEditMode(); else enterEditMode();
        });
    }

    function handleEditTap(item) {
        var pageKey = item.dataset.drawerPage;

        // Locked pages can't be changed — shake
        if (LOCKED_DOCK['1'] === pageKey || LOCKED_DOCK['3'] === pageKey || LOCKED_DOCK['5'] === pageKey) {
            item.classList.add('shake');
            setTimeout(function() { item.classList.remove('shake'); }, 400);
            return;
        }

        var config = getCurrentDockConfig();

        // Already docked? Flash it in preview
        for (var i = 0; i < CUSTOM_SLOTS.length; i++) {
            if (config[CUSTOM_SLOTS[i]] && config[CUSTOM_SLOTS[i]].page === pageKey) {
                var ps = dockPreview.querySelector('[data-preview-slot="' + CUSTOM_SLOTS[i] + '"]');
                if (ps) { ps.classList.add('flash'); setTimeout(function() { ps.classList.remove('flash'); }, 500); }
                return;
            }
        }

        // Find first empty custom slot
        var target = null;
        for (var j = 0; j < CUSTOM_SLOTS.length; j++) {
            if (!config[CUSTOM_SLOTS[j]]) { target = CUSTOM_SLOTS[j]; break; }
        }
        if (!target) {
            // All full — shake the preview
            if (dockPreview) { dockPreview.classList.add('flash'); setTimeout(function() { dockPreview.classList.remove('flash'); }, 500); }
            return;
        }

        // Fly animation → assign to slot
        var info = { page: pageKey, href: item.dataset.drawerHref, label: item.dataset.drawerLabel, icon: item.dataset.drawerIcon };
        var previewSlot = dockPreview.querySelector('[data-preview-slot="' + target + '"]');
        flyToSlot(item, previewSlot, function() {
            config[target] = info;
            localStorage.setItem('jm_dock_config', JSON.stringify(config));
            refreshEditUI();
            updateDockSlot(target, info);
        });
    }

    function removeFromDock(slotNum) {
        var config = getCurrentDockConfig();
        config[slotNum] = null;
        localStorage.setItem('jm_dock_config', JSON.stringify(config));

        var ps = dockPreview.querySelector('[data-preview-slot="' + slotNum + '"]');
        if (ps) {
            ps.classList.add('removing');
            setTimeout(function() { refreshEditUI(); }, 250);
        } else {
            refreshEditUI();
        }
        updateDockSlot(slotNum, null);
        if (navigator.vibrate) navigator.vibrate(10);
    }

    function flyToSlot(fromEl, toEl, callback) {
        var fr = fromEl.getBoundingClientRect();
        var tr = toEl.getBoundingClientRect();
        var clone = document.createElement('div');
        clone.className = 'fly-clone';
        var icon = fromEl.querySelector('.drawer-icon');
        if (icon) clone.innerHTML = icon.outerHTML;
        clone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:1;' +
            'left:' + (fr.left + fr.width / 2) + 'px;top:' + (fr.top + fr.height / 2) + 'px;' +
            'transform:translate(-50%,-50%) scale(1);transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);';
        document.body.appendChild(clone);
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                clone.style.left = (tr.left + tr.width / 2) + 'px';
                clone.style.top = (tr.top + tr.height / 2) + 'px';
                clone.style.transform = 'translate(-50%,-50%) scale(0.6)';
                clone.style.opacity = '0.4';
            });
        });
        setTimeout(function() {
            clone.remove();
            if (callback) callback();
            if (navigator.vibrate) navigator.vibrate(15);
        }, 420);
    }

    // Load dock config from Supabase (deferred)
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof supabaseClient === 'undefined') return;
        supabaseClient.auth.getSession().then(function(res) {
            if (!res.data?.session?.user?.id) return;
            supabaseClient.from('profiles').select('dock_config')
                .eq('id', res.data.session.user.id).single()
                .then(function(r) {
                    if (r.data?.dock_config) {
                        localStorage.setItem('jm_dock_config', JSON.stringify(r.data.dock_config));
                        applyDockConfig();
                    }
                });
        });
    });
})();


// ─── Nav Profile Loader ─────────────────────────────────
// Global function — called by auth/shared.js DOMContentLoaded
// if it exists (checked via typeof).
async function loadNavProfile() {
    try {
        var sess = await supabaseClient.auth.getSession();
        if (!sess.data.session) return;

        var uid = sess.data.session.user.id;
        var res = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, profile_picture_url, displayed_badge')
            .eq('id', uid)
            .single();

        if (!res.data) return;

        var firstName   = res.data.first_name || '';
        var lastName    = res.data.last_name  || '';
        var initials    = ((firstName.charAt(0) || '') + (lastName.charAt(0) || '')).toUpperCase() || '?';
        var photoUrl    = res.data.profile_picture_url;
        var badgeKey    = res.data.displayed_badge || '';

        // Desktop nav — profile area (link + dropdown btn on portal, section on admin)
        var btn        = document.getElementById('profileDropdownBtn');
        var profileLink = document.getElementById('navProfileLink');
        var section    = document.getElementById('navProfileSection');
        var nameEl     = document.getElementById('navProfileName');
        var initialsEl = document.getElementById('navProfileInitials');
        var imgEl      = document.getElementById('navProfileImg');

        if (profileLink) {
            // Portal: profile link (avatar+name) + separate dropdown chevron
            if (nameEl) nameEl.textContent = firstName || 'Member';
            if (initialsEl) initialsEl.textContent = initials;
            if (photoUrl && imgEl) {
                imgEl.src = photoUrl;
                imgEl.onload = function () {
                    imgEl.classList.remove('hidden');
                    if (initialsEl) initialsEl.classList.add('hidden');
                };
            }
            profileLink.classList.remove('hidden');
            if (btn) btn.classList.remove('hidden');
        } else if (section) {
            // Admin simple profile section
            if (nameEl) nameEl.textContent = firstName || 'Member';
            if (initialsEl) initialsEl.textContent = initials;
            if (photoUrl && imgEl) {
                imgEl.src = photoUrl;
                imgEl.onload = function () {
                    imgEl.classList.remove('hidden');
                    if (initialsEl) initialsEl.classList.add('hidden');
                };
            }
            section.classList.remove('hidden');
        }

        // Tab bar profile avatar
        var tInitialsEl = document.getElementById('tabProfileInitials');
        var tImgEl      = document.getElementById('tabProfileImg');

        if (tInitialsEl) tInitialsEl.textContent = initials;
        if (photoUrl && tImgEl) {
            tImgEl.src = photoUrl;
            tImgEl.onload = function () {
                tImgEl.classList.remove('hidden');
                if (tInitialsEl) tInitialsEl.classList.add('hidden');
            };
        }

        // ─── Render displayed badge overlays everywhere ──────
        _renderBadgeOverlays(badgeKey);

    } catch (e) {
        console.error('loadNavProfile error:', e);
    }
}

/**
 * Render the active badge chip overlay into all avatar badge slots.
 * Uses buildNavBadgeOverlay() from quests/config.js if available,
 * otherwise falls back to a static emoji render.
 */
function _renderBadgeOverlays(badgeKey) {
    var overlayIds = ['navBadgeOverlay'];
    for (var i = 0; i < overlayIds.length; i++) {
        var el = document.getElementById(overlayIds[i]);
        if (!el) continue;
        if (!badgeKey) { el.innerHTML = ''; continue; }

        // Use the badge chip builder if loaded (quests/config.js)
        if (typeof buildNavBadgeOverlay === 'function') {
            el.innerHTML = buildNavBadgeOverlay(badgeKey);
        } else {
            // Lightweight fallback for pages that don't load quests/config.js
            var badge = _badgeFallback(badgeKey);
            el.innerHTML = '<div class="badge-chip-overlay" title="' + badge.name + '">' + badge.emoji + '</div>';
        }
    }
}

/** Minimal badge lookup for pages without quests/config.js */
function _badgeFallback(key) {
    var catalog = {
        founding_member: { emoji: '🏅', name: 'Founding Member' },
        shutterbug:      { emoji: '📸', name: 'Shutterbug' },
        streak_master:   { emoji: '🔥', name: 'Streak Master' },
        streak_legend:   { emoji: '⚡', name: 'Streak Legend' },
        first_seed:      { emoji: '🌱', name: 'First Seed Witness' },
        four_figures:    { emoji: '💵', name: 'Four Figure Club' },
        quest_champion:  { emoji: '🎯', name: 'Quest Champion' },
        fidelity_linked: { emoji: '🏦', name: 'Fidelity Linked' },
        birthday_vip:    { emoji: '🎂', name: 'Birthday VIP' },
    };
    return catalog[key] || { emoji: '❓', name: key };
}
