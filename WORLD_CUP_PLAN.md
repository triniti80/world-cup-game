# World Cup Friends Prediction Game - Project Plan

**Status:** Draft v0.2  
**Owner:** Avi Caspi  
**Created:** 2026-05-20  
**Updated:** 2026-05-22  
**Target tournament:** FIFA World Cup 2026

---

## 1. Goal

Build a private website where friends can create accounts, log in, create private leagues, choose a league game mode, predict World Cup results, and see a live standings table.

The core experience:

1. Users register and log in with email/password.
2. Users create or join private leagues.
3. The league creator chooses which game option the league is playing.
4. Everyone sees the full World Cup fixture list.
5. Users make predictions based on the league's game mode.
6. The app calculates points only for the prediction type enabled in that league.
7. A leaderboard updates whenever predictions, real scores, or official qualifiers change.

This should start as a private friends game, not a public betting platform.

---

## 1A. League Game Options

Each league must choose one game option when the league is created.

### Option 1 - Pre-tournament stage prediction game

Users create a tournament prediction before the World Cup starts.

Users predict which teams will qualify to each stage:

- Round of 32.
- Round of 16.
- Quarter-finals.
- Semi-finals.
- Final.
- Champion.

Users receive points for every team that reaches a stage they predicted, using the stage scoring rules defined below.

Users can also predict the tournament top scorer before the World Cup starts.

This game option is about tournament outcome prediction, not individual match scores.

### Option 2 - Match score guessing game

Users guess the score of each match before that match starts.

Users receive points for:

- Correct match outcome.
- Exact score.

Users can also make two pre-tournament bonus picks before the World Cup starts:

- Tournament top scorer.
- World Cup winner.

This game option is about match-by-match score prediction, not pre-tournament stage picks.

### Future option - Combined league

Optional later feature: allow a league to enable both game options together. MVP should start with exactly one selected game option per league because it keeps instructions, lock rules, and leaderboard scoring simpler.

---

## 2. Important Legal Boundary

The word "gambling" can trigger legal, payment, licensing, and age-verification requirements depending on country/state and whether real money, prizes, entry fees, or odds are involved.

For the MVP:

- Do not process payments in the app.
- Do not hold player funds.
- Do not publish odds.
- Do not run public betting pools.
- Treat the site as a private prediction league between friends.
- If money or prizes are involved, track that outside the app until a proper legal review is done.

Optional later feature after legal review: simple private league buy-in tracking where the app records "paid/unpaid" manually, but still does not process payments.

---

## 3. Tournament Assumptions

The 2026 World Cup format is:

- 48 teams.
- 12 groups of 4 teams.
- 104 total fixtures.
- Top 2 teams from each group qualify automatically to the Round of 32.
- The 8 best third-placed teams also qualify to the Round of 32.
- Knockout rounds: Round of 32, Round of 16, Quarter-finals, Semi-finals, Final.

Fixture and team data should be imported from a trusted source, preferably FIFA's official schedule. The app should keep tournament data editable by an admin because fixtures, kickoff times, team names, and venues can change.

---

## 4. Scoring Rules

Scoring depends on the league game option.

### Match score predictions

Applies only to leagues using **Option 2 - Match score guessing game**.

For every match where a user predicts the exact score before the prediction deadline:

- Correct winner/draw outcome: **2 points**.
- Exact score: **5 points total**.

Interpretation: exact score includes the correct outcome, so it awards 5 points total, not 2 + 5.

Examples:

- Real result: Argentina 2-1 France.
- Prediction: Argentina 1-0 France -> correct winner, 2 points.
- Prediction: Argentina 2-1 France -> exact score, 5 points.
- Prediction: Argentina 1-1 France -> wrong outcome, 0 points.

### Qualifier predictions

Applies only to leagues using **Option 1 - Pre-tournament stage prediction game**.

Users earn points for predicting which teams reach each stage:

