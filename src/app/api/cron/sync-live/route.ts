import { NextResponse } from "next/server";
import {
  countFreshResults,
  syncPendingResults,
} from "@/lib/results-sync";
import { dateKeyInTz, nowInTz } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && auth !== `Bearer ${secret}`) {
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
      dateKey: dateKeyInTz(nowInTz()),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al sincronizar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
