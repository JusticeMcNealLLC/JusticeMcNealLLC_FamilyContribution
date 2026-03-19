// ═══════════════════════════════════════════════════════════
// Portal Events — Create & Preview
// Handles the Create Event form submission and live preview.
// ═══════════════════════════════════════════════════════════

// ─── LLC Cost Breakdown Builder ─────────────────────────

const COST_CATEGORIES = [
    { value: 'lodging', label: '🏠 Lodging' },
    { value: 'transportation', label: '🚗 Transportation' },
    { value: 'food', label: '🍕 Food' },
    { value: 'gear', label: '🎿 Gear / Rentals' },
    { value: 'entertainment', label: '🎭 Entertainment' },
    { value: 'other', label: '📦 Other' },
];

let evtCostItems = []; // local array of cost line items

function evtToggleLlcFields() {
    const type = document.getElementById('eventType').value;
    const isLlc = type === 'llc';
    const isComp = type === 'competition';
    const llcSection = document.getElementById('llcFieldsSection');
    const compSection = document.getElementById('compFieldsSection');
    if (llcSection) llcSection.classList.toggle('hidden', !isLlc);
    if (compSection) compSection.classList.toggle('hidden', !isComp);
    // For LLC events, force pricing_mode to 'paid' and lock it
    if (isLlc) {
        const pm = document.getElementById('pricingMode');
        pm.value = 'paid';
        pm.dispatchEvent(new Event('change'));
    }
    // For competitions, force member-only
    if (isComp) {
        document.getElementById('memberOnly').checked = true;
    }
}

function evtAddCostItem() {
    const id = crypto.randomUUID();
    evtCostItems.push({ id, name: '', category: 'other', total_cost_cents: 0, included_in_buyin: true, avg_per_person_cents: 0, notes: '' });
    evtRenderCostItems();
}

function evtRemoveCostItem(itemId) {
    evtCostItems = evtCostItems.filter(i => i.id !== itemId);
    evtRenderCostItems();
    evtRecalcCostSummary();
}

