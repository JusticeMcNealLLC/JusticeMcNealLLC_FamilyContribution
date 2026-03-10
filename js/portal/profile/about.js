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
            <div class="flex flex-col items-center gap-1.5 p-2 rounded-xl min-w-[72px]">
                <div class="badge-chip badge-rarity-${badge.rarity || 'common'} w-12 h-12 text-xl">${badge.emoji}</div>
                <span class="text-[10px] text-gray-500 text-center leading-tight max-w-[80px]">${badge.name}</span>
            </div>`;
    }).join('');

    // Apply Lottie effects to legendary/epic badge chips
    if (typeof LottieEffects !== 'undefined') {
        setTimeout(() => LottieEffects.applyBadgeEffects(), 150);
    }
};

// ─── Banner Unlocks (2-row horizontal carousel) ────────
window.ProfileApp.populateAboutBanners = async function populateAboutBanners() {
    const S = window.ProfileApp.state;
    const section = document.getElementById('aboutBannersSection');
    const grid = document.getElementById('aboutBannersGrid');
    if (!section || !grid) return;

    // Collect all earned banners for this user
    // Derive from: current equipped banner + badge-linked banners
    const banners = [];
    const CATALOG = window.ProfileApp.BANNER_CATALOG || {};
    const addedKeys = new Set();

    if (S.currentBannerPhotoUrl) {
        banners.push({ type: 'photo', url: S.currentBannerPhotoUrl, name: 'Custom Banner' });
    }

    // Add current equipped banner
    if (S.currentBannerGradient && S.currentBannerGradient !== 'none') {
        addedKeys.add(S.currentBannerGradient);
        const info = CATALOG[S.currentBannerGradient];
        const isAnimated = info?.isAnimated && info?.preview;
        banners.push({
            type: isAnimated ? 'animated' : 'gradient',
            previewClass: info?.preview || null,
            gradient: S.currentBannerGradient,
            name: info?.name || 'Banner'
        });
    }

    // Founding members always earn the founders-animated banner
    const earnedKeys = S.earnedBadgeKeys || [];
    if (earnedKeys.includes('founding_member') && !addedKeys.has('founders-animated')) {
        const info = CATALOG['founders-animated'];
        if (info) {
            addedKeys.add('founders-animated');
            banners.push({
                type: info.isAnimated ? 'animated' : 'gradient',
                previewClass: info.preview || null,
                gradient: 'founders-animated',
                name: info.name || 'Founders Banner'
            });
        }
    }

    if (banners.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    grid.innerHTML = banners.map((b, i) => {
        let preview = '';
        if (b.type === 'photo') {
            preview = `<img src="${b.url}" class="w-full h-full object-cover" alt="${b.name}">`;
        } else if (b.type === 'animated' && b.previewClass) {
            preview = `<div class="${b.previewClass} w-full h-full"></div>`;
        } else {
            preview = `<div class="w-full h-full bg-gradient-to-r ${b.gradient}"></div>`;
        }
        return `
            <div class="relative rounded-xl overflow-hidden h-20 bg-gray-100" data-banner-idx="${i}">
                ${preview}
                <div class="absolute bottom-0 inset-x-0 text-[10px] text-white text-center py-1 bg-gradient-to-t from-black/50 to-transparent font-medium">${b.name}</div>
            </div>`;
    }).join('');

    // Apply Lottie effects to animated banners
    if (typeof LottieEffects !== 'undefined') {
        banners.forEach((b, i) => {
            if (b.gradient) {
                const info = CATALOG[b.gradient];
                if (info?.lottieEffect) {
                    const card = grid.querySelector(`[data-banner-idx="${i}"]`);
                    if (card) LottieEffects.renderBannerEffect(card, info.lottieEffect, { opacity: 0.7 });
                }
            }
        });
    }
};
