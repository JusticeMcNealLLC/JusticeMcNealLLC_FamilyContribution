import type { ReactNode } from 'react';

export function SettingsSection({ title, tone = 'default', divided = true, delayMs, children }: {
    title: string;
    tone?: 'default' | 'danger';
    divided?: boolean;
    delayMs?: number;
    children: ReactNode;
}) {
    const danger = tone === 'danger';
    return (
        <section className="mb-6 fade-in font-jm-body text-jm-navy" style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}>
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 ${danger ? 'text-red-700' : 'text-jm-muted'}`}>{title}</h2>
            <div
                className={
                    'bg-white rounded-2xl border overflow-hidden shadow-[0_1px_2px_rgba(11,37,69,0.06)] ' +
                    (danger ? 'border-red-200 ' : 'border-jm-border ') +
                    (divided ? 'divide-y divide-jm-border' : '')
                }
            >
                {children}
            </div>
        </section>
    );
}

export function SettingsRow({ label, value, action, children }: {
    label: string;
    value: ReactNode;
    action?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <div className="text-xs font-bold text-jm-muted uppercase tracking-wide">{label}</div>
                    <div className="text-[15px] mt-0.5 font-bold text-jm-navy">{value}</div>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

export function SubHeading({ children }: { children: ReactNode }) {
    return <div className="text-xs font-bold text-jm-muted uppercase tracking-wide mb-2">{children}</div>;
}

export function Notice({ tone, children }: { tone: 'success' | 'warning' | 'error'; children: ReactNode }) {
    const color = tone === 'success' ? 'text-jm-accent' : tone === 'warning' ? 'text-amber-800' : 'text-red-700';
    return <div className={`mt-2 text-sm ${color}`}>{children}</div>;
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener" className="underline font-bold text-jm-primary">
            {children}
        </a>
    );
}
