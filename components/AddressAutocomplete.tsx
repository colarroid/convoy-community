'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '@/lib/googleMaps'

interface AddressAutocompleteProps {
  value: string
  /** area is a consistent "neighbourhood, city" string from Places; used to prefill the area field. */
  onChange: (text: string, area?: string) => void
  placeholder?: string
  /** ISO country code to bias suggestions to (e.g. 'ng'). */
  country?: string
}

interface Prediction { placeId: string; main: string; secondary: string }

/**
 * Places-backed address input, mirroring the member app's component. Free text
 * always works; if Maps fails to load the field degrades to a plain input.
 */
export default function AddressAutocomplete({ value, onChange, placeholder, country }: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const svc = useRef<any>(null)
  const places = useRef<any>(null)
  const token = useRef<any>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadGoogleMaps().then((g) => {
      svc.current = new g.maps.places.AutocompleteService()
      places.current = new g.maps.places.PlacesService(document.createElement('div'))
      token.current = new g.maps.places.AutocompleteSessionToken()
    }).catch(() => { /* plain text input still works */ })
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const query = (input: string) => {
    if (!svc.current || input.trim().length < 2) { setPredictions([]); return }
    svc.current.getPlacePredictions(
      { input, sessionToken: token.current, componentRestrictions: country ? { country } : undefined },
      (res: any[] | null) => {
        setPredictions(
          (res ?? []).map(p => ({
            placeId: p.place_id,
            main: p.structured_formatting?.main_text ?? p.description,
            secondary: p.structured_formatting?.secondary_text ?? '',
          }))
        )
      }
    )
  }

  const handleInput = (text: string) => {
    onChange(text)
    setOpen(true)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => query(text), 250)
  }

  const select = (p: Prediction) => {
    setOpen(false)
    setPredictions([])
    if (!places.current) { onChange(p.secondary ? `${p.main}, ${p.secondary}` : p.main); return }
    places.current.getDetails(
      { placeId: p.placeId, fields: ['formatted_address', 'address_components'], sessionToken: token.current },
      (place: any, status: string) => {
        const g = (window as any).google
        token.current = new g.maps.places.AutocompleteSessionToken()
        if (status === 'OK' && place) {
          const comps: any[] = place.address_components ?? []
          const byType = (t: string) => comps.find(c => c.types?.includes(t))?.long_name as string | undefined
          // Build a consistent "neighbourhood, city" so every community reads the
          // same way (e.g. "Sabo Yaba, Lagos"), not just the bare neighbourhood.
          const neighbourhood = byType('sublocality_level_1') ?? byType('sublocality') ?? byType('neighborhood')
          const city = byType('locality') ?? byType('postal_town') ?? byType('administrative_area_level_2')
          const area = [neighbourhood, city].filter(Boolean).join(', ') || undefined
          onChange(place.formatted_address ?? p.main, area)
        } else {
          onChange(p.secondary ? `${p.main}, ${p.secondary}` : p.main)
        }
      }
    )
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => value.length >= 2 && predictions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="field-square"
      />

      {open && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-xl z-30 overflow-hidden max-h-72 overflow-y-auto">
          {predictions.map(p => (
            <button
              key={p.placeId}
              type="button"
              onClick={() => select(p)}
              className="w-full flex flex-col items-start px-4 py-3 text-left hover:bg-subtle transition-colors border-b border-border last:border-0"
            >
              <span className="block text-sm font-medium text-primary truncate w-full">{p.main}</span>
              {p.secondary && <span className="block text-xs text-secondary truncate w-full">{p.secondary}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
