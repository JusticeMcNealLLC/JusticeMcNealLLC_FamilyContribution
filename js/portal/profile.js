// ═══════════════════════════════════════════════════════════
// Profile JS — Member Profiles (Phase 4B)
// ═══════════════════════════════════════════════════════════

let profileUser = null;   // logged-in user
let viewingUserId = null; // profile being viewed
let isOwnProfile = false;

document.addEventListener('DOMContentLoaded', async () => {
    profileUser = await checkAuth();
    if (!profileUser) return;

    // Determine which profile to show
    const params = new URLSearchParams(window.location.search);
    viewingUserId = params.get('id') || profileUser.id;
    isOwnProfile = viewingUserId === profileUser.id;

    // Load the profile
    await loadProfile();

    // Set up tabs
    setupTabs();

    // Set up edit bio modal
    if (isOwnProfile) setupEditBio();

    // Set up cover photo upload
    if (isOwnProfile) setupCoverPhoto();
});

// ─── Load Profile Data ──────────────────────────────────
async function loadProfile() {
    try {
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', viewingUserId)
            .single();

        if (error || !profile) {
            document.querySelector('main').innerHTML = '<div class="py-16 text-center"><h2 class="text-lg font-bold text-gray-900">Profile not found</h2><a href="feed.html" class="text-sm text-brand-600 hover:underline mt-2 inline-block">Back to Feed</a></div>';
            return;
        }

        // Privacy check
        if (profile.profile_visibility === 'private' && !isOwnProfile) {
            const { data: viewer } = await supabaseClient.from('profiles').select('role').eq('id', profileUser.id).single();
            if (viewer?.role !== 'admin') {
                document.querySelector('main').innerHTML = '<div class="py-16 text-center"><div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg></div><h2 class="text-lg font-bold text-gray-900">Private Profile</h2><p class="text-sm text-gray-500 mt-1">This member\'s profile is private.</p></div>';
                return;
            }
        }

        // Set page title
        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Member';
        document.title = `${fullName} | Justice McNeal LLC`;

        // Cover photo
        if (profile.cover_photo_url) {
            const coverImg = document.getElementById('coverImage');
            coverImg.src = profile.cover_photo_url;
            coverImg.classList.remove('hidden');
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

        // Badge overlay
        if (profile.displayed_badge && typeof buildNavBadgeOverlay === 'function') {
            document.getElementById('profileBadgeOverlay').innerHTML = buildNavBadgeOverlay(profile.displayed_badge);
            // Make the overlay bigger for profile
            const overlay = document.getElementById('profileBadgeOverlay');
            const chip = overlay.querySelector('.badge-chip-overlay');
            if (chip) {
                chip.style.width = '28px';
                chip.style.height = '28px';
                chip.style.fontSize = '14px';
            }
        }

        // Show edit buttons for own profile
        if (isOwnProfile) {
            document.getElementById('editProfileBtn')?.classList.remove('hidden');
            document.getElementById('settingsGearBtn')?.classList.remove('hidden');
            document.getElementById('editCoverBtn')?.classList.remove('hidden');
        }

        // Load stats
        await loadStats(profile);

        // Load badges
        await loadBadges();

        // Load default tab content
        await loadPostsGrid();

    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

// ─── Stats ──────────────────────────────────────────────
async function loadStats(profile) {
    // Post count
    const { count: postCount } = await supabaseClient
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', viewingUserId);
    document.getElementById('statPosts').textContent = postCount || 0;

    // Badges earned count
    const { count: badgeCount } = await supabaseClient
        .from('member_badges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', viewingUserId);
    document.getElementById('statBadges').textContent = badgeCount || 0;

    // Streak (consecutive months contributed)
    document.getElementById('statStreak').textContent = profile.contribution_streak || 0;

    // Member Since
    if (profile.created_at) {
        const d = new Date(profile.created_at);
        const month = d.toLocaleString('en-US', { month: 'short' });
        const year = d.getFullYear().toString().slice(-2);
        document.getElementById('statMemberSince').textContent = `${month} '${year}`;
    }
}

// ─── Badges ─────────────────────────────────────────────
async function loadBadges() {
    const { data: badges } = await supabaseClient
        .from('member_badges')
        .select('badge_key, earned_at')
        .eq('user_id', viewingUserId)
        .order('earned_at', { ascending: false });

    if (!badges || badges.length === 0) return;

    const section = document.getElementById('badgesSection');
    const grid = document.getElementById('badgesGrid');
    section.classList.remove('hidden');

    // Use BADGE_CATALOG from quests/config.js if available
    grid.innerHTML = badges.map(b => {
        const badge = (typeof BADGE_CATALOG !== 'undefined' && BADGE_CATALOG[b.badge_key]) || { emoji: '🏅', name: b.badge_key, rarity: 'common' };
        return `<div class="badge-chip badge-rarity-${badge.rarity || 'common'} w-10 h-10 text-lg" title="${badge.name}">${badge.emoji}</div>`;
    }).join('');
}

// ─── Posts Grid (Instagram 3-column) ────────────────────
async function loadPostsGrid() {
    const { data: posts } = await supabaseClient
        .from('posts')
        .select(`
            id, content, post_type, created_at,
            images:post_images(image_url, sort_order),
            likes:post_likes(count),
            comments:post_comments(count)
        `)
        .eq('author_id', viewingUserId)
        .order('created_at', { ascending: false });

    const grid = document.getElementById('postsGrid');
    const empty = document.getElementById('postsGridEmpty');

    if (!posts || posts.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');

    grid.innerHTML = posts.map(post => {
        const images = (post.images || []).sort((a, b) => a.sort_order - b.sort_order);
        const firstImage = images[0]?.image_url;
        const likeCount = post.likes?.[0]?.count || 0;
        const commentCount = post.comments?.[0]?.count || 0;

        if (firstImage) {
            return `
                <a href="feed.html#post-${post.id}" class="relative aspect-square bg-gray-100 overflow-hidden group cursor-pointer">
                    <img src="${firstImage}" class="w-full h-full object-cover" alt="" loading="lazy">
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div class="flex items-center gap-4 text-white text-sm font-semibold">
                            <span class="flex items-center gap-1">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                ${likeCount}
                            </span>
                            <span class="flex items-center gap-1">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                ${commentCount}
                            </span>
                        </div>
                    </div>
                    ${images.length > 1 ? '<div class="absolute top-2 right-2"><svg class="w-4 h-4 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z"></path></svg></div>' : ''}
                </a>`;
        } else {
            // Text-only post: show content in a colored card
            return `
                <a href="feed.html#post-${post.id}" class="relative aspect-square bg-gradient-to-br from-brand-500 to-brand-700 overflow-hidden flex items-center justify-center p-3 cursor-pointer group">
                    <p class="text-white text-xs text-center line-clamp-4 leading-relaxed">${(post.content || '').slice(0, 100)}</p>
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div class="flex items-center gap-4 text-white text-sm font-semibold">
                            <span class="flex items-center gap-1">❤️ ${likeCount}</span>
                            <span class="flex items-center gap-1">💬 ${commentCount}</span>
                        </div>
                    </div>
                </a>`;
        }
    }).join('');
}

// ─── Profile Feed (Chronological list) ──────────────────
async function loadProfileFeed() {
    const { data: posts } = await supabaseClient
        .from('posts')
        .select(`
            *,
            author:profiles!posts_author_id_fkey(id, first_name, last_name, profile_picture_url, displayed_badge),
            images:post_images(id, image_url, sort_order),
            likes:post_likes(id, user_id, reaction),
            comments:post_comments(count),
            bookmarks:post_bookmarks(id, user_id)
        `)
        .eq('author_id', viewingUserId)
        .order('created_at', { ascending: false })
        .limit(20);

    const list = document.getElementById('profileFeedList');
    const empty = document.getElementById('profileFeedEmpty');

    if (!posts || posts.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');

    // Reuse feed.js renderPostCard if available, otherwise simple render
    if (typeof renderPostCard === 'function') {
        list.innerHTML = posts.map(p => renderPostCard(p)).join('');
        if (typeof wirePostActions === 'function') wirePostActions();
    } else {
        list.innerHTML = posts.map(p => {
            const timeAgo = getProfileTimeAgo(p.created_at);
            const images = (p.images || []).sort((a, b) => a.sort_order - b.sort_order);
            let imgHtml = '';
            if (images.length > 0) {
                imgHtml = `<img src="${images[0].image_url}" class="w-full rounded-xl mt-3" alt="" loading="lazy">`;
            }
            return `<div class="bg-white border-b sm:border sm:rounded-2xl p-4 sm:p-5">
                <p class="text-xs text-gray-400 mb-2">${timeAgo}</p>
                ${p.content ? `<p class="text-sm text-gray-800 whitespace-pre-wrap">${p.content}</p>` : ''}
                ${imgHtml}
            </div>`;
        }).join('');
    }
}

// ─── Milestones Timeline ────────────────────────────────
async function loadMilestonesTab() {
    const timeline = document.getElementById('milestonesTimeline');
    const empty = document.getElementById('milestonesEmpty');

    // Load badges earned
    const { data: badges } = await supabaseClient
        .from('member_badges')
        .select('badge_key, earned_at')
        .eq('user_id', viewingUserId)
        .order('earned_at', { ascending: false });

    // Load quest completions
    const { data: quests } = await supabaseClient
        .from('member_quests')
        .select('quest_id, completed_at, quest:quests(title, emoji)')
        .eq('user_id', viewingUserId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

    const items = [];

    (badges || []).forEach(b => {
        const badge = (typeof BADGE_CATALOG !== 'undefined' && BADGE_CATALOG[b.badge_key]) || { emoji: '🏅', name: b.badge_key };
        items.push({
            date: b.earned_at,
            emoji: badge.emoji,
            title: badge.name,
            subtitle: 'Badge earned',
            color: 'amber',
        });
    });

    (quests || []).forEach(q => {
        items.push({
            date: q.completed_at,
            emoji: q.quest?.emoji || '✅',
            title: q.quest?.title || 'Quest',
            subtitle: 'Quest completed',
            color: 'emerald',
        });
    });

    // Sort by date
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (items.length === 0) {
        timeline.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');

    timeline.innerHTML = items.map(item => `
        <div class="flex items-start gap-3 bg-white rounded-xl border border-gray-200/80 p-4">
            <div class="w-10 h-10 rounded-xl bg-${item.color}-100 flex items-center justify-center text-lg flex-shrink-0">${item.emoji}</div>
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900 text-sm">${item.title}</p>
                <p class="text-xs text-gray-500">${item.subtitle}</p>
            </div>
            <span class="text-xs text-gray-400 flex-shrink-0">${getProfileTimeAgo(item.date)}</span>
        </div>
    `).join('');
}

// ─── Tabs ───────────────────────────────────────────────
function setupTabs() {
    const tabs = document.querySelectorAll('.profile-tab');
    const tabContents = {
        posts: document.getElementById('tabPosts'),
        feed: document.getElementById('tabFeed'),
        milestones: document.getElementById('tabMilestones'),
    };

    let loadedTabs = { posts: true };

    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            // Deactivate all
            tabs.forEach(t => {
                t.classList.remove('active');
                t.classList.remove('text-gray-900', 'border-gray-900');
                t.classList.add('text-gray-400', 'border-transparent');
            });
            // Activate clicked
            tab.classList.add('active');
            tab.classList.remove('text-gray-400', 'border-transparent');
            tab.classList.add('text-gray-900', 'border-gray-900');

            // Show content
            Object.values(tabContents).forEach(c => c?.classList.add('hidden'));
            const target = tab.dataset.tab;
            tabContents[target]?.classList.remove('hidden');

            // Lazy load
            if (!loadedTabs[target]) {
                loadedTabs[target] = true;
                if (target === 'feed') await loadProfileFeed();
                if (target === 'milestones') await loadMilestonesTab();
            }
        });
    });

    // Style initial active tab
    const firstTab = tabs[0];
    if (firstTab) {
        firstTab.classList.add('text-gray-900', 'border-gray-900');
    }
    tabs.forEach(t => {
        if (!t.classList.contains('active')) {
            t.classList.add('text-gray-400', 'border-transparent');
        }
    });
}

// ─── Edit Bio ───────────────────────────────────────────
function setupEditBio() {
    const editBtn = document.getElementById('editProfileBtn');
    const modal = document.getElementById('editBioModal');
    const backdrop = document.getElementById('editBioBackdrop');
    const cancelBtn = document.getElementById('editBioCancelBtn');
    const saveBtn = document.getElementById('editBioSaveBtn');
    const input = document.getElementById('editBioInput');
    const charCount = document.getElementById('bioCharCount');

    if (!editBtn || !modal) return;

    editBtn.addEventListener('click', () => {
        input.value = document.getElementById('profileBio').textContent || '';
        charCount.textContent = `${input.value.length} / 200`;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        input.focus();
    });

    input.addEventListener('input', () => {
        charCount.textContent = `${input.value.length} / 200`;
    });

    function close() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    backdrop.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);

    saveBtn.addEventListener('click', async () => {
        const bio = input.value.trim();
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const { error } = await supabaseClient
            .from('profiles')
            .update({ bio })
            .eq('id', profileUser.id);

        if (!error) {
            document.getElementById('profileBio').textContent = bio;
            close();
        } else {
            alert('Failed to save bio');
        }
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    });
}

// ─── Cover Photo Upload ─────────────────────────────────
function setupCoverPhoto() {
    const editBtn = document.getElementById('editCoverBtn');
    const input = document.getElementById('coverPhotoInput');

    if (!editBtn || !input) return;

    editBtn.addEventListener('click', () => input.click());

    input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        editBtn.textContent = 'Uploading...';
        editBtn.disabled = true;

        try {
            const ext = file.name.split('.').pop();
            const path = `${profileUser.id}/cover.${ext}`;

            const { error: uploadErr } = await supabaseClient.storage
                .from('cover-photos')
                .upload(path, file, { contentType: file.type, upsert: true });

            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabaseClient.storage
                .from('cover-photos')
                .getPublicUrl(path);

            // Add cache-buster
            const url = publicUrl + '?t=' + Date.now();

            await supabaseClient
                .from('profiles')
                .update({ cover_photo_url: publicUrl })
                .eq('id', profileUser.id);

            const coverImg = document.getElementById('coverImage');
            coverImg.src = url;
            coverImg.classList.remove('hidden');

        } catch (err) {
            console.error('Cover photo error:', err);
            alert('Failed to upload cover photo');
        }

        editBtn.textContent = '📷 Edit Cover';
        editBtn.disabled = false;
    });
}

// ─── Utility ────────────────────────────────────────────
function getProfileTimeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
