ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "home_penalty_score" integer;
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "away_penalty_score" integer;
