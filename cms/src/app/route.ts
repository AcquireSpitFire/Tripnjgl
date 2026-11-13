// "/" – Startseite aus src/templates/index.html
import { renderStaticPage } from '@/lib/static-page'
import { SITE_NAME } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function GET() {
  return renderStaticPage({
    template: 'index.html',
    path: '/',
    title: `${SITE_NAME} – Photo & video exhibitions`,
    // Beschreibung: Site settings → Site description, sonst Standardtext
    jsonLd: (base, description) => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': base + '/#website',
          name: SITE_NAME,
          url: base + '/',
          description,
          inLanguage: 'en',
        },
        {
          '@type': 'Organization',
          '@id': base + '/#organization',
          name: SITE_NAME,
          url: base + '/',
          logo: base + '/favicon.svg',
        },
      ],
    }),
  })
}
