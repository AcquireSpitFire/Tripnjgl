// "/about": Text und Kontakt aus Admin → Site settings → About
import { renderStaticPage } from '@/lib/static-page'
import { SITE_NAME } from '@/lib/seo'
import { mailLink, paragraphs } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function GET() {
  return renderStaticPage({
    template: 'about.html',
    path: '/about',
    title: `About – ${SITE_NAME}`,
    values: (settings) => ({
      aboutText:
        paragraphs(settings.aboutText) ||
        '<p><mark>[About text – fill in under Admin → Site settings → About]</mark></p>',
      contactEmail: mailLink(settings.contactEmail, 'Contact e-mail'),
    }),
  })
}

