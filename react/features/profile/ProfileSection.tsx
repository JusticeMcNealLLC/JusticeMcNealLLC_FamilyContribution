import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Avatar, Field, PrimaryButton, ProgressBar, SecondaryButton, TextInput } from '../../components/brand';
import { fetchProfile, fetchRoles, saveProfile, type ProfileData, type ProfileForm, type Role } from './api';
import { profileCompleteness, validateProfile, type ProfileErrors } from './validation';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function ProfileSection() {
    const [profile, setProfile] = useState<ProfileData | null | undefined>(undefined);
    const [roles, setRoles] = useState<Role[]>([]);
    const [form, setForm] = useState<ProfileForm | null>(null);
    const [errors, setErrors] = useState<ProfileErrors>({});
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        fetchProfile()
            .then((p) => {
                setProfile(p);
                if (!p) return;
                setForm(p.form);
                fetchRoles(p.userId).then(setRoles).catch((err) => console.error('Error loading roles:', err));
            })
            .catch((err) => {
                console.error('Error loading profile:', err);
                setProfile(null);
            });
    }, []);

    const dirty = useMemo(
        () => !!profile && !!form && (Object.keys(form) as (keyof ProfileForm)[]).some((k) => form[k] !== profile.form[k]),
        [profile, form],
    );

    if (profile === undefined) return <ProfileSkeleton />;
    if (!profile || !form) {
        return (
            <ProfileShell>
                <p className="p-5 text-sm text-red-700">We couldn't load your profile. Refresh the page to try again.</p>
            </ProfileShell>
        );
    }

    // Header and progress reflect what's saved, not what's mid-edit
    const saved = profile.form;
    const fullName = `${saved.first_name} ${saved.last_name}`.trim();
    const initials = ((saved.first_name[0] || '') + (saved.last_name[0] || '')).toUpperCase();
    const completeness = profileCompleteness(saved, !!profile.photoUrl);

    function update<K extends keyof ProfileForm>(key: K, value: string) {
        setForm((f) => (f ? { ...f, [key]: value } : f));
        setErrors((e) => ({ ...e, [key]: undefined }));
        if (saveState !== 'saving') setSaveState('idle');
    }

    function discard() {
        setForm(profile!.form);
        setErrors({});
        setSaveState('idle');
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const found = validateProfile(form!);
        setErrors(found);
        if (Object.keys(found).length) return;

        setSaveState('saving');
        setSaveError(null);
        try {
            await saveProfile(profile!.userId, form!);
            const cleaned: ProfileForm = { ...form!, first_name: form!.first_name.trim(), last_name: form!.last_name.trim(), phone: form!.phone.trim() };
            setProfile({ ...profile!, form: cleaned });
            setForm(cleaned);
            setSaveState('saved');
        } catch (err) {
            console.error('Error saving profile:', err);
            setSaveError((err as Error).message || 'Failed to save profile.');
            setSaveState('error');
        }
    }

    return (
        <ProfileShell>
            <div className="bg-gradient-to-br from-jm-navy to-jm-primary px-5 py-6 text-white">
                <div className="flex items-center gap-4">
                    <Avatar photoUrl={profile.photoUrl} initials={initials} />
                    <div className="min-w-0">
                        <p className="font-jm-headline text-2xl font-semibold leading-tight tracking-[-0.02em] truncate">
                            {fullName || 'Your name'}
                        </p>
                        <p className="text-sm text-white/75 truncate">{profile.email}</p>
                        {roles.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {roles.map((r) => (
                                    <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">
                                        <span className="h-2 w-2 rounded-full" style={{ background: r.color || '#0e8b8b' }} aria-hidden="true" />
                                        {r.icon ? `${r.icon} ` : ''}{r.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <a
                    href="profile.html"
                    className="mt-4 inline-flex items-center gap-1 min-h-[44px] text-sm font-bold text-white/90 hover:text-white underline-offset-4 hover:underline"
                >
                    Edit photo &amp; bio on your profile
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </a>
            </div>

            <div className="px-5 py-4 bg-jm-surface border-b border-jm-border">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 mb-2 text-sm">
                    <span className="font-bold whitespace-nowrap">
                        {completeness.percent === 100 ? 'Profile complete' : `Profile ${completeness.percent}% complete`}
                    </span>
                    {completeness.nextStep && <span className="text-jm-muted">Next: {completeness.nextStep.toLowerCase()}</span>}
                </div>
                <ProgressBar percent={completeness.percent} label="Profile completeness" />
            </div>

            <form className="p-5 space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="profileFirstName" label="First name" error={errors.first_name}>
                        <TextInput
                            id="profileFirstName" autoComplete="given-name" invalid={!!errors.first_name}
                            value={form.first_name} onChange={(e) => update('first_name', e.target.value)}
                        />
                    </Field>
                    <Field id="profileLastName" label="Last name" error={errors.last_name}>
                        <TextInput
                            id="profileLastName" autoComplete="family-name" invalid={!!errors.last_name}
                            value={form.last_name} onChange={(e) => update('last_name', e.target.value)}
                        />
                    </Field>
                </div>
                <Field id="profileBirthday" label="Birthday" hint="Used for birthday gifts and profile milestones." error={errors.birthday}>
                    <TextInput
                        id="profileBirthday" type="date" invalid={!!errors.birthday}
                        value={form.birthday} onChange={(e) => update('birthday', e.target.value)}
                    />
                </Field>
                <Field
                    id="profilePhone" label="Mobile phone" error={errors.phone}
                    hint="Optional. Used for event SMS updates when you opt in on an event page."
                >
                    <TextInput
                        id="profilePhone" type="tel" inputMode="tel" autoComplete="tel" maxLength={32}
                        placeholder="4705551234 or +14705551234" invalid={!!errors.phone}
                        value={form.phone} onChange={(e) => update('phone', e.target.value)}
                    />
                </Field>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <p className="mr-auto text-sm" role="status" aria-live="polite">
                        {saveState === 'saved' && !dirty && <span className="text-jm-accent font-bold">✓ Saved</span>}
                        {saveState === 'error' && <span className="text-red-700">{saveError}</span>}
                    </p>
                    {dirty && <SecondaryButton onClick={discard} disabled={saveState === 'saving'}>Discard</SecondaryButton>}
                    <PrimaryButton type="submit" disabled={!dirty || saveState === 'saving'}>
                        {saveState === 'saving' ? 'Saving…' : 'Save changes'}
                    </PrimaryButton>
                </div>
            </form>
        </ProfileShell>
    );
}

function ProfileShell({ children }: { children: ReactNode }) {
    return (
        <section className="mb-6 fade-in">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Profile</h2>
            <div className="font-jm-body text-jm-navy bg-white rounded-2xl border border-jm-border overflow-hidden shadow-[0_1px_2px_rgba(11,37,69,0.06)]">
                {children}
            </div>
        </section>
    );
}

function ProfileSkeleton() {
    return (
        <ProfileShell>
            <div className="bg-gradient-to-br from-jm-navy to-jm-primary px-5 py-6">
                <div className="flex items-center gap-4 motion-safe:animate-pulse">
                    <div className="h-16 w-16 rounded-full bg-white/20" />
                    <div className="space-y-2">
                        <div className="h-6 w-40 rounded bg-white/20" />
                        <div className="h-4 w-52 rounded bg-white/15" />
                    </div>
                </div>
            </div>
            <div className="p-5 space-y-4 motion-safe:animate-pulse">
                {[0, 1, 2].map((i) => <div key={i} className="h-11 rounded-lg bg-jm-surface" />)}
            </div>
        </ProfileShell>
    );
}
