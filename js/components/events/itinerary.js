/*
 * Events — structured itinerary model + visual calendar renderer.
 * Surface: window.EventsItinerary
 */
(function () {
    'use strict';

    const DAY_TITLE_MAX = 120;
    const ACTIVITY_TITLE_MAX = 120;
    const ACTIVITY_DETAILS_MAX = 1000;
    const MAX_DAYS = 62;

    function escapeHtml(value) {
        if (window.EventsHelpers && typeof window.EventsHelpers.escapeHtml === 'function') {
            return window.EventsHelpers.escapeHtml(value);
        }
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function clean(value, max) {
        return String(value == null ? '' : value).trim().slice(0, max);
    }

    function makeId(prefix, index) {
        return `${prefix}-${Date.now().toString(36)}-${index + 1}`;
    }

    function dateKeyFromValue(raw, timezone) {
        if (!raw) return null;
        const value = String(raw);
        const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
        if (!hasOffset) {
            const localMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
            return localMatch ? localMatch[1] : null;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        try {
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone || 'UTC',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).formatToParts(date);
            const fields = Object.fromEntries(parts.map((part) => [part.type, part.value]));
            return `${fields.year}-${fields.month}-${fields.day}`;
        } catch (_) {
            return date.toISOString().slice(0, 10);
        }
    }

    function dateKeysForRange(startRaw, endRaw, timezone) {
        const startKey = dateKeyFromValue(startRaw, timezone);
        if (!startKey) return [];
        const endKey = dateKeyFromValue(endRaw || startRaw, timezone) || startKey;
        const start = new Date(`${startKey}T00:00:00Z`);
        const end = new Date(`${endKey}T00:00:00Z`);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [startKey];

        const keys = [];
        for (let cursor = start; cursor <= end && keys.length < MAX_DAYS; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
            keys.push(cursor.toISOString().slice(0, 10));
        }
        return keys;
    }

    function normalizeActivity(raw, index) {
        if (!raw || typeof raw !== 'object') return null;
        const title = clean(raw.title, ACTIVITY_TITLE_MAX);
        const details = clean(raw.details, ACTIVITY_DETAILS_MAX);
        return {
            id: clean(raw.id, 100) || makeId('activity', index),
            title,
            details,
        };
    }

    function normalizeDay(raw, index) {
        if (!raw || typeof raw !== 'object') return null;
        const date = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || '')) ? String(raw.date) : '';
        if (!date) return null;
        const activities = Array.isArray(raw.activities)
            ? raw.activities.map(normalizeActivity).filter(Boolean)
            : [];
        return {
            id: clean(raw.id, 100) || makeId('day', index),
            date,
            title: clean(raw.title, DAY_TITLE_MAX),
            activities,
        };
    }

    function normalizeConfig(raw) {
        const source = Array.isArray(raw) ? { enabled: true, days: raw } : (raw || {});
        const days = Array.isArray(source.days)
            ? source.days.map(normalizeDay).filter(Boolean)
            : [];
        days.sort((a, b) => a.date.localeCompare(b.date));
        return {
            enabled: source.enabled === true,
            days,
        };
    }

    function syncDaysToRange(rawConfig, startRaw, endRaw, timezone) {
        const config = normalizeConfig(rawConfig);
        const keys = dateKeysForRange(startRaw, endRaw, timezone);
        if (!keys.length) return config;
        const byDate = new Map(config.days.map((day) => [day.date, day]));
        return {
            ...config,
            days: keys.map((date) => byDate.get(date) || {
                id: makeId('day', keys.indexOf(date)),
                date,
                title: '',
                activities: [],
            }),
        };
    }

    function dateLabel(dateKey, options = {}) {
        const date = new Date(`${dateKey}T00:00:00Z`);
        if (Number.isNaN(date.getTime())) return dateKey;
        return date.toLocaleDateString('en-US', {
            timeZone: 'UTC',
            weekday: options.weekday === false ? undefined : 'short',
            month: options.month || 'short',
            day: 'numeric',
            year: options.year ? 'numeric' : undefined,
        });
    }

    function monthLabel(monthKey) {
        const date = new Date(`${monthKey}-01T00:00:00Z`);
        return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
    }

    function activityHtml(activity) {
        const details = activity.details
            ? `<p class="evt-itinerary-activity-details">${escapeHtml(activity.details).replace(/\n/g, '<br>')}</p>`
            : '';
        return `<li class="evt-itinerary-activity"><span class="evt-itinerary-activity-title">${escapeHtml(activity.title || 'Activity')}</span>${details}</li>`;
    }

    function dayCellHtml(day, index) {
        const visibleActivities = day.activities.filter((activity) => activity.title || activity.details);
        const activities = visibleActivities.length
            ? `<ul class="evt-itinerary-activities">${visibleActivities.map(activityHtml).join('')}</ul>`
            : '<p class="evt-itinerary-empty">No activities planned yet.</p>';
        const dayLabel = dateLabel(day.date, { weekday: true });
        return `
            <div class="evt-itinerary-day-cell" data-itinerary-date="${escapeHtml(day.date)}">
                <div class="evt-itinerary-day-head"><span class="evt-itinerary-day-number">Day ${index + 1}</span><time datetime="${escapeHtml(day.date)}">${escapeHtml(dayLabel)}</time></div>
                ${day.title ? `<h4 class="evt-itinerary-day-title">${escapeHtml(day.title)}</h4>` : ''}
                ${activities}
            </div>`;
    }

    function calendarHtml(rawConfig, event) {
        const config = normalizeConfig(rawConfig);
        if (!config.enabled || !event) return '';
        const keys = dateKeysForRange(event.start_date, event.end_date, event.timezone);
        if (!keys.length) return '';
        const byDate = new Map(config.days.map((day) => [day.date, day]));
        const days = keys.map((date, index) => byDate.get(date) || {
            id: `auto-${date}`,
            date,
            title: '',
            activities: [],
            index,
        });
        const months = [];
        days.forEach((day, index) => {
            const month = day.date.slice(0, 7);
            let group = months.find((entry) => entry.month === month);
            if (!group) {
                group = { month, days: [], firstIndex: index };
                months.push(group);
            }
            group.days.push({ ...day, index });
        });

        const monthHtml = months.map((group) => {
            const firstEventDate = group.days[0]?.date || `${group.month}-01`;
            const first = new Date(`${firstEventDate}T00:00:00Z`);
            const blanks = Number.isNaN(first.getTime()) ? 0 : first.getUTCDay();
            const cells = [
                ...Array.from({ length: blanks }, () => '<div class="evt-itinerary-day-spacer" aria-hidden="true"></div>'),
                ...group.days.map((day) => dayCellHtml(day, day.index)),
            ].join('');
            return `
                <section class="evt-itinerary-month" aria-labelledby="evt-itinerary-month-${escapeHtml(group.month)}">
                    <h3 id="evt-itinerary-month-${escapeHtml(group.month)}" class="evt-itinerary-month-title">${escapeHtml(monthLabel(group.month))}</h3>
                    <div class="evt-itinerary-weekdays" aria-hidden="true">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => `<span>${day}</span>`).join('')}</div>
                    <div class="evt-itinerary-grid">${cells}</div>
                </section>`;
        }).join('');

        return `<section class="evt-itinerary-calendar" data-itinerary-calendar aria-label="Event itinerary calendar">
            <div class="evt-itinerary-calendar-heading"><div><p class="evt-itinerary-kicker">Trip itinerary</p><h3>What’s happening each day</h3></div><span class="evt-itinerary-duration">${days.length} day${days.length === 1 ? '' : 's'}</span></div>
            ${monthHtml}
        </section>`;
    }

    globalThis.EventsItinerary = {
        DAY_TITLE_MAX,
        ACTIVITY_TITLE_MAX,
        ACTIVITY_DETAILS_MAX,
        normalizeConfig,
        dateKeyFromValue,
        dateKeysForRange,
        syncDaysToRange,
        dateLabel,
        calendarHtml,
    };
})();
