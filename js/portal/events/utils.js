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
    const tabBar = document.getElementById('bottomTabBar');
    if (show) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        // Bring bottom nav above the detail modal on mobile
        if (id === 'detailModal' && tabBar) tabBar.style.zIndex = '70';
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        // Reset bottom nav z-index
        if (id === 'detailModal' && tabBar) tabBar.style.zIndex = '';
        // Cleanup map when closing detail modal
        if (id === 'detailModal' && typeof evtCleanupMap === 'function') {
            evtCleanupMap();
        }
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

function evtCopyShareUrl(slug) {
    let url;
    if (slug) {
        url = `${APP_CONFIG.FUNCTIONS_URL}/event-og?e=${slug}`;
        // Append ref for personalized OG preview ("Name invited you to …")
        if (typeof evtCurrentUser !== 'undefined' && evtCurrentUser?.id) {
            url += `&ref=${evtCurrentUser.id.slice(0, 8)}`;
        }
    } else {
        url = document.getElementById('shareUrl')?.value;
    }
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
        // Brief toast-style feedback
        const toast = document.createElement('div');
        toast.textContent = 'Link copied!';
        toast.className = 'fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-lg z-[999] transition-opacity duration-300';
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1500);
    });
}
