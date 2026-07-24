/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Vercel always publishes the project on a .vercel.app production URL that
      // cannot be removed, so the dashboard is reachable on a second host. Send
      // it to the canonical domain.
      //
      // Matched on the exact production alias rather than *.vercel.app, so
      // preview deployments keep working.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'convoy-community-two.vercel.app' }],
        destination: 'https://community.veesaa.co/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
