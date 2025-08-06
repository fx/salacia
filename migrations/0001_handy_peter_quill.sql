CREATE TABLE "ai_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"model" varchar(100) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"prompt_tokens" integer NOT NULL,
	"response_tokens" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"response_time_ms" integer NOT NULL,
	"cost" numeric(10, 6),
	"request_data" jsonb,
	"response_data" jsonb,
	"user_message" text,
	"assistant_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_interactions_created_at_idx" ON "ai_interactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ai_interactions_model_idx" ON "ai_interactions" USING btree ("model");--> statement-breakpoint
CREATE INDEX "ai_interactions_total_tokens_idx" ON "ai_interactions" USING btree ("total_tokens");--> statement-breakpoint
CREATE INDEX "ai_interactions_response_time_idx" ON "ai_interactions" USING btree ("response_time_ms");--> statement-breakpoint
CREATE INDEX "ai_interactions_conversation_id_idx" ON "ai_interactions" USING btree ("conversation_id");