import { PORTAL_NAV_ICONS, portalNavSvg } from '../state/portalNavIcons.js';
import { portalNavLink } from './links.js';

function pLink(href, label, iconKey, pageKey, active) {
    const icon = PORTAL_NAV_ICONS[iconKey];
    return portalNavLink(href, label, portalNavSvg(icon), pageKey, active);
}

export function buildPortalSidebar(active) {
    const morePages = ['investments', 'milestones', 'contribution', 'extra-deposit', 'history', 'family-tree', 'team', 'finances', 'settings'];
    const moreOpen = morePages.indexOf(active) !== -1;

    const moreLinks =
        pLink('investments.html', 'Investments', 'investments', 'investments', active) +
        pLink('milestones.html', 'Milestones', 'milestones', 'milestones', active) +
        pLink('contribution.html', 'Contribute', 'contribute', 'contribution', active) +
        pLink('extra-deposit.html', 'Deposit', 'deposit', 'extra-deposit', active) +
        pLink('history.html', 'History', 'history', 'history', active) +
        pLink('family-tree.html', 'Family Tree', 'familyTree', 'family-tree', active) +
        pLink('team.html', 'Team', 'team', 'team', active) +
        pLink('my-finances.html', 'My Finances', 'finances', 'finances', active) +
        pLink('settings.html', 'Settings', 'settings', 'settings', active);

    const chevron = portalNavSvg(PORTAL_NAV_ICONS.chevron);

    return (
        '<nav id="sideNav" class="portal-side-nav hidden md:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 z-30">' +
            '<div class="portal-side-nav__logo-wrap">' +
                '<a href="index.html" class="portal-side-nav__logo" title="Dashboard" data-brand-logo>' +
                    '<span class="portal-side-nav__logo-fallback" data-brand-fallback>JM</span>' +
                    '<img class="portal-side-nav__logo-img hidden" alt="Logo" data-brand-img>' +
                '</a>' +
            '</div>' +
            '<div class="portal-side-nav__brand">' +
                '<p class="portal-side-nav__brand-name">Justice McNeal LLC</p>' +
                '<p class="portal-side-nav__brand-tag">Family Legacy Portal</p>' +
            '</div>' +
            '<div class="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4 sidenav-scroll">' +
                pLink('index.html', 'Dashboard', 'dashboard', 'dashboard', active) +
                pLink('feed.html', 'Feed', 'feed', 'feed', active) +
                pLink('quests.html', 'Quests', 'quests', 'quests', active) +
                pLink('events.html', 'Events', 'events', 'events', active) +
                '<div class="pt-2">' +
                    '<button id="navMoreBtn" type="button" aria-expanded="' + (moreOpen ? 'true' : 'false') + '" class="portal-side-nav__more-btn">' +
                        '<span class="flex items-center gap-2">More' +
                            (moreOpen ? '<span class="portal-side-nav__more-dot" aria-hidden="true"></span>' : '') +
                        '</span>' +
                        '<svg id="navMoreChev" class="portal-side-nav__chevron' + (moreOpen ? ' rotate-180' : '') + '" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + chevron + '</svg>' +
                    '</button>' +
                    '<div id="navMoreContent" class="mt-0.5 space-y-0.5 pl-1' + (moreOpen ? '' : ' hidden') + '">' +
                        moreLinks +
                    '</div>' +
                '</div>' +
                '<div class="pt-4 hidden" id="sideNavAdminSection">' +
                    '<div class="portal-side-nav__divider"></div>' +
                    '<a href="/admin/index.html" class="portal-side-nav__admin-link">' +
                        '<svg class="portal-side-nav__admin-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + portalNavSvg(PORTAL_NAV_ICONS.swap) + '</svg>' +
                        '<span>Switch to Admin</span>' +
                    '</a>' +
                '</div>' +
            '</div>' +
            '<div id="navProfileLink" class="hidden portal-side-nav__profile">' +
                '<span id="profileDropdownBtn" class="hidden"></span>' +
                '<div id="navProfileWrap">' +
                    '<div id="navProfileDrop" class="nav-profile-expand">' +
                        '<div class="pb-1 space-y-0.5">' +
                            '<a href="profile.html" class="portal-side-nav__menu-link">' +
                                '<svg class="portal-nav-link__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + portalNavSvg(PORTAL_NAV_ICONS.profile) + '</svg>' +
                                '<span>My Profile</span>' +
                            '</a>' +
                            '<a href="settings.html" class="portal-side-nav__menu-link">' +
                                '<svg class="portal-nav-link__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + portalNavSvg(PORTAL_NAV_ICONS.settings) + '</svg>' +
                                '<span>Settings</span>' +
                            '</a>' +
                            '<div class="portal-side-nav__divider my-1"></div>' +
                            '<button id="logoutBtn" type="button" class="portal-side-nav__signout">' +
                                '<svg class="portal-nav-link__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + portalNavSvg(PORTAL_NAV_ICONS.signOut) + '</svg>' +
                                '<span>Sign out</span>' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    '<button id="navProfileBtn" type="button" aria-expanded="false" class="portal-side-nav__profile-btn">' +
                        '<div class="relative w-9 h-9 flex-shrink-0">' +
                            '<div class="portal-side-nav__avatar">' +
                                '<span id="navProfileInitials" class="portal-side-nav__avatar-initials"></span>' +
                                '<img id="navProfileImg" class="w-full h-full object-cover hidden" alt="">' +
                            '</div>' +
                            '<div id="navBadgeOverlay"></div>' +
                        '</div>' +
                        '<span id="navProfileName" class="portal-side-nav__profile-name"></span>' +
                        '<svg id="navProfileChev" class="portal-side-nav__chevron flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + chevron + '</svg>' +
                    '</button>' +
                '</div>' +
            '</div>' +
        '</nav>'
    );
}
