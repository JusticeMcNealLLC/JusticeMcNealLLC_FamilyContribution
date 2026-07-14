/** PWA re-entry splash when user returns after 3+ minutes away. */
export function initReentrySplash() {
    const THRESHOLD = 3 * 60 * 1000;
    const KEY = 'jmllc_last_hidden';
    let shown = false;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function injectStyles() {
        if (document.getElementById('rs-styles')) return;
        const s = document.createElement('style');
        s.id = 'rs-styles';
        s.textContent = [
            '@keyframes rsOrbAppear{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}',
            '@keyframes rsLogoIn{to{opacity:1;transform:scale(1) translateY(0)}}',
            '@keyframes rsGlow{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.6;transform:scale(1.08)}}',
            '@keyframes rsText{to{opacity:1;transform:translateY(0)}}',
            '@keyframes rsExit{to{opacity:0;transform:scale(1.05);filter:blur(7px)}}',
            '.rs-orb{position:absolute;border-radius:50%;filter:blur(70px);opacity:0;animation:rsOrbAppear .8s ease-out forwards;}',
        ].join('');
        document.head.appendChild(s);
    }

    function show() {
        if (shown) return;
        shown = true;
        injectStyles();

        const ov = document.createElement('div');
        ov.id = 'rs-overlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;background:linear-gradient(135deg,#f8fafc 0%,#eef2ff 50%,#e0e7ff 100%);pointer-events:none;overflow:hidden;';

        const logoSrc = '/assets/icons/icon-192.png';

        ov.innerHTML =
            '<div class="rs-orb" style="width:300px;height:300px;background:radial-gradient(circle,rgba(99,102,241,.32),transparent 70%);top:-70px;right:-70px;animation-delay:.05s;"></div>' +
            '<div class="rs-orb" style="width:240px;height:240px;background:radial-gradient(circle,rgba(129,140,248,.22),transparent 70%);bottom:-55px;left:-55px;animation-delay:.2s;"></div>' +
            '<div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;text-align:center;">' +
                '<div style="position:relative;margin-bottom:18px;opacity:0;transform:scale(.5) translateY(18px);animation:rsLogoIn .7s cubic-bezier(.34,1.56,.64,1) .1s forwards;">' +
                    '<div style="position:absolute;inset:-18px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,.3) 0%,transparent 70%);opacity:0;animation:rsGlow 2s ease-in-out .7s infinite;"></div>' +
                    '<img src="' + logoSrc + '" alt="" style="width:76px;height:76px;border-radius:1.25rem;display:block;position:relative;z-index:1;">' +
                '</div>' +
                '<div style="font-family:Inter,system-ui,sans-serif;font-size:1.1rem;font-weight:800;letter-spacing:-.02em;color:#1e1b4b;opacity:0;transform:translateY(13px);animation:rsText .5s ease-out .55s forwards;">' +
                    'Justice McNeal LLC' +
                '</div>' +
                '<div style="font-family:Inter,system-ui,sans-serif;font-size:.72rem;font-weight:600;color:#6366f1;letter-spacing:.1em;text-transform:uppercase;opacity:0;transform:translateY(10px);animation:rsText .5s ease-out .8s forwards;margin-top:5px;">' +
                    'Welcome Back' +
                '</div>' +
            '</div>';

        document.body.appendChild(ov);

        setTimeout(function () {
            ov.style.animation = 'rsExit .45s cubic-bezier(.4,0,1,1) forwards';
            setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 460);
        }, 1700);
    }

    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            sessionStorage.setItem(KEY, String(Date.now()));
        } else if (document.visibilityState === 'visible') {
            const ts = sessionStorage.getItem(KEY);
            if (ts && (Date.now() - parseInt(ts, 10)) >= THRESHOLD) {
                show();
            }
        }
    });
}
