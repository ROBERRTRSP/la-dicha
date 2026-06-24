import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth";

import { prisma } from "@/lib/db";

import { getEffectiveRouletteSettings } from "@/lib/roulette-bankroll";

import { maxAllowedRisk } from "@/lib/roulette-risk";

import {
  getRouletteSettings,
  resolvePlayerSettings,
} from "@/lib/roulette-settings";

import { applyWelcomeAndTrialCredits } from "@/lib/roulette-promotions";
import { getRoulettePlayWindow, formatDailyCloseLabel } from "@/lib/roulette-daily";
import { ROULETTE_ALLOWED_AMOUNTS } from "@/lib/roulette-validation";

export async function GET() {
  const user = await requirePlayer();
  const settings = await getRouletteSettings();
  const playWindow = await getRoulettePlayWindow(settings);
  const rouletteCtx = await getEffectiveRouletteSettings();
  const playerSettings = resolvePlayerSettings(rouletteCtx.effective);

  let promoCreditMessage: string | null = null;
  let balance: number | null = null;
  if (user) {
    const promo = await applyWelcomeAndTrialCredits(user.id, settings);
    promoCreditMessage = promo.message;
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    balance = wallet?.balance ?? null;
  }

  const allowedRisk = maxAllowedRisk(playerSettings, rouletteCtx.bankroll);

  return NextResponse.json({
    balance,
    active: playWindow.open,
    closedReason: playWindow.reason,
    fairPlay: !settings.houseAlwaysWins,
    european: true,
    houseEdge: settings.houseEdge,
    playerRtp: settings.playerRtp,
    houseAlwaysWins: settings.houseAlwaysWins,
    daily: {
      sessionDate: playWindow.sessionDate,
      status: playWindow.sessionStatus,
      openTime: playWindow.dailyOpenTime,
      closeTime: playWindow.dailyCloseTime,
      closeLabel: formatDailyCloseLabel(playWindow.dailyCloseTime),
      totals: playWindow.daily,
    },
    unlimitedPlay: false,
    bankroll: {
      current: rouletteCtx.bankroll.currentBankroll,
      playable: rouletteCtx.bankroll.playableBankroll,
      marginHeld: rouletteCtx.bankroll.houseMarginHeld,
    },
    limits: {
      minBet: playerSettings.minBetAmount,
      maxBet: 5,
      maxStraightBet: 5,
      maxOutsideBet: 5,
      allowedAmounts: [...ROULETTE_ALLOWED_AMOUNTS],
      maxPayoutPerSpin: playerSettings.maxPayoutPerSpin,
      maxExposurePerSpin: playerSettings.maxExposurePerSpin,
      maxExposurePerNumber: playerSettings.maxExposurePerNumber,
      maxAllowedRisk: Number.isFinite(allowedRisk) ? allowedRisk : null,
      unlimited: false,
      dynamicLimits: rouletteCtx.dynamicLimits,
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
