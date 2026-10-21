import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

// Theme_JMLLC001 building blocks (jm-* Tailwind tokens)

const buttonBase =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl text-[15px] font-bold transition ' +
    'disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jm-primary';

export const primaryButtonClass = `${buttonBase} bg-jm-primary text-white hover:bg-jm-primary-hover`;
export const secondaryButtonClass =
    `${buttonBase} bg-white text-jm-primary border border-jm-border hover:bg-jm-surface hover:border-jm-primary`;
const dangerButtonClass = `${buttonBase} bg-white text-red-700 border border-red-200 hover:bg-red-50 hover:border-red-300`;

export function PrimaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" {...props} className={`${primaryButtonClass} ${className}`} />;
}

export function SecondaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" {...props} className={`${secondaryButtonClass} ${className}`} />;
}

export function DangerButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" {...props} className={`${dangerButtonClass} ${className}`} />;
}

export function Switch({ checked, onChange, label, disabled }: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
            onClick={() => onChange(!checked)}
            className="group shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none"
        >
            <span
                className={
                    'relative inline-flex h-6 w-11 rounded-full transition-colors ' +
                    'group-focus-visible:ring-[3px] group-focus-visible:ring-jm-primary/30 ' +
                    (checked ? 'bg-jm-primary' : 'bg-jm-muted/60')
                }
            >
                <span
                    className={
                        'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow motion-safe:transition-transform ' +
                        (checked ? 'translate-x-5' : 'translate-x-0')
                    }
                />
            </span>
        </button>
    );
}

export function Field({ id, label, hint, error, children }: {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-bold text-jm-navy mb-1">{label}</label>
            {children}
            {error
                ? <p id={`${id}-msg`} className="mt-1 text-sm text-red-700">{error}</p>
                : hint && <p id={`${id}-msg`} className="mt-1 text-xs text-jm-muted">{hint}</p>}
        </div>
    );
}

export function TextInput({ invalid, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
    return (
        <input
            {...props}
            aria-invalid={invalid || undefined}
            aria-describedby={props.id ? `${props.id}-msg` : undefined}
            className={
                'w-full min-h-[44px] rounded-lg border bg-white px-3.5 py-2.5 text-[15px] text-jm-navy placeholder:text-jm-muted/70 ' +
                'transition focus:outline-none focus:ring-[3px] focus:ring-jm-primary/30 ' +
                (invalid ? 'border-red-600 focus:border-red-600 ' : 'border-jm-border focus:border-jm-primary ') +
                className
            }
        />
    );
}

export function Avatar({ photoUrl, initials, size = 64 }: { photoUrl: string | null; initials: string; size?: number }) {
    const style = { width: size, height: size };
    if (photoUrl) {
        return <img src={photoUrl} alt="" style={style} className="rounded-full object-cover ring-2 ring-white/80 shrink-0" />;
    }
    return (
        <div
            style={style}
            className="rounded-full bg-jm-accent text-white font-jm-headline font-semibold text-2xl flex items-center justify-center ring-2 ring-white/80 shrink-0"
            aria-hidden="true"
        >
            {initials || '?'}
        </div>
    );
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
    return (
        <div
            className="h-2 rounded-full bg-jm-border overflow-hidden"
            role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
        >
            <div className="h-full rounded-full bg-jm-accent motion-safe:transition-[width] motion-safe:duration-700" style={{ width: `${percent}%` }} />
        </div>
    );
}
