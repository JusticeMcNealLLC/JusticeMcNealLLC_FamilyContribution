// ═══════════════════════════════════════════════════════════
// Feed JS — Social Feed (Phase 4A)
// ═══════════════════════════════════════════════════════════

let feedUser = null;
let feedProfile = null;
let feedPosts = [];
let feedPage = 0;
const FEED_PAGE_SIZE = 15;
let feedLoading = false;
let feedHasMore = true;
let activeFilter = 'all';
let currentDetailPostId = null;
let replyingToCommentId = null;
let isAdmin = false;

// ─── Initialization ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    feedUser = await checkAuth();
    if (!feedUser) return;

    // Load profile for composer avatar
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name, profile_picture_url, role')
        .eq('id', feedUser.id)
        .single();

    feedProfile = profile;
    isAdmin = profile?.role === 'admin';

    // Set composer avatars
    setComposerAvatars(profile);

    // Show admin-only buttons
    if (isAdmin) {
        const announcementBtn = document.getElementById('announcementQuickBtn');
        if (announcementBtn) announcementBtn.style.display = '';
        const adminToggle = document.getElementById('composerAdminToggle');
        if (adminToggle) adminToggle.classList.remove('hidden');
    }

    // Wire up event listeners
    setupComposer();
    setupFilters();
    setupPostDetail();
    setupInfiniteScroll();

    // Load initial feed
    await loadFeed();
});

// ─── Composer Setup ─────────────────────────────────────
function setComposerAvatars(profile) {
    const fi = (profile?.first_name || '')[0] || '';
    const li = (profile?.last_name || '')[0] || '';
    const initials = (fi + li).toUpperCase() || '?';
    const photoUrl = profile?.profile_picture_url;

    // Modal composer
    const mi = document.getElementById('modalComposerInitials');
    const ma = document.getElementById('modalComposerAvatar');
    const mn = document.getElementById('modalComposerName');
    if (mi) mi.textContent = initials;
    if (mn) mn.textContent = (profile?.first_name || 'You');
    if (photoUrl && ma) { ma.src = photoUrl; ma.classList.remove('hidden'); mi?.classList.add('hidden'); }

    // Comment input
    const cmi = document.getElementById('commentInitials');
    const cma = document.getElementById('commentAvatar');
    if (cmi) cmi.textContent = initials;
    if (photoUrl && cma) { cma.src = photoUrl; cma.classList.remove('hidden'); cmi?.classList.add('hidden'); }
}

function setupComposer() {
    const newPostBtn = document.getElementById('newPostBtn');
    const emptyBtn = document.getElementById('emptyStatePostBtn');
    const modal = document.getElementById('composerModal');
    const closeBtn = document.getElementById('composerCloseBtn');
    const backdrop = document.getElementById('composerBackdrop');
    const submitBtn = document.getElementById('composerSubmitBtn');
    const content = document.getElementById('postContent');
    const charCount = document.getElementById('charCount');
    const imageInput = document.getElementById('postImageInput');
    const videoInput = document.getElementById('postVideoInput');

    function openComposerModal() {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(() => content?.focus(), 200);
    }

    function closeComposerModal() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        content.value = '';
        charCount.textContent = '0 / 2000';
        submitBtn.disabled = true;
        clearImagePreviews();
        selectedImages = [];
    }

    if (newPostBtn) newPostBtn.addEventListener('click', openComposerModal);
    if (emptyBtn) emptyBtn.addEventListener('click', openComposerModal);
    if (closeBtn) closeBtn.addEventListener('click', closeComposerModal);
    if (backdrop) backdrop.addEventListener('click', closeComposerModal);

    // Character count
    if (content) {
        content.addEventListener('input', () => {
            const len = content.value.length;
            charCount.textContent = `${len} / 2000`;
            submitBtn.disabled = len === 0 && selectedImages.length === 0;
        });
    }

    // Image upload
    let selectedImages = [];
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files).slice(0, 4 - selectedImages.length);
            selectedImages.push(...files);
            renderImagePreviews(selectedImages);
            submitBtn.disabled = content.value.length === 0 && selectedImages.length === 0;
            imageInput.value = '';
        });
    }

    function renderImagePreviews(files) {
        const area = document.getElementById('imagePreviewArea');
        const grid = document.getElementById('imagePreviewGrid');
        if (!area || !grid) return;

        if (files.length === 0) { area.classList.add('hidden'); grid.innerHTML = ''; return; }
        area.classList.remove('hidden');

        const cols = files.length === 1 ? 'grid-cols-1' : 'grid-cols-2';
        grid.className = `grid gap-2 ${cols}`;
        grid.innerHTML = files.map((f, i) => `
            <div class="relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
                <img src="${URL.createObjectURL(f)}" class="w-full h-full object-cover" alt="">
                <button class="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition remove-img-btn" data-idx="${i}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `).join('');

        grid.querySelectorAll('.remove-img-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedImages.splice(parseInt(btn.dataset.idx), 1);
                renderImagePreviews(selectedImages);
                submitBtn.disabled = content.value.length === 0 && selectedImages.length === 0;
            });
        });
    }

    function clearImagePreviews() {
        const area = document.getElementById('imagePreviewArea');
        const grid = document.getElementById('imagePreviewGrid');
        if (area) area.classList.add('hidden');
        if (grid) grid.innerHTML = '';
    }

    // Submit post
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const text = content.value.trim();
            if (!text && selectedImages.length === 0) return;

            submitBtn.disabled = true;
            submitBtn.textContent = 'Posting...';

            try {
                // Determine post type
                let postType = 'text';
                if (selectedImages.length > 0) postType = 'photo';

                const isPinned = isAdmin && document.getElementById('isPinnedCheck')?.checked;
                const visibility = document.getElementById('postVisibility')?.value || 'family';

                // Check if announcement quick btn was the trigger
                const isAnnouncement = isAdmin && document.querySelector('.composer-quick-btn[data-type="announcement"]')?.classList.contains('selected');
                if (isAnnouncement) postType = 'announcement';

                // Insert post
                const { data: post, error } = await supabaseClient
                    .from('posts')
                    .insert({
                        author_id: feedUser.id,
                        content: text,
                        post_type: postType,
                        visibility: visibility,
                        is_pinned: isPinned || false,
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Upload images
                if (selectedImages.length > 0) {
                    for (let i = 0; i < selectedImages.length; i++) {
                        const file = selectedImages[i];
                        const ext = file.name.split('.').pop();
                        const path = `${feedUser.id}/${post.id}/${i}.${ext}`;

                        const { error: uploadErr } = await supabaseClient.storage
                            .from('post-media')
                            .upload(path, file, { contentType: file.type, upsert: true });

                        if (uploadErr) { console.error('Upload error:', uploadErr); continue; }

                        const { data: { publicUrl } } = supabaseClient.storage
                            .from('post-media')
                            .getPublicUrl(path);

                        await supabaseClient.from('post_images').insert({
                            post_id: post.id,
                            image_url: publicUrl,
                            sort_order: i,
                        });
                    }
                }

                // Close modal & prepend post to feed
                closeComposerModal();
                await prependNewPost(post.id);

            } catch (err) {
                console.error('Error creating post:', err);
                alert('Failed to create post. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Post';
            }
        });
    }
}

