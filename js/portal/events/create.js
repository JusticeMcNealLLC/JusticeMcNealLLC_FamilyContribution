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
        // Hide general RSVP cost group — LLC events use llcRsvpOverride instead
        const rsvpCostGroup = document.getElementById('rsvpCostGroup');
        if (rsvpCostGroup) rsvpCostGroup.classList.add('hidden');
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

    // Use min_participants as price basis (guarantees event is funded at minimum attendance)
    const minPart = parseInt(document.getElementById('eventMinParticipants')?.value) || 0;
    const llcCutPct = parseFloat(document.getElementById('eventLlcCut').value) || 0;

    const totalIncluded = evtCostItems.filter(i => i.included_in_buyin).reduce((sum, i) => sum + (i.total_cost_cents || 0), 0);
    const totalOop = evtCostItems.filter(i => !i.included_in_buyin).reduce((sum, i) => sum + (i.avg_per_person_cents || 0), 0);

    if (evtCostItems.length === 0) { summary.classList.add('hidden'); return; }
    summary.classList.remove('hidden');

    const baseBuyIn = minPart > 0 ? Math.ceil(totalIncluded / minPart) : 0;
    const llcCutAmount = Math.round(baseBuyIn * llcCutPct / 100);
    const finalBuyIn = baseBuyIn + llcCutAmount;

    document.getElementById('costTotalIncluded').textContent = formatCurrency(totalIncluded);
    document.getElementById('costMaxPart').textContent = minPart > 0 ? minPart : '—';
    document.getElementById('costBuyIn').textContent = minPart > 0 ? `${formatCurrency(finalBuyIn)}/person` : 'Set min participants';
    document.getElementById('costOop').textContent = `~${formatCurrency(totalOop)}/person`;
    document.getElementById('costGrandTotal').textContent = minPart > 0 ? `~${formatCurrency(finalBuyIn + totalOop)}` : '—';

    const llcRow = document.getElementById('costLlcCutRow');
    if (llcCutPct > 0 && minPart > 0) {
        llcRow.classList.remove('hidden');
        document.getElementById('costLlcPct').textContent = llcCutPct;
        document.getElementById('costLlcAmount').textContent = `+${formatCurrency(llcCutAmount)}`;
    } else {
        llcRow.classList.add('hidden');
    }

    // Auto-fill the LLC RSVP override field with the suggested price (only if user hasn't typed a custom value)
    const overrideInput = document.getElementById('llcRsvpOverride');
    if (minPart > 0 && overrideInput && !overrideInput.dataset.userEdited) {
        overrideInput.value = Math.ceil(finalBuyIn / 100);
        overrideInput.placeholder = `Suggested: $${Math.ceil(finalBuyIn / 100)}`;
    }
}

// ─── Main Create Handler ────────────────────────────────

// Common US street-type abbreviations → full words for better geocoding
const STREET_ABBREVS = {
    'crt':'court','ct':'court','dr':'drive','st':'street','ave':'avenue',
    'blvd':'boulevard','ln':'lane','rd':'road','pl':'place','cir':'circle',
    'pkwy':'parkway','hwy':'highway','trl':'trail','ter':'terrace',
    'trce':'trace','cv':'cove','pt':'point','aly':'alley','way':'way'
};
// US state abbreviations → full names
const STATE_ABBREVS = {
    'al':'alabama','ak':'alaska','az':'arizona','ar':'arkansas','ca':'california',
    'co':'colorado','ct':'connecticut','de':'delaware','fl':'florida','ga':'georgia',
    'hi':'hawaii','id':'idaho','il':'illinois','in':'indiana','ia':'iowa',
    'ks':'kansas','ky':'kentucky','la':'louisiana','me':'maine','md':'maryland',
    'ma':'massachusetts','mi':'michigan','mn':'minnesota','ms':'mississippi',
    'mo':'missouri','mt':'montana','ne':'nebraska','nv':'nevada','nh':'new hampshire',
    'nj':'new jersey','nm':'new mexico','ny':'new york','nc':'north carolina',
    'nd':'north dakota','oh':'ohio','ok':'oklahoma','or':'oregon','pa':'pennsylvania',
    'ri':'rhode island','sc':'south carolina','sd':'south dakota','tn':'tennessee',
    'tx':'texas','ut':'utah','vt':'vermont','va':'virginia','wa':'washington',
    'wv':'west virginia','wi':'wisconsin','wy':'wyoming','dc':'district of columbia'
};

