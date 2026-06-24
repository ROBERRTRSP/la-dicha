import { prisma } from "./db";
import { getRouletteSettings } from "./roulette-settings";
import { getRewardPoolView, poolDateKey } from "./roulette-reward-pool";
import { previewEligiblePlayers } from "./roulette-rewards";
import { nowInTz } from "./timezone";

export type RewardsAdminPanel = {
  rewardSystemActive: boolean;
  poolDate: string;
  config: {
    housePercent: number;
    promoPercent: number;
    rewardIntervalMinutes: number;
    maxRewardPercentOfPromoPool: number;
    minSpinsToQualify: number;
    minBetAmountToQualify: number;
    cashbackAfterLosses: number;
    cashbackPercent: number;
    maxCashbackAmount: number;
    spinWeight: number;
    dailyMissionBetAmount: number;
    dailyMissionBonus: number;
    activePlayerBonusPercent: number;
  };
  pool: {
    currentPromoBalance: number;
    totalPromoCollected: number;
    totalPromoPaid: number;
    totalMainCollected: number;
    totalHouseFee: number;
    percentUsed: number;
  };
  nextRunAt: string;
  eligible: {
    userId: string;
    username: string;
    fullName: string;
    totalBet: number;
    spinCount: number;
    consecutiveLosingSpins: number;
    weight: number;
  }[];
  rewardsToday: {
    id: string;
    username: string;
    fullName: string;
    rewardType: string;
    amount: number;
    reason: string;
    status: string;
    createdAt: string;
  }[];
  summary: {
    rewardsCount: number;
    totalPaidToday: number;
    cashbackToday: number;
    missionsToday: number;
    activeBonusToday: number;
  };
};

export async function getRewardsAdminPanel(): Promise<RewardsAdminPanel> {
  const settings = await getRouletteSettings();
  const poolDate = poolDateKey(nowInTz());

  const [pool, eligibleRaw, rewards] = await Promise.all([
    getRewardPoolView(poolDate),
    previewEligiblePlayers(settings),
    prisma.rouletteScheduledReward.findMany({
      where: { poolDate },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { username: true, fullName: true } } },
    }),
  ]);

  const percentUsed =
    pool.totalPromoCollected > 0
      ? Math.round((pool.totalPromoPaid / pool.totalPromoCollected) * 10000) / 100
      : 0;

  const paid = rewards.filter((r) => r.status === "PAID");
  const sumByType = (type: string) =>
    Math.round(
      paid.filter((r) => r.rewardType === type).reduce((s, r) => s + r.amount, 0) * 100
    ) / 100;

  const nextRunAt = new Date(
    Date.now() + settings.rewardIntervalMinutes * 60 * 1000
  ).toISOString();

  return {
    rewardSystemActive: settings.rewardSystemActive,
    poolDate,
    config: {
      housePercent: settings.housePercent,
      promoPercent: settings.promoPercent,
      rewardIntervalMinutes: settings.rewardIntervalMinutes,
      maxRewardPercentOfPromoPool: settings.maxRewardPercentOfPromoPool,
      minSpinsToQualify: settings.minSpinsToQualify,
      minBetAmountToQualify: settings.minBetAmountToQualify,
      cashbackAfterLosses: settings.cashbackAfterLosses,
      cashbackPercent: settings.cashbackPercent,
      maxCashbackAmount: settings.maxCashbackAmount,
      spinWeight: settings.spinWeight,
      dailyMissionBetAmount: settings.dailyMissionBetAmount,
      dailyMissionBonus: settings.dailyMissionBonus,
      activePlayerBonusPercent: settings.activePlayerBonusPercent,
    },
    pool: {
      currentPromoBalance: pool.currentPromoBalance,
      totalPromoCollected: pool.totalPromoCollected,
      totalPromoPaid: pool.totalPromoPaid,
      totalMainCollected: pool.totalMainCollected,
      totalHouseFee: pool.totalHouseFee,
      percentUsed,
    },
    nextRunAt,
    eligible: eligibleRaw.slice(0, 50).map((p) => ({
      userId: p.userId,
      username: p.username,
      fullName: p.fullName,
      totalBet: p.totalBet,
      spinCount: p.spinCount,
      consecutiveLosingSpins: p.consecutiveLosingSpins,
      weight:
        Math.round((p.totalBet + p.spinCount * settings.spinWeight) * 100) / 100,
    })),
    rewardsToday: rewards.map((r) => ({
      id: r.id,
      username: r.user.username,
      fullName: r.user.fullName,
      rewardType: r.rewardType,
      amount: r.amount,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
    summary: {
      rewardsCount: paid.length,
      totalPaidToday: sumByType("CASHBACK") + sumByType("ACTIVE_PLAYER_BONUS") +
        sumByType("MISSION") + sumByType("JACKPOT"),
      cashbackToday: sumByType("CASHBACK"),
      missionsToday: paid.filter((r) => r.rewardType === "MISSION").length,
      activeBonusToday: sumByType("ACTIVE_PLAYER_BONUS"),
    },
  };
}
