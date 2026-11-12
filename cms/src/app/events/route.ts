// /events: liefert src/templates/events.html mit JSON-LD aller kommenden Ausstellungen.
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { htmlResponse, jsonForScript, renderTemplate } from '@/lib/render-template'
import { SITE_NAME, eventJsonLd, findPublicExhibitions, getServerUrl, isUpcoming } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function GET() {
  const payload = await getPayload({ config: configPromise })
  const base = getServerUrl(payload)
  const upcoming = (await findPublicExhibitions(payload)).filter(isUpcoming)

  const jsonLd = upcoming.length
    ? `<script type="application/ld+json">${jsonForScript({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Upcoming exhibitions – ' + SITE_NAME,
        itemListElement: upcoming.map((exhibition, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: { '@context': 'https://schema.org', ...eventJsonLd(exhibition, base) },
        })),
      })}</script>`
    : ''

  return htmlResponse(
    renderTemplate('events.html', {
      siteName: SITE_NAME,
      siteUrl: base,
      canonical: base + '/events',
      ogImage: base + '/og-default.jpg',
      jsonLd,
    }),
  )
}
