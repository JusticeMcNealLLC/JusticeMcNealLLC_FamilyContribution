// Portal Events — Manage People tab (roster, hosts, SMS)

'use strict';

import { smsInvitesHtml, wireSmsInvites } from './sms-invites.js';
import { hostsHtml, wireHosts } from './hosts.js';

function api() {
    return window.EventsManagePeopleApi || {};
}

function getState() {
    return api().getState?.() || {};
}

function peopleHtml() {
    const STATE = getState();
    const e = STATE.event;
    if (!e) return '';
    const Rsvps = window.EventsManageRsvps;
    const Notifications = window.EventsManageNotifications;
    const roster = typeof Rsvps?.rsvpsHtml === 'function' ? Rsvps.rsvpsHtml() : '';
    const reach = STATE.canManageNotifications && typeof Notifications?.notificationsHtml === 'function'
        ? `<div id="emPeopleReach" class="mt-4">${Notifications.notificationsHtml()}</div>`
        : '';

    return `
        ${roster}
        ${hostsHtml(e)}
        ${e.slug ? smsInvitesHtml(e) : ''}
        ${reach}
    `;
}

function wirePeople() {
    const STATE = getState();
    const e = STATE.event;
    if (!e) return;
    window.EventsManageRsvps?.wireRsvps?.();
    wireHosts(e);
    wireSmsInvites(e);
    if (STATE.canManageNotifications) {
        window.EventsManageNotifications?.wireNotifications?.();
    }
    document.getElementById('emSheetContent')?.querySelectorAll('[data-scroll-people-reach]').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.getElementById('emPeopleReach')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

export const managePeopleApi = { peopleHtml, wirePeople };

globalThis.EventsManagePeople = managePeopleApi;
