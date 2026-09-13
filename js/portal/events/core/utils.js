// ═══════════════════════════════════════════════════════════
// Portal Events — Utilities
// Pure helpers shared across event modules.
// ═══════════════════════════════════════════════════════════

// ─── Badge chip helper (works even without quests/config.js) ──
const EVT_BADGE_EMOJI = { founding_member:'🏅', shutterbug:'📸', streak_master:'🔥', streak_legend:'⚡', first_seed:'🌱', four_figures:'💵', quest_champion:'🎯', fidelity_linked:'🏦', birthday_vip:'🎂' };
function evtBadgeChip(badgeKey) {
    if (!badgeKey) return '';
    if (typeof buildNavBadgeOverlay === 'function') return buildNavBadgeOverlay(badgeKey);
    return `<div class="badge-chip-overlay">${EVT_BADGE_EMOJI[badgeKey] || '❓'}</div>`;
}

function evtToggleModal(id, show) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function evtGenerateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 60)
        + '-' + Date.now().toString(36);
}

function evtEscapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function evtHandleBannerSelect() {
    const file = document.getElementById('bannerFile').files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be under 5 MB.');
        return;
    }
    globalThis.evtBannerFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('bannerPreview').src = e.target.result;
        document.getElementById('bannerPreviewWrap').classList.remove('hidden');
        document.getElementById('bannerUploadHint').classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

