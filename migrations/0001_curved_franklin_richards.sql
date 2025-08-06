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
);
