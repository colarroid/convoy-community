import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#171717',
        secondary: '#6B7280',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        subtle: '#F4F4F5',
      },
    },
  },
  plugins: [],
}
export default config
