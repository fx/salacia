CREATE TABLE "ai_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"base_url" varchar(500),
	"api_key" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"configuration" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_providers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "api_authentication" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_name" varchar(100) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"permissions" jsonb,
	"last_used" timestamp,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_authentication_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "api_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"provider_id" uuid,
	"model" varchar(100),
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"request_data" jsonb,
	"response_data" jsonb,
	"processing_time_ms" integer,
	"cost" varchar(20),
	"success" boolean NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_interactions" ADD CONSTRAINT "api_interactions_request_id_api_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."api_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_interactions" ADD CONSTRAINT "api_interactions_provider_id_ai_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE no action ON UPDATE no action;