- Team reaches Round of 32: **10 points per correct team**.
- Team reaches Round of 16: **20 points per correct team**.
- Team reaches Quarter-finals: **40 points per correct team**.
- Team reaches Semi-finals: **80 points per correct team**.
- Team reaches Final: **120 points per correct team**.
- Team wins the World Cup: **150 points**.

Stage points are cumulative by default. A correctly predicted champion also counts as reaching the Final, Semi-finals, Quarter-finals, Round of 16, and Round of 32 if the user predicted that team in those stages.

### Pre-tournament bonus picks

These picks must be submitted before the World Cup starts and lock 1 hour before the first match.

Top scorer pick:

- Available in both league game options.
- User predicts the tournament top scorer / Golden Boot winner.
- Correct pick: **100 points**.

World Cup winner pick:

- Available in **Option 2 - Match score guessing game** leagues.
- User predicts the tournament champion before the World Cup starts.
- Correct pick: **100 points**.
- This is separate from per-match score predictions.

Tie handling for top scorer should follow the official tournament award. If FIFA awards or recognizes a single Golden Boot winner by tiebreakers, the app should score that official winner as correct. If the product later wants to accept shared top scorers, that should be a separate rule change.

---

## 5. Locking Rules

Locking rules depend on the league game option.

### Team/qualifier picks

Applies only to **Option 1 - Pre-tournament stage prediction game** leagues.

Qualifier picks lock **1 hour before the first match of the tournament**.

This means users must finalize their predicted:

- Round of 32 qualifiers.
- Round of 16 qualifiers.
- Quarter-finalists.
- Semi-finalists.
- Finalists.
- Champion.

Recommended MVP behavior:

- Pre-tournament qualifier picks lock globally 1 hour before Match 1.
- After that, users cannot change stage/team picks.
- Admins can unlock temporarily only for correction/emergency reasons, with an audit log.

### Pre-tournament bonus picks

Top scorer picks and match-score-league winner picks lock **1 hour before the first match of the tournament**.

After that lock:

- Users cannot add or edit the top scorer pick.
- Users in match score guessing leagues cannot add or edit the World Cup winner pick.
- Backend validation must enforce the lock.

### Match score picks

Applies only to **Option 2 - Match score guessing game** leagues.

Each match score prediction locks **5 minutes before that match's kickoff time**.

Users can edit predictions freely until the lock time. After lock time:

- The prediction is read-only.
- The backend must enforce the lock, not only the UI.

### Time zones

All match kickoff times should be stored in UTC. The UI should display local time based on the user's browser, with the original venue local time available in match details.

### Prediction visibility

Predictions are private while they are still editable, and stay private during the short locked-before-kickoff window. Once the relevant reveal time passes, they become visible to everyone in the same league.

Qualifier and stage predictions:

- Hidden from other users before the first tournament match starts.
- Visible to everyone in the league after the first tournament match starts.
- Applies only to pre-tournament stage prediction leagues.

Pre-tournament bonus picks:

- Hidden from other users before the first tournament match starts.
- Visible to everyone in the league after the first tournament match starts.
- Applies to top scorer picks in both game options.
- Applies to World Cup winner picks in match score guessing leagues.

Match score predictions:

- Hidden from other users before the match starts.
- Visible to everyone in the league once that specific match starts.
- Applies only to match score guessing leagues.
- The backend must enforce this visibility rule, not only the UI.

Recommended UI behavior: before visibility opens, show only whether a user has submitted a prediction, not the predicted teams/scores.

---

## 6. Main User Flows

### Registration and login

1. User opens the site.
2. User creates an account with name, email, and password.
3. User logs in.
4. User creates a league or joins a private league by invite code or admin approval.

### Create league

1. User opens "Create League".
2. User enters league name.
3. User chooses one game option:
   - Pre-tournament stage prediction game.
   - Match score guessing game.
4. App creates the league and invite code.
5. League creator can share the invite code with friends.

The league game option is fixed after the first member joins or after any prediction is submitted. Admin-only changes may be allowed before play starts if no predictions exist.

### Make predictions

