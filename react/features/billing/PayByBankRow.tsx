import { useEffect, useState, type ReactNode } from 'react';
import { ExternalLink, SecondaryButton, SettingsRow } from '../../components/settings';
import { redirectToStripe } from './api';
import { ManualBankForm } from './ManualBankForm';

function takeReturnNotice(): string | null {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('bank');
    if (!status) return null;
    params.delete('bank');
    const query = params.toString();
    history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''));
    return status === 'submitted'
        ? 'Bank account linked. Your contribution will use it starting with your next payment.'
        : null;
}

export function PayByBankRow({ onBankSubmitted }: { onBankSubmitted: () => void }) {
    const [showManual, setShowManual] = useState(false);
    const [opening, setOpening] = useState(false);
    const [notice, setNotice] = useState<ReactNode>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const returnNotice = takeReturnNotice();
        if (returnNotice) setNotice(returnNotice);
    }, []);

    async function linkBank() {
        setOpening(true);
        setError(null);
        try {
            await redirectToStripe('create-bank-setup-session');
        } catch (err) {
            console.error('Error opening bank setup:', err);
            setError((err as Error).message || 'Failed to open bank setup. Please try again.');
            setOpening(false);
        }
    }

    function handleManualSubmitted(verificationUrl: string | null) {
        setShowManual(false);
        setNotice(
            <>
                Bank account submitted. Stripe will send a small deposit in 1–2 business days. Your contribution
                switches to this bank once you confirm it.{' '}
                {verificationUrl && <ExternalLink href={verificationUrl}>Save this verification link</ExternalLink>}
            </>,
        );
        onBankSubmitted();
    }

    return (
        <SettingsRow
            label="Pay by Bank"
            value="Lower fees than a card"
            action={<SecondaryButton onClick={linkBank} disabled={opening}>{opening ? 'Opening…' : 'Link Bank'}</SecondaryButton>}
        >
            <button type="button" className="mt-2 text-xs text-gray-500 underline py-2" onClick={() => setShowManual((v) => !v)}>
                Bank not showing up? Enter account details manually
            </button>
            {showManual && <ManualBankForm onSubmitted={handleManualSubmitted} />}
            {notice && <div className="mt-2 text-sm text-emerald-700">{notice}</div>}
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        </SettingsRow>
    );
}
