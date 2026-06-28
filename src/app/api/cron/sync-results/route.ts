import { NextResponse } from "next/server";
import { RESULTS_WEEK_DAYS } from "@/lib/draws";
import { repairWeekResults } from "@/lib/results-sync";
import { cronAuthResponse } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = cronAuthResponse(request);
  if (denied) return denied;

  try {
    const { sync: results } = await repairWeekResults(RESULTS_WEEK_DAYS);
    const applied = results.filter((r) => r.status === "applied" || r.status === "settled");
    const waiting = results.filter((r) => r.status === "waiting").length;
    const mismatches = results.filter((r) => r.status === "mismatch" || r.status === "date_mismatch");

    return NextResponse.json({
      ok: true,
      synced: applied.length,
      waiting,
      mismatches: mismatches.length,
      details: applied,
      conflicts: mismatches,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al sincronizar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
