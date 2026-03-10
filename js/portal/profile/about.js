// ═══════════════════════════════════════════════════════════
// Profile – About Modal
// Opens from the "Member since" button (mobile + desktop).
// Shows profile pic, date joined, badge & banner carousels.
// ═══════════════════════════════════════════════════════════

window.ProfileApp = window.ProfileApp || {};

// ─── Setup ──────────────────────────────────────────────
window.ProfileApp.setupAboutModal = function setupAboutModal() {
    const btn = document.getElementById('memberSinceBtn');
    const modal = document.getElementById('aboutModal');
    const backdrop = document.getElementById('aboutModalBackdrop');
    const closeBtn = document.getElementById('aboutModalCloseBtn');

    if (!btn || !modal) return;

    btn.addEventListener('click', () => window.ProfileApp.openAboutModal());
    backdrop?.addEventListener('click', () => window.ProfileApp.closeAboutModal());
    closeBtn?.addEventListener('click', () => window.ProfileApp.closeAboutModal());

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            window.ProfileApp.closeAboutModal();
        }
    });
};

// ─── Open ───────────────────────────────────────────────
window.ProfileApp.openAboutModal = async function openAboutModal() {
    const S = window.ProfileApp.state;
    const modal = document.getElementById('aboutModal');
    if (!modal) return;

    const profile = S._profileData;
    if (!profile) return;

    const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Member';

    // Title
    document.getElementById('aboutModalTitle').textContent = `About ${profile.first_name || fullName}`;

    // Profile pic
    const img = document.getElementById('aboutModalImg');
    const initials = document.getElementById('aboutModalInitials');
    if (profile.profile_picture_url) {
        img.src = profile.profile_picture_url;
        img.classList.remove('hidden');
        initials.classList.add('hidden');
    } else {
        const fi = (profile.first_name || '?')[0].toUpperCase();
        const li = (profile.last_name || '')[0]?.toUpperCase() || '';
        initials.textContent = fi + li;
        initials.classList.remove('hidden');
        img.classList.add('hidden');
    }

    // Date joined
    if (profile.created_at) {
        const d = new Date(profile.created_at);
        const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        document.getElementById('aboutModalDate').textContent = `Joined ${dateStr}`;
    }

    // Badge unlocks carousel
    await window.ProfileApp.populateAboutBadges();

    // Banner unlocks carousel
    await window.ProfileApp.populateAboutBanners();

    // Show
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

// ─── Close ──────────────────────────────────────────────
window.ProfileApp.closeAboutModal = function closeAboutModal() {
    const modal = document.getElementById('aboutModal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
};

// ─── Badge Unlocks (3-row horizontal carousel) ─────────
window.ProfileApp.populateAboutBadges = async function populateAboutBadges() {
    const S = window.ProfileApp.state;
    const section = document.getElementById('aboutBadgesSection');
    const grid = document.getElementById('aboutBadgesGrid');
    if (!section || !grid) return;

    const { data: badges } = await supabaseClient
        .from('member_badges')
        .select('badge_key, earned_at')
        .eq('user_id', S.viewingUserId)
        .order('earned_at', { ascending: false });

    if (!badges || badges.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    grid.innerHTML = badges.map(b => {
        const badge = (typeof BADGE_CATALOG !== 'undefined' && BADGE_CATALOG[b.badge_key])
            || { emoji: '🏅', name: b.badge_key, rarity: 'common' };
        return `
            <div class="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50/80">
                <div class="badge-chip badge-rarity-${badge.rarity || 'common'} w-10 h-10 text-lg">${badge.emoji}</div>
                <span class="text-[9px] text-gray-500 text-center leading-tight truncate w-full">${badge.name}</span>
            </div>`;
    }).join('');
};

// ─── Banner Unlocks (2-row horizontal carousel) ────────
window.ProfileApp.populateAboutBanners = async function populateAboutBanners() {
    const S = window.ProfileApp.state;
    const section = document.getElementById('aboutBannersSection');
    const grid = document.getElementById('aboutBannersGrid');
    if (!section || !grid) return;

    // Collect all banner info for this user
    // Currently banners are single-value on profiles; gather from BANNER_CATALOG + custom photo
    const banners = [];
    const CATALOG = window.ProfileApp.BANNER_CATALOG || {};

    if (S.currentBannerPhotoUrl) {
        banners.push({ type: 'photo', url: S.currentBannerPhotoUrl, name: 'Custom Banner' });
    }
    if (S.currentBannerGradient && S.currentBannerGradient !== 'none') {
        const info = CATALOG[S.currentBannerGradient];
        banners.push({
            type: S.currentBannerGradient === 'founders-animated' ? 'founders' : 'gradient',
            gradient: S.currentBannerGradient,
            name: info?.name || 'Banner'
        });
    }

    if (banners.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    grid.innerHTML = banners.map(b => {
        let preview = '';
        if (b.type === 'photo') {
            preview = `<img src="${b.url}" class="w-full h-full object-cover" alt="${b.name}">`;
        } else if (b.type === 'founders') {
            preview = `<div class="founders-banner-preview w-full h-full"></div>`;
        } else {
            preview = `<div class="w-full h-full bg-gradient-to-r ${b.gradient}"></div>`;
        }
        return `
            <div class="relative rounded-xl overflow-hidden h-16 bg-gray-100">
                ${preview}
                <div class="absolute bottom-0 inset-x-0 text-[9px] text-white/80 text-center py-0.5 bg-black/30">${b.name}</div>
            </div>`;
    }).join('');
};
