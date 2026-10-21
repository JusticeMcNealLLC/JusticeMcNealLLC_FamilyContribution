import type { ProfileForm } from './api';

export type ProfileErrors = Partial<Record<keyof ProfileForm, string>>;

export function validateProfile(form: ProfileForm): ProfileErrors {
    const errors: ProfileErrors = {};
    if (!form.first_name.trim()) errors.first_name = 'First name is required.';
    if (!form.last_name.trim()) errors.last_name = 'Last name is required.';

    if (form.birthday) {
        const date = new Date(form.birthday + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(date.getTime()) || date >= today) errors.birthday = 'Birthday must be in the past.';
    }

    const digits = form.phone.replace(/\D/g, '');
    if (form.phone.trim()) {
        if (digits.length < 10) errors.phone = 'Enter a valid 10-digit US phone number (or include country code).';
        else if (digits.length > 15) errors.phone = 'Phone number is too long.';
    }
    return errors;
}

export interface Completeness {
    percent: number;
    nextStep: string | null;
}

export function profileCompleteness(form: ProfileForm, hasPhoto: boolean): Completeness {
    const steps: [boolean, string][] = [
        [!!form.first_name.trim() && !!form.last_name.trim(), 'Add your full name'],
        [!!hasPhoto, 'Add a profile photo'],
        [!!form.birthday, 'Add your birthday'],
        [!!form.phone.trim(), 'Add your phone'],
    ];
    const done = steps.filter(([ok]) => ok).length;
    return {
        percent: Math.round((done / steps.length) * 100),
        nextStep: steps.find(([ok]) => !ok)?.[1] ?? null,
    };
}
