/* ──────────────────────────────────────────
   Public Event — Hero, countdown, sticky CTA bar
   ────────────────────────────────────────── */

function pubStartLiveCountdown(startDate, badgeEl) {
    let tick;
    const update = () => {
        const ms = new Date(startDate) - new Date();
        if (ms <= 0) {
            badgeEl.innerHTML = `<span class="evt-status-badge evt-status-live"><span class="evt-status-dot pulse"></span>Live</span>`;
            clearInterval(tick);
            return;
        }
        const d = Math.floor(ms / 86400000);
        const h = Math.floor((ms % 86400000) / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        let lbl;
        if (d > 0) lbl = `${d}d ${h}h`;
        else if (h > 0) lbl = `${h}h ${m}m`;
        else lbl = `${m}m ${s}s`;
        const badge = badgeEl.querySelector('.evt-status-badge');
        if (badge) badge.innerHTML = `<span class="evt-status-dot${d === 0 ? ' pulse' : ''}"></span>${lbl}`;
    };
    // Tick every second when < 1 hour, otherwise every 60s; re-check threshold
    const startTick = () => {
        const ms = new Date(startDate) - new Date();
        const interval = ms <= 3600000 ? 1000 : 60000;
        tick = setInterval(() => {
            update();
            const remaining = new Date(startDate) - new Date();
            if (remaining <= 3600000 && interval === 60000) {
                clearInterval(tick);
                startTick();
            }
        }, interval);
    };
    startTick();
}

/* ── Bootstrap ───────────────────────────── */

function pubInitHeroCollapse() {
    pubCleanupHeroCollapse();
    const scrollContainer = document.getElementById('eventContent');
    const hero = document.getElementById('eventBanner');
    if (!scrollContainer || !hero) return;
    if (hero.classList.contains('ed-hero')) return;

    // Mobile only
    if (window.innerWidth >= 768) return;

    const bodyHeader = scrollContainer.querySelector('.evt-body-header');
    const heroContent = hero.querySelector('.evt-hero-content');
    const heroActions = hero.querySelector('.evt-hero-actions');
    const spacer = scrollContainer.querySelector('.evt-hero-spacer');
    const heroInitH = hero.offsetHeight;
    const heroMinH = 120;
    hero.style.minHeight = heroMinH + 'px';

    function onScroll() {
        const scrollTop = scrollContainer.scrollTop;
        const newH = Math.max(heroMinH, heroInitH - scrollTop);
        const shrink = heroInitH - newH;
        const progress = Math.min(1, shrink / (heroInitH - heroMinH));

        hero.style.height = newH + 'px';
        if (spacer) spacer.style.height = shrink + 'px';

        if (heroContent) heroContent.style.opacity = Math.max(0, 1 - progress * 1.4);
        if (heroActions) heroActions.style.opacity = Math.max(0, 1 - progress * 1.8);

        // Shadow on stuck body-header
        if (bodyHeader) bodyHeader.classList.toggle('stuck', progress > 0.85);
    }

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    window._pubHeroCollapseCleanup = () => {
        scrollContainer.removeEventListener('scroll', onScroll);
        hero.style.height = '';
        hero.style.minHeight = '';
        if (spacer) spacer.style.height = '';
        if (heroContent) heroContent.style.opacity = '';
        if (heroActions) heroActions.style.opacity = '';
        if (bodyHeader) bodyHeader.classList.remove('stuck');
    };
}


function pubCleanupHeroCollapse() {
    if (window._pubHeroCollapseCleanup) {
        window._pubHeroCollapseCleanup();
        window._pubHeroCollapseCleanup = null;
    }
}

// ═══════════════════════════════════════════════════════════

// Sticky CTA Bar (mobile — public event page)
// ═══════════════════════════════════════════════════════════
const PUB_CTA_ICONS = {
    check: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>',
};

function pubPublicCtaLabel(text) {
    return `<span>${text}</span>`;
}

/** Sticky bar: disabled raffle button (hint renders below the action row) */
function pubRaffleLockedCtaBtnHtml() {
    return `<button type="button" class="evt-cta-btn evt-cta-raffle-locked" disabled aria-disabled="true">${PUB_CTA_ICONS.ticket} ${pubPublicCtaLabel('Enter Raffle')}</button>`;
}


function pubInitBottomNav(event) {
    const prev = document.getElementById('evtCtaBar');
    if (prev) prev.remove();

    const rsvpEnabled = event.rsvp_enabled !== false;
    const raffleEnabled = !!event.raffle_enabled;
    if (!rsvpEnabled && !raffleEnabled) return;

    const isClosed = event.status === 'completed' || event.status === 'cancelled';
    const isPast = new Date(event.start_date) < new Date() && event.status !== 'active';
    const deadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();
    const entriesClosed = isClosed || isPast || deadlinePassed;

    let rsvpBtn = '';
    if (rsvpEnabled) {
        if (pubGuestRsvp) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp-done" onclick="pubOpenCtaPanel('ticket')">${PUB_CTA_ICONS.ticket} ${pubPublicCtaLabel('Going · View Ticket')}</button>`;
        } else if (pubCurrentRsvp?.paid) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp-done" onclick="pubOpenCtaPanel('ticket')">${PUB_CTA_ICONS.ticket} ${pubPublicCtaLabel('RSVP\'d · View Ticket')}</button>`;
        } else if (pubCurrentRsvp?.status === 'going') {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp-done" onclick="pubOpenCtaPanel('ticket')">${PUB_CTA_ICONS.ticket} ${pubPublicCtaLabel('Going · View Ticket')}</button>`;
        } else if (pubCurrentRsvp?.status === 'not_going') {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-disabled" disabled>Not going</button>`;
        } else if (entriesClosed) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-disabled" disabled>${PUB_CTA_ICONS.lock} ${isClosed ? 'Closed' : 'RSVP Closed'}</button>`;
        } else if (pubCurrentUser && event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp" onclick="pubHandlePaidRsvp()">RSVP — ${pubFormatCurrency(event.rsvp_cost_cents)}</button>`;
        } else if (pubCurrentUser) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp" onclick="pubHandleRsvp('going')">RSVP</button>`;
        } else if (event.member_only) {
            rsvpBtn = `<a href="${typeof pubPortalLoginHref === 'function' ? pubPortalLoginHref(event.slug) : '/auth/login.html'}" class="evt-cta-btn evt-cta-rsvp">Sign In to RSVP</a>`;
        } else if (event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp" onclick="pubOpenCtaPanel('rsvp')">RSVP — ${pubFormatCurrency(event.rsvp_cost_cents)}</button>`;
        } else {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp" onclick="pubOpenCtaPanel('rsvp')">RSVP</button>`;
        }
    }

    let raffleBtn = '';
    let ctaFootnote = '';
    if (raffleEnabled) {
        if (entriesClosed) {
            raffleBtn = `<button class="evt-cta-btn evt-cta-disabled" disabled>${PUB_CTA_ICONS.lock} Closed</button>`;
        } else if (event.pricing_mode === 'paid') {
            // included with RSVP — no separate button
        } else if (pubGuestRaffleEntry) {
            raffleBtn = `<button class="evt-cta-btn evt-cta-raffle-done" disabled>${PUB_CTA_ICONS.check} Entered</button>`;
        } else {
            const hasRsvp = pubCurrentUser ? (pubCurrentRsvp?.status === 'going' || !!pubCurrentRsvp?.paid) : !!pubGuestRsvp;
            if (!hasRsvp) {
                raffleBtn = pubRaffleLockedCtaBtnHtml();
                ctaFootnote = '<p class="evt-cta-footnote">RSVP first to enter the raffle</p>';
            } else {
                const label = event.raffle_entry_cost_cents > 0
                    ? `Raffle — ${pubFormatCurrency(event.raffle_entry_cost_cents)}`
                    : 'Enter Raffle';
                raffleBtn = `<button class="evt-cta-btn evt-cta-raffle" onclick="pubOpenCtaPanel('raffle')">${PUB_CTA_ICONS.ticket} ${pubPublicCtaLabel(label)}</button>`;
            }
        }
    }

    if (!rsvpBtn && !raffleBtn) return;

    const bar = document.createElement('div');
    bar.id = 'evtCtaBar';
    bar.className = 'evt-cta-bar' + (ctaFootnote ? ' evt-cta-bar-has-footnote' : '');
    bar.innerHTML = `<div id="evtCtaPanel" class="evt-cta-panel hidden"></div><div class="evt-cta-actions">${rsvpBtn + raffleBtn}</div>${ctaFootnote}`;
    document.body.appendChild(bar);
    document.body.style.paddingBottom = ctaFootnote ? '92px' : '80px';

    // Hide swipe-hint so it doesn't overlap the CTA bar
    const hint = document.querySelector('.bottom-tab-bar .swipe-hint, .pub-nav .swipe-hint');
    if (hint) hint.style.display = 'none';
}
