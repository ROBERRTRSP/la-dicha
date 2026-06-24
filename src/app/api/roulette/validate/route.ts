import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEffectiveRouletteSettings } from "@/lib/roulette-bankroll";
import {
  formatExposureSummary,
  validateBetsRisk,
} from "@/lib/roulette-risk";
import {
  getRouletteSettings,
  resolvePlayerSettings,
} from "@/lib/roulette-settings";
import {
  normalizeRouletteBets,
  parseRouletteBetsPayload,
} from "@/lib/roulette-validation";
import { peekStakeToCharge } from "@/lib/roulette-promotions";
import { getRoulettePlayWindow } from "@/lib/roulette-daily";

export async function POST(request: Request) {
  const user = await requirePlayer();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const settings = await getRouletteSettings();
    const playWindow = await getRoulettePlayWindow(settings);
    const rouletteCtx = await getEffectiveRouletteSettings();
    const playerSettings = resolvePlayerSettings(rouletteCtx.effective);

    if (!playWindow.open) {
      return NextResponse.json({
        ok: false,
        message: playWindow.reason ?? "La Ruleta no está disponible.",
      });
    }

    const rawList = parseRouletteBetsPayload(body);
    const bets = normalizeRouletteBets(rawList, playerSettings);
    const totalStake = bets.reduce((sum, b) => sum + b.amount, 0);

    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });

    if (!wallet) {
      return NextResponse.json({
        ok: false,
        message: "Cuenta sin billetera.",
      });
    }

    const stakeToCharge = await peekStakeToCharge(user.id, settings, totalStake);

    if (stakeToCharge > wallet.balance) {
      return NextResponse.json({
        ok: false,
        message: "Saldo insuficiente para estas apuestas.",
      });
    }

    const risk = validateBetsRisk(
      bets,
      { ...playerSettings, houseAlwaysWins: settings.houseAlwaysWins },
      settings.payoutMultipliers,
      rouletteCtx.bankroll
    );

    const exposureSummary = risk.exposure
      ? formatExposureSummary(risk.exposure, settings.payoutMultipliers, bets)
      : null;

    return NextResponse.json({
      ok: risk.ok,
      message: risk.ok ? null : risk.message,
      totalStake,
      stakeToCharge,
      balance: wallet.balance,
      exposure: exposureSummary,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Apuesta inválida.";
    return NextResponse.json({ ok: false, message: msg });
  }
}
