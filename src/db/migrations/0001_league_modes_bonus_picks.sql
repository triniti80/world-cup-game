CREATE TYPE "public"."bonus_prediction_type" AS ENUM('top_scorer', 'tournament_winner');--> statement-breakpoint
CREATE TYPE "public"."league_game_mode" AS ENUM('stage_predictions', 'match_scores');--> statement-breakpoint
ALTER TYPE "public"."score_event_source_type" ADD VALUE 'bonus_prediction';--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "game_mode" "league_game_mode" DEFAULT 'match_scores' NOT NULL;--> statement-breakpoint
ALTER TABLE "score_events" ADD COLUMN "game_mode" "league_game_mode" DEFAULT 'match_scores' NOT NULL;--> statement-breakpoint
CREATE TABLE "bonus_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"league_id" integer NOT NULL,
	"tournament_id" integer NOT NULL,
	"type" "bonus_prediction_type" NOT NULL,
	"player_name" text,
	"team_id" integer,
	"locked_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bonus_predictions" ADD CONSTRAINT "bonus_predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_predictions" ADD CONSTRAINT "bonus_predictions_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_predictions" ADD CONSTRAINT "bonus_predictions_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_predictions" ADD CONSTRAINT "bonus_predictions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bonus_predictions_unique" ON "bonus_predictions" USING btree ("user_id","league_id","tournament_id","type");--> statement-breakpoint
CREATE INDEX "bonus_predictions_league_idx" ON "bonus_predictions" USING btree ("league_id");
