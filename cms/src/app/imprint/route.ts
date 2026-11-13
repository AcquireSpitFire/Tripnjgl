// "/imprint": Impressum aus Admin → Site settings → Legal notice
import { renderStaticPage } from '@/lib/static-page'
import { SITE_NAME } from '@/lib/seo'
import { escapeHtml } from '@/lib/render-template'
import { lines, mailLink, optional, paragraphs, required } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function GET() {
  return renderStaticPage({
    template: 'imprint.html',
    path: '/imprint',
    title: `Legal notice – ${SITE_NAME}`,
    description: `Legal notice (Impressum) of ${SITE_NAME}: operator, address and contact.`,
    values: (settings) => {
      const austria = settings.jurisdiction === 'at'
      const name = required(settings.operatorName, 'Name')
      const extra = lines(settings.legalExtra)

      return {
        lawReference: austria
          ? 'Information pursuant to § 5 ECG and § 25 MedienG'
          : 'Information pursuant to § 5 DDG',
        operatorName: name,
        operatorStreet: required(settings.operatorStreet, 'Street and number'),
        operatorCity: required(settings.operatorCity, 'Postal code and city'),
        operatorCountry: required(settings.operatorCountry, 'Country'),
        operatorEmail: mailLink(settings.operatorEmail, 'E-mail'),
        operatorPhone: required(settings.operatorPhone, 'Phone'),
        businessPurposeBlock: austria
          ? `<h2>Business purpose (Unternehmensgegenstand)</h2><p>${required(settings.businessPurpose, 'Business purpose')}</p>`
          : settings.businessPurpose?.trim()
            ? `<h2>Activity</h2><p>${optional(settings.businessPurpose)}</p>`
            : '',
        legalExtraBlock: extra ? `<h2>Further details</h2>${extra}` : '',
        responsibleBlock: austria
          ? ''
          : `<h2>Responsible for content pursuant to § 18 Abs. 2 MStV</h2><p>${
              settings.responsiblePerson?.trim() ? escapeHtml(settings.responsiblePerson.trim()) : name
            }<br>Address as above.</p>`,
        imprintExtra: paragraphs(settings.imprintExtra),
      }
    },
  })
}
