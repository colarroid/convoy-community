'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
      },
    })
    setBusy(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  // The project's confirmation email carries a 6-digit code, not a link.
  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'signup',
    })
    setBusy(false)
    if (error) {
      setError('That code did not work. Check it and try again.')
      return
    }
    // verifyOtp signs the user in; go straight to creating the community.
    router.replace('/onboarding')
  }

  const resend = async () => {
    setResending(true)
    setError('')
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/veesaa-logo-black.svg" alt="Veesaa" className="h-[22px] w-auto mx-auto mb-6" />
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="text-sm text-secondary mt-2 leading-relaxed">
            We sent a 6-digit code to <span className="font-medium text-primary">{email}</span>.
            Enter it below to confirm your account.
          </p>

          <form onSubmit={verify} className="mt-6 flex flex-col gap-3">
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="field text-center font-mono text-2xl tracking-[0.5em] h-14"
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button disabled={busy || code.length !== 6} className="btn-primary">
              {busy ? 'Confirming…' : 'Confirm'}
            </button>
          </form>

          <button onClick={resend} disabled={resending} className="mt-4 text-sm text-secondary hover:text-primary transition-colors">
            {resending ? 'Resending…' : "Didn't get it? Resend the code"}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/veesaa-logo-black.svg" alt="Veesaa" className="h-[22px] w-auto" />
          <h1 className="text-xl font-semibold mt-4">Create your community</h1>
          <p className="text-sm text-secondary mt-1 leading-relaxed">
            Set up an owner account first. Your community goes live once Veesaa approves it.
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required className="field" />
            <input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} required className="field" />
          </div>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="field" />
          <input type="password" placeholder="Password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="field" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={busy} className="btn-primary mt-1">{busy ? 'Creating account…' : 'Continue'}</button>
        </form>

        <p className="mt-5 text-sm text-secondary">
          Already have an account? <Link href="/login" className="font-semibold text-primary">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
