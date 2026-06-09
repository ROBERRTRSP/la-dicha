import { startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "./db";
import {
  calcPayout,
  isBetWinner,
  numberColor,
  type RouletteBetType,
} from "./roulette";

const TZ = "America/Santo_Domingo";

export function getTodayStartUtc(): Date {
  const now = toZonedTime(new Date(), TZ);
  const dayStart = startOfDay(now);
  return dayStart;
}

export async function getPlayerDailyPayout(userId: string): Promise<number> {
  const since = getTodayStartUtc();
  const wins = await prisma.rouletteBet.findMany({
    where: {
      userId,
      result: "WIN",
      createdAt: { gte: since },
    },
    select: { payout: true },
  });
  return wins.reduce((s, w) => s + w.payout, 0);
}

export type AdminExposureSnapshot = {
  byNumber: Record<number, number>;
  byColor: { red: number; black: number; green: number };
  byBetType: Record<string, number>;
};

export function buildExposureFromBets(
  bets: { betType: string; betChoice: string; amount: number }[]
): AdminExposureSnapshot {
  const byNumber: Record<number, number> = {};
  for (let n = 0; n <= 36; n++) byNumber[n] = 0;

  for (const bet of bets) {
    if (bet.betType === "STRAIGHT") {
      const num = parseInt(bet.betChoice, 10);
      if (!Number.isNaN(num) && num >= 0 && num <= 36) {
        byNumber[num] += calcPayout("STRAIGHT", bet.amount, true);
      }
    } else {
      for (let n = 0; n <= 36; n++) {
        if (isBetWinner(bet.betType as RouletteBetType, bet.betChoice, n)) {
          byNumber[n] += calcPayout(
            bet.betType as RouletteBetType,
            bet.amount,
            true
          );
        }
      }
    }
  }

  const byColor = { red: 0, black: 0, green: 0 };
  for (let n = 0; n <= 36; n++) {
    const c = numberColor(n);
    byColor[c] = Math.max(byColor[c], byNumber[n]);
  }

  const byBetType: Record<string, number> = {};
  for (const bet of bets) {
    let maxP = 0;
    for (let n = 0; n <= 36; n++) {
      if (isBetWinner(bet.betType as RouletteBetType, bet.betChoice, n)) {
        maxP = Math.max(
          maxP,
          calcPayout(bet.betType as RouletteBetType, bet.amount, true)
        );
      }
    }
    byBetType[bet.betType] = (byBetType[bet.betType] ?? 0) + maxP;
  }

  return { byNumber, byColor, byBetType };
}

export async function getPlayerRankings(limit = 10) {
  const grouped = await prisma.rouletteBet.groupBy({
    by: ["userId"],
    _sum: { profit: true, amount: true, payout: true },
    _count: true,
  });

  const userIds = grouped.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, fullName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows = grouped.map((g) => ({
    userId: g.userId,
    user: userMap.get(g.userId),
    totalProfit: g._sum.profit ?? 0,
    totalBet: g._sum.amount ?? 0,
    totalPayout: g._sum.payout ?? 0,
    spins: g._count,
  }));

  const topWinners = [...rows]
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, limit);
  const topLosers = [...rows]
    .sort((a, b) => a.totalProfit - b.totalProfit)
    .slice(0, limit);

  return { topWinners, topLosers };
}

export function calcRtp(totalBet: number, totalPaid: number) {
  if (totalBet <= 0) return 0;
  return totalPaid / totalBet;
}

export function calcHouseEdge(rtp: number) {
  return 1 - rtp;
}

