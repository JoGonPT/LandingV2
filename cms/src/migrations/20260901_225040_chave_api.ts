import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."users" ADD COLUMN "enable_a_p_i_key" boolean;
  ALTER TABLE "payload"."users" ADD COLUMN "api_key" varchar;
  ALTER TABLE "payload"."users" ADD COLUMN "api_key_index" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."users" DROP COLUMN "enable_a_p_i_key";
  ALTER TABLE "payload"."users" DROP COLUMN "api_key";
  ALTER TABLE "payload"."users" DROP COLUMN "api_key_index";`)
}
