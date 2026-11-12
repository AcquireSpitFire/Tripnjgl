import type { CollectionConfig, FieldAccess, Payload, PayloadRequest } from 'payload'

import { getYouTubeId } from '../lib/youtube'

// Eine Ausstellung. Entspricht den bisherigen data/exhibitions/exhibition-N.json.
//
// Zugriff ohne Login:
//   - Die Ausstellung selbst ist lesbar (Events/Archive zeigen auch gesperrte
//     Ausstellungen mit Poster, Datum, Ort, …).
//   - Deckblatt und Medien fehlen in der Antwort, solange locked: true ist.
//   - Die Mediendateien selbst schützt die Media-Collection (Feld "locked",
//     siehe Hook unten).

// Deckblatt und Medien nur sehen, wenn eingeloggt oder freigeschaltet
const onlyWhenUnlocked: FieldAccess = ({ req, doc }) => Boolean(req.user) || doc?.locked === false

type MediaRef = number | string | { id: number | string } | null | undefined

function toId(ref: MediaRef): number | string | null {
  if (ref === null || ref === undefined) {
    return null
  }

  return typeof ref === 'object' ? ref.id : ref
}

// Setzt "locked" auf allen Medien der Ausstellung:
// Poster → false (immer öffentlich), Deckblatt + Medien → wie die Ausstellung
async function syncMediaLock(
  payload: Payload,
  req: PayloadRequest,
  doc: {
    locked?: boolean | null
    posters?: MediaRef[] | null
    frontPage?: MediaRef
    medien?: { file?: MediaRef }[] | null
  },
) {
  const updates = new Map<number | string, boolean>()

  for (const poster of doc.posters || []) {
    const id = toId(poster)

    if (id !== null) {
      updates.set(id, false)
    }
  }

  const locked = doc.locked !== false
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
    defaultColumns: ['titel', 'theme', 'date', 'locked', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  defaultSort: 'date',
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        await syncMediaLock(req.payload, req, doc)
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        // Medien einer gelöschten Ausstellung wieder sperren
        await syncMediaLock(req.payload, req, { ...doc, locked: true, posters: [] })
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
      type: 'row',
      fields: [
        {
          name: 'date',
          label: 'Datum',
          type: 'date',
          admin: {
            date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
            width: '34%',
          },
        },
        {
          name: 'time',
          label: 'Uhrzeit',
          type: 'text',
          admin: { placeholder: '19:00', width: '33%' },
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
      name: 'locked',
      label: 'Gesperrt',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'Gesperrt: Poster und Details sind sichtbar, die Ausstellung selbst (Deckblatt, Bilder, Videos) nicht. Haken entfernen = freischalten.',
      },
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
        description: 'Poster für Startseite, Events und Archive. Immer öffentlich.',
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
