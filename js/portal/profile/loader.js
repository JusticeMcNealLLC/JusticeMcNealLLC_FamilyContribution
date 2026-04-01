// ═══════════════════════════════════════════════════════════
// Profile – Loader (profile data + stats)
// ═══════════════════════════════════════════════════════════

window.ProfileApp = window.ProfileApp || {};

// ─── Load Profile Data ──────────────────────────────────
window.ProfileApp.loadProfile = async function loadProfile() {
    const S = window.ProfileApp.state;
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', S.viewingUserId)
            .single();

        if (error || !profile) {
            document.querySelector('main').innerHTML = '<div class="py-16 text-center"><h2 class="text-lg font-bold text-gray-900">Profile not found</h2><a href="feed.html" class="text-sm text-brand-600 hover:underline mt-2 inline-block">Back to Feed</a></div>';
            return;
        }

        // Privacy check
        if (profile.profile_visibility === 'private' && !S.isOwnProfile) {
            const { data: viewer } = await supabaseClient.from('profiles').select('role').eq('id', S.profileUser.id).single();
            if (viewer?.role !== 'admin') {
                document.querySelector('main').innerHTML = '<div class="py-16 text-center"><div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></div><h2 class="text-lg font-bold text-gray-900">Private Profile</h2><p class="text-sm text-gray-500 mt-1">This member\'s profile is private.</p></div>';
                return;
            }
        }

        // Set page title
        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Member';
        document.title = `${fullName} | Justice McNeal LLC`;

        // Cover photo or gradient
        if (profile.cover_photo_url) {
            const coverImg = document.getElementById('coverImage');
            coverImg.src = profile.cover_photo_url;
            coverImg.classList.remove('hidden');
        } else if (profile.cover_gradient) {
            const coverSection = document.getElementById('coverSection');
            const CATALOG = window.ProfileApp?.BANNER_CATALOG || {};
            const bannerDef = CATALOG[profile.cover_gradient];

            if (bannerDef?.isAnimated && bannerDef.preview) {
                // Animated banner with dedicated CSS class (e.g. founders, cat)
                const coverClass = bannerDef.preview.replace('-preview', '-cover');
                coverSection.className = coverSection.className.replace(/from-\S+/g, '').replace(/to-\S+/g, '').replace(/bg-gradient-to-\S+/g, '').trim();
                coverSection.innerHTML = '<div class="' + coverClass + '"></div>' + coverSection.innerHTML;
            } else {
                coverSection.className = coverSection.className.replace(/from-\S+/g, '').replace(/to-\S+/g, '').trim();
                coverSection.classList.add('bg-gradient-to-br', ...profile.cover_gradient.split(' '));
            }

            // Apply Lottie banner effect if available
            if (typeof LottieEffects !== 'undefined' && typeof window.ProfileApp !== 'undefined') {
                const bannerDef = window.ProfileApp.BANNER_CATALOG?.[profile.cover_gradient];
                if (bannerDef?.lottieEffect) {
                    LottieEffects.renderBannerEffect(coverSection, bannerDef.lottieEffect);
                }
            }
        }

        // Profile picture
        const fi = (profile.first_name || '')[0] || '';
        const li = (profile.last_name || '')[0] || '';
        const initials = (fi + li).toUpperCase() || '?';

        document.getElementById('profileInitials').textContent = initials;
        if (profile.profile_picture_url) {
            const pic = document.getElementById('profilePic');
            pic.src = profile.profile_picture_url;
            pic.classList.remove('hidden');
            document.getElementById('profileInitials').classList.add('hidden');
        }

        // Name + Bio
        document.getElementById('profileName').textContent = fullName;
        document.getElementById('profileBio').textContent = profile.bio || '';

        // Leadership title badge
        const ROLE_ICONS = {
            'President': '\ud83d\udc51', 'Vice President': '\u2b50', 'Treasurer': '\ud83d\udcb0',
            'Secretary': '\ud83d\udccb', 'Event Coordinator': '\ud83c\udf89'
        };
        const ROLE_COLORS = {
            'President': 'bg-amber-100 text-amber-700', 'Vice President': 'bg-blue-100 text-blue-700',
            'Treasurer': 'bg-emerald-100 text-emerald-700', 'Secretary': 'bg-purple-100 text-purple-700',
            'Event Coordinator': 'bg-pink-100 text-pink-700'
        };
        const titleBadgeEl = document.getElementById('profileTitleBadge');
        if (titleBadgeEl && profile.title && ROLE_ICONS[profile.title]) {
            const icon = ROLE_ICONS[profile.title];
            const colors = ROLE_COLORS[profile.title] || 'bg-gray-100 text-gray-600';
            titleBadgeEl.innerHTML = `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors}">${icon} ${profile.title}</span>`;
            titleBadgeEl.classList.remove('hidden');
        }

        // RBAC role chips
        const roleChipsEl = document.getElementById('profileRoleChips');
        if (roleChipsEl) {
            const { data: mr } = await supabaseClient
                .from('member_roles')
                .select('user_id, roles(id, name, color, icon, position)')
                .eq('user_id', S.viewingUserId)
                .order('roles(position)', { ascending: true });
            const roleChips = (mr || []).filter(r => r.roles).map(r => {
                const bg = r.roles.color ? `${r.roles.color}20` : '#e0e7ff';
                const fg = r.roles.color || '#4f46e5';
                return `<span class="inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full" style="background:${bg};color:${fg};border:1px solid ${fg}30">${r.roles.icon ? r.roles.icon + ' ' : ''}${r.roles.name}</span>`;
            }).join('');
            roleChipsEl.innerHTML = roleChips;
        }

        // Store profile data for About modal
        S._profileData = profile;

        // Badge overlay
        if (profile.displayed_badge && typeof buildNavBadgeOverlay === 'function') {
            document.getElementById('profileBadgeOverlay').innerHTML = buildNavBadgeOverlay(profile.displayed_badge);
            const overlay = document.getElementById('profileBadgeOverlay');
            const chip = overlay.querySelector('.badge-chip-overlay');
            if (chip) {
                chip.style.width = '28px';
                chip.style.height = '28px';
                chip.style.fontSize = '14px';
            }
        }

        // Badge Highlights (3 selected badges at bottom of banner)
        const highlights = profile.highlighted_badges || [];
        const hlContainer = document.getElementById('badgeHighlights');
        if (hlContainer && highlights.length > 0 && typeof BADGE_CATALOG !== 'undefined') {
            hlContainer.innerHTML = highlights.slice(0, 3).map(key => {
                const badge = BADGE_CATALOG[key] || { emoji: '🏅', name: key, rarity: 'common' };
                const rarity = badge.rarity || 'common';
                return `<div class="badge-highlight-chip badge-rarity-${rarity}" title="${badge.name}">${badge.emoji}</div>`;
            }).join('');
            hlContainer.classList.remove('hidden');

            // Apply Lottie effects to legendary/epic chips inside highlights
            if (typeof LottieEffects !== 'undefined') {
                setTimeout(() => {
                    hlContainer.querySelectorAll('.badge-rarity-legendary').forEach(el => {
                        LottieEffects.renderBadgeEffect(el, 'legendary');
                    });
                    hlContainer.querySelectorAll('.badge-rarity-epic').forEach(el => {
                        LottieEffects.renderBadgeEffect(el, 'epic');
                    });
                }, 150);
            }
        }

        // Show edit buttons for own profile
        if (S.isOwnProfile) {
            document.getElementById('editProfileBtn')?.classList.remove('hidden');
            document.getElementById('settingsGearBtn')?.classList.remove('hidden');
            document.getElementById('editCoverBtn')?.classList.remove('hidden');
            document.getElementById('picCameraOverlay')?.classList.remove('hidden');
            document.getElementById('profileNewPostBtn')?.classList.remove('hidden');
        }

        // Share button always visible (own or other's profile)
        document.getElementById('shareProfileBtn')?.classList.remove('hidden');

        // Load stats
        await window.ProfileApp.loadStats(profile);

        // Load badges
        await window.ProfileApp.loadBadges();

        // Load default tab content
        await window.ProfileApp.loadPostsGrid();

    } catch (err) {
        console.error('Error loading profile:', err);
    }
};

