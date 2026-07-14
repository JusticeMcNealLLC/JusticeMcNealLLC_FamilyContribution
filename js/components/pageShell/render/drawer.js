import { SVG } from '../state/icons.js';
import { svgPath } from '../utils/svgPath.js';

export function buildDrawer({ isAdmin, active }) {
    if (isAdmin) {
        const adminDrawerPages = [
            { href: 'index.html', page: 'hub', icon: SVG.hub, label: 'Admin Hub' },
            { href: 'invite.html', page: 'invite', icon: SVG.invite, label: 'Invite Member' },
            { href: '/pages/portal/index.html', page: '_', icon: SVG.home, label: 'My Portal' },
        ];
        let adminGridItems = '';
        for (let ai = 0; ai < adminDrawerPages.length; ai++) {
            const ap = adminDrawerPages[ai];
            const aActiveCls = ap.page === active ? ' active-page' : '';
            const aIconSvg = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgPath(ap.icon) + '</svg>';
            adminGridItems += '<a href="' + ap.href + '" class="nav-drawer-item' + aActiveCls + '">' +
                '<div class="drawer-icon">' + aIconSvg + '</div>' +
                '<span>' + ap.label + '</span>' +
            '</a>';
        }
        return (
            '<div class="nav-drawer-backdrop md:hidden" id="navDrawerBackdrop"></div>' +
            '<div class="nav-drawer md:hidden" id="navDrawer">' +
                '<div class="nav-drawer-handle" id="navDrawerHandle"></div>' +
                '<div class="px-4 pb-1 flex items-center justify-between">' +
                    '<span class="text-sm font-bold text-gray-900">Admin Navigation</span>' +
                '</div>' +
                '<div class="nav-drawer-grid" id="navDrawerGrid">' + adminGridItems + '</div>' +
            '</div>'
        );
    }

    const drawerPages = [
        { href: 'feed.html', page: 'feed', icon: SVG.feed, label: 'Feed' },
        { href: 'index.html', page: 'dashboard', icon: SVG.home, label: 'Dashboard' },
        { href: 'events.html', page: 'events', icon: SVG.bell, label: 'Events' },
        { href: 'investments.html', page: 'investments', icon: SVG.invest, label: 'Invest' },
        { href: 'history.html', page: 'history', icon: SVG.history, label: 'History' },
        { href: 'quests.html', page: 'quests', icon: SVG.quest, label: 'Quests' },
        { href: 'milestones.html', page: 'milestones', icon: SVG.trophy, label: 'Milestones' },
        { href: 'settings.html', page: 'settings', icon: SVG.gear, label: 'Settings', icon2: SVG.gearDot },
        { href: 'contribution.html', page: 'contribution', icon: SVG.plus, label: 'Contribute' },
        { href: 'extra-deposit.html', page: 'extra-deposit', icon: SVG.deposit, label: 'Deposit' },
        { href: 'family-tree.html', page: 'family-tree', icon: SVG.person, label: 'Family Tree' },
        { href: 'team.html', page: 'team', icon: SVG.team, label: 'Team' },
        { href: 'profile.html', page: 'profile', icon: SVG.person, label: 'Profile' },
        { href: 'my-finances.html', page: 'finances', icon: SVG.wallet, label: 'My Finances' },
    ];

    let gridItems = '';
    for (let di = 0; di < drawerPages.length; di++) {
        const dp = drawerPages[di];
        const activeCls = dp.page === active ? ' active-page' : '';
        const iconSvg = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgPath(dp.icon) + (dp.icon2 ? svgPath(dp.icon2) : '') + '</svg>';
        gridItems += '<a href="' + dp.href + '" class="nav-drawer-item' + activeCls + '" data-drawer-page="' + dp.page + '" data-drawer-href="' + dp.href + '" data-drawer-label="' + dp.label + '" data-drawer-icon=\'' + dp.icon + '\'>' +
            '<div class="drawer-icon">' + iconSvg + '</div>' +
            '<span>' + dp.label + '</span>' +
        '</a>';
    }

    return (
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
        '</div>'
    );
}
