// Portal Events — Legacy create: #createEventForm submit (Phase 5M.1.5)
(function () {
    'use strict';

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

            let embedImageUrl = null;
            if (evtEmbedImageFile) {
                const ext = evtEmbedImageFile.name.split('.').pop();
                const path = `embeds/${slug}-${Date.now()}.${ext}`;
                const { error: upErr } = await supabaseClient.storage
                    .from('event-banners')
                    .upload(path, evtEmbedImageFile, { contentType: evtEmbedImageFile.type });
                if (upErr) throw upErr;
                const { data: { publicUrl } } = supabaseClient.storage
                    .from('event-banners')
                    .getPublicUrl(path);
                embedImageUrl = publicUrl;
            }

            const pricingMode = document.getElementById('pricingMode').value;
            const raffleEnabled = document.getElementById('raffleEnabled').checked;
            const raffleEntryCostDollars = parseInt(document.getElementById('raffleEntryCostDollars').value) || 0;

            const maxPart = document.getElementById('eventMax').value ? parseInt(document.getElementById('eventMax').value) : null;
            const minPart = document.getElementById('eventMinParticipants')?.value ? parseInt(document.getElementById('eventMinParticipants').value) : null;
            let rsvpCostCents = 0;
            let costBreakdownSummary = null;
            const costItems = window.evtCostItems || [];
            if (isLlc && costItems.length > 0 && (minPart || maxPart)) {
                const llcCutPct = parseFloat(document.getElementById('eventLlcCut').value) || 0;
                const totalIncluded = costItems.filter(i => i.included_in_buyin).reduce((sum, i) => sum + (i.total_cost_cents || 0), 0);
                const totalOop = costItems.filter(i => !i.included_in_buyin).reduce((sum, i) => sum + (i.avg_per_person_cents || 0), 0);
                const divisor = minPart || maxPart;
                const baseBuyIn = Math.ceil(totalIncluded / divisor);
                const llcCut = Math.round(baseBuyIn * llcCutPct / 100);
                const suggestedCents = baseBuyIn + llcCut;
                costBreakdownSummary = { total_included_cents: totalIncluded, total_oop_per_person_cents: totalOop, base_buyin_cents: baseBuyIn, llc_cut_cents: llcCut, final_buyin_cents: suggestedCents };

                const overrideVal = parseInt(document.getElementById('llcRsvpOverride')?.value);
                rsvpCostCents = overrideVal > 0 ? overrideVal * 100 : suggestedCents;
            } else if (isLlc) {
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
                embed_image_url: embedImageUrl,
                start_date: new Date(document.getElementById('eventStart').value).toISOString(),
                end_date: document.getElementById('eventEnd').value ? new Date(document.getElementById('eventEnd').value).toISOString() : null,
                timezone: document.getElementById('eventTimezone').value,
                location_nickname: document.getElementById('eventLocationNickname').value.trim() || null,
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
                raffle_entry_cost_cents: (raffleEnabled && pricingMode !== 'paid') ? raffleEntryCostDollars * 100 : 0,
                raffle_enabled: raffleEnabled,
                status: 'open',
            };

            if (record.location_text) {
                let geo = null;
                if (window._evtLocGeoCache && window._evtLocGeoCache.address === record.location_text && window._evtLocGeoCache.result) {
                    geo = window._evtLocGeoCache.result;
                } else {
                    publishBtn.textContent = 'Validating address…';
                    geo = await window.evtGeocodeAddress(record.location_text);
                }
                if (geo) {
                    record.location_lat = geo.lat;
                    record.location_lng = geo.lng;
                } else {
                    if (!confirm('Could not verify that address on the map. The event will be created without a map pin.\n\nPublish anyway?')) {
                        publishBtn.disabled = false;
                        publishBtn.textContent = 'Publish Event';
                        return;
                    }
                }
                publishBtn.textContent = 'Publishing…';
            }

            if (isLlc) {
                record.min_participants = parseInt(document.getElementById('eventMinParticipants').value) || null;
                record.llc_cut_pct = parseFloat(document.getElementById('eventLlcCut').value) || 0;
                record.invest_eligible = document.getElementById('investEligible').checked;
                record.show_cost_breakdown = document.getElementById('showCostBreakdown').checked;
                record.cost_breakdown = costBreakdownSummary;
                const transportEnabled = document.getElementById('transportationEnabled').checked;
                record.transportation_enabled = transportEnabled;
                record.transportation_mode = transportEnabled ? document.getElementById('eventTransportation').value : null;
                record.transportation_estimate_cents = transportEnabled && document.getElementById('eventTransportation').value === 'self_arranged'
                    ? Math.round((parseFloat(document.getElementById('eventTransportEstimate').value) || 0) * 100)
                    : null;
                record.location_required = document.getElementById('locationRequired').checked;
            }

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
                record.rsvp_cost_cents = 0;
            }

            if (checkinEnabled && checkinMode === 'venue_scan') {
                record.venue_qr_token = crypto.randomUUID();
            }

            if (raffleEnabled) {
                record.raffle_type = document.getElementById('raffleType').value;
                record.raffle_draw_trigger = document.getElementById('raffleDrawTrigger').value;

                const prizesContainer = document.getElementById('rafflePrizesList');
                const prizeInputs = prizesContainer
                    ? prizesContainer.querySelectorAll('input[type="text"]')
                    : document.querySelectorAll('input[name="rafflePrize"]');
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

            if (isLlc && costItems.length > 0) {
                const costRows = costItems.map((item, idx) => ({
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

            document.getElementById('createEventForm').reset();
            evtBannerFile = null;
            evtEmbedImageFile = null;
            window.evtCostItems = [];
            window._evtLocGeoCache = null;
            window.evtSetLocationIcon('hide');
            window.evtSetLocationStatus('', '');
            document.getElementById('bannerPreviewWrap').classList.add('hidden');
            document.getElementById('bannerUploadHint').classList.remove('hidden');
            document.getElementById('embedImagePreviewWrap')?.classList.add('hidden');
            document.getElementById('embedImageUploadHint')?.classList.remove('hidden');
            document.getElementById('llcFieldsSection')?.classList.add('hidden');
            document.getElementById('compFieldsSection')?.classList.add('hidden');
            document.getElementById('costItemsList') && (document.getElementById('costItemsList').innerHTML = '');
            document.getElementById('costSummary')?.classList.add('hidden');
            evtToggleModal('createModal', false);

            await evtLoadEvents();
            evtNavigateToEvent(data.slug);
        } catch (err) {
            console.error('Create event error:', err);
            alert(`Failed to create event: ${err.message}`);
        } finally {
            publishBtn.disabled = false;
            publishBtn.textContent = 'Publish Event';
        }
    }

    window.evtHandleCreate = evtHandleCreate;
})();
