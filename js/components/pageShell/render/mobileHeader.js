import { SVG } from '../state/icons.js';
import { svgPath } from '../utils/svgPath.js';
import { logoBlock } from './links.js';

export function buildMobileHeader({ active, isAdmin, adminBadge }) {
    const logo = logoBlock();

    if (active === 'feed' && !isAdmin) {
        return (
            '<nav id="mobileHeader" class="sticky top-0 z-40 glass border-b border-gray-200/60 md:hidden">' +
                '<div class="max-w-5xl mx-auto px-4">' +
                    '<div class="flex justify-between items-center h-14">' +
                        '<button id="newPostBtn" class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center hover:bg-brand-200 transition" title="New Post">' +
                            '<svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgPath(SVG.plus) + '</svg>' +
                        '</button>' +
                        '<div class="flex items-center gap-2">' +
                            logo +
                            '<span class="font-bold text-lg text-gray-900">Justice McNeal</span>' +
                        '</div>' +
                        '<button id="notifBtn" class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition relative" title="Notifications">' +
                            '<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgPath(SVG.heart) + '</svg>' +
                            '<span id="notifBadge" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">0</span>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</nav>'
        );
    }

    return (
        '<nav id="mobileHeader" class="sticky top-0 z-40 glass border-b border-gray-200/60 md:hidden">' +
            '<div class="max-w-5xl mx-auto px-4">' +
                '<div class="flex items-center h-14 gap-3">' +
                    logo +
                    '<span class="font-bold text-lg text-gray-900">Justice McNeal</span>' +
                    adminBadge +
                '</div>' +
            '</div>' +
        '</nav>'
    );
}
