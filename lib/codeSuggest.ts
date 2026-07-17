/**
 * Code suggestions from the community name. Codes are 4-16 chars of A-Z, 0-9
 * and single dashes (validated again server-side). Owners pick their own; these
 * are just starting points.
 */
export function suggestCodes(name: string, area?: string): string[] {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/)
    .filter(w => w.length > 1 && !['THE', 'OF', 'AND', 'A', 'AN'].includes(w))
  if (words.length === 0) return []

  const clean = (s: string) => s.replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const pad = (s: string) => (s.length >= 4 ? s : s + String(100 + Math.floor(Math.random() * 900)))
  const acronym = words.map(w => w[0]).join('')
  const areaToken = (area ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  const digits = () => String(10 + Math.floor(Math.random() * 90))

  const raw = [
    `${acronym}-${areaToken || digits()}`,
    words[0].slice(0, 8),
    words.length > 1 ? `${words[0].slice(0, 6)}-${words[1].slice(0, 6)}` : `${words[0].slice(0, 6)}-${digits()}`,
    `${acronym}${digits()}`,
  ]

  const seen = new Set<string>()
  return raw
    .map(clean).map(pad).map(s => s.slice(0, 16))
    .filter(s => s.length >= 4 && !seen.has(s) && (seen.add(s), true))
    .slice(0, 4)
}
