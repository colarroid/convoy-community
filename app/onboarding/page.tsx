'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createCommunity, getMyCommunity, isCodeAvailable } from '@/lib/community'
import { suggestCodes } from '@/lib/codeSuggest'
import AddressAutocomplete from '@/components/AddressAutocomplete'

const CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,14}[A-Z0-9]$/

export default function OnboardingPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [country, setCountry] = useState('ng')
  const [available, setAvailable] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const existing = await getMyCommunity().catch(() => null)
      if (existing) { router.replace('/'); return }
      setCheckingAuth(false)
    })()
  }, [router])

  const suggestions = useMemo(() => suggestCodes(name, area), [name, area])

  const codeNorm = code.toUpperCase().replace(/\s+/g, '')
  const codeValid = CODE_RE.test(codeNorm) && !codeNorm.includes('--')

  // Live availability check, debounced.
  useEffect(() => {
    setAvailable(null)
    if (!codeValid) return
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setAvailable(await isCodeAvailable(codeNorm))
    }, 400)
    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [codeNorm, codeValid])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await createCommunity({
        name: name.trim(),
        code: codeNorm,
        address: address.trim() || undefined,
        area: area.trim() || undefined,
        country,
      })
      router.replace('/')
    } catch (err) {
      setBusy(false)
      setError(err instanceof Error ? err.message : 'Could not create your community.')
    }
  }

  if (checkingAuth) {
    return <main className="min-h-screen flex items-center justify-center text-sm text-secondary">Loading…</main>
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/veesaa-logo-black.svg" alt="Veesaa" className="h-[20px] w-auto mb-8" />

        <h1 className="text-2xl font-semibold tracking-tight">Create your community</h1>
        <p className="text-sm text-secondary mt-1.5 leading-relaxed">
          Veesaa reviews every community. Yours goes live, and its code starts working, once it&apos;s approved.
        </p>

        <form onSubmit={submit} className="card mt-6 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Community name</label>
            <input value={name} onChange={e => setName(e.target.value)} required minLength={3}
              placeholder="e.g. Harbour Point Fitness Club" className="field" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Community code</label>
            <div className="relative">
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} required
                placeholder="e.g. HARBOUR-FIT" className="field font-mono uppercase pr-9" />
              {codeValid && available !== null && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold ${available ? 'text-green-600' : 'text-red-500'}`}>
                  {available ? '✓' : '✗'}
                </span>
              )}
            </div>
            {codeValid && available === false && (
              <p className="mt-1.5 text-xs text-red-500">That code is already taken.</p>
            )}
            {!codeValid && code.length > 0 && (
              <p className="mt-1.5 text-xs text-secondary">4-16 characters: letters, numbers and single dashes.</p>
            )}

            {suggestions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-secondary">Ideas:</span>
                {suggestions.map(s => (
                  <button key={s} type="button" onClick={() => setCode(s)}
                    className="rounded-full border border-border bg-subtle px-2.5 py-1 text-xs font-mono font-medium hover:border-primary transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}

            <p className="mt-3 rounded-xl bg-subtle px-3.5 py-3 text-xs text-secondary leading-relaxed">
              Members enter this exact code to access your community. You can change it later, but
              members lose access until you share the new one.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Community address</label>
            <AddressAutocomplete
              value={address}
              country={country}
              placeholder="Where everyone is heading, e.g. Landmark Event Center"
              onChange={(text, locality) => {
                setAddress(text)
                // Prefill the area from the picked place unless the owner typed one.
                if (locality) setArea(prev => prev.trim() ? prev : locality)
              }}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1.5">Area</label>
              <input value={area} onChange={e => setArea(e.target.value)}
                placeholder="e.g. Yaba, Lagos" className="field" />
            </div>
            <div className="w-36">
              <label className="block text-sm font-medium mb-1.5">Country</label>
              <select value={country} onChange={e => setCountry(e.target.value)} className="field">
                <option value="ng">Nigeria</option>
                <option value="ca">Canada</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button disabled={busy || !codeValid || available === false || !address.trim()} className="btn-primary">
            {busy ? 'Submitting…' : 'Submit for review'}
          </button>
        </form>
      </div>
    </main>
  )
}
