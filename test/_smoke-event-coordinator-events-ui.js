/**
 * Static smoke: Event Coordinator Phase 3 — portal Events UI permission gates.
 * Run: node test/_smoke-event-coordinator-events-ui.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

const portalFiles = {
    init: 'js/portal/events/init.js',
    list: 'js/portal/events/list/shell.js',
    detail: 'js/portal/events/detail.js',
    rsvp: 'js/portal/events/engagement/rsvp.js',
    scrapbook: 'js/portal/events/detail/scrapbook.js',
    manageSheet: 'js/portal/events/manage/sheet.js',
};

const sources = {};
for (const [key, rel] of Object.entries(portalFiles)) {
    sources[key] = fs.readFileSync(path.join(root, rel), 'utf8');
}

const ticketJs = fs.readFileSync(path.join(root, 'js/events/ticket.js'), 'utf8');
const sharedJs = fs.readFileSync(path.join(root, 'js/auth/shared.js'), 'utf8');
const portalHtml = fs.readFileSync(path.join(root, 'portal/events.html'), 'utf8');

// ── canCreateEvents on create gates ──
assert(/canCreateEvents\(\)/.test(sources.init), 'init.js should gate create button with canCreateEvents()');
assert(!/evtCurrentUserRole === 'admin'/.test(sources.init), 'init.js should not use evtCurrentUserRole for create');

const listCreateCount = (sources.list.match(/canCreateEvents\(\)/g) || []).length;
assert(listCreateCount >= 3, `list/shell.js should use canCreateEvents() for create UI (found ${listCreateCount})`);
assert(!/evtCurrentUserRole === 'admin'/.test(sources.list), 'list/shell.js should not use evtCurrentUserRole === admin');

// ── canManageEvents on manage/host/delete/drafts/scrapbook ──
assert(/canManageEvents\(\)/.test(sources.detail), 'detail.js should use canManageEvents() for isHost/delete');
assert(!/evtCurrentUserRole === 'admin'/.test(sources.detail), 'detail.js should not use evtCurrentUserRole === admin');

assert(/canManageEvents\(\)/.test(sources.rsvp), 'rsvp.js should use canManageEvents() for delete gate');
assert(!/evtCurrentUserRole !== 'admin'/.test(sources.rsvp), 'rsvp.js should not use evtCurrentUserRole !== admin');

assert(/canManageEvents\(\)/.test(sources.scrapbook), 'scrapbook.js should use canManageEvents()');

// manage sheet: featured uses canManageEventBanners (portal coordinators, not only admin source)
assert(/canManageEventBanners\(\)/.test(sources.manageSheet), 'manage sheet should use canManageEventBanners() for featured');
assert(/showFeaturedToggle/.test(sources.manageSheet), 'manage sheet should use showFeaturedToggle for featured UI');
assert(!/\$\{STATE\.source === 'admin' \? `\s*\n\s*<div class="em-card mb-3">/.test(sources.manageSheet),
    'featured toggle should not be gated only by STATE.source === admin');

// ── ticket.js optional helper + legacy fallback documented in source ──
assert(/canManageEvents\(\)/.test(ticketJs), 'ticket.js should check canManageEvents() when available');
assert(/prof\?\.role === 'admin'/.test(ticketJs), 'ticket.js keeps legacy profiles.role fallback when helper absent');

// ── No event_coordinator / no shared.js edits in this phase ──
for (const [key, src] of Object.entries(sources)) {
    assert(!/event_coordinator/.test(src), `${key} must not add event_coordinator checks`);
}
assert(!/event_coordinator/.test(ticketJs), 'ticket.js must not add event_coordinator checks');

assert(/function canCreateEvents/.test(sharedJs), 'shared.js should already define canCreateEvents (unchanged this phase)');

// portal/events.html unchanged (no permission helper edits in HTML)
assert(!/canCreateEvents/.test(portalHtml), 'portal/events.html should not embed new permission helpers');

// scope: no supabase touch in these files
for (const rel of Object.values(portalFiles)) {
    assert(!rel.startsWith('supabase/'), rel);
}

console.log('event coordinator events UI smoke: all pass');
console.log('follow-up: events/index.html does not load js/auth/shared.js — ticket canManageEvents() is no-op until shared.js is added there');