// ─── Stats ──────────────────────────────────────────────
window.ProfileApp.loadStats = async function loadStats(profile) {
    const S = window.ProfileApp.state;

    // Post count
    const { count: postCount } = await supabaseClient
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', S.viewingUserId);
    const posts = postCount || 0;
    const mp = document.getElementById('miniStatPosts');
    if (mp) mp.textContent = posts;

    // Badges earned count
    const { count: badgeCount } = await supabaseClient
        .from('member_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', S.viewingUserId);
    const badges = badgeCount || 0;
    const mb = document.getElementById('miniStatBadges');
    if (mb) mb.textContent = badges;

    // Streak (consecutive months contributed)
    const streak = profile.contribution_streak || 0;
    const ms = document.getElementById('miniStatStreak');
    if (ms) ms.textContent = streak;

    // Member Since
    if (profile.created_at) {
        const d = new Date(profile.created_at);
        const msBtn = document.getElementById('memberSinceText');
        if (msBtn) {
            const fullMonth = d.toLocaleString('en-US', { month: 'long' });
            msBtn.textContent = `Member since ${fullMonth} ${d.getFullYear()}`;
        }
    }
};

// ─── Apply Banner to Live Profile Page ──────────────────
window.ProfileApp.applyBannerToPage = function applyBannerToPage(gradientKey) {
    const coverSection = document.getElementById('coverSection');
    if (!coverSection) return;

    // Strip old gradient classes
    coverSection.className = coverSection.className
        .replace(/from-\S+/g, '').replace(/to-\S+/g, '').replace(/bg-gradient-to-\S+/g, '').trim();

    // Remove old animated background layers (both -preview and -cover variants)
    coverSection.querySelectorAll('[class*="-banner-preview"], [class*="-banner-cover"]').forEach(el => el.remove());
    // Remove old Lottie overlay injected by LottieEffects.renderBannerEffect
    coverSection.querySelectorAll('.lottie-banner-overlay').forEach(el => el.remove());

    if (!gradientKey) {
        coverSection.classList.add('bg-gradient-to-br', 'from-brand-500', 'to-brand-700');
        return;
    }

    const CATALOG = window.ProfileApp.BANNER_CATALOG || {};
    const def = CATALOG[gradientKey];

    if (def?.isAnimated && def.preview) {
        // Use the -cover variant for the full-height profile banner
        const coverClass = def.preview.replace('-preview', '-cover');
        const layer = document.createElement('div');
        layer.className = coverClass + ' absolute inset-0';
        coverSection.insertAdjacentElement('afterbegin', layer);
        if (def.lottieEffect && typeof LottieEffects !== 'undefined') {
            LottieEffects.renderBannerEffect(coverSection, def.lottieEffect);
        }
    } else {
        const grad = def?.gradient || gradientKey;
        coverSection.classList.add('bg-gradient-to-br', ...grad.split(' '));
        if (def?.lottieEffect && typeof LottieEffects !== 'undefined') {
            LottieEffects.renderBannerEffect(coverSection, def.lottieEffect);
        }
    }
};
