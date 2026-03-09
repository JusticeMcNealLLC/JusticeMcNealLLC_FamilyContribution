// ─── Page Shell: Helpers ─────────────────────────────────
// Shared helper functions for building nav links, tabs, etc.
// ─────────────────────────────────────────────────────────

window.PageShell = window.PageShell || {};

var SVG = window.PageShell.SVG;

// SVG path wrapper
function p(d) {
    return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="' + d + '"></path>';
}

// Desktop nav link
function dLink(href, label, page) {
    var active = window.PageShell._active;
    if (page === active) {
        return '<a href="' + href + '" class="px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-lg">' + label + '</a>';
    }
    return '<a href="' + href + '" class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">' + label + '</a>';
}

// Mobile tab
function mTab(href, svgInner, label, page, extra) {
    var active = window.PageShell._active;
    var cls = page === active ? 'tab-active' : 'tab-inactive';
    return '<a href="' + href + '" class="' + cls + (extra || '') + '">' +
        '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgInner + '</svg>' +
        '<span>' + label + '</span></a>';
}

// Elevated center tab
function centerTab(href, svgInner, label, page) {
    var active = window.PageShell._active;
    var cls = page === active ? 'tab-center tab-center-active' : 'tab-center';
    return '<a href="' + href + '" class="' + cls + '">' +
        '<div class="tab-center-icon">' +
            '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' + svgInner + '</svg>' +
        '</div>' +
        '<span>' + label + '</span></a>';
}

// Profile avatar tab (rightmost)
function profileTab() {
    var active = window.PageShell._active;
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

// Logo block
function logoBlock() {
    return '<div class="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center overflow-hidden" data-brand-logo>' +
        '<span class="text-white font-bold text-sm" data-brand-fallback>JM</span>' +
        '<img class="w-full h-full object-contain hidden" alt="Logo" data-brand-img>' +
    '</div>';
}

// Expose
window.PageShell.p         = p;
window.PageShell.dLink     = dLink;
window.PageShell.mTab      = mTab;
window.PageShell.centerTab = centerTab;
window.PageShell.profileTab = profileTab;
window.PageShell.logoBlock = logoBlock;
