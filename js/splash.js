// Splash Screen — Logo loader, animation orchestrator, auth-aware redirect

(function () {
    const BUCKET = 'profile-pictures';
    const BRAND_PATHS = {
        transparent: 'brand/logo-transparent.png',
        solidPrefix: 'brand/logo-solid',
    };

    // Timing (ms)
    const PROGRESS_START_DELAY = 1800;   // when progress bar starts filling
    const MIN_DISPLAY_TIME = 3200;        // minimum splash visible time
    const EXIT_ANIMATION_TIME = 500;      // exit animation duration

    // ─── Particles ───
    function spawnParticles() {
        const container = document.getElementById('particles');
        if (!container) return;
        for (let i = 0; i < 12; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = (50 + Math.random() * 40) + '%';
            p.style.animationDelay = (Math.random() * 3) + 's';
            p.style.animationDuration = (2 + Math.random() * 2) + 's';
            const size = 3 + Math.random() * 4;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.background = `rgba(99,102,241,${0.15 + Math.random() * 0.25})`;
            container.appendChild(p);
        }
    }

    // ─── Hide spinner + reveal logo/fallback ───
    function hideSpinner() {
        const spinner = document.getElementById('logoSpinner');
        if (spinner) spinner.classList.add('spinner-hidden');
    }

    function revealElement(el) {
        el.classList.remove('hidden');
        el.classList.add('logo-reveal');
    }

    // ─── Try to load brand logo from Supabase Storage ───
    async function tryLoadLogo() {
        try {
            // Try transparent first
            const { data: files } = await supabaseClient.storage
                .from(BUCKET)
                .list('brand', { limit: 20 });

            if (!files || files.length === 0) {
                // No brand files — show JM fallback, stop spinner
                hideSpinner();
                const fb = document.getElementById('logoFallback');
                if (fb && fb.classList.contains('hidden')) revealElement(fb);
                return;
            }

            // Prefer transparent
            let match = files.find(f => f.name.startsWith('logo-transparent'));
            if (!match) {
                match = files.find(f => f.name.startsWith('logo-solid'));
            }
            if (!match) {
                hideSpinner();
                const fb = document.getElementById('logoFallback');
                if (fb && fb.classList.contains('hidden')) revealElement(fb);
                return;
            }

            const filePath = `brand/${match.name}`;
            const { data: urlData } = supabaseClient.storage
                .from(BUCKET)
                .getPublicUrl(filePath);

            if (!urlData?.publicUrl) return;

            const url = urlData.publicUrl + '?t=' + Date.now();
            const isTransparent = match.name.startsWith('logo-transparent');
            const imgEl = document.getElementById('logoImage');
            const fallback = document.getElementById('logoFallback');
            const container = document.getElementById('logoContainer');

            // Write to localStorage cache for instant display on next visit
            try {
                localStorage.setItem('brandLogoCache', JSON.stringify({ url: url, isTransparent: isTransparent }));
            } catch(e) {}

            // If already applied by inline cache script, skip preload
            if (imgEl && imgEl.src && !imgEl.classList.contains('hidden')) {
                hideSpinner();
                return;
            }

            // Preload
            const img = new Image();
            img.onload = function () {
                hideSpinner();
                imgEl.src = url;
                revealElement(imgEl);
                fallback.classList.add('hidden');

                // If transparent logo, remove the gradient background
                if (isTransparent) {
                    container.classList.remove('bg-gradient-to-br', 'from-brand-500', 'via-brand-600', 'to-brand-800');
                    container.style.background = 'transparent';
                    container.style.boxShadow = 'none';
                    imgEl.classList.remove('p-2');
                }
            };
            img.onerror = function () {
                // Show JM fallback, stop spinner
                hideSpinner();
                const fb = document.getElementById('logoFallback');
                if (fb && fb.classList.contains('hidden')) revealElement(fb);
            };
            img.src = url;
        } catch (err) {
            // Keep fallback text logo — clear stale cache
            hideSpinner();
            const fb = document.getElementById('logoFallback');
            if (fb && fb.classList.contains('hidden')) revealElement(fb);
            try { localStorage.removeItem('brandLogoCache'); } catch(e) {}
            console.log('Splash: using fallback logo');
        }
    }

    // ─── Auth check + redirect ───
    async function getRedirectUrl() {
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();

            if (!session) {
                return APP_CONFIG.LOGIN_URL;
            }

            // Check if admin
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('role, setup_completed')
                .eq('id', session.user.id)
                .single();

            if (profile?.role === 'admin') {
                return APP_CONFIG.ADMIN_URL;
            }

            // Check onboarding
            if (profile && !profile.setup_completed) {
                return APP_CONFIG.ONBOARDING_URL;
            }

            return APP_CONFIG.PORTAL_URL;
        } catch (err) {
            console.error('Auth check failed:', err);
            return APP_CONFIG.LOGIN_URL;
        }
    }

    // ─── Progress bar animation ───
    function startProgress() {
        const bar = document.getElementById('progressBar');
        if (!bar) return;
        // Trigger width transition
        requestAnimationFrame(() => {
            bar.style.width = '100%';
        });
    }

    // ─── Exit and navigate ───
    function exitSplash(url) {
        const content = document.getElementById('splashContent');
        if (content) {
            content.classList.add('splash-exit');
        }
        // Also fade the body
        document.body.style.transition = `opacity ${EXIT_ANIMATION_TIME}ms ease`;
        document.body.style.opacity = '0';

        setTimeout(() => {
            window.location.href = url;
        }, EXIT_ANIMATION_TIME);
    }

    // ─── Main orchestrator ───
    async function init() {
        const startTime = Date.now();

        // Spawn particles immediately
        spawnParticles();

        // Load logo + determine redirect in parallel
        const [_, redirectUrl] = await Promise.all([
            tryLoadLogo(),
            getRedirectUrl(),
        ]);

        // Start progress bar
        setTimeout(startProgress, PROGRESS_START_DELAY - (Date.now() - startTime));

        // Ensure minimum display time, then exit
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);

        setTimeout(() => {
            exitSplash(redirectUrl);
        }, remaining);
    }

    // Go
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
