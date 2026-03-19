// ═══════════════════════════════════════════════════════════
// Admin — Banner Management
// ═══════════════════════════════════════════════════════════
// CRUD for the `cosmetics` table (type = 'banner').
// Includes live gradient/image/Lottie preview, foreground
// positioning, member award/revoke, and storage uploads.
// ═══════════════════════════════════════════════════════════

(async function () {
    'use strict';

    /* ── Auth Guard ──────────────────────────────────────── */
    await checkAuth(true);

    /* ── DOM refs ─────────────────────────────────────────── */
    const $ = id => document.getElementById(id);
    const grid          = $('bannersGrid');
    const emptyState    = $('emptyState');
    const searchInput   = $('searchInput');
    const filterRarity  = $('filterRarity');
    const filterLocked  = $('filterLocked');
    const addBtn        = $('addBannerBtn');
    const successMsg    = $('successMsg');
    const errorMsg      = $('errorMsg');

    // Editor modal
    const editorModal   = $('editorModal');
    const editorTitle   = $('editorTitle');
    const edClose       = $('editorClose');
    const edBackdrop    = $('editorBackdrop');
    const edCancel      = $('editorCancel');
    const edSave        = $('editorSave');
    const saveLabel     = $('saveLabel');
    const saveSpinner   = $('saveSpinner');

    // Editor fields
    const edName        = $('edName');
    const edKey         = $('edKey');
    const edColorFrom   = $('edColorFrom');
    const edColorFromTx = $('edColorFromText');
    const edColorTo     = $('edColorTo');
    const edColorToTx   = $('edColorToText');
    const gradControls  = $('gradientControls');
    const imgControls   = $('imageControls');
    const bgDropZone    = $('bgDropZone');
    const bgFileInput   = $('bgFileInput');
    const bgFileName    = $('bgFileName');
    const bgFileLabel   = $('bgFileLabel');
    const bgFileClear   = $('bgFileClear');
    const fgDropZone    = $('fgDropZone');
    const fgFileInput   = $('fgFileInput');
    const fgFileName    = $('fgFileName');
    const fgFileLabel   = $('fgFileLabel');
    const fgFileClear   = $('fgFileClear');
    const fgPosCtrl     = $('fgPositionControls');
    const edLottie      = $('edLottie');
    const lottieSliders = $('lottieSliders');
    const edQuestLocked = $('edQuestLocked');
    const questKeyRow   = $('questKeyRow');
    const edQuestKey    = $('edQuestKey');
    const edAnimated    = $('edAnimated');
    const edSortOrder   = $('edSortOrder');
    const previewCont   = $('previewContainer');
    const previewFg     = $('previewFg');
    const previewFgImg  = $('previewFgImg');
    const previewLottie = $('previewLottie');
    const dirPicker     = $('dirPicker');

    // Delete modal
    const deleteModal   = $('deleteModal');
    const deleteMsg     = $('deleteMsg');
    const deleteCancelB = $('deleteCancelBtn');
    const deleteConfirm = $('deleteConfirmBtn');
    const deleteBackdp  = $('deleteBackdrop');

    // Award modal
    const awardModal    = $('awardModal');
    const awardBannerNm = $('awardBannerName');
    const awardSearch   = $('awardSearch');
    const awardList     = $('awardMemberList');
    const awardMsgEl    = $('awardMsg');
    const awardClose    = $('awardClose');
    const awardBackdp   = $('awardBackdrop');

    // Members modal
    const membersModal  = $('membersModal');
    const membersTitle  = $('membersTitle');
    const membersList   = $('membersList');
    const membersEmpty  = $('membersEmpty');
    const membersClose  = $('membersClose');
    const membersBackdp = $('membersBackdrop');

    /* ── State ────────────────────────────────────────────── */
    let banners    = [];
    let members    = [];
    let editing    = null;           // banner key being edited (null = new)
    let pendingDel = null;           // banner key pending delete
    let awardKey   = null;           // banner key being awarded
    let bgFile     = null;           // pending BG file upload
    let fgFile     = null;           // pending FG file upload
    let gradDir    = 'to-br';
    let lottieAnim = null;           // current preview lottie instance

    /* ── Tailwind swatches ────────────────────────────────── */
    const TW_COLORS = [
        '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e',
        '#14b8a6','#06b6d4','#0ea5e9','#3b82f6','#6366f1','#8b5cf6',
        '#a855f7','#d946ef','#ec4899','#f43f5e','#64748b','#1e293b',
    ];

    /* ── Lottie effects list ──────────────────────────────── */
    const EFFECTS = window.LottieEffects?.BANNER_EFFECTS || {};

    /* ── Helpers ─────────────────────────────────────────── */
    const esc  = s => s ? String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]) : '';
    const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    function flash(el, msg, ms = 4000) {
        el.textContent = msg;
        el.classList.remove('hidden');
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.add('hidden'), ms);
    }
    function showSuccess(m) { flash(successMsg, m); }
    function showError(m)   { flash(errorMsg, m); }

    /* ── CSS gradient from hex colors ────────────────────── */
    const DIR_MAP = {
        'to-t':'to top','to-tr':'to top right','to-r':'to right','to-br':'to bottom right',
        'to-b':'to bottom','to-bl':'to bottom left','to-l':'to left','to-tl':'to top left',
    };
    function cssGradient(from, to, dir) {
        return `linear-gradient(${DIR_MAP[dir] || 'to bottom right'}, ${from}, ${to})`;
    }

    /* ── Tailwind color → hex map (for legacy gradient parsing) ── */
    const TW_HEX = {
        'slate-900':'#0f172a','slate-950':'#020617','gray-900':'#111827',
        'purple-900':'#581c87','purple-600':'#9333ea','purple-500':'#a855f7',
        'violet-500':'#8b5cf6','violet-600':'#7c3aed',
        'indigo-600':'#4f46e5','indigo-950':'#1e1b4b',
        'blue-500':'#3b82f6','blue-600':'#2563eb',
        'cyan-500':'#06b6d4','cyan-600':'#0891b2',
        'teal-600':'#0d9488','teal-500':'#14b8a6',
        'emerald-500':'#10b981','emerald-600':'#059669',
        'green-500':'#22c55e','green-600':'#16a34a',
        'red-900':'#7f1d1d','red-500':'#ef4444','red-600':'#dc2626',
        'orange-600':'#ea580c','orange-500':'#f97316',
        'amber-500':'#f59e0b','amber-600':'#d97706',
        'pink-500':'#ec4899','pink-600':'#db2777',
        'rose-500':'#f43f5e','rose-600':'#e11d48',
    };

    /* ── Known preview_class → inline background map ──────── */
    const PREVIEW_CLASS_BG = {
        'founders-banner-preview': "url('/assets/banner/founder1.webp') center/cover no-repeat",
        'cat-banner-preview':     "url('/assets/banner/cat1.webp') center/cover no-repeat",
    };

    /* ── Parse stored gradient → {from, to, dir} ─────────── */
    function parseGradient(g) {
        if (!g) return null;
        // New format: "#6366f1|#a855f7|to-br"
        if (g.startsWith('#')) {
            const parts = g.split('|');
            return { from: parts[0] || '#6366f1', to: parts[1] || '#a855f7', dir: parts[2] || 'to-br' };
        }
        // Legacy Tailwind gradient: "from-slate-900 to-purple-900"
        const fm = g.match(/from-([a-z]+-\d+)/);
        const tm = g.match(/(?:^|\s)to-([a-z]+-\d+)/);
        if (fm && tm && TW_HEX[fm[1]] && TW_HEX[tm[1]]) {
            return { from: TW_HEX[fm[1]], to: TW_HEX[tm[1]], dir: 'to-br' };
        }
        return null;
    }

    /* ── Render a small gradient/image banner thumbnail ──── */
    function thumbHTML(b) {
        const parsed = parseGradient(b.gradient);
        if (b.bg_image_url) {
            return `<div class="banner-thumb-sm" style="background:url('${esc(b.bg_image_url)}') center/cover;"></div>`;
        }
        if (parsed) {
            return `<div class="banner-thumb-sm" style="background:${cssGradient(parsed.from, parsed.to, parsed.dir)};"></div>`;
        }
        if (b.preview_class) {
            return `<div class="banner-thumb-sm ${esc(b.preview_class)}"></div>`;
        }
        if (b.gradient) {
            // Legacy Tailwind gradient — approximate with bg-gradient classes
            return `<div class="banner-thumb-sm bg-gradient-to-br ${esc(b.gradient)}"></div>`;
        }
        return `<div class="banner-thumb-sm bg-gray-200"></div>`;
    }

    /* ── Render rarity pill ────────────────────────────────── */
    function rarityPill(r) {
        return `<span class="rarity-pill rarity-${esc(r)}">${esc(r)}</span>`;
    }

    /* ═══════════════════════════════════════════════════════ */
    /* LOAD DATA                                              */
    /* ═══════════════════════════════════════════════════════ */

    async function loadBanners() {
        const { data, error } = await supabaseClient
            .from('cosmetics')
            .select('*, member_cosmetics(count)')
            .eq('type', 'banner')
            .order('sort_order', { ascending: true });
        if (error) { showError('Failed to load banners'); console.error(error); return; }
        banners = data || [];
        renderStats();
        renderGrid();
    }

    async function loadMembers() {
        const { data } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, profile_picture_url, active_banner_key')
            .order('first_name');
        members = (data || []).map(m => ({ ...m, full_name: [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Unknown', avatar_url: m.profile_picture_url }));
    }

    /* ═══════════════════════════════════════════════════════ */
    /* RENDER                                                 */
    /* ═══════════════════════════════════════════════════════ */

    function renderStats() {
        $('statTotal').textContent     = banners.length;
        $('statLegendary').textContent = banners.filter(b => b.rarity === 'legendary').length;
        $('statEpic').textContent      = banners.filter(b => b.rarity === 'epic').length;
        const totalAwarded = banners.reduce((s, b) => s + (b.member_cosmetics?.[0]?.count || 0), 0);
        $('statAwarded').textContent   = totalAwarded;
    }

    function filteredBanners() {
        let list = [...banners];
        const q = searchInput.value.trim().toLowerCase();
        if (q) list = list.filter(b => b.name.toLowerCase().includes(q) || b.key.toLowerCase().includes(q));
        if (filterRarity.value) list = list.filter(b => b.rarity === filterRarity.value);
        if (filterLocked.value === 'locked') list = list.filter(b => b.is_quest_locked);
        if (filterLocked.value === 'unlocked') list = list.filter(b => !b.is_quest_locked);
        return list;
    }

    function renderGrid() {
        const list = filteredBanners();
        if (!list.length) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        emptyState.classList.add('hidden');

        grid.innerHTML = list.map(b => {
            const count = b.member_cosmetics?.[0]?.count || 0;
            return `
            <div class="bg-white rounded-2xl border border-gray-200/80 overflow-hidden hover:shadow-md transition fade-in">
                <div class="flex items-start gap-4 p-5">
                    ${thumbHTML(b)}
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-gray-900 truncate">${esc(b.name)}</span>
                            ${rarityPill(b.rarity)}
                            ${b.lottie_effect ? `<span class="text-xs text-gray-400">✨ ${esc(b.lottie_effect)}</span>` : ''}
                        </div>
                        <div class="text-xs text-gray-400 mt-0.5 font-mono">${esc(b.key)}</div>
                        <div class="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                            <span>${count} member${count !== 1 ? 's' : ''} earned</span>
                            ${b.is_quest_locked ? '<span class="text-amber-600">🔒 Quest-locked</span>' : ''}
                            ${b.is_animated ? '<span class="text-violet-500">🎬 Animated</span>' : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <button data-action="award" data-key="${esc(b.key)}" class="p-2 hover:bg-emerald-50 rounded-lg transition" title="Award to member">
                            <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                        <button data-action="members" data-key="${esc(b.key)}" class="p-2 hover:bg-blue-50 rounded-lg transition" title="View members">
                            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </button>
                        <button data-action="edit" data-key="${esc(b.key)}" class="p-2 hover:bg-brand-50 rounded-lg transition" title="Edit">
                            <svg class="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button data-action="delete" data-key="${esc(b.key)}" class="p-2 hover:bg-red-50 rounded-lg transition" title="Delete">
                            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    /* ═══════════════════════════════════════════════════════ */
    /* EDITOR — Live Preview                                  */
    /* ═══════════════════════════════════════════════════════ */

    function updatePreview() {
        // Background
        const bgType = document.querySelector('input[name="bgType"]:checked')?.value || 'gradient';
        const b = editing ? banners.find(x => x.key === editing) : null;

        if (bgType === 'gradient') {
            // preview_class banners (cat, founders) — show their CSS background image
            if (b?.preview_class && PREVIEW_CLASS_BG[b.preview_class]) {
                previewCont.style.background = PREVIEW_CLASS_BG[b.preview_class];
            } else {
                const from = edColorFrom.value;
                const to   = edColorTo.value;
                previewCont.style.background = cssGradient(from, to, gradDir);
            }
        } else if (bgFile) {
            const url = URL.createObjectURL(bgFile);
            previewCont.style.background = `url(${url}) center/cover no-repeat`;
        } else if (b?.bg_image_url) {
            previewCont.style.background = `url(${b.bg_image_url}) center/cover no-repeat`;
        }

        // Foreground
        if (fgFile || (editing && banners.find(x => x.key === editing)?.foreground_url)) {
            const url = fgFile ? URL.createObjectURL(fgFile) : banners.find(x => x.key === editing).foreground_url;
            previewFgImg.src = url;
            previewFg.style.display = 'block';
            const x = $('edFgX').value, y = $('edFgY').value, w = $('edFgW').value, op = $('edFgOp').value;
            previewFg.style.cssText = `position:absolute; left:${x}%; top:${y}%; width:${w}%; transform:translate(-50%,-50%); pointer-events:none; opacity:${op/100}; z-index:1;`;
        } else {
            previewFg.style.display = 'none';
        }

        // Lottie
        updateLottiePreview();
    }

    let lottieDebounce = null;
    function updateLottiePreview() {
        clearTimeout(lottieDebounce);
        lottieDebounce = setTimeout(() => {
            // Clean up previous lottie overlay created by renderBannerEffect
            if (lottieAnim) { try { lottieAnim.destroy(); } catch {} lottieAnim = null; }
            const oldOverlay = previewCont.querySelector('.lottie-banner-overlay');
            if (oldOverlay) oldOverlay.remove();
            previewLottie.innerHTML = '';

            const key = edLottie.value;
            if (!key || !EFFECTS[key]) {
                previewLottie.style.display = 'none';
                return;
            }

            const op    = ($('edLottieOp')?.value || 55) / 100;
            const blend = $('edLottieBlend')?.value || 'screen';
            const scale = ($('edLottieScale')?.value || 100) / 100;
            const offX  = parseInt($('edLottieX')?.value || 0);
            const offY  = parseInt($('edLottieY')?.value || 0);

            // Hide the old previewLottie placeholder — we use the overlay from renderBannerEffect
            previewLottie.style.display = 'none';

            if (window.LottieEffects) {
                window.LottieEffects.renderBannerEffect(previewCont, key, { opacity: op }).then(a => {
                    lottieAnim = a;
                    // Apply admin-controlled styles to the generated overlay
                    const overlay = previewCont.querySelector('.lottie-banner-overlay');
                    if (overlay) {
                        overlay.style.opacity = op;
                        overlay.style.mixBlendMode = blend;
                        overlay.style.transform = `scale(${scale}) translate(${offX}%, ${offY}%)`;
                        overlay.style.transformOrigin = 'center center';
                    }
                });
            }
        }, 250);
    }

    /* ═══════════════════════════════════════════════════════ */
    /* EDITOR — Open / Close                                  */
    /* ═══════════════════════════════════════════════════════ */

    function openEditor(bannerKey) {
        editing = bannerKey || null;
        const b = bannerKey ? banners.find(x => x.key === bannerKey) : null;

        editorTitle.textContent = b ? `Edit: ${b.name}` : 'New Banner';
        edName.value       = b?.name || '';
        edKey.value        = b?.key || '';
        edKey.readOnly     = !!b;
        edSortOrder.value  = b?.sort_order ?? 0;
        edAnimated.checked = b?.is_animated || false;
        edQuestLocked.checked = b?.is_quest_locked || false;
        edQuestKey.value   = b?.quest_unlock_key || '';
        questKeyRow.classList.toggle('hidden', !edQuestLocked.checked);

        // Rarity
        setRarity(b?.rarity || 'common');

        // Background type
        bgFile = null; fgFile = null;
        bgFileName.classList.add('hidden');
        fgFileName.classList.add('hidden');
        fgPosCtrl.classList.add('hidden');

        if (b?.bg_image_url) {
            document.querySelector('input[name="bgType"][value="image"]').checked = true;
            gradControls.classList.add('hidden');
            imgControls.classList.remove('hidden');
            bgFileName.classList.remove('hidden');
            bgFileLabel.textContent = 'Current image uploaded';
        } else {
            document.querySelector('input[name="bgType"][value="gradient"]').checked = true;
            gradControls.classList.remove('hidden');
            imgControls.classList.add('hidden');
        }

        // Gradient
        const parsed = parseGradient(b?.gradient);
        if (parsed) {
            edColorFrom.value = parsed.from; edColorFromTx.value = parsed.from;
            edColorTo.value   = parsed.to;   edColorToTx.value   = parsed.to;
            setGradDir(parsed.dir);
        } else {
            edColorFrom.value = '#6366f1'; edColorFromTx.value = '#6366f1';
            edColorTo.value   = '#a855f7'; edColorToTx.value   = '#a855f7';
            setGradDir('to-br');
        }

        // Foreground
        if (b?.foreground_url) {
            fgFileName.classList.remove('hidden');
            fgFileLabel.textContent = 'Current overlay uploaded';
            fgPosCtrl.classList.remove('hidden');
        }
        $('edFgX').value  = b?.foreground_x ?? 50;
        $('edFgY').value  = b?.foreground_y ?? 50;
        $('edFgW').value  = b?.foreground_width ?? 40;
        $('edFgOp').value = b?.foreground_opacity ?? 100;
        updateFgLabels();

        // Lottie
        edLottie.value = b?.lottie_effect || '';
        $('edLottieOp').value    = b?.lottie_opacity ?? 55;
        $('edLottieBlend').value = b?.lottie_blend || 'screen';
        $('edLottieScale').value = b?.lottie_scale ?? 100;
        $('edLottieX').value     = b?.lottie_x ?? 0;
        $('edLottieY').value     = b?.lottie_y ?? 0;
        updateLottieLabels();
        lottieSliders.classList.toggle('hidden', !edLottie.value);

        editorModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(updatePreview, 50);
    }

    function closeEditor() {
        editorModal.classList.add('hidden');
        document.body.style.overflow = '';
        if (lottieAnim) { try { lottieAnim.destroy(); } catch {} lottieAnim = null; }
        previewLottie.innerHTML = '';
    }

    /* ═══════════════════════════════════════════════════════ */
    /* EDITOR — Save                                          */
    /* ═══════════════════════════════════════════════════════ */

    async function saveBanner() {
        const name  = edName.value.trim();
        const key   = edKey.value.trim();
        if (!name) { showError('Name is required'); return; }
        if (!key)  { showError('Key is required'); return; }

        saveLabel.classList.add('hidden');
        saveSpinner.classList.remove('hidden');
        edSave.disabled = true;

        try {
            const bgType = document.querySelector('input[name="bgType"]:checked')?.value || 'gradient';
            let bg_image_url = editing ? (banners.find(b => b.key === editing)?.bg_image_url || null) : null;
            let foreground_url = editing ? (banners.find(b => b.key === editing)?.foreground_url || null) : null;

            // Upload BG image if new file
            if (bgFile) {
                const ext = bgFile.name.split('.').pop().toLowerCase();
                const path = `bg/${key}.${ext}`;
                const { error: upErr } = await supabaseClient.storage.from('banner-assets').upload(path, bgFile, { upsert: true });
                if (upErr) throw new Error('BG upload failed: ' + upErr.message);
                const { data: urlData } = supabaseClient.storage.from('banner-assets').getPublicUrl(path);
                bg_image_url = urlData.publicUrl;
            }

            // Upload FG image if new file
            if (fgFile) {
                const ext = fgFile.name.split('.').pop().toLowerCase();
                const path = `fg/${key}.${ext}`;
                const { error: upErr } = await supabaseClient.storage.from('banner-assets').upload(path, fgFile, { upsert: true });
                if (upErr) throw new Error('FG upload failed: ' + upErr.message);
                const { data: urlData } = supabaseClient.storage.from('banner-assets').getPublicUrl(path);
                foreground_url = urlData.publicUrl;
            }

            // Build gradient string
            let gradient = null;
            if (bgType === 'gradient') {
                gradient = `${edColorFrom.value}|${edColorTo.value}|${gradDir}`;
                bg_image_url = null; // clear image if switching to gradient
            }

            // Active rarity
            const rarity = document.querySelector('.rarity-opt.ring-2')?.dataset.rarity || 'common';

            const row = {
                key,
                type: 'banner',
                name,
                rarity,
                gradient,
                bg_image_url,
                preview_class: editing ? (banners.find(b => b.key === editing)?.preview_class || null) : null,
                lottie_effect: edLottie.value || null,
                lottie_opacity: parseInt($('edLottieOp').value) || 55,
                lottie_blend: $('edLottieBlend').value || 'screen',
                lottie_scale: parseInt($('edLottieScale').value) || 100,
                lottie_x: parseInt($('edLottieX').value) || 0,
                lottie_y: parseInt($('edLottieY').value) || 0,
                foreground_url,
                foreground_x: parseInt($('edFgX').value) || 50,
                foreground_y: parseInt($('edFgY').value) || 50,
                foreground_width: parseInt($('edFgW').value) || 40,
                foreground_opacity: parseInt($('edFgOp').value) || 100,
                is_animated: edAnimated.checked,
                is_quest_locked: edQuestLocked.checked,
                quest_unlock_key: edQuestLocked.checked ? edQuestKey.value.trim() || null : null,
                sort_order: parseInt(edSortOrder.value) || 0,
            };

            let err;
            if (editing) {
                const { error: e } = await supabaseClient.from('cosmetics').update(row).eq('key', editing);
                err = e;
            } else {
                const { error: e } = await supabaseClient.from('cosmetics').insert(row);
                err = e;
            }

            if (err) throw new Error(err.message);

            closeEditor();
            showSuccess(editing ? 'Banner updated!' : 'Banner created!');
            await loadBanners();
        } catch (e) {
            showError(e.message);
            console.error(e);
        } finally {
            saveLabel.classList.remove('hidden');
            saveSpinner.classList.add('hidden');
            edSave.disabled = false;
        }
    }

    /* ═══════════════════════════════════════════════════════ */
    /* DELETE                                                  */
    /* ═══════════════════════════════════════════════════════ */

    function openDelete(key) {
        const b = banners.find(x => x.key === key);
        if (!b) return;
        pendingDel = key;
        const count = b.member_cosmetics?.[0]?.count || 0;
        deleteMsg.textContent = `Delete "${b.name}"? ${count ? `This will remove it from ${count} member${count > 1 ? 's' : ''}.` : 'No members currently have this banner.'}`;
        deleteModal.classList.remove('hidden');
    }

    async function confirmDelete() {
        if (!pendingDel) return;
        deleteConfirm.disabled = true;
        deleteConfirm.textContent = 'Deleting…';

        // Reset members using this banner
        await supabaseClient.from('profiles').update({ active_banner_key: null }).eq('active_banner_key', pendingDel);

        const { error } = await supabaseClient.from('cosmetics').delete().eq('key', pendingDel);
        deleteModal.classList.add('hidden');
        deleteConfirm.disabled = false;
        deleteConfirm.textContent = 'Delete';

        if (error) { showError('Delete failed: ' + error.message); return; }
        showSuccess('Banner deleted');
        pendingDel = null;
        await loadBanners();
    }

    /* ═══════════════════════════════════════════════════════ */
    /* AWARD                                                  */
    /* ═══════════════════════════════════════════════════════ */

    async function openAward(key) {
        awardKey = key;
        const b = banners.find(x => x.key === key);
        awardBannerNm.textContent = b?.name || key;
        awardSearch.value = '';
        awardMsgEl.classList.add('hidden');

        // Load who already has it
        const { data: existing } = await supabaseClient
            .from('member_cosmetics')
            .select('user_id')
            .eq('cosmetic_key', key);
        const earned = new Set((existing || []).map(e => e.user_id));

        renderAwardList(earned, '');
        awardModal.classList.remove('hidden');
    }

    function renderAwardList(earned, query) {
        let list = members;
        if (query) list = list.filter(m => (m.full_name || '').toLowerCase().includes(query));

        awardList.innerHTML = list.map(m => {
            const has = earned.has(m.id);
            const initials = (m.full_name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return `
            <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                <div class="flex items-center gap-2">
                    ${m.avatar_url
                        ? `<img src="${esc(m.avatar_url)}" class="w-8 h-8 rounded-full object-cover">`
                        : `<div class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">${initials}</div>`}
                    <span class="text-sm font-medium text-gray-900">${esc(m.full_name || 'Unknown')}</span>
                </div>
                ${has
                    ? `<span class="text-xs text-emerald-600 font-semibold">✓ Earned</span>`
                    : `<button data-award-uid="${m.id}" class="px-3 py-1 text-xs font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition">Award</button>`}
            </div>`;
        }).join('');
    }

    async function doAward(userId) {
        const { error } = await supabaseClient.from('member_cosmetics').insert({
            user_id: userId,
            cosmetic_key: awardKey,
            awarded_by: 'admin',
        });
        if (error) {
            awardMsgEl.className = 'mt-3 p-2 rounded-lg text-sm font-medium bg-red-50 text-red-700';
            awardMsgEl.textContent = error.message.includes('duplicate') ? 'Member already has this banner' : error.message;
            awardMsgEl.classList.remove('hidden');
            return;
        }
        awardMsgEl.className = 'mt-3 p-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700';
        awardMsgEl.textContent = 'Banner awarded!';
        awardMsgEl.classList.remove('hidden');
        // Refresh
        await openAward(awardKey);
        await loadBanners();
    }

    /* ═══════════════════════════════════════════════════════ */
    /* MEMBERS PANEL                                          */
    /* ═══════════════════════════════════════════════════════ */

    async function openMembers(key) {
        const b = banners.find(x => x.key === key);
        membersTitle.textContent = `Members — ${b?.name || key}`;

        const { data } = await supabaseClient
            .from('member_cosmetics')
            .select('user_id, earned_at, awarded_by')
            .eq('cosmetic_key', key)
            .order('earned_at', { ascending: false });

        const rows = data || [];
        if (!rows.length) {
            membersList.innerHTML = '';
            membersEmpty.classList.remove('hidden');
        } else {
            membersEmpty.classList.add('hidden');
            membersList.innerHTML = rows.map(r => {
                const m = members.find(x => x.id === r.user_id) || {};
                const name = m.full_name || 'Unknown';
                const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                const date = new Date(r.earned_at).toLocaleDateString();
                return `
                <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                    <div class="flex items-center gap-2">
                        ${m.avatar_url
                            ? `<img src="${esc(m.avatar_url)}" class="w-8 h-8 rounded-full object-cover">`
                            : `<div class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">${initials}</div>`}
                        <div>
                            <div class="text-sm font-medium text-gray-900">${esc(name)}</div>
                            <div class="text-xs text-gray-400">${date} · ${esc(r.awarded_by)}</div>
                        </div>
                    </div>
                    <button data-revoke-uid="${r.user_id}" data-revoke-key="${esc(key)}" class="text-xs text-red-500 hover:text-red-700 font-semibold">Revoke</button>
                </div>`;
            }).join('');
        }
        membersModal.classList.remove('hidden');
    }

    async function doRevoke(userId, cosmeticKey) {
        await supabaseClient.from('member_cosmetics').delete().eq('user_id', userId).eq('cosmetic_key', cosmeticKey);
        // If member was using this banner, clear it
        await supabaseClient.from('profiles').update({ active_banner_key: null }).eq('id', userId).eq('active_banner_key', cosmeticKey);
        showSuccess('Revoked');
        await openMembers(cosmeticKey);
        await loadBanners();
    }

    /* ═══════════════════════════════════════════════════════ */
    /* EDITOR HELPERS                                         */
    /* ═══════════════════════════════════════════════════════ */

    function setRarity(r) {
        document.querySelectorAll('.rarity-opt').forEach(btn => {
            const active = btn.dataset.rarity === r;
            btn.classList.toggle('ring-2', active);
            btn.classList.toggle('ring-offset-1', active);
        });
    }

    function setGradDir(d) {
        gradDir = d;
        dirPicker.querySelectorAll('[data-dir]').forEach(btn => btn.classList.toggle('active', btn.dataset.dir === d));
    }

    function updateFgLabels() {
        $('fgXVal').textContent  = $('edFgX').value + '%';
        $('fgYVal').textContent  = $('edFgY').value + '%';
        $('fgWVal').textContent  = $('edFgW').value + '%';
        $('fgOpVal').textContent = $('edFgOp').value + '%';
    }

    function updateLottieLabels() {
        $('lottieOpVal').textContent    = $('edLottieOp').value + '%';
        $('lottieScaleVal').textContent = $('edLottieScale').value + '%';
        $('lottieXVal').textContent     = $('edLottieX').value + '%';
        $('lottieYVal').textContent     = $('edLottieY').value + '%';
    }

    /* ═══════════════════════════════════════════════════════ */
    /* INIT — Swatches + Lottie dropdown                      */
    /* ═══════════════════════════════════════════════════════ */

    function initSwatches() {
        const container = $('swatches');
        container.innerHTML = TW_COLORS.map(c =>
            `<div class="color-swatch" style="background:${c}" data-color="${c}" title="${c}"></div>`
        ).join('');
        container.addEventListener('click', e => {
            const sw = e.target.closest('[data-color]');
            if (!sw) return;
            // Alt-click sets "to", normal sets "from"
            if (e.altKey) {
                edColorTo.value = sw.dataset.color;
                edColorToTx.value = sw.dataset.color;
            } else {
                edColorFrom.value = sw.dataset.color;
                edColorFromTx.value = sw.dataset.color;
            }
            updatePreview();
        });
    }

    function initLottieDropdown() {
        let opts = '<option value="">None</option>';
        for (const [key, effect] of Object.entries(EFFECTS)) {
            opts += `<option value="${esc(key)}">${esc(effect.name || key)}</option>`;
        }
        edLottie.innerHTML = opts;
    }

    /* ═══════════════════════════════════════════════════════ */
    /* EVENT LISTENERS                                        */
    /* ═══════════════════════════════════════════════════════ */

    // Filters
    searchInput.addEventListener('input', renderGrid);
    filterRarity.addEventListener('change', renderGrid);
    filterLocked.addEventListener('change', renderGrid);

    // Add banner
    addBtn.addEventListener('click', () => openEditor(null));

    // Grid actions (delegated)
    grid.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const key    = btn.dataset.key;
        if (action === 'edit')    openEditor(key);
        if (action === 'delete')  openDelete(key);
        if (action === 'award')   openAward(key);
        if (action === 'members') openMembers(key);
    });

    // Editor close
    edClose.addEventListener('click', closeEditor);
    edBackdrop.addEventListener('click', closeEditor);
    edCancel.addEventListener('click', closeEditor);

    // Editor save
    edSave.addEventListener('click', saveBanner);

    // Name → auto-key
    edName.addEventListener('input', () => {
        if (!editing) edKey.value = slug(edName.value);
        updatePreview();
    });

    // Rarity picker
    document.querySelectorAll('.rarity-opt').forEach(btn => {
        btn.addEventListener('click', () => setRarity(btn.dataset.rarity));
    });

    // Background type toggle
    document.querySelectorAll('input[name="bgType"]').forEach(r => {
        r.addEventListener('change', () => {
            const isGrad = r.value === 'gradient' && r.checked;
            gradControls.classList.toggle('hidden', !isGrad);
            imgControls.classList.toggle('hidden', isGrad);
            updatePreview();
        });
    });

    // Color pickers sync
    edColorFrom.addEventListener('input', () => { edColorFromTx.value = edColorFrom.value; updatePreview(); });
    edColorTo.addEventListener('input', () => { edColorToTx.value = edColorTo.value; updatePreview(); });
    edColorFromTx.addEventListener('change', () => { edColorFrom.value = edColorFromTx.value; updatePreview(); });
    edColorToTx.addEventListener('change', () => { edColorTo.value = edColorToTx.value; updatePreview(); });

    // Direction picker
    dirPicker.addEventListener('click', e => {
        const btn = e.target.closest('[data-dir]');
        if (!btn) return;
        setGradDir(btn.dataset.dir);
        updatePreview();
    });

    // BG file upload
    bgDropZone.addEventListener('click', () => bgFileInput.click());
    bgDropZone.addEventListener('dragover', e => { e.preventDefault(); bgDropZone.classList.add('border-brand-400', 'bg-brand-50'); });
    bgDropZone.addEventListener('dragleave', () => bgDropZone.classList.remove('border-brand-400', 'bg-brand-50'));
    bgDropZone.addEventListener('drop', e => { e.preventDefault(); bgDropZone.classList.remove('border-brand-400', 'bg-brand-50'); if (e.dataTransfer.files[0]) setBgFile(e.dataTransfer.files[0]); });
    bgFileInput.addEventListener('change', () => { if (bgFileInput.files[0]) setBgFile(bgFileInput.files[0]); });
    bgFileClear.addEventListener('click', () => { bgFile = null; bgFileName.classList.add('hidden'); updatePreview(); });

    function setBgFile(f) {
        bgFile = f;
        bgFileLabel.textContent = f.name;
        bgFileName.classList.remove('hidden');
        updatePreview();
    }

    // FG file upload
    fgDropZone.addEventListener('click', () => fgFileInput.click());
    fgDropZone.addEventListener('dragover', e => { e.preventDefault(); fgDropZone.classList.add('border-brand-400', 'bg-brand-50'); });
    fgDropZone.addEventListener('dragleave', () => fgDropZone.classList.remove('border-brand-400', 'bg-brand-50'));
    fgDropZone.addEventListener('drop', e => { e.preventDefault(); fgDropZone.classList.remove('border-brand-400', 'bg-brand-50'); if (e.dataTransfer.files[0]) setFgFile(e.dataTransfer.files[0]); });
    fgFileInput.addEventListener('change', () => { if (fgFileInput.files[0]) setFgFile(fgFileInput.files[0]); });
    fgFileClear.addEventListener('click', () => { fgFile = null; fgFileName.classList.add('hidden'); fgPosCtrl.classList.add('hidden'); updatePreview(); });

    function setFgFile(f) {
        fgFile = f;
        fgFileLabel.textContent = f.name;
        fgFileName.classList.remove('hidden');
        fgPosCtrl.classList.remove('hidden');
        updatePreview();
    }

    // FG sliders
    ['edFgX', 'edFgY', 'edFgW', 'edFgOp'].forEach(id => {
        $(id).addEventListener('input', () => { updateFgLabels(); updatePreview(); });
    });

    // Lottie dropdown
    edLottie.addEventListener('change', () => {
        lottieSliders.classList.toggle('hidden', !edLottie.value);
        updatePreview();
    });

    // Lottie sliders
    ['edLottieOp', 'edLottieScale', 'edLottieX', 'edLottieY'].forEach(id => {
        $(id).addEventListener('input', () => { updateLottieLabels(); updatePreview(); });
    });
    $('edLottieBlend').addEventListener('change', updatePreview);

    // Quest-locked toggle
    edQuestLocked.addEventListener('change', () => questKeyRow.classList.toggle('hidden', !edQuestLocked.checked));

    // Delete modal
    deleteCancelB.addEventListener('click', () => deleteModal.classList.add('hidden'));
    deleteBackdp.addEventListener('click', () => deleteModal.classList.add('hidden'));
    deleteConfirm.addEventListener('click', confirmDelete);

    // Award modal
    awardClose.addEventListener('click', () => awardModal.classList.add('hidden'));
    awardBackdp.addEventListener('click', () => awardModal.classList.add('hidden'));
    awardSearch.addEventListener('input', async () => {
        const { data: existing } = await supabaseClient.from('member_cosmetics').select('user_id').eq('cosmetic_key', awardKey);
        const earned = new Set((existing || []).map(e => e.user_id));
        renderAwardList(earned, awardSearch.value.trim().toLowerCase());
    });
    awardList.addEventListener('click', async e => {
        const btn = e.target.closest('[data-award-uid]');
        if (!btn) return;
        btn.disabled = true; btn.textContent = '…';
        await doAward(btn.dataset.awardUid);
    });

    // Members modal
    membersClose.addEventListener('click', () => membersModal.classList.add('hidden'));
    membersBackdp.addEventListener('click', () => membersModal.classList.add('hidden'));
    membersList.addEventListener('click', async e => {
        const btn = e.target.closest('[data-revoke-uid]');
        if (!btn) return;
        btn.disabled = true; btn.textContent = '…';
        await doRevoke(btn.dataset.revokeUid, btn.dataset.revokeKey);
    });

    /* ═══════════════════════════════════════════════════════ */
    /* BOOT                                                   */
    /* ═══════════════════════════════════════════════════════ */

    initSwatches();
    initLottieDropdown();
    await Promise.all([loadBanners(), loadMembers()]);

})();
