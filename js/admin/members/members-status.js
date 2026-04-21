// js/admin/members/members-status.js
// Centralized member status + attention flag derivation.
// Spec: members_001.md §4 (status rules) and §8 (attention flags).
// Phase 1: authMeta is null (no last_active view yet) — invited_unconfirmed,
// never_signed_in, inactive_30/90 are stubbed and fall back gracefully.

(function (global) {
    'use strict';

    // ── Canonical status keys ────────────────────────────────────────────
    const MEMBER_STATUS = Object.freeze({
        ACTIVE:                'active',
        PAST_DUE:              'past_due',
        AWAITING_SUBSCRIPTION: 'awaiting_subscription',
        PENDING:               'pending',
        INVITED_UNCONFIRMED:   'invited_unconfirmed',
        DEACTIVATED:           'deactivated',
    });

    // Display config per status — single source of truth for color/label.
    const STATUS_CONFIG = Object.freeze({
        active: {
            label:    'Active',
            badgeBg:  'bg-emerald-100',
            badgeText:'text-emerald-700',
            accent:   'border-emerald-400',
            dot:      'bg-emerald-500',
        },
        past_due: {
            label:    'Past Due',
            badgeBg:  'bg-red-100',
            badgeText:'text-red-700',
            accent:   'border-red-400',
            dot:      'bg-red-500',
        },
        awaiting_subscription: {
            label:    'Awaiting Sub',
            badgeBg:  'bg-blue-100',
            badgeText:'text-blue-700',
            accent:   'border-blue-300',
            dot:      'bg-blue-500',
        },
        pending: {
            label:    'Pending',
            badgeBg:  'bg-amber-100',
            badgeText:'text-amber-700',
            accent:   'border-amber-400',
            dot:      'bg-amber-500',
        },
        invited_unconfirmed: {
            label:    'Invite Sent',
            badgeBg:  'bg-violet-100',
            badgeText:'text-violet-700',
            accent:   'border-violet-300',
            dot:      'bg-violet-500',
        },
        deactivated: {
            label:    'Deactivated',
            badgeBg:  'bg-gray-100',
            badgeText:'text-gray-500',
            accent:   '',
            dot:      'bg-gray-400',
        },
    });

    // ── Status derivation ────────────────────────────────────────────────
    // profile:      row from `profiles`
    // subscription: matching row from `subscriptions` (or null)
    // authMeta:     { last_sign_in_at, confirmed_at } from user_last_active view (Phase 2)
    //               — Phase 1: pass null. Function falls back gracefully.
    function deriveMemberStatus(profile, subscription, authMeta) {
        if (!profile) return MEMBER_STATUS.DEACTIVATED;
        if (profile.is_active === false) return MEMBER_STATUS.DEACTIVATED;

        // Admins always render as Active for display purposes.
        if (profile.role === 'admin') return MEMBER_STATUS.ACTIVE;

        const subStatus = subscription && subscription.status;

        if (subStatus === 'active' || subStatus === 'trialing') return MEMBER_STATUS.ACTIVE;
        if (subStatus === 'past_due') return MEMBER_STATUS.PAST_DUE;

        if (!profile.setup_completed) {
            // Phase 2: distinguish unconfirmed invites from confirmed-but-incomplete.
            if (authMeta && !authMeta.confirmed_at) return MEMBER_STATUS.INVITED_UNCONFIRMED;
            return MEMBER_STATUS.PENDING;
        }

        return MEMBER_STATUS.AWAITING_SUBSCRIPTION;
    }

    // ── Attention flags ──────────────────────────────────────────────────
    const ATTENTION_FLAGS = Object.freeze({
        PAST_DUE:            'past_due',
        INVITE_EXPIRED:      'invite_expired',     // Phase 2
        ONBOARDING_STALLED:  'onboarding_stalled',
        NEVER_SIGNED_IN:     'never_signed_in',    // Phase 2
        INACTIVE_30:         'inactive_30',        // Phase 2
        INACTIVE_90:         'inactive_90',        // Phase 2
        NO_SUBSCRIPTION:     'no_subscription',
        PAYOUT_INCOMPLETE:   'payout_incomplete',
    });

    // High/medium severity flags drive the "Needs Attention" stat tile.
    const HIGH_MED_FLAGS = new Set([
        ATTENTION_FLAGS.PAST_DUE,
        ATTENTION_FLAGS.INVITE_EXPIRED,
        ATTENTION_FLAGS.ONBOARDING_STALLED,
        ATTENTION_FLAGS.INACTIVE_90,
    ]);

    const FLAG_SEVERITY = Object.freeze({
        past_due:           'high',
        invite_expired:     'medium',
        onboarding_stalled: 'medium',
        inactive_90:        'medium',
        never_signed_in:    'low',
        inactive_30:        'low',
        no_subscription:    'low',
        payout_incomplete:  'low',
    });

    const FLAG_LABELS = Object.freeze({
        past_due:           'Past due payment',
        invite_expired:     'Invite link expired',
        onboarding_stalled: 'Onboarding stalled',
        never_signed_in:    'Never signed in',
        inactive_30:        'Inactive 30+ days',
        inactive_90:        'Inactive 90+ days',
        no_subscription:    'No active subscription',
        payout_incomplete:  'Payout setup incomplete',
    });

    function getFlagLabel(flag) {
        return FLAG_LABELS[flag] || flag;
    }

    // Derive attention flags for one enriched member.
    // ctx: { now: Date, payoutsEnabled: boolean }
    function deriveAttentionFlags(profile, subscription, authMeta, ctx) {
        const flags = [];
        if (!profile || profile.is_active === false) return flags;
        if (profile.role === 'admin') return flags;

        const subStatus = subscription && subscription.status;
        const now = (ctx && ctx.now) || new Date();
        const payoutsEnabled = !!(ctx && ctx.payoutsEnabled);

        // past_due
        if (subStatus === 'past_due') flags.push(ATTENTION_FLAGS.PAST_DUE);

        // onboarding_stalled — confirmed account but not setup, > 14 days old
        if (!profile.setup_completed) {
            const created = profile.created_at ? new Date(profile.created_at) : null;
            const ageDays = created ? (now - created) / 86400000 : 0;
            const confirmed = !authMeta || authMeta.confirmed_at; // Phase 1: assume confirmed
            if (confirmed && ageDays > 14) {
                flags.push(ATTENTION_FLAGS.ONBOARDING_STALLED);
            }
        }

        // no_subscription — onboarded but no active/trialing/past_due sub
        if (profile.setup_completed) {
            const hasLiveSub = subStatus === 'active' || subStatus === 'trialing' || subStatus === 'past_due';
            if (!hasLiveSub) flags.push(ATTENTION_FLAGS.NO_SUBSCRIPTION);
        }

        // payout_incomplete — only when payouts globally enabled
        if (payoutsEnabled && profile.payout_enrolled === false) {
            flags.push(ATTENTION_FLAGS.PAYOUT_INCOMPLETE);
        }

        // ── Phase 2 (require authMeta) ────────────────────────────────
        if (authMeta) {
            if (!profile.setup_completed && !authMeta.confirmed_at && authMeta.invited_at) {
                const invited = new Date(authMeta.invited_at);
                if ((now - invited) / 86400000 > 7) {
                    flags.push(ATTENTION_FLAGS.INVITE_EXPIRED);
                }
            }
            if (authMeta.confirmed_at && !authMeta.last_sign_in_at) {
                flags.push(ATTENTION_FLAGS.NEVER_SIGNED_IN);
            }
            if (authMeta.last_sign_in_at) {
                const last = new Date(authMeta.last_sign_in_at);
                const days = (now - last) / 86400000;
                if (days > 90)      flags.push(ATTENTION_FLAGS.INACTIVE_90);
                else if (days > 30) flags.push(ATTENTION_FLAGS.INACTIVE_30);
            }
        }

        return flags;
    }

    // ── Public API ───────────────────────────────────────────────────────
    global.MembersStatus = {
        MEMBER_STATUS,
        STATUS_CONFIG,
        ATTENTION_FLAGS,
        HIGH_MED_FLAGS,
        FLAG_SEVERITY,
        deriveMemberStatus,
        deriveAttentionFlags,
        getFlagLabel,
    };
})(window);
