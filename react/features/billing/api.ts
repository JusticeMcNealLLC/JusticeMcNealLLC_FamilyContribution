export interface PaymentMethodSummary {
    type: string;
    brand?: string;
    bank_name?: string | null;
    last4?: string;
    verification_url?: string | null;
}

export interface PaymentMethodInfo {
    current: PaymentMethodSummary | null;
    pending: PaymentMethodSummary | null;
}

export interface SubscriptionSummary {
    status: string;
    current_amount_cents: number;
    cancel_at_period_end: boolean;
}

export interface ManualBankInput {
    account_holder_name: string;
    routing_number: string;
    account_number: string;
    account_type: 'checking' | 'savings';
}

export function describePaymentMethod(pm: PaymentMethodSummary | null): string | null {
    if (!pm) return null;
    if (pm.type === 'card') {
        const brand = pm.brand ? pm.brand.charAt(0).toUpperCase() + pm.brand.slice(1) : 'Card';
        return `${brand} ending ${pm.last4}`;
    }
    if (pm.type === 'bank') return `${pm.bank_name || 'Bank'} ending ${pm.last4}`;
    return 'Payment method on file';
}

export function fetchPaymentMethod() {
    return callEdgeFunction<PaymentMethodInfo>('get-payment-method');
}

export async function fetchSubscription(): Promise<SubscriptionSummary | null> {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabaseClient
        .from('subscriptions')
        .select('status, current_amount_cents, cancel_at_period_end')
        .eq('user_id', user.id)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function redirectToStripe(functionName: string, body: Record<string, unknown> = {}) {
    const result = await callEdgeFunction<{ url?: string }>(functionName, body);
    if (result.url) window.location.href = result.url;
}

export function submitManualBank(input: ManualBankInput) {
    return callEdgeFunction<{ status: string; verification_url: string | null }>('create-bank-setup-session', {
        manual: true,
        ...input,
    });
}
