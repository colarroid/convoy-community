'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await supabase.auth.resetPasswordForEmail(email)
    setBusy(false)
    setSent(true) // same response either way; never reveal whether the email exists
  }

  // The project's recovery email carries a 6-digit code, not a link.
  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'recovery',
    })
    setBusy(false)
    if (error) {
      setError('That code did not work. Check it and try again.')
      return
    }
    router.replace('/reset-password')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/veesaa-logo-black.svg" alt="Veesaa" className="h-[22px] w-auto mb-6" />
        {sent ? (
          <>
            <h1 className="text-xl font-semibold">Check your email</h1>
            <p className="text-sm text-secondary mt-2 leading-relaxed">
              If an account exists for <span className="font-medium text-primary">{email}</span>, a
              6-digit code is on its way. Enter it below.
            </p>
            <form onSubmit={verify} className="mt-5 flex flex-col gap-3">
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
                {busy ? 'Checking…' : 'Continue'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Reset your password</h1>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="field" />
              <button disabled={busy} className="btn-primary">{busy ? 'Sending…' : 'Send reset code'}</button>
            </form>
          </>
        )}
        <Link href="/login" className="mt-5 inline-block text-sm text-secondary hover:text-primary">Back to sign in</Link>
      </div>
    </main>
  )
}
