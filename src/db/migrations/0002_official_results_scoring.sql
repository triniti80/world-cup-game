CREATE TABLE "official_stage_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"stage" "stage_prediction_stage" NOT NULL,
	"team_id" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_bonus_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"type" "bonus_prediction_type" NOT NULL,
	"player_name" text,
	"team_id" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "official_stage_results" ADD CONSTRAINT "official_stage_results_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_stage_results" ADD CONSTRAINT "official_stage_results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_bonus_results" ADD CONSTRAINT "official_bonus_results_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_bonus_results" ADD CONSTRAINT "official_bonus_results_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "official_stage_results_unique" ON "official_stage_results" USING btree ("tournament_id","stage","team_id");--> statement-breakpoint
CREATE INDEX "official_stage_results_stage_idx" ON "official_stage_results" USING btree ("tournament_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "official_bonus_results_unique" ON "official_bonus_results" USING btree ("tournament_id","type");
