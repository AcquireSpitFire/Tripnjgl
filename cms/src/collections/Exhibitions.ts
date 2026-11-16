import type { CollectionConfig, FieldAccess, Payload, PayloadRequest } from 'payload'

import { getYouTubeId } from '../lib/youtube'

// Eine Ausstellung. Entspricht den bisherigen data/exhibitions/exhibition-N.json.
//
// Zwei Einstellungen steuern, was Besucher sehen:
//
//   release     scheduled   – mit Datum (Events bis zum Datum, danach Archive)
//               comingSoon  – ohne Datum, steht am Ende der kommenden Events
//               planning    – nur im Admin sichtbar; für Besucher existiert
//                             die Ausstellung nicht (auch Poster gesperrt)
//
//   visibility  locked      – Poster und Details sichtbar, Inhalt nicht
//               link        – wie locked, aber /exhibition/<id> zeigt den Inhalt
//                             (fehlt in Slideshow, Exhibitions-Liste, Sitemap)
//               public      – freigeschaltet
//
// "locked" (true/false) bleibt als abgeleitetes Feld für API und Frontend:
// locked = visibility !== 'public'. Alte Einträge ohne visibility/release
// werden aus "locked" bzw. als "scheduled" gelesen.
//
// Zugriff ohne Login:
//   - Ausstellungen in "planning" liefert die API nicht.
//   - Deckblatt und Medien fehlen in der Antwort, außer bei public und link.
//   - Die Mediendateien selbst schützt die Media-Collection (Feld "locked",
//     siehe syncMediaLock).

type Visibility = 'locked' | 'link' | 'public'
type Release = 'scheduled' | 'comingSoon' | 'planning'

type Settings = {
  locked?: boolean | null
  visibility?: Visibility | null
  release?: Release | null
}

function getVisibility(doc: Settings | null | undefined): Visibility {
  return doc?.visibility || (doc?.locked === false ? 'public' : 'locked')
}

function getRelease(doc: Settings | null | undefined): Release {
  return doc?.release || 'scheduled'
}

// Inhalt (Deckblatt, Medien) für Besucher abrufbar?
function contentIsOpen(doc: Settings | null | undefined): boolean {
  return getRelease(doc) !== 'planning' && getVisibility(doc) !== 'locked'
}

// Deckblatt und Medien nur sehen, wenn eingeloggt, freigeschaltet oder "mit Link"
const onlyWhenUnlocked: FieldAccess = ({ req, doc }) => Boolean(req.user) || contentIsOpen(doc)

type MediaRef = number | string | { id: number | string } | null | undefined

function toId(ref: MediaRef): number | string | null {
  if (ref === null || ref === undefined) {
    return null
  }

  return typeof ref === 'object' ? ref.id : ref
}

// Setzt "locked" auf allen Medien der Ausstellung:
// Poster → öffentlich (außer in "planning"), Deckblatt + Medien → öffentlich
// bei public und link
async function syncMediaLock(
  payload: Payload,
  req: PayloadRequest,
  doc: Settings & {
    posters?: MediaRef[] | null
    frontPage?: MediaRef
    medien?: { file?: MediaRef }[] | null
  },
) {
  const updates = new Map<number | string, boolean>()
  const planning = getRelease(doc) === 'planning'

  for (const poster of doc.posters || []) {
    const id = toId(poster)

    if (id !== null) {
      updates.set(id, planning)
    }
  }

  const locked = !contentIsOpen(doc)
  const frontPageId = toId(doc.frontPage)

  if (frontPageId !== null && !updates.has(frontPageId)) {
    updates.set(frontPageId, locked)
  }

  for (const row of doc.medien || []) {
    const id = toId(row.file)

    if (id !== null && !updates.has(id)) {
      updates.set(id, locked)
    }
  }

  for (const [id, value] of updates) {
    await payload.update({
      collection: 'media',
      id,
      data: { locked: value },
      req,
      overrideAccess: true,
    })
  }
}

