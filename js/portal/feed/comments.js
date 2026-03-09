// ═══════════════════════════════════════════════════════════
// Feed — Post Detail & Comments Bottom Sheet
// ═══════════════════════════════════════════════════════════

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

// ─── Render Comment ─────────────────────────────────────
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

// ─── Submit Comment ─────────────────────────────────────
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
