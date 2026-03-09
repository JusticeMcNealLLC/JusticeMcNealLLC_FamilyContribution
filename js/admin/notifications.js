// ══════════════════════════════════════════
// Admin – Notifications (Test & Monitor)
// ══════════════════════════════════════════

(function () {
    'use strict';

    var members = [];
    var currentAdmin = null;

    // ─── Type Config ────────────────────────────────────
    var TYPE_EMOJI = {
        system: '🔧', welcome: '👋', like: '❤️', comment: '💬',
        mention: '📢', follow: '🤝', quest: '⭐', badge: '🏆',
        milestone: '🎯', deposit: '💵', payout: '💸', event: '📅',
    };

    // ─── Init ───────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async function () {
        var { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) { window.location.href = '../login.html'; return; }
        currentAdmin = session.user;

        await Promise.all([loadMembers(), loadStats(), loadSubscribers(), loadLog()]);
        wireUI();
    });

    // ─── Load Members ───────────────────────────────────
    async function loadMembers() {
        var { data } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, profile_picture_url')
            .order('first_name');

        members = data || [];

        var sel = document.getElementById('recipientSelect');
        sel.innerHTML = '<option value="all">📣 All Members (' + members.length + ')</option>';
        members.forEach(function (m) {
            var name = (m.first_name || '') + ' ' + (m.last_name || '');
            sel.innerHTML += '<option value="' + m.id + '">' + name.trim() + '</option>';
        });
    }

    // ─── Load Stats ─────────────────────────────────────
    async function loadStats() {
        // Push subscribers count
        var { count: subCount } = await supabaseClient
            .from('push_subscriptions')
            .select('id', { count: 'exact', head: true });

        document.getElementById('statSubscribers').textContent = subCount || 0;

        // Total notifications sent
        var { count: totalCount } = await supabaseClient
            .from('notifications')
            .select('id', { count: 'exact', head: true });

        document.getElementById('statTotalSent').textContent = totalCount || 0;

        // Unread notifications
        var { count: unreadCount } = await supabaseClient
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .is('read_at', null);

        document.getElementById('statUnread').textContent = unreadCount || 0;
    }

    // ─── Load Push Subscribers ──────────────────────────
    async function loadSubscribers() {
        var { data } = await supabaseClient
            .from('push_subscriptions')
            .select('id, user_id, user_agent, created_at, endpoint')
            .order('created_at', { ascending: false });

        var container = document.getElementById('subscribersList');
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-sm text-gray-400 py-8 text-center">No push subscribers yet</div>';
            return;
        }

        var html = '';
        data.forEach(function (sub) {
            var member = members.find(function (m) { return m.id === sub.user_id; });
            var name = member ? ((member.first_name || '') + ' ' + (member.last_name || '')).trim() : 'Unknown';
            var initial = name.charAt(0).toUpperCase();
            var avatar = member && member.profile_picture_url
                ? '<img src="' + member.profile_picture_url + '" class="w-full h-full object-cover" alt="">'
                : '<span class="text-brand-600 text-xs font-bold">' + initial + '</span>';

            // Parse user agent for a short browser label
            var ua = sub.user_agent || '';
            var browser = 'Unknown';
            if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
            else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
            else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
            else if (ua.indexOf('Edg') > -1) browser = 'Edge';

            var device = /Mobile|iPhone|Android/.test(ua) ? '📱' : '💻';

            var date = new Date(sub.created_at);
            var dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            html += '<div class="flex items-center gap-3 p-3 rounded-xl bg-surface-50 border border-gray-100">' +
                '<div class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden flex-shrink-0">' + avatar + '</div>' +
                '<div class="flex-1 min-w-0">' +
                    '<div class="text-sm font-medium text-gray-900 truncate">' + name + '</div>' +
                    '<div class="text-xs text-gray-400">' + device + ' ' + browser + ' · Subscribed ' + dateStr + '</div>' +
                '</div>' +
            '</div>';
        });

        container.innerHTML = html;
    }

    // ─── Load Recent Notifications ──────────────────────
    async function loadLog() {
        var { data } = await supabaseClient
            .from('notifications')
            .select('id, user_id, type, message, actor_name, read_at, created_at')
            .order('created_at', { ascending: false })
            .limit(50);

        var container = document.getElementById('notificationsLog');
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-sm text-gray-400 py-8 text-center">No notifications yet</div>';
            return;
        }

        var html = '';
        data.forEach(function (n) {
            var member = members.find(function (m) { return m.id === n.user_id; });
            var toName = member ? ((member.first_name || '') + ' ' + (member.last_name || '')).trim() : 'Unknown';
            var emoji = TYPE_EMOJI[n.type] || '🔔';
            var readBadge = n.read_at
                ? '<span class="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Read</span>'
                : '<span class="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">Unread</span>';

            var date = new Date(n.created_at);
            var timeStr = date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

            html += '<div class="flex items-start gap-3 p-3 rounded-xl bg-surface-50 border border-gray-100">' +
                '<div class="text-lg mt-0.5">' + emoji + '</div>' +
                '<div class="flex-1 min-w-0">' +
                    '<div class="flex items-center gap-2 flex-wrap">' +
                        '<span class="text-sm font-medium text-gray-900">→ ' + toName + '</span>' +
                        '<span class="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full font-medium">' + n.type + '</span>' +
                        readBadge +
                    '</div>' +
                    '<p class="text-sm text-gray-600 mt-0.5 line-clamp-2">' + (n.message || '(no message)') + '</p>' +
                    '<div class="text-xs text-gray-400 mt-1">' + timeStr +
                        (n.actor_name ? ' · from ' + n.actor_name : '') +
                    '</div>' +
                '</div>' +
            '</div>';
        });

        container.innerHTML = html;
    }

    // ─── Wire UI ────────────────────────────────────────
    function wireUI() {
        document.getElementById('sendBtn').addEventListener('click', handleSend);
        document.getElementById('refreshLogBtn').addEventListener('click', function () {
            loadStats();
            loadLog();
            loadSubscribers();
        });
    }

    // ─── Send Notification ──────────────────────────────
    async function handleSend() {
        var recipientVal = document.getElementById('recipientSelect').value;
        var type = document.getElementById('typeSelect').value;
        var message = document.getElementById('messageInput').value.trim();
        var sendPush = document.getElementById('sendPushToggle').checked;

        var errEl = document.getElementById('sendError');
        var successEl = document.getElementById('sendSuccess');
        errEl.classList.add('hidden');
        successEl.classList.add('hidden');

        if (!message) {
            errEl.textContent = 'Please enter a message';
            errEl.classList.remove('hidden');
            return;
        }

        var btn = document.getElementById('sendBtn');
        btn.disabled = true;
        btn.innerHTML = '<svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Sending...';

        try {
            // Get admin profile for actor_name
            var { data: adminProfile } = await supabaseClient
                .from('profiles')
                .select('first_name, last_name')
                .eq('id', currentAdmin.id)
                .single();

            var actorName = adminProfile
                ? (adminProfile.first_name || '') + ' ' + (adminProfile.last_name || '')
                : 'Admin';

            // Build recipients list
            var recipients = [];
            if (recipientVal === 'all') {
                recipients = members.map(function (m) { return m.id; });
            } else {
                recipients = [recipientVal];
            }

            // Insert notifications for each recipient
            var notifications = recipients.map(function (uid) {
                return {
                    user_id: uid,
                    type: type,
                    message: message,
                    actor_id: currentAdmin.id,
                    actor_name: actorName.trim(),
                    link: null,
                };
            });

            var { error } = await supabaseClient
                .from('notifications')
                .insert(notifications);

            if (error) throw error;

            // If push is enabled, also insert into push_subscriptions trigger flow
            // The DB trigger on notifications table (024) already handles in-app notifs.
            // For push: we directly invoke the edge function for each recipient with a sub.
            if (sendPush) {
                for (var i = 0; i < recipients.length; i++) {
                    try {
                        await supabaseClient.functions.invoke('send-push-notification', {
                            body: {
                                user_id: recipients[i],
                                type: type,
                                message: message,
                                actor_name: actorName.trim(),
                                link: null,
                            }
                        });
                    } catch (pushErr) {
                        console.warn('Push send failed for', recipients[i], pushErr);
                    }
                }
            }

            successEl.textContent = '✓ Sent to ' + recipients.length + ' member' + (recipients.length > 1 ? 's' : '') + (sendPush ? ' (+ push)' : '');
            successEl.classList.remove('hidden');
            document.getElementById('messageInput').value = '';

            // Refresh stats & log
            loadStats();
            loadLog();

        } catch (err) {
            console.error('Send notification error:', err);
            errEl.textContent = 'Failed to send: ' + (err.message || 'Unknown error');
            errEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg> Send Notification';
        }
    }

})();
