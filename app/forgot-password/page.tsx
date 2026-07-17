'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    setSent(true) // same response either way; never reveal whether the email exists
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
              If an account exists for <span className="font-medium text-primary">{email}</span>, a reset link is on its way.
            </p>
            <Link href="/login" className="btn-secondary mt-6">Back to sign in</Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Reset your password</h1>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="field" />
              <button disabled={busy} className="btn-primary">{busy ? 'Sending…' : 'Send reset link'}</button>
            </form>
            <Link href="/login" className="mt-5 inline-block text-sm text-secondary hover:text-primary">Back to sign in</Link>
          </>
        )}
      </div>
    </main>
  )
}
