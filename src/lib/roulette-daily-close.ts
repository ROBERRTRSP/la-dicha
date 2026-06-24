import { prisma } from "./db";
import {
  aggregateDayForSession,
  sessionDayEndUtc,
  sessionDayStartUtc,
  type RouletteDaySessionView,
} from "./roulette-daily";
import { getRouletteSettings } from "./roulette-settings";

export type CloseStatus = "OPEN" | "OK" | "OVER_TARGET" | "UNDER_TARGET";
export type AdjustmentType = "BALANCE_CREDIT" | "BONUS" | "CASHBACK";

export type RouletteDayCloseRow = RouletteDaySessionView & {
  realProfitPct: number;
  minProfitPct: number;
  maxProfitPct: number;
  targetProfitPct: number;
  excessReturned: number;
  closeStatus: CloseStatus;
  strictNextDay: boolean;
  adjustedAt: Date | null;
  adjustmentCount: number;
};

export type PlayerAdjustmentView = {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  amount: number;
  adjustmentType: string;
  playerLoss: number;
  playerBet: number;
  playerPaid: number;
  note: string | null;
  createdAt: string;
};

type PlayerDayStats = {
  userId: string;
  playerBet: number;
  playerPaid: number;
  playerLoss: number;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function resolveCloseStatus(
  realProfitPct: number,
  minPct: number,
  maxPct: number
): CloseStatus {
  if (realProfitPct > maxPct) return "OVER_TARGET";
  if (realProfitPct < minPct) return "UNDER_TARGET";
  return "OK";
}

async function getPlayerDayStats(sessionDate: string): Promise<PlayerDayStats[]> {
  const start = sessionDayStartUtc(sessionDate);
  const end = sessionDayEndUtc(sessionDate);

  const grouped = await prisma.rouletteBet.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: start, lt: end } },
    _sum: { amount: true, payout: true },
  });

  return grouped.map((g) => {
    const playerBet = g._sum.amount ?? 0;
    const playerPaid = g._sum.payout ?? 0;
    return {
      userId: g.userId,
      playerBet,
      playerPaid,
      playerLoss: Math.max(0, playerBet - playerPaid),
    };
  });
}

function distributeExcess(
  excessProfit: number,
  players: PlayerDayStats[]
): { userId: string; amount: number; stats: PlayerDayStats }[] {
  const losers = players.filter((p) => p.playerLoss > 0);
  const totalPlayerLosses = losers.reduce((s, p) => s + p.playerLoss, 0);
  if (totalPlayerLosses <= 0 || excessProfit <= 0) return [];

  let remaining = excessProfit;
  const allocations = losers.map((p, i) => {
    const raw =
      i === losers.length - 1
        ? remaining
        : roundMoney(excessProfit * (p.playerLoss / totalPlayerLosses));
    remaining -= raw;
    return { userId: p.userId, amount: raw, stats: p };
  });

  return allocations.filter((a) => a.amount > 0);
}

async function reverseAdjustments(sessionDate: string): Promise<void> {
  const existing = await prisma.rouletteDailyAdjustment.findMany({
    where: { sessionDate },
  });
  if (!existing.length) return;

  await prisma.$transaction(async (tx) => {
    for (const adj of existing) {
      if (adj.adjustmentType === "BALANCE_CREDIT" && adj.walletTransactionId) {
        const wallet = await tx.wallet.findUnique({ where: { userId: adj.userId } });
        if (wallet) {
          const balanceBefore = wallet.balance;
          const balanceAfter = Math.max(0, balanceBefore - adj.amount);
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: balanceAfter },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: "ROULETTE_DAILY_ADJUSTMENT",
              amount: -(adj.amount),
              balanceBefore,
              balanceAfter,
              note: `Reversión ajuste cierre ruleta ${sessionDate}`,
            },
          });
        }
      } else if (adj.adjustmentType === "BONUS") {
        await tx.roulettePlayerPromo.updateMany({
          where: { userId: adj.userId },
          data: { rouletteBonusBalance: { decrement: adj.amount } },
        });
      } else if (adj.adjustmentType === "CASHBACK") {
        await tx.roulettePlayerPromo.updateMany({
          where: { userId: adj.userId },
          data: { rouletteCashbackBalance: { decrement: adj.amount } },
        });
      }
    }
    await tx.rouletteDailyAdjustment.deleteMany({ where: { sessionDate } });
  });
}

