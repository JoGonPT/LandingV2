import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_destinations_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__destinations_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum__destinations_v_published_locale" AS ENUM('pt', 'en');
  CREATE TABLE "payload"."destinations_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."destinations_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "payload"."destinations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"route_distance_km" numeric,
  	"route_duration_min" numeric,
  	"route_price_from" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "payload"."enum_destinations_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "payload"."destinations_locales" (
  	"title" varchar,
  	"city" varchar,
  	"subtitle" varchar,
  	"summary" varchar,
  	"body" jsonb,
  	"route_origin" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."_destinations_v_version_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_destinations_v_version_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "payload"."_destinations_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_route_distance_km" numeric,
  	"version_route_duration_min" numeric,
  	"version_route_price_from" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "payload"."enum__destinations_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "payload"."enum__destinations_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "payload"."_destinations_v_locales" (
  	"version_title" varchar,
  	"version_city" varchar,
  	"version_subtitle" varchar,
  	"version_summary" varchar,
  	"version_body" jsonb,
  	"version_route_origin" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "destinations_id" integer;
  ALTER TABLE "payload"."destinations_highlights" ADD CONSTRAINT "destinations_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."destinations_faq" ADD CONSTRAINT "destinations_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."destinations_locales" ADD CONSTRAINT "destinations_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_destinations_v_version_highlights" ADD CONSTRAINT "_destinations_v_version_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_destinations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_destinations_v_version_faq" ADD CONSTRAINT "_destinations_v_version_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_destinations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."_destinations_v" ADD CONSTRAINT "_destinations_v_parent_id_destinations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."destinations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_destinations_v_locales" ADD CONSTRAINT "_destinations_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."_destinations_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "destinations_highlights_order_idx" ON "payload"."destinations_highlights" USING btree ("_order");
  CREATE INDEX "destinations_highlights_parent_id_idx" ON "payload"."destinations_highlights" USING btree ("_parent_id");
  CREATE INDEX "destinations_highlights_locale_idx" ON "payload"."destinations_highlights" USING btree ("_locale");
  CREATE INDEX "destinations_faq_order_idx" ON "payload"."destinations_faq" USING btree ("_order");
  CREATE INDEX "destinations_faq_parent_id_idx" ON "payload"."destinations_faq" USING btree ("_parent_id");
  CREATE INDEX "destinations_faq_locale_idx" ON "payload"."destinations_faq" USING btree ("_locale");
  CREATE UNIQUE INDEX "destinations_slug_idx" ON "payload"."destinations" USING btree ("slug");
  CREATE INDEX "destinations_updated_at_idx" ON "payload"."destinations" USING btree ("updated_at");
  CREATE INDEX "destinations_created_at_idx" ON "payload"."destinations" USING btree ("created_at");
  CREATE INDEX "destinations__status_idx" ON "payload"."destinations" USING btree ("_status");
  CREATE UNIQUE INDEX "destinations_locales_locale_parent_id_unique" ON "payload"."destinations_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_destinations_v_version_highlights_order_idx" ON "payload"."_destinations_v_version_highlights" USING btree ("_order");
  CREATE INDEX "_destinations_v_version_highlights_parent_id_idx" ON "payload"."_destinations_v_version_highlights" USING btree ("_parent_id");
  CREATE INDEX "_destinations_v_version_highlights_locale_idx" ON "payload"."_destinations_v_version_highlights" USING btree ("_locale");
  CREATE INDEX "_destinations_v_version_faq_order_idx" ON "payload"."_destinations_v_version_faq" USING btree ("_order");
  CREATE INDEX "_destinations_v_version_faq_parent_id_idx" ON "payload"."_destinations_v_version_faq" USING btree ("_parent_id");
  CREATE INDEX "_destinations_v_version_faq_locale_idx" ON "payload"."_destinations_v_version_faq" USING btree ("_locale");
  CREATE INDEX "_destinations_v_parent_idx" ON "payload"."_destinations_v" USING btree ("parent_id");
  CREATE INDEX "_destinations_v_version_version_slug_idx" ON "payload"."_destinations_v" USING btree ("version_slug");
  CREATE INDEX "_destinations_v_version_version_updated_at_idx" ON "payload"."_destinations_v" USING btree ("version_updated_at");
  CREATE INDEX "_destinations_v_version_version_created_at_idx" ON "payload"."_destinations_v" USING btree ("version_created_at");
  CREATE INDEX "_destinations_v_version_version__status_idx" ON "payload"."_destinations_v" USING btree ("version__status");
  CREATE INDEX "_destinations_v_created_at_idx" ON "payload"."_destinations_v" USING btree ("created_at");
  CREATE INDEX "_destinations_v_updated_at_idx" ON "payload"."_destinations_v" USING btree ("updated_at");
  CREATE INDEX "_destinations_v_snapshot_idx" ON "payload"."_destinations_v" USING btree ("snapshot");
  CREATE INDEX "_destinations_v_published_locale_idx" ON "payload"."_destinations_v" USING btree ("published_locale");
  CREATE INDEX "_destinations_v_latest_idx" ON "payload"."_destinations_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_destinations_v_locales_locale_parent_id_unique" ON "payload"."_destinations_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_destinations_fk" FOREIGN KEY ("destinations_id") REFERENCES "payload"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_destinations_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("destinations_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."destinations_highlights" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."destinations_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."destinations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."destinations_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_destinations_v_version_highlights" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_destinations_v_version_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_destinations_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."_destinations_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."destinations_highlights" CASCADE;
  DROP TABLE "payload"."destinations_faq" CASCADE;
  DROP TABLE "payload"."destinations" CASCADE;
  DROP TABLE "payload"."destinations_locales" CASCADE;
  DROP TABLE "payload"."_destinations_v_version_highlights" CASCADE;
  DROP TABLE "payload"."_destinations_v_version_faq" CASCADE;
  DROP TABLE "payload"."_destinations_v" CASCADE;
  DROP TABLE "payload"."_destinations_v_locales" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_destinations_fk";
  
  DROP INDEX "payload"."payload_locked_documents_rels_destinations_id_idx";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "destinations_id";
  DROP TYPE "payload"."enum_destinations_status";
  DROP TYPE "payload"."enum__destinations_v_version_status";
  DROP TYPE "payload"."enum__destinations_v_published_locale";`)
}
