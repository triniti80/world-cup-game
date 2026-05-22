# World Cup Friends Prediction Game - Project Plan

**Status:** Draft v0.1  
**Owner:** Avi Caspi  
**Created:** 2026-05-20  
**Target tournament:** FIFA World Cup 2026

---

## 1. Goal

Build a private website where friends can create accounts, log in, predict World Cup results, track knockout qualifiers, and see a live standings table.

The core experience:

1. Users register and log in with email/password.
2. Everyone sees the full World Cup fixture list.
3. Users predict group-stage match scores.
4. The app calculates predicted group tables and predicted Round of 32 qualifiers.
5. Users can manually edit/override their predicted qualifiers when needed.
6. Users predict knockout match scores and advancing teams round by round.
7. The app calculates points from match predictions and qualifier predictions.
8. A leaderboard updates whenever predictions, real scores, or official qualifiers change.

This should start as a private friends game, not a public betting platform.

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

### Match score predictions

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

Users also earn points for predicting which teams reach each stage:

- Team reaches Round of 32: **10 points per correct team**.
- Team reaches Round of 16: **20 points per correct team**.
- Team reaches Quarter-finals: **30 points per correct team**.
- Team reaches Semi-finals: **40 points per correct team**.
- Team reaches Final: **50 points per correct team**.
- Team wins the World Cup: **60 points**.

Open question to confirm later: whether these are cumulative by stage. Recommended: cumulative, because a correctly predicted champion would also count as reaching every previous knockout stage.

---

## 5. Locking Rules

### Team/qualifier picks

Qualifier picks lock **1 hour before the first match of the tournament**.

This means users must finalize their predicted:

- Group tables.
- Round of 32 qualifiers.
- Knockout bracket progression, if the product asks for a full pre-tournament bracket.

Recommended MVP behavior:

- Pre-tournament qualifier picks lock globally 1 hour before Match 1.
- After that, users cannot change stage/team picks.
- Admins can unlock temporarily only for correction/emergency reasons, with an audit log.

### Match score picks

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
- This includes predicted Round of 32 qualifiers and any pre-filled knockout stage picks.

Match score predictions:

- Hidden from other users before the match starts.
- Visible to everyone in the league once that specific match starts.
- The backend must enforce this visibility rule, not only the UI.

Recommended UI behavior: before visibility opens, show only whether a user has submitted a prediction, not the predicted teams/scores.

---

## 6. Main User Flows

### Registration and login

1. User opens the site.
2. User creates an account with name, email, and password.
3. User logs in.
4. User joins a private league by invite code or admin approval.

MVP can use one default league for the friend group.

### Make predictions

1. User opens "My Predictions".
2. Group-stage fixtures are shown by date and group.
3. User enters predicted home/away scores.
4. The app calculates predicted group standings.
5. The app displays predicted Round of 32 qualifiers.
6. User can manually edit qualifiers if they disagree with calculated tiebreakers or want a bracket-style pick.
7. User fills knockout predictions.
8. User saves progress.

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
3. After the first tournament match starts, the app reveals everyone's qualifier and stage predictions in that league.
4. After a specific match starts, the app reveals everyone's score prediction for that match.

### Leaderboard

1. User opens "Standings".
2. App shows all participants sorted by total points.
3. User can expand a row to see points breakdown:
   - Match result points.
   - Exact score points.
   - Round of 32 points.
   - Round of 16 points.
   - Quarter-final points.
   - Semi-final points.
   - Final/champion points.

---

## 7. Product Screens

### Public/auth screens

- Register.
- Login.
- Forgot password, later.

### App screens

- Dashboard: next matches, user's missing predictions, user's rank.
- Fixtures: all matches, filters by date/group/stage.
- My Predictions: editable predictions before lock, read-only after lock.
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
- How to enter group-stage score guesses.
- How Round of 32 qualifiers are calculated from score guesses.
- How to manually adjust qualifier picks before lock.
- How to fill the knockout bracket.
- When team/stage picks lock.
- When match score guesses lock.
- When everyone else's guesses become visible.
- How points are awarded for match scores and stage qualifiers.
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