function evtExpandAddress(raw) {
    let words = raw.trim().split(/\s+/);
    const streetTypes = new Set(Object.values(STREET_ABBREVS));
    let streetTypeIdx = -1;
    words = words.map((w, i) => {
        const lower = w.toLowerCase();
        if (STREET_ABBREVS[lower]) { streetTypeIdx = i; return STREET_ABBREVS[lower]; }
        if (streetTypes.has(lower)) { streetTypeIdx = i; }
        return w;
    });
    words = words.map(w => STATE_ABBREVS[w.toLowerCase()] || w);
    const expanded = words.join(' ');
    if (raw.includes(',')) return expanded;
    const zipMatch = expanded.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
    if (!zipMatch) return expanded;
    const beforeZip = zipMatch[1];
    const zip = zipMatch[2];
    const bParts = beforeZip.split(' ');
    let stateStart = -1;
    const stateVals = Object.values(STATE_ABBREVS);
    if (bParts.length >= 3) {
        const twoWord = (bParts[bParts.length - 2] + ' ' + bParts[bParts.length - 1]).toLowerCase();
        if (stateVals.includes(twoWord)) stateStart = bParts.length - 2;
    }
    if (stateStart < 0 && bParts.length >= 2) {
        if (stateVals.includes(bParts[bParts.length - 1].toLowerCase())) stateStart = bParts.length - 1;
    }
    if (stateStart < 0) return expanded;
    const statePart = bParts.slice(stateStart).join(' ');
    const preState = bParts.slice(0, stateStart);
    if (streetTypeIdx >= 0 && streetTypeIdx < preState.length - 1) {
        const street = preState.slice(0, streetTypeIdx + 1).join(' ');
        const city = preState.slice(streetTypeIdx + 1).join(' ');
        return `${street}, ${city}, ${statePart} ${zip}`;
    }
    return preState.join(' ') + ', ' + statePart + ' ' + zip;
}

// ── Geocoding: US Census Bureau (via edge function) → Nominatim (fallback) ──
// The Census geocoder has TIGER/Line data — virtually every US address.
// It doesn't support CORS, so we proxy through a Supabase Edge Function.

async function evtGeocodeCensus(address) {
    // Proxy through our edge function to avoid CORS issues
    const url = `${getFunctionUrl('geocode-address')}?address=${encodeURIComponent(address)}`;
    try {
        const resp = await fetch(url, {
            headers: { 'apikey': SUPABASE_ANON_KEY }
        });
        const data = await resp.json();
        if (data?.found) {
            return {
                lat: data.lat,
                lng: data.lng,
                display: data.display
            };
        }
    } catch (err) { console.warn('Census geocoder failed:', err); }
    return null;
}

