import { NextResponse } from "next/server";
import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  effectiveMaxSpinExposure,
  getRouletteSettings,
} from "@/lib/roulette-settings";
import { applyWelcomeAndTrialCredits } from "@/lib/roulette-promotions";
import { getPlayerDailyPayout } from "@/lib/roulette-stats";

export async function GET() {
  const user = await requirePlayer();
  const settings = await getRouletteSettings();

  let promoCreditMessage: string | null = null;
  let balance: number | null = null;
  let dailyPayout = 0;
  if (user) {
    const promo = await applyWelcomeAndTrialCredits(user.id, settings);
    promoCreditMessage = promo.message;
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    balance = wallet?.balance ?? null;
    dailyPayout = await getPlayerDailyPayout(user.id);
  }

  return NextResponse.json({
    balance,
    active: settings.active,
    fairPlay: true,
    european: true,
    houseEdge: 0.027,
    dailyPayout,
    maxDailyPayout: settings.maxDailyPayoutPerPlayer,
    dailyLimitReached: dailyPayout >= settings.maxDailyPayoutPerPlayer,
    limits: {
      minBet: settings.minBetAmount,
      maxBet: settings.maxBetAmount,
      maxStraightBet: settings.maxStraightBet,
      maxOutsideBet: settings.maxOutsideBet,
      maxPayoutPerSpin: settings.maxPayoutPerSpin,
      maxExposurePerNumber: settings.maxExposurePerNumber,
      maxSpinExposure: effectiveMaxSpinExposure(settings),
    },
    promotions: {
      banner: settings.promoBannerMessage,
      positiveMessage: settings.positiveSpinMessage,
      welcomeBonus: settings.welcomeBonusEnabled,
      cashback: settings.cashbackEnabled,
      freeSpins: settings.freeSpinsEnabled,
      ranking: settings.rankingEnabled,
    },
    promoCreditMessage,
  });
}
