import { useState, type FormEvent } from 'react';
import { submitManualBank, type ManualBankInput } from './api';

const inputClass = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm';

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
        <form className="mt-3 space-y-3" autoComplete="off" onSubmit={handleSubmit}>
            <input
                type="text" required placeholder="Name on account" aria-label="Name on account" className={inputClass}
                value={form.account_holder_name} onChange={(e) => update('account_holder_name', e.target.value)}
            />
            <input
                type="text" inputMode="numeric" required maxLength={9}
                placeholder="Routing number (9 digits)" aria-label="Routing number" className={inputClass}
                value={form.routing_number} onChange={(e) => update('routing_number', e.target.value)}
            />
            <input
                type="text" inputMode="numeric" required maxLength={17}
                placeholder="Account number" aria-label="Account number" className={inputClass}
                value={form.account_number} onChange={(e) => update('account_number', e.target.value)}
            />
            <select
                aria-label="Account type" className={`${inputClass} bg-white`}
                value={form.account_type} onChange={(e) => update('account_type', e.target.value as ManualBankInput['account_type'])}
            >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
            </select>
            <p className="text-xs text-gray-500 leading-relaxed">
                By submitting, you authorize Justice McNeal LLC to debit this account for your monthly contribution and any
                one-time deposits you make, through Stripe, until you cancel. Stripe will send a small test deposit in 1–2
                business days to verify the account.
            </p>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button
                type="submit" disabled={submitting}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition text-sm disabled:opacity-60"
            >
                {submitting ? 'Submitting…' : 'Submit Bank Account'}
            </button>
        </form>
    );
}
