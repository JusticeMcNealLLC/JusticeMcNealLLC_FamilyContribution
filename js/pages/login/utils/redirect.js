function isAuthEntryPath(pathname) {
    return pathname.startsWith('/pages/login') || pathname.startsWith('/pages/reset-password');
}

export function getSafeLoginRedirect() {
    const raw = new URLSearchParams(window.location.search).get('redirect');
    if (!raw) return '';

    try {
        const target = new URL(raw, window.location.origin);
        const allowedOrigins = new Set([
            window.location.origin,
            'https://justicemcneal.com',
            'https://www.justicemcneal.com',
        ]);

        if (!allowedOrigins.has(target.origin)) return '';
        if (isAuthEntryPath(target.pathname)) return '';

        if (/\/pages\/portal\/events\.html$/i.test(target.pathname) || /\/portal\/events\.html$/i.test(target.pathname)) {
            const portalSlug = target.searchParams.get('event');
            if (portalSlug) {
                return `${target.origin}/pages/portal/events.html?event=${encodeURIComponent(portalSlug)}`;
            }
        }

        if (/^\/events\/?$/i.test(target.pathname)) {
            const publicSlug = target.searchParams.get('e');
            if (publicSlug) {
                return `${target.origin}/pages/portal/events.html?event=${encodeURIComponent(publicSlug)}`;
            }
        }

        return target.href;
    } catch (_) {
        return '';
    }
}

export function getPostLoginUrl(profile) {
    const redirect = getSafeLoginRedirect();

    if (profile?.role === 'admin') {
        return redirect || APP_CONFIG.ADMIN_URL;
    }

    if (!profile || !profile.setup_completed) {
        return APP_CONFIG.ONBOARDING_URL;
    }

    return redirect || APP_CONFIG.PORTAL_URL;
}
