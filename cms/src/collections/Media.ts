import type { CollectionConfig } from 'payload'

// Bilder, Videos und Poster.
//
// Beim Upload entstehen drei WebP-Größen (das Original bleibt erhalten):
//   thumb   600 px breit            Admin, Karten, Handy
//   medium  1280 px längste Seite   Slideshow, Galerie, Poster in Listen
//   large   2560 px längste Seite   Vollbild, Poster über der Slideshow (4K-Desktop)
// Kleinere Originale werden nie vergrößert.
//
// "locked" wird nicht von Hand gesetzt, sondern vom Hook der Ausstellungen:
// Poster sind immer öffentlich, Deckblatt und Medien einer Ausstellung sind
// genau dann öffentlich, wenn die Ausstellung freigeschaltet ist.
// Ohne Login liefert die API (und die Datei-Route /api/media/file/…)
// nur Medien mit locked: false. Neue Uploads sind gesperrt, bis eine
// Ausstellung sie verwendet.
export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Medium',
    plural: 'Medien',
  },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'name', 'locked', 'updatedAt'],
  },
  access: {
    read: ({ req }) => (req.user ? true : { locked: { equals: false } }),
  },
  upload: {
    // Ablageort der Dateien; beim Hosting auf ein persistentes Volume zeigen (MEDIA_DIR)
    staticDir: process.env.MEDIA_DIR || 'media',
    mimeTypes: ['image/*', 'video/*'],
    imageSizes: [
      {
        name: 'thumb',
        width: 600,
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 75 } },
      },
      {
        name: 'medium',
        width: 1280,
        height: 1280,
        fit: 'inside',
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
      {
        name: 'large',
        width: 2560,
        height: 2560,
        fit: 'inside',
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 82 } },
      },
    ],
    adminThumbnail: 'thumb',
  },
  fields: [
    {
      name: 'alt',
      label: 'Alt-Text',
      type: 'text',
      admin: {
        description: 'Kurze Bildbeschreibung (Barrierefreiheit, SEO).',
      },
    },
    {
      name: 'name',
      label: 'Name / Bildunterschrift',
      type: 'text',
    },
    {
      name: 'locked',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        readOnly: true,
        description: 'Wird automatisch von der Ausstellung gesetzt.',
      },
    },
  ],
}
