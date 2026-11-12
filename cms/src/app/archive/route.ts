// "/archive" – Poster vergangener Ausstellungen
import { renderStaticPage } from '@/lib/static-page'
import { SITE_NAME } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function GET() {
  return renderStaticPage({
    template: 'archive.html',
    path: '/archive',
    title: `Archive – ${SITE_NAME}`,
    description: `Posters and dates of past ${SITE_NAME} exhibitions.`,
  })
}
