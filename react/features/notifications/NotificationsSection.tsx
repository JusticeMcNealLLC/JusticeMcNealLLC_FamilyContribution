import { useEffect, useState } from 'react';
import { Switch } from '../../components/brand';
import { Notice, SettingsSection, SubHeading } from '../../components/settings';
import { fetchPrefs, savePref, PREF_FIELDS, type Prefs } from './api';

type PushState = 'loading' | 'unsupported' | 'blocked' | 'on' | 'off';

const PUSH_TEXT: Record<PushState, string> = {
    loading: 'Checking…',
    unsupported: 'Not supported in this browser',
    blocked: 'Blocked — enable notifications in your browser settings',
    on: "Enabled — you'll get push alerts",
    off: 'Off — turn on to stay in the loop',
};

export function NotificationsSection() {
    return (
        <SettingsSection title="Notifications" delayMs={240}>
            <PushRow />
            <CategoryPrefs />
        </SettingsSection>
    );
}

function PushRow() {
    const [state, setState] = useState<PushState>('loading');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const push = window.JMPush;
        if (!push || !push.isSupported()) return setState('unsupported');
        if (push.getPermissionState() === 'denied') return setState('blocked');
        push.isSubscribed().then((on) => setState(on ? 'on' : 'off'));
    }, []);

    async function toggle(next: boolean) {
        const push = window.JMPush!;
        setBusy(true);
        const result = next ? await push.subscribe() : await push.unsubscribe();
        setBusy(false);
        if (result.success) setState(next ? 'on' : 'off');
        else if (result.reason === 'denied') setState('blocked');
    }

    const canToggle = state === 'on' || state === 'off';
    return (
        <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
                <div className="text-[15px] font-bold">Push notifications</div>
                <div className="text-sm text-jm-muted mt-0.5" role="status" aria-live="polite">{PUSH_TEXT[state]}</div>
            </div>
            {canToggle && <Switch label="Push notifications" checked={state === 'on'} disabled={busy} onChange={toggle} />}
        </div>
    );
}

function CategoryPrefs() {
    const [userId, setUserId] = useState<string | null>(null);
    const [prefs, setPrefs] = useState<Prefs | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const { data } = await supabaseClient.auth.getSession();
            const id = data.session?.user.id;
            if (!id) return;
            setUserId(id);
            setPrefs(await fetchPrefs(id));
        })().catch((err) => {
            console.error('Notification prefs error:', err);
            setError('Could not load your notification choices.');
        });
    }, []);

    async function toggle(key: string, next: boolean) {
        setError(null);
        setPrefs((p) => ({ ...p, [key]: next }));
        try {
            await savePref(userId!, key, next);
        } catch (err) {
            console.error('Failed to save pref:', err);
            setPrefs((p) => ({ ...p, [key]: !next }));
            setError('Could not save that change. Please try again.');
        }
    }

    return (
        <div className="px-5 py-4">
            <SubHeading>Notify me about</SubHeading>
            {!prefs && !error && <p className="text-sm text-jm-muted">Loading…</p>}
            {prefs && (
                <ul>
                    {PREF_FIELDS.map((f) => (
                        <li key={f.key} className="flex items-center justify-between gap-3 py-1">
                            <div className="min-w-0">
                                <div className="text-[15px] font-bold">{f.label}</div>
                                <div className="text-xs text-jm-muted">{f.desc}</div>
                            </div>
                            <Switch label={f.label} checked={prefs[f.key] !== false} onChange={(next) => toggle(f.key, next)} />
                        </li>
                    ))}
                </ul>
            )}
            <div role="status" aria-live="polite">{error && <Notice tone="error">{error}</Notice>}</div>
        </div>
    );
}
