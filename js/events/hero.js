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
        if (pubCurrentRsvp?.paid || pubGuestRsvp?.paid) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp-done" disabled>${PUB_CTA_ICONS.check} RSVP'd</button>`;
        } else if (pubCurrentRsvp?.status === 'going' || pubGuestRsvp) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp-done" disabled>${PUB_CTA_ICONS.check} Going</button>`;
        } else if (pubCurrentRsvp?.status === 'maybe') {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp-done" disabled style="background:#e11d48">❤️ Interested</button>`;
        } else if (entriesClosed) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-disabled" disabled>${PUB_CTA_ICONS.lock} ${isClosed ? 'Closed' : 'RSVP Closed'}</button>`;
        } else if (pubCurrentUser && event.pricing_mode === 'paid' && event.rsvp_cost_cents > 0) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp" onclick="document.getElementById('rsvpSection').scrollIntoView({behavior:'smooth'})">RSVP — ${pubFormatCurrency(event.rsvp_cost_cents)}</button>`;
        } else if (pubCurrentUser) {
            rsvpBtn = `<button class="evt-cta-btn evt-cta-rsvp" onclick="pubHandleRsvp('going')">RSVP</button>`;
        } else {
            rsvpBtn = `<a href="/auth/login.html?redirect=${encodeURIComponent(window.location.href)}" class="evt-cta-btn evt-cta-rsvp">Sign In to RSVP</a>`;
        }
    }

    let raffleBtn = '';
    if (raffleEnabled) {
        if (entriesClosed) {
            raffleBtn = `<button class="evt-cta-btn evt-cta-disabled" disabled>${PUB_CTA_ICONS.lock} Closed</button>`;
        } else if (event.pricing_mode === 'paid') {
            // included with RSVP — no separate button
        } else {
            raffleBtn = `<button class="evt-cta-btn evt-cta-raffle" onclick="document.getElementById('raffleSection')?.scrollIntoView({behavior:'smooth'})">${PUB_CTA_ICONS.ticket} Raffle</button>`;
        }
    }

    if (!rsvpBtn && !raffleBtn) return;

    const bar = document.createElement('div');
    bar.id = 'evtCtaBar';
    bar.className = 'evt-cta-bar';
    bar.innerHTML = rsvpBtn + raffleBtn;
    document.body.appendChild(bar);
    document.body.style.paddingBottom = '80px';

    // Hide swipe-hint so it doesn't overlap the CTA bar
    const hint = document.querySelector('.bottom-tab-bar .swipe-hint, .pub-nav .swipe-hint');
    if (hint) hint.style.display = 'none';
}
