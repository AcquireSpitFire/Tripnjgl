import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`exhibitions\` ADD \`release\` text;`)
  await db.run(sql`ALTER TABLE \`exhibitions\` ADD \`visibility\` text;`)
  // Bestehende Ausstellungen übernehmen: locked → visibility, Release = Datum
  await db.run(
    sql`UPDATE \`exhibitions\` SET \`visibility\` = CASE WHEN \`locked\` = 0 THEN 'public' ELSE 'locked' END, \`release\` = 'scheduled';`,
  )
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`exhibitions\` DROP COLUMN \`release\`;`)
  await db.run(sql`ALTER TABLE \`exhibitions\` DROP COLUMN \`visibility\`;`)
}
