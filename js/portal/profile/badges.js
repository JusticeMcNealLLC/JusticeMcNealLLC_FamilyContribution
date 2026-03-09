// ═══════════════════════════════════════════════════════════
// Profile – Badges & Banners (Cosmetics)
// ═══════════════════════════════════════════════════════════

window.ProfileApp = window.ProfileApp || {};

// Banner presets catalog (gradient-based banners awarded as rewards)
window.ProfileApp.BANNER_CATALOG = {
    'founders-animated': { name: 'Founders Gold', preview: 'founders-banner-preview', isAnimated: true },
    'from-blue-500 to-purple-600': { name: 'Twilight', gradient: 'from-blue-500 to-purple-600' },
    'from-emerald-500 to-teal-600': { name: 'Emerald Wave', gradient: 'from-emerald-500 to-teal-600' },
    'from-rose-500 to-pink-600': { name: 'Rose Gold', gradient: 'from-rose-500 to-pink-600' },
    'from-amber-500 to-orange-600': { name: 'Sunset', gradient: 'from-amber-500 to-orange-600' },
    'from-violet-500 to-indigo-600': { name: 'Cosmic Purple', gradient: 'from-violet-500 to-indigo-600' },
    'from-cyan-500 to-blue-600': { name: 'Ocean Breeze', gradient: 'from-cyan-500 to-blue-600' },
};

// ─── Load Badges ────────────────────────────────────────
window.ProfileApp.loadBadges = async function loadBadges() {
    const S = window.ProfileApp.state;

    const { data: badges } = await supabaseClient
        .from('member_badges')
        .select('badge_key, earned_at')
        .eq('user_id', S.viewingUserId)
        .order('earned_at', { ascending: false });

    // Get current displayed badge + banner info
    const { data: prof } = await supabaseClient
        .from('profiles')
        .select('displayed_badge, cover_gradient, cover_photo_url')
        .eq('id', S.viewingUserId)
        .single();
    S.currentDisplayedBadge = prof?.displayed_badge || null;
    S.currentBannerGradient = prof?.cover_gradient || null;
    S.currentBannerPhotoUrl = prof?.cover_photo_url || null;

    S.earnedBadgeKeys = (badges || []).map(b => b.badge_key);

    const hasBadges = badges && badges.length > 0;
    const hasBanner = S.currentBannerGradient || S.currentBannerPhotoUrl;

    if (!hasBadges && !hasBanner) return;

    const section = document.getElementById('badgesSection');
    const grid = document.getElementById('badgesGrid');
    section.classList.remove('hidden');

    if (hasBadges) {
        // Render earned badges with equip ability for own profile
        grid.innerHTML = badges.map(b => {
            const badge = (typeof BADGE_CATALOG !== 'undefined' && BADGE_CATALOG[b.badge_key]) || { emoji: '🏅', name: b.badge_key, rarity: 'common' };
            const isEquipped = S.currentDisplayedBadge === b.badge_key;
            const equipClass = S.isOwnProfile ? 'cursor-pointer hover:scale-110 transition-transform' : '';
            const ringClass = isEquipped ? 'ring-2 ring-brand-500 ring-offset-2' : '';
            return `<div class="badge-chip badge-rarity-${badge.rarity || 'common'} w-10 h-10 text-lg ${equipClass} ${ringClass}" title="${badge.name}${S.isOwnProfile ? (isEquipped ? ' (equipped — tap to unequip)' : ' — tap to equip') : ''}" data-badge-key="${b.badge_key}" role="${S.isOwnProfile ? 'button' : 'img'}">${badge.emoji}</div>`;
        }).join('');

        // Wire up badge equip clicks (own profile only)
        if (S.isOwnProfile) {
            grid.querySelectorAll('[data-badge-key]').forEach(chip => {
                chip.addEventListener('click', () => window.ProfileApp.equipBadge(chip.dataset.badgeKey));
            });

            // Show "View Collection" button
            const collBtn = document.getElementById('toggleBadgeCollectionBtn');
            if (collBtn) {
                collBtn.classList.remove('hidden');
                collBtn.addEventListener('click', window.ProfileApp.toggleBadgeCollection);
            }
        }
    }

    // Render banner in cosmetics section
    if (hasBanner) {
        const bannersGrid = document.getElementById('bannersGrid');
        const earnedGrid = document.getElementById('earnedBannersGrid');
        if (bannersGrid && earnedGrid) {
            bannersGrid.classList.remove('hidden');
            let bannerHtml = '';
            if (S.currentBannerPhotoUrl) {
                bannerHtml = `<div class="rounded-xl overflow-hidden h-14 ring-2 ring-brand-500 ring-offset-1"><img src="${S.currentBannerPhotoUrl}" class="w-full h-full object-cover" alt="Banner"></div>`;
            } else if (S.currentBannerGradient === 'founders-animated') {
                bannerHtml = `<div class="relative rounded-xl overflow-hidden h-14 ring-2 ring-brand-500 ring-offset-1"><div class="founders-banner-preview w-full h-full"></div></div>`;
            } else if (S.currentBannerGradient) {
                bannerHtml = `<div class="rounded-xl overflow-hidden h-14 ring-2 ring-brand-500 ring-offset-1"><div class="w-full h-full bg-gradient-to-r ${S.currentBannerGradient}"></div></div>`;
            }
            earnedGrid.innerHTML = bannerHtml;
        }
    }
};

