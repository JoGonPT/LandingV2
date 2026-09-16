import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_users_consumer" AS ENUM('painel', 'site', 'app');
  ALTER TYPE "payload"."_locales" ADD VALUE 'fr';
  ALTER TYPE "payload"."_locales" ADD VALUE 'es';
  ALTER TYPE "payload"."_locales" ADD VALUE 'de';
  ALTER TYPE "payload"."enum__destinations_v_published_locale" ADD VALUE 'fr';
  ALTER TYPE "payload"."enum__destinations_v_published_locale" ADD VALUE 'es';
  ALTER TYPE "payload"."enum__destinations_v_published_locale" ADD VALUE 'de';
  ALTER TABLE "payload"."users" ADD COLUMN "consumer" "payload"."enum_users_consumer" DEFAULT 'painel';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."destinations_blocks_rich_text_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."destinations_blocks_call_to_action_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."destinations_highlights" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."destinations_faq" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."destinations_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."_destinations_v_blocks_rich_text_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."_destinations_v_blocks_call_to_action_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."_destinations_v_version_highlights" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."_destinations_v_version_faq" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."_destinations_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."media_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."common_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."hero_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."booking_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."faq_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."footer_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."cookies_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_privacy_sections_list" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_privacy_sections_subsections_list" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_privacy_sections_subsections" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_privacy_sections_after_list" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_privacy_sections" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_terms_parts_sections_list" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_terms_parts_sections_subsections_list" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_terms_parts_sections_subsections" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_terms_parts_sections_after_list" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_terms_parts_sections" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_terms_parts" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_cookies_sections" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "payload"."legal_texts" ALTER COLUMN "locale" SET DATA TYPE text;
  DROP TYPE "payload"."_locales";
  CREATE TYPE "payload"."_locales" AS ENUM('pt', 'en');
  ALTER TABLE "payload"."destinations_blocks_rich_text_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."destinations_blocks_call_to_action_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."destinations_highlights" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."destinations_faq" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."destinations_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."_destinations_v_blocks_rich_text_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."_destinations_v_blocks_call_to_action_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."_destinations_v_version_highlights" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."_destinations_v_version_faq" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."_destinations_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."media_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."common_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."hero_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."booking_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."faq_items" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."faq_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."footer_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."cookies_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_privacy_sections_list" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_privacy_sections_subsections_list" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_privacy_sections_subsections" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_privacy_sections_after_list" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_privacy_sections" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_terms_parts_sections_list" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_terms_parts_sections_subsections_list" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_terms_parts_sections_subsections" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_terms_parts_sections_after_list" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_terms_parts_sections" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_terms_parts" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_cookies_sections" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_locales" ALTER COLUMN "_locale" SET DATA TYPE "payload"."_locales" USING "_locale"::"payload"."_locales";
  ALTER TABLE "payload"."legal_texts" ALTER COLUMN "locale" SET DATA TYPE "payload"."_locales" USING "locale"::"payload"."_locales";
  ALTER TABLE "payload"."_destinations_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "payload"."enum__destinations_v_published_locale";
  CREATE TYPE "payload"."enum__destinations_v_published_locale" AS ENUM('pt', 'en');
  ALTER TABLE "payload"."_destinations_v" ALTER COLUMN "published_locale" SET DATA TYPE "payload"."enum__destinations_v_published_locale" USING "published_locale"::"payload"."enum__destinations_v_published_locale";
  ALTER TABLE "payload"."users" DROP COLUMN "consumer";
  DROP TYPE "payload"."enum_users_consumer";`)
}
