'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getMyCommunity, getStats, getTopAreas, updateCommunity, changeCode, uploadLogo,
  type OwnedCommunity, type CommunityStats, type TopArea,
} from '@/lib/community'

/*
 * Layout system (from the reference design): one max-w-5xl container, every
 * card `rounded-xl border border-gray-200 bg-white`, every card pad `px-6`,
 * uppercase 11px tracked labels, stat BANDS split by dividers rather than
 * floating tiles, table-style rows with a soft header strip, and a quiet
 * footer. One rhythm: sections are `mt-10`, headings sit `mb-3` above cards.
 */

const STATUS_PILL: Record<string, { dot: string; cls: string }> = {
  pending: { dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-700' },
  active: { dot: 'bg-green-500', cls: 'bg-green-50 text-green-700' },
  rejected: { dot: 'bg-red-500', cls: 'bg-red-50 text-red-600' },
  suspended: { dot: 'bg-gray-400', cls: 'bg-gray-100 text-gray-500' },
}

function MicroLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{children}</p>
}

function BandStat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  const zero = value === 0 || value === '0' || value === '0 km'
  return (
    <div className="px-6 py-5">
      <MicroLabel>{label}</MicroLabel>
      <p className={`mt-1.5 text-3xl font-bold tracking-tight ${zero ? 'text-gray-300' : accent ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [community, setCommunity] = useState<OwnedCommunity | null>(null)
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [areas, setAreas] = useState<TopArea[]>([])
  const [loading, setLoading] = useState(true)

  // Edit details
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  // Change code
  const [changingCode, setChangingCode] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [confirmCode, setConfirmCode] = useState(false)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  // Logo upload
  const fileRef = useRef<HTMLInputElement>(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const [logoError, setLogoError] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const c = await getMyCommunity().catch(() => null)
      if (!c) { router.replace('/onboarding'); return }
      setCommunity(c)
      setName(c.name); setAddress(c.address ?? ''); setArea(c.area ?? '')
      if (c.status === 'active') {
        const [s, a] = await Promise.all([getStats(), getTopAreas()])
        setStats(s); setAreas(a)
      }
      setLoading(false)
    })()
  }, [router])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const saveDetails = async () => {
    setBusy(true); setActionError('')
    try {
      const c = await updateCommunity({ name: name.trim(), address: address.trim(), area: area.trim() })
      setCommunity(c); setEditing(false)
    } catch (e) { setActionError(e instanceof Error ? e.message : 'Could not save.') }
    setBusy(false)
  }

  const submitCodeChange = async () => {
    setBusy(true); setActionError('')
    try {
      const c = await changeCode(newCode.trim())
      setCommunity(c); setChangingCode(false); setNewCode(''); setConfirmCode(false)
    } catch (e) { setActionError(e instanceof Error ? e.message : 'Could not change the code.') }
    setBusy(false)
  }

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setLogoBusy(true)
    setLogoError('')
    try {
      const c = await uploadLogo(file)
      setCommunity(c)
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Logo upload failed.')
    }
    setLogoBusy(false)
  }

  const copyCode = async () => {
    if (!community) return
    try { await navigator.clipboard.writeText(community.code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ }
  }

  if (loading || !community) {
    return <main className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-400">Loading…</main>
  }

  const live = community.status === 'active'
  const pill = STATUS_PILL[community.status]
  const fmtDay = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const rangeLabel = `${fmtDay(new Date(Date.now() - 30 * 86400000))} - ${fmtDay(new Date())}`

  return (
    <main className="min-h-screen bg-white">
      {/* ── Top bar ── */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/veesaa-logo-black.svg" alt="Veesaa" className="h-[18px] w-auto" />
          <button onClick={signOut} className="text-sm text-gray-500 transition-colors hover:text-gray-900">Sign out</button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 pb-6">
        {/* ── Page header ── */}
        <div className="mt-10 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              {community.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-gray-400">{community.name[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900">{community.name}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${pill.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                  {community.status}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-gray-500">
                {[community.address, community.area].filter(Boolean).join(' · ') || 'No address yet'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setEditing(e => !e); setActionError('') }}
            className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
          >
            {editing ? 'Close' : 'Edit details'}
          </button>
        </div>

        {/* ── Status banner ── */}
        {community.status !== 'active' && (
          <div className={`mt-6 rounded-xl border px-6 py-4 text-sm leading-relaxed ${
            community.status === 'pending' ? 'border-amber-100 bg-amber-50 text-amber-800'
            : community.status === 'rejected' ? 'border-red-100 bg-red-50 text-red-700'
            : 'border-gray-200 bg-gray-50 text-gray-500'
          }`}>
            {community.status === 'pending' && (
              <><span className="font-semibold">Under review.</span> We check every community before its
              code goes live. You&apos;ll get an email as soon as it&apos;s approved.</>
            )}
            {community.status === 'rejected' && (
              <><span className="font-semibold">Not approved yet.</span>{' '}
              {community.review_note ?? 'It does not meet our community guidelines.'}{' '}
              Edit your details and it will be reviewed again.</>
            )}
            {community.status === 'suspended' && (
              <><span className="font-semibold text-gray-900">Suspended.</span> Your community&apos;s code is
              currently disabled. Contact hello@veesaa.co if you think this is a mistake.</>
            )}
          </div>
        )}

        {/* ── Edit details ── */}
        {editing && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-4 px-6 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                {community.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={community.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-gray-400">{community.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={logoBusy}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  {logoBusy ? 'Uploading…' : community.logo_url ? 'Change logo' : 'Upload logo'}
                </button>
                <p className="mt-1.5 text-xs text-gray-400">Square image recommended. Shown wherever members see your community.</p>
                {logoError && <p className="mt-1 text-xs text-red-500">{logoError}</p>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogoFile} />
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-5">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Community name" className="field" />
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Community address" className="field" />
              <input value={area} onChange={e => setArea(e.target.value)} placeholder="Area" className="field" />
              {community.status === 'rejected' && (
                <p className="text-xs text-gray-400">Saving resubmits your community for review.</p>
              )}
              {actionError && <p className="text-sm text-red-500">{actionError}</p>}
              <button onClick={saveDetails} disabled={busy} className="btn-primary self-start">
                {busy ? 'Saving…' : community.status === 'rejected' ? 'Save & resubmit' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* ── Community code ── */}
        <div className="mt-10 rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
            <div className="min-w-0">
              <MicroLabel>Community code</MicroLabel>
              <p className="mt-1.5 font-mono text-3xl font-bold tracking-wide text-gray-900">{community.code}</p>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-gray-400">
                Share this with your members. It&apos;s their access to the community, and the destination its rides are heading to.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyCode}
                className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black active:scale-[0.98]"
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
              <button
                onClick={() => { setChangingCode(c => !c); setActionError(''); setConfirmCode(false) }}
                className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
              >
                {changingCode ? 'Cancel' : 'Change'}
              </button>
            </div>
          </div>

          {changingCode && (
            <div className="border-t border-gray-200 bg-gray-50/60 px-6 py-5">
              <p className="text-sm leading-relaxed text-red-600">
                <span className="font-semibold">Careful:</span> when the code changes, members lose access
                until they enter the new one. Anyone already on a trip keeps it, but nobody can browse
                rides with the old code. You can change the code once every 30 days.
              </p>
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                placeholder="NEW-CODE"
                className="field mt-4 font-mono uppercase"
              />
              <label className="mt-3 flex items-start gap-2 text-sm text-gray-500">
                <input type="checkbox" checked={confirmCode} onChange={e => setConfirmCode(e.target.checked)} className="mt-0.5" />
                I understand members must be told the new code.
              </label>
              {actionError && <p className="mt-2 text-sm text-red-500">{actionError}</p>}
              <button
                onClick={submitCodeChange}
                disabled={busy || !confirmCode || newCode.trim().length < 4}
                className="btn-primary mt-4"
              >
                {busy ? 'Changing…' : 'Change the code'}
              </button>
            </div>
          )}
        </div>

        {live ? (
          <>
            {/* ── Last 30 days ── */}
            <div className="mt-10">
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-bold tracking-tight text-gray-900">Last 30 days</h2>
                <p className="text-sm text-gray-400">{rangeLabel}</p>
              </div>
              <div className="grid overflow-hidden rounded-xl border border-gray-200 bg-white sm:grid-cols-2 lg:grid-cols-4 divide-y divide-gray-200 sm:divide-y lg:divide-y-0 lg:divide-x">
                <BandStat label="Members" value={stats?.members_active ?? 0} />
                <BandStat label="New members" value={stats?.members_new_30d ?? 0} />
                <BandStat label="Ride searches" value={stats?.searches_30d ?? 0} />
                <BandStat label="Unmet searches" value={stats?.unmet_30d ?? 0} accent={(stats?.unmet_30d ?? 0) > 0} />
              </div>

              {(stats?.unmet_30d ?? 0) > 0 && (
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <p className="text-sm leading-relaxed text-gray-500">
                    <span className="font-semibold text-gray-900">
                      {stats?.unmet_30d} search{(stats?.unmet_30d ?? 0) === 1 ? '' : 'es'} found no ride
                    </span>
                    {(stats?.wants_waiting ?? 0) > 0 && <> and {stats?.wants_waiting} member{(stats?.wants_waiting ?? 0) === 1 ? ' is' : 's are'} waiting to be notified</>}.
                    That&apos;s unmet demand: encourage members with cars to offer their routes.
                  </p>
                </div>
              )}
            </div>

            {/* ── All time ── */}
            <div className="mt-10">
              <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">All time</h2>
              <div className="grid overflow-hidden rounded-xl border border-gray-200 bg-white sm:grid-cols-3 divide-y divide-gray-200 sm:divide-y-0 sm:divide-x">
                <BandStat label="Open trips" value={stats?.trips_open ?? 0} />
                <BandStat label="Completed trips" value={stats?.trips_completed ?? 0} />
                <BandStat label="Kilometres shared" value={`${Math.round(stats?.km_shared ?? 0).toLocaleString()} km`} />
              </div>
            </div>

            {/* ── Where members come from ── */}
            <div className="mt-10">
              <h2 className="mb-3 text-lg font-bold tracking-tight text-gray-900">Where members come from</h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-6 py-3">
                  <MicroLabel>Area</MicroLabel>
                  <MicroLabel>Members</MicroLabel>
                </div>
                {areas.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {areas.map((a, i) => (
                      <li key={a.area} className="flex items-center gap-4 px-6 py-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">{a.area}</span>
                        <span className="shrink-0 font-mono text-sm font-semibold text-gray-900">{a.member_count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center px-6 py-10 text-center">
                    <svg className="h-9 w-9 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <circle cx="18" cy="15" r="3" />
                      <path d="M20.2 17.2L22 19" />
                    </svg>
                    <p className="mt-4 max-w-[280px] text-sm leading-relaxed text-gray-500">
                      Appears once at least <span className="font-semibold text-gray-900">3 members from the
                      same area</span> have offered or searched for rides.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-10 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm text-gray-400">Your stats appear here once the community is live.</p>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 py-6">
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} VZA Technologies Limited</p>
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <a href="https://veesaa.co/privacy" className="transition-colors hover:text-gray-900">Privacy Policy</a>
            <span>·</span>
            <a href="https://veesaa.co/terms-of-use" className="transition-colors hover:text-gray-900">Terms of Use</a>
          </div>
        </footer>
      </div>
    </main>
  )
}
