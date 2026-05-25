// Portal Events — Manage raffle (Phase 5M.3C)
(function () {
    'use strict';

    function api() {
        return window.EventsManageRaffleApi || {};
    }

    function esc(s) {
        const el = document.createElement('span');
        el.textContent = s == null ? '' : String(s);
        return el.innerHTML;
    }
    function money(cents) {
        return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0, maximumFractionDigits:2 }).format((cents || 0) / 100);
    }


    const prizeImageFiles = {};
    const prizeImagePreviews = {};

    function safeFilename(value) {
        return String(value || 'event').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'event';
    }
    async function loadRaffle() {
        const STATE = api().getState?.() || {};
        const eventId = STATE.eventId;
        const [entriesRes, winnersRes, guestsRes] = await Promise.all([
            supabaseClient
                .from('event_raffle_entries')
                .select('id, user_id, guest_token, paid, amount_paid_cents, profiles:user_id(first_name, last_name, profile_picture_url)')
                .eq('event_id', eventId),
            supabaseClient
                .from('event_raffle_winners')
                .select('*, profiles:user_id(first_name, last_name, profile_picture_url)')
                .eq('event_id', eventId)
                .order('place', { ascending: true }),
            supabaseClient
                .from('event_guest_rsvps')
                .select('guest_token, guest_name, guest_email')
                .eq('event_id', eventId),
        ]);
        return {
            entries: entriesRes.data || [],
            winners: winnersRes.data || [],
            guests: guestsRes.data || [],
        };
    }

    function ord(n) {
        const s = ['th','st','nd','rd'], v = n % 100;
        return n + (s[(v-20)%10] || s[v] || s[0]);
    }

    function raffleHtml() {
        const STATE = api().getState?.() || {};
        const e = STATE.event;
        if (!e.raffle_enabled) {
            return api().emptyHtml?.('Raffle not enabled', 'Enable the raffle on the portal detail page (Edit event → Raffle).');
        }
        const d = STATE.tabData.raffle;
        const fmt = window.formatCurrency || money;
        const guestByToken = new Map((d.guests || []).map(g => [g.guest_token, g]));
        const eligibleEntries = d.entries.filter(en => en.paid || !e.raffle_entry_cost_cents);
        const memberEntries = eligibleEntries.filter(en => en.user_id);
        const guestEntries = eligibleEntries.filter(en => en.guest_token);
        const config = raffleConfig(e);
        const categories = raffleCategories(config);
        const drawQueue = raffleDrawQueue(config, d.winners);
        const winnersDrawn = d.winners.length;
        const totalPrizes = raffleTotalWinners(config) || e.raffle_winner_count || winnersDrawn;
        const remainingDraws = Math.max(0, totalPrizes - winnersDrawn);
        const allDrawn = totalPrizes > 0 && winnersDrawn >= totalPrizes;
        const canDraw = typeof window.evtOpenRaffleDraw === 'function' && eligibleEntries.length > 0 && !allDrawn;
        const drawPct = totalPrizes ? Math.round((winnersDrawn / totalPrizes) * 100) : 0;
        const raffleEntryPriceDollars = (Number(e.raffle_entry_cost_cents || 0) / 100).toFixed(2);
        const paidEventRaffleIncluded = e.pricing_mode === 'paid';
        const prizeSetupHtml = rafflePrizeSetupHtml(config, d.winners);

        const winnerRows = d.winners.length ? d.winners.map(w => {
            const p = w.profiles || {};
            const guest = w.guest_token ? guestByToken.get(w.guest_token) : null;
            const name = w.user_id ? (`${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member') : (guest?.guest_name || `Guest · ${(w.guest_token || '').slice(0,8)}`);
            const medal = ['🥇','🥈','🥉'][w.place - 1] || `#${w.place}`;
            const choiceHtml = winnerChoiceHtml(w, config, d.winners);
            return `
                <div class="em-attendee-card">
                    <div class="em-avatar" style="background:#faf5ff;color:#7c3aed;font-size:18px">${medal}</div>
                    <div class="em-attendee-main">
                        <p class="em-attendee-name">${esc(name)}</p>
                        <p class="em-attendee-sub">${ord(w.place)} place · ${esc(w.prize_description || 'Prize pending')}</p>
                        <div class="flex flex-wrap gap-1 mt-2">
                            <span class="em-pill em-pill-checked">${w.user_id ? 'Member' : 'Guest'}</span>
                            ${w.selection_status === 'pending_choice' ? '<span class="em-pill em-pill-paid">Needs prize choice</span>' : '<span class="em-pill em-pill-going">Prize assigned</span>'}
                        </div>
                        ${choiceHtml}
                    </div>
                </div>
            `;
        }).join('') : `<p class="text-xs text-gray-400 italic py-2">No winners drawn yet.</p>`;

        const entryRevenue = eligibleEntries.reduce((s, en) => s + (en.amount_paid_cents || 0), 0);
        const categoryHtml = categories.length ? categories.map(cat => {
            const items = raffleItems(config, cat.id);
            const pendingSlots = drawQueue.filter(slot => slot.category_id === cat.id).length;
            const drawnCount = Math.max(0, (cat.winner_count || 0) - pendingSlots);
            const itemPreview = items.length ? items.slice(0, 3).map(item => `${item.emoji || '🎁'} ${esc(item.name)}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`).join(', ') : 'Prize details pending';
            const extraItems = Math.max(0, items.length - 3);
            return `
                <div class="em-card em-op-card">
                    <div class="em-op-head">
                        <div class="min-w-0"><p class="em-op-kicker">Prize group</p><p class="em-op-title">${esc(cat.label || 'Prize category')}</p></div>
                        <span class="em-op-icon">🎁</span>
                    </div>
                    <p class="em-op-copy">${drawModeLabel(cat.draw_mode)} · ${drawnCount}/${cat.winner_count || 0} drawn</p>
                    <div class="em-op-progress"><span style="width:${cat.winner_count ? Math.round((drawnCount / cat.winner_count) * 100) : 0}%"></span></div>
                    <p class="em-op-copy">${itemPreview}${extraItems ? `, +${extraItems} more` : ''}</p>
                    <div class="em-op-meta"><span class="em-op-chip">${pendingSlots} left</span><span class="em-op-chip">${items.length} item${items.length === 1 ? '' : 's'}</span></div>
                </div>
            `;
        }).join('') : '';

        const nextSlot = drawQueue[0] || null;
        const nextDrawHtml = !allDrawn ? `
            <div class="em-card mb-4" style="border-color:#ddd6fe;background:#faf5ff">
                <div class="em-section-head">
                    <div>
                        <h3 class="em-section-title">Next draw</h3>
                        <p class="em-section-sub" style="color:#6d28d9">${nextSlot ? esc(prizeSlotLabel(nextSlot)) : 'Next available prize'}${nextSlot?.category_label ? ` · ${esc(nextSlot.category_label)}` : ''}</p>
                    </div>
                    <span class="em-pill em-pill-paid">${remainingDraws} remaining</span>
                </div>
                ${canDraw ? `<button id="emRaffleDrawBtn" type="button" class="w-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition">Draw next winner</button>` : `<p class="text-xs text-gray-500">${eligibleEntries.length ? 'Draw controls are unavailable on this page.' : 'No valid raffle entries yet.'}</p>`}
            </div>
        ` : '';

        const entryRows = eligibleEntries.length ? eligibleEntries.map(en => {
            const p = en.profiles || {};
            const guest = en.guest_token ? guestByToken.get(en.guest_token) : null;
            const name = en.user_id ? (`${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member') : (guest?.guest_name || 'Guest');
            const sub = en.user_id ? 'Member raffle entry' : (guest?.guest_email || 'Guest raffle entry');
            const tokenAttr = en.guest_token ? ` data-guest-token="${esc(en.guest_token)}"` : '';
            const userAttr = en.user_id ? ` data-user-id="${esc(en.user_id)}"` : '';
            return `<div class="em-attendee-card"><div class="em-avatar" style="background:#f5f3ff;color:#6d28d9"><span>🎟</span></div><div class="em-attendee-main"><p class="em-attendee-name">${esc(name)}</p><p class="em-attendee-sub">${esc(sub)}</p><div class="flex flex-wrap gap-1 mt-2"><span class="em-pill em-pill-checked">${en.user_id ? 'Member' : 'Guest'}</span>${en.paid ? '<span class="em-pill em-pill-paid">Paid</span>' : ''}</div></div><button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-remove-raffle-entry="${esc(en.id)}"${userAttr}${tokenAttr} data-paid="${en.paid ? '1' : '0'}" data-name="${esc(name)}">Remove</button></div>`;
        }).join('') : `<p class="text-xs text-gray-400 italic py-2">No eligible entries yet.</p>`;

        return `
            <div class="em-card em-command-card mb-4">
                <p class="em-command-eyebrow">Raffle command</p>
                <h3 class="em-command-title">${allDrawn ? 'All winners drawn' : `${remainingDraws} draw${remainingDraws === 1 ? '' : 's'} remaining`}</h3>
                <p class="em-command-copy">${eligibleEntries.length ? `${eligibleEntries.length} eligible entr${eligibleEntries.length === 1 ? 'y' : 'ies'} across ${memberEntries.length} member and ${guestEntries.length} guest entries.` : 'No eligible raffle entries yet.'} ${nextSlot ? `Next up: ${esc(prizeSlotLabel(nextSlot))}.` : ''}</p>
                <div class="em-op-progress" style="margin-top:14px;background:rgba(255,255,255,.22)"><span style="width:${drawPct}%;background:#a78bfa"></span></div>
            </div>

            <div class="em-metric-grid mb-4">
                <div class="em-metric"><span>Eligible entries</span><strong>${eligibleEntries.length}</strong><small>${memberEntries.length} member · ${guestEntries.length} guest</small></div>
                <div class="em-metric"><span>Revenue</span><strong>${fmt(entryRevenue)}</strong><small>${e.raffle_entry_cost_cents ? 'Paid entries' : 'Free raffle'}</small></div>
                <div class="em-metric"><span>Prizes</span><strong>${totalPrizes || '—'}</strong><small>${categories.length} group${categories.length === 1 ? '' : 's'}</small></div>
                <div class="em-metric"><span>Drawn</span><strong>${winnersDrawn}</strong><small>${drawPct}% complete</small></div>
            </div>

            ${nextDrawHtml}

            <div class="em-money-layout">
                <div>
                    ${categories.length ? `<div class="em-op-grid" style="grid-template-columns:1fr;margin-bottom:12px">${categoryHtml}</div>` : ''}
                    <div class="em-card">
                        <div class="em-section-head"><div><h3 class="em-section-title">Winners <span class="text-gray-400 font-normal">· ${winnersDrawn}${totalPrizes ? '/' + totalPrizes : ''}</span></h3><p class="em-section-sub">Draw results and pending prize choices.</p></div></div>
                        ${winnerRows}
                        ${allDrawn ? `<p class="text-xs text-emerald-600 font-semibold mt-3">All winners drawn ✓</p>` : `<p class="text-xs text-gray-400 mt-3">Draws follow category sort order, starting with the smallest/lower-sort categories.</p>`}
                    </div>
                </div>

                <div class="em-card">
                    <div class="em-section-head"><div><h3 class="em-section-title">Configuration</h3><p class="em-section-sub">Rules currently driving the draw.</p></div></div>
                    <div class="em-money-row"><span>Type</span><strong>${esc(e.raffle_type || 'digital')}</strong></div>
                    <div class="em-money-row"><span>Draw trigger</span><strong>${esc(e.raffle_draw_trigger || 'manual')}</strong></div>
                    <div class="em-money-row"><span>Entry cost</span><strong>${e.raffle_entry_cost_cents ? fmt(e.raffle_entry_cost_cents) : 'Free'}</strong></div>
                    <div style="margin:12px 0;padding:12px;border:1px solid #eef2ff;border-radius:12px;background:#f8fafc">
                        <label for="emRaffleEntryPrice" style="display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-bottom:6px">Raffle entry price</label>
                        <div style="display:flex;gap:8px;align-items:center">
                            <span style="font-size:13px;font-weight:800;color:#475569">$</span>
                            <input id="emRaffleEntryPrice" class="em-input" type="number" min="0" max="500" step="0.01" value="${esc(raffleEntryPriceDollars)}" ${paidEventRaffleIncluded ? 'disabled' : ''} style="flex:1;min-width:0">
                            <button id="emRafflePriceSave" type="button" class="em-btn-primary" ${paidEventRaffleIncluded ? 'disabled' : ''}>Save</button>
                        </div>
                        <p id="emRafflePriceStatus" class="text-xs text-gray-400 mt-2">${paidEventRaffleIncluded ? 'Paid RSVP events include raffle entry with the RSVP, so separate raffle pricing is not used.' : 'Set 0 for a free raffle. Changes apply to future raffle checkouts only.'}</p>
                    </div>
                    <div class="em-money-row"><span>Member entries</span><strong>${memberEntries.length}</strong></div>
                    <div class="em-money-row"><span>Guest entries</span><strong>${guestEntries.length}</strong></div>
                </div>

                ${prizeSetupHtml}

                <div class="em-card mt-3">
                    <div class="em-section-head"><div><h3 class="em-section-title">Entries <span class="text-gray-400 font-normal">· ${eligibleEntries.length}</span></h3><p class="em-section-sub">Remove accidental or test raffle entries without deleting the event.</p></div></div>
                    ${entryRows}
                </div>
            </div>
        `;
    }

    function wireRaffle() {
        const STATE = api().getState?.() || {};
        const drawBtn = document.getElementById('emRaffleDrawBtn');
        if (drawBtn) {
            drawBtn.onclick = () => window.evtOpenRaffleDraw?.(STATE.eventId, STATE.event);
        }
        document.getElementById('emSheetContent')?.querySelectorAll('[data-raffle-assign-choice]').forEach(btn => {
            btn.onclick = () => assignWinnerChoice(btn.dataset.winnerId);
        });
        document.getElementById('emSheetContent')?.querySelectorAll('[data-remove-raffle-entry]').forEach(btn => {
            btn.onclick = () => removeRaffleEntry(btn);
        });
        document.getElementById('emRafflePriceSave')?.addEventListener('click', saveRaffleEntryPrice);
        document.getElementById('emRafflePrizeSave')?.addEventListener('click', () => saveRafflePrizeSetup());
        document.querySelector('[data-em-raffle-add-category]')?.addEventListener('click', () => saveRafflePrizeSetup({ addCategory: true }));
        document.querySelector('[data-em-raffle-add-item]')?.addEventListener('click', () => saveRafflePrizeSetup({ addItem: true }));
        document.querySelectorAll('[data-em-raffle-remove-category]').forEach(btn => {
            btn.addEventListener('click', () => {
                const label = btn.dataset.categoryLabel || 'this category';
                if (confirm(`Remove ${label}? Prize items in this category will move to the first remaining category.`)) {
                    saveRafflePrizeSetup({ removeCategoryId: btn.dataset.emRaffleRemoveCategory });
                }
            });
        });
        document.querySelectorAll('[data-em-raffle-remove-item]').forEach(btn => {
            btn.addEventListener('click', () => {
                const label = btn.dataset.itemLabel || 'this prize';
                if (confirm(`Remove ${label} from the raffle prize setup? Existing drawn winner records are not deleted.`)) {
                    saveRafflePrizeSetup({ removeItemId: btn.dataset.emRaffleRemoveItem });
                }
            });
        });
        wireRafflePrizeImages();
    }

    function rafflePrizeSetupHtml(config, winners = []) {
        const STATE = api().getState?.() || {};
        const model = window.EventsRaffleModel;
        if (!model) {
            return `<div class="em-card mt-3"><div class="em-section-head"><div><h3 class="em-section-title">Prize setup</h3><p class="em-section-sub">Raffle editor unavailable because the raffle model helper did not load.</p></div></div></div>`;
        }
        const normalized = model.normalizeConfig(config || []);
        const categories = model.getOrderedCategories(normalized);
        const items = normalized.items || [];
        const validation = model.validateConfig(normalized);
        const categoryOptions = categories.map(category => `<option value="${esc(category.id)}">${esc(category.label)}</option>`).join('');
        const usedPrizeIds = new Set((winners || []).map(winner => winner.prize_id).filter(Boolean));
        const drawModeOptions = (selected) => [
            ['specific_item', 'Specific items'],
            ['random_item', 'Random item in category'],
            ['winner_choice', 'Winner chooses later'],
        ].map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');

        const categoryRows = categories.length ? categories.map((category, index) => `
            <div class="em-raffle-edit-row" data-em-raffle-category-row="${esc(category.id)}" data-sort-order="${(index + 1) * 10}">
                <div>
                    <label class="em-raffle-edit-label">Category</label>
                    <input class="em-input" data-em-raffle-category-field="label" value="${esc(category.label)}" maxlength="80">
                </div>
                <div>
                    <label class="em-raffle-edit-label">Draw mode</label>
                    <select class="em-input" data-em-raffle-category-field="draw_mode">${drawModeOptions(category.draw_mode)}</select>
                </div>
                <div>
                    <label class="em-raffle-edit-label">Winners</label>
                    <input class="em-input" type="number" min="0" step="1" data-em-raffle-category-field="winner_count" value="${category.winner_count ?? ''}">
                </div>
                <button type="button" class="em-btn-ghost" data-em-raffle-remove-category="${esc(category.id)}" data-category-label="${esc(category.label)}" ${categories.length <= 1 ? 'disabled' : ''}>Remove</button>
            </div>
        `).join('') : `<p class="text-xs text-gray-400 italic py-2">No prize categories yet.</p>`;

        const itemRows = items.length ? items.map((item, index) => {
            const previewUrl = prizeImagePreviews[item.id] || item.image_url || '';
            const pendingName = prizeImageFiles[item.id]?.name || '';
            return `
            <div class="em-raffle-item-wrap" data-em-raffle-item-row="${esc(item.id)}" data-sort-order="${(index + 1) * 10}" data-image-url="${esc(item.image_url || '')}">
                <div class="em-raffle-edit-row em-raffle-item-row">
                    <div>
                        <label class="em-raffle-edit-label">Emoji</label>
                        <input class="em-input" data-em-raffle-item-field="emoji" value="${esc(item.emoji || '🎁')}" maxlength="4">
                    </div>
                    <div>
                        <label class="em-raffle-edit-label">Prize</label>
                        <input class="em-input" data-em-raffle-item-field="name" value="${esc(item.name)}" maxlength="120">
                    </div>
                    <div>
                        <label class="em-raffle-edit-label">Category</label>
                        <select class="em-input" data-em-raffle-item-field="category_id">
                            ${categories.map(category => `<option value="${esc(category.id)}" ${item.category_id === category.id ? 'selected' : ''}>${esc(category.label)}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="em-raffle-edit-label">Qty</label>
                        <input class="em-input" type="number" min="1" step="1" data-em-raffle-item-field="quantity" value="${item.quantity || 1}">
                    </div>
                    <button type="button" class="em-btn-ghost" data-em-raffle-remove-item="${esc(item.id)}" data-item-label="${esc(item.name)}" ${usedPrizeIds.has(item.id) ? 'disabled title="Already assigned to a winner"' : ''}>Remove</button>
                </div>
                <div class="em-prize-img-row">
                    <input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" data-em-prize-file="${esc(item.id)}">
                    <div class="em-prize-img-drop" data-em-prize-drop="${esc(item.id)}" title="Click or drag an image here">
                        ${previewUrl ? `<img src="${esc(previewUrl)}" alt="Prize image">` : '<span>📷</span>'}
                    </div>
                    <div class="em-prize-img-copy" data-em-prize-copy="${esc(item.id)}">
                        <strong>${pendingName ? esc(pendingName) : (previewUrl ? 'Image set' : 'Prize image')}</strong>
                        <span>${previewUrl ? 'Click or drop to replace. Save prize setup to keep changes.' : 'Click or drag a PNG, JPG, or WebP image here.'}</span>
                    </div>
                    ${previewUrl ? `<button type="button" class="em-btn-ghost" style="font-size:11px;padding:6px 9px" data-em-prize-clear="${esc(item.id)}">Remove image</button>` : ''}
                </div>
            </div>
        `;
        }).join('') : `<p class="text-xs text-gray-400 italic py-2">No prize items yet. Add a prize before drawing winners.</p>`;

        return `
            <div class="em-card mt-3">
                <style>
                    .em-raffle-edit-row { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr) 88px auto; gap:8px; align-items:end; padding:10px 0; border-top:1px solid #f1f5f9; }
                    .em-raffle-edit-row:first-of-type { border-top:0; padding-top:0; }
                    .em-raffle-item-wrap { padding:10px 0; border-top:1px solid #f1f5f9; }
                    .em-raffle-item-wrap:first-of-type { border-top:0; padding-top:0; }
                    .em-raffle-item-wrap .em-raffle-edit-row { border-top:0; padding:0; }
                    .em-raffle-item-row { grid-template-columns:62px minmax(0,1.2fr) minmax(0,.9fr) 70px auto; }
                    .em-raffle-edit-label { display:block; font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#94a3b8; margin-bottom:5px; }
                    .em-prize-img-row { margin-top:10px; display:flex; align-items:center; gap:9px; }
                    .em-prize-img-drop { width:72px; height:72px; border:2px dashed #d1d5db; border-radius:12px; display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer; color:#9ca3af; background:#fff; flex-shrink:0; }
                    .em-prize-img-drop:hover, .em-prize-img-drop.em-drag-over { border-color:#818cf8; background:#f5f3ff; color:#4f46e5; }
                    .em-prize-img-drop img { width:100%; height:100%; object-fit:cover; display:block; }
                    .em-prize-img-drop span { font-size:19px; }
                    .em-prize-img-copy { flex:1; min-width:0; font-size:11px; color:#6b7280; line-height:1.35; }
                    .em-prize-img-copy strong { display:block; color:#374151; font-size:12px; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
                    @media(max-width:700px){ .em-raffle-edit-row, .em-raffle-item-row { grid-template-columns:1fr; } }
                    @media(max-width:520px){ .em-prize-img-row { align-items:flex-start; flex-wrap:wrap; } .em-prize-img-copy { flex-basis:calc(100% - 82px); } }
                </style>
                <div class="em-section-head">
                    <div><h3 class="em-section-title">Prize setup</h3><p class="em-section-sub">Add, edit, or remove raffle prizes after event creation. Existing drawn winners stay in the winner history.</p></div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0">
                    <p class="em-raffle-edit-label" style="margin:0">Categories</p>
                    <button type="button" class="em-btn-ghost" data-em-raffle-add-category>Add category</button>
                </div>
                ${categoryRows}
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 8px;border-top:1px solid #f1f5f9;padding-top:12px">
                    <p class="em-raffle-edit-label" style="margin:0">Prize items</p>
                    <button type="button" class="em-btn-ghost" data-em-raffle-add-item>Add prize</button>
                </div>
                ${itemRows}
                ${validation.valid ? '' : `<div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">${validation.errors.map(esc).join('<br>')}</div>`}
                <div style="display:flex;align-items:center;gap:10px;margin-top:14px">
                    <button type="button" id="emRafflePrizeSave" class="em-btn-primary">Save prize setup</button>
                    <span id="emRafflePrizeStatus" class="text-xs text-gray-400">${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} · ${items.length} item${items.length === 1 ? '' : 's'}</span>
                </div>
            </div>
        `;
    }

    function collectRafflePrizeConfigFromDom() {
        const STATE = api().getState?.() || {};
        const model = window.EventsRaffleModel;
        if (!model) throw new Error('Raffle model helper is not loaded.');
        const categoryRows = Array.from(document.querySelectorAll('[data-em-raffle-category-row]'));
        const itemRows = Array.from(document.querySelectorAll('[data-em-raffle-item-row]'));
        if (!categoryRows.length && !itemRows.length) return model.normalizeConfig(STATE.event?.raffle_prizes || []);
        const categories = categoryRows.map((row, index) => {
            const field = name => row.querySelector(`[data-em-raffle-category-field="${name}"]`)?.value;
            return model.createCategory({
                id: row.dataset.emRaffleCategoryRow,
                label: field('label') || 'Prize Tier',
                draw_mode: field('draw_mode') || 'specific_item',
                winner_count: Math.max(0, Math.floor(Number(field('winner_count')) || 0)),
                sort_order: (index + 1) * 10,
            });
        });
        const fallbackCategory = categories[0]?.id || 'general';
        const categoryIds = new Set(categories.map(category => category.id));
        const items = itemRows.map((row, index) => {
            const field = name => row.querySelector(`[data-em-raffle-item-field="${name}"]`)?.value;
            const categoryId = categoryIds.has(field('category_id')) ? field('category_id') : fallbackCategory;
            return model.createItem({
                id: row.dataset.emRaffleItemRow,
                emoji: field('emoji') || model.DEFAULT_EMOJI || '🎁',
                name: field('name') || 'Prize item',
                category_id: categoryId,
                quantity: Math.max(1, Math.floor(Number(field('quantity')) || 1)),
                image_url: row.dataset.imageUrl || null,
                sort_order: (index + 1) * 10,
            });
        });
        return model.normalizeConfig({ version: 2, categories, items });
    }

    function wireRafflePrizeImages() {
        const STATE = api().getState?.() || {};
        document.querySelectorAll('[data-em-prize-drop]').forEach(zone => {
            const itemId = zone.dataset.emPrizeDrop;
            const fileInput = document.querySelector(`[data-em-prize-file="${CSS.escape(itemId)}"]`);
            if (!itemId || !fileInput) return;
            zone.addEventListener('click', () => fileInput.click());
            zone.addEventListener('dragover', event => {
                event.preventDefault();
                zone.classList.add('em-drag-over');
            });
            zone.addEventListener('dragleave', event => {
                if (!zone.contains(event.relatedTarget)) zone.classList.remove('em-drag-over');
            });
            zone.addEventListener('drop', event => {
                event.preventDefault();
                zone.classList.remove('em-drag-over');
                const file = event.dataTransfer?.files?.[0];
                if (file) setRafflePrizeImage(itemId, file);
            });
            fileInput.addEventListener('change', () => {
                const file = fileInput.files?.[0];
                if (file) setRafflePrizeImage(itemId, file);
            });
        });
        document.querySelectorAll('[data-em-prize-clear]').forEach(btn => {
            btn.addEventListener('click', () => clearRafflePrizeImage(btn.dataset.emPrizeClear));
        });
    }

    function setRafflePrizeImage(itemId, file) {
        const STATE = api().getState?.() || {};
        if (!file.type.match(/^image\/(png|jpeg|webp)$/)) { alert('Please use a PNG, JPG, or WebP image.'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB.'); return; }
        prizeImageFiles[itemId] = file;
        const reader = new FileReader();
        reader.onload = () => {
            prizeImagePreviews[itemId] = reader.result;
            const zone = document.querySelector(`[data-em-prize-drop="${CSS.escape(itemId)}"]`);
            if (zone) zone.innerHTML = `<img src="${esc(reader.result)}" alt="Prize image">`;
            const copy = document.querySelector(`[data-em-prize-copy="${CSS.escape(itemId)}"]`);
            if (copy) copy.innerHTML = `<strong>${esc(file.name)}</strong><span>Ready to upload. Save prize setup to keep this image.</span>`;
            const status = document.getElementById('emRafflePrizeStatus');
            if (status) status.textContent = 'Image selected. Save prize setup to upload it.';
        };
        reader.readAsDataURL(file);
    }

    function clearRafflePrizeImage(itemId) {
        const STATE = api().getState?.() || {};
        if (!itemId) return;
        delete prizeImageFiles[itemId];
        delete prizeImagePreviews[itemId];
        const row = document.querySelector(`[data-em-raffle-item-row="${CSS.escape(itemId)}"]`);
        if (row) row.dataset.imageUrl = '';
        const zone = document.querySelector(`[data-em-prize-drop="${CSS.escape(itemId)}"]`);
        if (zone) zone.innerHTML = '<span>📷</span>';
        const copy = document.querySelector(`[data-em-prize-copy="${CSS.escape(itemId)}"]`);
        if (copy) copy.innerHTML = '<strong>Prize image</strong><span>Image removed. Save prize setup to keep this change.</span>';
        const btn = document.querySelector(`[data-em-prize-clear="${CSS.escape(itemId)}"]`);
        if (btn) btn.remove();
        const status = document.getElementById('emRafflePrizeStatus');
        if (status) status.textContent = 'Image removed. Save prize setup to keep this change.';
    }

    async function uploadPendingRafflePrizeImages(config) {
        const STATE = api().getState?.() || {};
        const uploads = Object.entries(prizeImageFiles);
        if (!uploads.length) return config;
        const slug = safeFilename(STATE.event?.slug || STATE.event?.title || STATE.eventId || 'event');
        for (const [itemId, file] of uploads) {
            const item = (config.items || []).find(entry => entry.id === itemId);
            if (!item) continue;
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `${slug}/${itemId}-${Date.now()}.${ext}`;
            const up = await supabaseClient.storage
                .from('event-raffle-prizes')
                .upload(path, file, { contentType: file.type || 'image/jpeg' });
            if (up.error) throw new Error(`Prize image upload failed: ${up.error.message}`);
            item.image_url = supabaseClient.storage.from('event-raffle-prizes').getPublicUrl(path).data.publicUrl;
        }
        clearPrizeImageState();
        return config;
    }

    async function saveRafflePrizeSetup(action = {}) {
        const STATE = api().getState?.() || {};
        const model = window.EventsRaffleModel;
        const status = document.getElementById('emRafflePrizeStatus');
        const saveBtn = document.getElementById('emRafflePrizeSave');
        try {
            if (!model) throw new Error('Raffle model helper is not loaded.');
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
            if (status) status.textContent = Object.keys(prizeImageFiles).length ? 'Uploading prize images...' : 'Saving prize setup...';
            let config = collectRafflePrizeConfigFromDom();
            if (action.addCategory) {
                config.categories.push(model.createCategory({ label: 'New Tier', sort_order: (config.categories.length + 1) * 10, winner_count: 1 }));
            }
            if (action.addItem) {
                if (!config.categories.length) config.categories.push(model.createCategory({ id: 'general', label: 'Raffle Prizes', sort_order: 10, winner_count: 1 }));
                const category = config.categories[0];
                config.items.push(model.createItem({ category_id: category.id, name: 'New prize item', sort_order: (config.items.length + 1) * 10 }));
                category.winner_count = Math.max(Number(category.winner_count || 0), categoryPrizeQuantity(config, category.id));
            }
            if (action.removeCategoryId) {
                if (config.categories.length <= 1) throw new Error('Keep at least one prize category.');
                config.categories = config.categories.filter(category => category.id !== action.removeCategoryId);
                const fallbackCategoryId = config.categories[0]?.id || 'general';
                config.items.forEach(item => { if (item.category_id === action.removeCategoryId) item.category_id = fallbackCategoryId; });
            }
            if (action.removeItemId) {
                const alreadyDrawn = (STATE.tabData.raffle?.winners || []).some(winner => winner.prize_id === action.removeItemId);
                if (alreadyDrawn) throw new Error('This prize is already assigned to a winner and cannot be removed from setup.');
                config.items = config.items.filter(item => item.id !== action.removeItemId);
                delete prizeImageFiles[action.removeItemId];
                delete prizeImagePreviews[action.removeItemId];
                capRaffleWinnerCounts(config);
            }
            config = model.normalizeConfig(config);
            config = await uploadPendingRafflePrizeImages(config);
            const winnerCount = model.getTotalWinnerCount(config);
            if (status) status.textContent = 'Saving prize setup...';
            const { error } = await supabaseClient
                .from('events')
                .update({ raffle_prizes: config, raffle_winner_count: winnerCount })
                .eq('id', STATE.eventId);
            if (error) throw error;
            STATE.event.raffle_prizes = config;
            STATE.event.raffle_winner_count = winnerCount;
            await api().refreshEventManager?.('raffle');
        } catch (err) {
            if (status) status.textContent = 'Save failed: ' + (err.message || 'unknown error');
            else alert('Prize setup save failed: ' + (err.message || 'unknown error'));
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save prize setup'; }
        }
    }

    function categoryPrizeQuantity(config, categoryId) {
        const STATE = api().getState?.() || {};
        return (config.items || [])
            .filter(item => item.category_id === categoryId)
            .reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);
    }

    function capRaffleWinnerCounts(config) {
        const STATE = api().getState?.() || {};
        (config.categories || []).forEach(category => {
            const quantity = categoryPrizeQuantity(config, category.id);
            category.winner_count = Math.min(Number(category.winner_count || 0), quantity);
        });
    }

    async function saveRaffleEntryPrice() {
        const STATE = api().getState?.() || {};
        const input = document.getElementById('emRaffleEntryPrice');
        const btn = document.getElementById('emRafflePriceSave');
        const status = document.getElementById('emRafflePriceStatus');
        const dollars = Number(input?.value || 0);
        if (!Number.isFinite(dollars) || dollars < 0) {
            if (status) status.textContent = 'Enter a price of 0 or higher.';
            input?.focus();
            return;
        }
        if (dollars > 500) {
            if (status) status.textContent = 'Raffle entry price cannot be more than $500.';
            input?.focus();
            return;
        }
        const cents = Math.round(dollars * 100);
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Saving...';
        }
        if (status) status.textContent = 'Saving raffle price...';
        try {
            const { error } = await supabaseClient
                .from('events')
                .update({ raffle_entry_cost_cents: cents })
                .eq('id', STATE.eventId);
            if (error) throw error;
            STATE.event.raffle_entry_cost_cents = cents;
            await api().refreshEventManager?.('raffle');
        } catch (err) {
            if (status) status.textContent = 'Save failed: ' + (err.message || 'unknown error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Save';
            }
        }
    }

    async function removeRaffleEntry(btn) {
        const STATE = api().getState?.() || {};
        const name = btn.dataset.name || 'this entry';
        const isPaid = btn.dataset.paid === '1';
        const warning = isPaid ? '\n\nThis was marked paid. Removing the record does not refund Stripe payments.' : '';
        if (!confirm(`Remove raffle entry for ${name}? Any winner record for this entry will also be removed.${warning}`)) return;
        btn.disabled = true;
        btn.textContent = 'Removing...';
        try {
            await callEdgeFunction('manage-event-participation', {
                action: 'remove_raffle_entry',
                event_id: STATE.eventId,
                entry_id: btn.dataset.removeRaffleEntry,
            });
            STATE.tabData.raffle = null;
            await api().renderTabAsync?.('raffle', loadRaffle, raffleHtml, wireRaffle);
            api().notifyParent?.('updated', STATE.eventId);
        } catch (err) {
            alert('Raffle entry remove failed: ' + (err.message || 'unknown error'));
            STATE.tabData.raffle = null;
            await api().renderTabAsync?.('raffle', loadRaffle, raffleHtml, wireRaffle);
        }
    }

    function winnerChoiceHtml(winner, config, winners) {
        const STATE = api().getState?.() || {};
        if (winner.selection_status !== 'pending_choice') return '';
        const items = availableChoiceItems(config, winners, winner);
        if (!items.length) {
            return `<div class="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">No unassigned items are available in this category.</div>`;
        }
        const options = items.map(item => `<option value="${esc(item.id)}">${esc(item.emoji || '🎁')} ${esc(item.name)}${item.quantity > 1 ? ` (${item.quantity} total)` : ''}</option>`).join('');
        return `
            <div class="mt-3 flex flex-col sm:flex-row gap-2">
                <select id="emWinnerChoice_${esc(winner.id)}" class="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-200">
                    ${options}
                </select>
                <button type="button" data-raffle-assign-choice="1" data-winner-id="${esc(winner.id)}" class="rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 text-xs font-bold transition">Assign prize</button>
            </div>
        `;
    }

    function availableChoiceItems(config, winners, currentWinner) {
        const STATE = api().getState?.() || {};
        const items = raffleItems(config, currentWinner.category_id);
        const used = new Map();
        (winners || []).forEach(winner => {
            if (!winner.prize_id || winner.id === currentWinner.id) return;
            if (winner.selection_status === 'pending_choice') return;
            used.set(winner.prize_id, (used.get(winner.prize_id) || 0) + 1);
        });
        return items.filter(item => (used.get(item.id) || 0) < item.quantity);
    }

    async function assignWinnerChoice(winnerId) {
        const STATE = api().getState?.() || {};
        const winner = (STATE.tabData.raffle?.winners || []).find(row => row.id === winnerId);
        if (!winner) return;
        const select = document.getElementById(`emWinnerChoice_${winnerId}`);
        const itemId = select?.value;
        if (!itemId) return alert('Choose a prize item first.');

        const config = raffleConfig(STATE.event);
        const item = raffleItems(config, winner.category_id).find(row => row.id === itemId);
        if (!item) return alert('Prize item is no longer available. Refresh and try again.');

        const { error } = await supabaseClient
            .from('event_raffle_winners')
            .update({
                prize_id: item.id,
                prize_description: item.name,
                prize_image_url: item.image_url || null,
                prize_emoji: item.emoji || window.EventsRaffleModel?.DEFAULT_EMOJI || '🎁',
                selection_status: 'assigned',
            })
            .eq('id', winnerId)
            .eq('event_id', STATE.eventId)
            .eq('selection_status', 'pending_choice');
        if (error) return alert('Prize assignment failed: ' + error.message);

        STATE.tabData.raffle = null;
        await api().renderTabAsync?.('raffle', loadRaffle, raffleHtml, wireRaffle);
        document.dispatchEvent(new CustomEvent('events:raffle:drawn', { detail: { eventId: STATE.eventId } }));
    }

    function raffleConfig(event) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel) return event?.raffle_prizes || [];
        return window.EventsRaffleModel.normalizeConfig(event?.raffle_prizes || []);
    }

    function raffleCategories(config) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel) return [];
        return window.EventsRaffleModel.getOrderedCategories(config);
    }

    function raffleItems(config, categoryId) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel) return [];
        return window.EventsRaffleModel.getItemsForCategory(config, categoryId);
    }

    function raffleTotalWinners(config) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel) return 0;
        return window.EventsRaffleModel.getTotalWinnerCount(config);
    }

    function raffleDrawQueue(config, winners) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel) return [];
        return window.EventsRaffleModel.getDrawQueue(config, winners || []);
    }

    function drawModeLabel(drawMode) {
        const STATE = api().getState?.() || {};
        if (drawMode === 'random_item') return 'Random prize assigned';
        if (drawMode === 'winner_choice') return 'Winner chooses later';
        return 'Specific prize';
    }

    function prizeSlotLabel(slot) {
        const STATE = api().getState?.() || {};
        if (!slot) return '';
        if (slot.prize_name) return slot.prize_name;
        if (slot.draw_mode === 'winner_choice') return `${slot.category_label || 'Prize tier'} choice`;
        return slot.category_label || 'Prize';
    }

    function winnerBelongsToCategory(winner, category, config) {
        const STATE = api().getState?.() || {};
        if (!winner || !category) return false;
        if (winner.category_id) return winner.category_id === category.id;
        if (winner.category_label) return winner.category_label === category.label;
        const slot = raffleSlotByPlace(config, winner.place);
        return slot?.category_id === category.id;
    }

    function raffleSlotByPlace(config, place) {
        const STATE = api().getState?.() || {};
        if (!window.EventsRaffleModel || place == null) return null;
        return window.EventsRaffleModel.getDrawQueue(config, []).find(slot => Number(slot.place) === Number(place)) || null;
    }
    function clearPrizeImageState() {
        Object.keys(prizeImageFiles).forEach(key => delete prizeImageFiles[key]);
        Object.keys(prizeImagePreviews).forEach(key => delete prizeImagePreviews[key]);
    }

    function refreshRaffle(eventId) {
        const STATE = api().getState?.() || {};
        if (eventId && eventId !== STATE.eventId) return;
        STATE.tabData.raffle = null;
        if (STATE.activeTab === 'raffle') api().renderTab?.('raffle');
    }

    document.addEventListener('events:raffle:drawn', (evt) => refreshRaffle(evt.detail?.eventId));


    window.EventsManageRaffle = {
        loadRaffle,
        raffleHtml,
        wireRaffle,
        clearPrizeImageState,
        refreshRaffle
    };
})();
