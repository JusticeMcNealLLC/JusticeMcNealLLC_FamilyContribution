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

    // Set up edit profile modal (bio + photo + badge)
    if (isOwnProfile) setupEditProfile();

    // Set up cover photo upload
    if (isOwnProfile) setupCoverPhoto();

    // Set up profile pic quick-upload
    if (isOwnProfile) setupProfilePicUpload();
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

        // Cover photo or gradient
        if (profile.cover_photo_url) {
            const coverImg = document.getElementById('coverImage');
            coverImg.src = profile.cover_photo_url;
            coverImg.classList.remove('hidden');
        } else if (profile.cover_gradient) {
            const coverSection = document.getElementById('coverSection');
            if (profile.cover_gradient === 'founders-animated') {
                // Animated founders gold banner
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
            document.getElementById('picCameraOverlay')?.classList.remove('hidden');
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

// ─── Badges & Banners (Cosmetics) ───────────────────────
let earnedBadgeKeys = [];
let currentDisplayedBadge = null;
let currentBannerGradient = null;
let currentBannerPhotoUrl = null;

// Banner presets catalog (gradient-based banners awarded as rewards)
const BANNER_CATALOG = {
    'founders-animated': { name: 'Founders Gold', preview: 'founders-banner-preview', isAnimated: true },
    'from-blue-500 to-purple-600': { name: 'Twilight', gradient: 'from-blue-500 to-purple-600' },
    'from-emerald-500 to-teal-600': { name: 'Emerald Wave', gradient: 'from-emerald-500 to-teal-600' },
    'from-rose-500 to-pink-600': { name: 'Rose Gold', gradient: 'from-rose-500 to-pink-600' },
    'from-amber-500 to-orange-600': { name: 'Sunset', gradient: 'from-amber-500 to-orange-600' },
    'from-violet-500 to-indigo-600': { name: 'Cosmic Purple', gradient: 'from-violet-500 to-indigo-600' },
    'from-cyan-500 to-blue-600': { name: 'Ocean Breeze', gradient: 'from-cyan-500 to-blue-600' },
};

async function loadBadges() {
    const { data: badges } = await supabaseClient
        .from('member_badges')
        .select('badge_key, earned_at')
        .eq('user_id', viewingUserId)
        .order('earned_at', { ascending: false });

    // Get current displayed badge + banner info
    const { data: prof } = await supabaseClient
        .from('profiles')
        .select('displayed_badge, cover_gradient, cover_photo_url')
        .eq('id', viewingUserId)
        .single();
    currentDisplayedBadge = prof?.displayed_badge || null;
    currentBannerGradient = prof?.cover_gradient || null;
    currentBannerPhotoUrl = prof?.cover_photo_url || null;

    earnedBadgeKeys = (badges || []).map(b => b.badge_key);

    const hasBadges = badges && badges.length > 0;
    const hasBanner = currentBannerGradient || currentBannerPhotoUrl;

    if (!hasBadges && !hasBanner) return;

    const section = document.getElementById('badgesSection');
    const grid = document.getElementById('badgesGrid');
    section.classList.remove('hidden');

    if (hasBadges) {
        // Render earned badges with equip ability for own profile
        grid.innerHTML = badges.map(b => {
            const badge = (typeof BADGE_CATALOG !== 'undefined' && BADGE_CATALOG[b.badge_key]) || { emoji: '🏅', name: b.badge_key, rarity: 'common' };
            const isEquipped = currentDisplayedBadge === b.badge_key;
            const equipClass = isOwnProfile ? 'cursor-pointer hover:scale-110 transition-transform' : '';
            const ringClass = isEquipped ? 'ring-2 ring-brand-500 ring-offset-2' : '';
            return `<div class="badge-chip badge-rarity-${badge.rarity || 'common'} w-10 h-10 text-lg ${equipClass} ${ringClass}" title="${badge.name}${isOwnProfile ? (isEquipped ? ' (equipped — tap to unequip)' : ' — tap to equip') : ''}" data-badge-key="${b.badge_key}" role="${isOwnProfile ? 'button' : 'img'}">${badge.emoji}</div>`;
        }).join('');

        // Wire up badge equip clicks (own profile only)
        if (isOwnProfile) {
            grid.querySelectorAll('[data-badge-key]').forEach(chip => {
                chip.addEventListener('click', () => equipBadge(chip.dataset.badgeKey));
            });

            // Show "View Collection" button
            const collBtn = document.getElementById('toggleBadgeCollectionBtn');
            if (collBtn) {
                collBtn.classList.remove('hidden');
                collBtn.addEventListener('click', toggleBadgeCollection);
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
            if (currentBannerPhotoUrl) {
                bannerHtml = `<div class="rounded-xl overflow-hidden h-14 ring-2 ring-brand-500 ring-offset-1"><img src="${currentBannerPhotoUrl}" class="w-full h-full object-cover" alt="Banner"></div>`;
            } else if (currentBannerGradient === 'founders-animated') {
                bannerHtml = `<div class="relative rounded-xl overflow-hidden h-14 ring-2 ring-brand-500 ring-offset-1"><div class="founders-banner-preview w-full h-full"></div></div>`;
            } else if (currentBannerGradient) {
                bannerHtml = `<div class="rounded-xl overflow-hidden h-14 ring-2 ring-brand-500 ring-offset-1"><div class="w-full h-full bg-gradient-to-r ${currentBannerGradient}"></div></div>`;
            }
            earnedGrid.innerHTML = bannerHtml;
        }
    }
}

async function equipBadge(badgeKey) {
    const newBadge = (badgeKey === currentDisplayedBadge) ? null : badgeKey;

    const { error } = await supabaseClient
        .from('profiles')
        .update({ displayed_badge: newBadge })
        .eq('id', profileUser.id);

    if (error) { console.error('Equip error:', error); return; }

    currentDisplayedBadge = newBadge;

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
    refreshBadgeRings();
    refreshCollectionRings();
    refreshEditModalBadgePicker();
}

function refreshBadgeRings() {
    const grid = document.getElementById('badgesGrid');
    if (!grid) return;
    grid.querySelectorAll('[data-badge-key]').forEach(chip => {
        const isEq = chip.dataset.badgeKey === currentDisplayedBadge;
        chip.classList.toggle('ring-2', isEq);
        chip.classList.toggle('ring-brand-500', isEq);
        chip.classList.toggle('ring-offset-2', isEq);
        const badge = (typeof BADGE_CATALOG !== 'undefined' && BADGE_CATALOG[chip.dataset.badgeKey]) || { name: chip.dataset.badgeKey };
        chip.title = badge.name + (isEq ? ' (equipped — tap to unequip)' : ' — tap to equip');
    });
}

function refreshCollectionRings() {
    const grid = document.getElementById('badgeCollectionGrid');
    if (!grid) return;
    grid.querySelectorAll('[data-badge-key]').forEach(card => {
        const isEq = card.dataset.badgeKey === currentDisplayedBadge;
        card.classList.toggle('ring-2', isEq);
        card.classList.toggle('ring-brand-500', isEq);
    });
}

function toggleBadgeCollection() {
    const panel = document.getElementById('badgeCollectionPanel');
    const btn = document.getElementById('toggleBadgeCollectionBtn');
    if (!panel) return;

    const showing = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    btn.textContent = showing ? 'View Collection' : 'Hide Collection';

    if (!showing) renderBadgeCollection();
}

function renderBadgeCollection() {
    const grid = document.getElementById('badgeCollectionGrid');
    if (!grid || typeof BADGE_CATALOG === 'undefined') return;

    grid.innerHTML = Object.entries(BADGE_CATALOG).map(([key, badge]) => {
        const earned = earnedBadgeKeys.includes(key);
        const isEquipped = currentDisplayedBadge === key;
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
        card.addEventListener('click', () => equipBadge(card.dataset.badgeKey));
    });
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

    // Filter to only posts with images
    const photoPosts = posts.filter(post => {
        const images = (post.images || []).sort((a, b) => a.sort_order - b.sort_order);
        return images.length > 0 && images[0]?.image_url;
    });

    if (photoPosts.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    grid.innerHTML = photoPosts.map(post => {
        const images = (post.images || []).sort((a, b) => a.sort_order - b.sort_order);
        const firstImage = images[0].image_url;
        const likeCount = post.likes?.[0]?.count || 0;
        const commentCount = post.comments?.[0]?.count || 0;

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
    }).join('');
}

// ─── Profile Feed (Twitter-style text posts) ───────────
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
        .limit(30);

    const list = document.getElementById('profileFeedList');
    const empty = document.getElementById('profileFeedEmpty');

    if (!posts || posts.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');

    // Twitter-style: render each post as a compact text card
    const author = posts[0]?.author || {};
    const authorName = [author.first_name, author.last_name].filter(Boolean).join(' ') || 'Member';
    const authorPic = author.profile_picture_url;
    const authorInitial = ((author.first_name || '')[0] || '?').toUpperCase();

    list.innerHTML = posts.map(post => {
        const timeAgo = getProfileTimeAgo(post.created_at);
        const likeCount = post.likes?.length || 0;
        const commentCount = post.comments?.[0]?.count || 0;
        const images = (post.images || []).sort((a, b) => a.sort_order - b.sort_order);
        const hasImage = images.length > 0 && images[0]?.image_url;

        // Mini image thumbnail if post has media
        const thumbHtml = hasImage
            ? `<div class="mt-2.5 rounded-xl overflow-hidden border border-gray-200"><img src="${images[0].image_url}" class="w-full max-h-64 object-cover" alt="" loading="lazy"></div>`
            : '';

        return `
            <a href="feed.html#post-${post.id}" class="block px-4 py-3 hover:bg-gray-50 transition cursor-pointer">
                <div class="flex gap-3">
                    <!-- Avatar -->
                    <div class="flex-shrink-0">
                        ${authorPic
                            ? `<img src="${authorPic}" class="w-10 h-10 rounded-full object-cover" alt="">`
                            : `<div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center"><span class="text-brand-600 text-sm font-bold">${authorInitial}</span></div>`
                        }
                    </div>
                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-bold text-sm text-gray-900">${authorName}</span>
                            <span class="text-xs text-gray-400">&middot;</span>
                            <span class="text-xs text-gray-400">${timeAgo}</span>
                        </div>
                        ${post.content ? `<p class="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap break-words">${post.content}</p>` : ''}
                        ${thumbHtml}
                        <!-- Engagement row -->
                        <div class="flex items-center gap-5 mt-2 text-gray-400">
                            <span class="flex items-center gap-1 text-xs hover:text-red-500 transition">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                ${likeCount || ''}
                            </span>
                            <span class="flex items-center gap-1 text-xs hover:text-brand-500 transition">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
                                ${commentCount || ''}
                            </span>
                        </div>
                    </div>
                </div>
            </a>`;
    }).join('');
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

// ─── Profile Pic Quick Upload (tap avatar) ──────────────
function setupProfilePicUpload() {
    const wrap = document.getElementById('profilePicWrap');
    const input = document.getElementById('profilePicInput');
    if (!wrap || !input) return;

    wrap.addEventListener('click', () => input.click());
    wrap.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.click(); });

    input.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadProfilePic(file);
        input.value = '';
    });
}

async function uploadProfilePic(file) {
    if (file.size > 2 * 1024 * 1024) {
        alert('Image must be under 2 MB');
        return;
    }

    try {
        const ext = file.name.split('.').pop();
        const path = `${profileUser.id}/avatar.${ext}`;

        const { error: upErr } = await supabaseClient.storage
            .from('profile-pictures')
            .upload(path, file, { contentType: file.type, upsert: true });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabaseClient.storage
            .from('profile-pictures')
            .getPublicUrl(path);

        const url = publicUrl + '?t=' + Date.now();

        await supabaseClient
            .from('profiles')
            .update({ profile_picture_url: publicUrl })
            .eq('id', profileUser.id);

        // Update main avatar
        const pic = document.getElementById('profilePic');
        pic.src = url;
        pic.classList.remove('hidden');
        document.getElementById('profileInitials').classList.add('hidden');

        // Also update the edit modal avatar if it exists
        const modalPic = document.getElementById('editModalPic');
        if (modalPic) {
            modalPic.src = url;
            modalPic.classList.remove('hidden');
            document.getElementById('editModalInitials')?.classList.add('hidden');
        }
    } catch (err) {
        console.error('Profile pic upload error:', err);
        alert('Failed to upload profile picture');
    }
}

// ─── Edit Profile (Bio + Photo + Badge) ─────────────────
function setupEditProfile() {
    const editBtn = document.getElementById('editProfileBtn');
    const modal = document.getElementById('editBioModal');
    const backdrop = document.getElementById('editBioBackdrop');
    const cancelBtn = document.getElementById('editBioCancelBtn');
    const saveBtn = document.getElementById('editBioSaveBtn');
    const input = document.getElementById('editBioInput');
    const charCount = document.getElementById('bioCharCount');

    if (!editBtn || !modal) return;

    // Photo change inside modal
    const modalAvatar = document.getElementById('editModalAvatar');
    const modalPicInput = document.getElementById('editModalPicInput');
    const changePhotoBtn = document.getElementById('editModalChangePhotoBtn');

    if (modalAvatar && modalPicInput) {
        modalAvatar.addEventListener('click', () => modalPicInput.click());
        changePhotoBtn?.addEventListener('click', () => modalPicInput.click());
        modalPicInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await uploadProfilePic(file);
            modalPicInput.value = '';
        });
    }

    editBtn.addEventListener('click', () => {
        // Populate bio
        input.value = document.getElementById('profileBio').textContent || '';
        charCount.textContent = `${input.value.length} / 200`;

        // Populate modal avatar
        const mainPic = document.getElementById('profilePic');
        const modalPic = document.getElementById('editModalPic');
        const modalInitials = document.getElementById('editModalInitials');
        if (mainPic && !mainPic.classList.contains('hidden')) {
            modalPic.src = mainPic.src;
            modalPic.classList.remove('hidden');
            modalInitials?.classList.add('hidden');
        } else {
            modalPic.classList.add('hidden');
            modalInitials.textContent = document.getElementById('profileInitials')?.textContent || '?';
            modalInitials?.classList.remove('hidden');
        }

        // Populate badge picker
        populateEditModalBadgePicker();

        // Populate banner section
        populateEditModalBanner();

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

        // Get selected badge from modal picker
        const selectedBadge = modal.querySelector('.edit-badge-option.ring-brand-500')?.dataset.badge ?? currentDisplayedBadge;

        const updates = { bio };
        if (selectedBadge !== undefined) {
            updates.displayed_badge = selectedBadge || null;
        }

        const { error } = await supabaseClient
            .from('profiles')
            .update(updates)
            .eq('id', profileUser.id);

        if (!error) {
            document.getElementById('profileBio').textContent = bio;

            // If badge changed, update overlay
            if (updates.displayed_badge !== undefined && updates.displayed_badge !== currentDisplayedBadge) {
                currentDisplayedBadge = updates.displayed_badge;
                const overlay = document.getElementById('profileBadgeOverlay');
                if (currentDisplayedBadge && typeof buildNavBadgeOverlay === 'function') {
                    overlay.innerHTML = buildNavBadgeOverlay(currentDisplayedBadge);
                    const chip = overlay.querySelector('.badge-chip-overlay');
                    if (chip) { chip.style.width = '28px'; chip.style.height = '28px'; chip.style.fontSize = '14px'; }
                } else {
                    overlay.innerHTML = '';
                }
                refreshBadgeRings();
                refreshCollectionRings();
            }
            close();
        } else {
            alert('Failed to save profile');
        }
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    });
}

function populateEditModalBadgePicker() {
    const picker = document.getElementById('editModalBadgePicker');
    if (!picker) return;

    // Keep the "None" button, add earned badges
    const noneBtnHtml = `<button data-badge="" class="edit-badge-option w-10 h-10 rounded-full border-2 ${!currentDisplayedBadge ? 'border-brand-500 ring-2 ring-brand-500' : 'border-gray-200'} flex items-center justify-center text-xs text-gray-400 hover:border-gray-400 transition" title="No badge">✕</button>`;

    const badgeBtns = earnedBadgeKeys.map(key => {
        const badge = (typeof BADGE_CATALOG !== 'undefined' && BADGE_CATALOG[key]) || { emoji: '🏅', name: key, rarity: 'common' };
        const isEq = currentDisplayedBadge === key;
        return `<button data-badge="${key}" class="edit-badge-option badge-chip badge-rarity-${badge.rarity || 'common'} w-10 h-10 text-lg ${isEq ? 'ring-2 ring-brand-500 ring-offset-2' : ''}" title="${badge.name}">${badge.emoji}</button>`;
    }).join('');

    picker.innerHTML = noneBtnHtml + badgeBtns;

    // Wire clicks
    picker.querySelectorAll('.edit-badge-option').forEach(btn => {
        btn.addEventListener('click', () => {
            picker.querySelectorAll('.edit-badge-option').forEach(b => {
                b.classList.remove('ring-2', 'ring-brand-500', 'ring-offset-2', 'border-brand-500');
                if (b.dataset.badge === '') b.classList.add('border-gray-200');
            });
            btn.classList.add('ring-2', 'ring-brand-500');
            if (btn.dataset.badge === '') {
                btn.classList.remove('border-gray-200');
                btn.classList.add('border-brand-500');
            } else {
                btn.classList.add('ring-offset-2');
            }
        });
    });
}

function refreshEditModalBadgePicker() {
    const picker = document.getElementById('editModalBadgePicker');
    if (!picker) return;
    picker.querySelectorAll('.edit-badge-option').forEach(btn => {
        const isEq = (btn.dataset.badge || null) === (currentDisplayedBadge || null);
        btn.classList.toggle('ring-2', isEq);
        btn.classList.toggle('ring-brand-500', isEq);
        if (btn.dataset.badge === '') {
            btn.classList.toggle('border-brand-500', isEq);
            btn.classList.toggle('border-gray-200', !isEq);
        } else {
            btn.classList.toggle('ring-offset-2', isEq);
        }
    });
}

// ─── Cover Photo / Banner — Reward-Only (no user picker) ──
// Banners are granted as rewards (like badges), not user-selectable.
// The display logic below still renders any assigned banner.
function setupCoverPhoto() {
    // No user-facing edit UI — banners are reward-only
    return;
}

function populateEditModalBanner() {
    const section = document.getElementById('editBannerSection');
    const preview = document.getElementById('editBannerPreview');
    const previewImg = document.getElementById('editBannerPreviewImg');

    if (!section || !preview) return;

    const hasCustomPhoto = !!currentBannerPhotoUrl;
    const hasGradient = !!currentBannerGradient;

    if (!hasCustomPhoto && !hasGradient) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    // Show the current banner preview
    if (hasCustomPhoto) {
        previewImg.src = currentBannerPhotoUrl;
        previewImg.classList.remove('hidden');
        preview.className = 'w-full h-20 rounded-xl mb-2 overflow-hidden';
    } else if (currentBannerGradient === 'founders-animated') {
        previewImg.classList.add('hidden');
        preview.className = 'w-full h-20 rounded-xl mb-2 overflow-hidden relative';
        preview.innerHTML = '<div class="founders-banner-preview w-full h-full"></div><img id="editBannerPreviewImg" class="w-full h-full object-cover hidden" alt="">';
    } else if (currentBannerGradient) {
        previewImg.classList.add('hidden');
        preview.className = `w-full h-20 rounded-xl mb-2 overflow-hidden bg-gradient-to-r ${currentBannerGradient}`;
    }

    // Show banner name if known
    const bannerInfo = BANNER_CATALOG[currentBannerGradient];
    const picker = document.getElementById('editModalBannerPicker');
    if (picker) {
        picker.innerHTML = `<p class="col-span-3 text-xs text-gray-500 text-center py-1">${bannerInfo ? '🎨 ' + bannerInfo.name : '🎨 Custom Banner'} <span class="text-gray-400">(reward-only)</span></p>`;
    }
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
