'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const verified = params.get('verified') === '1'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setBusy(false)
      setError(error.message === 'Email not confirmed'
        ? 'Please confirm your email first. Check your inbox for the link.'
        : 'Wrong email or password.')
      return
    }
    router.replace('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/veesaa-logo-black.svg" alt="Veesaa" className="h-[22px] w-auto" />
          <p className="text-sm text-secondary mt-3">Community dashboard sign in</p>
        </div>

        {verified && (
          <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            Email confirmed. Sign in to continue.
          </p>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="field" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" className="field" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={busy} className="btn-primary mt-1">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-secondary hover:text-primary">Forgot password?</Link>
          <Link href="/signup" className="font-semibold text-primary">Create your community</Link>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginInner /></Suspense>
}
