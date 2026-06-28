import { NextResponse } from "next/server";
import {
  countFreshResults,
  syncPendingResults,
} from "@/lib/results-sync";
import { dateKeyInTz, nowInTz } from "@/lib/timezone";
import { cronAuthResponse } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = cronAuthResponse(request);
  if (denied) return denied;

  try {
    const results = await syncPendingResults(1);
    const updated = countFreshResults(results);

    return NextResponse.json({
      ok: true,
      updated,
      checked: results.length,
      syncedAt: new Date().toISOString(),
      dateKey: dateKeyInTz(nowInTz()),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al sincronizar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
