CREATE INDEX "ai_interactions_cursor_idx" ON "ai_interactions" USING btree ("created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "ai_interactions_model_idx" ON "ai_interactions" USING btree ("model");--> statement-breakpoint
CREATE INDEX "ai_interactions_error_status_idx" ON "ai_interactions" USING btree ("error");