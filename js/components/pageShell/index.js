import { readPageContext } from './state/pageContext.js';
import { buildPortalSidebar } from './render/portalSidebar.js';
import { buildAdminSidebar } from './render/adminSidebar.js';
import { buildMobileHeader } from './render/mobileHeader.js';
import { buildFooter } from './render/footer.js';
import { buildTabBar } from './render/tabBar.js';
import { buildDrawer } from './render/drawer.js';
import { buildNotificationPanel } from './render/notificationPanel.js';
import { injectPageShell } from './ui/inject.js';
import { bindDropdowns } from './ui/dropdowns.js';
import { initDrawer } from './ui/drawer.js';
import { loadNavProfile } from './ui/profileLoader.js';
import { initAdminBadges } from './ui/adminBadges.js';
import { initReentrySplash } from './ui/reentrySplash.js';

/** Global hook for auth/shared.js (classic script). */
window.loadNavProfile = loadNavProfile;

function init() {
    const { active, isAdmin } = readPageContext();
    const adminBadge = isAdmin
        ? '<span class="bg-brand-100 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full">Admin</span>'
        : '';

    const sideHTML = isAdmin ? buildAdminSidebar(active) : buildPortalSidebar(active);

    injectPageShell({
        sideHTML,
        mobileHeaderHTML: buildMobileHeader({ active, isAdmin, adminBadge }),
        footerHTML: buildFooter(),
        tabsHTML: buildTabBar({ isAdmin, active }),
        drawerHTML: buildDrawer({ isAdmin, active }),
        notifPanelHTML: isAdmin ? '' : buildNotificationPanel(),
    });

    initDrawer();
    initAdminBadges(isAdmin);
    initReentrySplash();

    document.addEventListener('DOMContentLoaded', bindDropdowns);
}

init();
