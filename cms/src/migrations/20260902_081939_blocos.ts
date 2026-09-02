import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_destinations_blocks_call_to_action_link_type" AS ENUM('bookingForm', 'internal', 'external', 'whatsapp');
  CREATE TYPE "payload"."enum_destinations_blocks_call_to_action_variant" AS ENUM('primary', 'secondary', 'outline');
  CREATE TYPE "payload"."enum_destinations_blocks_call_to_action_alignment" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum__destinations_v_blocks_call_to_action_link_type" AS ENUM('bookingForm', 'internal', 'external', 'whatsapp');
  CREATE TYPE "payload"."enum__destinations_v_blocks_call_to_action_variant" AS ENUM('primary', 'secondary', 'outline');
  CREATE TYPE "payload"."enum__destinations_v_blocks_call_to_action_alignment" AS ENUM('left', 'center', 'right');
  CREATE TABLE "payload"."destinations_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."destinations_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."destinations_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum_destinations_blocks_call_to_action_link_type" DEFAULT 'bookingForm',
  	"internal_doc_id" integer,
  	"internal_path" varchar,
  	"external_url" varchar,
  	"custom_params" varchar,
  	"variant" "payload"."enum_destinations_blocks_call_to_action_variant" DEFAULT 'primary',
  	"alignment" "payload"."enum_destinations_blocks_call_to_action_alignment" DEFAULT 'center',
  	"tracking_event" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."destinations_blocks_call_to_action_locales" (
  	"button_text" varchar,
  	"subtext" varchar,
  	"whatsapp_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."_destinations_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_destinations_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."_destinations_v_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "payload"."enum__destinations_v_blocks_call_to_action_link_type" DEFAULT 'bookingForm',
  	"internal_doc_id" integer,
  	"internal_path" varchar,
  	"external_url" varchar,
  	"custom_params" varchar,
  	"variant" "payload"."enum__destinations_v_blocks_call_to_action_variant" DEFAULT 'primary',
  	"alignment" "payload"."enum__destinations_v_blocks_call_to_action_alignment" DEFAULT 'center',
  	"tracking_event" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."_destinations_v_blocks_call_to_action_locales" (
  	"button_text" varchar,
  	"subtext" varchar,
  	"whatsapp_message" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload"."destinations_blocks_rich_text" ADD CONSTRAINT "destinations_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."destinations_blocks_rich_text_locales" ADD CONSTRAINT "destinations_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."destinations_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."destinations_blocks_call_to_action" ADD CONSTRAINT "destinations_blocks_call_to_action_internal_doc_id_destinations_id_fk" FOREIGN KEY ("internal_doc_id") REFERENCES "payload"."destinations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."destinations_blocks_call_to_action" ADD CONSTRAINT "destinations_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."destinations_blocks_call_to_action_locales" ADD CONSTRAINT "destinations_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."destinations_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_destinations_v_blocks_rich_text" ADD CONSTRAINT "_destinations_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_destinations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_destinations_v_blocks_rich_text_locales" ADD CONSTRAINT "_destinations_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_destinations_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_destinations_v_blocks_call_to_action" ADD CONSTRAINT "_destinations_v_blocks_call_to_action_internal_doc_id_destinations_id_fk" FOREIGN KEY ("internal_doc_id") REFERENCES "payload"."destinations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_destinations_v_blocks_call_to_action" ADD CONSTRAINT "_destinations_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_destinations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_destinations_v_blocks_call_to_action_locales" ADD CONSTRAINT "_destinations_v_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_destinations_v_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "destinations_blocks_rich_text_order_idx" ON "payload"."destinations_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "destinations_blocks_rich_text_parent_id_idx" ON "payload"."destinations_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "destinations_blocks_rich_text_path_idx" ON "payload"."destinations_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "destinations_blocks_rich_text_locales_locale_parent_id_uniqu" ON "payload"."destinations_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "destinations_blocks_call_to_action_order_idx" ON "payload"."destinations_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "destinations_blocks_call_to_action_parent_id_idx" ON "payload"."destinations_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "destinations_blocks_call_to_action_path_idx" ON "payload"."destinations_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "destinations_blocks_call_to_action_internal_doc_idx" ON "payload"."destinations_blocks_call_to_action" USING btree ("internal_doc_id");
  CREATE UNIQUE INDEX "destinations_blocks_call_to_action_locales_locale_parent_id_" ON "payload"."destinations_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_destinations_v_blocks_rich_text_order_idx" ON "payload"."_destinations_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_destinations_v_blocks_rich_text_parent_id_idx" ON "payload"."_destinations_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_destinations_v_blocks_rich_text_path_idx" ON "payload"."_destinations_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_destinations_v_blocks_rich_text_locales_locale_parent_id_un" ON "payload"."_destinations_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_destinations_v_blocks_call_to_action_order_idx" ON "payload"."_destinations_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_destinations_v_blocks_call_to_action_parent_id_idx" ON "payload"."_destinations_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_destinations_v_blocks_call_to_action_path_idx" ON "payload"."_destinations_v_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "_destinations_v_blocks_call_to_action_internal_doc_idx" ON "payload"."_destinations_v_blocks_call_to_action" USING btree ("internal_doc_id");
  CREATE UNIQUE INDEX "_destinations_v_blocks_call_to_action_locales_locale_parent_" ON "payload"."_destinations_v_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload"."destinations_locales" DROP COLUMN "body";
  ALTER TABLE "payload"."_destinations_v_locales" DROP COLUMN "version_body";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."destinations_blocks_rich_text" CASCADE;
  DROP TABLE "payload"."destinations_blocks_rich_text_locales" CASCADE;
  DROP TABLE "payload"."destinations_blocks_call_to_action" CASCADE;
  DROP TABLE "payload"."destinations_blocks_call_to_action_locales" CASCADE;
  DROP TABLE "payload"."_destinations_v_blocks_rich_text" CASCADE;
  DROP TABLE "payload"."_destinations_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "payload"."_destinations_v_blocks_call_to_action" CASCADE;
  DROP TABLE "payload"."_destinations_v_blocks_call_to_action_locales" CASCADE;
  ALTER TABLE "payload"."destinations_locales" ADD COLUMN "body" jsonb;
  ALTER TABLE "payload"."_destinations_v_locales" ADD COLUMN "version_body" jsonb;
  DROP TYPE "payload"."enum_destinations_blocks_call_to_action_link_type";
  DROP TYPE "payload"."enum_destinations_blocks_call_to_action_variant";
  DROP TYPE "payload"."enum_destinations_blocks_call_to_action_alignment";
  DROP TYPE "payload"."enum__destinations_v_blocks_call_to_action_link_type";
  DROP TYPE "payload"."enum__destinations_v_blocks_call_to_action_variant";
  DROP TYPE "payload"."enum__destinations_v_blocks_call_to_action_alignment";`)
}
