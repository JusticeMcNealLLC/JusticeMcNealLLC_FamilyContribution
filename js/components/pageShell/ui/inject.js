/** Inject shell HTML into placeholders and restructure the page layout. */
export function injectPageShell({ sideHTML, mobileHeaderHTML, footerHTML, tabsHTML, drawerHTML, notifPanelHTML }) {
    const np = document.getElementById('nav-placeholder');
    const fp = document.getElementById('footer-placeholder');
    const tp = document.getElementById('tabs-placeholder');

    if (np) np.outerHTML = sideHTML + mobileHeaderHTML;
    if (fp) fp.outerHTML = footerHTML;
    if (tp) tp.outerHTML = tabsHTML;

    appendHtmlToBody(drawerHTML);
    if (notifPanelHTML) appendHtmlToBody(notifPanelHTML);

    restructureBodyLayout();
}

function appendHtmlToBody(html) {
    if (!html) return;
    const container = document.createElement('div');
    container.innerHTML = html;
    while (container.firstChild) {
        document.body.appendChild(container.firstChild);
    }
}

function restructureBodyLayout() {
    const body = document.body;
    const sideNav = document.getElementById('sideNav');
    if (!sideNav) return;

    body.classList.add('md:flex-row');

    const contentWrap = document.createElement('div');
    contentWrap.id = 'pageContent';
    contentWrap.className = 'flex-1 flex flex-col min-w-0';

    const skipIds = ['sideNav', 'bottomTabBar', 'navDrawerBackdrop', 'navDrawer', 'notifBackdrop', 'notifPanel'];
    const skip = {};
    for (let si = 0; si < skipIds.length; si++) skip[skipIds[si]] = true;

    const nodes = [];
    let c = body.firstChild;
    while (c) { nodes.push(c); c = c.nextSibling; }

    for (let ni = 0; ni < nodes.length; ni++) {
        if (nodes[ni].nodeType === 1 && skip[nodes[ni].id]) continue;
        contentWrap.appendChild(nodes[ni]);
    }

    body.insertBefore(contentWrap, body.firstChild);
    body.insertBefore(sideNav, contentWrap);

    const scrollEl = sideNav.querySelector('.sidenav-scroll');
    if (scrollEl) {
        const scrollKey = 'sideNavScroll';
        const saved = sessionStorage.getItem(scrollKey);
        if (saved) {
            requestAnimationFrame(function () {
                scrollEl.scrollTop = parseInt(saved, 10);
            });
        }

        const allLinks = sideNav.querySelectorAll('a[href]');
        for (let li = 0; li < allLinks.length; li++) {
            allLinks[li].addEventListener('click', function () {
                sessionStorage.setItem(scrollKey, scrollEl.scrollTop);
            });
        }
    }
}
