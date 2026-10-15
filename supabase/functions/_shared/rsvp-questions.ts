export type RsvpQuestionType = 'yes_no' | 'single_choice' | 'multiple_choice' | 'short_text' | 'long_text'

export type RsvpQuestion = {
  id: string
  prompt: string
  type: RsvpQuestionType
  required: boolean
  choices: Array<{ id: string; label: string }>
}

const TYPES = new Set<RsvpQuestionType>([
  'yes_no', 'single_choice', 'multiple_choice', 'short_text', 'long_text',
])

function slug(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

function normalizeChoice(choice: unknown, index: number) {
  const raw = choice && typeof choice === 'object' ? choice as Record<string, unknown> : { label: choice }
  const label = String(raw.label || raw.name || '').trim().slice(0, 120)
  if (!label) return null
  return { id: slug(raw.id || label) || `choice-${index + 1}`, label }
}

export function normalizeQuestions(input: unknown): RsvpQuestion[] {
  const rows = Array.isArray(input) ? input : []
  const seen = new Set<string>()
  return rows.map((question, index) => {
    const raw = question && typeof question === 'object' ? question as Record<string, unknown> : {}
    const prompt = String(raw.prompt || raw.question || raw.label || '').trim().slice(0, 240)
    if (!prompt) return null
    const type = TYPES.has(raw.type as RsvpQuestionType) ? raw.type as RsvpQuestionType : 'short_text'
    const rawChoices = Array.isArray(raw.choices) ? raw.choices : []
    const choices = rawChoices.map(normalizeChoice).filter(Boolean).slice(0, 12) as Array<{ id: string; label: string }>
    const finalChoices = type === 'yes_no'
      ? [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]
      : (type === 'single_choice' || type === 'multiple_choice' ? choices : [])
    const base = slug(raw.id || prompt) || `question-${index + 1}`
    let id = base
    let n = 2
    while (seen.has(id)) id = `${base}-${n++}`
    seen.add(id)
    return { id, prompt, type, required: raw.required !== false, choices: finalChoices }
  }).filter(Boolean).slice(0, 30) as RsvpQuestion[]
}

export function validateAnswers(questionInput: unknown, answersInput: unknown) {
  const questions = normalizeQuestions(questionInput)
  const rawAnswers = answersInput && typeof answersInput === 'object'
    ? answersInput as Record<string, unknown>
    : {}
  const answers: Record<string, unknown> = {}

  for (const question of questions) {
    const rawValue = rawAnswers[question.id]
    let value: unknown = rawValue
    if (question.type === 'multiple_choice') {
      value = Array.isArray(rawValue)
        ? rawValue.map((item) => String(item || '').trim()).filter(Boolean).slice(0, question.choices.length)
        : []
    } else if (question.type === 'yes_no' || question.type === 'single_choice') {
      value = String(rawValue || '').trim()
    } else {
      value = String(rawValue || '').trim().slice(0, question.type === 'long_text' ? 2000 : 500)
    }

    const blank = Array.isArray(value) ? value.length === 0 : !String(value || '').trim()
    if (question.required && blank) return { answers: {}, error: `Please answer: ${question.prompt}` }
    if (blank) continue

    const allowed = new Set(question.choices.map((choice) => choice.id))
    if ((question.type === 'yes_no' || question.type === 'single_choice') && !allowed.has(String(value))) {
      return { answers: {}, error: `Please choose a valid answer for: ${question.prompt}` }
    }
    if (question.type === 'multiple_choice'
      && (!Array.isArray(value) || value.some((item) => !allowed.has(String(item))))) {
      return { answers: {}, error: `Please choose valid answers for: ${question.prompt}` }
    }
    answers[question.id] = value
  }

  return { answers, error: null }
}

export async function saveRsvpAnswers(
  supabase: any,
  eventId: string,
  answers: Record<string, unknown>,
  owner: { rsvpId?: string; guestRsvpId?: string },
) {
  const rsvpId = owner.rsvpId || null
  const guestRsvpId = owner.guestRsvpId || null
  if ((rsvpId ? 1 : 0) + (guestRsvpId ? 1 : 0) !== 1) {
    throw new Error('Exactly one RSVP answer owner is required')
  }

  const payload = {
    event_id: eventId,
    event_rsvp_id: rsvpId,
    event_guest_rsvp_id: guestRsvpId,
    answers,
    updated_at: new Date().toISOString(),
  }
  const conflict = rsvpId ? 'event_rsvp_id' : 'event_guest_rsvp_id'
  const { error } = await supabase
    .from('event_rsvp_answers')
    .upsert(payload, { onConflict: conflict })
  if (error) throw new Error(error.message)
}
