// Portal Events — Create sheet: Submit / storage (Phase 5M.1.4)
// Supports create (insert) and edit (update) for member, LLC, and competition events.

'use strict';

let _submitting = false;

function _steps() {
    return window.EventsCreateSteps;
}

function _raffleApi() {
    return window.EventsCreateRaffleBuilder;
}

function _compApi() {
    return window.EventsCreateSteps?.competition;
}

async function upsertPendingCompetitionPhases(eventId, form, startISO, endISO) {
    const comp = _compApi();
    if (!comp?.buildInitialPhases) return;
    const phases = comp.buildInitialPhases(form, startISO, endISO);
    const { data: existing, error: loadErr } = await supabaseClient
        .from('competition_phases')
        .select('*')
        .eq('event_id', eventId);
    if (loadErr) throw loadErr;
    for (const ph of phases) {
        const ex = (existing || []).find((p) => Number(p.phase_num) === Number(ph.phase_num));
        if (ex && ex.status !== 'pending') continue;
        const row = {
            ...ph,
            event_id: eventId,
            status: ex?.status || 'pending',
            extended_once: ex?.extended_once || false,
        };
        const { error } = await supabaseClient
            .from('competition_phases')
            .upsert(row, { onConflict: 'event_id,phase_num' });
        if (error) throw error;
    }
}

async function insertCompetitionPhases(eventId, form, startISO, endISO) {
    const comp = _compApi();
    if (!comp?.buildInitialPhases) return;
    const phases = comp.buildInitialPhases(form, startISO, endISO).map((ph) => ({
        ...ph,
        event_id: eventId,
    }));
    const { error } = await supabaseClient.from('competition_phases').insert(phases);
    if (error) throw error;
}

function _llcApi() {
    return window.EventsCreateSteps?.llc;
}

