CREATE TABLE "ai_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model" varchar(100) NOT NULL,
	"provider" varchar(50),
	"request" jsonb NOT NULL,
	"response" jsonb,
	"status_code" integer,
	"error" text,
	"response_time_ms" integer,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "ai_interactions_cursor_idx" ON "ai_interactions" USING btree ("created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "ai_interactions_model_idx" ON "ai_interactions" USING btree ("model");--> statement-breakpoint
CREATE INDEX "ai_interactions_error_status_idx" ON "ai_interactions" USING btree ("error");
