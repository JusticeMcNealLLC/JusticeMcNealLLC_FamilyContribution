/** Show admin pending queue badge and unread notification count in desktop nav. */
export function initAdminBadges(isAdmin) {
    document.addEventListener('DOMContentLoaded', async function () {
        if (!isAdmin) return;
        try {
            if (typeof supabaseClient === 'undefined') return;

            const { count, error } = await supabaseClient
                .from('family_relations')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending');

            if (error) return;
            if (!count || count <= 0) return;

            const anchors = document.querySelectorAll('nav a[href="index.html"]');
            let target = null;
            anchors.forEach(function (a) {
                if (a.textContent && a.textContent.trim().includes('Admin Hub')) target = a;
            });
            if (!target) target = anchors[0];
            if (!target) return;

            const badge = document.createElement('span');
            badge.className = 'ml-2 inline-flex items-center justify-center bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full';
            badge.textContent = count;
            target.appendChild(badge);
        } catch (e) {
            // silent
        }

        try {
            const session = await supabaseClient.auth.getSession();
            const userId = session?.data?.session?.user?.id;
            if (userId) {
                const { count: notifCount } = await supabaseClient
                    .from('notifications')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', userId)
                    .is('read_at', null);

                if (notifCount && notifCount > 0) {
                    const profileWrap = document.getElementById('navProfileSection') || document.querySelector('#nav-placeholder');
                    const nBadge = document.createElement('span');
                    nBadge.className = 'ml-2 inline-flex items-center justify-center bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full';
                    nBadge.textContent = notifCount;
                    if (profileWrap && profileWrap.parentNode) profileWrap.parentNode.appendChild(nBadge);
                }
            }
        } catch (e) { /* ignore */ }
    });
}
