import {
  ensureTodayRouletteSession,
  getRoulettePlayWindow,
} from "./roulette-daily";
import {
  getDailyCloseHistory,
  type RouletteDayCloseRow,
} from "./roulette-daily-close";
import { getRouletteSettings } from "./roulette-settings";
import { dayStartInTz, dateKeyInTz, nowInTz } from "./timezone";
import { prisma } from "./db";
import { groupBetsBySpin, type GroupedRouletteSpin } from "./roulette-spin-group";

export type RouletteAdminBet = {
  id: string;
  spinId: string | null;
  userId: string;
  betType: string;
  betChoice: string;
  amount: number;
  winningNumber: number;
  payout: number;
  profit: number;
  result: string;
  createdAt: string;
  user: { username: string; fullName: string };
};

export type RoulettePlayerDaySummary = {
  userId: string;
  username: string;
  fullName: string;
  totalBet: number;
  totalPayout: number;
  netProfit: number;
  wins: number;
  losses: number;
  bets: number;
};

export type RouletteAdminSpin = GroupedRouletteSpin<RouletteAdminBet> & {
  user: { username: string; fullName: string };
};

export type RouletteAdminPanel = {
  active: boolean;
  dailyMinProfitPct: number;
  dailyMaxProfitPct: number;
  dailyTargetProfitPct: number;
  autoAdjustmentEnabled: boolean;
  adjustmentType: string;
  dailyProfitPercent: number;
  daily: {
    sessionDate: string;
    status: string;
    totalBet: number;
    totalPaid: number;
    houseProfit: number;
    profitPercentActual: number;
    targetPercent: number;
    minPercent: number;
    maxPercent: number;
    expectedProfit: number;
    closeStatus: string;
    excessReturned: number;
    projectedExcessReturn: number;
    closeStatusPreview: string;
  };
  closeHistory: RouletteDayCloseRow[];
  players: RoulettePlayerDaySummary[];
  spins: RouletteAdminSpin[];
};

async function getTodayPlayerSummaries(
  since: Date
): Promise<RoulettePlayerDaySummary[]> {
  const grouped = await prisma.rouletteBet.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since } },
    _sum: { amount: true, payout: true, profit: true },
    _count: { _all: true },
  });

  const winCounts = await prisma.rouletteBet.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since }, result: "WIN" },
    _count: { _all: true },
  });
  const winMap = new Map(winCounts.map((w) => [w.userId, w._count._all]));

  const userIds = grouped.map((g) => g.userId);
  if (!userIds.length) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, fullName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return grouped
    .map((g) => {
      const bets = g._count._all;
      const wins = winMap.get(g.userId) ?? 0;
      const user = userMap.get(g.userId);
      return {
        userId: g.userId,
        username: user?.username ?? "—",
        fullName: user?.fullName ?? "—",
        totalBet: g._sum.amount ?? 0,
        totalPayout: g._sum.payout ?? 0,
        netProfit: g._sum.profit ?? 0,
        wins,
        losses: bets - wins,
        bets,
      };
    })
    .sort((a, b) => b.totalBet - a.totalBet);
}

async function getRecentSpins(since: Date, limit = 50): Promise<RouletteAdminSpin[]> {
  const rows = await prisma.rouletteBet.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: limit * 25,
    include: {
      user: { select: { username: true, fullName: true } },
    },
  });

  const bets: RouletteAdminBet[] = rows.map((b) => ({
    id: b.id,
    spinId: b.spinId,
    userId: b.userId,
    betType: b.betType,
    betChoice: b.betChoice,
    amount: b.amount,
    winningNumber: b.winningNumber,
    payout: b.payout,
    profit: b.profit,
    result: b.result,
    createdAt: b.createdAt.toISOString(),
    user: b.user,
  }));

  const grouped = groupBetsBySpin(bets, limit);
  return grouped.map((spin) => ({
    ...spin,
    user: spin.bets[0]?.user ?? { username: "—", fullName: "—" },
  }));
}

export async function getRouletteAdminPanel(): Promise<RouletteAdminPanel> {
  const settings = await getRouletteSettings();
  const playWindow = await getRoulettePlayWindow(settings);
  const session =
    playWindow.daily ?? (await ensureTodayRouletteSession());

  const dayStart = dayStartInTz(nowInTz());
  const [players, spins, closeHistoryRaw] = await Promise.all([
    getTodayPlayerSummaries(dayStart),
    getRecentSpins(dayStart),
    getDailyCloseHistory(30),
  ]);

  const targetPercent = settings.dailyTargetProfitPct;
  const totalBet = session.totalBet;
  const totalPaid = session.totalPaid;
  const houseProfit = session.houseProfit;
  const profitPercentActual =
    totalBet > 0 ? (houseProfit / totalBet) * 100 : 0;
  const expectedProfit = totalBet * (targetPercent / 100);

  const todayKey = session.sessionDate ?? dateKeyInTz(nowInTz());
  let closeHistory = closeHistoryRaw;
  if (!closeHistory.some((c) => c.sessionDate === todayKey)) {
    closeHistory = [
      {
        sessionDate: todayKey,
        status: session.status,
        totalBet,
        totalPaid,
        houseProfit,
        spinCount: session.spinCount,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        realProfitPct: profitPercentActual,
        minProfitPct: settings.dailyMinProfitPct,
        maxProfitPct: settings.dailyMaxProfitPct,
        targetProfitPct: settings.dailyTargetProfitPct,
        excessReturned: 0,
        closeStatus: "OPEN" as const,
        strictNextDay: false,
        adjustedAt: null,
        adjustmentCount: 0,
      },
      ...closeHistory,
    ];
  }

  const todayClose = closeHistory.find((c) => c.sessionDate === todayKey);

  const maxAllowedProfit = totalBet * (settings.dailyMaxProfitPct / 100);
  const projectedExcessReturn = Math.max(0, houseProfit - maxAllowedProfit);
  let closeStatusPreview: "OK" | "OVER_TARGET" | "UNDER_TARGET" = "OK";
  if (profitPercentActual > settings.dailyMaxProfitPct) {
    closeStatusPreview = "OVER_TARGET";
  } else if (profitPercentActual < settings.dailyMinProfitPct) {
    closeStatusPreview = "UNDER_TARGET";
  }

  return {
    active: settings.active,
    dailyMinProfitPct: settings.dailyMinProfitPct,
    dailyMaxProfitPct: settings.dailyMaxProfitPct,
    dailyTargetProfitPct: settings.dailyTargetProfitPct,
    autoAdjustmentEnabled: settings.autoAdjustmentEnabled,
    adjustmentType: settings.adjustmentType,
    dailyProfitPercent: settings.dailyTargetProfitPct,
    daily: {
      sessionDate: session.sessionDate ?? dateKeyInTz(nowInTz()),
      status: session.status,
      totalBet,
      totalPaid,
      houseProfit,
      profitPercentActual,
      targetPercent,
      minPercent: settings.dailyMinProfitPct,
      maxPercent: settings.dailyMaxProfitPct,
      expectedProfit,
      closeStatus: todayClose?.closeStatus ?? "OPEN",
      excessReturned: todayClose?.excessReturned ?? 0,
      projectedExcessReturn,
      closeStatusPreview,
    },
    closeHistory,
    players,
    spins,
  };
}
