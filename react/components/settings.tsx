import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function SettingsSection({ title, delayMs, children }: { title: string; delayMs?: number; children: ReactNode }) {
    return (
        <section className="mb-6 fade-in" style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">{title}</h2>
            <div className="bg-white rounded-2xl border border-gray-200/80 divide-y divide-gray-100">{children}</div>
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
        <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</div>
                    <div className="text-gray-900 text-sm mt-0.5 font-medium">{value}</div>
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

export const secondaryButtonClass =
    'text-sm bg-surface-100 hover:bg-surface-200 text-gray-700 px-4 py-2 rounded-xl transition font-medium whitespace-nowrap inline-block disabled:opacity-60';

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" {...props} className={secondaryButtonClass} />;
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a href={href} target="_blank" rel="noopener" className="underline font-semibold">
            {children}
        </a>
    );
}
