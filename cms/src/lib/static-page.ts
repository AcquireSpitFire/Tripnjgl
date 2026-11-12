// Statische Seiten (Startseite, Exhibitions, Archive, About) aus src/templates
// mit absoluten Canonical-/OG-Angaben ausliefern
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { htmlResponse, jsonForScript, renderTemplate } from './render-template'
import { SITE_DESCRIPTION, SITE_NAME, getServerUrl } from './seo'

type StaticPage = {
  template: string
  path: string
  title: string
  description?: string
  jsonLd?: (base: string) => unknown
}

export async function renderStaticPage(page: StaticPage): Promise<Response> {
  const payload = await getPayload({ config: configPromise })
  const base = getServerUrl(payload)
  const data = page.jsonLd?.(base)

  return htmlResponse(
    renderTemplate(page.template, {
      siteName: SITE_NAME,
      siteUrl: base,
      title: page.title,
      description: page.description || SITE_DESCRIPTION,
      canonical: base + page.path,
      ogImage: base + '/og-default.jpg',
      robots: 'index, follow',
      jsonLd: data ? `<script type="application/ld+json">${jsonForScript(data)}</script>` : '',
    }),
    { cache: 'public, s-maxage=300, stale-while-revalidate=86400' },
  )
}
