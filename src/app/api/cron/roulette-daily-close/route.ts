import { NextResponse } from "next/server";
import { ensureTodayRouletteSession } from "@/lib/roulette-daily";
import { executeDailyClose } from "@/lib/roulette-daily-close";
import { dateKeyInTz, nowInTz } from "@/lib/timezone";
import { cronAuthResponse } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = cronAuthResponse(request);
  if (denied) return denied;

  try {
    const today = dateKeyInTz(nowInTz());
    await ensureTodayRouletteSession();
    const closed = await executeDailyClose(today);

    return NextResponse.json({
      ok: true,
      sessionDate: closed.sessionDate,
      status: closed.status,
      totalBet: closed.totalBet,
      totalPaid: closed.totalPaid,
      houseProfit: closed.houseProfit,
      spinCount: closed.spinCount,
      realProfitPct: closed.realProfitPct,
      closeStatus: closed.closeStatus,
      excessReturned: closed.excessReturned,
      closedAt: closed.closedAt?.toISOString() ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error en cierre diario.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
