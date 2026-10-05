CREATE TABLE "access_links" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"recipient_email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_used_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"use_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "access_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id_hash" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"subject" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sign_in_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sign_in_codes_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit_price_cents" integer NOT NULL,
	"unit" text DEFAULT 'servicio' NOT NULL,
	"default_stage" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"email" text NOT NULL,
	"rfc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issuer_profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"razon_social" text NOT NULL,
	"rfc" text NOT NULL,
	"location" text NOT NULL,
	"logo_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issuer_profile_singleton" CHECK ("issuer_profile"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "folio_counters" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_id" text NOT NULL,
	"version" integer NOT NULL,
	"type" text NOT NULL,
	"message" text,
	"signer_name" text,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_events" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_id" text NOT NULL,
	"type" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_lines" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"service_id" text,
	"title" text NOT NULL,
	"description" text,
	"qty" numeric(10, 2) NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"quotation_id" text NOT NULL,
	"name" text,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"folio" text NOT NULL,
	"client_id" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"currency" text DEFAULT 'MXN' NOT NULL,
	"tax_rate_bp" integer DEFAULT 1600 NOT NULL,
	"issued_on" date NOT NULL,
	"valid_until" date NOT NULL,
	"terms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"published_version" integer,
	"sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "quotations_folio_unique" UNIQUE("folio")
);
--> statement-breakpoint
ALTER TABLE "access_links" ADD CONSTRAINT "access_links_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_actions" ADD CONSTRAINT "quotation_actions_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_events" ADD CONSTRAINT "quotation_events_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_stage_id_quotation_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."quotation_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_lines" ADD CONSTRAINT "quotation_lines_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_stages" ADD CONSTRAINT "quotation_stages_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_links_quotation_idx" ON "access_links" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "sessions_subject_idx" ON "sessions" USING btree ("kind","subject");--> statement-breakpoint
CREATE INDEX "quotation_actions_quotation_idx" ON "quotation_actions" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_events_quotation_idx" ON "quotation_events" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_lines_quotation_idx" ON "quotation_lines" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_stages_quotation_idx" ON "quotation_stages" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotations_status_idx" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotations_client_idx" ON "quotations" USING btree ("client_id");