score_events (
  id,
  user_id,
  league_id,
  tournament_id,
  source_type, -- match_prediction, stage_prediction
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

### Group table calculation

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

1. Take top 2 teams from each of 12 predicted groups.
2. Rank third-placed teams.
3. Take the best 8 third-placed teams.
4. Show the calculated 32 teams.
5. Allow the user to manually edit/override before lock.

### Knockout progression

For each knockout match:

1. User predicts score.
2. App determines predicted winner.
3. Winner advances into the next bracket slot.
4. If predicted score is a draw in a knockout match, the UI must ask the user to choose the team that advances.

---

## 10. Backend Requirements

- Use server-side validation for every prediction.
- Enforce all locks on the server.
- Enforce prediction visibility on the server:
  - Only the owner can see their own unrevealed predictions.
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

- Fixtures grouped by date and stage.
- Clear lock status per match.
- Inline score inputs.
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
- Add basic league membership.
- Seed tournament, teams, groups, and fixtures.
- Add a Game Instructions page linked from the main navigation.

Acceptance criteria:

- A user can register, log in, and see the fixture list.
- Admin can see fixture management pages.
- Users can open the Game Instructions page and understand how to play.

### Phase 2 - Group-stage predictions

- Build score prediction form for group fixtures.
- Enforce per-match 5-minute lock.
- Hide other users' score predictions until each match starts.
- Calculate predicted group tables.
- Calculate predicted Round of 32 qualifiers.
- Allow manual qualifier overrides before global lock.

Acceptance criteria:

- A user can predict every group match.
- The app shows predicted group tables and Round of 32 qualifiers.
- Locked matches cannot be edited from UI or API.
- Other users' score predictions become visible only once that match starts.

### Phase 3 - Knockout bracket

- Build Round of 32 through Final bracket UI.
- Let users predict knockout scores and advancing teams.
- Handle knockout draws by requiring an advancing-team choice.
- Enforce global stage/team lock and per-match score lock.
- Hide other users' qualifier/stage predictions until the first tournament match starts.

Acceptance criteria:

- A user can complete a full tournament prediction.
- The bracket advances selected teams correctly.
- Everyone's qualifier/stage predictions become visible after the first tournament match starts.

### Phase 4 - Results and scoring

- Add admin result entry.
- Implement scoring engine.
- Store score events.
- Build leaderboard with points breakdown.

Acceptance criteria:

- Admin can enter final scores.
- Leaderboard recalculates correctly.
- Users can see why they received each point total.

### Phase 5 - Polish and reliability

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
- Prediction save/update.
- Match locks 5 minutes before kickoff.
- Tournament/team lock 1 hour before first match.
- Other users' qualifier/stage predictions hidden before first tournament match starts.
- Other users' qualifier/stage predictions visible after first tournament match starts.
- Other users' match score predictions hidden before that match starts.
- Other users' match score predictions visible after that match starts.
- Group table calculation.
- Best third-place qualification.
- Knockout draw requires advancing team.
- Match points:
  - exact score = 5.
  - correct winner/draw only = 2.
  - wrong result = 0.
- Stage points by round.
- Leaderboard sorting and ties.
- Admin result update triggers recalculation.
- Game Instructions page is available to logged-in users and includes scoring, locks, visibility, and leaderboard guidance.

---

## 15. Open Questions

1. Is this one private league only, or should users be able to create multiple leagues?
2. Will there be real money/prizes, or is this purely a points game?
3. Should exact score be 5 points total or 7 points total including winner points? Recommended: 5 total.
4. Should stage/team points be cumulative across rounds? Recommended: yes.
5. Should all knockout teams be predicted before the tournament, or should each round unlock after official teams are known?
6. Should admins enter real results manually, or should the app eventually sync official scores?
7. Do users need social login, or is email/password enough?

---

## 16. MVP Definition

The MVP is complete when:

- Users can register/login.
- Users can make all group-stage score predictions.
- Users can make Round of 32 and later stage predictions.
- Prediction locks work correctly.
- Predictions are revealed to league members only after the correct visibility time.
- Admin can enter real results.
- Scores are calculated automatically.
- A standings table is always available.
- A Game Instructions page explains how to play.
- The app works comfortably on mobile.