// ─── Feed Loading ───────────────────────────────────────
async function loadFeed(append = false) {
    if (feedLoading) return;
    feedLoading = true;

    if (!append) {
        feedPage = 0;
        feedHasMore = true;
    }

    const loading = document.getElementById('feedLoading');
    const empty = document.getElementById('feedEmpty');
    const container = document.getElementById('feedContainer');
    const scrollTrigger = document.getElementById('scrollTrigger');

    if (!append && loading) loading.classList.remove('hidden');
    if (append && scrollTrigger) scrollTrigger.classList.remove('hidden');

    try {
        const from = feedPage * FEED_PAGE_SIZE;
        const to = from + FEED_PAGE_SIZE - 1;

        let query = supabaseClient
            .from('posts')
            .select(`
                *,
                author:profiles!posts_author_id_fkey(id, first_name, last_name, profile_picture_url, displayed_badge),
                images:post_images(id, image_url, thumbnail_url, sort_order),
                likes:post_likes(id, user_id, reaction),
                comments:post_comments(count),
                bookmarks:post_bookmarks(id, user_id)
            `)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .range(from, to);

        // Apply filter
        if (activeFilter === 'announcement') {
            query = query.eq('post_type', 'announcement');
        } else if (activeFilter === 'milestone') {
            query = query.eq('post_type', 'milestone');
        } else if (activeFilter === 'member') {
            query = query.in('post_type', ['text', 'photo', 'video', 'link']);
        } else if (activeFilter === 'bookmarked') {
            // For bookmarked, we need a different approach
            const { data: bookmarkedIds } = await supabaseClient
                .from('post_bookmarks')
                .select('post_id')
                .eq('user_id', feedUser.id)
                .order('created_at', { ascending: false });
            
            if (bookmarkedIds?.length > 0) {
                query = query.in('id', bookmarkedIds.map(b => b.post_id));
            } else {
                // No bookmarks - show empty
                if (loading) loading.classList.add('hidden');
                if (empty) { empty.classList.remove('hidden'); }
                feedLoading = false;
                return;
            }
        }

        const { data: posts, error } = await query;
        if (error) throw error;

        if (loading) loading.classList.add('hidden');
        if (scrollTrigger) scrollTrigger.classList.add('hidden');

        if (!posts || posts.length === 0) {
            if (!append) {
                if (empty) empty.classList.remove('hidden');
            }
            feedHasMore = false;
            feedLoading = false;
            return;
        }

        if (empty) empty.classList.add('hidden');

        if (posts.length < FEED_PAGE_SIZE) feedHasMore = false;

        // Render posts
        const html = posts.map(post => renderPostCard(post)).join('');
        
        if (append) {
            container.insertAdjacentHTML('beforeend', html);
        } else {
            // Keep the loading div but replace content
            const loadingEl = container.querySelector('#feedLoading');
            container.innerHTML = html;
            if (loadingEl) container.appendChild(loadingEl);
        }

        feedPage++;
        wirePostActions();

    } catch (err) {
        console.error('Error loading feed:', err);
        if (loading) loading.innerHTML = '<p class="text-red-500 text-sm">Failed to load feed</p>';
    }

    feedLoading = false;
}