export const Exhibitions: CollectionConfig = {
  slug: 'exhibitions',
  labels: {
    singular: 'Ausstellung',
    plural: 'Ausstellungen',
  },
  admin: {
    useAsTitle: 'titel',
    defaultColumns: ['titel', 'release', 'date', 'visibility', 'updatedAt'],
  },
  access: {
    // Besucher sehen keine Ausstellungen in "planning" (alte Einträge ohne Feld gelten als scheduled)
    read: ({ req }) =>
      req.user
        ? true
        : { or: [{ release: { not_equals: 'planning' } }, { release: { exists: false } }] },
  },
  defaultSort: 'date',
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        // Bei Teil-Updates fehlen Felder in data; dann gilt der gespeicherte Stand
        const visibility = getVisibility({
          visibility: data.visibility ?? originalDoc?.visibility,
          locked: data.locked ?? originalDoc?.locked,
        })

        data.visibility = visibility
        data.release = data.release ?? originalDoc?.release ?? 'scheduled'
        data.locked = visibility !== 'public'

        // Massen-Upload: die Dateien als neue Zeilen an "medien" anhängen, Feld leeren
        const bulk = ((data.bulkMedia as MediaRef[] | undefined) || [])
          .map(toId)
          .filter((id): id is number | string => id !== null)

        if (bulk.length) {
          const rows: { file?: MediaRef; name?: string | null }[] = [
            ...(data.medien ?? originalDoc?.medien ?? []),
          ]
          const present = new Set(rows.map((row) => String(toId(row.file))))

          for (const id of bulk) {
            if (!present.has(String(id))) {
              rows.push({ file: id, name: '' })
              present.add(String(id))
            }
          }

          data.medien = rows
        }

        data.bulkMedia = []

        return data
      },
    ],
    afterRead: [
      ({ doc }) => {
        // Alte Einträge (Spalten noch leer) mit abgeleiteten Werten ausliefern
        doc.visibility = getVisibility(doc)
        doc.release = getRelease(doc)

        return doc
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        await syncMediaLock(req.payload, req, doc)
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        // Medien einer gelöschten Ausstellung wieder sperren
        await syncMediaLock(req.payload, req, { ...doc, release: 'planning' })
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'slug',
      label: 'ID (URL)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Nur Kleinbuchstaben, Zahlen und Bindestriche, z. B. exhibition-3. Wird in der URL verwendet.',
      },
      validate: (value: unknown) =>
        typeof value === 'string' && /^[a-z0-9-]+$/.test(value)
          ? true
          : 'Nur Kleinbuchstaben, Zahlen und Bindestriche.',
    },
    {
      name: 'titel',
      label: 'Titel',
      type: 'text',
      required: true,
    },
    {
      name: 'theme',
      label: 'Thema',
      type: 'text',
    },
    {
      name: 'description',
      label: 'Beschreibung',
      type: 'textarea',
    },
    {
      name: 'release',
      label: 'Release',
      type: 'select',
      // Default als Funktion: gilt im Formular, aber nicht als Spalten-Default in der Datenbank
      defaultValue: () => 'scheduled',
      options: [
        { label: 'Datum', value: 'scheduled' },
        { label: 'Coming soon (ohne Datum, am Ende der Events)', value: 'comingSoon' },
        { label: 'Planning (nur im Admin sichtbar)', value: 'planning' },
      ],
      admin: {
        isClearable: false,
        description:
          'Datum: erscheint unter Events, nach dem Datum im Archive. Coming soon: steht ohne Datum am Ende der Events. Planning: schon angelegt, für Besucher aber nirgends sichtbar.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'date',
          label: 'Datum',
          type: 'date',
          admin: {
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
            width: '34%',
            condition: (data) => (data?.release || 'scheduled') === 'scheduled',
          },
        },
        {
          name: 'time',
          label: 'Uhrzeit',
          type: 'text',
          admin: {
            placeholder: '19:00',
            width: '33%',
            condition: (data) => (data?.release || 'scheduled') === 'scheduled',
          },
          validate: (value: unknown) =>
            !value || (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value))
              ? true
              : 'Format HH:MM, z. B. 19:00.',
        },
        {
          name: 'location',
          label: 'Ort',
          type: 'text',
          admin: { width: '33%' },
        },
      ],
    },
    {
      name: 'visibility',
      label: 'Sichtbarkeit',
      type: 'select',
      defaultValue: () => 'locked',
      options: [
        { label: 'Gesperrt', value: 'locked' },
        { label: 'Gesperrt mit Link', value: 'link' },
        { label: 'Freigeschaltet', value: 'public' },
      ],
      admin: {
        isClearable: false,
        description:
          'Gesperrt: Poster und Details sind sichtbar, die Ausstellung selbst (Deckblatt, Bilder, Videos) nicht. Gesperrt mit Link: wie gesperrt, aber wer die Adresse /exhibition/<ID> kennt, sieht die Ausstellung. Freigeschaltet: für alle sichtbar, auch in Slideshow und Exhibitions.',
      },
    },
    {
      // Abgeleitet aus "visibility" (siehe beforeChange); bleibt für API und Frontend
      name: 'locked',
      type: 'checkbox',
      defaultValue: true,
      admin: { hidden: true },
    },
    {
      name: 'video',
      label: 'Intro-Video (YouTube)',
      type: 'text',
      admin: {
        placeholder: 'https://www.youtube.com/watch?v=…',
        description: 'Wird vor der Ausstellung abgespielt und auf der Ausstellungsseite eingebettet.',
      },
      validate: (value: unknown) =>
        !value || getYouTubeId(value) ? true : 'Keine gültige YouTube-URL oder -ID.',
    },
    {
      name: 'posters',
      label: 'Poster',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Poster für Startseite, Events und Archive. Öffentlich, außer im Release „Planning“.',
      },
    },
    {
      name: 'frontPage',
      label: 'Deckblatt',
      type: 'upload',
      relationTo: 'media',
      access: { read: onlyWhenUnlocked },
      admin: {
        description: 'Bild oder Video für Slideshow und Exhibitions-Liste.',
      },
    },
    {
      // Massen-Upload: "Create New" öffnet Payloads Dialog für mehrere Dateien.
      // Beim Speichern wandern die Dateien als neue Zeilen ans Ende von "medien"
      // (beforeChange), dieses Feld ist danach wieder leer.
      name: 'bulkMedia',
      label: 'Mehrere Fotos auf einmal hinzufügen',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      access: { read: ({ req }) => Boolean(req.user) },
      admin: {
        description:
          '„Create New“ wählen, alle Dateien auf einmal ablegen (10, 20 oder mehr) und ohne Einträge speichern. Nach dem Speichern der Ausstellung stehen sie unten bei „Bilder und Videos“.',
      },
    },
    {
      name: 'medien',
      label: 'Bilder und Videos',
      type: 'array',
      labels: { singular: 'Medium', plural: 'Medien' },
      access: { read: onlyWhenUnlocked },
      admin: {
        description: 'Reihenfolge per Drag & Drop. Erscheint in Slideshow und Galerie.',
      },
      fields: [
        {
          name: 'file',
          label: 'Datei',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'name',
          label: 'Name / Bildunterschrift',
          type: 'text',
        },
      ],
    },
  ],
}
