import { useEffect, useState, type FormEvent } from 'react';
import { Field, PrimaryButton, SecondaryButton, TextInput } from '../../components/brand';
import { Notice, SettingsRow, SettingsSection } from '../../components/settings';

export function AccountSection() {
    const [email, setEmail] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [updated, setUpdated] = useState(false);

    useEffect(() => {
        supabaseClient.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? ''));
    }, []);

    return (
        <SettingsSection title="Account" delayMs={60}>
            <SettingsRow label="Email" value={email ?? 'Loading…'} />
            <SettingsRow
                label="Password"
                value="••••••••"
                action={!editing && (
                    <SecondaryButton onClick={() => { setEditing(true); setUpdated(false); }}>Change</SecondaryButton>
                )}
            >
                {editing && (
                    <PasswordForm
                        onCancel={() => setEditing(false)}
                        onDone={() => { setEditing(false); setUpdated(true); }}
                    />
                )}
                <div role="status" aria-live="polite">
                    {updated && <Notice tone="success">✓ Password updated.</Notice>}
                </div>
            </SettingsRow>
        </SettingsSection>
    );
}

function PasswordForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const found: typeof errors = {};
        if (password.length < 8) found.password = 'Password must be at least 8 characters.';
        else if (confirm !== password) found.confirm = 'Passwords do not match.';
        setErrors(found);
        if (Object.keys(found).length) return;

        setSaving(true);
        setSaveError(null);
        const { error } = await supabaseClient.auth.updateUser({ password });
        setSaving(false);
        if (error) {
            setSaveError(error.message || 'Failed to update password.');
            return;
        }
        onDone();
    }

    return (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
            <Field id="newPassword" label="New password" hint="At least 8 characters." error={errors.password}>
                <TextInput
                    id="newPassword" type="password" autoComplete="new-password" invalid={!!errors.password} autoFocus
                    value={password} onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                />
            </Field>
            <Field id="confirmPassword" label="Confirm new password" error={errors.confirm}>
                <TextInput
                    id="confirmPassword" type="password" autoComplete="new-password" invalid={!!errors.confirm}
                    value={confirm} onChange={(e) => { setConfirm(e.target.value); setErrors({}); }}
                />
            </Field>
            {saveError && <Notice tone="error">{saveError}</Notice>}
            <div className="flex flex-wrap justify-end gap-3">
                <SecondaryButton onClick={onCancel} disabled={saving}>Cancel</SecondaryButton>
                <PrimaryButton type="submit" disabled={saving}>{saving ? 'Updating…' : 'Update password'}</PrimaryButton>
            </div>
        </form>
    );
}
