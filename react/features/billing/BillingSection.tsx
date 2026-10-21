import { useCallback, useEffect, useState } from 'react';
import { getStatusText } from '../../../js/pages/portal/utils/subscriptionStatus.js';
import { SettingsRow, SettingsSection, secondaryButtonClass } from '../../components/settings';
import { fetchPaymentMethod, fetchSubscription, type PaymentMethodInfo, type SubscriptionSummary } from './api';
import { PaymentMethodRow } from './PaymentMethodRow';
import { PayByBankRow } from './PayByBankRow';

// undefined = still loading, null = none / failed to load
export function BillingSection() {
    const [subscription, setSubscription] = useState<SubscriptionSummary | null | undefined>(undefined);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInfo | null | undefined>(undefined);

    const loadPaymentMethod = useCallback(() => {
        fetchPaymentMethod()
            .then(setPaymentMethod)
            .catch((err) => {
                console.error('Error loading payment method:', err);
                setPaymentMethod(null);
            });
    }, []);

    useEffect(() => {
        fetchSubscription()
            .then(setSubscription)
            .catch((err) => {
                console.error('Error loading subscription:', err);
                setSubscription(null);
            });
        loadPaymentMethod();
    }, [loadPaymentMethod]);

    return (
        <SettingsSection title="Billing" delayMs={140}>
            <PaymentMethodRow info={paymentMethod} />
            <PayByBankRow onBankSubmitted={loadPaymentMethod} />
            <SettingsRow
                label="Current Contribution"
                value={subscription ? `${formatCurrency(subscription.current_amount_cents)}/month` : '$--/month'}
                action={<a href="contribution.html" className={secondaryButtonClass}>Change</a>}
            />
            <SettingsRow
                label="Subscription Status"
                value={subscription ? getStatusText(subscription.status, subscription.cancel_at_period_end) : '--'}
            />
        </SettingsSection>
    );
}
