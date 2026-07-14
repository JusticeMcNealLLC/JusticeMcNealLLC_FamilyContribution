/** Parse billing dates from ISO strings, Date objects, or Unix timestamps. */
export function parseBillingDate(value) {
    if (value == null || value === '') return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'number') {
        const date = new Date(value < 1e12 ? value * 1000 : value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
        const n = Number(value);
        const date = new Date(n < 1e12 ? n * 1000 : n);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBillingDate(value) {
    const date = parseBillingDate(value);
    if (!date) return null;
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function daysUntilBillingDate(value) {
    const date = parseBillingDate(value);
    if (!date) return null;

    const target = new Date(date);
    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return Math.ceil((target - today) / (24 * 60 * 60 * 1000));
}