1. User opens "My Predictions".
2. App shows the prediction UI for the user's current league game option.
3. For pre-tournament stage prediction leagues:
   - User selects teams they believe will reach each stage.
   - User saves Round of 32, Round of 16, Quarter-finals, Semi-finals, Final, and Champion picks before the global lock.
   - User predicts the tournament top scorer before the global lock.
4. For match score guessing leagues:
   - Fixtures are shown by date, group, and stage.
   - User enters predicted home/away scores before each match lock.
   - For knockout matches ending in a predicted draw, user chooses the advancing team.
   - User predicts the tournament top scorer before the global pre-tournament lock.
   - User predicts the World Cup winner before the global pre-tournament lock.
5. User saves progress.

### Admin enters real results

1. Admin opens "Admin Results".
2. Admin enters final score for completed matches.
3. Admin marks match status as final.
4. App recalculates group tables, official qualifiers, and user points.
5. Leaderboard updates.

Optional later: automatically import official scores.

### View everyone else's predictions

1. User opens a fixture, bracket, or leaderboard detail.
2. Before the relevant visibility time, the app shows which users have submitted but hides the actual guesses.
3. After the first tournament match starts, the app reveals everyone's pre-tournament bonus picks in that league.
4. In pre-tournament stage prediction leagues, after the first tournament match starts, the app reveals everyone's stage predictions.
5. In match score guessing leagues, after a specific match starts, the app reveals everyone's score prediction for that match.

### Leaderboard

1. User opens "Standings".
2. App shows all participants sorted by total points.
3. User can expand a row to see points breakdown:
   - In match score guessing leagues: match result points, exact score points, top scorer bonus points, and World Cup winner bonus points.
   - In pre-tournament stage prediction leagues: Round of 32, Round of 16, Quarter-final, Semi-final, Final, Champion, and top scorer bonus points.

---

## 7. Product Screens

### Public/auth screens

- Register.
- Login.
- Forgot password, later.

### App screens

- Dashboard: next matches, user's missing predictions, user's rank.
- Leagues: create league, join league, switch active league, and view league game option.
- Fixtures: all matches, filters by date/group/stage.
- My Predictions: mode-specific prediction screen, editable before lock and read-only after lock.
- League Predictions: everyone's revealed guesses after the relevant visibility time.
- Bracket: visual knockout tree and selected advancing teams.
- Leaderboard: live standings.
- Game Instructions: plain-language how-to-play guide for users.
- Rules: scoring and deadlines.
- Profile: name/password management.

### Admin screens

- Manage tournament teams.
- Manage groups.
- Manage fixtures/kickoff times.
- Enter real match results.
- Confirm official qualifiers.
- Manage users/leagues.
- View audit log.

### Game Instructions page content

The Game Instructions page should explain the game in simple language so a new player can join without asking the admin how it works.

Content to include:

- How to register, log in, and join the league.
- How league game options work.
- How to create a league and choose the game option.
- For pre-tournament stage prediction leagues: how to pick teams for each stage.
- For match score guessing leagues: how to enter score guesses.
- How to submit the top scorer bonus pick.
- How match score guessing leagues submit the World Cup winner bonus pick.
- When team/stage picks lock.
- When pre-tournament bonus picks lock.
- When match score guesses lock.
- When everyone else's guesses become visible.
- How points are awarded for the selected league game option.
- How the leaderboard works.
- What to do if a fixture, team, or score looks wrong.

The page should be readable before the tournament starts and remain useful during the tournament. It should link directly to My Predictions, Fixtures, Bracket, and Leaderboard.

---

## 8. Data Model

Initial tables:

```sql
users (
  id,
  name,
  email,
  password_hash,
  role, -- user/admin
  created_at,
  updated_at
)

leagues (
  id,
  name,
  invite_code,
  game_mode, -- stage_predictions or match_scores
  created_by_user_id,
  created_at
)

league_members (
  id,
  league_id,
  user_id,
  display_name,
  joined_at
)

tournaments (
  id,
  name,
  year,
  prediction_lock_at,
  created_at
)

teams (
  id,
  tournament_id,
  fifa_code,
  name,
  group_code,
  flag_url
)

matches (
  id,
  tournament_id,
  match_number,
  stage, -- group, r32, r16, qf, sf, final
  group_code,
  home_team_id,
  away_team_id,
  home_placeholder,
  away_placeholder,
  kickoff_at_utc,
  venue,
  status, -- scheduled, live, final
  home_score,
  away_score,
  winner_team_id,
  created_at,
  updated_at
)

match_predictions (
  id,
  user_id,
  league_id,
  match_id,
  home_score,
  away_score,
  predicted_winner_team_id,
  locked_at,
  submitted_at,
  updated_at
)

stage_predictions (
  id,
  user_id,
  league_id,
  tournament_id,
  stage, -- r32, r16, qf, sf, final, champion
  team_id,
  source, -- calculated, manual
  submitted_at,
  updated_at
)

bonus_predictions (
  id,
  user_id,
  league_id,
  tournament_id,
  type, -- top_scorer, tournament_winner
  player_name, -- used for top_scorer
  team_id, -- used for tournament_winner
  locked_at,
  submitted_at,
  updated_at
)

score_events (
  id,
  user_id,
  league_id,
  tournament_id,
  game_mode, -- copied from league at calculation time
  source_type, -- match_prediction, stage_prediction, bonus_prediction
  source_id,
  points,
  reason,
  calculated_at
)

audit_log (
  id,
  actor_user_id,
  action,
  entity_type,
  entity_id,
  before_json,
  after_json,
  created_at
)
```

Recommended implementation detail: derive leaderboard totals from `score_events`, and rebuild `score_events` whenever an admin changes an official result. This keeps scoring explainable.

---

## 9. Prediction Calculation Logic

Prediction calculation depends on the league game option.

### Group table calculation

Required only if the app later derives stage predictions from score predictions or supports a combined league mode. For MVP pre-tournament stage prediction leagues, users can directly select the teams they believe will reach each stage.

For each user's predicted group-stage scores:

1. Award 3 table points for a predicted win.
2. Award 1 table point for a predicted draw.
3. Track goals for, goals against, goal difference.
4. Sort by:
   - Points.
   - Goal difference.
   - Goals scored.
   - Head-to-head if implemented.
   - Manual admin/user override for unresolved tiebreakers.

Because real FIFA tiebreakers are detailed, MVP should implement the main ranking fields and allow manual edits for edge cases.

### Round of 32 qualification

Required only if the app derives qualifiers from predicted match scores. For MVP pre-tournament stage prediction leagues, users directly choose their Round of 32 teams.

1. Take top 2 teams from each of 12 predicted groups.
2. Rank third-placed teams.
3. Take the best 8 third-placed teams.
4. Show the calculated 32 teams.
5. Allow the user to manually edit/override before lock.

### Knockout progression

For match score guessing leagues:

1. User predicts score.
2. App determines predicted winner.
3. Winner advances into the next bracket slot.
4. If predicted score is a draw in a knockout match, the UI must ask the user to choose the team that advances.

For pre-tournament stage prediction leagues:

1. User directly chooses teams for each stage before the tournament starts.
2. The app validates the required number of teams per stage.
3. Scoring compares the user's selected teams against official stage qualifiers.

### Bonus prediction scoring

Top scorer:

1. User submits one top scorer pick before the global pre-tournament lock.
2. Admin records or imports the official Golden Boot winner after the tournament.
3. Correct pick receives 100 points.

World Cup winner bonus:

1. User in a match score guessing league submits one champion pick before the global pre-tournament lock.
2. Admin records or imports the official champion after the Final.
3. Correct pick receives 100 points.

---

## 10. Backend Requirements

- Store each league's selected game option.
- Validate that submitted predictions match the league game option:
  - Stage predictions only for pre-tournament stage prediction leagues.
  - Match score predictions only for match score guessing leagues.
  - Top scorer bonus predictions for both league game options.
  - World Cup winner bonus predictions only for match score guessing leagues.
