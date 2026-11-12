// "/about"
import { renderStaticPage } from '@/lib/static-page'
import { SITE_NAME } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function GET() {
  return renderStaticPage({
    template: 'about.html',
    path: '/about',
    title: `About – ${SITE_NAME}`,
    description: `About ${SITE_NAME}, Tom's web gallery for photo and video exhibitions.`,
  })
}
