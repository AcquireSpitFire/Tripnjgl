// Sperrt oder entsperrt eine Ausstellung ohne Admin-Oberfläche (z. B. zum Testen):
//   cd cms && npx tsx --env-file=.env scripts/set-locked.ts exhibition-2 true
// Gibt danach aus, welche Medien gesperrt sind.
import { getPayload } from 'payload'

import config from '../src/payload.config'

async function run() {
  const [slug, value] = process.argv.slice(2)

  if (!slug || !['true', 'false'].includes(value)) {
    console.error('Aufruf: tsx --env-file=.env scripts/set-locked.ts <slug> <true|false>')
    process.exit(1)
  }

  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'exhibitions',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const doc = found.docs[0]

  if (!doc) {
    console.error('Nicht gefunden: ' + slug)
    process.exit(1)
  }

  await payload.update({ collection: 'exhibitions', id: doc.id, data: { locked: value === 'true' } })

  const media = await payload.find({ collection: 'media', limit: 100, overrideAccess: true })

  console.log(`${slug}: locked = ${value}`)
  console.log(media.docs.map((m) => `  ${m.filename}: locked=${m.locked}`).join('\n'))
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
