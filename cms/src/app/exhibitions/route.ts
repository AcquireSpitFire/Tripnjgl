// "/exhibitions" – Liste aller freigeschalteten Ausstellungen
import { renderStaticPage } from '@/lib/static-page'
import { SITE_NAME } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function GET() {
  return renderStaticPage({
    template: 'exhibitions.html',
    path: '/exhibitions',
    title: `Exhibitions – ${SITE_NAME}`,
    description: `All photo and video exhibitions on ${SITE_NAME}: trips, nights out and everything in between.`,
  })
}
