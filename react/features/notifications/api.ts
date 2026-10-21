export type Prefs = Record<string, boolean>;

export const PREF_FIELDS = [
    { key: 'event_new', label: 'New Events', desc: 'When a new event is created' },
    { key: 'event_reminders', label: 'Event Reminders', desc: '7-day, 3-day, and day-of reminders' },
    { key: 'event_rsvp_updates', label: 'RSVP Updates', desc: 'When someone RSVPs to your events' },
    { key: 'event_rsvp_deadline', label: 'RSVP Deadline Alerts', desc: 'Reminders before RSVP closes' },
    { key: 'raffle_results', label: 'Raffle Results', desc: 'When raffle winners are drawn' },
    { key: 'competition_updates', label: 'Competitions', desc: 'Competition updates and results' },
    { key: 'checkin_alerts', label: 'Check-In Alerts', desc: 'When check-in opens for an event' },
] as const;

// Creates the all-on default row the first time a member opens Settings
export async function fetchPrefs(userId: string): Promise<Prefs> {
    const { data, error } = await supabaseClient
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw error;
    if (data) return data;

    const defaults: Record<string, unknown> = { user_id: userId, push_enabled: true };
    PREF_FIELDS.forEach((f) => { defaults[f.key] = true; });
    const { data: inserted, error: insertError } = await supabaseClient
        .from('notification_preferences')
        .insert(defaults)
        .select()
        .single();
    if (insertError) throw insertError;
    return inserted;
}

export async function savePref(userId: string, key: string, value: boolean) {
    const { error } = await supabaseClient
        .from('notification_preferences')
        .update({ [key]: value })
        .eq('user_id', userId);
    if (error) throw error;
}