// ─── Prepend new post after creation ────────────────────
async function prependNewPost(postId) {
    const { data: post, error } = await supabaseClient
        .from('posts')
        .select(`
            *,
            author:profiles!posts_author_id_fkey(id, first_name, last_name, profile_picture_url, displayed_badge),
            images:post_images(id, image_url, thumbnail_url, sort_order),
            likes:post_likes(id, user_id, reaction),
            comments:post_comments(count),
            bookmarks:post_bookmarks(id, user_id)
        `)
        .eq('id', postId)
        .single();

    if (error || !post) return;

    const container = document.getElementById('feedContainer');
    const empty = document.getElementById('feedEmpty');
    if (empty) empty.classList.add('hidden');

    const html = renderPostCard(post);
    container.insertAdjacentHTML('afterbegin', html);
    wirePostActions();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Render a single post card ──────────────────────────
function renderPostCard(post) {
    const author = post.author || {};
    const fi = (author.first_name || '')[0] || '';
    const li = (author.last_name || '')[0] || '';
    const initials = (fi + li).toUpperCase() || '?';
    const name = [author.first_name, author.last_name].filter(Boolean).join(' ') || 'Member';
    const photoUrl = author.profile_picture_url;
    const authorId = author.id;
    const displayedBadge = author.displayed_badge;

    // Build badge overlay HTML for feed avatars
    let avatarBadgeHtml = '';
    if (displayedBadge) {
        if (typeof buildNavBadgeOverlay === 'function') {
            avatarBadgeHtml = '<div class="absolute -bottom-1 -right-1">' + buildNavBadgeOverlay(displayedBadge) + '</div>';
        } else {
            const fb = { founding_member:'🏅', shutterbug:'📸', streak_master:'🔥', streak_legend:'⚡', first_seed:'🌱', four_figures:'💵', quest_champion:'🎯', fidelity_linked:'🏦', birthday_vip:'🎂' };
            avatarBadgeHtml = '<div class="absolute -bottom-1 -right-1"><div class="badge-chip-overlay">' + (fb[displayedBadge] || '❓') + '</div></div>';
        }
    }

    const timeAgo = getTimeAgo(post.created_at);
    const images = (post.images || []).sort((a, b) => a.sort_order - b.sort_order);
    const likes = post.likes || [];
    const likeCount = likes.length;
    const myLike = likes.find(l => l.user_id === feedUser.id);
    const commentCount = post.comments?.[0]?.count || 0;
    const isBookmarked = (post.bookmarks || []).some(b => b.user_id === feedUser.id);

    // Pinned / announcement badge
    let badge = '';
    if (post.is_pinned) badge = '<span class="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">📌 Pinned</span>';
    if (post.post_type === 'announcement') badge = '<span class="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">📢 Announcement</span>';
    if (post.post_type === 'milestone') badge = '<span class="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">🎉 Milestone</span>';

    // Build image grid
    let imageHtml = '';
    if (images.length === 1) {
        imageHtml = `<div class="mt-3 rounded-xl overflow-hidden sm:rounded-2xl"><img src="${images[0].image_url}" class="w-full max-h-[500px] object-cover cursor-pointer post-image" data-full="${images[0].image_url}" alt="" loading="lazy"></div>`;
    } else if (images.length === 2) {
        imageHtml = `<div class="mt-3 grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden sm:rounded-2xl">${images.map(img => `<img src="${img.image_url}" class="w-full aspect-square object-cover cursor-pointer post-image" data-full="${img.image_url}" alt="" loading="lazy">`).join('')}</div>`;
    } else if (images.length === 3) {
        imageHtml = `<div class="mt-3 grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden sm:rounded-2xl">
            <img src="${images[0].image_url}" class="w-full aspect-square object-cover row-span-2 cursor-pointer post-image" data-full="${images[0].image_url}" alt="" loading="lazy">
            <img src="${images[1].image_url}" class="w-full aspect-square object-cover cursor-pointer post-image" data-full="${images[1].image_url}" alt="" loading="lazy">
            <img src="${images[2].image_url}" class="w-full aspect-square object-cover cursor-pointer post-image" data-full="${images[2].image_url}" alt="" loading="lazy">
        </div>`;
    } else if (images.length >= 4) {
        imageHtml = `<div class="mt-3 grid grid-cols-2 gap-0.5 rounded-xl overflow-hidden sm:rounded-2xl">${images.slice(0, 4).map((img, i) => `<div class="relative"><img src="${img.image_url}" class="w-full aspect-square object-cover cursor-pointer post-image" data-full="${img.image_url}" alt="" loading="lazy">${i === 3 && images.length > 4 ? `<div class="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xl font-bold">+${images.length - 4}</div>` : ''}</div>`).join('')}</div>`;
    }

    // Content with @mention highlighting
    const contentHtml = post.content ? formatPostContent(post.content) : '';

    const isOwner = post.author_id === feedUser.id;
    const canDelete = isOwner || isAdmin;

    // Like/comment summary line (Instagram-style: "23 likes" below action icons)
    let likeSummary = '';
    if (likeCount > 0) {
        likeSummary = `<div class="px-1 mt-1"><span class="like-summary text-xs font-semibold text-gray-900">${likeCount} like${likeCount !== 1 ? 's' : ''}</span></div>`;
    }

    return `
    <article class="bg-white border-b sm:border sm:rounded-2xl sm:border-gray-200/80 post-card fade-in" data-post-id="${post.id}">
        <div class="p-4 sm:p-5">
            <!-- Post Header -->
            <div class="flex items-start gap-3">
                <a href="profile.html?id=${authorId}" class="flex-shrink-0 relative">
                    <div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border border-gray-200">
                        ${photoUrl ? `<img src="${photoUrl}" class="w-full h-full object-cover" alt="">` : `<span class="text-brand-600 text-sm font-bold">${initials}</span>`}
                    </div>
                    ${avatarBadgeHtml}
                </a>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <a href="profile.html?id=${authorId}" class="font-semibold text-gray-900 text-sm hover:underline">${name}</a>
                        ${badge}
                    </div>
                    <p class="text-xs text-gray-400 mt-0.5">${timeAgo}${post.updated_at !== post.created_at ? ' · edited' : ''}</p>
                </div>
                ${canDelete ? `
                <div class="relative">
                    <button class="post-menu-btn p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01"></path></svg>
                    </button>
                    <div class="post-menu hidden absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-30">
                        ${isOwner ? '<button class="edit-post-btn w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">Edit Post</button>' : ''}
                        <button class="delete-post-btn w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition">Delete Post</button>
                        ${isAdmin && !post.is_pinned ? '<button class="pin-post-btn w-full text-left px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 transition">📌 Pin Post</button>' : ''}
                        ${isAdmin && post.is_pinned ? '<button class="unpin-post-btn w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition">Unpin Post</button>' : ''}
                    </div>
                </div>` : ''}
            </div>

            <!-- Post Content -->
            ${contentHtml ? `<div class="mt-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap post-text">${contentHtml}</div>` : ''}
            
            <!-- Images -->
            ${imageHtml}

            <!-- Action Bar (Instagram-style) -->
            <div class="flex items-center justify-between mt-3 pt-2">
                <div class="flex items-center gap-3">
                    <button class="like-btn transition-transform active:scale-125 ${myLike ? 'text-red-500' : 'text-gray-700'}" data-post-id="${post.id}" data-liked="${myLike ? 'true' : 'false'}">
                        <svg class="w-6 h-6" fill="${myLike ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    </button>
                    <button class="comment-btn text-gray-700 transition-transform active:scale-110" data-post-id="${post.id}">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    </button>
                </div>
                <button class="bookmark-btn transition-transform active:scale-110 ${isBookmarked ? 'text-gray-900' : 'text-gray-700'}" data-post-id="${post.id}" data-saved="${isBookmarked ? 'true' : 'false'}">
                    <svg class="w-6 h-6" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                </button>
            </div>

            <!-- Like Count -->
            ${likeSummary}

            <!-- Comment count teaser -->
            ${commentCount > 0 ? `<button class="comment-btn text-xs text-gray-400 mt-1 px-1 hover:text-gray-600" data-post-id="${post.id}">View all ${commentCount} comment${commentCount !== 1 ? 's' : ''}</button>` : ''}
        </div>
    </article>`;
}

// ─── Format content: @mentions, links, line breaks ──────
function formatPostContent(text) {
    // Escape HTML
    let safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // @mentions → links
    safe = safe.replace(/@(\w+)/g, '<span class="text-brand-600 font-medium cursor-pointer hover:underline mention" data-mention="$1">@$1</span>');

    // URLs → clickable links
    safe = safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:underline break-all">$1</a>');

    return safe;
}

// ─── Time Ago ───────────────────────────────────────────
function getTimeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Wire Post Action Buttons ───────────────────────────
function wirePostActions() {
    // Like buttons
    document.querySelectorAll('.like-btn').forEach(btn => {
        if (btn.dataset.wired) return;
        btn.dataset.wired = 'true';

        // Single tap = toggle like
        btn.addEventListener('click', () => toggleLike(btn));
    });

    // Comment buttons
    document.querySelectorAll('.comment-btn').forEach(btn => {
        if (btn.dataset.wired) return;
        btn.dataset.wired = 'true';
        btn.addEventListener('click', () => openPostDetail(btn.dataset.postId));
    });

    // Bookmark buttons
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
        if (btn.dataset.wired) return;
        btn.dataset.wired = 'true';
        btn.addEventListener('click', () => toggleBookmark(btn));
    });

    // Post menu buttons
    document.querySelectorAll('.post-menu-btn').forEach(btn => {
        if (btn.dataset.wired) return;
        btn.dataset.wired = 'true';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = btn.nextElementSibling;
            document.querySelectorAll('.post-menu').forEach(m => { if (m !== menu) m.classList.add('hidden'); });
            menu.classList.toggle('hidden');
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-post-btn').forEach(btn => {
        if (btn.dataset.wired) return;
        btn.dataset.wired = 'true';
        btn.addEventListener('click', async () => {
            const card = btn.closest('.post-card');
            const postId = card?.dataset.postId;
            if (!postId || !confirm('Delete this post?')) return;

            const { error } = await supabaseClient.from('posts').delete().eq('id', postId);
            if (!error) {
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.remove(), 300);
            }
        });
    });

    // Edit post buttons
    document.querySelectorAll('.edit-post-btn').forEach(btn => {
        if (btn.dataset.wired) return;
        btn.dataset.wired = 'true';
        btn.addEventListener('click', async () => {
            const card = btn.closest('.post-card');
            const postId = card?.dataset.postId;
            if (!postId) return;

            const textEl = card.querySelector('.post-text');
            if (!textEl) return;

            const currentText = textEl.textContent;
            const newText = prompt('Edit your post:', currentText);
            if (newText === null || newText === currentText) return;

            const { error } = await supabaseClient
                .from('posts')
                .update({ content: newText })
                .eq('id', postId)
                .eq('author_id', feedUser.id);

            if (!error) {
                textEl.innerHTML = formatPostContent(newText);
            }
        });
    });

    // Pin/Unpin
    document.querySelectorAll('.pin-post-btn, .unpin-post-btn').forEach(btn => {
        if (btn.dataset.wired) return;
        btn.dataset.wired = 'true';
        btn.addEventListener('click', async () => {
            const card = btn.closest('.post-card');
            const postId = card?.dataset.postId;
            const isPinning = btn.classList.contains('pin-post-btn');
            if (!postId) return;

            await supabaseClient.from('posts').update({ is_pinned: isPinning }).eq('id', postId);
            loadFeed(); // Refresh to reorder
        });
    });

    // Close menus on outside click
    document.addEventListener('click', () => {
        document.querySelectorAll('.post-menu').forEach(m => m.classList.add('hidden'));
    });
}