async function applyAdjustments(
  sessionDate: string,
  sessionId: string | null,
  allocations: { userId: string; amount: number; stats: PlayerDayStats }[],
  adjustmentType: AdjustmentType
): Promise<number> {
  if (!allocations.length) return 0;

  const note = "Ajuste cierre ruleta - exceso de ganancia casa";
  let totalReturned = 0;

  await prisma.$transaction(async (tx) => {
    for (const { userId, amount, stats } of allocations) {
      totalReturned += amount;
      let walletTransactionId: string | null = null;

      if (adjustmentType === "BALANCE_CREDIT") {
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) continue;
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + amount;
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: balanceAfter },
        });
        const txn = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "ROULETTE_DAILY_ADJUSTMENT",
            amount,
            balanceBefore,
            balanceAfter,
            note,
          },
        });
        walletTransactionId = txn.id;
      } else if (adjustmentType === "BONUS") {
        await tx.roulettePlayerPromo.upsert({
          where: { userId },
          create: { userId, rouletteBonusBalance: amount },
          update: { rouletteBonusBalance: { increment: amount } },
        });
      } else if (adjustmentType === "CASHBACK") {
        await tx.roulettePlayerPromo.upsert({
          where: { userId },
          create: { userId, rouletteCashbackBalance: amount },
          update: { rouletteCashbackBalance: { increment: amount } },
        });
      }

      await tx.rouletteDailyAdjustment.create({
        data: {
          sessionDate,
          sessionId,
          userId,
          amount,
          adjustmentType,
          playerLoss: stats.playerLoss,
          playerBet: stats.playerBet,
          playerPaid: stats.playerPaid,
          note,
          walletTransactionId,
        },
      });
    }
  });

  return roundMoney(totalReturned);
}

function toCloseRow(
  row: {
    sessionDate: string;
    status: string;
    totalBet: number;
    totalPaid: number;
    houseProfit: number;
    spinCount: number;
    openedAt: Date;
    closedAt: Date | null;
    realProfitPct?: number | null;
    minProfitPct?: number | null;
    maxProfitPct?: number | null;
    targetProfitPct?: number | null;
    excessReturned?: number;
    closeStatus?: string;
    strictNextDay?: boolean;
    adjustedAt?: Date | null;
  },
  adjustmentCount = 0
): RouletteDayCloseRow {
  const totalBet = row.totalBet;
  const houseProfit = row.houseProfit;
  const realProfitPct =
    row.realProfitPct ??
    (totalBet > 0 ? roundMoney((houseProfit / totalBet) * 100) : 0);

  return {
    sessionDate: row.sessionDate,
    status: row.status === "CLOSED" ? "CLOSED" : "OPEN",
    totalBet: row.totalBet,
    totalPaid: row.totalPaid,
    houseProfit: row.houseProfit,
    spinCount: row.spinCount,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    realProfitPct,
    minProfitPct: row.minProfitPct ?? 0,
    maxProfitPct: row.maxProfitPct ?? 0,
    targetProfitPct: row.targetProfitPct ?? 0,
    excessReturned: row.excessReturned ?? 0,
    closeStatus: (row.closeStatus as CloseStatus) ?? "OPEN",
    strictNextDay: row.strictNextDay ?? false,
    adjustedAt: row.adjustedAt ?? null,
    adjustmentCount,
  };
}

