// ─── Page Shell: Drawer & Dock Customization ────────────
// Swipe-up nav drawer, dock edit mode, tap-to-assign, fly animation.
// ─────────────────────────────────────────────────────────

(function() {
    var PS     = window.PageShell;
    var p      = PS.p;
    var mTab   = PS.mTab;

    var tabBar   = document.getElementById('bottomTabBar');
    var drawer   = document.getElementById('navDrawer');
    var backdrop = document.getElementById('navDrawerBackdrop');
    if (!tabBar || !drawer || !backdrop) return;

    var isOpen = false;
    var startY = 0, currentY = 0, dragging = false;
    var savedScrollY = 0;
    var editMode = false;

    // ─── Open / Close helpers ───────────────────────
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

    // ─── Swipe-up on tab bar to open ────────────────────
    tabBar.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
        dragging = false;
    }, { passive: true });

    tabBar.addEventListener('touchmove', function(e) {
        e.preventDefault();
        var dy = startY - e.touches[0].clientY;
        if (dy > 30 && !isOpen) {
            dragging = true;
            openDrawer();
        }
    }, { passive: false });

    // ─── Swipe-down on drawer to close ──────────────────
    var drawerStartY = 0;
    drawer.addEventListener('touchstart', function(e) {
        drawerStartY = e.touches[0].clientY;
        currentY = 0;
        drawer.classList.add('dragging');
    }, { passive: true });

    drawer.addEventListener('touchmove', function(e) {
        e.preventDefault();
        currentY = e.touches[0].clientY - drawerStartY;
        if (currentY > 0) {
            drawer.style.transform = 'translateY(' + currentY + 'px)';
        }
    }, { passive: false });

    drawer.addEventListener('touchend', function() {
        drawer.classList.remove('dragging');
        drawer.style.transform = '';
        if (currentY > 80) {
            closeDrawer();
        }
        currentY = 0;
    });

    backdrop.addEventListener('click', closeDrawer);

    // ─── Dock Customization (Edit Mode) ─────────────────
    var drawerItems  = document.querySelectorAll('.nav-drawer-item');
    var dockSlots    = document.querySelectorAll('.dock-slot');
    var customizeBtn = document.getElementById('dockCustomizeBtn');
    var dockPreview  = document.getElementById('dockPreview');

    // Build page catalog from drawer DOM
    var pageCatalog = {};
    drawerItems.forEach(function(item) {
        pageCatalog[item.dataset.drawerPage] = {
            page: item.dataset.drawerPage,
            href: item.dataset.drawerHref,
            label: item.dataset.drawerLabel,
            icon: item.dataset.drawerIcon
        };
    });

    var LOCKED_DOCK = { '1': 'feed', '3': 'dashboard', '5': 'profile' };
    var CUSTOM_SLOTS = ['2', '4'];
    var DEFAULT_CUSTOM = { '2': 'events', '4': 'investments' };

    function getSavedDock() {
        try { var s = localStorage.getItem('jm_dock_config'); return s ? JSON.parse(s) : null; }
        catch(e) { return null; }
    }

    function saveDockConfig(config) {
        localStorage.setItem('jm_dock_config', JSON.stringify(config));
        if (typeof supabaseClient !== 'undefined') {
            supabaseClient.auth.getSession().then(function(res) {
                if (res.data?.session?.user?.id) {
                    supabaseClient.from('profiles').update({ dock_config: config })
                        .eq('id', res.data.session.user.id);
                }
            });
        }
    }

    function getCurrentDockConfig() {
        var saved = getSavedDock();
        if (saved) return saved;
        var config = {};
        for (var s in DEFAULT_CUSTOM) {
            var pg = pageCatalog[DEFAULT_CUSTOM[s]];
            if (pg) config[s] = { page: pg.page, href: pg.href, label: pg.label, icon: pg.icon };
        }
        return config;
    }

    function updateDockSlot(slotNum, info) {
        var slot = document.querySelector('[data-dock-slot="' + slotNum + '"]');
        if (!slot) return;
        if (!info) {
            slot.innerHTML = '';
            slot.classList.add('dock-slot-empty');
            return;
        }
        slot.classList.remove('dock-slot-empty');
        var act = document.body.dataset.activePage || '';
        var cls = info.page === act ? 'tab-active' : 'tab-inactive';
        slot.innerHTML =
            '<a href="' + info.href + '" class="' + cls + '">' +
                '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="' + info.icon + '"></path>' +
                '</svg>' +
                '<span>' + info.label + '</span></a>';
    }

    function applyDockConfig() {
        var config = getCurrentDockConfig();
        CUSTOM_SLOTS.forEach(function(s) { updateDockSlot(s, config[s] || null); });
    }
    applyDockConfig();

    // ─── iOS link preview block + tap handler ───────────
    drawerItems.forEach(function(item) {
        item.addEventListener('contextmenu', function(e) { e.preventDefault(); });
        var tapX = 0, tapY = 0, moved = false;
        item.addEventListener('touchstart', function(e) {
            e.preventDefault();
            tapX = e.touches[0].clientX;
            tapY = e.touches[0].clientY;
            moved = false;
        }, { passive: false });
        item.addEventListener('touchmove', function(e) {
            if (Math.abs(e.touches[0].clientX - tapX) > 10 || Math.abs(e.touches[0].clientY - tapY) > 10) moved = true;
        }, { passive: true });
        item.addEventListener('touchend', function() {
            if (moved) return;
            if (editMode) {
                handleEditTap(item);
            } else {
                var href = item.getAttribute('href') || item.dataset.drawerHref;
                if (href) window.location.href = href;
            }
        });
    });

    // ─── Edit Mode Functions ────────────────────────────
    function buildDockPreview() {
        var config = getCurrentDockConfig();
        var html = '<div class="dock-preview-label">Your Dock</div><div class="dock-preview-slots">';
        for (var i = 1; i <= 5; i++) {
            var s = String(i);
            var isLocked = !!LOCKED_DOCK[s];
            var info = isLocked ? pageCatalog[LOCKED_DOCK[s]] : (config[s] || null);
            var isCenter = s === '3';
            var cls = 'dock-preview-slot' + (isLocked ? ' locked' : '') + (isCenter ? ' center' : '') + (!info && !isLocked ? ' empty' : '');
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
        var config = getCurrentDockConfig();
        var d = {};
        for (var s in LOCKED_DOCK) d[LOCKED_DOCK[s]] = true;
        CUSTOM_SLOTS.forEach(function(s) { if (config[s]) d[config[s].page] = true; });
        return d;
    }

    function wireRemoveButtons() {
        if (!dockPreview) return;
        dockPreview.querySelectorAll('.dock-preview-remove').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                removeFromDock(this.dataset.removeSlot);
            });
        });
    }

    function refreshEditUI() {
        if (!dockPreview) return;
        dockPreview.innerHTML = buildDockPreview();
        var docked = getDockedPages();
        drawerItems.forEach(function(it) {
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
        drawerItems.forEach(function(it) { it.classList.remove('docked'); });
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
        customizeBtn.addEventListener('click', function() {
            if (editMode) doExitEditMode(); else enterEditMode();
        });
    }

    function handleEditTap(item) {
        var pageKey = item.dataset.drawerPage;

        if (LOCKED_DOCK['1'] === pageKey || LOCKED_DOCK['3'] === pageKey || LOCKED_DOCK['5'] === pageKey) {
            item.classList.add('shake');
            setTimeout(function() { item.classList.remove('shake'); }, 400);
            return;
        }

        var config = getCurrentDockConfig();

        for (var i = 0; i < CUSTOM_SLOTS.length; i++) {
            if (config[CUSTOM_SLOTS[i]] && config[CUSTOM_SLOTS[i]].page === pageKey) {
                var ps = dockPreview.querySelector('[data-preview-slot="' + CUSTOM_SLOTS[i] + '"]');
                if (ps) { ps.classList.add('flash'); setTimeout(function() { ps.classList.remove('flash'); }, 500); }
                return;
            }
        }

        var target = null;
        for (var j = 0; j < CUSTOM_SLOTS.length; j++) {
            if (!config[CUSTOM_SLOTS[j]]) { target = CUSTOM_SLOTS[j]; break; }
        }
        if (!target) {
            if (dockPreview) { dockPreview.classList.add('flash'); setTimeout(function() { dockPreview.classList.remove('flash'); }, 500); }
            return;
        }

        var info = { page: pageKey, href: item.dataset.drawerHref, label: item.dataset.drawerLabel, icon: item.dataset.drawerIcon };
        var previewSlot = dockPreview.querySelector('[data-preview-slot="' + target + '"]');
        flyToSlot(item, previewSlot, function() {
            config[target] = info;
            localStorage.setItem('jm_dock_config', JSON.stringify(config));
            refreshEditUI();
            updateDockSlot(target, info);
        });
    }

    function removeFromDock(slotNum) {
        var config = getCurrentDockConfig();
        config[slotNum] = null;
        localStorage.setItem('jm_dock_config', JSON.stringify(config));

        var ps = dockPreview.querySelector('[data-preview-slot="' + slotNum + '"]');
        if (ps) {
            ps.classList.add('removing');
            setTimeout(function() { refreshEditUI(); }, 250);
        } else {
            refreshEditUI();
        }
        updateDockSlot(slotNum, null);
        if (navigator.vibrate) navigator.vibrate(10);
    }

    function flyToSlot(fromEl, toEl, callback) {
        var fr = fromEl.getBoundingClientRect();
        var tr = toEl.getBoundingClientRect();
        var clone = document.createElement('div');
        clone.className = 'fly-clone';
        var icon = fromEl.querySelector('.drawer-icon');
        if (icon) clone.innerHTML = icon.outerHTML;

        clone.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;opacity:1;' +
            'left:' + (fr.left + fr.width / 2) + 'px;' +
            'top:' + (fr.top + fr.height / 2) + 'px;' +
            'transform:translate(-50%,-50%) scale(1);' +
            'transition:left 0.45s cubic-bezier(0.22,1,0.36,1),top 0.45s cubic-bezier(0.22,1,0.36,1),transform 0.45s cubic-bezier(0.22,1,0.36,1),opacity 0.35s ease;';
        document.body.appendChild(clone);

        fromEl.style.opacity = '0.3';
        fromEl.style.transform = 'scale(0.9)';

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                clone.style.left = (tr.left + tr.width / 2) + 'px';
                clone.style.top = (tr.top + tr.height / 2) + 'px';
                clone.style.transform = 'translate(-50%,-50%) scale(0.7)';
                clone.style.opacity = '0.6';
            });
        });

        setTimeout(function() {
            clone.remove();
            fromEl.style.opacity = '';
            fromEl.style.transform = '';
            toEl.classList.add('landing');
            setTimeout(function() { toEl.classList.remove('landing'); }, 350);
            if (callback) callback();
            if (navigator.vibrate) navigator.vibrate(15);
        }, 460);
    }

    // Load dock config from Supabase (deferred)
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof supabaseClient === 'undefined') return;
        supabaseClient.auth.getSession().then(function(res) {
            if (!res.data?.session?.user?.id) return;
            supabaseClient.from('profiles').select('dock_config')
                .eq('id', res.data.session.user.id).single()
                .then(function(r) {
                    if (r.data?.dock_config) {
                        localStorage.setItem('jm_dock_config', JSON.stringify(r.data.dock_config));
                        applyDockConfig();
                    }
                });
        });
    });
})();