- Use server-side validation for every prediction.
- Enforce all locks on the server.
- Enforce prediction visibility on the server:
  - Only the owner can see their own unrevealed predictions.
  - League members can see bonus predictions only after the first tournament match starts.
  - League members can see qualifier/stage predictions only after the first tournament match starts.
  - League members can see match score predictions only after that match starts.
- Hash passwords with Argon2 or bcrypt.
- Use secure HTTP-only session cookies.
- Add CSRF protection for forms/mutations.
- Use role checks for admin-only result entry.
- Keep audit logs for:
  - Admin result changes.
  - Fixture time changes.
  - User prediction changes after admin unlock.
  - Scoring recalculations.

Recommended stack if using this repo:

- Next.js app router.
- Postgres.
- Drizzle ORM.
- Existing password/session helpers where appropriate.

---

## 11. Frontend Requirements

Design should be fast and practical, more like a fantasy sports dashboard than a marketing website.

Key UI principles:

- League creation includes a clear game-option selector.
- Dashboard and navigation show the active league and game option.
- My Predictions changes based on the active league game option.
- Fixtures grouped by date and stage.
- Clear lock status per match.
- Inline score inputs for match score guessing leagues.
- Stage/team selectors for pre-tournament stage prediction leagues.
- Top scorer selector/search for both league game options.
- World Cup winner selector for match score guessing leagues.
- Bracket view for knockout rounds.
- Leaderboard always easy to reach.
- Mobile-first layout because friends will likely update scores from phones.
- No decorative landing page for MVP; first screen after login should be the dashboard.

Important states:

- Prediction missing.
- Prediction saved.
- Prediction locked.
- Match completed.
- Points awarded.
- User is tied on leaderboard.

---

## 12. Admin and Data Import

### MVP

- Seed the 2026 tournament from a JSON file.
- Admin can edit teams, groups, fixtures, and kickoff times.
- Admin manually enters final scores.

### Later

- Add official data import/sync.
- Keep imported data review-first: show changes before applying them.
- Track fixture updates in audit log.

Suggested seed files:

```text
data/world-cup-2026/teams.json
data/world-cup-2026/groups.json
data/world-cup-2026/fixtures.json
```

---

## 13. Phased Build Plan

### Phase 1 - Product foundation

- Create/rename project for the World Cup app.
- Add database schema and migrations.
- Implement user registration, login, logout.
- Add league creation, game option selection, invite code joining, and basic league membership.
- Seed tournament, teams, groups, and fixtures.
- Add a Game Instructions page linked from the main navigation.

Acceptance criteria:

- A user can register, log in, and see the fixture list.
- A user can create a league and choose one game option.
- A user can join a league by invite code.
- Admin can see fixture management pages.
- Users can open the Game Instructions page and understand how to play.

### Phase 2 - Match score guessing game

- Build score prediction form for group fixtures.
- Add top scorer and World Cup winner bonus picks for match score guessing leagues.
- Enforce global pre-tournament lock for bonus picks.
- Enforce per-match 5-minute lock.
- Hide other users' score predictions until each match starts.
- Limit score prediction features to leagues using the match score guessing game option.

Acceptance criteria:

- A user can predict every group match.
- A user can submit top scorer and World Cup winner bonus picks before the tournament starts.
- Bonus picks cannot be edited after the global pre-tournament lock.
- Locked matches cannot be edited from UI or API.
- Other users' score predictions become visible only once that match starts.

### Phase 3 - Pre-tournament stage prediction game

- Build team selection UI for Round of 32 through Champion picks.
- Add top scorer bonus pick for pre-tournament stage prediction leagues.
- Validate required team counts for each stage.
- Enforce global stage/team lock 1 hour before the first tournament match.
- Hide other users' stage predictions until the first tournament match starts.
- Limit stage prediction features to leagues using the pre-tournament stage prediction game option.

Acceptance criteria:

