// ═══════════════════════════════════════════════════════════
// Portal Events — Comments / Discussion
// Handles loading and posting event comments.
// ═══════════════════════════════════════════════════════════

function evtTimeAgo(dateStr) {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function evtLoadComments(eventId) {
    const list = document.getElementById('portalCommentsList');
    if (!list) return;

    // Fill self-avatar in input row
    const selfEl = document.getElementById('portalCommentSelfAvatar');
    if (selfEl) {
        const pic = window.evtCurrentUserPic;
        const initials = window.evtCurrentUserInitials || '?';
        selfEl.innerHTML = pic
            ? `<img src="${evtEscapeHtml(pic)}" alt="">`
            : initials;
    }

    let comments = null;
    try {
        const { data, error } = await supabaseClient
            .from('event_comments')
            .select('*, profile:profiles!event_comments_user_id_fkey(first_name, last_name, profile_picture_url)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true })
            .limit(100);
        if (error) throw error;
        comments = data;
    } catch (err) {
        // Table may not exist yet — hide section silently
        console.warn('Comments unavailable:', err.message || err);
        const section = document.getElementById('portalCommentsSection');
        if (section) section.style.display = 'none';
        return;
    }

    if (!comments || comments.length === 0) {
        list.innerHTML = `<div class="ed-comment-empty">
            <span class="ed-comment-empty-icon">💬</span>
            <p class="ed-comment-empty-text">No comments yet — be the first!</p>
        </div>`;
        return;
    }

    list.innerHTML = comments.map(c => {
        const name = evtEscapeHtml(`${c.profile?.first_name || ''} ${c.profile?.last_name || ''}`.trim() || 'Member');
        const avatarUrl = c.profile?.profile_picture_url;
        const initials  = ((c.profile?.first_name?.[0] || '') + (c.profile?.last_name?.[0] || '')).toUpperCase() || '?';
        const timeAgo   = evtTimeAgo(c.created_at);

        return `<div class="evt-comment">
            <div class="evt-comment-avatar">${avatarUrl ? `<img src="${evtEscapeHtml(avatarUrl)}" alt="">` : initials}</div>
            <div class="evt-comment-body">
                <span class="evt-comment-name">${name}</span><span class="evt-comment-time">${timeAgo}</span>
                <p class="evt-comment-text">${evtEscapeHtml(c.body)}</p>
            </div>
        </div>`;
    }).join('');
}

async function evtPostComment(eventId) {
    const input = document.getElementById('portalCommentInput');
    const body  = (input?.value || '').trim();
    if (!body || !eventId || !evtCurrentUser) return;

    const { error } = await supabaseClient
        .from('event_comments')
        .insert({ event_id: eventId, user_id: evtCurrentUser.id, body });

    if (error) {
        console.error('Comment error:', error);
        return;
    }
    input.value = '';
    await evtLoadComments(eventId);
}

// Allow Enter key to post
document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'portalCommentInput') {
        const btn = document.querySelector('.ed-comment-post');
        btn?.click();
    }
});

window.evtPostComment = evtPostComment;