function evtRenderCostItems() {
    const container = document.getElementById('costItemsList');
    if (!container) return;
    container.innerHTML = evtCostItems.map((item, idx) => `
        <div class="bg-white border border-gray-200 rounded-xl p-3 space-y-2" data-cost-id="${item.id}">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-gray-400">#${idx + 1}</span>
                <button type="button" onclick="evtRemoveCostItem('${item.id}')" class="text-red-400 hover:text-red-600 transition p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Item name" value="${evtEscapeHtml(item.name)}" onchange="evtUpdateCostItem('${item.id}','name',this.value)"
                       class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                <select onchange="evtUpdateCostItem('${item.id}','category',this.value)"
                        class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                    ${COST_CATEGORIES.map(c => `<option value="${c.value}" ${item.category === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-xs text-gray-500">Total Cost ($)</label>
                    <input type="number" min="0" step="1" value="${item.total_cost_cents ? (item.total_cost_cents / 100) : ''}" placeholder="0"
                           onchange="evtUpdateCostItem('${item.id}','total_cost_cents',Math.round(this.value*100))"
                           class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                </div>
                <div>
                    <label class="text-xs text-gray-500">Type</label>
                    <select onchange="evtUpdateCostItem('${item.id}','included_in_buyin',this.value==='true')"
                            class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                        <option value="true" ${item.included_in_buyin ? 'selected' : ''}>Included in Buy-In</option>
                        <option value="false" ${!item.included_in_buyin ? 'selected' : ''}>Out of Pocket</option>
                    </select>
                </div>
            </div>
            ${!item.included_in_buyin ? `
            <div>
                <label class="text-xs text-gray-500">Avg Per Person ($)</label>
                <input type="number" min="0" step="1" value="${item.avg_per_person_cents ? (item.avg_per_person_cents / 100) : ''}" placeholder="0"
                       onchange="evtUpdateCostItem('${item.id}','avg_per_person_cents',Math.round(this.value*100))"
                       class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
            </div>` : ''}
            <input type="text" placeholder="Notes / source link (optional)" value="${evtEscapeHtml(item.notes || '')}" onchange="evtUpdateCostItem('${item.id}','notes',this.value)"
                   class="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 focus:border-transparent">
        </div>`).join('');
}

function evtUpdateCostItem(itemId, field, value) {
    const item = evtCostItems.find(i => i.id === itemId);
    if (item) {
        item[field] = value;
        // If switching to included, re-render to hide avg_per_person field
        if (field === 'included_in_buyin') evtRenderCostItems();
        evtRecalcCostSummary();
    }
}

function evtRecalcCostSummary() {
    const summary = document.getElementById('costSummary');
    if (!summary) return;

    const maxPart = parseInt(document.getElementById('eventMax').value) || 0;
    const llcCutPct = parseFloat(document.getElementById('eventLlcCut').value) || 0;

    const totalIncluded = evtCostItems.filter(i => i.included_in_buyin).reduce((sum, i) => sum + (i.total_cost_cents || 0), 0);
    const totalOop = evtCostItems.filter(i => !i.included_in_buyin).reduce((sum, i) => sum + (i.avg_per_person_cents || 0), 0);

    if (evtCostItems.length === 0) { summary.classList.add('hidden'); return; }
    summary.classList.remove('hidden');

    const baseBuyIn = maxPart > 0 ? Math.ceil(totalIncluded / maxPart) : 0;
    const llcCutAmount = Math.round(baseBuyIn * llcCutPct / 100);
    const finalBuyIn = baseBuyIn + llcCutAmount;

    document.getElementById('costTotalIncluded').textContent = formatCurrency(totalIncluded);
    document.getElementById('costMaxPart').textContent = maxPart > 0 ? maxPart : '—';
    document.getElementById('costBuyIn').textContent = maxPart > 0 ? `${formatCurrency(finalBuyIn)}/person` : 'Set max attendees';
    document.getElementById('costOop').textContent = `~${formatCurrency(totalOop)}/person`;
    document.getElementById('costGrandTotal').textContent = maxPart > 0 ? `~${formatCurrency(finalBuyIn + totalOop)}` : '—';

    const llcRow = document.getElementById('costLlcCutRow');
    if (llcCutPct > 0 && maxPart > 0) {
        llcRow.classList.remove('hidden');
        document.getElementById('costLlcPct').textContent = llcCutPct;
        document.getElementById('costLlcAmount').textContent = `+${formatCurrency(llcCutAmount)}`;
    } else {
        llcRow.classList.add('hidden');
    }

    // Auto-set the RSVP cost (hidden for LLC — derived from breakdown)
    const rsvpInput = document.getElementById('rsvpCostDollars');
    if (maxPart > 0 && rsvpInput) {
        rsvpInput.value = Math.ceil(finalBuyIn / 100);
    }
}

// ─── Main Create Handler ────────────────────────────────

// Geocode a location text into lat/lng using OpenStreetMap Nominatim
async function evtGeocodeAddress(address) {
    try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`, {
            headers: { 'Accept-Language': 'en' }
        });
        const results = await resp.json();
        if (results && results.length > 0) {
            return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon), display: results[0].display_name };
        }
    } catch (err) { console.warn('Geocoding failed:', err); }
    return null;
}

