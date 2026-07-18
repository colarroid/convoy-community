'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getMyCommunity, getStats, getTopAreas, updateCommunity, changeCode, uploadLogo,
  type OwnedCommunity, type CommunityStats, type TopArea,
} from '@/lib/community'

const STATUS_CHIP: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  active: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
  suspended: 'bg-subtle text-secondary',
}

/** Quiet uppercase section label. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">{children}</p>
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-5">
      <p className={`text-3xl font-bold tracking-tight ${accent ? 'text-red-600' : 'text-primary'}`}>{value}</p>
      <p className="mt-1 text-xs text-secondary leading-snug">{label}</p>
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
    return <main className="min-h-screen flex items-center justify-center text-sm text-secondary">Loading…</main>
  }

  const live = community.status === 'active'
  const maxAreaCount = Math.max(1, ...areas.map(a => a.member_count))

  return (
    <main className="min-h-screen pb-20">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#FAFAFA]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/veesaa-logo-black.svg" alt="Veesaa" className="h-[18px] w-auto" />
          <button onClick={signOut} className="text-sm text-secondary transition-colors hover:text-primary">Sign out</button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6">
        {/* ── Status banner ── */}
        {community.status !== 'active' && (
          <div className={`mt-8 rounded-2xl px-5 py-4 text-sm leading-relaxed ${
            community.status === 'pending' ? 'bg-amber-50 text-amber-800'
            : community.status === 'rejected' ? 'bg-red-50 text-red-700'
            : 'bg-subtle text-secondary'
          }`}>
            {community.status === 'pending' && (
              <><span className="font-semibold">Under review.</span> We check every community before its
              code goes live. You&apos;ll get an email as soon as it&apos;s approved.</>
            )}
            {community.status === 'rejected' && (
              <><span className="font-semibold">Not approved yet.</span>{' '}
              {community.review_note ?? 'It does not meet our community guidelines.'}{' '}
              Edit your details below and it will be reviewed again.</>
            )}
            {community.status === 'suspended' && (
              <><span className="font-semibold text-primary">Suspended.</span> Your community&apos;s code is
              currently disabled. Contact hello@veesaa.co if you think this is a mistake.</>
            )}
          </div>
        )}

        {/* ── Identity ── */}
        <div className="mt-10 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface ring-1 ring-black/5">
              {community.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-secondary">{community.name[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="truncate text-2xl font-bold tracking-tight text-primary">{community.name}</h1>
                <span className={`chip capitalize ${STATUS_CHIP[community.status]}`}>{community.status}</span>
              </div>
              <p className="mt-0.5 truncate text-sm text-secondary">
                {[community.address, community.area].filter(Boolean).join(' · ') || 'No address yet'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setEditing(e => !e); setActionError('') }}
            className="shrink-0 text-sm font-semibold text-secondary transition-colors hover:text-primary"
          >
            {editing ? 'Close' : 'Edit details'}
          </button>
        </div>

        {/* ── Edit details ── */}
        {editing && (
          <div className="mt-5 rounded-2xl bg-surface p-5 ring-1 ring-black/5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-subtle ring-1 ring-black/5">
                {community.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={community.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold text-secondary">{community.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <div>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={logoBusy} className="btn-secondary h-10">
                  {logoBusy ? 'Uploading…' : community.logo_url ? 'Change logo' : 'Upload logo'}
                </button>
                <p className="mt-1.5 text-xs text-secondary">Square image recommended. Shown wherever members see your community.</p>
                {logoError && <p className="mt-1 text-xs text-red-500">{logoError}</p>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogoFile} />
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-black/5 pt-5">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Community name" className="field" />
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Community address" className="field" />
              <input value={area} onChange={e => setArea(e.target.value)} placeholder="Area" className="field" />
              {community.status === 'rejected' && (
                <p className="text-xs text-secondary">Saving resubmits your community for review.</p>
              )}
              {actionError && <p className="text-sm text-red-500">{actionError}</p>}
              <button onClick={saveDetails} disabled={busy} className="btn-primary self-start">
                {busy ? 'Saving…' : community.status === 'rejected' ? 'Save & resubmit' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {/* ── The code: the one thing an owner shares ── */}
        <div className="mt-8 overflow-hidden rounded-3xl bg-black text-white">
          <div className="px-7 pb-7 pt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">Community code</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <p className="font-mono text-4xl font-bold tracking-wide">{community.code}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gray-100 active:scale-[0.98]"
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
                <button
                  onClick={() => { setChangingCode(c => !c); setActionError(''); setConfirmCode(false) }}
                  className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:text-white"
                >
                  {changingCode ? 'Cancel' : 'Change'}
                </button>
              </div>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/50">
              Share this with your members. It&apos;s their access to the community, and the destination its rides are heading to.
            </p>
          </div>

          {changingCode && (
            <div className="border-t border-white/10 bg-white/[0.04] px-7 py-6">
              <p className="text-sm leading-relaxed text-red-300">
                <span className="font-semibold">Careful:</span> when the code changes, members lose access
                until they enter the new one. Anyone already on a trip keeps it, but nobody can browse
                rides with the old code. You can change the code once every 30 days.
              </p>
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                placeholder="NEW-CODE"
                className="mt-4 h-11 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 font-mono text-sm uppercase text-white placeholder-white/30 focus:border-white/40 focus:outline-none"
              />
              <label className="mt-3 flex items-start gap-2 text-sm text-white/60">
                <input type="checkbox" checked={confirmCode} onChange={e => setConfirmCode(e.target.checked)} className="mt-0.5" />
                I understand members must be told the new code.
              </label>
              {actionError && <p className="mt-2 text-sm text-red-300">{actionError}</p>}
              <button
                onClick={submitCodeChange}
                disabled={busy || !confirmCode || newCode.trim().length < 4}
                className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Changing…' : 'Change the code'}
              </button>
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        {live ? (
          <>
            <div className="mt-12">
              <SectionLabel>Last 30 days</SectionLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Members with your code" value={stats?.members_active ?? 0} />
                <Stat label="New members" value={stats?.members_new_30d ?? 0} />
                <Stat label="Ride searches" value={stats?.searches_30d ?? 0} />
                <Stat label="Searches that found nothing" value={stats?.unmet_30d ?? 0} accent={(stats?.unmet_30d ?? 0) > 0} />
              </div>

              {(stats?.unmet_30d ?? 0) > 0 && (
                <div className="mt-3 flex items-start gap-3 rounded-2xl bg-surface p-5 ring-1 ring-black/5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                  <p className="text-sm leading-relaxed text-secondary">
                    <span className="font-semibold text-primary">
                      {stats?.unmet_30d} search{(stats?.unmet_30d ?? 0) === 1 ? '' : 'es'} found no ride
                    </span>
                    {(stats?.wants_waiting ?? 0) > 0 && <> and {stats?.wants_waiting} member{(stats?.wants_waiting ?? 0) === 1 ? ' is' : 's are'} waiting to be notified</>}.
                    That&apos;s unmet demand: encourage members with cars to offer their routes.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div>
                <SectionLabel>All time</SectionLabel>
                <div className="rounded-2xl bg-surface p-5 ring-1 ring-black/5">
                  <dl className="grid grid-cols-[1fr_auto] gap-y-3 text-sm">
                    <dt className="text-secondary">Open trips</dt>
                    <dd className="font-bold tracking-tight text-primary">{stats?.trips_open ?? 0}</dd>
                    <dt className="text-secondary">Completed trips</dt>
                    <dd className="font-bold tracking-tight text-primary">{stats?.trips_completed ?? 0}</dd>
                    <dt className="text-secondary">Kilometres shared</dt>
                    <dd className="font-bold tracking-tight text-primary">{Math.round(stats?.km_shared ?? 0).toLocaleString()} km</dd>
                  </dl>
                </div>
              </div>

              <div>
                <SectionLabel>Where members come from</SectionLabel>
                <div className="rounded-2xl bg-surface p-5 ring-1 ring-black/5">
                  {areas.length > 0 ? (
                    <ul className="grid gap-3.5">
                      {areas.map((a) => (
                        <li key={a.area}>
                          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                            <span className="truncate font-medium text-primary">{a.area}</span>
                            <span className="shrink-0 text-secondary">{a.member_count}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.round((a.member_count / maxAreaCount) * 100)}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-relaxed text-secondary">
                      Appears once at least 3 members from the same area have offered or searched for rides.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-12 rounded-2xl bg-surface py-12 text-center ring-1 ring-black/5">
            <p className="text-sm text-secondary">Your stats appear here once the community is live.</p>
          </div>
        )}
      </div>
    </main>
  )
}
