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
    evtBannerFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('bannerPreview').src = e.target.result;
        document.getElementById('bannerPreviewWrap').classList.remove('hidden');
        document.getElementById('bannerUploadHint').classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// ─── Page Navigation (list ↔ detail) ────────────────────

function evtNavigateToEvent(slug) {
    const url = new URL(window.location);
    url.searchParams.set('event', slug);
    history.pushState({ view: 'detail', slug }, '', url);
    evtRouteByUrl();
}

function evtNavigateToList() {
    const url = new URL(window.location);
    url.searchParams.delete('event');
    history.pushState({ view: 'list' }, '', url);
    evtRouteByUrl();
}

function evtRouteByUrl() {
    const slug = new URLSearchParams(window.location.search).get('event');
    const listView = document.getElementById('eventsListView');
    const detailView = document.getElementById('eventsDetailView');
    if (!listView || !detailView) return;

    if (slug) {
        // Show detail, hide list
        listView.classList.add('hidden');
        detailView.classList.remove('hidden');
        detailView.innerHTML = '<div class="flex items-center justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent"></div></div>';
        evtLoadDetailBySlug(slug);
    } else {
        // Show list, hide detail
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
    // Find event in cache first, otherwise query by slug
    let event = evtAllEvents.find(e => e.slug === slug);
    if (event) {
        evtOpenDetail(event.id);
        return;
    }
    // Not in cache — fetch full event data
    const { data, error } = await supabaseClient
        .from('events')
        .select('*, creator:created_by(id, first_name, last_name, profile_picture_url, displayed_badge)')
        .eq('slug', slug)
        .maybeSingle();
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
                    <button onclick="evtNavigateToList()" class="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                        Back to Events
                    </button>
                </div>`;
        }
        document.title = 'Event Not Found | Justice McNeal LLC';
        return;
    }
    // Merge into cache so evtOpenDetail can find it
    if (!evtAllEvents.find(e => e.id === data.id)) {
        evtAllEvents.push(data);
    }
    evtOpenDetail(data.id);
}

function evtCopyShareUrl(slug) {
    let url;
    if (slug) {
        url = `https://justicemcneal.com/events/?e=${slug}`;
        if (typeof evtCurrentUser !== 'undefined' && evtCurrentUser?.id) {
            url += `&ref=${evtCurrentUser.id.slice(0, 8)}`;
        }
    } else {
        url = document.getElementById('shareUrl')?.value;
    }
    if (!url) return;

    // Prefer native share sheet, fallback to clipboard
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
    const e = (evtAllEvents || []).find(ev => ev.id === eventId);
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

window.evtDownloadIcs = evtDownloadIcs;