async function evtHandleCreate(e) {
    e.preventDefault();

    const publishBtn = document.getElementById('publishEventBtn');
    publishBtn.disabled = true;
    publishBtn.textContent = 'Publishing…';

    try {
        const title = document.getElementById('eventTitle').value.trim();
        const slug = evtGenerateSlug(title);
        const checkinMode = document.querySelector('input[name="checkinMode"]:checked').value;
        const eventType = document.getElementById('eventType').value;
        const isLlc = eventType === 'llc';

        // Upload banner if selected
        let bannerUrl = null;
        if (evtBannerFile) {
            const ext = evtBannerFile.name.split('.').pop();
            const path = `${slug}-${Date.now()}.${ext}`;
            const { error: upErr } = await supabaseClient.storage
                .from('event-banners')
                .upload(path, evtBannerFile, { contentType: evtBannerFile.type });
            if (upErr) throw upErr;
            const { data: { publicUrl } } = supabaseClient.storage
                .from('event-banners')
                .getPublicUrl(path);
            bannerUrl = publicUrl;
        }

        // Build event record
        const pricingMode = document.getElementById('pricingMode').value;
        const raffleEnabled = document.getElementById('raffleEnabled').checked;
        const raffleEntryCostDollars = parseInt(document.getElementById('raffleEntryCostDollars').value) || 0;

        // For LLC events, RSVP cost is auto-calculated from cost breakdown
        const maxPart = document.getElementById('eventMax').value ? parseInt(document.getElementById('eventMax').value) : null;
        let rsvpCostCents = 0;
        let costBreakdownSummary = null;
        if (isLlc && evtCostItems.length > 0 && maxPart) {
            const llcCutPct = parseFloat(document.getElementById('eventLlcCut').value) || 0;
            const totalIncluded = evtCostItems.filter(i => i.included_in_buyin).reduce((sum, i) => sum + (i.total_cost_cents || 0), 0);
            const totalOop = evtCostItems.filter(i => !i.included_in_buyin).reduce((sum, i) => sum + (i.avg_per_person_cents || 0), 0);
            const baseBuyIn = Math.ceil(totalIncluded / maxPart);
            const llcCut = Math.round(baseBuyIn * llcCutPct / 100);
            rsvpCostCents = baseBuyIn + llcCut;
            costBreakdownSummary = { total_included_cents: totalIncluded, total_oop_per_person_cents: totalOop, base_buyin_cents: baseBuyIn, llc_cut_cents: llcCut, final_buyin_cents: rsvpCostCents };
        } else if (!isLlc) {
            const rsvpCostDollars = parseInt(document.getElementById('rsvpCostDollars').value) || 0;
            rsvpCostCents = pricingMode === 'paid' ? rsvpCostDollars * 100 : 0;
        }

        const record = {
            created_by: evtCurrentUser.id,
            event_type: eventType,
            title,
            slug,
            category: document.getElementById('eventCategory').value,
            description: document.getElementById('eventDescription').value.trim(),
            gated_notes: document.getElementById('eventGatedNotes').value.trim() || null,
            banner_url: bannerUrl,
            start_date: new Date(document.getElementById('eventStart').value).toISOString(),
            end_date: document.getElementById('eventEnd').value ? new Date(document.getElementById('eventEnd').value).toISOString() : null,
            timezone: document.getElementById('eventTimezone').value,
            location_text: document.getElementById('eventLocation').value.trim() || null,
            max_participants: maxPart,
            rsvp_deadline: document.getElementById('eventRsvpDeadline').value ? new Date(document.getElementById('eventRsvpDeadline').value).toISOString() : null,
            checkin_mode: checkinMode,
            member_only: document.getElementById('memberOnly').checked,
            gate_time: document.getElementById('gateTime').checked,
            gate_location: document.getElementById('gateLocation').checked,
            gate_notes: document.getElementById('gateNotes').checked,
            pricing_mode: pricingMode,
            rsvp_cost_cents: rsvpCostCents,
            raffle_entry_cost_cents: pricingMode === 'free_paid_raffle' ? raffleEntryCostDollars * 100 : 0,
            raffle_enabled: raffleEnabled,
            status: 'open',
        };

        // Geocode location → lat/lng for map
        if (record.location_text) {
            publishBtn.textContent = 'Validating address…';
            const geo = await evtGeocodeAddress(record.location_text);
            if (geo) {
                record.location_lat = geo.lat;
                record.location_lng = geo.lng;
            } else {
                // Address not found — ask user to continue anyway
                if (!confirm('Could not verify that address on the map. The event will be created without a map pin.\n\nPublish anyway?')) {
                    publishBtn.disabled = false;
                    publishBtn.textContent = 'Publish Event';
                    return;
                }
            }
            publishBtn.textContent = 'Publishing…';
        }

        // LLC-specific fields
        if (isLlc) {
            record.min_participants = document.getElementById('eventMinParticipants').value ? parseInt(document.getElementById('eventMinParticipants').value) : null;
            record.llc_cut_pct = parseFloat(document.getElementById('eventLlcCut').value) || 0;
            record.invest_eligible = document.getElementById('investEligible').checked;
            record.member_only = true; // LLC events: member RSVP only (no guest RSVPs)
            record.cost_breakdown = costBreakdownSummary;
            record.transportation_mode = document.getElementById('eventTransportation').value;
            record.transportation_estimate_cents = record.transportation_mode === 'self_arranged'
                ? Math.round((parseFloat(document.getElementById('eventTransportEstimate').value) || 0) * 100)
                : null;
            record.location_required = document.getElementById('locationRequired').checked;
        }

        // Competition-specific fields
        const isComp = eventType === 'competition';
        if (isComp) {
            const tier1 = parseInt(document.getElementById('compTier1Pct').value) || 100;
            const tier2 = parseInt(document.getElementById('compTier2Pct').value) || 0;
            const tier3 = parseInt(document.getElementById('compTier3Pct').value) || 0;
            const entryFeeDollars = parseFloat(document.getElementById('compEntryFee').value) || 0;

            record.competition_config = {
                entry_type: document.getElementById('compEntryType').value,
                entry_fee_cents: Math.round(entryFeeDollars * 100),
                house_pct: parseFloat(document.getElementById('compHousePct').value) || 0,
                min_entries: parseInt(document.getElementById('compMinEntries').value) || 2,
                extension_days: parseInt(document.getElementById('compExtensionDays').value) || 3,
                entries_visible_before_voting: document.getElementById('compEntriesVisible').checked,
                voter_eligibility: document.getElementById('compVoterEligibility').value,
                vote_tally_visible: document.getElementById('compVoteTallyVisible').checked,
            };
            record.winner_tier_config = [
                { place: 1, pct: tier1 },
                ...(tier2 > 0 ? [{ place: 2, pct: tier2 }] : []),
                ...(tier3 > 0 ? [{ place: 3, pct: tier3 }] : []),
            ];
            record.member_only = true;
            record.pricing_mode = entryFeeDollars > 0 ? 'paid' : 'free';
            record.rsvp_cost_cents = 0; // Competition entry fee handled separately
        }

        // Generate venue QR token if venue_scan mode
        if (checkinMode === 'venue_scan') {
            record.venue_qr_token = crypto.randomUUID();
        }

        // Raffle config
        if (raffleEnabled) {
            record.raffle_type = document.getElementById('raffleType').value;
            record.raffle_draw_trigger = document.getElementById('raffleDrawTrigger').value;

            // Build prizes array from inputs
            const prizeInputs = document.querySelectorAll('input[name="rafflePrize"]');
            const prizes = [];
            prizeInputs.forEach((input, i) => {
                const desc = input.value.trim();
                if (desc) prizes.push({ place: i + 1, description: desc });
            });
            record.raffle_prizes = prizes.length > 0 ? prizes : null;
        }

        const { data, error } = await supabaseClient
            .from('events')
            .insert(record)
            .select()
            .single();

        if (error) throw error;

        // Save cost items for LLC events
        if (isLlc && evtCostItems.length > 0) {
            const costRows = evtCostItems.map((item, idx) => ({
                event_id: data.id,
                name: item.name,
                category: item.category,
                total_cost_cents: item.total_cost_cents || 0,
                included_in_buyin: item.included_in_buyin,
                avg_per_person_cents: item.avg_per_person_cents || 0,
                notes: item.notes || null,
                sort_order: idx,
            }));
            const { error: costErr } = await supabaseClient.from('event_cost_items').insert(costRows);
            if (costErr) console.error('Cost items insert error:', costErr);
        }

        // Save competition phases
        if (isComp) {
            const eventStart = new Date(document.getElementById('eventStart').value);
            const p1End = document.getElementById('compPhase1End').value ? new Date(document.getElementById('compPhase1End').value) : null;
            const p2End = document.getElementById('compPhase2End').value ? new Date(document.getElementById('compPhase2End').value) : null;
            const p3End = document.getElementById('compPhase3End').value ? new Date(document.getElementById('compPhase3End').value) : null;

            const phases = [
                { event_id: data.id, phase_num: 1, name: 'Registration', description: 'Sign up as a competitor and build the prize pool.', starts_at: eventStart.toISOString(), ends_at: p1End ? p1End.toISOString() : eventStart.toISOString(), status: 'pending' },
                { event_id: data.id, phase_num: 2, name: 'Active Competition', description: 'Submit your entry before the deadline.', starts_at: p1End ? p1End.toISOString() : eventStart.toISOString(), ends_at: p2End ? p2End.toISOString() : eventStart.toISOString(), status: 'pending' },
                { event_id: data.id, phase_num: 3, name: 'Voting', description: 'Vote for your favorite entry. One vote per person.', starts_at: p2End ? p2End.toISOString() : eventStart.toISOString(), ends_at: p3End ? p3End.toISOString() : eventStart.toISOString(), status: 'pending' },
                { event_id: data.id, phase_num: 4, name: 'Results', description: 'Winners announced and prizes distributed.', starts_at: p3End ? p3End.toISOString() : eventStart.toISOString(), ends_at: document.getElementById('eventEnd').value ? new Date(document.getElementById('eventEnd').value).toISOString() : (p3End ? p3End.toISOString() : eventStart.toISOString()), status: 'pending' },
            ];
            const { error: phaseErr } = await supabaseClient.from('competition_phases').insert(phases);
            if (phaseErr) console.error('Competition phases insert error:', phaseErr);
        }

        // Reset form
        document.getElementById('createEventForm').reset();
        evtBannerFile = null;
        evtCostItems = [];
        document.getElementById('bannerPreviewWrap').classList.add('hidden');
        document.getElementById('bannerUploadHint').classList.remove('hidden');
        document.getElementById('llcFieldsSection')?.classList.add('hidden');
        document.getElementById('compFieldsSection')?.classList.add('hidden');
        document.getElementById('costItemsList') && (document.getElementById('costItemsList').innerHTML = '');
        document.getElementById('costSummary')?.classList.add('hidden');
        evtToggleModal('createModal', false);

        // Reload events
        await evtLoadEvents();

        // Open the new event
        evtOpenDetail(data.id);
    } catch (err) {
        console.error('Create event error:', err);
        alert(`Failed to create event: ${err.message}`);
    } finally {
        publishBtn.disabled = false;
        publishBtn.textContent = 'Publish Event';
    }
}

