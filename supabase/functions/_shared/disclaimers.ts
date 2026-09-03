// Shared disclaimer catalog + ack helpers for event RSVP edges

export const TITLE_MAX = 80
export const BODY_MAX = 4000

export type DisclaimerClause = {
  id: string
  title: string
  body: string
  required: boolean
  is_default: boolean
}

export type DisclaimerAck = {
  id: string
  acked_at: string
}

export function normalizeDisclaimers(items: unknown): DisclaimerClause[] {
  if (!Array.isArray(items)) return []
  const out: DisclaimerClause[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    const title = String(row.title || '').trim().slice(0, TITLE_MAX)
    const body = String(row.body || '').trim().slice(0, BODY_MAX)
    if (!title || !body) continue
    const id = String(row.id || '').trim() || `disc-${out.length + 1}`
    out.push({
      id,
      title,
      body,
      required: row.required !== false,
      is_default: !!row.is_default,
    })
  }
  return out
}

export function hasRequiredDisclaimers(catalog: unknown): boolean {
  return requiredIds(catalog).length > 0
}

export function requiredIds(catalog: unknown): string[] {
  return normalizeDisclaimers(catalog).filter((d) => d.required).map((d) => d.id)
}

/** Accept ack id list or {id, acked_at}[] from clients */
export function parseAckIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const id = item.trim()
      if (id) out.push(id)
      continue
    }
    if (item && typeof item === 'object' && 'id' in (item as object)) {
      const id = String((item as { id: unknown }).id || '').trim()
      if (id) out.push(id)
    }
  }
  return out
}

export function validateAcks(catalog: unknown, ackIds: unknown): string | null {
  const required = requiredIds(catalog)
  if (!required.length) return null
  const set = new Set(parseAckIds(ackIds))
  for (const id of required) {
    if (!set.has(id)) {
      const clause = normalizeDisclaimers(catalog).find((d) => d.id === id)
      return `Please acknowledge: ${clause?.title || 'required disclaimer'}.`
    }
  }
  return null
}

export function acksPayload(catalog: unknown, ackIds: unknown, atIso?: string): DisclaimerAck[] {
  const list = normalizeDisclaimers(catalog)
  const set = new Set(parseAckIds(ackIds))
  const now = atIso || new Date().toISOString()
  const out: DisclaimerAck[] = []
  for (const d of list) {
    if (!set.has(d.id)) continue
    out.push({ id: d.id, acked_at: now })
  }
  return out
}

export function parseAcksMetadata(raw: string | undefined | null): string[] {
  if (!raw) return []
  try {
    return parseAckIds(JSON.parse(raw))
  } catch {
    return []
  }
}
