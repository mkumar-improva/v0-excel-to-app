-- Add token usage columns to ai_responses table
ALTER TABLE ai_responses ADD COLUMN input_tokens INTEGER;
ALTER TABLE ai_responses ADD COLUMN output_tokens INTEGER;
ALTER TABLE ai_responses ADD COLUMN total_tokens INTEGER;
ALTER TABLE ai_responses ADD COLUMN estimated_cost REAL;
