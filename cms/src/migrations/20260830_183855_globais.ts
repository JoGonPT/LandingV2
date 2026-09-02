import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."_locales" AS ENUM('pt', 'en');
  CREATE TABLE "payload"."common" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."common_locales" (
  	"back" varchar,
  	"reserve" varchar,
  	"faq" varchar,
  	"privacy" varchar,
  	"contact" varchar,
  	"loading" varchar,
  	"copyright" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."hero" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."hero_locales" (
  	"badge" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"cta" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."booking" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."booking_locales" (
  	"title" varchar,
  	"route" varchar,
  	"pickup" varchar,
  	"dropoff" varchar,
  	"datetime" varchar,
  	"date" varchar,
  	"time" varchar,
  	"details" varchar,
  	"passengers" varchar,
  	"luggage" varchar,
  	"distance_km" varchar,
  	"flight" varchar,
  	"flight_placeholder" varchar,
  	"child_seat" varchar,
  	"contact_info" varchar,
  	"name" varchar,
  	"email" varchar,
  	"confirm_email" varchar,
  	"whatsapp" varchar,
  	"gdpr_text" varchar,
  	"gdpr_link" varchar,
  	"submit" varchar,
  	"checkout_choose_vehicle" varchar,
  	"checkout_vehicle_step_title" varchar,
  	"checkout_continue_from_form" varchar,
  	"checkout_continue_to_pay" varchar,
  	"checkout_loading_vehicles" varchar,
  	"checkout_loading_checkout" varchar,
  	"checkout_total_to_pay" varchar,
  	"checkout_confirm_pay" varchar,
  	"checkout_processing" varchar,
  	"checkout_back" varchar,
  	"checkout_no_vehicles" varchar,
  	"checkout_stripe_missing" varchar,
  	"checkout_breakdown_title" varchar,
  	"checkout_summary_title" varchar,
  	"checkout_summary_route" varchar,
  	"checkout_summary_when" varchar,
  	"checkout_summary_vehicle" varchar,
  	"checkout_summary_extras" varchar,
  	"checkout_summary_child_seat" varchar,
  	"checkout_summary_luggage" varchar,
  	"checkout_summary_seats" varchar,
  	"checkout_summary_total" varchar,
  	"checkout_summary_updating" varchar,
  	"checkout_summary_pending_price" varchar,
  	"checkout_summary_none" varchar,
  	"checkout_vehicles_business_class" varchar,
  	"checkout_vehicles_first_class" varchar,
  	"checkout_vehicles_business_van" varchar,
  	"checkout_vehicles_business_hint" varchar,
  	"checkout_vehicles_first_hint" varchar,
  	"checkout_vehicles_van_hint" varchar,
  	"checkout_vehicles_seats" varchar,
  	"checkout_route_preview_title" varchar,
  	"checkout_route_preview_loading" varchar,
  	"checkout_route_preview_suggested" varchar,
  	"checkout_route_preview_from" varchar,
  	"checkout_route_preview_distance_eta" varchar,
  	"checkout_route_preview_distance_only" varchar,
  	"checkout_route_preview_eta_note" varchar,
  	"checkout_route_preview_availability_note" varchar,
  	"checkout_breakdown_base_fee" varchar,
  	"checkout_breakdown_per_km" varchar,
  	"checkout_breakdown_per_min" varchar,
  	"checkout_breakdown_vehicle_multiplier" varchar,
  	"checkout_breakdown_time_surcharge" varchar,
  	"checkout_breakdown_minimum_fare" varchar,
  	"success_title" varchar,
  	"success_message" varchar,
  	"success_order_label" varchar,
  	"success_reference_hint" varchar,
  	"success_close" varchar,
  	"errors_generic" varchar,
  	"errors_gdpr" varchar,
  	"errors_email_mismatch" varchar,
  	"errors_distance_required" varchar,
  	"errors_distance_pending" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."faq" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."faq_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."footer_locales" (
  	"contacts" varchar,
  	"legal" varchar,
  	"privacy" varchar,
  	"terms" varchar,
  	"cookies" varchar,
  	"about" varchar,
  	"about_text" varchar,
  	"explore" varchar,
  	"airport_transfers" varchar,
  	"by_the_hour" varchar,
  	"copyright" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."cookies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."cookies_locales" (
  	"text" varchar,
  	"policy" varchar,
  	"accept" varchar,
  	"reject" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."legal_privacy_sections_subsections" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"legal_basis" varchar
  );
  
  CREATE TABLE "payload"."legal_privacy_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"content" varchar,
  	"after_list" varchar,
  	"footer" varchar
  );
  
  CREATE TABLE "payload"."legal_terms_parts_sections_subsections" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"legal_basis" varchar
  );
  
  CREATE TABLE "payload"."legal_terms_parts_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"content" varchar,
  	"after_list" varchar,
  	"footer" varchar
  );
  
  CREATE TABLE "payload"."legal_terms_parts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."legal_cookies_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"content" varchar
  );
  
  CREATE TABLE "payload"."legal" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."legal_locales" (
  	"privacy_title" varchar,
  	"privacy_updated" varchar,
  	"terms_title" varchar,
  	"terms_updated" varchar,
  	"cookies_title" varchar,
  	"cookies_updated" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."legal_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "payload"."_locales"
  );
  
  ALTER TABLE "payload"."common_locales" ADD CONSTRAINT "common_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."common"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."hero_locales" ADD CONSTRAINT "hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."booking_locales" ADD CONSTRAINT "booking_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."booking"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."faq_items" ADD CONSTRAINT "faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."faq_locales" ADD CONSTRAINT "faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."footer_locales" ADD CONSTRAINT "footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."cookies_locales" ADD CONSTRAINT "cookies_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."cookies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."legal_privacy_sections_subsections" ADD CONSTRAINT "legal_privacy_sections_subsections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."legal_privacy_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."legal_privacy_sections" ADD CONSTRAINT "legal_privacy_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."legal"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."legal_terms_parts_sections_subsections" ADD CONSTRAINT "legal_terms_parts_sections_subsections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."legal_terms_parts_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."legal_terms_parts_sections" ADD CONSTRAINT "legal_terms_parts_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."legal_terms_parts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."legal_terms_parts" ADD CONSTRAINT "legal_terms_parts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."legal"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."legal_cookies_sections" ADD CONSTRAINT "legal_cookies_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."legal"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."legal_locales" ADD CONSTRAINT "legal_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."legal"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."legal_texts" ADD CONSTRAINT "legal_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."legal"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "common_locales_locale_parent_id_unique" ON "payload"."common_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "hero_locales_locale_parent_id_unique" ON "payload"."hero_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "booking_locales_locale_parent_id_unique" ON "payload"."booking_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "faq_items_order_idx" ON "payload"."faq_items" USING btree ("_order");
  CREATE INDEX "faq_items_parent_id_idx" ON "payload"."faq_items" USING btree ("_parent_id");
  CREATE INDEX "faq_items_locale_idx" ON "payload"."faq_items" USING btree ("_locale");
  CREATE UNIQUE INDEX "faq_locales_locale_parent_id_unique" ON "payload"."faq_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "footer_locales_locale_parent_id_unique" ON "payload"."footer_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "cookies_locales_locale_parent_id_unique" ON "payload"."cookies_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "legal_privacy_sections_subsections_order_idx" ON "payload"."legal_privacy_sections_subsections" USING btree ("_order");
  CREATE INDEX "legal_privacy_sections_subsections_parent_id_idx" ON "payload"."legal_privacy_sections_subsections" USING btree ("_parent_id");
  CREATE INDEX "legal_privacy_sections_subsections_locale_idx" ON "payload"."legal_privacy_sections_subsections" USING btree ("_locale");
  CREATE INDEX "legal_privacy_sections_order_idx" ON "payload"."legal_privacy_sections" USING btree ("_order");
  CREATE INDEX "legal_privacy_sections_parent_id_idx" ON "payload"."legal_privacy_sections" USING btree ("_parent_id");
  CREATE INDEX "legal_privacy_sections_locale_idx" ON "payload"."legal_privacy_sections" USING btree ("_locale");
  CREATE INDEX "legal_terms_parts_sections_subsections_order_idx" ON "payload"."legal_terms_parts_sections_subsections" USING btree ("_order");
  CREATE INDEX "legal_terms_parts_sections_subsections_parent_id_idx" ON "payload"."legal_terms_parts_sections_subsections" USING btree ("_parent_id");
  CREATE INDEX "legal_terms_parts_sections_subsections_locale_idx" ON "payload"."legal_terms_parts_sections_subsections" USING btree ("_locale");
  CREATE INDEX "legal_terms_parts_sections_order_idx" ON "payload"."legal_terms_parts_sections" USING btree ("_order");
  CREATE INDEX "legal_terms_parts_sections_parent_id_idx" ON "payload"."legal_terms_parts_sections" USING btree ("_parent_id");
  CREATE INDEX "legal_terms_parts_sections_locale_idx" ON "payload"."legal_terms_parts_sections" USING btree ("_locale");
  CREATE INDEX "legal_terms_parts_order_idx" ON "payload"."legal_terms_parts" USING btree ("_order");
  CREATE INDEX "legal_terms_parts_parent_id_idx" ON "payload"."legal_terms_parts" USING btree ("_parent_id");
  CREATE INDEX "legal_terms_parts_locale_idx" ON "payload"."legal_terms_parts" USING btree ("_locale");
  CREATE INDEX "legal_cookies_sections_order_idx" ON "payload"."legal_cookies_sections" USING btree ("_order");
  CREATE INDEX "legal_cookies_sections_parent_id_idx" ON "payload"."legal_cookies_sections" USING btree ("_parent_id");
  CREATE INDEX "legal_cookies_sections_locale_idx" ON "payload"."legal_cookies_sections" USING btree ("_locale");
  CREATE UNIQUE INDEX "legal_locales_locale_parent_id_unique" ON "payload"."legal_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "legal_texts_order_parent" ON "payload"."legal_texts" USING btree ("order","parent_id");
  CREATE INDEX "legal_texts_locale_parent" ON "payload"."legal_texts" USING btree ("locale","parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."common" CASCADE;
  DROP TABLE "payload"."common_locales" CASCADE;
  DROP TABLE "payload"."hero" CASCADE;
  DROP TABLE "payload"."hero_locales" CASCADE;
  DROP TABLE "payload"."booking" CASCADE;
  DROP TABLE "payload"."booking_locales" CASCADE;
  DROP TABLE "payload"."faq_items" CASCADE;
  DROP TABLE "payload"."faq" CASCADE;
  DROP TABLE "payload"."faq_locales" CASCADE;
  DROP TABLE "payload"."footer" CASCADE;
  DROP TABLE "payload"."footer_locales" CASCADE;
  DROP TABLE "payload"."cookies" CASCADE;
  DROP TABLE "payload"."cookies_locales" CASCADE;
  DROP TABLE "payload"."legal_privacy_sections_subsections" CASCADE;
  DROP TABLE "payload"."legal_privacy_sections" CASCADE;
  DROP TABLE "payload"."legal_terms_parts_sections_subsections" CASCADE;
  DROP TABLE "payload"."legal_terms_parts_sections" CASCADE;
  DROP TABLE "payload"."legal_terms_parts" CASCADE;
  DROP TABLE "payload"."legal_cookies_sections" CASCADE;
  DROP TABLE "payload"."legal" CASCADE;
  DROP TABLE "payload"."legal_locales" CASCADE;
  DROP TABLE "payload"."legal_texts" CASCADE;
  DROP TYPE "payload"."_locales";`)
}