// ─── Like (Heart) ───────────────────────────────────────
async function toggleLike(btn) {
    const postId = btn.dataset.postId;
    const isLiked = btn.dataset.liked === 'true';
    const card = btn.closest('.post-card');
    const likeSummaryEl = card?.querySelector('.like-summary');

    if (isLiked) {
        // Remove like
        btn.dataset.liked = 'false';
        btn.classList.remove('text-red-500');
        btn.classList.add('text-gray-700');
        btn.querySelector('svg').setAttribute('fill', 'none');

        // Update count display
        if (likeSummaryEl) {
            const m = likeSummaryEl.textContent.match(/\d+/);
            const newCount = (parseInt(m?.[0]) || 1) - 1;
            if (newCount > 0) {
                likeSummaryEl.textContent = `${newCount} like${newCount !== 1 ? 's' : ''}`;
            } else {
                likeSummaryEl.parentElement.remove();
            }
        }

        await supabaseClient.from('post_likes').delete()
            .eq('post_id', postId)
            .eq('user_id', feedUser.id);
    } else {
        // Add like
        btn.dataset.liked = 'true';
        btn.classList.add('text-red-500');
        btn.classList.remove('text-gray-700');
        btn.querySelector('svg').setAttribute('fill', 'currentColor');

        // Animate
        btn.querySelector('svg').style.transform = 'scale(1.3)';
        setTimeout(() => { btn.querySelector('svg').style.transform = ''; }, 200);

        // Update count display
        if (likeSummaryEl) {
            const m = likeSummaryEl.textContent.match(/\d+/);
            const newCount = (parseInt(m?.[0]) || 0) + 1;
            likeSummaryEl.textContent = `${newCount} like${newCount !== 1 ? 's' : ''}`;
        } else {
            // Insert likes summary below action bar
            const actionBar = card?.querySelector('.like-btn')?.closest('.flex')?.parentElement;
            if (actionBar) {
                const div = document.createElement('div');
                div.className = 'px-1 mt-1';
                div.innerHTML = '<span class="like-summary text-xs font-semibold text-gray-900">1 like</span>';
                actionBar.insertAdjacentElement('afterend', div);
            }
        }

        await supabaseClient.from('post_likes').upsert({
            post_id: postId,
            user_id: feedUser.id,
            reaction: '❤️',
        }, { onConflict: 'post_id,user_id' });
    }
}

