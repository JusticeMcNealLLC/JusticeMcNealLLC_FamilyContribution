export interface ProfileForm {
    first_name: string;
    last_name: string;
    birthday: string;
    phone: string;
}

export interface ProfileData {
    userId: string;
    email: string;
    photoUrl: string | null;
    form: ProfileForm;
}

export interface Role {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
}

export async function fetchProfile(): Promise<ProfileData | null> {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name, birthday, phone, profile_picture_url')
        .eq('id', user.id)
        .single();
    if (error) throw error;
    return {
        userId: user.id,
        email: user.email || '',
        photoUrl: data.profile_picture_url,
        form: {
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            birthday: data.birthday || '',
            phone: data.phone || '',
        },
    };
}

export async function fetchRoles(userId: string): Promise<Role[]> {
    const { data, error } = await supabaseClient
        .from('member_roles')
        .select('roles(id, name, color, icon, position)')
        .eq('user_id', userId)
        .order('roles(position)', { ascending: true });
    if (error) throw error;
    return (data || []).flatMap((r: any) => (r.roles ? [r.roles as Role] : []));
}

export async function saveProfile(userId: string, form: ProfileForm) {
    const { error } = await supabaseClient
        .from('profiles')
        .update({
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            birthday: form.birthday || null,
            phone: form.phone.trim() || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    if (error) throw error;
}
