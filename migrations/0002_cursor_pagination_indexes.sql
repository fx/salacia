-- Add indexes for cursor-based pagination on ai_interactions table
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at_id ON ai_interactions(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_id ON ai_interactions(id DESC);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_model ON ai_interactions(model);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_error ON ai_interactions(error);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_total_tokens ON ai_interactions(total_tokens);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_response_time ON ai_interactions(response_time_ms);