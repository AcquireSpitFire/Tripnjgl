// /sitemap.xml: Startseite, Listen und alle freigeschalteten Ausstellungen
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { escapeHtml } from '@/lib/render-template'
import { findPublicExhibitions, getServerUrl } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function GET() {
  const payload = await getPayload({ config: configPromise })
  const base = getServerUrl(payload)
  const exhibitions = await findPublicExhibitions(payload)

  const entries: { loc: string; lastmod?: string; priority: string }[] = [
    { loc: base + '/', priority: '1.0' },
    { loc: base + '/exhibitions', priority: '0.8' },
    { loc: base + '/events', priority: '0.8' },
    { loc: base + '/archive', priority: '0.5' },
    { loc: base + '/about', priority: '0.3' },
  ]

  for (const exhibition of exhibitions) {
    if (exhibition.locked === false) {
      entries.push({
        loc: base + '/exhibition/' + encodeURIComponent(exhibition.slug),
        lastmod: exhibition.updatedAt?.slice(0, 10),
        priority: '0.7',
      })
    }
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries
      .map(
        (entry) =>
          `  <url><loc>${escapeHtml(entry.loc)}</loc>` +
          (entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : '') +
          `<priority>${entry.priority}</priority></url>`,
      )
      .join('\n') +
    '\n</urlset>\n'

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
