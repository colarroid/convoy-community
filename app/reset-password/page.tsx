'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { setError(error.message); return }
    router.replace('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/veesaa-logo-black.svg" alt="Veesaa" className="h-[22px] w-auto mb-6" />
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <input type="password" placeholder="New password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="field" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save password'}</button>
        </form>
      </div>
    </main>
  )
}