// ─── Bookmark ───────────────────────────────────────────
async function toggleBookmark(btn) {
    const postId = btn.dataset.postId;
    const isSaved = btn.dataset.saved === 'true';

    if (isSaved) {
        btn.dataset.saved = 'false';
        btn.classList.remove('text-gray-900');
        btn.classList.add('text-gray-700');
        btn.querySelector('svg').setAttribute('fill', 'none');
        await supabaseClient.from('post_bookmarks').delete()
            .eq('post_id', postId).eq('user_id', feedUser.id);
    } else {
        btn.dataset.saved = 'true';
        btn.classList.add('text-gray-900');
        btn.classList.remove('text-gray-700');
        btn.querySelector('svg').setAttribute('fill', 'currentColor');
        await supabaseClient.from('post_bookmarks').upsert({
            post_id: postId,
            user_id: feedUser.id,
        }, { onConflict: 'post_id,user_id' });
    }
}

// ─── Post Detail & Comments Modal ───────────────────────
function setupPostDetail() {
    const modal = document.getElementById('postDetailModal');
    const closeBtn = document.getElementById('detailCloseBtn');
    const backdrop = document.getElementById('detailBackdrop');
    const commentInput = document.getElementById('commentInput');
    const commentSend = document.getElementById('commentSendBtn');
    const panel = document.getElementById('detailPanel');

    if (closeBtn) closeBtn.addEventListener('click', closePostDetail);
    if (backdrop) backdrop.addEventListener('click', closePostDetail);

    if (commentInput) {
        commentInput.addEventListener('input', () => {
            commentSend.disabled = commentInput.value.trim().length === 0;
        });
        commentInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitComment();
            }
        });
    }
    if (commentSend) commentSend.addEventListener('click', submitComment);

    // Swipe-to-dismiss for bottom sheet
    if (panel) {
        let startY = 0, currentY = 0, isDragging = false;
        const dragHandle = panel.querySelector('.flex.items-center.justify-center');

        const onStart = (y) => { startY = y; currentY = y; isDragging = true; panel.style.transition = 'none'; };
        const onMove = (y) => {
            if (!isDragging) return;
            currentY = y;
            const diff = currentY - startY;
            if (diff > 0) panel.style.transform = `translateY(${diff}px)`;
        };
        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            panel.style.transition = 'transform 0.3s ease';
            if (currentY - startY > 100) {
                panel.style.transform = 'translateY(100%)';
                setTimeout(() => { closePostDetail(); panel.style.transform = ''; }, 300);
            } else {
                panel.style.transform = '';
            }
        };

        if (dragHandle) {
            dragHandle.addEventListener('touchstart', (e) => onStart(e.touches[0].clientY), { passive: true });
            dragHandle.addEventListener('mousedown', (e) => onStart(e.clientY));
        }
        document.addEventListener('touchmove', (e) => { if (isDragging) onMove(e.touches[0].clientY); }, { passive: true });
        document.addEventListener('mousemove', (e) => { if (isDragging) onMove(e.clientY); });
        document.addEventListener('touchend', onEnd);
        document.addEventListener('mouseup', onEnd);
    }

    // Set up comment avatar
    if (feedUser) {
        const fi = (feedUser.user_metadata?.first_name || '')[0] || '';
        const li = (feedUser.user_metadata?.last_name || '')[0] || '';
        const initials = (fi + li).toUpperCase() || '?';
        const commentInitials = document.getElementById('commentInitials');
        const commentAvatar = document.getElementById('commentAvatar');
        if (commentInitials) commentInitials.textContent = initials;

        supabaseClient.from('profiles').select('profile_picture_url').eq('id', feedUser.id).single().then(({ data }) => {
            if (data?.profile_picture_url && commentAvatar) {
                commentAvatar.src = data.profile_picture_url;
                commentAvatar.classList.remove('hidden');
                if (commentInitials) commentInitials.classList.add('hidden');
            }
        });
    }
}

