import { PROGRESS_START_DELAY, MIN_DISPLAY_TIME } from './state/timing.js';
import { applyCachedBrandLogo, tryLoadLogo } from './render/logo.js';
import { startProgress } from './ui/progress.js';
import { exitSplash } from './ui/exit.js';
import { getRedirectUrl } from './utils/authRedirect.js';

applyCachedBrandLogo();

async function init() {
    const startTime = Date.now();

    const [, redirectUrl] = await Promise.all([
        tryLoadLogo(),
        getRedirectUrl(),
    ]);

    setTimeout(startProgress, PROGRESS_START_DELAY - (Date.now() - startTime));

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_DISPLAY_TIME - elapsed);

    setTimeout(() => {
        exitSplash(redirectUrl);
    }, remaining);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
