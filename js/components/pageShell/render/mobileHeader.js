import { SVG } from '../state/icons.js';
import { svgPath } from '../utils/svgPath.js';
import { logoBlock } from './links.js';

function brandCenterHtml(logo, adminBadge) {
    return (
        '<div class="mh-brand flex items-center gap-2">' +
            logo +
            '<span class="font-bold text-lg text-gray-900">Justice McNeal</span>' +
            (adminBadge || '') +
        '</div>'
    );
}

function feedLeftHtml() {
    return (
        '<button id="newPostBtn" type="button" class="mh-icon-btn w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center hover:bg-brand-200 transition" title="New Post" aria-label="New post">' +
            '<svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgPath(SVG.plus) + '</svg>' +
        '</button>'
    );
}

function feedRightHtml() {
    return (
        '<button id="notifBtn" type="button" class="mh-icon-btn w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition relative" title="Notifications" aria-label="Notifications">' +
            '<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgPath(SVG.heart) + '</svg>' +
            '<span id="notifBadge" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">0</span>' +
        '</button>'
    );
}

/** Resolve initial left/center/right HTML for a page. */
export function resolveMobileHeaderSlots({ active, isAdmin, adminBadge }) {
    const logo = logoBlock();
    const center = brandCenterHtml(logo, adminBadge);

    if (active === 'feed' && !isAdmin) {
        return {
            left: feedLeftHtml(),
            center,
            right: feedRightHtml(),
        };
    }

    return {
        left: '',
        center,
        right: '',
    };
}

export function buildMobileHeader({ active, isAdmin, adminBadge }) {
    const slots = resolveMobileHeaderSlots({ active, isAdmin, adminBadge });

    return (
        '<nav id="mobileHeader" class="sticky top-0 z-40 glass border-b border-gray-200/60 md:hidden">' +
            '<div class="max-w-5xl mx-auto px-4">' +
                '<div class="mh-bar flex items-center h-14 gap-2">' +
                    '<div id="mhSlotLeft" class="mh-slot mh-slot--left">' + slots.left + '</div>' +
                    '<div id="mhSlotCenter" class="mh-slot mh-slot--center">' + slots.center + '</div>' +
                    '<div id="mhSlotRight" class="mh-slot mh-slot--right">' + slots.right + '</div>' +
                '</div>' +
            '</div>' +
        '</nav>'
    );
}
