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

  const predictionBackfill = await backfillRandomLockedStagePredictions();
  const summary = await syncFifaResults();
  return NextResponse.json({ ok: true, summary, predictionBackfill });
}
