// "/privacy": Datenschutzerklärung aus Admin → Site settings → Privacy
import { renderStaticPage } from '@/lib/static-page'
import { SITE_NAME } from '@/lib/seo'
import { formatDate, mailLink, paragraphs, required, urlLink } from '@/lib/site'

export const dynamic = 'force-dynamic'

export async function GET() {
  return renderStaticPage({
    template: 'privacy.html',
    path: '/privacy',
    title: `Privacy policy – ${SITE_NAME}`,
    description: `Privacy policy of ${SITE_NAME}: hosting, YouTube videos after consent, local storage, your rights.`,
    values: (settings) => {
      const austria = settings.jurisdiction === 'at'
      const hostLink = urlLink(settings.hostPrivacyUrl)

      return {
        updated: formatDate(settings.updatedAt),
        operatorName: required(settings.operatorName, 'Name'),
        operatorStreet: required(settings.operatorStreet, 'Street and number'),
        operatorCity: required(settings.operatorCity, 'Postal code and city'),
        operatorCountry: required(settings.operatorCountry, 'Country'),
        operatorEmail: mailLink(settings.operatorEmail, 'E-mail'),
        hostName: required(settings.hostName, 'Hosting provider'),
        hostAddress: required(settings.hostAddress, 'Hosting provider address'),
        hostLocation: required(settings.hostLocation, 'Server location'),
        hostPrivacyLink: hostLink ? ` Privacy policy of the hosting provider: ${hostLink}.` : '',
        hostTransferBlock: settings.hostOutsideEu
          ? '<p>The hosting provider is based outside the EU/EEA. Even if the server itself is located in the EU, the provider may access the data from its home country. The transfer is secured by the EU standard contractual clauses (Art. 46 (2) (c) GDPR) or, for US companies certified under the EU-US Data Privacy Framework, by that framework (Art. 45 GDPR).</p>'
          : '',
        consentLaw: austria ? '§ 165 (3) TKG 2021' : '§ 25 (1) TDDDG',
        storageLaw: austria ? '§ 165 (3) TKG 2021' : '§ 25 (2) TDDDG',
        authorityNote: austria
          ? 'In Austria this is the Datenschutzbehörde, Barichgasse 40–42, 1030 Vienna, <a href="https://www.dsb.gv.at" rel="noopener">dsb.gv.at</a>.'
          : 'In Germany the authority of the federal state in which the controller is based is responsible; a list is available at <a href="https://www.bfdi.bund.de" rel="noopener">bfdi.bund.de</a>.',
        privacyExtra: paragraphs(settings.privacyExtra),
      }
    },
  })
}
