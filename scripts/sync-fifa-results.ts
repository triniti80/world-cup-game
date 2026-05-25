import { syncFifaResults } from "../src/lib/world-cup/fifa-sync";

const dryRun = process.argv.includes("--dry-run");

syncFifaResults({ dryRun })
  .then((summary) => {
    console.log(JSON.stringify({ ok: true, summary }, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
