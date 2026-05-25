// Portal Events — Team ticket/raffle sub-views inside sheet

'use strict';

function memberGoing(rsvp) {
    return typeof globalThis.evtIsGoingRsvp === 'function'
        ? window.evtIsGoingRsvp(rsvp)
        : !!(rsvp && (rsvp.status === 'going' || rsvp.paid === true));
}

function backBtnHtml(variant) {
    if (variant !== 'sheet') return '';
    return `<button type="button" class="em-btn-ghost et-tools-back" onclick="window.EventsTeam.backToToolsList()">‹ Back to Tools</button>`;
}

function ticketHtml(event, rsvp, opts = {}) {
    const { variant = 'sheet', canvasId = 'evtTeamTicketQR' } = opts;
    const going = memberGoing(rsvp);
    const hasQr = going && rsvp?.qr_token && event.checkin_mode === 'attendee_ticket';
    const title = evtEscapeHtml(event.title || 'Event');
    const qrBlock = hasQr
        ? `<canvas id="${canvasId}"></canvas><p class="text-xs text-gray-500 mt-2">Show this QR code at check-in</p>`
        : `<div class="ed-notice"><span class="ed-notice-emoji">✅</span><div><p class="ed-notice-title">You are on the RSVP list</p><p class="ed-notice-sub">No QR ticket is required for this event.</p></div></div>`;
    return `
        ${backBtnHtml(variant)}
        <div class="em-section-head">
            <div>
                <p class="em-section-title">You're going</p>
                <p class="em-section-sub">${title}</p>
            </div>
        </div>
        <div class="em-card text-center [&_canvas]:mx-auto [&_canvas]:block [&_canvas]:rounded-xl">${qrBlock}</div>`;
}

function raffleHtml(event, eventId, rsvp, opts = {}) {
    const { variant = 'sheet' } = opts;
    const back = backBtnHtml(variant);
    const going = memberGoing(rsvp);
    const raffleBundled = typeof globalThis.evtIsRaffleBundledWithPaidRsvp === 'function'
        ? window.evtIsRaffleBundledWithPaidRsvp(event)
        : (event.pricing_mode === 'paid' && event.rsvp_enabled !== false);

    if (raffleBundled) {
        return `
            ${back}
            <div class="em-section-head">
                <div>
                    <p class="em-section-title">Raffle included</p>
                    <p class="em-section-sub">Raffle entry is included when you complete your paid RSVP for this event.</p>
                </div>
            </div>`;
    }

    if (!going) {
        return `
            ${back}
            <div class="em-section-head">
                <div>
                    <p class="em-section-title">RSVP first</p>
                    <p class="em-section-sub">Once you are going, this same member RSVP will be used for the raffle entry.</p>
                </div>
            </div>
            <button type="button" class="em-btn-primary" onclick="globalThis.evtCtaRaffleIntent='${eventId}';evtHandleRsvp('${eventId}','going')">RSVP to Enter Raffle</button>`;
    }

    const cost = event.raffle_entry_cost_cents || 0;
    const sub = cost > 0
        ? 'Confirm to start checkout. Raffle tickets are non-refundable.'
        : 'One tap and you are in the draw.';
    const action = cost > 0 ? `evtHandleRaffleEntry('${eventId}')` : `evtHandleFreeRaffleEntry('${eventId}')`;
    const label = cost > 0 ? `Buy Raffle Entry — ${formatCurrency(cost)}` : 'Enter Raffle — Free';

    return `
        ${back}
        <div class="em-section-head">
            <div>
                <p class="em-section-title">Enter the raffle</p>
                <p class="em-section-sub">${sub}</p>
            </div>
        </div>
        <button type="button" class="em-btn-primary" onclick="${action}">${label}</button>`;
}

async function wireTicketQr(event, rsvp, opts = {}) {
    const { canvasId = 'evtTeamTicketQR' } = opts;
    const going = memberGoing(rsvp);
    const hasQr = going && rsvp?.qr_token && event.checkin_mode === 'attendee_ticket';
    if (!hasQr) return;
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const qrUrl = `${window.location.origin}/events/?e=${event.slug}&ticket=${rsvp.qr_token}`;
    try {
        const QRCode = typeof globalThis.evtEnsureQRCode === 'function'
            ? await window.evtEnsureQRCode()
            : window.QRCode;
        if (QRCode && canvas.isConnected) {
            QRCode.toCanvas(canvas, qrUrl, { width: 172, margin: 2 });
        }
    } catch (err) {
        console.warn('Team ticket QR failed:', err);
    }
}

export const teamPanelsApi = { ticketHtml, raffleHtml, wireTicketQr };

globalThis.EventsTeamPanels = teamPanelsApi;