function evtHandleEmbedImageSelect() {
    const file = document.getElementById('embedImageFile').files[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
        alert('Please choose a PNG, JPG, or WebP image.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be under 5 MB.');
        return;
    }
    globalThis.evtEmbedImageFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('embedImagePreview').src = e.target.result;
        document.getElementById('embedImagePreviewWrap').classList.remove('hidden');
        document.getElementById('embedImageUploadHint').classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// ─── Page Navigation (list ↔ detail) ────────────────────

function evtNavigateToEvent(slug) {
    if (slug && typeof slug === 'object') slug = slug.slug || slug.id || '';
    if (!slug) return;
    const url = new URL(window.location);
    url.searchParams.set('event', slug);
    history.pushState({ view: 'detail', slug }, '', url);
    globalThis.evtRouteByUrl();
}

function evtNavigateToList() {
    const url = new URL(window.location);
    url.searchParams.delete('event');
    history.pushState({ view: 'list' }, '', url);
    globalThis.evtRouteByUrl();
}

function evtDownloadIcsBySlug(slug) {
    const key = String(slug || '').trim();
    if (!key) return;
    const e = (globalThis.evtAllEvents || []).find((ev) => ev.slug === key || ev.id === key);
    if (e && typeof globalThis.evtDownloadIcs === 'function') {
        globalThis.evtDownloadIcs(e.id);
    }
}

function evtDetailMobileHeaderHtml(slug) {
    const safeSlug = String(slug || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const center =
        '<a href="../dashboard.html" class="mh-logo-link mh-frost-pill" aria-label="Justice McNeal home">' +
        '<span class="mh-logo-mark flex items-center justify-center overflow-hidden" data-brand-logo>' +
        '<span class="mh-logo-fallback font-bold text-sm" data-brand-fallback>jm</span>' +
        '<img class="w-full h-full object-contain hidden" alt="" data-brand-img>' +
        '</span></a>';
    const right =
        '<div class="mh-slot-actions flex items-center gap-2">' +
        `<button type="button" class="mh-icon-btn mh-circle-btn mh-frost-pill" onclick="globalThis.evtCopyShareUrl('${safeSlug}')" aria-label="Share event">` +
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>' +
        '</button>' +
        `<button type="button" class="mh-icon-btn mh-circle-btn mh-frost-pill" onclick="globalThis.evtDownloadIcsBySlug('${safeSlug}')" aria-label="Save event">` +
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>' +
        '</button></div>';
    const left =
        '<button type="button" class="mh-icon-btn mh-circle-btn mh-frost-pill" onclick="globalThis.evtNavigateToList()" aria-label="Back to events">' +
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>' +
        '</button>';
    return { left, center, right };
}

function evtApplyDetailMobileHeader(slug) {
    const html = evtDetailMobileHeaderHtml(slug);
    const tryApply = (attempt) => {
        const api = window.PageShell;
        if (api && typeof api.setMobileHeader === 'function' && document.getElementById('mhSlotLeft')) {
            api.setMobileHeader(html);
            return;
        }
        if (attempt < 40) setTimeout(() => tryApply(attempt + 1), 25);
    };
    tryApply(0);
}

function evtResetDetailMobileHeader() {
    const tryReset = (attempt) => {
        const api = window.PageShell;
        if (api && typeof api.resetMobileHeader === 'function' && document.getElementById('mhSlotLeft')) {
            api.resetMobileHeader();
            return;
        }
        if (attempt < 40) setTimeout(() => tryReset(attempt + 1), 25);
    };
    tryReset(0);
}

function evtRouteByUrl() {
    const slug = new URLSearchParams(window.location.search).get('event');
    const listView = document.getElementById('eventsListView');
    const detailView = document.getElementById('eventsDetailView');
    if (!listView || !detailView) return;

    if (slug) {
        // Show detail, hide list
        document.body.classList.add('evt-detail-open');
        evtApplyDetailMobileHeader(slug);
        listView.classList.add('hidden');
        detailView.classList.remove('hidden');
        detailView.innerHTML = '<div class="flex items-center justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent"></div></div>';
        globalThis.evtLoadDetailBySlug(slug);
    } else {
        // Show list, hide detail
        document.body.classList.remove('evt-detail-open');
        evtResetDetailMobileHeader();
        detailView.classList.add('hidden');
        detailView.innerHTML = '';
        listView.classList.remove('hidden');
        document.title = 'Events | Justice McNeal LLC';
        if (typeof evtCleanupMap === 'function') evtCleanupMap();
        // Remove action strip
        if (typeof evtCleanupBottomNav === 'function') evtCleanupBottomNav();
    }
}

async function evtLoadDetailBySlug(slug) {
    const key = String(slug || '').trim();
    if (!key) return;
    // Find event in cache first (slug or id — Stripe cancel links may use UUID)
    let event = globalThis.evtAllEvents.find(e => e.slug === key || e.id === key);
    if (event) {
        // Normalize URL to slug when we resolved by id
        if (event.slug && event.slug !== key) {
            const url = new URL(window.location.href);
            url.searchParams.set('event', event.slug);
            history.replaceState({ view: 'detail', slug: event.slug }, '', url);
        }
        globalThis.evtOpenDetail(event.id);
        return;
    }
    // Not in cache — fetch by slug, then by id
    let data = null;
    let error = null;
    ({ data, error } = await supabaseClient
        .from('events')
        .select('*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)')
        .eq('slug', key)
        .maybeSingle());
    if ((!data || error) && /^[0-9a-f-]{36}$/i.test(key)) {
        ({ data, error } = await supabaseClient
            .from('events')
            .select('*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)')
            .eq('id', key)
            .maybeSingle());
    }
    if (error || !data) {
        const detailView = document.getElementById('eventsDetailView');
        if (detailView) {
            detailView.innerHTML = `
                <div class="max-w-md mx-auto text-center py-20 px-4">
                    <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <h2 class="text-lg font-bold text-gray-900 mb-1">Event not found</h2>
                    <p class="text-sm text-gray-500 mb-6">This event may have been removed or the link is incorrect.</p>
                    <button onclick="globalThis.evtNavigateToList()" class="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                        Back to Events
                    </button>
                </div>`;
        }
        document.title = 'Event Not Found | Justice McNeal LLC';
        return;
    }
    // Merge into cache so globalThis.evtOpenDetail can find it
    if (!globalThis.evtAllEvents.find(e => e.id === data.id)) {
        globalThis.evtAllEvents.push(data);
    }
    if (data.slug && data.slug !== key) {
        const url = new URL(window.location.href);
        url.searchParams.set('event', data.slug);
        history.replaceState({ view: 'detail', slug: data.slug }, '', url);
        evtApplyDetailMobileHeader(data.slug);
    }
    globalThis.evtOpenDetail(data.id);
}

function evtPublicEventInviteUrl(slug) {
    if (!slug) return '';
    return `https://justicemcneal.com/events/?e=${encodeURIComponent(slug)}`;
}

function evtCopyShareUrl(slug) {
    const url = slug ? evtPublicEventInviteUrl(slug) : document.getElementById('shareUrl')?.value;
    if (!url) return;

    // Same URL as manage → Share invite / Copy invite link
    if (navigator.share) {
        navigator.share({ title: 'Check out this event', url }).catch(() => {});
    } else {
        navigator.clipboard.writeText(url).then(() => {
            const toast = document.createElement('div');
            toast.textContent = 'Link copied!';
            toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg z-[999] transition-opacity duration-300';
            document.body.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1500);
        });
    }
}

// ═══════════════════════════════════════════════════════════
// Download ICS
// ═══════════════════════════════════════════════════════════
function evtDownloadIcs(eventId) {
    const e = (globalThis.evtAllEvents || []).find(ev => ev.id === eventId);
    if (!e) return;
    const start = new Date(e.start_date);
    const end   = e.end_date ? new Date(e.end_date) : new Date(start.getTime() + 7200000);
    const fmt   = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const uid   = `${e.id}@justicemcnealllc.com`;

    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//JusticeMcNealLLC//Events//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${e.title.replace(/[,;\\]/g, '')}`,
        `DESCRIPTION:${(e.description || '').replace(/\n/g, '\\n').slice(0, 500)}`,
        `LOCATION:${(e.location_text || '').replace(/[,;\\]/g, '')}`,
        `URL:${window.location.origin}/events/?e=${e.slug}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${e.slug || 'event'}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export {
    evtBadgeChip,
    evtToggleModal,
    evtGenerateSlug,
    evtEscapeHtml,
    evtHandleBannerSelect,
    evtHandleEmbedImageSelect,
    evtNavigateToEvent,
    evtNavigateToList,
    evtRouteByUrl,
    evtLoadDetailBySlug,
    evtPublicEventInviteUrl,
    evtCopyShareUrl,
    evtDownloadIcs,
    evtDownloadIcsBySlug,
    evtApplyDetailMobileHeader,
    evtResetDetailMobileHeader,
};

const _utilsGlobal = {
    evtBadgeChip,
    evtToggleModal,
    evtGenerateSlug,
    evtEscapeHtml,
    evtHandleBannerSelect,
    evtHandleEmbedImageSelect,
    evtNavigateToEvent,
    evtNavigateToList,
    evtRouteByUrl,
    evtLoadDetailBySlug,
    evtPublicEventInviteUrl,
    evtCopyShareUrl,
    evtDownloadIcs,
    evtDownloadIcsBySlug,
    evtApplyDetailMobileHeader,
    evtResetDetailMobileHeader,
};
for (const [name, fn] of Object.entries(_utilsGlobal)) {
    globalThis[name] = fn;
}
