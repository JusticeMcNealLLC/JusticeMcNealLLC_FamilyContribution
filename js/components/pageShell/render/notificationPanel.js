import { SVG } from '../state/icons.js';

export function buildNotificationPanel() {
    return (
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
        '</div>'
    );
}
