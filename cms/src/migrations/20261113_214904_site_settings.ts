import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`site\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`site_description\` text,
  	\`about_text\` text,
  	\`contact_email\` text,
  	\`jurisdiction\` text DEFAULT 'de' NOT NULL,
  	\`operator_name\` text,
  	\`operator_street\` text,
  	\`operator_city\` text,
  	\`operator_country\` text,
  	\`operator_email\` text,
  	\`operator_phone\` text,
  	\`business_purpose\` text DEFAULT 'Photo and video exhibitions',
  	\`legal_extra\` text,
  	\`responsible_person\` text,
  	\`imprint_extra\` text,
  	\`host_name\` text,
  	\`host_address\` text,
  	\`host_location\` text,
  	\`host_outside_eu\` integer DEFAULT false,
  	\`host_privacy_url\` text,
  	\`privacy_extra\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`site\`;`)
}
