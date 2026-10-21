import { useState, type FormEvent } from 'react';
import { Field, PrimaryButton, TextInput } from '../../components/brand';
import { Notice } from '../../components/settings';
import { submitManualBank, type ManualBankInput } from './api';

const emptyForm: ManualBankInput = {
    account_holder_name: '',
    routing_number: '',
    account_number: '',
    account_type: 'checking',
};

export function ManualBankForm({ onSubmitted }: { onSubmitted: (verificationUrl: string | null) => void }) {
    const [form, setForm] = useState<ManualBankInput>(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function update<K extends keyof ManualBankInput>(key: K, value: ManualBankInput[K]) {
        setForm((f) => ({ ...f, [key]: value }));
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const result = await submitManualBank(form);
            setForm(emptyForm);
            onSubmitted(result.verification_url);
        } catch (err) {
            console.error('Manual bank setup failed:', err);
            setError((err as Error).message || 'Could not submit bank account. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form className="mt-3 space-y-3 rounded-xl bg-jm-surface p-4" autoComplete="off" onSubmit={handleSubmit}>
            <Field id="manualBankName" label="Name on account">
                <TextInput
                    id="manualBankName" required
                    value={form.account_holder_name} onChange={(e) => update('account_holder_name', e.target.value)}
                />
            </Field>
            <Field id="manualBankRouting" label="Routing number" hint="9 digits">
                <TextInput
                    id="manualBankRouting" inputMode="numeric" required maxLength={9}
                    value={form.routing_number} onChange={(e) => update('routing_number', e.target.value)}
                />
            </Field>
            <Field id="manualBankAccount" label="Account number">
                <TextInput
                    id="manualBankAccount" inputMode="numeric" required maxLength={17}
                    value={form.account_number} onChange={(e) => update('account_number', e.target.value)}
                />
            </Field>
            <Field id="manualBankType" label="Account type">
                <select
                    id="manualBankType"
                    className="w-full min-h-[44px] rounded-lg border border-jm-border bg-white px-3.5 py-2.5 text-[15px] text-jm-navy focus:outline-none focus:border-jm-primary focus:ring-[3px] focus:ring-jm-primary/30"
                    value={form.account_type} onChange={(e) => update('account_type', e.target.value as ManualBankInput['account_type'])}
                >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                </select>
            </Field>
            <p className="text-xs text-jm-muted leading-relaxed">
                By submitting, you authorize Justice McNeal LLC to debit this account for your monthly contribution and any
                one-time deposits you make, through Stripe, until you cancel. Stripe will send a small test deposit in 1–2
                business days to verify the account.
            </p>
            {error && <Notice tone="error">{error}</Notice>}
            <PrimaryButton type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Submitting…' : 'Submit Bank Account'}
            </PrimaryButton>
        </form>
    );
}
