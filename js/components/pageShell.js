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
        invest:  'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
        history: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        gear:    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        gearDot: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
        logout:  'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
        hub:     'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
        invite:  'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
        person:  'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        trophy:  'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
        quest:   'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
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
        var cls = 'settings' === active ? 'tab-active' : 'tab-inactive';
        return '<a href="settings.html" class="' + cls + '" id="profileTab">' +
            '<div class="relative w-7 h-7">' +
                '<div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border-2 ' + ('settings' === active ? 'border-brand-500' : 'border-gray-200') + '">' +
                    '<span id="tabProfileInitials" class="text-brand-600 text-[10px] font-bold"></span>' +
                    '<img id="tabProfileImg" class="w-full h-full object-cover hidden" alt="">' +
                '</div>' +

            '</div>' +
            '<span>Profile</span></a>';
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
        desktopLinks =
            dLink('index.html', 'Dashboard', 'dashboard') +
            dLink('quests.html', 'Quests', 'quests') +
            dLink('milestones.html', 'Milestones', 'milestones') +
            dLink('investments.html', 'Investments', 'investments') +
            dLink('history.html', 'History', 'history');

        tabsInner =
            '<div class="max-w-lg mx-auto grid grid-cols-5 px-2">' +
                mTab('index.html', p(SVG.home), 'Home', 'dashboard') +
                mTab('quests.html', p(SVG.quest), 'Quests', 'quests') +
                centerTab('milestones.html', p(SVG.trophy), 'Goals', 'milestones') +
                mTab('history.html', p(SVG.history), 'History', 'history') +
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
        // Portal: profile dropdown with Settings + Sign Out
        desktopRight =
            '<div class="w-px h-6 bg-gray-200 mx-2" id="navDivider"></div>' +
            '<div class="relative" id="profileDropdownWrap">' +
                '<button id="profileDropdownBtn" class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition hidden" aria-haspopup="true" aria-expanded="false">' +
                    '<div class="relative w-7 h-7 flex-shrink-0">' +
                        '<div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">' +
                            '<span id="navProfileInitials" class="text-brand-600 text-xs font-bold"></span>' +
                            '<img id="navProfileImg" class="w-full h-full object-cover hidden" alt="">' +
                        '</div>' +
                        '<div id="navBadgeOverlay"></div>' +
                    '</div>' +
                    '<span id="navProfileName" class="text-sm font-medium text-gray-700 max-w-[100px] truncate"></span>' +
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
    var navHTML =
    '<nav class="sticky top-0 z-40 glass border-b border-gray-200/60">' +
        '<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">' +
            '<div class="flex justify-between items-center h-14 md:h-16">' +
                '<div class="flex items-center gap-3">' +
                    '<div class="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center overflow-hidden" data-brand-logo>' +
                        '<span class="text-white font-bold text-sm" data-brand-fallback>JM</span>' +
                        '<img class="w-full h-full object-contain hidden" alt="Logo" data-brand-img>' +
                    '</div>' +
                    '<span class="font-bold text-lg text-gray-900">Justice McNeal</span>' +
                    adminBadge +
                '</div>' +
                '<div class="flex items-center gap-2 md:hidden" id="mobileProfileSection" style="display:none">' +
                    '<div class="relative w-8 h-8 flex-shrink-0">' +
                        '<div class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">' +
                            '<span id="mobileProfileInitials" class="text-brand-600 text-xs font-bold"></span>' +
                            '<img id="mobileProfileImg" class="w-full h-full object-cover hidden" alt="">' +
                        '</div>' +
                        '<div id="mobileBadgeOverlay"></div>' +
                    '</div>' +
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
    '<div class="bottom-tab-bar md:hidden">' +
        tabsInner +
    '</div>';

    // ─── Inject into placeholders ────────────────────────
    var np = document.getElementById('nav-placeholder');
    var fp = document.getElementById('footer-placeholder');
    var tp = document.getElementById('tabs-placeholder');

    if (np) np.outerHTML = navHTML;
    if (fp) fp.outerHTML = footerHTML;
    if (tp) tp.outerHTML = tabsHTML;
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

        // Desktop nav — profile area (dropdown btn on portal, section on admin)
        var btn        = document.getElementById('profileDropdownBtn');
        var section    = document.getElementById('navProfileSection');
        var nameEl     = document.getElementById('navProfileName');
        var initialsEl = document.getElementById('navProfileInitials');
        var imgEl      = document.getElementById('navProfileImg');

        if (btn) {
            // Portal dropdown trigger
            if (nameEl) nameEl.textContent = firstName || 'Member';
            if (initialsEl) initialsEl.textContent = initials;
            if (photoUrl && imgEl) {
                imgEl.src = photoUrl;
                imgEl.onload = function () {
                    imgEl.classList.remove('hidden');
                    if (initialsEl) initialsEl.classList.add('hidden');
                };
            }
            btn.classList.remove('hidden');
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

        // Mobile nav profile
        var mSection    = document.getElementById('mobileProfileSection');
        var mInitialsEl = document.getElementById('mobileProfileInitials');
        var mImgEl      = document.getElementById('mobileProfileImg');

        if (mSection) {
            if (mInitialsEl) mInitialsEl.textContent = initials;
            if (photoUrl && mImgEl) {
                mImgEl.src = photoUrl;
                mImgEl.onload = function () {
                    mImgEl.classList.remove('hidden');
                    if (mInitialsEl) mInitialsEl.classList.add('hidden');
                };
            }
            mSection.style.display = '';
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
    var overlayIds = ['navBadgeOverlay', 'mobileBadgeOverlay'];
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
