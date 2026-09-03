// Portal Events — Create sheet: pricing helpers (fund deadline / monthly estimate)

'use strict';

export function monthsUntilFundDeadline(deadlineStr) {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    if (Number.isNaN(deadline.getTime())) return null;
    const now = new Date();
    if (deadline <= now) return 0;
    let months = (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth());
    if (deadline.getDate() >= now.getDate()) months += 1;
    return Math.max(1, months);
}

export function monthlyEstimate(f) {
    if (!f.fund_deadline || !f.adult_price_dollars || Number(f.adult_price_dollars) <= 0) return null;
    const deadline = new Date(f.fund_deadline);
    if (Number.isNaN(deadline.getTime())) return { error: 'Enter a valid fund deadline.' };
    const now = new Date();
    if (deadline <= now) return { error: 'Fund deadline must be in the future for monthly estimates.' };
    const months = monthsUntilFundDeadline(f.fund_deadline);
    const monthly = (Number(f.adult_price_dollars) / months).toFixed(2);
    const deadlineLabel = deadline.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { months, monthly, deadlineLabel };
}

export function formatDateTimeLocal(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
    });
}

export function validateFundDeadline(f) {
    if (!f.fund_deadline || String(f.fund_deadline).trim() === '') return null;
    const deadline = new Date(f.fund_deadline);
    if (Number.isNaN(deadline.getTime())) return 'Fund deadline must be a valid date.';
    if (deadline <= new Date()) return 'Fund deadline must be in the future.';
    if (f.start_date) {
        const start = new Date(f.start_date);
        if (!Number.isNaN(start.getTime()) && deadline > start) {
            return 'Fund deadline must be on or before the event start date.';
        }
    }
    return null;
}

export function monthlyEstimateHtml(f, esc) {
    const est = monthlyEstimate(f);
    if (!est) return '';
    if (est.error) return `<p class="ec-help" style="color:#d97706">${esc(est.error)}</p>`;
    return `<p class="ec-help" id="ecMonthlyHelper">If someone starts paying monthly today, ~$${esc(est.monthly)}/month per adult until ${esc(est.deadlineLabel)}. Actual amounts recalculate at RSVP.</p>`;
}

export function toDatetimeLocalValue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function centsToDollars(cents) {
    if (cents == null || cents === '') return '';
    const n = Number(cents);
    if (!Number.isFinite(n)) return '';
    return (n / 100).toFixed(2);
}
