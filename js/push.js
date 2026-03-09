// ─── Push Notification Subscription Manager ─────────────────────────
// Handles:
//   • Checking browser support & permission state
//   • Prompting user to allow push notifications
//   • Subscribing via PushManager with VAPID key
//   • Storing/removing subscription in Supabase push_subscriptions
//   • Exposing a simple API for settings page toggle
// ─────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // VAPID public key (must match edge function)
    var VAPID_PUBLIC_KEY = 'BKqi3z9_x6AakHy0napGUG8MIe-CTtEriDWv-hGzgvRW971O0GJgQuGbWIPyhVl_ElOxrQWsH-CCUJPf-BLY2i0';

    // ─── Helpers ────────────────────────────────────────
    function urlBase64ToUint8Array(base64String) {
        var padding = '='.repeat((4 - base64String.length % 4) % 4);
        var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        var rawData = atob(base64);
        var outputArray = new Uint8Array(rawData.length);
        for (var i = 0; i < rawData.length; i++) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    function isSupported() {
        return 'serviceWorker' in navigator &&
               'PushManager' in window &&
               'Notification' in window;
    }

    // ─── Get current subscription ───────────────────────
    async function getSubscription() {
        if (!isSupported()) return null;
        var reg = await navigator.serviceWorker.ready;
        return reg.pushManager.getSubscription();
    }

    // ─── Subscribe to push ──────────────────────────────
    async function subscribe() {
        if (!isSupported()) {
            console.warn('Push notifications not supported in this browser');
            return { success: false, reason: 'unsupported' };
        }

        // Request permission
        var permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Push notification permission denied');
            return { success: false, reason: 'denied' };
        }

        try {
            var reg = await navigator.serviceWorker.ready;

            // Check for existing subscription
            var existing = await reg.pushManager.getSubscription();
            if (existing) {
                // Already subscribed, ensure it's stored in DB
                await storeSubscription(existing);
                return { success: true, subscription: existing };
            }

            // Subscribe with VAPID key
            var subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });

            // Store in Supabase
            await storeSubscription(subscription);
            console.log('Push subscription successful');
            return { success: true, subscription: subscription };

        } catch (err) {
            console.error('Push subscribe error:', err);
            return { success: false, reason: err.message };
        }
    }

    // ─── Unsubscribe from push ──────────────────────────
    async function unsubscribe() {
        try {
            var subscription = await getSubscription();
            if (!subscription) return { success: true };

            // Remove from DB first
            await removeSubscription(subscription.endpoint);

            // Unsubscribe from browser
            await subscription.unsubscribe();
            console.log('Push unsubscribed');
            return { success: true };

        } catch (err) {
            console.error('Push unsubscribe error:', err);
            return { success: false, reason: err.message };
        }
    }

    // ─── Store subscription in Supabase ─────────────────
    async function storeSubscription(subscription) {
        if (typeof supabaseClient === 'undefined') return;

        var sess = await supabaseClient.auth.getSession();
        if (!sess.data?.session?.user?.id) return;

        var json = subscription.toJSON();
        var payload = {
            user_id: sess.data.session.user.id,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth_key: json.keys.auth,
            user_agent: navigator.userAgent,
        };

        // Upsert (unique on user_id + endpoint)
        var { error } = await supabaseClient
            .from('push_subscriptions')
            .upsert(payload, { onConflict: 'user_id,endpoint' });

        if (error) console.error('Store push sub error:', error);
    }

    // ─── Remove subscription from Supabase ──────────────
    async function removeSubscription(endpoint) {
        if (typeof supabaseClient === 'undefined') return;

        var sess = await supabaseClient.auth.getSession();
        if (!sess.data?.session?.user?.id) return;

        var { error } = await supabaseClient
            .from('push_subscriptions')
            .delete()
            .eq('user_id', sess.data.session.user.id)
            .eq('endpoint', endpoint);

        if (error) console.error('Remove push sub error:', error);
    }

    // ─── Get permission state ───────────────────────────
    function getPermissionState() {
        if (!isSupported()) return 'unsupported';
        return Notification.permission; // 'default', 'granted', 'denied'
    }

    // ─── Check if currently subscribed ──────────────────
    async function isSubscribed() {
        var sub = await getSubscription();
        return !!sub;
    }

    // ─── Auto-subscribe on login (if already granted) ───
    async function autoSubscribe() {
        if (!isSupported()) return;
        if (Notification.permission !== 'granted') return;

        var sub = await getSubscription();
        if (sub) {
            // Ensure it's stored (re-login, new device scenario)
            await storeSubscription(sub);
        }
    }

    // ─── Show soft prompt (non-blocking banner) ─────────
    function showSoftPrompt() {
        if (!isSupported()) return;
        if (Notification.permission !== 'default') return;
        // Don't show if already dismissed this session
        if (sessionStorage.getItem('jm_push_dismissed')) return;

        var banner = document.createElement('div');
        banner.id = 'pushPromptBanner';
        banner.className = 'fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 ' +
            'bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-[9999] ' +
            'flex items-start gap-3 slide-up';
        banner.innerHTML =
            '<div class="text-2xl mt-0.5">🔔</div>' +
            '<div class="flex-1 min-w-0">' +
                '<p class="text-sm font-semibold text-gray-900">Stay in the loop!</p>' +
                '<p class="text-xs text-gray-500 mt-0.5">Get notified when someone likes, comments, or mentions you.</p>' +
                '<div class="flex gap-2 mt-3">' +
                    '<button id="pushPromptAllow" class="px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">Allow</button>' +
                    '<button id="pushPromptDismiss" class="px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">Not now</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(banner);

        document.getElementById('pushPromptAllow').addEventListener('click', async function () {
            banner.remove();
            var result = await subscribe();
            if (result.success) {
                showToast('Notifications enabled! 🎉');
            }
        });

        document.getElementById('pushPromptDismiss').addEventListener('click', function () {
            banner.remove();
            sessionStorage.setItem('jm_push_dismissed', '1');
        });

        // Auto-dismiss after 15 seconds
        setTimeout(function () {
            if (banner.parentNode) {
                banner.style.opacity = '0';
                banner.style.transform = 'translateY(20px)';
                setTimeout(function () { banner.remove(); }, 300);
            }
        }, 15000);
    }

    // ─── Toast helper ───────────────────────────────────
    function showToast(msg) {
        var t = document.createElement('div');
        t.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-[99999]';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function () {
            t.style.opacity = '0';
            t.style.transition = 'opacity 0.3s';
            setTimeout(function () { t.remove(); }, 300);
        }, 3000);
    }

    // ─── Init: auto-subscribe + soft prompt ─────────────
    document.addEventListener('DOMContentLoaded', async function () {
        if (!isSupported()) return;
        if (typeof supabaseClient === 'undefined') return;

        // Skip auto-prompt on onboarding page (has its own push step)
        if (window.location.pathname.indexOf('onboarding') > -1) return;

        // Wait for auth
        try {
            var sess = await supabaseClient.auth.getSession();
            if (!sess.data?.session?.user?.id) return;
        } catch (_) { return; }

        // If already granted, ensure subscription is synced
        await autoSubscribe();

        // If permission is 'default', show soft prompt after a delay
        if (Notification.permission === 'default') {
            setTimeout(showSoftPrompt, 5000); // 5s after page load
        }
    });

    // ─── Public API ─────────────────────────────────────
    window.JMPush = {
        isSupported: isSupported,
        subscribe: subscribe,
        unsubscribe: unsubscribe,
        getPermissionState: getPermissionState,
        isSubscribed: isSubscribed,
    };
})();
