import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const leagueGameModeEnum = pgEnum("league_game_mode", [
  "stage_predictions",
  "match_scores",
]);
export const matchStageEnum = pgEnum("match_stage", [
  "group",
  "r32",
  "r16",
  "qf",
  "sf",
  "third",
  "final",
]);
export const matchStatusEnum = pgEnum("match_status", ["scheduled", "live", "final"]);
export const stagePredictionStageEnum = pgEnum("stage_prediction_stage", [
  "r32",
  "r16",
  "qf",
  "sf",
  "final",
  "champion",
]);
export const stagePredictionSourceEnum = pgEnum("stage_prediction_source", ["calculated", "manual"]);
export const scoreEventSourceTypeEnum = pgEnum("score_event_source_type", [
  "match_prediction",
  "stage_prediction",
  "bonus_prediction",
]);
export const bonusPredictionTypeEnum = pgEnum("bonus_prediction_type", [
  "top_scorer",
  "tournament_winner",
]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    disabledReason: text("disabled_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
  }),
);

export const leagues = pgTable(
  "leagues",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    inviteCode: text("invite_code").notNull(),
    gameMode: leagueGameModeEnum("game_mode").notNull().default("match_scores"),
    createdByUserId: integer("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    inviteCodeUnique: uniqueIndex("leagues_invite_code_unique").on(t.inviteCode),
  }),
);

export const leagueMembers = pgTable(
  "league_members",
  {
    id: serial("id").primaryKey(),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    membershipUnique: uniqueIndex("league_members_user_league_unique").on(t.userId, t.leagueId),
    leagueIdx: index("league_members_league_idx").on(t.leagueId),
  }),
);

export const tournaments = pgTable(
  "tournaments",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    year: integer("year").notNull(),
    firstMatchAt: timestamp("first_match_at", { withTimezone: true }).notNull(),
    predictionLockAt: timestamp("prediction_lock_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    yearUnique: uniqueIndex("tournaments_year_unique").on(t.year),
  }),
);

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    fifaCode: text("fifa_code").notNull(),
    name: text("name").notNull(),
    groupCode: text("group_code"),
    flagUrl: text("flag_url"),
  },
  (t) => ({
    teamSlugUnique: uniqueIndex("teams_tournament_slug_unique").on(t.tournamentId, t.slug),
    groupIdx: index("teams_group_idx").on(t.tournamentId, t.groupCode),
  }),
);

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    matchNumber: integer("match_number").notNull(),
    stage: matchStageEnum("stage").notNull(),
    groupCode: text("group_code"),
    homeTeamId: integer("home_team_id").references(() => teams.id, { onDelete: "set null" }),
    awayTeamId: integer("away_team_id").references(() => teams.id, { onDelete: "set null" }),
    homePlaceholder: text("home_placeholder"),
    awayPlaceholder: text("away_placeholder"),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
    venue: text("venue").notNull(),
    status: matchStatusEnum("status").notNull().default("scheduled"),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    winnerTeamId: integer("winner_team_id").references(() => teams.id, { onDelete: "set null" }),
    winnerSide: text("winner_side"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    matchNumberUnique: uniqueIndex("matches_tournament_number_unique").on(
      t.tournamentId,
      t.matchNumber,
    ),
    stageIdx: index("matches_stage_idx").on(t.tournamentId, t.stage),
  }),
);

export const matchPredictions = pgTable(
  "match_predictions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    predictedWinnerTeamId: integer("predicted_winner_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    predictedWinnerSide: text("predicted_winner_side"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    predictionUnique: uniqueIndex("match_predictions_user_league_match_unique").on(
      t.userId,
      t.leagueId,
      t.matchId,
    ),
    matchIdx: index("match_predictions_match_idx").on(t.matchId),
  }),
);

export const stagePredictions = pgTable(
  "stage_predictions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    tournamentId: integer("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    stage: stagePredictionStageEnum("stage").notNull(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    groupRank: integer("group_rank"),
    source: stagePredictionSourceEnum("source").notNull().default("manual"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    stagePickUnique: uniqueIndex("stage_predictions_unique").on(
      t.userId,
      t.leagueId,
      t.tournamentId,
      t.stage,
      t.teamId,
    ),
  }),
);

export const bonusPredictions = pgTable(
  "bonus_predictions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    tournamentId: integer("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    type: bonusPredictionTypeEnum("type").notNull(),
    playerName: text("player_name"),
    teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bonusPickUnique: uniqueIndex("bonus_predictions_unique").on(
      t.userId,
      t.leagueId,
      t.tournamentId,
      t.type,
    ),
    leagueIdx: index("bonus_predictions_league_idx").on(t.leagueId),
  }),
);

export const officialStageResults = pgTable(
  "official_stage_results",
  {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    stage: stagePredictionStageEnum("stage").notNull(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    officialStageUnique: uniqueIndex("official_stage_results_unique").on(
      t.tournamentId,
      t.stage,
      t.teamId,
    ),
    stageIdx: index("official_stage_results_stage_idx").on(t.tournamentId, t.stage),
  }),
);

export const officialBonusResults = pgTable(
  "official_bonus_results",
  {
    id: serial("id").primaryKey(),
    tournamentId: integer("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    type: bonusPredictionTypeEnum("type").notNull(),
    playerName: text("player_name"),
    teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    officialBonusUnique: uniqueIndex("official_bonus_results_unique").on(t.tournamentId, t.type),
  }),
);

export const scoreEvents = pgTable(
  "score_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    tournamentId: integer("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    gameMode: leagueGameModeEnum("game_mode").notNull().default("match_scores"),
    sourceType: scoreEventSourceTypeEnum("source_type").notNull(),
    sourceId: integer("source_id").notNull(),
    points: integer("points").notNull(),
    reason: text("reason").notNull(),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userScoreIdx: index("score_events_user_idx").on(t.userId, t.leagueId),
  }),
);

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  authEnabled: boolean("auth_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
