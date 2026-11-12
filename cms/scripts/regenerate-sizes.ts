// Erzeugt die Bildgrößen (thumb/medium/large) für alle vorhandenen Medien neu,
// z. B. nachdem imageSizes in Media.ts geändert wurden:
//   cd cms && npm run media:regenerate
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

import config from '../src/payload.config'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const mediaDir = path.resolve(dirname, '..', 'media')

async function run() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'media', limit: 1000, overrideAccess: true })

  for (const media of docs) {
    if (!media.filename || !(media.mimeType || '').startsWith('image/')) {
      continue
    }

    const filePath = path.join(mediaDir, media.filename)

    if (!fs.existsSync(filePath)) {
      console.warn(`Datei fehlt: ${media.filename}`)
      continue
    }

    await payload.update({
      collection: 'media',
      id: media.id,
      data: {},
      filePath,
      overwriteExistingFiles: true,
      overrideAccess: true,
    })

    console.log(`neu erzeugt: ${media.filename}`)
  }

  console.log('Fertig.')
  process.exit(0)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
