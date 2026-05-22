CREATE TYPE "public"."match_stage" AS ENUM('group', 'r32', 'r16', 'qf', 'sf', 'final');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'final');--> statement-breakpoint
CREATE TYPE "public"."score_event_source_type" AS ENUM('match_prediction', 'stage_prediction');--> statement-breakpoint
CREATE TYPE "public"."stage_prediction_source" AS ENUM('calculated', 'manual');--> statement-breakpoint
CREATE TYPE "public"."stage_prediction_stage" AS ENUM('r32', 'r16', 'qf', 'sf', 'final', 'champion');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"auth_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"display_name" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"invite_code" text NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"league_id" integer NOT NULL,
	"match_id" integer NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"predicted_winner_team_id" integer,
	"locked_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"match_number" integer NOT NULL,
	"stage" "match_stage" NOT NULL,
	"group_code" text,
	"home_team_id" integer,
	"away_team_id" integer,
	"home_placeholder" text,
	"away_placeholder" text,
	"kickoff_at" timestamp with time zone NOT NULL,
	"venue" text NOT NULL,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"winner_team_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"league_id" integer NOT NULL,
	"tournament_id" integer NOT NULL,
	"source_type" "score_event_source_type" NOT NULL,
	"source_id" integer NOT NULL,
	"points" integer NOT NULL,
	"reason" text NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"league_id" integer NOT NULL,
	"tournament_id" integer NOT NULL,
	"stage" "stage_prediction_stage" NOT NULL,
	"team_id" integer NOT NULL,
	"source" "stage_prediction_source" DEFAULT 'manual' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"slug" text NOT NULL,
	"fifa_code" text NOT NULL,
	"name" text NOT NULL,
	"group_code" text,
	"flag_url" text
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"first_match_at" timestamp with time zone NOT NULL,
	"prediction_lock_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_predictions" ADD CONSTRAINT "match_predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_predictions" ADD CONSTRAINT "match_predictions_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_predictions" ADD CONSTRAINT "match_predictions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_predictions" ADD CONSTRAINT "match_predictions_predicted_winner_team_id_teams_id_fk" FOREIGN KEY ("predicted_winner_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_team_id_teams_id_fk" FOREIGN KEY ("winner_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_events" ADD CONSTRAINT "score_events_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_predictions" ADD CONSTRAINT "stage_predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_predictions" ADD CONSTRAINT "stage_predictions_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_predictions" ADD CONSTRAINT "stage_predictions_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_predictions" ADD CONSTRAINT "stage_predictions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "league_members_user_league_unique" ON "league_members" USING btree ("user_id","league_id");--> statement-breakpoint
CREATE INDEX "league_members_league_idx" ON "league_members" USING btree ("league_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leagues_invite_code_unique" ON "leagues" USING btree ("invite_code");--> statement-breakpoint
CREATE UNIQUE INDEX "match_predictions_user_league_match_unique" ON "match_predictions" USING btree ("user_id","league_id","match_id");--> statement-breakpoint
CREATE INDEX "match_predictions_match_idx" ON "match_predictions" USING btree ("match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_tournament_number_unique" ON "matches" USING btree ("tournament_id","match_number");--> statement-breakpoint
CREATE INDEX "matches_stage_idx" ON "matches" USING btree ("tournament_id","stage");--> statement-breakpoint
CREATE INDEX "score_events_user_idx" ON "score_events" USING btree ("user_id","league_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_predictions_unique" ON "stage_predictions" USING btree ("user_id","league_id","tournament_id","stage","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_tournament_slug_unique" ON "teams" USING btree ("tournament_id","slug");--> statement-breakpoint
CREATE INDEX "teams_group_idx" ON "teams" USING btree ("tournament_id","group_code");--> statement-breakpoint
CREATE UNIQUE INDEX "tournaments_year_unique" ON "tournaments" USING btree ("year");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");