async function evtGeocodeNominatim(address) {
    // Nominatim / OpenStreetMap — good for non-US or when Census is down
    try {
        const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(address)}`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const results = await resp.json();
        if (results && results.length > 0) {
            const best = results.find(r => r.class === 'place' || r.class === 'building') || results[0];
            return { lat: parseFloat(best.lat), lng: parseFloat(best.lon), display: best.display_name };
        }
    } catch (err) { console.warn('Nominatim geocoder failed:', err); }
    return null;
}

// Main geocode function — tries multiple sources until one succeeds
async function evtGeocodeAddress(address) {
    const expanded = evtExpandAddress(address);

    // 1. US Census Bureau — best for exact US addresses
    let result = await evtGeocodeCensus(address);
    if (result) return result;

    // 2. Census with expanded abbreviations
    if (expanded !== address) {
        result = await evtGeocodeCensus(expanded);
        if (result) return result;
    }

    // 3. Nominatim with expanded address
    result = await evtGeocodeNominatim(expanded);
    if (result) return result;

    // 4. Nominatim with original address
    if (expanded !== address) {
        result = await evtGeocodeNominatim(address);
        if (result) return result;
    }

    return null;
}

// ─── Live Address Validation ────────────────────────────
// Validates as the user types (debounced) and on blur.
// Caches the result so publish doesn't re-geocode.

let _evtLocGeoCache = null;   // { address, result } or null
let _evtLocDebounce = null;   // timeout id

function evtSetLocationIcon(state) {
    // state: 'spin' | 'check' | 'warn' | 'hide'
    const wrap    = document.getElementById('locationIcon');
    const spinner = document.getElementById('locIconSpinner');
    const check   = document.getElementById('locIconCheck');
    const warn    = document.getElementById('locIconWarn');
    if (!wrap) return;

    spinner.classList.add('hidden');
    check.classList.add('hidden');
    warn.classList.add('hidden');

    if (state === 'hide') { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    if (state === 'spin')  spinner.classList.remove('hidden');
    if (state === 'check') check.classList.remove('hidden');
    if (state === 'warn')  warn.classList.remove('hidden');
}

function evtSetLocationStatus(text, color) {
    const el = document.getElementById('locationStatus');
    if (!el) return;
    if (!text) { el.classList.add('hidden'); el.textContent = ''; return; }
    el.textContent = text;
    el.className = `text-xs mt-1 ${color}`;
    el.classList.remove('hidden');
}

async function evtValidateLocation() {
    const input = document.getElementById('eventLocation');
    const address = input ? input.value.trim() : '';

    // Empty → clear everything
    if (!address) {
        _evtLocGeoCache = null;
        evtSetLocationIcon('hide');
        evtSetLocationStatus('', '');
        return;
    }

    // Already validated this exact text
    if (_evtLocGeoCache && _evtLocGeoCache.address === address) return;

    evtSetLocationIcon('spin');
    evtSetLocationStatus('Validating address…', 'text-gray-400');

    const result = await evtGeocodeAddress(address);

    // Make sure input hasn't changed while we were fetching
    const current = input.value.trim();
    if (current !== address) return;

    _evtLocGeoCache = { address, result };

    if (result) {
        evtSetLocationIcon('check');
        evtSetLocationStatus(`✓ ${result.display}`, 'text-green-600');
    } else {
        evtSetLocationIcon('warn');
        evtSetLocationStatus('Address not found — event will have no map pin', 'text-amber-600');
    }
}

function evtInitLocationValidation() {
    const input = document.getElementById('eventLocation');
    if (!input) return;

    // Debounced input — fires 800ms after user stops typing
    input.addEventListener('input', () => {
        clearTimeout(_evtLocDebounce);
        _evtLocDebounce = setTimeout(evtValidateLocation, 800);
    });

    // Also validate on blur (leaving the field)
    input.addEventListener('blur', () => {
        clearTimeout(_evtLocDebounce);
        evtValidateLocation();
    });
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
        const checkinEnabled = document.getElementById('checkinEnabled').checked;
        const rsvpEnabled = document.getElementById('rsvpEnabled').checked;

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

        // For LLC events, RSVP cost uses manual override or suggested from cost breakdown
        const maxPart = document.getElementById('eventMax').value ? parseInt(document.getElementById('eventMax').value) : null;
        const minPart = document.getElementById('eventMinParticipants')?.value ? parseInt(document.getElementById('eventMinParticipants').value) : null;
        let rsvpCostCents = 0;
        let costBreakdownSummary = null;
        if (isLlc && evtCostItems.length > 0 && (minPart || maxPart)) {
            const llcCutPct = parseFloat(document.getElementById('eventLlcCut').value) || 0;
            const totalIncluded = evtCostItems.filter(i => i.included_in_buyin).reduce((sum, i) => sum + (i.total_cost_cents || 0), 0);
            const totalOop = evtCostItems.filter(i => !i.included_in_buyin).reduce((sum, i) => sum + (i.avg_per_person_cents || 0), 0);
            // Use min_participants as divisor (guarantees event fully funded at minimum attendance)
            const divisor = minPart || maxPart;
            const baseBuyIn = Math.ceil(totalIncluded / divisor);
            const llcCut = Math.round(baseBuyIn * llcCutPct / 100);
            const suggestedCents = baseBuyIn + llcCut;
            costBreakdownSummary = { total_included_cents: totalIncluded, total_oop_per_person_cents: totalOop, base_buyin_cents: baseBuyIn, llc_cut_cents: llcCut, final_buyin_cents: suggestedCents };

            // Check manual override
            const overrideVal = parseInt(document.getElementById('llcRsvpOverride')?.value);
            rsvpCostCents = overrideVal > 0 ? overrideVal * 100 : suggestedCents;
        } else if (isLlc) {
            // LLC event with no cost items — use manual override
            const overrideVal = parseInt(document.getElementById('llcRsvpOverride')?.value) || 0;
            rsvpCostCents = overrideVal * 100;
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
            checkin_mode: checkinEnabled ? checkinMode : null,
            checkin_enabled: checkinEnabled,
            rsvp_enabled: rsvpEnabled,
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

        // Geocode location → lat/lng for map (use cached result from live validation)
        if (record.location_text) {
            let geo = null;
            if (_evtLocGeoCache && _evtLocGeoCache.address === record.location_text && _evtLocGeoCache.result) {
                geo = _evtLocGeoCache.result;
            } else {
                publishBtn.textContent = 'Validating address…';
                geo = await evtGeocodeAddress(record.location_text);
            }
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
            record.min_participants = parseInt(document.getElementById('eventMinParticipants').value) || null;
            record.llc_cut_pct = parseFloat(document.getElementById('eventLlcCut').value) || 0;
            record.invest_eligible = document.getElementById('investEligible').checked;
            record.show_cost_breakdown = document.getElementById('showCostBreakdown').checked;
            // member_only already set from checkbox above — LLC events respect user's choice
            record.cost_breakdown = costBreakdownSummary;
            const transportEnabled = document.getElementById('transportationEnabled').checked;
            record.transportation_enabled = transportEnabled;
            record.transportation_mode = transportEnabled ? document.getElementById('eventTransportation').value : null;
            record.transportation_estimate_cents = transportEnabled && document.getElementById('eventTransportation').value === 'self_arranged'
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

        // Generate venue QR token if venue_scan mode and QR check-in enabled
        if (checkinEnabled && checkinMode === 'venue_scan') {
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
        _evtLocGeoCache = null;
        evtSetLocationIcon('hide');
        evtSetLocationStatus('', '');
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
        <div class="relative" style="${bannerBg} min-height:280px;">
            <!-- Gradient scrim for text readability -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10 pointer-events-none"></div>
            <!-- Close button — respects Dynamic Island -->
            <div class="absolute top-0 right-0" style="padding-top:max(1rem, env(safe-area-inset-top)); padding-right:1rem;">
                <button onclick="evtToggleModal('detailModal',false)" class="w-8 h-8 bg-black/30 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-black/50 transition">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <!-- Preview tag + Title at bottom of banner -->
            <div class="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                <div class="mb-2"><span class="type-tag bg-amber-100 text-amber-700">PREVIEW</span></div>
                <h2 class="text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg">${evtEscapeHtml(title)}</h2>
            </div>
        </div>
        <div class="p-5 sm:p-6">
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
