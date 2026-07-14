/** Swipe-up nav drawer, dock edit mode, tap-to-assign, fly animation. */
export function initDrawer() {
    const tabBar = document.getElementById('bottomTabBar');
    const drawer = document.getElementById('navDrawer');
    const backdrop = document.getElementById('navDrawerBackdrop');
    if (!tabBar || !drawer || !backdrop) return;

    let isOpen = false;
    let startY = 0;
    let currentY = 0;
    let dragging = false;
    let savedScrollY = 0;
    let editMode = false;

    function openDrawer() {
        isOpen = true;
        drawer.classList.add('open');
        backdrop.classList.add('open');
        savedScrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = '-' + savedScrollY + 'px';
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        isOpen = false;
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, savedScrollY);
        if (editMode) doExitEditMode();
    }

    tabBar.addEventListener('touchstart', function (e) {
        startY = e.touches[0].clientY;
        dragging = false;
    }, { passive: true });

    tabBar.addEventListener('touchmove', function (e) {
        e.preventDefault();
        const dy = startY - e.touches[0].clientY;
        if (dy > 30 && !isOpen) {
            dragging = true;
            openDrawer();
        }
    }, { passive: false });

    let drawerStartX = 0;
    let drawerStartY = 0;
    let drawerSwipeDir = null;

    drawer.addEventListener('touchstart', function (e) {
        drawerStartX = e.touches[0].clientX;
        drawerStartY = e.touches[0].clientY;
        currentY = 0;
        drawerSwipeDir = null;
        drawer.classList.add('dragging');
    }, { passive: true });

    drawer.addEventListener('touchmove', function (e) {
        const dx = e.touches[0].clientX - drawerStartX;
        const dy = e.touches[0].clientY - drawerStartY;
        if (drawerSwipeDir === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
            drawerSwipeDir = Math.abs(dy) >= Math.abs(dx) ? 'v' : 'h';
        }
        if (drawerSwipeDir === 'h') {
            drawer.classList.remove('dragging');
            return;
        }
        e.preventDefault();
        currentY = dy;
        if (currentY > 0) {
            drawer.style.transform = 'translateY(' + currentY + 'px)';
        }
    }, { passive: false });

    drawer.addEventListener('touchend', function () {
        drawer.classList.remove('dragging');
        drawer.style.transform = '';
        if (currentY > 80) {
            closeDrawer();
        }
        currentY = 0;
        drawerSwipeDir = null;
    });

    backdrop.addEventListener('click', closeDrawer);

    const drawerItems = document.querySelectorAll('.nav-drawer-item');
    const dockSlots = document.querySelectorAll('.dock-slot');
    const customizeBtn = document.getElementById('dockCustomizeBtn');
    const dockPreview = document.getElementById('dockPreview');

    const pageCatalog = {};
    drawerItems.forEach(function (item) {
        pageCatalog[item.dataset.drawerPage] = {
            page: item.dataset.drawerPage,
            href: item.dataset.drawerHref,
            label: item.dataset.drawerLabel,
            icon: item.dataset.drawerIcon,
        };
    });

    const LOCKED_DOCK = { '1': 'feed', '3': 'dashboard', '5': 'profile' };
    const CUSTOM_SLOTS = ['2', '4'];
    const DEFAULT_CUSTOM = { '2': 'events', '4': 'investments' };

    function getSavedDock() {
        try {
            const s = localStorage.getItem('jm_dock_config');
            return s ? JSON.parse(s) : null;
        } catch (e) {
            return null;
        }
    }

    function saveDockConfig(config) {
        localStorage.setItem('jm_dock_config', JSON.stringify(config));
        if (typeof supabaseClient !== 'undefined') {
            supabaseClient.auth.getSession().then(function (res) {
                if (res.data?.session?.user?.id) {
                    supabaseClient.from('profiles').update({ dock_config: config })
                        .eq('id', res.data.session.user.id);
                }
            });
        }
    }

    function getCurrentDockConfig() {
        const saved = getSavedDock();
        if (saved) return saved;
        const config = {};
        for (const s in DEFAULT_CUSTOM) {
            const pg = pageCatalog[DEFAULT_CUSTOM[s]];
            if (pg) config[s] = { page: pg.page, href: pg.href, label: pg.label, icon: pg.icon };
        }
        return config;
    }

    function updateDockSlot(slotNum, info) {
        const slot = document.querySelector('[data-dock-slot="' + slotNum + '"]');
        if (!slot) return;
        if (!info) {
            slot.innerHTML = '';
            slot.classList.add('dock-slot-empty');
            return;
        }
        slot.classList.remove('dock-slot-empty');
        const act = document.body.dataset.activePage || '';
        const cls = info.page === act ? 'tab-active' : 'tab-inactive';
        slot.innerHTML =
            '<a href="' + info.href + '" class="' + cls + '">' +
                '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="' + info.icon + '"></path>' +
                '</svg>' +
                '<span>' + info.label + '</span></a>';
    }

    function applyDockConfig() {
        const config = getCurrentDockConfig();
        CUSTOM_SLOTS.forEach(function (s) { updateDockSlot(s, config[s] || null); });
    }
    applyDockConfig();

    drawerItems.forEach(function (item) {
        item.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        let tapX = 0;
        let tapY = 0;
        let moved = false;
        item.addEventListener('touchstart', function (e) {
            e.preventDefault();
            tapX = e.touches[0].clientX;
            tapY = e.touches[0].clientY;
            moved = false;
        }, { passive: false });
        item.addEventListener('touchmove', function (e) {
            if (Math.abs(e.touches[0].clientX - tapX) > 10 || Math.abs(e.touches[0].clientY - tapY) > 10) moved = true;
        }, { passive: true });
        item.addEventListener('touchend', function () {
            if (moved) return;
            if (editMode) {
                handleEditTap(item);
            } else {
                const href = item.getAttribute('href') || item.dataset.drawerHref;
                if (href) window.location.href = href;
            }
        });
    });

    function buildDockPreview() {
        const config = getCurrentDockConfig();
        let html = '<div class="dock-preview-label">Your Dock</div><div class="dock-preview-slots">';
        for (let i = 1; i <= 5; i++) {
            const s = String(i);
            const isLocked = !!LOCKED_DOCK[s];
            const info = isLocked ? pageCatalog[LOCKED_DOCK[s]] : (config[s] || null);
            const isCenter = s === '3';
            const cls = 'dock-preview-slot' + (isLocked ? ' locked' : '') + (isCenter ? ' center' : '') + (!info && !isLocked ? ' empty' : '');
            html += '<div class="' + cls + '" data-preview-slot="' + s + '">';
            if (info) {
                html += '<div class="dock-preview-icon' + (isCenter ? ' center-icon' : '') + '"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="' + info.icon + '"></path></svg></div>';
                html += '<span>' + info.label + '</span>';
                if (!isLocked) html += '<button class="dock-preview-remove" data-remove-slot="' + s + '">&times;</button>';
            } else {
                html += '<div class="dock-preview-icon empty-icon"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></div>';
                html += '<span>Empty</span>';
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    function getDockedPages() {
        const config = getCurrentDockConfig();
        const d = {};
        for (const s in LOCKED_DOCK) d[LOCKED_DOCK[s]] = true;
        CUSTOM_SLOTS.forEach(function (s) { if (config[s]) d[config[s].page] = true; });
        return d;
    }

    function wireRemoveButtons() {
        if (!dockPreview) return;
        dockPreview.querySelectorAll('.dock-preview-remove').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                removeFromDock(this.dataset.removeSlot);
            });
        });
    }

    function refreshEditUI() {
        if (!dockPreview) return;
        dockPreview.innerHTML = buildDockPreview();
        const docked = getDockedPages();
        drawerItems.forEach(function (it) {
            it.classList.toggle('docked', !!docked[it.dataset.drawerPage]);
        });
        wireRemoveButtons();
    }

    function doExitEditMode() {
        editMode = false;
        drawer.classList.remove('dock-edit-active');
        if (customizeBtn) {
            customizeBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg><span>Customize</span>';
            customizeBtn.classList.remove('done');
        }
        if (dockPreview) dockPreview.classList.add('hidden');
        drawerItems.forEach(function (it) { it.classList.remove('docked'); });
        saveDockConfig(getCurrentDockConfig());
        applyDockConfig();
    }

    function enterEditMode() {
        editMode = true;
        drawer.classList.add('dock-edit-active');
        if (customizeBtn) {
            customizeBtn.innerHTML = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Done</span>';
            customizeBtn.classList.add('done');
        }
        if (dockPreview) dockPreview.classList.remove('hidden');
        refreshEditUI();
        if (navigator.vibrate) navigator.vibrate(10);
    }

    if (customizeBtn) {
        customizeBtn.addEventListener('click', function () {
            if (editMode) doExitEditMode();
            else enterEditMode();
        });
    }

    function handleEditTap(item) {
        const pageKey = item.dataset.drawerPage;

        if (LOCKED_DOCK['1'] === pageKey || LOCKED_DOCK['3'] === pageKey || LOCKED_DOCK['5'] === pageKey) {
            item.classList.add('shake');
            setTimeout(function () { item.classList.remove('shake'); }, 400);
            return;
        }

        const config = getCurrentDockConfig();

        for (let i = 0; i < CUSTOM_SLOTS.length; i++) {
            if (config[CUSTOM_SLOTS[i]] && config[CUSTOM_SLOTS[i]].page === pageKey) {
                const ps = dockPreview.querySelector('[data-preview-slot="' + CUSTOM_SLOTS[i] + '"]');
                if (ps) { ps.classList.add('flash'); setTimeout(function () { ps.classList.remove('flash'); }, 500); }
                return;
            }
        }

        let target = null;
        for (let j = 0; j < CUSTOM_SLOTS.length; j++) {
            if (!config[CUSTOM_SLOTS[j]]) { target = CUSTOM_SLOTS[j]; break; }
        }
        if (!target) {
            if (dockPreview) { dockPreview.classList.add('flash'); setTimeout(function () { dockPreview.classList.remove('flash'); }, 500); }
            return;
        }

        const info = { page: pageKey, href: item.dataset.drawerHref, label: item.dataset.drawerLabel, icon: item.dataset.drawerIcon };
        const previewSlot = dockPreview.querySelector('[data-preview-slot="' + target + '"]');
        flyToSlot(item, previewSlot, function () {
            config[target] = info;
            localStorage.setItem('jm_dock_config', JSON.stringify(config));
            refreshEditUI();
            updateDockSlot(target, info);
        });
    }

    function removeFromDock(slotNum) {
        const config = getCurrentDockConfig();
        config[slotNum] = null;
        localStorage.setItem('jm_dock_config', JSON.stringify(config));

        const ps = dockPreview.querySelector('[data-preview-slot="' + slotNum + '"]');
        if (ps) {
            ps.classList.add('removing');
            setTimeout(function () { refreshEditUI(); }, 250);
        } else {
            refreshEditUI();
        }
        updateDockSlot(slotNum, null);
        if (navigator.vibrate) navigator.vibrate(10);
    }

    function flyToSlot(fromEl, toEl, callback) {
        const fr = fromEl.getBoundingClientRect();
        const tr = toEl.getBoundingClientRect();
        const clone = document.createElement('div');
        clone.className = 'fly-clone';
        const icon = fromEl.querySelector('.drawer-icon');
        if (icon) clone.innerHTML = icon.outerHTML;

        clone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:1;' +
            'left:' + (fr.left + fr.width / 2) + 'px;' +
            'top:' + (fr.top + fr.height / 2) + 'px;' +
            'transform:translate(-50%,-50%) scale(1);' +
            'transition:left 0.45s cubic-bezier(0.22,1,0.36,1),top 0.45s cubic-bezier(0.22,1,0.36,1),transform 0.45s cubic-bezier(0.22,1,0.36,1),opacity 0.35s ease;';
        document.body.appendChild(clone);

        fromEl.style.opacity = '0.3';
        fromEl.style.transform = 'scale(0.9)';

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                clone.style.left = (tr.left + tr.width / 2) + 'px';
                clone.style.top = (tr.top + tr.height / 2) + 'px';
                clone.style.transform = 'translate(-50%,-50%) scale(0.7)';
                clone.style.opacity = '0.6';
            });
        });

        setTimeout(function () {
            clone.remove();
            fromEl.style.opacity = '';
            fromEl.style.transform = '';
            toEl.classList.add('landing');
            setTimeout(function () { toEl.classList.remove('landing'); }, 350);
            if (callback) callback();
            if (navigator.vibrate) navigator.vibrate(15);
        }, 460);
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof supabaseClient === 'undefined') return;
        supabaseClient.auth.getSession().then(function (res) {
            if (!res.data?.session?.user?.id) return;
            supabaseClient.from('profiles').select('dock_config')
                .eq('id', res.data.session.user.id).single()
                .then(function (r) {
                    if (r.data?.dock_config) {
                        localStorage.setItem('jm_dock_config', JSON.stringify(r.data.dock_config));
                        applyDockConfig();
                    }
                });
        });
    });
}
