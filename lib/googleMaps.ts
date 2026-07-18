/* eslint-disable @typescript-eslint/no-explicit-any */

let loading: Promise<any> | null = null

/** Load the Google Maps JS API (Places library) once, shared across the app. */
export function loadGoogleMaps(): Promise<any> {
  const w = window as any
  if (w.google?.maps?.places) return Promise.resolve(w.google)
  if (loading) return loading

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!key) return Promise.reject(new Error('Maps key missing'))

  loading = new Promise((resolve, reject) => {
    const cbName = '__veesaaCommunityMapsInit'
    w[cbName] = () => resolve(w.google)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async&callback=${cbName}`
    s.async = true
    s.onerror = () => reject(new Error('Maps failed to load'))
    document.head.appendChild(s)
  })
  return loading
}
