// ═══════════════════════════════════════════════════════════
// Feed — Post Action Handlers
// ═══════════════════════════════════════════════════════════

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

            const textEl = card.querySelector('.feed-caption-text') || card.querySelector('.post-text');
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
                textEl.classList.remove('line-clamp-1');
                const moreBtn = textEl.parentElement?.querySelector('.feed-caption-more');
                if (moreBtn) moreBtn.remove();
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
    // Like count is in a separate div (IG-style) or inside the button (legacy)
    const likeCountEl = btn.querySelector('.like-count') || card?.querySelector('.feed-like-count');

    if (isLiked) {
        // Remove like
        btn.dataset.liked = 'false';
        btn.classList.remove('text-red-500');
        btn.classList.add('text-gray-900');
        btn.querySelector('svg').setAttribute('fill', 'none');

        // Update like count display
        if (likeCountEl) {
            const cur = parseInt(likeCountEl.textContent) || 1;
            const newCount = Math.max(0, cur - 1);
            if (newCount > 0) {
                likeCountEl.textContent = `${newCount.toLocaleString()} like${newCount !== 1 ? 's' : ''}`;
            } else {
                // Remove the count container if 0
                const countContainer = likeCountEl.closest('.feed-likes-row');
                if (countContainer) countContainer.remove();
                else likeCountEl.textContent = '';
            }
        }

        await supabaseClient.from('post_likes').delete()
            .eq('post_id', postId)
            .eq('user_id', feedUser.id);
    } else {
        // Add like
        btn.dataset.liked = 'true';
        btn.classList.add('text-red-500');
        btn.classList.remove('text-gray-900');
        btn.querySelector('svg').setAttribute('fill', 'currentColor');

        // Animate
        btn.querySelector('svg').style.transform = 'scale(1.3)';
        setTimeout(() => { btn.querySelector('svg').style.transform = ''; }, 200);

        // Update like count display
        if (likeCountEl) {
            const cur = parseInt(likeCountEl.textContent) || 0;
            const newCount = cur + 1;
            likeCountEl.textContent = `${newCount.toLocaleString()} like${newCount !== 1 ? 's' : ''}`;
        } else if (card) {
            // Insert a new likes row if there isn't one
            const actionBar = card.querySelector('.flex.items-center.justify-between');
            if (actionBar) {
                const likeRow = document.createElement('div');
                likeRow.className = 'px-3 pb-0.5 feed-likes-row';
                likeRow.innerHTML = '<span class="text-sm font-semibold text-gray-900 feed-like-count">1 like</span>';
                actionBar.parentElement.insertBefore(likeRow, actionBar.nextSibling);
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
        btn.querySelector('svg').setAttribute('fill', 'none');
        await supabaseClient.from('post_bookmarks').delete()
            .eq('post_id', postId).eq('user_id', feedUser.id);
    } else {
        btn.dataset.saved = 'true';
        btn.querySelector('svg').setAttribute('fill', 'currentColor');
        await supabaseClient.from('post_bookmarks').upsert({
            post_id: postId,
            user_id: feedUser.id,
        }, { onConflict: 'post_id,user_id' });
    }
}
