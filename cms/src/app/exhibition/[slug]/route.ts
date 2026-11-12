// /exhibition/<id>: liefert src/templates/exhibition.html mit Titel, Beschreibung,
// Vorschaubild und JSON-LD der Ausstellung. Den Inhalt rendert weiterhin
// public/js/exhibition.js im Browser (aus sessionStorage oder der API).
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { htmlResponse, jsonForScript, renderTemplate, summarize } from '@/lib/render-template'
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  absolute,
  asMedia,
  eventJsonLd,
  findPublicExhibitions,
  getServerUrl,
  imageUrl,
  isUpcoming,
} from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })
  const base = getServerUrl(payload)

  const common = {
    siteName: SITE_NAME,
    siteUrl: base,
    ogImageDefault: base + '/og-default.jpg',
  }

  if (!/^[a-z0-9-]+$/i.test(slug)) {
    return htmlResponse(
      renderTemplate('exhibition.html', {
        ...common,
        title: 'Exhibition not found – ' + SITE_NAME,
        description: SITE_DESCRIPTION,
        canonical: base + '/exhibition/' + encodeURIComponent(slug),
        ogImage: common.ogImageDefault,
        robots: 'noindex',
        jsonLd: '',
      }),
      { status: 404, cache: 'no-store' },
    )
  }

  const [exhibition] = await findPublicExhibitions(payload, { slug: { equals: slug } })

  if (!exhibition) {
    return htmlResponse(
      renderTemplate('exhibition.html', {
        ...common,
        title: 'Exhibition not found – ' + SITE_NAME,
        description: SITE_DESCRIPTION,
        canonical: base + '/exhibition/' + encodeURIComponent(slug),
        ogImage: common.ogImageDefault,
        robots: 'noindex',
        jsonLd: '',
      }),
      { status: 404, cache: 'no-store' },
    )
  }

  const locked = exhibition.locked !== false
  const canonical = base + '/exhibition/' + encodeURIComponent(exhibition.slug)
  const poster = asMedia(exhibition.posters?.[0])
  const frontPage = asMedia(exhibition.frontPage)
  const ogImage = absolute(base, imageUrl(poster) || imageUrl(frontPage)) || common.ogImageDefault
  const description = summarize(
    exhibition.description ||
      [exhibition.theme, SITE_DESCRIPTION].filter(Boolean).join(' – '),
  )

  const graph: Record<string, unknown>[] = []

  if (!locked) {
    const images = (exhibition.medien || [])
      .map((row) => absolute(base, imageUrl(asMedia(row.file), 'large')))
      .filter(Boolean)

    graph.push({
      '@type': 'ImageGallery',
      name: exhibition.titel,
      description: description || undefined,
      url: canonical,
      image: images,
      about: exhibition.theme || undefined,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: base },
    })
  }

  if (isUpcoming(exhibition)) {
    graph.push(eventJsonLd(exhibition, base))
  }

  const jsonLd = graph.length
    ? `<script type="application/ld+json">${jsonForScript({ '@context': 'https://schema.org', '@graph': graph })}</script>`
    : ''

  return htmlResponse(
    renderTemplate('exhibition.html', {
      ...common,
      title: `${exhibition.titel}${exhibition.theme ? ' – ' + exhibition.theme : ''} – ${SITE_NAME}`,
      description,
      canonical,
      ogImage,
      robots: locked ? 'noindex, follow' : 'index, follow',
      jsonLd,
    }),
  )
}
