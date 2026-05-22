# world-cup-game

Private World Cup prediction game for friends.

See [WORLD_CUP_PLAN.md](./WORLD_CUP_PLAN.md) for the product plan.

## Status

Phase 1 has started:

- World Cup app shell and navigation.
- Dashboard.
- Fixture list using seed data.
- League creation and invite-code joining.
- Active league switching.
- League game options for match score guessing or pre-tournament stage predictions.
- Persisted match prediction inputs backed by Postgres.
- Server-side 5-minute match prediction locks.
- Pre-tournament bonus picks for top scorer and, in score leagues, champion.
- Admin final-score entry for seeded fixtures.
- Match score-event recalculation and DB-backed leaderboard.
- Bracket placeholder.
- Game Instructions page.
- Settings page for current lock/visibility rules.

The next implementation step is adding league-wide prediction visibility,
full fixture import, and official bonus/stage scoring.

## Quick start

Requires Docker Desktop, Node 22+, and a `.env` file with `DATABASE_URL`,
`SESSION_SECRET`, and `MASTER_KEY`.

```bash
npm install
npm run typecheck
npm run dev
```

Then open <http://localhost:3001>.

## Notes

This folder is the active workspace for the World Cup game. The earlier
`amazon-xero-integration` folder is left untouched as its own project.