function closePostDetail() {
    const modal = document.getElementById('postDetailModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentDetailPostId = null;
    replyingToCommentId = null;
}

async function openPostDetail(postId) {
    currentDetailPostId = postId;
    const modal = document.getElementById('postDetailModal');
    const content = document.getElementById('detailContent');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    content.innerHTML = '<div class="py-12 text-center"><div class="inline-flex items-center gap-2 text-gray-400"><svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg><span class="text-sm">Loading...</span></div></div>';

    // Fetch comments only
    const { data: comments } = await supabaseClient
        .from('post_comments')
        .select(`
            *,
            author:profiles!post_comments_author_id_fkey(id, first_name, last_name, profile_picture_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    // Fetch comment likes for these comments
    const commentIds = (comments || []).map(c => c.id);
    let commentLikesMap = {};
    let myCommentLikes = new Set();
    if (commentIds.length > 0) {
        const { data: cLikes } = await supabaseClient
            .from('comment_likes')
            .select('comment_id, user_id')
            .in('comment_id', commentIds);
        (cLikes || []).forEach(cl => {
            commentLikesMap[cl.comment_id] = (commentLikesMap[cl.comment_id] || 0) + 1;
            if (cl.user_id === feedUser.id) myCommentLikes.add(cl.comment_id);
        });
    }

    // Attach like data to comments
    (comments || []).forEach(c => {
        c.like_count = commentLikesMap[c.id] || 0;
        c.liked_by_me = myCommentLikes.has(c.id);
    });

    // Build top-level comments grouped
    const topComments = (comments || []).filter(c => !c.parent_id);
    const replies = (comments || []).filter(c => c.parent_id);
    const replyMap = {};
    replies.forEach(r => {
        if (!replyMap[r.parent_id]) replyMap[r.parent_id] = [];
        replyMap[r.parent_id].push(r);
    });

    let commentsHtml = topComments.map(c => renderComment(c, replyMap[c.id] || [])).join('');

    content.innerHTML = commentsHtml || '<p class="text-sm text-gray-400 text-center py-8">No comments yet. Be the first!</p>';

    // Wire reply buttons
    content.querySelectorAll('.reply-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            replyingToCommentId = btn.dataset.commentId;
            const input = document.getElementById('commentInput');
            input.placeholder = `Reply to ${btn.dataset.authorName}...`;
            input.focus();
        });
    });

    // Wire comment like buttons
    content.querySelectorAll('.comment-like-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleCommentLike(btn));
    });

    // Wire delete comment buttons
    content.querySelectorAll('.delete-comment-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const commentId = btn.dataset.commentId;
            if (!commentId || !confirm('Delete this comment?')) return;
            await supabaseClient.from('post_comments').delete().eq('id', commentId);
            await openPostDetail(currentDetailPostId);
            // Update comment count on feed
            const card = document.querySelector(`.post-card[data-post-id="${currentDetailPostId}"]`);
            if (card) {
                const teaserBtn = card.querySelector('.comment-btn[data-post-id]');
                if (teaserBtn && teaserBtn.textContent.includes('View all')) {
                    const count = parseInt(teaserBtn.textContent.match(/\d+/)?.[0] || '1') - 1;
                    if (count > 0) teaserBtn.textContent = `View all ${count} comment${count !== 1 ? 's' : ''}`;
                    else teaserBtn.remove();
                }
            }
        });
    });
}

// ─── Toggle Comment Like (heart) ────────────────────────
async function toggleCommentLike(btn) {
    const commentId = btn.dataset.commentId;
    const isLiked = btn.dataset.liked === 'true';
    const heartIcon = btn.querySelector('svg');
    const countEl = btn.querySelector('.comment-like-count');

    if (isLiked) {
        btn.dataset.liked = 'false';
        btn.classList.remove('text-red-500');
        btn.classList.add('text-gray-400');
        heartIcon.setAttribute('fill', 'none');
        const c = parseInt(countEl.textContent) || 1;
        countEl.textContent = c - 1 > 0 ? c - 1 : '';

        await supabaseClient.from('comment_likes').delete()
            .eq('comment_id', commentId)
            .eq('user_id', feedUser.id);
    } else {
        btn.dataset.liked = 'true';
        btn.classList.add('text-red-500');
        btn.classList.remove('text-gray-400');
        heartIcon.setAttribute('fill', 'currentColor');
        heartIcon.style.transform = 'scale(1.3)';
        setTimeout(() => { heartIcon.style.transform = ''; }, 200);
        const c = parseInt(countEl.textContent) || 0;
        countEl.textContent = c + 1;

        await supabaseClient.from('comment_likes').upsert({
            comment_id: commentId,
            user_id: feedUser.id,
        }, { onConflict: 'comment_id,user_id' });
    }
}

function renderComment(comment, replies = []) {
    const a = comment.author || {};
    const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || 'Member';
    const photoUrl = a.profile_picture_url;
    const fi = (a.first_name || '')[0] || '';
    const li = (a.last_name || '')[0] || '';
    const initials = (fi + li).toUpperCase() || '?';
    const isOwn = comment.author_id === feedUser.id;
    const commentLikeCount = comment.like_count || 0;
    const commentLikedByMe = comment.liked_by_me || false;

    let repliesHtml = replies.map(r => {
        const ra = r.author || {};
        const rname = [ra.first_name, ra.last_name].filter(Boolean).join(' ') || 'Member';
        const rphoto = ra.profile_picture_url;
        const rfi = (ra.first_name || '')[0] || '';
        const rli = (ra.last_name || '')[0] || '';
        const rinitials = (rfi + rli).toUpperCase() || '?';
        const rLikeCount = r.like_count || 0;
        const rLikedByMe = r.liked_by_me || false;
        return `
            <div class="flex items-start gap-2 mt-3 ml-8">
                <div class="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                    ${rphoto ? `<img src="${rphoto}" class="w-full h-full object-cover" alt="">` : `<span class="text-brand-600 text-[10px] font-bold">${rinitials}</span>`}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <span class="font-semibold text-xs text-gray-900">${rname}</span>
                            <p class="text-xs text-gray-700 mt-0.5">${formatPostContent(r.content)}</p>
                            <span class="text-[10px] text-gray-400 mt-1 block">${getTimeAgo(r.created_at)}</span>
                        </div>
                        <button class="comment-like-btn flex flex-col items-center gap-0.5 flex-shrink-0 mt-1 ${rLikedByMe ? 'text-red-500' : 'text-gray-400'}" data-comment-id="${r.id}" data-liked="${rLikedByMe ? 'true' : 'false'}">
                            <svg class="w-3 h-3" fill="${rLikedByMe ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                            <span class="comment-like-count text-[9px]">${rLikeCount || ''}</span>
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');

    return `
        <div class="flex items-start gap-2.5 mb-4 comment-item" data-comment-id="${comment.id}">
            <a href="profile.html?id=${a.id}" class="flex-shrink-0">
                <div class="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    ${photoUrl ? `<img src="${photoUrl}" class="w-full h-full object-cover" alt="">` : `<span class="text-brand-600 text-xs font-bold">${initials}</span>`}
                </div>
            </a>
            <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <a href="profile.html?id=${a.id}" class="font-semibold text-xs text-gray-900 hover:underline">${name}</a>
                        <p class="text-sm text-gray-700 mt-0.5">${formatPostContent(comment.content)}</p>
                    </div>
                    <button class="comment-like-btn flex flex-col items-center gap-0.5 flex-shrink-0 mt-1 ${commentLikedByMe ? 'text-red-500' : 'text-gray-400'}" data-comment-id="${comment.id}" data-liked="${commentLikedByMe ? 'true' : 'false'}">
                        <svg class="w-3.5 h-3.5" fill="${commentLikedByMe ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                        <span class="comment-like-count text-[9px]">${commentLikeCount || ''}</span>
                    </button>
                </div>
                <div class="flex items-center gap-3 mt-1 px-1">
                    <span class="text-[10px] text-gray-400">${getTimeAgo(comment.created_at)}</span>
                    <button class="reply-btn text-[10px] font-semibold text-gray-500 hover:text-brand-600 transition" data-comment-id="${comment.id}" data-author-name="${name}">Reply</button>
                    ${isOwn ? `<button class="delete-comment-btn text-[10px] font-semibold text-gray-400 hover:text-red-500 transition" data-comment-id="${comment.id}">Delete</button>` : ''}
                </div>
                ${repliesHtml}
            </div>
        </div>`;
}

async function submitComment() {
    const input = document.getElementById('commentInput');
    const text = input.value.trim();
    if (!text || !currentDetailPostId) return;

    const sendBtn = document.getElementById('commentSendBtn');
    sendBtn.disabled = true;

    try {
        const { data: comment, error } = await supabaseClient
            .from('post_comments')
            .insert({
                post_id: currentDetailPostId,
                author_id: feedUser.id,
                content: text,
                parent_id: replyingToCommentId || null,
            })
            .select(`*, author:profiles!post_comments_author_id_fkey(id, first_name, last_name, profile_picture_url)`)
            .single();

        if (error) throw error;

        // Clear input
        input.value = '';
        input.placeholder = 'Write a comment...';
        replyingToCommentId = null;

        // Refresh the detail view
        await openPostDetail(currentDetailPostId);

        // Update comment count on feed
        const card = document.querySelector(`.post-card[data-post-id="${currentDetailPostId}"]`);
        if (card) {
            const countEl = card.querySelector('.comment-count');
            if (countEl) countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
        }

    } catch (err) {
        console.error('Error posting comment:', err);
    }

    sendBtn.disabled = false;
}

// ─── Feed Filters ───────────────────────────────────────
function setupFilters() {
    document.querySelectorAll('.feed-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.feed-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeFilter = pill.dataset.filter;
            loadFeed();
        });
    });
}

// ─── Infinite Scroll ────────────────────────────────────
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && feedHasMore && !feedLoading) {
            loadFeed(true);
        }
    }, { rootMargin: '400px' });

    // Watch the scroll trigger area
    const trigger = document.getElementById('scrollTrigger');
    if (trigger) observer.observe(trigger);

    // Also detect scroll near bottom as fallback
    window.addEventListener('scroll', () => {
        if (feedLoading || !feedHasMore) return;
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800) {
            loadFeed(true);
        }
    });
}
