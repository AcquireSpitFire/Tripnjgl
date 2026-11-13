import { sqliteAdapter } from '@payloadcms/db-sqlite'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Exhibitions } from './collections/Exhibitions'
import { Site } from './globals/Site'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

export default buildConfig({
  serverURL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Exhibitions, Media, Users],
  globals: [Site],
  // Kein Rich-Text-Editor nötig (nur Textfelder) – spart Abhängigkeiten und Angriffsfläche
  secret: process.env.PAYLOAD_SECRET || '',
  // Öffentliche API: keine tiefen Verschachtelungen (teure Abfragen), kein GraphQL (ungenutzt)
  maxDepth: 2,
  graphQL: {
    disable: true,
  },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || 'file:./tripnjungle.db',
    },
    // Produktion: Tabellen kommen aus src/migrations ("payload migrate" vor dem Start),
    // Entwicklung: Schema wird automatisch angepasst (push)
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  // Nur die eigene Origin darf die API aus dem Browser aufrufen.
  // Das Frontend wird aus public/ von derselben App ausgeliefert.
  cors: [serverURL],
  csrf: [serverURL],
  sharp,
  plugins: [],
})
