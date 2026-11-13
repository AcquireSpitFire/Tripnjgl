import type { GlobalConfig } from 'payload'

// Seitenweite Einstellungen: About-Text, Kontakt, Impressum, Datenschutz.
// Werden von den Route Handlern (/about, /imprint, /privacy) gelesen und in
// die Vorlagen eingesetzt. Nur eingeloggte Nutzer dürfen sie über die API
// lesen; die Seiten selbst holen sie serverseitig.
export const Site: GlobalConfig = {
  slug: 'site',
  label: 'Site settings',
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  admin: {
    description:
      'Texts for About, the legal notice (Impressum) and the privacy policy. Fill in everything before going live.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'About',
          fields: [
            {
              name: 'siteDescription',
              type: 'text',
              label: 'Site description (search engines, max. 160 characters)',
              maxLength: 160,
            },
            {
              name: 'aboutText',
              type: 'textarea',
              label: 'About text',
              admin: { description: 'Blank line = new paragraph.' },
            },
            {
              name: 'contactEmail',
              type: 'email',
              label: 'Contact e-mail shown on About',
            },
          ],
        },
        {
          label: 'Legal notice',
          description:
            'Impressum: who runs this website. Required by law as soon as the site is not purely private.',
          fields: [
            {
              name: 'jurisdiction',
              type: 'select',
              label: 'Country of the operator',
              defaultValue: 'de',
              required: true,
              options: [
                { label: 'Germany (§ 5 DDG, § 18 MStV)', value: 'de' },
                { label: 'Austria (§ 5 ECG, § 25 MedienG)', value: 'at' },
              ],
            },
            { name: 'operatorName', type: 'text', label: 'Name (person or company)' },
            { name: 'operatorStreet', type: 'text', label: 'Street and number (no P.O. box)' },
            { name: 'operatorCity', type: 'text', label: 'Postal code and city' },
            { name: 'operatorCountry', type: 'text', label: 'Country' },
            { name: 'operatorEmail', type: 'email', label: 'E-mail' },
            {
              name: 'operatorPhone',
              type: 'text',
              label: 'Phone',
              admin: { description: 'A second fast contact channel besides e-mail is expected by law.' },
            },
            {
              name: 'businessPurpose',
              type: 'text',
              label: 'Business purpose (Austria: Unternehmensgegenstand)',
              defaultValue: 'Photo and video exhibitions',
            },
            {
              name: 'legalExtra',
              type: 'textarea',
              label: 'Further details',
              admin: {
                description:
                  'Only if applicable: legal form, commercial register and number, VAT ID, supervisory authority, chamber. One item per line.',
              },
            },
            {
              name: 'responsiblePerson',
              type: 'text',
              label: 'Responsible for content (Germany, § 18 Abs. 2 MStV)',
              admin: {
                description: 'Name; the address above applies. Leave empty to use the operator name.',
              },
            },
            {
              name: 'imprintExtra',
              type: 'textarea',
              label: 'Additional text at the end of the legal notice',
            },
          ],
        },
        {
          label: 'Privacy',
          description:
            'Privacy policy. The site itself only uses server logs, YouTube (after consent) and local storage.',
          fields: [
            {
              name: 'hostName',
              type: 'text',
              label: 'Hosting provider (company name)',
              admin: { description: 'e.g. Railway Corporation or Hetzner Online GmbH' },
            },
            { name: 'hostAddress', type: 'text', label: 'Hosting provider address' },
            {
              name: 'hostLocation',
              type: 'text',
              label: 'Where the server is located',
              admin: { description: 'e.g. Amsterdam, Netherlands (EU)' },
            },
            {
              name: 'hostOutsideEu',
              type: 'checkbox',
              label: 'The hosting provider is a company outside the EU/EEA (e.g. USA)',
              defaultValue: false,
            },
            {
              name: 'hostPrivacyUrl',
              type: 'text',
              label: 'Link to the privacy policy of the hosting provider',
            },
            {
              name: 'privacyExtra',
              type: 'textarea',
              label: 'Additional text at the end of the privacy policy',
            },
          ],
        },
      ],
    },
  ],
}
