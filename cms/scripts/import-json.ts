// Importiert die bisherigen JSON-Ausstellungen in die Datenbank.
//
//   cd cms && npm run import:json
//
// Liest ../data/exhibitions/index.json und jede exhibition-N.json, lädt alle
// Bilder/Videos/Poster als Medien hoch (aus ../data/image bzw. ../data/video)
// und legt die Ausstellungen mit allen Feldern an. Läuft mehrfach ohne
// Schaden: Ausstellungen, deren slug es schon gibt, werden übersprungen.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

import config from '../src/payload.config'

type JsonMedia = { id: string; type?: string; src: string; alt?: string; name?: string }

type JsonExhibition = {
  id: string
  titel: string
  theme?: string
  description?: string
  date?: string
  time?: string
  location?: string
  locked?: boolean
  video?: string
  posters?: JsonMedia[]
  poster?: JsonMedia
  front_page?: { id?: string; src?: string }
  medien?: JsonMedia[]
}

const dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(dirname, '..', '..')
const exhibitionsDir = path.join(repoRoot, 'data', 'exhibitions')

// "2026-12-24" → ISO-String für lokale Mitternacht (so speichert es auch der Admin)
function toIsoDate(value?: string): string | undefined {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    return undefined
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).toISOString()
}

async function run() {
  const payload = await getPayload({ config })

  const index: { id: string }[] = JSON.parse(
    fs.readFileSync(path.join(exhibitionsDir, 'index.json'), 'utf8'),
  )

  for (const entry of index) {
    const file = path.join(exhibitionsDir, entry.id + '.json')

    if (!fs.existsSync(file)) {
      console.warn(`Übersprungen: ${file} fehlt`)
      continue
    }

    const exhibition: JsonExhibition = JSON.parse(fs.readFileSync(file, 'utf8'))

    const existing = await payload.find({
      collection: 'exhibitions',
      where: { slug: { equals: exhibition.id } },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      console.log(`Übersprungen: „${exhibition.id}“ gibt es schon`)
      continue
    }

    // Jede Datei nur einmal hochladen, auch wenn sie mehrfach verwendet wird
    const mediaIds = new Map<string, number>()

    async function upload(item: JsonMedia): Promise<number | null> {
      if (mediaIds.has(item.src)) {
        return mediaIds.get(item.src)!
      }

      const filePath = path.join(repoRoot, item.src)

      if (!fs.existsSync(filePath)) {
        console.warn(`  Datei fehlt: ${item.src}`)
        return null
      }

      const created = await payload.create({
        collection: 'media',
        data: {
          alt: item.alt || '',
          name: item.name || '',
          locked: true,
        },
        filePath,
      })

      mediaIds.set(item.src, created.id as number)
      console.log(`  hochgeladen: ${item.src}`)

      return created.id
    }

    console.log(`Importiere „${exhibition.id}“ …`)

    const posterList = exhibition.posters || (exhibition.poster ? [exhibition.poster] : [])
    const posters: number[] = []

    for (const poster of posterList) {
      const id = await upload(poster)

      if (id !== null) {
        posters.push(id)
      }
    }

    const medien: { file: number; name?: string }[] = []

    for (const item of exhibition.medien || []) {
      const id = await upload(item)

      if (id !== null) {
        medien.push({ file: id, name: item.name || undefined })
      }
    }

    // Deckblatt: in der JSON nur eine id, die auf ein Medium zeigt
    const frontPageItem = exhibition.front_page?.src
      ? (exhibition.front_page as JsonMedia)
      : (exhibition.medien || []).find((item) => item.id === exhibition.front_page?.id)

    const frontPage = frontPageItem ? await upload(frontPageItem) : null

    await payload.create({
      collection: 'exhibitions',
      data: {
        slug: exhibition.id,
        titel: exhibition.titel,
        theme: exhibition.theme,
        description: exhibition.description,
        date: toIsoDate(exhibition.date),
        time: exhibition.time,
        location: exhibition.location,
        locked: exhibition.locked !== false,
        video: exhibition.video,
        posters,
        frontPage,
        medien,
      },
    })

    console.log(`  angelegt: „${exhibition.titel}“`)
  }

  console.log('Fertig.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
