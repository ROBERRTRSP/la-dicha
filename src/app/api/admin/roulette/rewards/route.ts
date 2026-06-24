import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getRewardsAdminPanel } from "@/lib/roulette-rewards-panel";
import { runScheduledRouletteRewards } from "@/lib/roulette-rewards";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return NextResponse.json(await getRewardsAdminPanel());
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "run").toLowerCase();

    if (action === "run") {
      const result = await runScheduledRouletteRewards({ force: true });
      const panel = await getRewardsAdminPanel();
      return NextResponse.json({ ok: true, result, panel });
    }

    return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al ejecutar reparto.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
