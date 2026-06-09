import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import { validateBetsRisk } from "@/lib/roulette-risk";
import { getRouletteSettings } from "@/lib/roulette-settings";
import { getPlayerDailyPayout } from "@/lib/roulette-stats";
import {
  normalizeBetChoice,
  type RouletteBetInput,
  type RouletteBetType,
} from "@/lib/roulette";

export async function POST(request: Request) {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const rawBets = Array.isArray(body.bets) ? body.bets : [];

  const bets: RouletteBetInput[] = rawBets.map(
    (b: { betType: string; betChoice: string; amount: number }) => ({
      betType: b.betType as RouletteBetType,
      betChoice: normalizeBetChoice(
        b.betType as RouletteBetType,
        String(b.betChoice ?? "")
      ),
      amount: Number(b.amount),
    })
  );

  const [settings, dailyPayout] = await Promise.all([
    getRouletteSettings(),
    getPlayerDailyPayout(user.id),
  ]);

  const risk = validateBetsRisk(bets, settings, dailyPayout);

  return NextResponse.json({
    ok: risk.ok,
    message: risk.ok ? null : risk.message,
  });
}
