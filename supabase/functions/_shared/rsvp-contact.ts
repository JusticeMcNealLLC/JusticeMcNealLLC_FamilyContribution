import { normalizePhoneE164 } from './sms.ts'

export function requirePhone(raw: unknown): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) throw new Error('Phone number is required')
  const normalized = normalizePhoneE164(trimmed)
  if (!normalized) throw new Error('Enter a valid phone number (10+ digits, US or international)')
  return normalized
}

export async function requireMemberPhone(
  supabase: any,
  userId: string,
  bodyPhone?: unknown,
): Promise<string> {
  const rawBody = String(bodyPhone ?? '').trim()
  if (rawBody) {
    const normalized = requirePhone(rawBody)
    const { error } = await supabase
      .from('profiles')
      .update({ phone: normalized })
      .eq('id', userId)
    if (error) throw new Error(error.message)
    return normalized
  }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', userId)
    .maybeSingle()
  if (profErr) throw new Error(profErr.message)

  const existing = String(profile?.phone ?? '').trim()
  if (!existing) {
    throw new Error('Phone number is required. Add a mobile number to continue.')
  }
  const normalized = normalizePhoneE164(existing)
  if (!normalized) {
    throw new Error('Your profile phone number is invalid. Update it in Settings and try again.')
  }
  return normalized
}
