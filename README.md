# world-cup-game

Private World Cup prediction game for friends.

See [WORLD_CUP_PLAN.md](./WORLD_CUP_PLAN.md) for the product plan.

## Status

Current app features:

- World Cup app shell and navigation.
- Dashboard.
- Full 2026 fixture list.
- League creation and invite-code joining.
- Active league switching.
- League game options for match score guessing or pre-tournament stage predictions.
- Persisted match prediction inputs backed by Postgres.
- Server-side 5-minute match prediction locks.
- Pre-tournament bonus picks for top scorer and, in score leagues, champion.
- Admin fixture editing, result entry, official stage/bonus results, and audit log.
- Official FIFA result sync for completed matches.
- Match score-event recalculation and DB-backed leaderboard.
- League prediction visibility with submitted/hidden/revealed states.
- Stage prediction brackets with knockout advancing picks.
- Profile page and avatar menu.
- Game Instructions page.
- Settings page for current lock/visibility rules.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Railway deployment notes.

## Quick start

Requires Docker Desktop, Node 22+, and a `.env` file with `DATABASE_URL`,
`SESSION_SECRET`, and `MASTER_KEY`.

```bash
npm install
npm run typecheck
npm run dev
```

Then open <http://localhost:3001>.

## Result sync

Completed match results sync from FIFA's official Data Hub.

```bash
npm run results:sync:dry-run
npm run results:sync
```

For scheduled hosting, call `/api/cron/fifa-results?secret=$CRON_SECRET` after
matches. Running it every 10-15 minutes during match windows is also safe: it
only writes matches FIFA marks final.

## Production

Railway is the recommended first production host for this project. The repo
includes `railway.json`, a Dockerfile, and a production migration runner for
Railway pre-deploy migrations.

## Notes

This folder is the active workspace for the World Cup game. The earlier
`amazon-xero-integration` folder is left untouched as its own project.
