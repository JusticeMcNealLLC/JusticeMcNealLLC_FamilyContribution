// ─── Notifications Panel Logic ──────────────────────────
// Handles opening/closing the notification panel, loading
// notifications from Supabase, marking as read, and real-time
// subscription for new notifications.
// ─────────────────────────────────────────────────────────

(function() {
    'use strict';

    var panel     = document.getElementById('notifPanel');
    var backdrop  = document.getElementById('notifBackdrop');
    var listEl    = document.getElementById('notifList');
    var emptyEl   = document.getElementById('notifEmpty');
    var badge     = document.getElementById('notifBadge');
    var openBtn   = document.getElementById('notifBtn');
    var markAllBtn = document.getElementById('notifMarkAllBtn');

    if (!panel || !openBtn) return;

    var isOpen = false;
    var notifications = [];
    var currentUserId = null;

    // ─── Open / Close ───────────────────────────────────
    function openPanel() {
        isOpen = true;
        panel.classList.add('open');
        backdrop.classList.add('open');
        loadNotifications();
    }

    function closePanel() {
        isOpen = false;
        panel.classList.remove('open');
        backdrop.classList.remove('open');
    }

    openBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (isOpen) closePanel(); else openPanel();
    });

    if (backdrop) backdrop.addEventListener('click', closePanel);

    // Close button in panel header
    var closeBtn = document.getElementById('notifCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    // Close on escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isOpen) closePanel();
    });

    // ─── Notification Types & Icons ─────────────────────
    var NOTIF_TYPES = {
        like:       { icon: '❤️', action: 'liked your post' },
        comment:    { icon: '💬', action: 'commented on your post' },
        follow:     { icon: '👤', action: 'started following you' },
        mention:    { icon: '📣', action: 'mentioned you' },
        quest:      { icon: '🎯', action: 'Quest completed!' },
        milestone:  { icon: '🏆', action: 'New milestone reached!' },
        badge:      { icon: '🏅', action: 'You earned a badge!' },
        deposit:    { icon: '💰', action: 'Deposit confirmed' },
        payout:     { icon: '💸', action: 'Payout processed' },
        event:      { icon: '📅', action: 'New family event' },
        welcome:    { icon: '👋', action: 'Welcome to the family!' },
        system:     { icon: '🔔', action: '' },
    };

    // ─── Render ─────────────────────────────────────────
    function renderNotifications() {
        if (!notifications.length) {
            if (emptyEl) emptyEl.style.display = '';
            if (listEl) listEl.innerHTML = '';
            return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        var html = '';
        for (var i = 0; i < notifications.length; i++) {
            var n = notifications[i];
            var type = NOTIF_TYPES[n.type] || NOTIF_TYPES.system;
            var unreadCls = n.read_at ? '' : ' unread';
            var actorName = n.actor_name || 'Someone';
            var message = n.message || (actorName + ' ' + type.action);
            var time = getTimeAgo(n.created_at);
            var avatar = n.actor_avatar
                ? '<img src="' + n.actor_avatar + '" class="w-9 h-9 rounded-full object-cover" alt="">'
                : '<div class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-lg">' + type.icon + '</div>';

            html += '<div class="notif-item' + unreadCls + '" data-notif-id="' + n.id + '"' + (n.link ? ' data-notif-link="' + n.link + '"' : '') + '>' +
                '<div class="notif-item-avatar">' + avatar + '</div>' +
                '<div class="notif-item-content">' +
                    '<p class="notif-item-msg">' + escapeHtml(message) + '</p>' +
                    '<span class="notif-item-time">' + time + '</span>' +
                '</div>' +
                (!n.read_at ? '<div class="notif-item-dot"></div>' : '') +
            '</div>';
        }
        if (listEl) listEl.innerHTML = html;

        // Click handler for each item
        listEl.querySelectorAll('.notif-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var nid = this.dataset.notifId;
                var link = this.dataset.notifLink;
                markAsRead(nid);
                if (link) window.location.href = link;
            });
        });
    }

    function updateBadge() {
        var unread = 0;
        for (var i = 0; i < notifications.length; i++) {
            if (!notifications[i].read_at) unread++;
        }
        if (badge) {
            if (unread > 0) {
                badge.textContent = unread > 99 ? '99+' : unread;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    // ─── Load from Supabase ─────────────────────────────
    async function loadNotifications() {
        if (typeof supabaseClient === 'undefined') return;
        try {
            var sess = await supabaseClient.auth.getSession();
            if (!sess.data?.session?.user?.id) return;
            currentUserId = sess.data.session.user.id;

            var { data, error } = await supabaseClient
                .from('notifications')
                .select('*')
                .eq('user_id', currentUserId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) { console.error('Notif load error:', error); return; }
            notifications = data || [];
            renderNotifications();
            updateBadge();
        } catch(e) {
            console.error('Notif load error:', e);
        }
    }

    // ─── Mark as read ───────────────────────────────────
    async function markAsRead(notifId) {
        if (typeof supabaseClient === 'undefined') return;
        // Update local state immediately
        for (var i = 0; i < notifications.length; i++) {
            if (notifications[i].id === notifId) {
                notifications[i].read_at = new Date().toISOString();
                break;
            }
        }
        renderNotifications();
        updateBadge();

        // Persist
        try {
            await supabaseClient.from('notifications')
                .update({ read_at: new Date().toISOString() })
                .eq('id', notifId);
        } catch(e) { console.error('Mark read error:', e); }
    }

    // ─── Mark all read ──────────────────────────────────
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async function() {
            if (typeof supabaseClient === 'undefined') return;
            // Update local
            var now = new Date().toISOString();
            var unreadIds = [];
            for (var i = 0; i < notifications.length; i++) {
                if (!notifications[i].read_at) {
                    notifications[i].read_at = now;
                    unreadIds.push(notifications[i].id);
                }
            }
            renderNotifications();
            updateBadge();

            // Persist
            if (unreadIds.length && currentUserId) {
                try {
                    await supabaseClient.from('notifications')
                        .update({ read_at: now })
                        .eq('user_id', currentUserId)
                        .is('read_at', null);
                } catch(e) { console.error('Mark all read error:', e); }
            }
        });
    }

    // ─── Real-time subscription ─────────────────────────
    function subscribeToNotifications() {
        if (typeof supabaseClient === 'undefined' || !currentUserId) return;
        try {
            supabaseClient
                .channel('notif-' + currentUserId)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: 'user_id=eq.' + currentUserId
                }, function(payload) {
                    notifications.unshift(payload.new);
                    renderNotifications();
                    updateBadge();
                    // Animate the badge
                    if (badge) {
                        badge.classList.add('notif-badge-pop');
                        setTimeout(function() { badge.classList.remove('notif-badge-pop'); }, 400);
                    }
                })
                .subscribe();
        } catch(e) { console.error('Notif subscription error:', e); }
    }

    // ─── Helpers ────────────────────────────────────────
    function escapeHtml(str) {
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function getTimeAgo(dateStr) {
        var now = Date.now();
        var then = new Date(dateStr).getTime();
        var diff = Math.floor((now - then) / 1000);
        if (diff < 60) return 'now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd';
        return Math.floor(diff / 604800) + 'w';
    }

    // ─── Init on auth ready ─────────────────────────────
    document.addEventListener('DOMContentLoaded', async function() {
        if (typeof supabaseClient === 'undefined') return;
        try {
            var sess = await supabaseClient.auth.getSession();
            if (!sess.data?.session?.user?.id) return;
            currentUserId = sess.data.session.user.id;
            await loadNotifications();
            subscribeToNotifications();
        } catch(e) {
            console.error('Notif init error:', e);
        }
    });
})();
