import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  // Die Seiten liegen als Vorlagen in src/templates und werden von Route Handlern
  // (src/app/**/route.ts) mit Meta-Daten ausgeliefert; public/ enthält nur CSS, JS, Bilder.
  async redirects() {
    return [
      // Alte Links weiterleiten (/exhibition.html?id=… erledigt src/app/exhibition.html/route.ts)
      { source: '/events.html', destination: '/events', permanent: true },
      { source: '/exhibitions.html', destination: '/exhibitions', permanent: true },
      { source: '/archive.html', destination: '/archive', permanent: true },
      { source: '/about.html', destination: '/about', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        // Sicherheits-Header für alle Antworten
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
      {
        // Mediendateien ändern sich unter einer URL nicht (neue Datei = neuer Name)
        source: '/api/media/file/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path(css|js)/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
    ]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
