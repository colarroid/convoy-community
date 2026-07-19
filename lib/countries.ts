export interface Country {
  code: string
  dial: string
  flag: string
  name: string
}

/**
 * The single source of truth for the countries Veesaa is live in. Every country
 * dropdown and Places bias in this app reads from here, so adding a market is a
 * one-line change that reflects everywhere.
 */
export const COUNTRY_CODES: Country[] = [
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canada' },
]

/** Country codes (ISO-3166-1 alpha-2, lowercase) we bias Google Places to. */
export const PLACES_COUNTRIES = COUNTRY_CODES.map(c => c.code.toLowerCase())
