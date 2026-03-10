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
            if (profile.cover_gradient === 'founders-animated') {
                coverSection.className = coverSection.className.replace(/from-\S+/g, '').replace(/to-\S+/g, '').replace(/bg-gradient-to-\S+/g, '').trim();
                coverSection.innerHTML = '<div class="founders-banner-cover"></div>' + coverSection.innerHTML;
            } else {
                coverSection.className = coverSection.className.replace(/from-\S+/g, '').replace(/to-\S+/g, '').trim();
                coverSection.classList.add('bg-gradient-to-br', ...profile.cover_gradient.split(' '));
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
