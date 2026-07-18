'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getMyCommunity, getStats, getTopAreas, updateCommunity, changeCode,
  type OwnedCommunity, type CommunityStats, type TopArea,
} from '@/lib/community'

const STATUS_CHIP: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600',
  active: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
  suspended: 'bg-subtle text-secondary',
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? 'text-red-600' : 'text-primary'}`}>{value}</p>
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

  const copyCode = async () => {
    if (!community) return
    try { await navigator.clipboard.writeText(community.code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* noop */ }
  }

  if (loading || !community) {
    return <main className="min-h-screen flex items-center justify-center text-sm text-secondary">Loading…</main>
  }

  const live = community.status === 'active'

  return (
    <main className="min-h-screen">
      {/* ── Top bar ── */}
      <header className="bg-surface border-b border-border">
        <div className="mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/veesaa-logo-black.svg" alt="Veesaa" className="h-[18px] w-auto" />
          <button onClick={signOut} className="text-sm text-secondary hover:text-primary transition-colors">Sign out</button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* ── Status banners ── */}
        {community.status === 'pending' && (
          <div className="mb-6 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-800 leading-relaxed">
            <span className="font-semibold">Under review.</span> We check every community before its code
            goes live. You&apos;ll get an email as soon as it&apos;s approved.
          </div>
        )}
        {community.status === 'rejected' && (
          <div className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700 leading-relaxed">
            <span className="font-semibold">Not approved yet.</span>{' '}
            {community.review_note ?? 'It does not meet our community guidelines.'}{' '}
            Edit your details below and it will be reviewed again.
          </div>
        )}
        {community.status === 'suspended' && (
          <div className="mb-6 rounded-2xl bg-subtle px-5 py-4 text-sm text-secondary leading-relaxed">
            <span className="font-semibold text-primary">Suspended.</span> Your community&apos;s code is
            currently disabled. Contact hello@veesaa.co if you think this is a mistake.
          </div>
        )}

        {/* ── Community card ── */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-semibold tracking-tight truncate">{community.name}</h1>
                <span className={`chip capitalize ${STATUS_CHIP[community.status]}`}>{community.status}</span>
              </div>
              {community.address && <p className="text-sm text-secondary mt-1">{community.address}</p>}
              {community.area && <p className="text-sm text-secondary">{community.area}</p>}
            </div>
            <button onClick={() => { setEditing(e => !e); setActionError('') }} className="btn-secondary">
              {editing ? 'Close' : 'Edit details'}
            </button>
          </div>

          {editing && (
            <div className="mt-5 border-t border-border pt-5 flex flex-col gap-3">
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
          )}

          {/* ── Code ── */}
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-xs text-secondary mb-1.5">Community code, the key members enter and the destination it stands for</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-xl bg-subtle px-4 py-2.5 font-mono text-lg font-semibold tracking-wide">{community.code}</span>
              <button onClick={copyCode} className="btn-secondary h-10">{copied ? 'Copied ✓' : 'Copy'}</button>
              <button onClick={() => { setChangingCode(c => !c); setActionError(''); setConfirmCode(false) }} className="text-sm text-secondary hover:text-primary transition-colors">
                {changingCode ? 'Cancel' : 'Change code'}
              </button>
            </div>

            {changingCode && (
              <div className="mt-4 rounded-2xl border border-border p-4">
                <p className="text-sm text-red-600 leading-relaxed">
                  <span className="font-semibold">Careful:</span> when the code changes, members lose access
                  until they enter the new one. Anyone already on a trip keeps it, but nobody can browse
                  rides with the old code. You can change the code once every 30 days.
                </p>
                <input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())}
                  placeholder="New code" className="field font-mono uppercase mt-3" />
                <label className="mt-3 flex items-start gap-2 text-sm text-secondary">
                  <input type="checkbox" checked={confirmCode} onChange={e => setConfirmCode(e.target.checked)} className="mt-0.5" />
                  I understand members must be told the new code.
                </label>
                {actionError && <p className="mt-2 text-sm text-red-500">{actionError}</p>}
                <button onClick={submitCodeChange} disabled={busy || !confirmCode || newCode.trim().length < 4}
                  className="btn-primary mt-3">
                  {busy ? 'Changing…' : 'Change the code'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        {live ? (
          <>
            <h2 className="text-sm font-semibold mb-3">Last 30 days</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Members with your code" value={stats?.members_active ?? 0} />
              <Stat label="New members" value={stats?.members_new_30d ?? 0} />
              <Stat label="Ride searches" value={stats?.searches_30d ?? 0} />
              <Stat label="Searches that found nothing" value={stats?.unmet_30d ?? 0} accent={(stats?.unmet_30d ?? 0) > 0} />
            </div>

            {(stats?.unmet_30d ?? 0) > 0 && (
              <p className="mt-3 rounded-2xl bg-red-50 px-5 py-3.5 text-sm text-red-700 leading-relaxed">
                <span className="font-semibold">{stats?.unmet_30d} search{(stats?.unmet_30d ?? 0) === 1 ? '' : 'es'} found no ride</span>
                {(stats?.wants_waiting ?? 0) > 0 && <> and {stats?.wants_waiting} member{(stats?.wants_waiting ?? 0) === 1 ? ' is' : 's are'} waiting to be notified</>}.
                That is unmet demand: encourage members with cars to offer their routes.
              </p>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="card">
                <h3 className="text-sm font-semibold mb-3">All time</h3>
                <dl className="text-sm grid grid-cols-[1fr_auto] gap-y-2">
                  <dt className="text-secondary">Open trips</dt><dd className="font-semibold">{stats?.trips_open ?? 0}</dd>
                  <dt className="text-secondary">Completed trips</dt><dd className="font-semibold">{stats?.trips_completed ?? 0}</dd>
                  <dt className="text-secondary">Kilometres shared</dt><dd className="font-semibold">{Math.round(stats?.km_shared ?? 0).toLocaleString()} km</dd>
                </dl>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold mb-3">Where members come from</h3>
                {areas.length > 0 ? (
                  <ul className="text-sm grid gap-2">
                    {areas.map((a, i) => (
                      <li key={a.area} className="flex items-center justify-between">
                        <span className="text-secondary">{i + 1}. {a.area}</span>
                        <span className="font-semibold">{a.member_count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-secondary leading-relaxed">
                    Appears once at least 3 members from the same area have offered or searched for rides.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="card text-center py-10">
            <p className="text-sm text-secondary">Your stats appear here once the community is live.</p>
          </div>
        )}
      </div>
    </main>
  )
}
