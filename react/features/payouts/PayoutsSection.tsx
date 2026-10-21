import { useEffect, useState } from 'react';
import { PrimaryButton, SecondaryButton, Switch } from '../../components/brand';
import { Notice, SettingsRow, SettingsSection, SubHeading } from '../../components/settings';
import { redirectToStripe } from '../billing/api';
import {
    fetchBankStatus, fetchEnrollments, fetchRecentPayouts, saveEnrollment,
    PAYOUT_EMOJI, PAYOUT_TYPES, type BankStatus, type Payout,
} from './api';

const STATUS_LABEL: Record<BankStatus, { text: string; className: string }> = {
    disabled: { text: 'Payouts are not available right now', className: 'text-jm-muted font-normal' },
    not_linked: { text: 'Not linked', className: 'text-amber-800' },
    incomplete: { text: 'Setup incomplete', className: 'text-amber-800' },
    connected: { text: 'Connected', className: 'text-jm-accent' },
};

const PAYOUT_STATUS: Record<string, { label: string; dot: string }> = {
    completed: { label: 'Paid', dot: 'bg-jm-accent' },
    processing: { label: 'Processing', dot: 'bg-jm-primary' },
    queued: { label: 'Queued', dot: 'bg-amber-500' },
    pending: { label: 'Pending', dot: 'bg-jm-border' },
    failed: { label: 'Failed', dot: 'bg-red-600' },
};

export function PayoutsSection() {
    const [userId, setUserId] = useState<string | null>(null);
    const [status, setStatus] = useState<BankStatus | 'error' | undefined>(undefined);
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [opening, setOpening] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const { data } = await supabaseClient.auth.getSession();
            const id = data.session?.user.id;
            if (!id) return;
            setUserId(id);
            const bank = await fetchBankStatus(id);
            setStatus(bank);
            if (bank !== 'disabled') setPayouts(await fetchRecentPayouts(id));
        })().catch((err) => {
            console.error('Error loading payout settings:', err);
            setStatus('error');
        });
    }, []);

    async function openOnboarding() {
        setOpening(true);
        setLinkError(null);
        try {
            await redirectToStripe('create-connect-onboarding');
        } catch (err) {
            console.error('Error starting bank setup:', err);
            setLinkError((err as Error).message || 'Failed to start bank setup. Please try again.');
            setOpening(false);
        }
    }

    const label = status === undefined ? { text: 'Checking…', className: 'text-jm-muted font-normal' }
        : status === 'error' ? { text: 'Could not load', className: 'text-red-700' }
        : STATUS_LABEL[status];

    const action =
        status === 'not_linked' || status === 'incomplete' ? (
            <PrimaryButton onClick={openOnboarding} disabled={opening}>
                {opening ? 'Opening…' : status === 'not_linked' ? 'Link Bank' : 'Finish Setup'}
            </PrimaryButton>
        ) : status === 'connected' ? (
            <SecondaryButton onClick={openOnboarding} disabled={opening}>{opening ? 'Opening…' : 'Update'}</SecondaryButton>
        ) : null;

    return (
        <SettingsSection title="Payouts & Bank Account" delayMs={180}>
            <SettingsRow label="Bank Account" value={<span className={label.className}>{label.text}</span>} action={action}>
                {status === 'not_linked' && (
                    <p className="mt-1 text-sm text-jm-muted">Link a bank to receive birthday gifts, prizes, and profit shares.</p>
                )}
                {linkError && <Notice tone="error">{linkError}</Notice>}
            </SettingsRow>

            {status === 'connected' && userId && <EnrollmentList userId={userId} />}

            {status !== undefined && status !== 'disabled' && status !== 'error' && (
                <div className="px-5 py-4">
                    <SubHeading>Recent Payouts</SubHeading>
                    {payouts.length === 0
                        ? <p className="text-sm text-jm-muted">No payouts received yet.</p>
                        : <ul className="divide-y divide-jm-border">{payouts.map((p, i) => <PayoutItem key={i} payout={p} />)}</ul>}
                </div>
            )}
        </SettingsSection>
    );
}

function EnrollmentList({ userId }: { userId: string }) {
    const [enrolled, setEnrolled] = useState<Record<string, boolean> | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchEnrollments(userId).then(setEnrolled).catch((err) => {
            console.error('Error loading enrollments:', err);
            setError('Could not load your payout choices.');
        });
    }, [userId]);

    async function toggle(key: string, next: boolean) {
        setError(null);
        setEnrolled((m) => ({ ...m, [key]: next }));
        try {
            await saveEnrollment(userId, key, next);
        } catch (err) {
            console.error('Error updating enrollment:', err);
            setEnrolled((m) => ({ ...m, [key]: !next }));
            setError('Could not save that change. Please try again.');
        }
    }

    return (
        <div className="px-5 py-4">
            <SubHeading>Send me payouts for</SubHeading>
            {enrolled && (
                <ul>
                    {PAYOUT_TYPES.map((t) => (
                        <li key={t.key} className="flex items-center justify-between gap-3 py-1">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="text-lg" aria-hidden="true">{t.emoji}</span>
                                <div className="min-w-0">
                                    <div className="text-[15px] font-bold">{t.label}</div>
                                    <div className="text-xs text-jm-muted">{t.desc}</div>
                                </div>
                            </div>
                            <Switch label={t.label} checked={enrolled[t.key] !== false} onChange={(next) => toggle(t.key, next)} />
                        </li>
                    ))}
                </ul>
            )}
            <div role="status" aria-live="polite">{error && <Notice tone="error">{error}</Notice>}</div>
        </div>
    );
}

function PayoutItem({ payout: p }: { payout: Payout }) {
    const st = PAYOUT_STATUS[p.status] || { label: p.status, dot: 'bg-jm-border' };
    return (
        <li className="flex items-center gap-3 py-2.5">
            <span className="text-lg" aria-hidden="true">{PAYOUT_EMOJI[p.payout_type] || '💵'}</span>
            <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold">{formatCurrency(p.amount_cents)}</div>
                <div className="text-xs text-jm-muted truncate">{p.reason || p.payout_type}</div>
            </div>
            <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5 text-xs font-bold">
                    <span className={`h-2 w-2 rounded-full ${st.dot}`} aria-hidden="true" />
                    {st.label}
                </div>
                <div className="text-xs text-jm-muted">
                    {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
            </div>
        </li>
    );
}
