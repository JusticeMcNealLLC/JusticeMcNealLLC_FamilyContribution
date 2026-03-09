// ═══════════════════════════════════════════════════════════
// Profile – Posts Grid & Feed
// ═══════════════════════════════════════════════════════════

window.ProfileApp = window.ProfileApp || {};

// ─── Posts Grid (Instagram 3-column) ────────────────────
window.ProfileApp.loadPostsGrid = async function loadPostsGrid() {
    const S = window.ProfileApp.state;

    const { data: posts } = await supabaseClient
        .from('posts')
        .select(`
            id, content, post_type, created_at,
            images:post_images(image_url, sort_order),
            likes:post_likes(count),
            comments:post_comments(count)
        `)
        .eq('author_id', S.viewingUserId)
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
};

// ─── Profile Feed (Twitter-style text posts) ───────────
window.ProfileApp.loadProfileFeed = async function loadProfileFeed() {
    const S = window.ProfileApp.state;
    const getTimeAgo = window.ProfileApp.getTimeAgo;

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
        .eq('author_id', S.viewingUserId)
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
        const timeAgo = getTimeAgo(post.created_at);
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
};
