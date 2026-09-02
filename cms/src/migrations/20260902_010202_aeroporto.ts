import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."destinations" ADD COLUMN "airport_code" varchar;
  ALTER TABLE "payload"."destinations" ADD COLUMN "order" numeric DEFAULT 100;
  ALTER TABLE "payload"."destinations_locales" ADD COLUMN "airport_name" varchar;
  ALTER TABLE "payload"."_destinations_v" ADD COLUMN "version_airport_code" varchar;
  ALTER TABLE "payload"."_destinations_v" ADD COLUMN "version_order" numeric DEFAULT 100;
  ALTER TABLE "payload"."_destinations_v_locales" ADD COLUMN "version_airport_name" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."destinations" DROP COLUMN "airport_code";
  ALTER TABLE "payload"."destinations" DROP COLUMN "order";
  ALTER TABLE "payload"."destinations_locales" DROP COLUMN "airport_name";
  ALTER TABLE "payload"."_destinations_v" DROP COLUMN "version_airport_code";
  ALTER TABLE "payload"."_destinations_v" DROP COLUMN "version_order";
  ALTER TABLE "payload"."_destinations_v_locales" DROP COLUMN "version_airport_name";`)
}