- A user can complete all stage/team predictions before the tournament starts.
- A user can submit a top scorer bonus pick before the tournament starts.
- The app validates the correct number of teams per stage.
- Locked stage predictions cannot be edited from UI or API.
- Everyone's stage predictions become visible after the first tournament match starts.

### Phase 4 - Knockout match score support

- Build Round of 32 through Final bracket UI.
- Let users predict knockout scores and advancing teams.
- Handle knockout draws by requiring an advancing-team choice.
- Enforce per-match score lock.

Acceptance criteria:

- A user in a match score guessing league can predict knockout match scores.
- The bracket advances selected teams correctly.
- Knockout score predictions become visible only once each match starts.

### Phase 5 - Results and scoring

- Add admin result entry.
- Implement scoring engine.
- Store score events.
- Build leaderboard with points breakdown.
- Score each league according to its selected game option.
- Score top scorer and World Cup winner bonus picks where applicable.

Acceptance criteria:

- Admin can enter final scores.
- Leaderboard recalculates correctly.
- Users can see why they received each point total.

### Phase 6 - Polish and reliability

- Add password reset.
- Add invite links.
- Add CSV export.
- Add automated tests for scoring and locks.
- Add mobile polish.
- Add deployment docs.

Acceptance criteria:

- The game is ready for a friend group to use during the tournament.
- Core scoring rules are covered by tests.

---

## 14. Test Plan

Priority tests:

- Password registration/login.
- League creation with selected game option.
- Joining a league by invite code.
- Stage prediction submissions rejected for match score guessing leagues.
- Match score prediction submissions rejected for pre-tournament stage prediction leagues.
- Top scorer bonus prediction accepted for both league game options.
- World Cup winner bonus prediction accepted for match score guessing leagues.
- World Cup winner bonus prediction rejected for pre-tournament stage prediction leagues.
- Prediction save/update.
- Bonus picks lock 1 hour before first match.
- Match locks 5 minutes before kickoff.
- Tournament/team lock 1 hour before first match.
- Other users' bonus predictions hidden before first tournament match starts.
- Other users' bonus predictions visible after first tournament match starts.
- Other users' qualifier/stage predictions hidden before first tournament match starts.
- Other users' qualifier/stage predictions visible after first tournament match starts.
- Other users' match score predictions hidden before that match starts.
- Other users' match score predictions visible after that match starts.
- Group table calculation, if stage picks are later derived from score predictions.
- Best third-place qualification, if stage picks are later derived from score predictions.
- Knockout draw requires advancing team.
- Match points:
  - exact score = 5.
  - correct winner/draw only = 2.
  - wrong result = 0.
- Stage points by round.
- Top scorer bonus:
  - correct top scorer = 100.
  - wrong top scorer = 0.
- World Cup winner bonus:
  - correct winner = 100.
  - wrong winner = 0.
- Leaderboard sorting and ties.
- Admin result update triggers recalculation.
- Game Instructions page is available to logged-in users and includes scoring, locks, visibility, and leaderboard guidance.

---

## 15. Open Questions

1. Will there be real money/prizes, or is this purely a points game?
2. Should exact score be 5 points total or 7 points total including winner points? Recommended: 5 total.
3. Should combined leagues that include both game options be supported later?
4. For a later combined mode, should knockout teams be predicted before the tournament, or should each round unlock after official teams are known?
5. Should the top scorer pick use a free-text player name, a player database, or an admin-managed shortlist?
6. Should admins enter real results and official award winners manually, or should the app eventually sync official data?
7. Do users need social login, or is email/password enough?

---

## 16. MVP Definition

The MVP is complete when:

- Users can register/login.
- Users can create leagues and choose either pre-tournament stage prediction or match score guessing.
- Users can join leagues by invite code.
- Users can make predictions appropriate to the league game option.
- Users can submit available pre-tournament bonus picks.
- Prediction locks work correctly.
- Predictions are revealed to league members only after the correct visibility time.
- Admin can enter real results.
- Scores are calculated automatically.
- A standings table is always available.
- A Game Instructions page explains how to play.
- The app works comfortably on mobile.
