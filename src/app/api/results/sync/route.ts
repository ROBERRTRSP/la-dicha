import { NextResponse } from "next/server";
import {
  countFreshResults,
  syncPendingResults,
} from "@/lib/results-sync";
import { requirePlayer } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const results = await syncPendingResults(1);
    const updated = countFreshResults(results);

    return NextResponse.json({
      ok: true,
      updated,
      checked: results.length,
      syncedAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al sincronizar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
