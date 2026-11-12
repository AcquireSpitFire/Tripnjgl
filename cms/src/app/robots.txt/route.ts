// /robots.txt: Admin und API nicht crawlen, Sitemap bekannt machen
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getServerUrl } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function GET() {
  const payload = await getPayload({ config: configPromise })
  const base = getServerUrl(payload)

  const text = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api', '', `Sitemap: ${base}/sitemap.xml`, ''].join(
    '\n',
  )

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400',
    },
  })
}
