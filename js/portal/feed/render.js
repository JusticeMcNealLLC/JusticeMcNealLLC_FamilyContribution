// ═══════════════════════════════════════════════════════════
// Feed — Post Card Rendering (Instagram-style)
// ═══════════════════════════════════════════════════════════

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
            avatarBadgeHtml = buildNavBadgeOverlay(displayedBadge);
        } else {
            const fb = { founding_member:'🏅', shutterbug:'📸', streak_master:'🔥', streak_legend:'⚡', first_seed:'🌱', four_figures:'💵', quest_champion:'🎯', fidelity_linked:'🏦', birthday_vip:'🎂' };
            avatarBadgeHtml = '<div class="badge-chip-overlay">' + (fb[displayedBadge] || '❓') + '</div>';
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

    // Build image grid — edge-to-edge on mobile, rounded on desktop
    let imageHtml = '';
    if (images.length === 1) {
        imageHtml = `<div class="sm:mx-0 overflow-hidden sm:rounded-sm"><img src="${images[0].image_url}" class="w-full object-cover cursor-pointer post-image" style="max-height:600px" data-full="${images[0].image_url}" alt="" loading="lazy"></div>`;
    } else if (images.length === 2) {
        imageHtml = `<div class="grid grid-cols-2 gap-px sm:rounded-sm overflow-hidden">${images.map(img => `<img src="${img.image_url}" class="w-full aspect-square object-cover cursor-pointer post-image" data-full="${img.image_url}" alt="" loading="lazy">`).join('')}</div>`;
    } else if (images.length === 3) {
        imageHtml = `<div class="grid grid-cols-2 gap-px sm:rounded-sm overflow-hidden">
            <img src="${images[0].image_url}" class="w-full aspect-square object-cover row-span-2 cursor-pointer post-image" data-full="${images[0].image_url}" alt="" loading="lazy">
            <img src="${images[1].image_url}" class="w-full aspect-square object-cover cursor-pointer post-image" data-full="${images[1].image_url}" alt="" loading="lazy">
            <img src="${images[2].image_url}" class="w-full aspect-square object-cover cursor-pointer post-image" data-full="${images[2].image_url}" alt="" loading="lazy">
        </div>`;
    } else if (images.length >= 4) {
        imageHtml = `<div class="grid grid-cols-2 gap-px sm:rounded-sm overflow-hidden">${images.slice(0, 4).map((img, i) => `<div class="relative"><img src="${img.image_url}" class="w-full aspect-square object-cover cursor-pointer post-image" data-full="${img.image_url}" alt="" loading="lazy">${i === 3 && images.length > 4 ? `<div class="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xl font-bold">+${images.length - 4}</div>` : ''}</div>`).join('')}</div>`;
    }

    // Content with @mention highlighting
    const contentRaw = post.content || '';
    const contentHtml = contentRaw ? formatPostContent(contentRaw) : '';

    const isOwner = post.author_id === feedUser.id;
    const canDelete = isOwner || isAdmin;

    // Inline counts next to icons
    const likeCountLabel = likeCount > 0 ? likeCount : '';
    const commentCountLabel = commentCount > 0 ? commentCount : '';

    // Caption truncation: show 1 line with "more" if long
    const captionTruncated = contentRaw.length > 100;
    const captionClass = captionTruncated ? 'line-clamp-1' : '';

    // ── Non-contributor content lock ──────────────────────────────────────
    // Milestones and announcements are always visible; other recent posts are blurred.
    const LOCK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const isRecentPost = (Date.now() - new Date(post.created_at).getTime()) < LOCK_WINDOW_MS;
    const isPublicType = post.post_type === 'milestone' || post.post_type === 'announcement';
    const isLocked = !isContributor && isRecentPost && !isPublicType;

    if (isLocked) {
        return `
    <article class="bg-white border-b sm:border sm:rounded-2xl sm:border-gray-200/80 post-card" data-post-id="${post.id}">
        <div class="flex items-center gap-3 px-3 py-2.5">
            <a href="profile.html?id=${authorId}" class="flex-shrink-0 relative">
                <div class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    ${photoUrl ? `<img src="${photoUrl}" class="w-full h-full object-cover" alt="">` : `<span class="text-brand-600 text-sm font-bold">${initials}</span>`}
                </div>
                ${avatarBadgeHtml}
            </a>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <a href="profile.html?id=${authorId}" class="font-semibold text-gray-900 text-sm hover:underline">${name}</a>
                    ${badge}
                </div>
                <p class="text-[10px] text-gray-400">${timeAgo}</p>
            </div>
        </div>
        <div class="relative overflow-hidden" style="min-height:190px">
            <div class="blur-sm pointer-events-none select-none opacity-50">
                ${imageHtml || '<div class="h-36 bg-gray-100 flex items-center justify-center"><svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>'}
                <div class="px-3 py-2 space-y-2">
                    <div class="h-3 bg-gray-200 rounded-full w-3/4"></div>
                    <div class="h-3 bg-gray-200 rounded-full w-1/2"></div>
                </div>
            </div>
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/55 backdrop-blur-[2px]">
                <svg class="w-7 h-7 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 9V7a2 2 0 114 0v2"/>
                </svg>
                <p class="text-sm font-bold text-gray-900">Active Members Only</p>
                <p class="text-xs text-gray-500">Contribute to see posts from the last 7 days</p>
                <a href="contribution.html"
                   class="mt-1 px-4 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-full transition shadow-sm">
                    Start / Renew Contribution →
                </a>
            </div>
        </div>
    </article>`;
    }

    return `
    <article class="bg-white border-b sm:border sm:rounded-2xl sm:border-gray-200/80 post-card fade-in" data-post-id="${post.id}">
        <!-- Post Header -->
        <div class="flex items-center gap-3 px-3 py-2.5">
            <a href="profile.html?id=${authorId}" class="flex-shrink-0 relative">
                <div class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    ${photoUrl ? `<img src="${photoUrl}" class="w-full h-full object-cover" alt="">` : `<span class="text-brand-600 text-sm font-bold">${initials}</span>`}
                </div>
                ${avatarBadgeHtml}
            </a>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <a href="profile.html?id=${authorId}" class="font-semibold text-gray-900 text-sm hover:underline">${name}</a>
                    ${badge}
                </div>
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

        <!-- Images (edge-to-edge on mobile) -->
        ${imageHtml}

        <!-- Action Bar -->
        <div class="flex items-center justify-between px-3 pt-2.5 pb-1">
            <div class="flex items-center gap-4">
                <button class="like-btn flex items-center gap-1.5 transition-transform active:scale-110 ${myLike ? 'text-red-500' : 'text-gray-900'}" data-post-id="${post.id}" data-liked="${myLike ? 'true' : 'false'}">
                    <svg class="w-6 h-6" fill="${myLike ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    ${likeCount > 0 ? `<span class="like-count text-sm font-semibold">${likeCount.toLocaleString()}</span>` : `<span class="like-count text-sm font-semibold"></span>`}
                </button>
                <button class="comment-btn flex items-center gap-1.5 text-gray-900 transition-transform active:scale-110" data-post-id="${post.id}">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    ${commentCount > 0 ? `<span class="comment-count text-sm">${commentCount.toLocaleString()}</span>` : `<span class="comment-count text-sm"></span>`}
                </button>
            </div>
            <button class="bookmark-btn transition-transform active:scale-110 ${isBookmarked ? 'text-gray-900' : 'text-gray-900'}" data-post-id="${post.id}" data-saved="${isBookmarked ? 'true' : 'false'}">
                <svg class="w-6 h-6" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
            </button>
        </div>

        <!-- Caption -->
        <div class="px-3 pb-1">
            ${contentHtml ? `
            <div class="text-sm leading-snug">
                <span class="font-semibold text-gray-900">${name}</span>
                <span class="text-gray-800 feed-caption-text ${captionClass}">${contentHtml}</span>
                ${captionTruncated ? `<button class="feed-caption-more text-gray-400 text-sm" onclick="this.previousElementSibling.classList.remove('line-clamp-1');this.remove()">more</button>` : ''}
            </div>` : ''}
        </div>

        <!-- Time -->
        <div class="px-3 pb-3 pt-0.5">
            <span class="text-[10px] text-gray-400 uppercase tracking-wide">${timeAgo}${post.updated_at !== post.created_at ? ' · edited' : ''}</span>
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
