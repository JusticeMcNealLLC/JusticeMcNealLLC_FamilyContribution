import { useState } from 'react';
import { ExternalLink, SecondaryButton, SettingsRow } from '../../components/settings';
import { describePaymentMethod, redirectToStripe, type PaymentMethodInfo } from './api';

export function PaymentMethodRow({ info }: { info: PaymentMethodInfo | null | undefined }) {
    const [opening, setOpening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const current =
        info === undefined ? 'Loading...'
        : info === null ? 'Payment method on file'
        : describePaymentMethod(info.current) || 'No payment method on file';

    async function openPortal() {
        setOpening(true);
        setError(null);
        try {
            await redirectToStripe('create-billing-portal', { flow_type: 'payment_method_update' });
        } catch (err) {
            console.error('Error opening billing portal:', err);
            setError('Could not open billing. Please try again.');
            setOpening(false);
        }
    }

    const pending = info?.pending;

    return (
        <SettingsRow
            label="Payment Method"
            value={current}
            action={<SecondaryButton onClick={openPortal} disabled={opening}>{opening ? 'Opening…' : 'Update'}</SecondaryButton>}
        >
            {pending && (
                <div className="text-xs text-amber-700 mt-1">
                    {describePaymentMethod(pending)} waiting for verification.{' '}
                    {pending.verification_url && <ExternalLink href={pending.verification_url}>Verify deposit</ExternalLink>}
                </div>
            )}
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        </SettingsRow>
    );
}
