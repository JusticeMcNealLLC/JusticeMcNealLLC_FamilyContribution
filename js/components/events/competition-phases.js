/* ════════════════════════════════════════════════════════════
   Events — Competition phase helpers
   Surface: window.EventsCompetitionPhases
   ════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const PHASE_NAMES = {
        1: 'Registration',
        2: 'Submission',
        3: 'Voting',
        4: 'Results',
    };

    function normalizePhases(phases) {
        return Array.isArray(phases) ? phases : [];
    }

    function getPhase(phases, num) {
        return normalizePhases(phases).find((p) => Number(p.phase_num) === Number(num)) || null;
    }

    function isPhaseActiveStatus(status) {
        return status === 'active' || status === 'extended';
    }

    function isWithinWindow(phase, now) {
        if (!phase || !phase.starts_at || !phase.ends_at) return false;
        const t = now instanceof Date ? now : new Date(now);
        const start = new Date(phase.starts_at);
        const end = new Date(phase.ends_at);
        return t >= start && t < end;
    }

    function resolveDisplayPhase(phases, now) {
        const list = normalizePhases(phases);
        const t = now instanceof Date ? now : new Date(now);
        const active = list.find((p) => isPhaseActiveStatus(p.status));
        if (active) return Number(active.phase_num) || 0;
        for (const p of list) {
            if (isWithinWindow(p, t)) return Number(p.phase_num) || 0;
        }
        return 0;
    }

    function isRegistrationOpen(phases, now) {
        const phase1 = getPhase(phases, 1);
        if (!phase1) return false;
        if (phase1.status === 'completed') return false;
        const display = resolveDisplayPhase(phases, now);
        if (display > 1) return false;
        if (isPhaseActiveStatus(phase1.status)) {
            if (phase1.starts_at && phase1.ends_at) return isWithinWindow(phase1, now);
            return true;
        }
        if (display <= 1 && phase1.status === 'pending') return true;
        return false;
    }

    function isSubmissionOpen(phases, now) {
        const phase2 = getPhase(phases, 2);
        if (!phase2) return false;
        const t = now instanceof Date ? now : new Date(now);
        if (!isPhaseActiveStatus(phase2.status)) return false;
        return isWithinWindow(phase2, t);
    }

    function isVotingOpen(phases, now) {
        const phase3 = getPhase(phases, 3);
        if (!phase3) return false;
        const t = now instanceof Date ? now : new Date(now);
        if (!isPhaseActiveStatus(phase3.status)) return false;
        return isWithinWindow(phase3, t);
    }

    function isVotingClosed(phases, now) {
        const phase3 = getPhase(phases, 3);
        if (!phase3) return false;
        const t = now instanceof Date ? now : new Date(now);
        if (phase3.status === 'completed') return true;
        if (phase3.ends_at && t >= new Date(phase3.ends_at)) return true;
        return false;
    }

    function isVoterEligible(config, ctx) {
        const rule = (config && config.voter_eligibility) || 'all_members';
        const hasRsvp = !!(ctx && ctx.hasRsvp);
        const hasCompEntry = !!(ctx && ctx.hasCompEntry);
        if (rule === 'rsvped_only') return hasRsvp || hasCompEntry;
        if (rule === 'competitors_only') return hasCompEntry;
        return true;
    }

    function voterEligibilityMessage(config) {
        const rule = (config && config.voter_eligibility) || 'all_members';
        if (rule === 'rsvped_only') {
            return 'Only RSVPed members or registered competitors can vote in this competition.';
        }
        if (rule === 'competitors_only') {
            return 'Only registered competitors can vote in this competition.';
        }
        return '';
    }

    function formatPhaseDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    }

    function submissionWindowLabel(phase2, now) {
        if (!phase2 || !phase2.starts_at || !phase2.ends_at) {
            return { state: 'not_configured', message: 'Submission window not configured yet.' };
        }
        const t = now instanceof Date ? now : new Date(now);
        const start = new Date(phase2.starts_at);
        const end = new Date(phase2.ends_at);
        if (t < start) {
            return {
                state: 'upcoming',
                message: `Submissions open ${formatPhaseDate(phase2.starts_at)}.`,
            };
        }
        if (t >= end) {
            return {
                state: 'closed',
                message: `Submission window closed (${formatPhaseDate(phase2.ends_at)}).`,
            };
        }
        if (isPhaseActiveStatus(phase2.status)) {
            return {
                state: 'open',
                message: `Submissions open until ${formatPhaseDate(phase2.ends_at)}.`,
            };
        }
        return {
            state: 'scheduled',
            message: `Scheduled ${formatPhaseDate(phase2.starts_at)} → ${formatPhaseDate(phase2.ends_at)}. Start Phase 2 on the event page when ready.`,
        };
    }

    function votingWindowLabel(phase3, now) {
        if (!phase3 || !phase3.starts_at || !phase3.ends_at) {
            return { state: 'not_configured', message: 'Voting window not configured yet.' };
        }
        const t = now instanceof Date ? now : new Date(now);
        const start = new Date(phase3.starts_at);
        const end = new Date(phase3.ends_at);
        if (t < start) {
            return {
                state: 'upcoming',
                message: `Voting opens ${formatPhaseDate(phase3.starts_at)}.`,
            };
        }
        if (t >= end) {
            return {
                state: 'closed',
                message: `Voting window closed (${formatPhaseDate(phase3.ends_at)}).`,
            };
        }
        if (isPhaseActiveStatus(phase3.status)) {
            return {
                state: 'open',
                message: `Voting open until ${formatPhaseDate(phase3.ends_at)}.`,
            };
        }
        return {
            state: 'scheduled',
            message: `Scheduled ${formatPhaseDate(phase3.starts_at)} → ${formatPhaseDate(phase3.ends_at)}. Start Phase 3 on the event page when ready.`,
        };
    }

    function entryHasSubmission(entry) {
        if (!entry) return false;
        if (entry.file_url || entry.external_url) return true;
        if (entry.entry_type === 'text' && entry.title && entry.title !== 'Registered') return true;
        return !!(entry.title && entry.title !== 'Registered');
    }

    function isStoragePath(value) {
        return typeof value === 'string' && value.length > 0 && !/^https?:\/\//i.test(value);
    }

    async function resolveCompEntryFileUrl(pathOrUrl, expiresInSec) {
        if (!pathOrUrl) return null;
        if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
        const ttl = Number(expiresInSec) > 0 ? Number(expiresInSec) : 3600;
        const { data, error } = await supabaseClient.storage
            .from('competition-entries')
            .createSignedUrl(pathOrUrl, ttl);
        if (error) {
            console.warn('resolveCompEntryFileUrl:', error.message);
            return null;
        }
        return data?.signedUrl || null;
    }

    const EventsCompetitionPhases = {
        PHASE_NAMES,
        normalizePhases,
        getPhase,
        resolveDisplayPhase,
        isRegistrationOpen,
        isSubmissionOpen,
        isVotingOpen,
        isVotingClosed,
        isWithinWindow,
        isPhaseActiveStatus,
        submissionWindowLabel,
        votingWindowLabel,
        isVoterEligible,
        voterEligibilityMessage,
        formatPhaseDate,
        entryHasSubmission,
        isStoragePath,
        resolveCompEntryFileUrl,
    };

    globalThis.EventsCompetitionPhases = EventsCompetitionPhases;
})();
