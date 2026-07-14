export const SPLASH_HANDOFF_KEY = 'jmSplashHandoff';

export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
