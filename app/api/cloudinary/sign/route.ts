import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Signs Cloudinary logo uploads server-side so the API secret never reaches
// the browser. Only signed-in community OWNERS can obtain a signature: the
// caller's token must resolve to a user with a community_owners row (checked
// through RLS, which only lets a user see their own row).
export const runtime = 'nodejs'

const FOLDER = 'veesaa/community-logos'

export async function POST(req: Request) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Uploads are not configured yet.' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!token || !url || !anon) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 })
  }

  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: userData, error } = await supabase.auth.getUser(token)
  if (error || !userData.user) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 })
  }
  const { data: ownerRow } = await supabase
    .from('community_owners').select('id').maybeSingle()
  if (!ownerRow) {
    return NextResponse.json({ error: 'Only community owners can upload a logo.' }, { status: 403 })
  }

  // Cloudinary signature: sha1 of the alphabetically-sorted params + api secret.
  const timestamp = Math.floor(Date.now() / 1000)
  const toSign = `folder=${FOLDER}&timestamp=${timestamp}`
  const signature = createHash('sha1').update(toSign + apiSecret).digest('hex')

  return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder: FOLDER })
}
