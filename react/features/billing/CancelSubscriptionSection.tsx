import { useState } from 'react';
import { DangerButton } from '../../components/brand';
import { Notice, SettingsSection } from '../../components/settings';
import { confirmDialog } from '../../lib/dialogs';
import { redirectToStripe } from './api';

export function CancelSubscriptionSection() {
    const [opening, setOpening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleCancel() {
        const ok = await confirmDialog({
            title: 'Cancel your subscription?',
            message: 'Your monthly contribution will stop at the end of your current billing period. You can restart anytime.',
            confirmLabel: 'Continue to cancel',
            cancelLabel: 'Keep contributing',
        });
        if (!ok) return;

        setOpening(true);
        setError(null);
        try {
            await redirectToStripe('create-billing-portal', { flow_type: 'subscription_cancel' });
        } catch (err) {
            console.error('Error opening billing portal:', err);
            setError('Could not open billing. Please try again.');
            setOpening(false);
        }
    }

    return (
        <SettingsSection title="Danger Zone" tone="danger" delayMs={300}>
            <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="text-[15px] font-bold">Cancel subscription</div>
                        <div className="text-sm text-jm-muted mt-0.5">Your contribution will stop at the end of your current billing period.</div>
                    </div>
                    <DangerButton onClick={handleCancel} disabled={opening}>{opening ? 'Opening…' : 'Cancel'}</DangerButton>
                </div>
                {error && <Notice tone="error">{error}</Notice>}
            </div>
        </SettingsSection>
    );
}
