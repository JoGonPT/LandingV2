import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."legal_privacy_sections_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"valor" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."legal_privacy_sections_subsections_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"valor" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."legal_terms_parts_sections_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"valor" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."legal_terms_parts_sections_subsections_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"valor" varchar NOT NULL
  );
  
  ALTER TABLE "payload"."legal_privacy_sections_list" ADD CONSTRAINT "legal_privacy_sections_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."legal_privacy_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."legal_privacy_sections_subsections_list" ADD CONSTRAINT "legal_privacy_sections_subsections_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."legal_privacy_sections_subsections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."legal_terms_parts_sections_list" ADD CONSTRAINT "legal_terms_parts_sections_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."legal_terms_parts_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."legal_terms_parts_sections_subsections_list" ADD CONSTRAINT "legal_terms_parts_sections_subsections_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."legal_terms_parts_sections_subsections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "legal_privacy_sections_list_order_idx" ON "payload"."legal_privacy_sections_list" USING btree ("_order");
  CREATE INDEX "legal_privacy_sections_list_parent_id_idx" ON "payload"."legal_privacy_sections_list" USING btree ("_parent_id");
  CREATE INDEX "legal_privacy_sections_list_locale_idx" ON "payload"."legal_privacy_sections_list" USING btree ("_locale");
  CREATE INDEX "legal_privacy_sections_subsections_list_order_idx" ON "payload"."legal_privacy_sections_subsections_list" USING btree ("_order");
  CREATE INDEX "legal_privacy_sections_subsections_list_parent_id_idx" ON "payload"."legal_privacy_sections_subsections_list" USING btree ("_parent_id");
  CREATE INDEX "legal_privacy_sections_subsections_list_locale_idx" ON "payload"."legal_privacy_sections_subsections_list" USING btree ("_locale");
  CREATE INDEX "legal_terms_parts_sections_list_order_idx" ON "payload"."legal_terms_parts_sections_list" USING btree ("_order");
  CREATE INDEX "legal_terms_parts_sections_list_parent_id_idx" ON "payload"."legal_terms_parts_sections_list" USING btree ("_parent_id");
  CREATE INDEX "legal_terms_parts_sections_list_locale_idx" ON "payload"."legal_terms_parts_sections_list" USING btree ("_locale");
  CREATE INDEX "legal_terms_parts_sections_subsections_list_order_idx" ON "payload"."legal_terms_parts_sections_subsections_list" USING btree ("_order");
  CREATE INDEX "legal_terms_parts_sections_subsections_list_parent_id_idx" ON "payload"."legal_terms_parts_sections_subsections_list" USING btree ("_parent_id");
  CREATE INDEX "legal_terms_parts_sections_subsections_list_locale_idx" ON "payload"."legal_terms_parts_sections_subsections_list" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."legal_privacy_sections_list" CASCADE;
  DROP TABLE "payload"."legal_privacy_sections_subsections_list" CASCADE;
  DROP TABLE "payload"."legal_terms_parts_sections_list" CASCADE;
  DROP TABLE "payload"."legal_terms_parts_sections_subsections_list" CASCADE;`)
}
