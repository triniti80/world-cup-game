# world-cup-game

Private World Cup prediction game for friends.

See [WORLD_CUP_PLAN.md](./WORLD_CUP_PLAN.md) for the product plan.

## Status

Phase 1 has started:

- World Cup app shell and navigation.
- Dashboard.
- Fixture list using seed data.
- League creation and invite-code joining.
- League game options for match score guessing or pre-tournament stage predictions.
- Persisted match prediction inputs backed by Postgres.
- Server-side 5-minute match prediction locks.
- Pre-tournament bonus picks for top scorer and, in score leagues, champion.
- Bracket placeholder.
- Leaderboard placeholder.
- Game Instructions page.
- Settings page for current lock/visibility rules.

The next implementation step is adding league switching, league-wide prediction
visibility, official result entry, and scoring tables.

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