export async function executeDailyClose(
  sessionDate: string,
  options: { recalculate?: boolean; skipAdjustments?: boolean } = {}
): Promise<RouletteDayCloseRow> {
  const settings = await getRouletteSettings();
  const minPct = settings.dailyMinProfitPct;
  const maxPct = settings.dailyMaxProfitPct;
  const targetPct = settings.dailyTargetProfitPct;
  const adjustmentType = settings.adjustmentType as AdjustmentType;

  // Cierre idempotente: siempre revierte ajustes previos antes de recalcular,
  // así re-ejecutar el cierre nunca paga dos veces el exceso.
  await reverseAdjustments(sessionDate);

  const totals = await aggregateDayForSession(sessionDate);
  const totalBet = totals.totalBet;
  const totalPaid = totals.totalPaid;
  const houseProfit = totals.houseProfit;
  const realProfitPct =
    totalBet > 0 ? roundMoney((houseProfit / totalBet) * 100) : 0;

  let closeStatus = resolveCloseStatus(realProfitPct, minPct, maxPct);
  let excessReturned = 0;
  let adjustedAt: Date | null = null;
  const strictNextDay = closeStatus === "UNDER_TARGET";

  const maxAllowedProfit = totalBet * (maxPct / 100);
  const excessProfit = Math.max(0, houseProfit - maxAllowedProfit);

  let sessionId: string | null = null;

  if (
    closeStatus === "OVER_TARGET" &&
    excessProfit > 0 &&
    settings.autoAdjustmentEnabled &&
    !options.skipAdjustments
  ) {
    const players = await getPlayerDayStats(sessionDate);
    const allocations = distributeExcess(excessProfit, players);
    if (allocations.length > 0) {
      excessReturned = await applyAdjustments(
        sessionDate,
        null,
        allocations,
        adjustmentType
      );
      adjustedAt = new Date();
    }
  }

  const closedAt = new Date();
  const dbRow = await prisma.rouletteDaySession.upsert({
    where: { sessionDate },
    update: {
      status: "CLOSED",
      closedAt,
      totalBet,
      totalPaid,
      houseProfit,
      spinCount: totals.spinCount,
      realProfitPct,
      minProfitPct: minPct,
      maxProfitPct: maxPct,
      targetProfitPct: targetPct,
      excessReturned,
      closeStatus,
      strictNextDay,
      adjustedAt,
    },
    create: {
      sessionDate,
      status: "CLOSED",
      closedAt,
      totalBet,
      totalPaid,
      houseProfit,
      spinCount: totals.spinCount,
      realProfitPct,
      minProfitPct: minPct,
      maxProfitPct: maxPct,
      targetProfitPct: targetPct,
      excessReturned,
      closeStatus,
      strictNextDay,
      adjustedAt,
    },
  });
  sessionId = dbRow.id;

  if (excessReturned > 0 && sessionId) {
    await prisma.rouletteDailyAdjustment.updateMany({
      where: { sessionDate, sessionId: null },
      data: { sessionId },
    });
  }

  const adjustmentCount = await prisma.rouletteDailyAdjustment.count({
    where: { sessionDate },
  });

  return toCloseRow({ ...dbRow, closeStatus }, adjustmentCount);
}

export async function recalculateDailyClose(
  sessionDate: string
): Promise<RouletteDayCloseRow> {
  return executeDailyClose(sessionDate, { recalculate: true });
}

/**
 * Reabre un día cerrado para que los jugadores puedan seguir jugando.
 * Revierte cualquier ajuste ya pagado (el exceso solo se devuelve en el
 * cierre definitivo) y deja la sesión OPEN.
 */
export async function reopenDailySession(
  sessionDate: string
): Promise<RouletteDayCloseRow> {
  await reverseAdjustments(sessionDate);

  const totals = await aggregateDayForSession(sessionDate);
  const realProfitPct =
    totals.totalBet > 0
      ? roundMoney((totals.houseProfit / totals.totalBet) * 100)
      : 0;

  const dbRow = await prisma.rouletteDaySession.upsert({
    where: { sessionDate },
    update: {
      status: "OPEN",
      closeStatus: "OPEN",
      closedAt: null,
      adjustedAt: null,
      excessReturned: 0,
      totalBet: totals.totalBet,
      totalPaid: totals.totalPaid,
      houseProfit: totals.houseProfit,
      spinCount: totals.spinCount,
      realProfitPct,
    },
    create: {
      sessionDate,
      status: "OPEN",
      closeStatus: "OPEN",
      totalBet: totals.totalBet,
      totalPaid: totals.totalPaid,
      houseProfit: totals.houseProfit,
      spinCount: totals.spinCount,
      realProfitPct,
    },
  });

  const adjustmentCount = await prisma.rouletteDailyAdjustment.count({
    where: { sessionDate },
  });

  return toCloseRow(dbRow, adjustmentCount);
}

export async function getDailyCloseHistory(limit = 30): Promise<RouletteDayCloseRow[]> {
  const sessions = await prisma.rouletteDaySession.findMany({
    orderBy: { sessionDate: "desc" },
    take: limit,
  });

  const counts = await prisma.rouletteDailyAdjustment.groupBy({
    by: ["sessionDate"],
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.sessionDate, c._count._all]));

  return sessions.map((s) => toCloseRow(s, countMap.get(s.sessionDate) ?? 0));
}

export async function getSessionAdjustments(
  sessionDate: string
): Promise<PlayerAdjustmentView[]> {
  const rows = await prisma.rouletteDailyAdjustment.findMany({
    where: { sessionDate },
    orderBy: { amount: "desc" },
    include: {
      user: { select: { username: true, fullName: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    username: r.user.username,
    fullName: r.user.fullName,
    amount: r.amount,
    adjustmentType: r.adjustmentType,
    playerLoss: r.playerLoss,
    playerBet: r.playerBet,
    playerPaid: r.playerPaid,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
  }));
}
