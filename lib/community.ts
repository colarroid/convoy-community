import { supabase } from './supabase'

export interface OwnedCommunity {
  id: string
  code: string
  name: string
  address: string | null
  area: string | null
  country: string | null
  logo_url: string | null
  status: 'pending' | 'active' | 'rejected' | 'suspended'
  review_note: string | null
  code_changed_at: string | null
  created_at: string
}

export interface CommunityStats {
  members_active: number
  members_new_30d: number
  searches_30d: number
  unmet_30d: number
  wants_waiting: number
  trips_open: number
  trips_completed: number
  km_shared: number
}

export interface TopArea { area: string; member_count: number }

/** Supabase errors are plain objects; rethrow as real Errors so messages surface. */
function unwrap<T>(data: T, error: { message?: string } | null): T {
  if (error) throw new Error(error.message || 'Something went wrong. Please try again.')
  return data
}

export async function getMyCommunity(): Promise<OwnedCommunity | null> {
  const { data, error } = await supabase.rpc('get_my_owned_community')
  if (error) throw new Error(error.message)
  // set-returning single: null id means no community yet
  const row = data as OwnedCommunity | null
  return row && row.id ? row : null
}

export async function isCodeAvailable(code: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_code_available', { p_code: code })
  if (error) return true // availability is re-checked on submit; don't block typing
  return !!data
}

export async function createCommunity(params: {
  name: string; code: string; address?: string; area?: string; country?: string
}): Promise<OwnedCommunity> {
  const { data, error } = await supabase.rpc('create_my_community', {
    p_name: params.name,
    p_code: params.code,
    p_address: params.address ?? null,
    p_area: params.area ?? null,
    p_country: params.country ?? null,
  })
  return unwrap(data as OwnedCommunity, error)
}

export async function updateCommunity(params: {
  name?: string; address?: string; area?: string
}): Promise<OwnedCommunity> {
  const { data, error } = await supabase.rpc('update_my_community', {
    p_name: params.name ?? null,
    p_address: params.address ?? null,
    p_area: params.area ?? null,
  })
  return unwrap(data as OwnedCommunity, error)
}

export async function changeCode(code: string): Promise<OwnedCommunity> {
  const { data, error } = await supabase.rpc('change_my_community_code', { p_code: code })
  return unwrap(data as OwnedCommunity, error)
}

export async function getStats(): Promise<CommunityStats | null> {
  const { data, error } = await supabase.rpc('get_my_community_stats')
  if (error) return null
  const rows = data as CommunityStats[]
  return rows?.[0] ?? null
}

export async function getTopAreas(): Promise<TopArea[]> {
  const { data, error } = await supabase.rpc('get_my_community_top_areas')
  if (error) return []
  return (data as TopArea[]) ?? []
}