async function countEventRsvps(eventId) {
    const [memberRes, guestRes] = await Promise.all([
        supabaseClient.from('event_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
        supabaseClient.from('event_guest_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    ]);
    if (memberRes.error) throw memberRes.error;
    if (guestRes.error) throw guestRes.error;
    return (memberRes.count || 0) + (guestRes.count || 0);
}

async function replaceCostItems(eventId, costItems) {
    const { error: delErr } = await supabaseClient
        .from('event_cost_items')
        .delete()
        .eq('event_id', eventId);
    if (delErr) throw new Error('Failed to clear cost items: ' + delErr.message);

    const items = Array.isArray(costItems) ? costItems : [];
    if (!items.length) return;

    const costRows = items.map((item, idx) => ({
        event_id: eventId,
        name: String(item.name || '').trim() || `Item ${idx + 1}`,
        category: item.category || 'other',
        total_cost_cents: Number(item.total_cost_cents) || 0,
        included_in_buyin: item.included_in_buyin !== false,
        avg_per_person_cents: Number(item.avg_per_person_cents) || 0,
        notes: item.notes || null,
        sort_order: idx,
    }));
    const { error: costErr } = await supabaseClient.from('event_cost_items').insert(costRows);
    if (costErr) throw new Error('Failed to save cost items: ' + costErr.message);
}

async function submit(status) {
    if (_submitting) return;
    const steps = _steps();
    const STATE = steps.getState();
    const validateStep = steps.validateStep;
    const esc = steps.esc;
    const close = steps.close;
    const editing = !!STATE.editEventId;
    const isLlc = STATE.form.event_type === 'llc';
    const isComp = STATE.form.event_type === 'competition';

    if (typeof validateStep === 'function') {
        const err = validateStep();
        if (err && status === 'open') return alert(err);
    }

    const f = STATE.form;
    if (!f.title.trim()) return alert('Title is required to save.');
    if (status === 'open' && !f.start_date) return alert('Start date is required to publish.');
    if (isLlc && status === 'open') {
        const llcErr = _llcApi()?.validateLlc?.(f);
        if (llcErr) return alert(llcErr);
    }
    if (isComp && status === 'open') {
        const compErr = _compApi()?.validateCompetition?.(f, { publish: true });
        if (compErr) return alert(compErr);
    }

    const errBox = document.getElementById('ecError');
    if (errBox) errBox.innerHTML = '';

    _submitting = true;
    const nextBtn = document.getElementById('ecNextBtn');
    const draftBtn = document.getElementById('ecDraftBtn');
    const origNext = nextBtn?.textContent;
    const origDraft = draftBtn?.textContent;
    if (nextBtn) nextBtn.disabled = true;
    if (draftBtn) draftBtn.disabled = true;
    if (status === 'draft' && draftBtn) draftBtn.textContent = 'Saving…';
    if (status === 'open' && nextBtn) nextBtn.textContent = editing ? 'Saving…' : 'Publishing…';

    try {
        const userId = (window.evtCurrentUser && window.evtCurrentUser.id) || (await supabaseClient.auth.getUser()).data.user?.id;
        if (!userId) throw new Error('Not signed in.');

        const slug = editing && STATE.editSlug
            ? STATE.editSlug
            : ((typeof globalThis.evtGenerateSlug === 'function')
                ? window.evtGenerateSlug(f.title.trim())
                : f.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + Date.now().toString(36));

        let bannerUrl = editing ? (STATE.existingBannerUrl || null) : null;
        if (STATE.bannerFile) {
            const ext = STATE.bannerFile.name.split('.').pop();
            const path = `${slug}-${Date.now()}.${ext}`;
            const up = await supabaseClient.storage
                .from('event-banners')
                .upload(path, STATE.bannerFile, { contentType: STATE.bannerFile.type });
            if (up.error) throw new Error('Banner upload failed: ' + up.error.message);
            bannerUrl = supabaseClient.storage.from('event-banners').getPublicUrl(path).data.publicUrl;
        }

        let embedImageUrl = editing ? (STATE.existingEmbedUrl || null) : null;
        if (STATE.embedImageFile) {
            const ext = STATE.embedImageFile.name.split('.').pop();
            const path = `embeds/${slug}-${Date.now()}.${ext}`;
            const up = await supabaseClient.storage
                .from('event-banners')
                .upload(path, STATE.embedImageFile, { contentType: STATE.embedImageFile.type });
            if (up.error) throw new Error('Embed image upload failed: ' + up.error.message);
            embedImageUrl = supabaseClient.storage.from('event-banners').getPublicUrl(path).data.publicUrl;
        }

        const rb = _raffleApi();
        const raffleConfig = f.raffle_enabled ? rb.raffleModel().normalizeConfig(rb.ensureRaffleConfig()) : null;
        if (raffleConfig) {
            const prizeUploads = Object.entries(STATE.prizeImageFiles);
            for (const [itemId, imgFile] of prizeUploads) {
                const item = raffleConfig.items.find(i => i.id === itemId);
                if (!item) continue;
                const ext = imgFile.name.split('.').pop().toLowerCase() || 'jpg';
                const path = `${slug}/${itemId}-${Date.now()}.${ext}`;
                const up = await supabaseClient.storage
                    .from('event-raffle-prizes')
                    .upload(path, imgFile, { contentType: imgFile.type });
                if (up.error) throw new Error(`Prize image upload failed: ${up.error.message}`);
                item.image_url = supabaseClient.storage.from('event-raffle-prizes').getPublicUrl(path).data.publicUrl;
            }
        }

        if (isLlc) f.pricing_mode = 'paid';
        if (isComp) {
            f.pricing_mode = 'free';
            f.raffle_enabled = false;
            f.member_only = true;
        }

        const startISO = f.start_date ? new Date(f.start_date).toISOString() : null;
        const endISO = f.end_date ? new Date(f.end_date).toISOString() : null;
        const deadline = f.rsvp_deadline ? new Date(f.rsvp_deadline).toISOString() : null;

        let adultCents;
        let costBreakdown = null;
        if (isLlc) {
            const llc = _llcApi();
            adultCents = llc?.resolveLlcBuyInCents
                ? llc.resolveLlcBuyInCents(f)
                : Math.round(Number(f.adult_price_dollars || 0) * 100);
            costBreakdown = llc?.computeLlcCostBreakdown
                ? llc.computeLlcCostBreakdown(f.cost_items, f.min_participants, f.llc_cut_pct)
                : null;
            if (adultCents > 0) {
                f.adult_price_dollars = (adultCents / 100).toFixed(2);
            }
        } else {
            const adultDollars = f.adult_price_dollars ?? f.rsvp_cost_dollars ?? '';
            adultCents = f.pricing_mode === 'paid' ? Math.round(Number(adultDollars || 0) * 100) : 0;
        }

        const kidsFree = f.pricing_mode === 'paid' ? !!f.kids_free : true;
        const kidCents = (f.pricing_mode === 'paid' && !kidsFree)
            ? Math.round(Number(f.kid_price_dollars || 0) * 100) : null;
        const fundDeadlineISO = (f.pricing_mode === 'paid' && f.fund_deadline)
            ? new Date(f.fund_deadline).toISOString() : null;
        const capacityMode = f.capacity_mode || 'none';
        const capacityCounts = f.capacity_counts || 'adults';
        const maxParticipants = (capacityMode === 'none')
            ? null
            : (f.max_participants ? Number(f.max_participants) : null);
        const raffleCents = f.raffle_enabled ? Math.round(Number(f.raffle_entry_cost_dollars || 0) * 100) : 0;
        const raffleWinnerCount = raffleConfig ? rb.raffleModel().getTotalWinnerCount(raffleConfig) : 0;
        const aboutTabs = (window.EventsAboutTabs && typeof window.EventsAboutTabs.normalizeAboutTabs === 'function')
            ? window.EventsAboutTabs.normalizeAboutTabs(f.about_tabs)
            : [];
        const includedItems = (window.EventsIncludedItems && typeof window.EventsIncludedItems.normalizeIncludedItems === 'function')
            ? window.EventsIncludedItems.normalizeIncludedItems(f.included_items)
            : [];
        const disclaimers = (window.EventsDisclaimers && typeof window.EventsDisclaimers.normalizeDisclaimers === 'function')
            ? window.EventsDisclaimers.normalizeDisclaimers(f.disclaimers)
            : [];
        const amenityVoting = (window.EventsAmenityVoting && typeof window.EventsAmenityVoting.normalizeConfig === 'function')
            ? window.EventsAmenityVoting.normalizeConfig(f.amenity_voting)
            : { enabled: false, options: [], closes_at: null, results_visible: 'after_close' };

        let lockPricing = !!STATE.pricingLocked;
        let lockDisclaimers = !!STATE.disclaimersLocked;
        let lockVoting = !!STATE.votingLocked;
        let lockCompetition = !!STATE.competitionLocked;
        if (editing) {
            const rsvpCount = await countEventRsvps(STATE.editEventId);
            if (rsvpCount > 0) {
                lockPricing = true;
                lockDisclaimers = true;
                lockVoting = true;
                STATE.pricingLocked = true;
                STATE.disclaimersLocked = true;
                STATE.votingLocked = true;
            }
            if (isComp) {
                const { count: entryCount } = await supabaseClient
                    .from('competition_entries')
                    .select('id', { count: 'exact', head: true })
                    .eq('event_id', STATE.editEventId);
                if ((entryCount || 0) > 0) {
                    lockCompetition = true;
                    STATE.competitionLocked = true;
                }
            }
        }

        const eventType = isComp ? 'competition' : (isLlc ? 'llc' : 'member');
        const record = {
            event_type: eventType,
            title: f.title.trim(),
            category: f.category,
            description: f.description.trim() || null,
            about_tabs: aboutTabs,
            included_items: includedItems,
            banner_url: bannerUrl,
            embed_image_url: embedImageUrl,
            start_date: startISO,
            end_date: endISO,
            timezone: f.timezone,
            location_text: f.location_text.trim() || null,
            location_nickname: f.location_nickname.trim() || null,
            location_lat: STATE.geocode?.lat || null,
            location_lng: STATE.geocode?.lng || null,
            max_participants: maxParticipants,
            rsvp_deadline: deadline,
            member_only: isComp ? true : !!f.member_only,
            capacity_mode: capacityMode,
            capacity_counts: capacityCounts,
            raffle_enabled: isComp ? false : !!f.raffle_enabled,
            raffle_entry_cost_cents: isComp ? 0 : raffleCents,
            raffle_prizes: isComp ? null : raffleConfig,
            raffle_winner_count: isComp ? 0 : raffleWinnerCount,
            status,
        };

        if (isComp) {
            record.rsvp_enabled = false;
            if (!lockCompetition) {
                record.competition_config = _compApi()?.buildCompetitionConfig?.(f) || null;
                record.winner_tier_config = _compApi()?.buildWinnerTierConfig?.(f) || null;
            }
            if (!editing) {
                record.total_prize_pool_cents = 0;
            }
        }

        if (isLlc) {
            record.min_participants = f.min_participants ? Number(f.min_participants) : null;
            record.llc_cut_pct = Number(f.llc_cut_pct) || 0;
            record.invest_eligible = !!f.invest_eligible;
            record.show_cost_breakdown = !!f.show_cost_breakdown;
            record.location_required = !!f.location_required;
            record.transportation_enabled = !!f.transportation_enabled;
            if (f.transportation_enabled) {
                record.transportation_mode = f.transportation_mode || 'self_arranged';
                if (record.transportation_mode === 'llc_provides') {
                    record.transportation_method = (f.transportation_method === 'plane' || f.transportation_method === 'car')
                        ? f.transportation_method
                        : 'car';
                    record.transportation_estimate_cents = null;
                } else {
                    record.transportation_method = null;
                    record.transportation_estimate_cents = (f.transportation_estimate_dollars !== '' && f.transportation_estimate_dollars != null)
                        ? Math.round(Number(f.transportation_estimate_dollars || 0) * 100)
                        : null;
                }
            } else {
                record.transportation_mode = null;
                record.transportation_method = null;
                record.transportation_estimate_cents = null;
            }
            if (!lockPricing && costBreakdown) {
                record.cost_breakdown = costBreakdown;
            }
        }

        if (!lockPricing && !isComp) {
            record.pricing_mode = f.pricing_mode;
            record.adult_price_cents = adultCents;
            record.rsvp_cost_cents = adultCents;
            record.kids_free = kidsFree;
            record.kid_price_cents = kidCents;
            record.fund_deadline = fundDeadlineISO;
        }
        if (isComp && !lockPricing) {
            record.pricing_mode = 'free';
            record.adult_price_cents = 0;
            record.rsvp_cost_cents = 0;
            record.kids_free = true;
            record.kid_price_cents = null;
            record.fund_deadline = null;
        }
        if (!lockDisclaimers) {
            record.disclaimers = disclaimers;
        }
        if (!lockVoting && !isComp) {
            record.amenity_voting = amenityVoting;
        }

        let data;
        if (editing) {
            const { data: updated, error } = await supabaseClient
                .from('events')
                .update(record)
                .eq('id', STATE.editEventId)
                .select()
                .single();
            if (error) throw error;
            data = updated;
        } else {
            record.created_by = userId;
            record.slug = slug;
            if (!Object.prototype.hasOwnProperty.call(record, 'disclaimers')) {
                record.disclaimers = disclaimers;
            }
            if (!isComp && !Object.prototype.hasOwnProperty.call(record, 'amenity_voting')) {
                record.amenity_voting = amenityVoting;
            }
            if (!Object.prototype.hasOwnProperty.call(record, 'pricing_mode')) {
                record.pricing_mode = f.pricing_mode;
                record.adult_price_cents = adultCents;
                record.rsvp_cost_cents = adultCents;
                record.kids_free = kidsFree;
                record.kid_price_cents = kidCents;
                record.fund_deadline = fundDeadlineISO;
            }
            const { data: created, error } = await supabaseClient.from('events').insert(record).select().single();
            if (error) throw error;
            data = created;
        }

        if (isLlc && !lockPricing) {
            await replaceCostItems(data.id, f.cost_items);
        }

        if (isComp && !lockCompetition) {
            if (editing) {
                await upsertPendingCompetitionPhases(data.id, f, startISO, endISO);
            } else {
                await insertCompetitionPhases(data.id, f, startISO, endISO);
            }
        }

        if (typeof close === 'function') close();

        document.dispatchEvent(new CustomEvent(editing ? 'events:updated' : 'events:created', {
            detail: { event: data, status },
        }));

        if (typeof globalThis.evtLoadEvents === 'function') {
            await window.evtLoadEvents();
        }
        if (data.slug && typeof globalThis.evtNavigateToEvent === 'function') {
            window.evtNavigateToEvent(data.slug);
        } else if (data.id && typeof globalThis.evtOpenDetail === 'function') {
            await window.evtOpenDetail(data.id);
        }
    } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        const errBox2 = document.getElementById('ecError');
        if (errBox2 && typeof esc === 'function') {
            errBox2.innerHTML = `<div class="ec-error">${esc(msg)}</div>`;
        } else {
            alert('Save failed: ' + msg);
        }
    } finally {
        _submitting = false;
        if (nextBtn) { nextBtn.disabled = false; if (origNext) nextBtn.textContent = origNext; }
        if (draftBtn) { draftBtn.disabled = false; if (origDraft) draftBtn.textContent = origDraft; }
    }
}

export const createSubmitApi = { submit };

globalThis.EventsCreateSubmit = createSubmitApi;
