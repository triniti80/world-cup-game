import { backfillRandomLockedStagePredictions } from "../src/lib/world-cup/repository";

const dryRun = process.argv.includes("--dry-run");

backfillRandomLockedStagePredictions({ dryRun })
  .then((summary) => {
    console.log(JSON.stringify({ ok: true, summary }, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
