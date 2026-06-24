import { NextResponse } from "next/server";
import { runScheduledRouletteRewards } from "@/lib/roulette-rewards";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await runScheduledRouletteRewards();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error en reparto de premios.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
