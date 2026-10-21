export type BankStatus = 'disabled' | 'not_linked' | 'incomplete' | 'connected';

export interface Payout {
    amount_cents: number;
    payout_type: string;
    status: string;
    reason: string | null;
    created_at: string;
}

export const PAYOUT_TYPES = [
    { key: 'birthday', label: 'Birthday Gifts', emoji: '🎂', desc: 'Receive a gift on your birthday' },
    { key: 'competition', label: 'Competitions', emoji: '🏆', desc: 'Prizes from quest competitions' },
    { key: 'bonus', label: 'Bonuses', emoji: '💰', desc: 'Admin-sent bonuses' },
    { key: 'profit_share', label: 'Profit Share', emoji: '📈', desc: 'Share of investment profits' },
    { key: 'referral', label: 'Referrals', emoji: '🤝', desc: 'Rewards for referring new members' },
    { key: 'quest_reward', label: 'Quest Rewards', emoji: '⭐', desc: 'Prizes for quest achievements' },
] as const;

export const PAYOUT_EMOJI: Record<string, string> = {
    ...Object.fromEntries(PAYOUT_TYPES.map((t) => [t.key, t.emoji])),
    custom: '✨',
};

export async function fetchBankStatus(userId: string): Promise<BankStatus> {
    const { data: setting } = await supabaseClient
        .from('app_settings')
        .select('value')
        .eq('key', 'payouts_enabled')
        .single();
    if (setting?.value !== true) return 'disabled';

    const { data: profile, error } = await supabaseClient
        .from('profiles')
        .select('stripe_connect_account_id, connect_onboarding_complete')
        .eq('id', userId)
        .single();
    if (error) throw error;
    if (!profile?.stripe_connect_account_id) return 'not_linked';
    return profile.connect_onboarding_complete ? 'connected' : 'incomplete';
}

// No row means enrolled
export async function fetchEnrollments(userId: string): Promise<Record<string, boolean>> {
    const { data, error } = await supabaseClient
        .from('payout_enrollments')
        .select('payout_type, enrolled')
        .eq('user_id', userId);
    if (error) throw error;
    return Object.fromEntries((data || []).map((e) => [e.payout_type, e.enrolled]));
}

export async function saveEnrollment(userId: string, payoutType: string, enrolled: boolean) {
    const { error } = await supabaseClient
        .from('payout_enrollments')
        .upsert(
            { user_id: userId, payout_type: payoutType, enrolled, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,payout_type' },
        );
    if (error) throw error;
}

export async function fetchRecentPayouts(userId: string): Promise<Payout[]> {
    const { data, error } = await supabaseClient
        .from('payouts')
        .select('amount_cents, payout_type, status, reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
    if (error) throw error;
    return data || [];
}
