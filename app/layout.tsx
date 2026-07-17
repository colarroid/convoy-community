import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Veesaa Communities',
  description: 'Create and manage your community on Veesaa: your code, your members, and the demand you can act on.',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
  },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
