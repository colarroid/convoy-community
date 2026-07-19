'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getMyCommunity, getStats, getTopAreas, updateCommunity, changeCode, uploadLogo,
  type OwnedCommunity, type CommunityStats, type TopArea,
} from '@/lib/community'

/*
 * Layout borrowed from the TokenScope telemetry reference: a full-bleed sheet
 * of panels separated by hairline rules (no floating cards), mono micro-labels,
 * section strips, oversized numerals, a ranked areas list and
 * status dots. Rendered in Veesaa's own palette: white paper, near-black ink,
 * gray rules, blue accent.
 */

const RULE = 'border-gray-200'

const STATUS_DOT: Record<string, { glyph: string; label: string; cls: string }> = {
  active: { glyph: '●', label: 'LIVE', cls: 'text-green-600' },
  pending: { glyph: '●', label: 'UNDER REVIEW', cls: 'text-amber-500' },
  rejected: { glyph: '▲', label: 'REJECTED', cls: 'text-red-600' },
  suspended: { glyph: '○', label: 'SUSPENDED', cls: 'text-gray-400' },
}

/** Section strip. */
function SectionStrip({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className={`flex items-center justify-between border-b ${RULE} px-7 py-3`}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.025em] text-gray-900">{title}</p>
      {right}
    </div>
  )
}

function MicroLabel({ children, className = 'text-gray-400' }: { children: React.ReactNode; className?: string }) {
  return <p className={`font-mono text-[10px] font-semibold uppercase tracking-[0.10em] ${className}`}>{children}</p>
}

/** Squared mono action, the reference has no rounded corners. */
const BTN = 'inline-flex items-center justify-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.10em] px-[0.95rem] py-[0.5rem] transition-colors'
const BTN_DARK = `${BTN} bg-gray-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed`
const BTN_GHOST = `${BTN} border ${RULE} text-gray-900 hover:bg-gray-50`