// ─── Equip Badge ────────────────────────────────────────
window.ProfileApp.equipBadge = async function equipBadge(badgeKey) {
    const S = window.ProfileApp.state;
    const newBadge = (badgeKey === S.currentDisplayedBadge) ? null : badgeKey;

    const { error } = await supabaseClient
        .from('profiles')
        .update({ displayed_badge: newBadge })
        .eq('id', S.profileUser.id);

    if (error) { console.error('Equip error:', error); return; }

    S.currentDisplayedBadge = newBadge;

    // Update badge overlay on avatar
    const overlay = document.getElementById('profileBadgeOverlay');
    if (newBadge && typeof buildNavBadgeOverlay === 'function') {
        overlay.innerHTML = buildNavBadgeOverlay(newBadge);
        const chip = overlay.querySelector('.badge-chip-overlay');
        if (chip) { chip.style.width = '28px'; chip.style.height = '28px'; chip.style.fontSize = '14px'; }
    } else {
        overlay.innerHTML = '';
    }

    // Re-render badges grid to update ring indicators
    window.ProfileApp.refreshBadgeRings();
    window.ProfileApp.refreshCollectionRings();
    window.ProfileApp.refreshEditModalBadgePicker();
};

// ─── Refresh Ring Indicators ────────────────────────────
window.ProfileApp.refreshBadgeRings = function refreshBadgeRings() {
    const S = window.ProfileApp.state;
    const grid = document.getElementById('badgesGrid');
    if (!grid) return;
    grid.querySelectorAll('[data-badge-key]').forEach(chip => {
        const isEq = chip.dataset.badgeKey === S.currentDisplayedBadge;
        chip.classList.toggle('ring-2', isEq);
        chip.classList.toggle('ring-brand-500', isEq);
        chip.classList.toggle('ring-offset-2', isEq);
        const badge = (typeof BADGE_CATALOG !== 'undefined' && BADGE_CATALOG[chip.dataset.badgeKey]) || { name: chip.dataset.badgeKey };
        chip.title = badge.name + (isEq ? ' (equipped — tap to unequip)' : ' — tap to equip');
    });
};

window.ProfileApp.refreshCollectionRings = function refreshCollectionRings() {
    const S = window.ProfileApp.state;
    const grid = document.getElementById('badgeCollectionGrid');
    if (!grid) return;
    grid.querySelectorAll('[data-badge-key]').forEach(card => {
        const isEq = card.dataset.badgeKey === S.currentDisplayedBadge;
        card.classList.toggle('ring-2', isEq);
        card.classList.toggle('ring-brand-500', isEq);
    });
};

// ─── Badge Collection Panel ─────────────────────────────
window.ProfileApp.toggleBadgeCollection = function toggleBadgeCollection() {
    const panel = document.getElementById('badgeCollectionPanel');
    const btn = document.getElementById('toggleBadgeCollectionBtn');
    if (!panel) return;

    const showing = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    btn.textContent = showing ? 'View Collection' : 'Hide Collection';

    if (!showing) window.ProfileApp.renderBadgeCollection();
};

window.ProfileApp.renderBadgeCollection = function renderBadgeCollection() {
    const S = window.ProfileApp.state;
    const grid = document.getElementById('badgeCollectionGrid');
    if (!grid || typeof BADGE_CATALOG === 'undefined') return;

    grid.innerHTML = Object.entries(BADGE_CATALOG).map(([key, badge]) => {
        const earned = S.earnedBadgeKeys.includes(key);
        const isEquipped = S.currentDisplayedBadge === key;
        const lockClass = earned ? '' : 'opacity-30 grayscale pointer-events-none';
        const ringClass = isEquipped ? 'ring-2 ring-brand-500' : '';
        return `
            <div class="flex flex-col items-center gap-1 p-2 rounded-xl ${earned ? 'cursor-pointer hover:bg-gray-50' : ''} ${ringClass} ${lockClass} transition" data-badge-key="${key}" ${earned ? 'role="button"' : ''}>
                <div class="badge-chip badge-rarity-${badge.rarity || 'common'} w-10 h-10 text-lg">${badge.emoji}</div>
                <span class="text-[10px] text-gray-500 text-center leading-tight">${badge.name}</span>
                ${!earned ? '<span class="text-[9px] text-gray-400">🔒</span>' : ''}
            </div>`;
    }).join('');

    // Wire equip for earned ones
    grid.querySelectorAll('[role="button"]').forEach(card => {
        card.addEventListener('click', () => window.ProfileApp.equipBadge(card.dataset.badgeKey));
    });
};
