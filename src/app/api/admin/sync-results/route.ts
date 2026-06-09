import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { RESULTS_WEEK_DAYS } from "@/lib/draws";
import { repairWeekResults } from "@/lib/results-sync";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const { purged, sync: results } = await repairWeekResults(RESULTS_WEEK_DAYS);
    const applied = results.filter((r) => r.status === "applied" || r.status === "settled");

    return NextResponse.json({
      ok: true,
      purged,
      synced: applied.length,
      results,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al sincronizar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
