import { svgPath } from '../utils/svgPath.js';

/** Desktop nav link (legacy horizontal nav). */
export function dLink(href, label, page, active) {
    if (page === active) {
        return '<a href="' + href + '" class="px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg">' + label + '</a>';
    }
    return '<a href="' + href + '" class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">' + label + '</a>';
}

/** Portal sidebar link (Theme_JMLLC001). */
export function portalNavLink(href, label, svgInner, pageKey, active) {
    const on = pageKey === active;
    const cls = on ? 'portal-nav-link portal-nav-link--active' : 'portal-nav-link';
    const ic = on ? 'portal-nav-link__icon portal-nav-link__icon--active' : 'portal-nav-link__icon';
    return '<a href="' + href + '" class="' + cls + '">' +
        '<svg class="' + ic + '" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
        svgInner + '</svg><span>' + label + '</span></a>';
}

/** Portal sidebar link (legacy brand Tailwind classes). */
export function sLink(href, label, icon, pageKey, active, icon2) {
    const on = pageKey === active;
    const cls = on
        ? 'flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm font-medium bg-brand-50 text-brand-600 border-l-[3px] border-brand-500 transition-colors'
        : 'flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm text-gray-600 border-l-[3px] border-transparent hover:bg-gray-50 hover:text-gray-900 transition-colors';
    const ic = on ? 'text-brand-500' : 'text-gray-400';
    return '<a href="' + href + '" class="' + cls + '">' +
        '<svg class="w-5 h-5 flex-shrink-0 ' + ic + '" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
        svgPath(icon) + (icon2 ? svgPath(icon2) : '') + '</svg><span>' + label + '</span></a>';
}

/** Admin sidebar link. */
export function aLink(href, label, icon, pageKey, active) {
    const on = pageKey === active;
    const cls = on
        ? 'nav-admin-link-active flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm font-medium text-white transition-colors'
        : 'nav-admin-link flex items-center gap-3 pl-[9px] pr-3 py-2.5 rounded-xl text-sm transition-colors';
    const ic = on ? 'text-blue-300' : 'text-slate-400';
    return '<a href="' + href + '" class="' + cls + '">' +
        '<svg class="w-5 h-5 flex-shrink-0 ' + ic + '" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
        svgPath(icon) + '</svg><span>' + label + '</span></a>';
}

export function adminSection(label) {
    return '<div class="px-3 pt-3 pb-1"><p class="text-[10px] font-bold uppercase tracking-widest" style="color:rgba(148,163,184,0.6);">' + label + '</p></div>';
}

/** Mobile tab. */
export function mTab(href, svgInner, label, page, active, extra) {
    const cls = page === active ? 'tab-active' : 'tab-inactive';
    return '<a href="' + href + '" class="' + cls + (extra || '') + '">' +
        '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgInner + '</svg>' +
        '<span>' + label + '</span></a>';
}

/** Elevated center tab. */
export function centerTab(href, svgInner, label, page, active) {
    const cls = page === active ? 'tab-center tab-center-active' : 'tab-center';
    return '<a href="' + href + '" class="' + cls + '">' +
        '<div class="tab-center-icon">' +
            '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgInner + '</svg>' +
        '</div>' +
        '<span>' + label + '</span></a>';
}

/** Profile avatar tab (rightmost). */
export function profileTab(active) {
    const cls = 'profile' === active ? 'tab-active' : 'tab-inactive';
    return '<a href="profile.html" class="' + cls + '" id="profileTab">' +
        '<div class="relative w-7 h-7">' +
            '<div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border-2 ' + ('profile' === active ? 'border-brand-500' : 'border-gray-200') + '">' +
                '<span id="tabProfileInitials" class="text-brand-600 text-[10px] font-bold"></span>' +
                '<img id="tabProfileImg" class="w-full h-full object-cover hidden" alt="">' +
            '</div>' +
        '</div>' +
        '<span>Profile</span></a>';
}

/** Logo block for mobile header. */
export function logoBlock() {
    return '<div class="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center overflow-hidden" data-brand-logo>' +
        '<span class="text-white font-bold text-sm" data-brand-fallback>JM</span>' +
        '<img class="w-full h-full object-contain hidden" alt="Logo" data-brand-img>' +
    '</div>';
}
