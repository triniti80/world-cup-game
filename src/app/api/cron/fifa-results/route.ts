import { NextResponse } from "next/server";
import { syncFifaResults } from "@/lib/world-cup/fifa-sync";
import { backfillRandomLockedStagePredictions } from "@/lib/world-cup/repository";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const providedSecret = new URL(req.url).searchParams.get("secret");

  if (!secret || providedSecret !== secret) {
    return NextResponse.json({ error: "Cron access is not authorized." }, { status: 401 });
  }

  let predictionBackfill: Awaited<ReturnType<typeof backfillRandomLockedStagePredictions>>;
  try {
    predictionBackfill = await backfillRandomLockedStagePredictions();
  } catch (error) {
    console.error("Cron stage prediction backfill failed", error);
    return cronErrorResponse("prediction_backfill", error);
  }

  let summary: Awaited<ReturnType<typeof syncFifaResults>>;
  try {
    summary = await syncFifaResults();
  } catch (error) {
    console.error("Cron FIFA results sync failed", error);
    return cronErrorResponse("fifa_results_sync", error);
  }

  return NextResponse.json({ ok: true, summary, predictionBackfill });
}

function cronErrorResponse(step: string, error: unknown) {
  return NextResponse.json(
    {
      ok: false,
      step,
      error: error instanceof Error ? error.message : "Unknown cron error",
      failedAt: new Date().toISOString(),
    },
    { status: 200 },
  );
}
