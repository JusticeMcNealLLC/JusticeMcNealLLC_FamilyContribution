import { SVG } from '../state/icons.js';
import { svgPath } from '../utils/svgPath.js';
import { mTab, centerTab, profileTab } from './links.js';

function buildTabsInner({ isAdmin, active }) {
    if (isAdmin) {
        return (
            '<div class="max-w-sm mx-auto grid grid-cols-2 px-4 gap-2 relative">' +
                '<div class="swipe-hint" aria-hidden="true"></div>' +
                mTab('index.html', svgPath(SVG.hub), 'Admin Hub', 'hub', active) +
                mTab('/pages/portal/index.html', svgPath(SVG.home), 'My Portal', '_', active) +
            '</div>'
        );
    }

    return (
        '<div class="max-w-lg mx-auto grid grid-cols-5 px-2 relative">' +
            '<div class="swipe-hint" aria-hidden="true"></div>' +
            mTab('feed.html', svgPath(SVG.feed), 'Feed', 'feed', active) +
            '<div class="dock-slot" data-dock-slot="2">' + mTab('events.html', svgPath(SVG.bell), 'Events', 'events', active) + '</div>' +
            centerTab('index.html', svgPath(SVG.home), 'Dashboard', 'dashboard', active) +
            '<div class="dock-slot" data-dock-slot="4">' + mTab('extra-deposit.html', svgPath(SVG.deposit), 'Deposit', 'extra-deposit', active) + '</div>' +
            profileTab(active) +
        '</div>'
    );
}

export function buildTabBar({ isAdmin, active }) {
    return (
        '<div class="bottom-tab-bar md:hidden" id="bottomTabBar">' +
            buildTabsInner({ isAdmin, active }) +
        '</div>'
    );
}
