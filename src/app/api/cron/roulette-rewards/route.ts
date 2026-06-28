import { NextResponse } from "next/server";
import { runScheduledRouletteRewards } from "@/lib/roulette-rewards";
import { cronAuthResponse } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = cronAuthResponse(request);
  if (denied) return denied;

  try {
    const result = await runScheduledRouletteRewards();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error en reparto de premios.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