function BandCell({ label, value, accent, last }: {
  label: string; value: string | number; accent?: boolean; last?: boolean
}) {
  return (
    <div className={`border-b ${RULE} p-7 lg:border-b-0 ${last ? '' : 'lg:border-r'}`}>
      <MicroLabel>{label}</MicroLabel>
      <p className={`mt-3 font-mono text-4xl font-bold tracking-tight ${accent ? 'text-red-600' : 'text-gray-900'}`}>
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
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.10em] text-gray-400">Loading…</p>
      </main>
    )
  }

  const live = community.status === 'active'
  const dot = STATUS_DOT[community.status]
  const maxAreaCount = Math.max(1, ...areas.map(a => a.member_count))
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
  const fmtDay = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
  const rangeLabel = `${fmtDay(new Date(Date.now() - 30 * 86400000))} – ${fmtDay(new Date())}`.replace('–', '-')

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className={`mx-auto flex min-h-screen max-w-6xl flex-col border-x ${RULE}`}>

        {/* ── Header bar ── */}
        <header className={`flex items-center justify-between border-b ${RULE} px-7 py-4`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/veesaa-logo-black.svg" alt="Veesaa" className="h-[16px] w-auto" />
          <div className="flex items-center gap-6">
            <span className="hidden font-mono text-[10px] font-semibold tracking-[0.10em] text-gray-400 sm:block">{today}</span>
            <span className={`font-mono text-[10px] font-semibold tracking-[0.10em] ${dot.cls}`}>
              {dot.glyph} {dot.label}
            </span>
            <button onClick={signOut} className="font-mono text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400 transition-colors hover:text-gray-900">
              Sign out
            </button>
          </div>
        </header>

        {/* ── Status banner ── */}
        {community.status !== 'active' && (
          <div className={`border-b ${RULE} px-7 py-4 text-sm leading-relaxed ${
            community.status === 'pending' ? 'bg-amber-50 text-amber-800'
            : community.status === 'rejected' ? 'bg-red-50 text-red-700'
            : 'bg-gray-50 text-gray-500'
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

        {/* ── Community ── */}
        <SectionStrip title="Community"
          right={
            <button onClick={() => { setEditing(e => !e); setActionError('') }} className={BTN_GHOST}>
              {editing ? 'Close' : 'Edit details'}
            </button>
          }
        />
        <section className={`grid border-b ${RULE} lg:grid-cols-[1fr_minmax(380px,38%)]`}>
          {/* Identity */}
          <div className={`border-b ${RULE} p-7 lg:border-b-0 lg:border-r`}>
            <div className="flex items-center gap-5">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border ${RULE} bg-white`}>
                {community.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={community.logo_url} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="font-mono text-xl font-bold text-gray-300">{community.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight">{community.name}</h1>
                <p className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.08em] text-gray-400">
                  {[community.address, community.area].filter(Boolean).join(' · ') || 'No address yet'}
                </p>
              </div>
            </div>

            {editing && (
              <div className={`mt-7 border-t ${RULE} pt-6`}>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={logoBusy} className={BTN_GHOST}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/upload.svg" alt="" className="h-3.5 w-3.5" />
                    {logoBusy ? 'Uploading…' : community.logo_url ? 'Change logo' : 'Upload logo'}
                  </button>
                  <p className="text-xs text-gray-400">Any shape, shown in full.</p>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogoFile} />
                </div>
                {logoError && <p className="mt-2 text-xs text-red-500">{logoError}</p>}

                <div className="mt-5 flex flex-col gap-3">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Community name" className="field-square" />
                  <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Community address" className="field-square" />
                  <input value={area} onChange={e => setArea(e.target.value)} placeholder="Area" className="field-square" />
                  {community.status === 'rejected' && (
                    <p className="text-xs text-gray-400">Saving resubmits your community for review.</p>
                  )}
                  {actionError && !changingCode && <p className="text-sm text-red-500">{actionError}</p>}
                  <button onClick={saveDetails} disabled={busy} className={`${BTN_DARK} self-start`}>
                    {busy ? 'Saving…' : community.status === 'rejected' ? 'Save & resubmit' : 'Save changes'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Code */}
          <div className="p-7">
            <div className="flex items-baseline justify-between">
              <MicroLabel>Community code</MicroLabel>
              <button
                onClick={() => { setChangingCode(c => !c); setActionError(''); setConfirmCode(false) }}
                className={BTN_GHOST}
              >
                {changingCode ? 'Cancel' : 'Change'}
              </button>
            </div>
            <p className="mt-3 font-mono text-4xl font-bold tracking-tight">{community.code}</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-400">
              Share this with your members. It&apos;s their access to the community, and the destination its rides are heading to.
            </p>
            <button onClick={copyCode} className={`${BTN_DARK} mt-5`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/copy.svg" alt="" className="h-3.5 w-3.5 invert" />
              {copied ? 'Copied ✓' : 'Copy code'}
            </button>

            {changingCode && (
              <div className={`mt-6 border-t ${RULE} pt-5`}>
                <p className="text-sm leading-relaxed text-red-600">
                  <span className="font-semibold">Careful:</span> when the code changes, members lose access
                  until they enter the new one. Anyone already on a trip keeps it, but nobody can browse
                  rides with the old code. You can only change the code once every 30 days.
                </p>
                <input
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase())}
                  placeholder="NEW-CODE"
                  className="field-square mt-4 font-mono uppercase"
                />
                <label className="mt-3 flex items-start gap-2 text-sm text-gray-500">
                  <input type="checkbox" checked={confirmCode} onChange={e => setConfirmCode(e.target.checked)} className="mt-0.5" />
                  I understand members must be told the new code.
                </label>
                {actionError && <p className="mt-2 text-sm text-red-500">{actionError}</p>}
                <button
                  onClick={submitCodeChange}
                  disabled={busy || !confirmCode || newCode.trim().length < 4}
                  className={`${BTN_DARK} mt-4`}
                >
                  {busy ? 'Changing…' : 'Change the code'}
                </button>
              </div>
            )}
          </div>
        </section>

        {live ? (
          <>
            {/* ── Last 30 days ── */}
            <SectionStrip title="Last 30 days"
              right={<span className="font-mono text-[10px] font-semibold tracking-[0.10em] text-gray-400">{rangeLabel}</span>} />
            <section className={`grid border-b ${RULE} lg:grid-cols-4`}>
              <BandCell label="Members" value={stats?.members_active ?? 0} />
              <BandCell label="New members" value={stats?.members_new_30d ?? 0} />
              <BandCell label="Ride searches" value={stats?.searches_30d ?? 0} />
              <BandCell label="Unmet searches" value={stats?.unmet_30d ?? 0} accent={(stats?.unmet_30d ?? 0) > 0} last />
            </section>
            {(stats?.unmet_30d ?? 0) > 0 && (
              <div className={`flex items-start gap-3 border-b ${RULE} bg-red-50/50 px-7 py-4`}>
                <span className="mt-0.5 font-mono text-[11px] text-red-600">●</span>
                <p className="text-sm leading-relaxed text-gray-600">
                  <span className="font-semibold text-gray-900">
                    {stats?.unmet_30d} search{(stats?.unmet_30d ?? 0) === 1 ? '' : 'es'} found no ride
                  </span>
                  {(stats?.wants_waiting ?? 0) > 0 && <> and {stats?.wants_waiting} member{(stats?.wants_waiting ?? 0) === 1 ? ' is' : 's are'} waiting to be notified</>}.
                  That&apos;s unmet demand: encourage members with cars to offer their routes.
                </p>
              </div>
            )}

            {/* ── All time ── */}
            <SectionStrip title="All time" />
            <section className={`grid border-b ${RULE} lg:grid-cols-3`}>
              <BandCell label="Open trips" value={stats?.trips_open ?? 0} />
              <BandCell label="Completed trips" value={stats?.trips_completed ?? 0} />
              <BandCell label="Kilometres shared" value={`${Math.round(stats?.km_shared ?? 0).toLocaleString()} km`} last />
            </section>

            {/* ── Where members come from ── */}
            <SectionStrip title="Where members come from"
              right={<span className="font-mono text-[10px] font-semibold tracking-[0.10em] text-gray-400">{areas.length > 0 ? `${areas.length} AREA${areas.length === 1 ? '' : 'S'}` : 'AWAITING DATA'}</span>} />
            <section className={`border-b ${RULE}`}>
              {areas.length > 0 ? (
                areas.map((a, i) => {
                  const pct = Math.round((a.member_count / maxAreaCount) * 100)
                  return (
                    <div key={a.area} className={`flex items-center gap-6 px-7 py-5 ${i < areas.length - 1 ? `border-b ${RULE}` : ''}`}>
                      <span className="w-8 shrink-0 font-mono text-sm font-semibold text-gray-300">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold tracking-tight">{a.area}</p>
                        <p className="mt-0.5 font-mono text-[10px] font-semibold tracking-[0.10em] text-gray-400">
                          {pct}% OF TOP AREA
                        </p>
                      </div>
                      <div className="hidden h-1 w-40 shrink-0 overflow-hidden bg-gray-100 sm:block">
                        <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="shrink-0 font-mono text-xl font-bold tracking-tight">{a.member_count}</p>
                    </div>
                  )
                })
              ) : (
                <div className="px-7 py-14 text-center">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.10em] text-gray-300">Awaiting data</p>
                  <p className="mx-auto mt-3 max-w-[300px] text-sm leading-relaxed text-gray-500">
                    Appears once at least <span className="font-semibold text-gray-900">3 members from the
                    same area</span> have offered or searched for rides.
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <SectionStrip title="Stats" />
            <div className={`border-b ${RULE} px-7 py-16 text-center`}>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.10em] text-gray-300">
                Stats appear once your community is live
              </p>
            </div>
          </>
        )}

        {/* ── Footer ── */}
        <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 px-7 py-4">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} VZA Technologies Limited</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <a href="https://veesaa.co/privacy" className="transition-colors hover:text-gray-900">Privacy Policy</a>
            <span>·</span>
            <a href="https://veesaa.co/terms-of-use" className="transition-colors hover:text-gray-900">Terms of Use</a>
          </div>
        </footer>
      </div>
    </main>
  )
}