// ─── Preview ────────────────────────────────────────────

function evtHandlePreview() {
    const title = document.getElementById('eventTitle').value.trim() || 'Untitled Event';
    const desc = document.getElementById('eventDescription').value.trim() || 'No description yet.';
    const start = document.getElementById('eventStart').value;
    const location = document.getElementById('eventLocation').value.trim();
    const dateStr = start ? new Date(start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
    const timeStr = start ? new Date(start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD';

    const bannerBg = evtBannerFile
        ? `background-image:url('${URL.createObjectURL(evtBannerFile)}');background-size:cover;background-position:center;`
        : `background:linear-gradient(135deg,#6366f1,#8b5cf6);`;

    const gateTime = document.getElementById('gateTime').checked;
    const gateLocation = document.getElementById('gateLocation').checked;

    document.getElementById('detailContent').innerHTML = `
        <div class="h-48 sm:h-56 relative" style="${bannerBg}">
            <button onclick="evtToggleModal('detailModal',false)" class="absolute top-4 right-4 w-8 h-8 bg-black/30 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/50 transition">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div class="absolute bottom-4 left-4"><span class="type-tag bg-amber-100 text-amber-700">PREVIEW</span></div>
        </div>
        <div class="p-5 sm:p-6">
            <h2 class="text-xl sm:text-2xl font-extrabold text-gray-900">${evtEscapeHtml(title)}</h2>
            <div class="mt-4 space-y-2 text-gray-600">
                <div class="flex items-center gap-2.5">
                    <svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <span class="text-lg font-bold text-gray-900">${dateStr}</span>
                </div>
                ${!gateTime ? `<div class="flex items-center gap-2.5 ml-[30px]"><span class="text-base font-semibold text-gray-700">${timeStr}</span></div>` : '<div class="flex items-center gap-2 text-gray-400 italic text-sm"><svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><span>Time revealed after RSVP</span></div>'}
                ${location && !gateLocation ? `<div class="flex items-center gap-2.5 mt-1"><svg class="w-5 h-5 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg><span class="text-base font-semibold text-gray-700">${evtEscapeHtml(location)}</span></div>` : location && gateLocation ? '<div class="flex items-center gap-2 text-gray-400 italic text-sm"><svg class="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><span>Location revealed after RSVP</span></div>' : ''}
            </div>
            <div class="mt-5"><p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">${evtEscapeHtml(desc)}</p></div>
            <div class="mt-6 p-4 bg-amber-50 rounded-xl text-center">
                <p class="text-sm text-amber-700 font-semibold">This is a preview — the event is not published yet.</p>
            </div>
        </div>
    `;
    evtToggleModal('detailModal', true);
}
