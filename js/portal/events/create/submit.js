// Portal Events — Create sheet: Submit / storage (Phase 5M.1.4)
(function () {
    'use strict';

    let _submitting = false;

    function _steps() {
        return window.EventsCreateSteps;
    }

    function _raffleApi() {
        return window.EventsCreateRaffleBuilder;
    }

    async function submit(status) {
        if (_submitting) return;
        const steps = _steps();
        const STATE = steps.getState();
        const validateStep = steps.validateStep;
        const esc = steps.esc;
        const close = steps.close;

        if (typeof validateStep === 'function') {
            const err = validateStep();
            if (err && status === 'open') return alert(err);
        }

        const f = STATE.form;
        if (!f.title.trim()) return alert('Title is required to save.');
        if (status === 'open' && !f.start_date) return alert('Start date is required to publish.');

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
        if (status === 'open' && nextBtn) nextBtn.textContent = 'Publishing…';

        try {
            const userId = (window.evtCurrentUser && window.evtCurrentUser.id) || (await supabaseClient.auth.getUser()).data.user?.id;
            if (!userId) throw new Error('Not signed in.');

            const slug = (typeof window.evtGenerateSlug === 'function')
                ? window.evtGenerateSlug(f.title.trim())
                : f.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + Date.now().toString(36);

            let bannerUrl = null;
            if (STATE.bannerFile) {
                const ext = STATE.bannerFile.name.split('.').pop();
                const path = `${slug}-${Date.now()}.${ext}`;
                const up = await supabaseClient.storage
                    .from('event-banners')
                    .upload(path, STATE.bannerFile, { contentType: STATE.bannerFile.type });
                if (up.error) throw new Error('Banner upload failed: ' + up.error.message);
                bannerUrl = supabaseClient.storage.from('event-banners').getPublicUrl(path).data.publicUrl;
            }

            let embedImageUrl = null;
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

            const startISO = f.start_date ? new Date(f.start_date).toISOString() : null;
            const endISO = f.end_date ? new Date(f.end_date).toISOString() : null;
            const deadline = f.rsvp_deadline ? new Date(f.rsvp_deadline).toISOString() : null;
            const rsvpCents = f.pricing_mode === 'paid' ? Math.round(Number(f.rsvp_cost_dollars || 0) * 100) : 0;
            const raffleCents = f.raffle_enabled ? Math.round(Number(f.raffle_entry_cost_dollars || 0) * 100) : 0;
            const raffleWinnerCount = raffleConfig ? rb.raffleModel().getTotalWinnerCount(raffleConfig) : 0;

            const record = {
                created_by: userId,
                event_type: 'member',
                title: f.title.trim(),
                slug,
                category: f.category,
                description: f.description.trim() || null,
                banner_url: bannerUrl,
                embed_image_url: embedImageUrl,
                start_date: startISO,
                end_date: endISO,
                timezone: f.timezone,
                location_text: f.location_text.trim() || null,
                location_nickname: f.location_nickname.trim() || null,
                location_lat: STATE.geocode?.lat || null,
                location_lng: STATE.geocode?.lng || null,
                max_participants: f.max_participants ? Number(f.max_participants) : null,
                rsvp_deadline: deadline,
                member_only: !!f.member_only,
                pricing_mode: f.pricing_mode,
                rsvp_cost_cents: rsvpCents,
                raffle_enabled: !!f.raffle_enabled,
                raffle_entry_cost_cents: raffleCents,
                raffle_prizes: raffleConfig,
                raffle_winner_count: raffleWinnerCount,
                status,
            };

            const { data, error } = await supabaseClient.from('events').insert(record).select().single();
            if (error) throw error;

            if (typeof close === 'function') close();

            document.dispatchEvent(new CustomEvent('events:created', { detail: { event: data, status } }));

            if (status === 'open' && data.slug && typeof window.evtNavigateToEvent === 'function') {
                window.evtNavigateToEvent(data.slug);
            } else if (typeof window.evtLoadEvents === 'function') {
                window.evtLoadEvents();
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

    window.EventsCreateSubmit = { submit };
})();
