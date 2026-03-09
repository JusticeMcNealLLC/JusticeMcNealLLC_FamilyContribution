// ═══════════════════════════════════════════════════════════
// Feed — Feed Loading & Data Fetching
// ═══════════════════════════════════════════════════════════

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
