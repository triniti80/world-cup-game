ALTER TABLE "stage_predictions"
  ALTER COLUMN "team_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "stage_predictions"
  ADD COLUMN IF NOT EXISTS "placeholder_key" text;
