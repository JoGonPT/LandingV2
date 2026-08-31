import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"credit" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_miniatura_url" varchar,
  	"sizes_miniatura_width" numeric,
  	"sizes_miniatura_height" numeric,
  	"sizes_miniatura_mime_type" varchar,
  	"sizes_miniatura_filesize" numeric,
  	"sizes_miniatura_filename" varchar,
  	"sizes_movel_url" varchar,
  	"sizes_movel_width" numeric,
  	"sizes_movel_height" numeric,
  	"sizes_movel_mime_type" varchar,
  	"sizes_movel_filesize" numeric,
  	"sizes_movel_filename" varchar,
  	"sizes_destaque_url" varchar,
  	"sizes_destaque_width" numeric,
  	"sizes_destaque_height" numeric,
  	"sizes_destaque_mime_type" varchar,
  	"sizes_destaque_filesize" numeric,
  	"sizes_destaque_filename" varchar
  );
  
  CREATE TABLE "payload"."media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload"."destinations" ADD COLUMN "image_id" integer;
  ALTER TABLE "payload"."_destinations_v" ADD COLUMN "version_image_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "payload"."media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_miniatura_sizes_miniatura_filename_idx" ON "payload"."media" USING btree ("sizes_miniatura_filename");
  CREATE INDEX "media_sizes_movel_sizes_movel_filename_idx" ON "payload"."media" USING btree ("sizes_movel_filename");
  CREATE INDEX "media_sizes_destaque_sizes_destaque_filename_idx" ON "payload"."media" USING btree ("sizes_destaque_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "payload"."media_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload"."destinations" ADD CONSTRAINT "destinations_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."_destinations_v" ADD CONSTRAINT "_destinations_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "destinations_image_idx" ON "payload"."destinations" USING btree ("image_id");
  CREATE INDEX "_destinations_v_version_version_image_idx" ON "payload"."_destinations_v" USING btree ("version_image_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."media_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."media_locales" CASCADE;
  ALTER TABLE "payload"."destinations" DROP CONSTRAINT "destinations_image_id_media_id_fk";
  
  ALTER TABLE "payload"."_destinations_v" DROP CONSTRAINT "_destinations_v_version_image_id_media_id_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";
  
  DROP INDEX "payload"."destinations_image_idx";
  DROP INDEX "payload"."_destinations_v_version_version_image_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_media_id_idx";
  ALTER TABLE "payload"."destinations" DROP COLUMN "image_id";
  ALTER TABLE "payload"."_destinations_v" DROP COLUMN "version_image_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "media_id";`)
}
