import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getRouletteSettings, type RouletteSettingsData } from "./roulette-settings";
import { poolDateKey } from "./roulette-reward-pool";
import { nowInTz } from "./timezone";

export type RewardType =
  | "CASHBACK"
  | "ACTIVE_PLAYER_BONUS"
  | "MISSION"
  | "JACKPOT"
  | "FREE_SPIN";

export type RewardRunResult = {
  ran: boolean;
  reason?: string;
  poolDate: string;
  promoBalanceBefore: number;
  promoBalanceAfter: number;
  budget: number;
  totalPaid: number;
  rewardsCreated: number;
  cashbackPaid: number;
  activeBonusPaid: number;
  eligiblePlayers: number;
  details: {
    playerId: string;
    username: string;
    rewardType: RewardType;
    amount: number;
    reason: string;
  }[];
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type WindowBet = {
  userId: string;
  spinId: string | null;
  amount: number;
  payout: number;
  result: string;
  createdAt: Date;
};

type PlayerActivity = {
  userId: string;
  username: string;
  fullName: string;
  active: boolean;
  totalBet: number;
  totalPayout: number;
  spinCount: number;
  netLoss: number;
  consecutiveLosingSpins: number;
  totalLostInStreak: number;
};

/** Calcula racha de giros perdidos (más recientes primero) por jugador. */
function buildPlayerActivity(
  bets: WindowBet[],
  users: Map<string, { username: string; fullName: string; active: boolean }>
): PlayerActivity[] {
  const byUser = new Map<string, WindowBet[]>();
  for (const b of bets) {
    const list = byUser.get(b.userId);
    if (list) list.push(b);
    else byUser.set(b.userId, [b]);
  }

  const result: PlayerActivity[] = [];

  for (const [userId, list] of byUser) {
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const totalBet = round2(list.reduce((s, b) => s + b.amount, 0));
    const totalPayout = round2(list.reduce((s, b) => s + b.payout, 0));

    const spinIds = new Set(
      list.map((b, i) => b.spinId ?? `legacy-${userId}-${i}`)
    );
    const spinCount = spinIds.size;

    // Agrupar por spin para detectar racha de giros perdidos consecutivos.
    const spinsOrdered: { key: string; lost: boolean; stake: number; at: number }[] = [];
    const spinMap = new Map<string, { lost: boolean; stake: number; at: number }>();
    list.forEach((b, i) => {
      const key = b.spinId ?? `legacy-${userId}-${i}`;
      const prev = spinMap.get(key);
      const wonThis = b.result === "WIN";
      if (prev) {
        prev.lost = prev.lost && !wonThis;
        prev.stake += b.amount;
        prev.at = Math.max(prev.at, b.createdAt.getTime());
      } else {
        spinMap.set(key, { lost: !wonThis, stake: b.amount, at: b.createdAt.getTime() });
      }
    });
    for (const [key, v] of spinMap) spinsOrdered.push({ key, ...v });
    spinsOrdered.sort((a, b) => a.at - b.at);

    let consecutiveLosingSpins = 0;
    let totalLostInStreak = 0;
    for (let i = spinsOrdered.length - 1; i >= 0; i--) {
      if (spinsOrdered[i].lost) {
        consecutiveLosingSpins += 1;
        totalLostInStreak += spinsOrdered[i].stake;
      } else {
        break;
      }
    }

    const u = users.get(userId);
    result.push({
      userId,
      username: u?.username ?? "—",
      fullName: u?.fullName ?? "—",
      active: u?.active ?? false,
      totalBet,
      totalPayout,
      spinCount,
      netLoss: round2(Math.max(0, totalBet - totalPayout)),
      consecutiveLosingSpins,
      totalLostInStreak: round2(totalLostInStreak),
    });
  }

  return result;
}

async function recentlyRewarded(
  playerId: string,
  rewardType: RewardType,
  sinceMs: number
): Promise<boolean> {
  const count = await prisma.rouletteScheduledReward.count({
    where: {
      playerId,
      rewardType,
      status: { not: "CANCELLED" },
      createdAt: { gte: new Date(Date.now() - sinceMs) },
    },
  });
  return count > 0;
}

type TxClient = Prisma.TransactionClient;

/** Paga un premio desde el pozo: acredita saldo, audita y descuenta el pozo. */
async function payRewardInTx(
  tx: TxClient,
  params: {
    poolId: string;
    poolDate: string;
    playerId: string;
    rewardType: RewardType;
    amount: number;
    reason: string;
    eligibilityData: Record<string, unknown>;
  }
): Promise<number> {
  const { poolId, poolDate, playerId, rewardType, amount, reason, eligibilityData } =
    params;
  const pay = round2(amount);
  if (pay <= 0) return 0;

  const pool = await tx.rouletteRewardPool.findUnique({ where: { id: poolId } });
  if (!pool || pool.currentPromoBalance < pay) return 0;

  const wallet = await tx.wallet.findUnique({ where: { userId: playerId } });
  if (!wallet) return 0;

  const promoPoolBefore = pool.currentPromoBalance;
  const promoPoolAfter = round2(promoPoolBefore - pay);
  const balanceBefore = wallet.balance;
  const balanceAfter = round2(balanceBefore + pay);

  await tx.rouletteRewardPool.update({
    where: { id: poolId },
    data: {
      currentPromoBalance: promoPoolAfter,
      totalPromoPaid: { increment: pay },
    },
  });

  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: balanceAfter },
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "ROULETTE_PROMO_POOL",
      amount: pay,
      balanceBefore,
      balanceAfter,
      note: reason,
    },
  });

  const scheduled = await tx.rouletteScheduledReward.create({
    data: {
      poolDate,
      poolId,
      rewardType,
      amount: pay,
      playerId,
      reason,
      source: "PROMO_POOL",
      status: "PAID",
      paidAt: new Date(),
    },
  });

  await tx.rouletteRewardLedger.create({
    data: {
      poolId,
      poolDate,
      playerId,
      rewardType,
      direction: "PAY",
      amount: pay,
      promoPoolBefore,
      promoPoolAfter,
      reason,
      eligibilityData: JSON.stringify(eligibilityData),
      scheduledRewardId: scheduled.id,
    },
  });

  return pay;
}

/**
 * Dispara el reparto si pasó el intervalo configurado desde el último.
 * Usa un claim atómico para que solo UNA petición concurrente lo ejecute.
 * Pensado para invocarse tras un giro (no requiere cron frecuente / plan Pro).
 */
export async function maybeRunRewardsAfterSpin(): Promise<void> {
  try {
    const settings = await getRouletteSettings();
    if (!settings.rewardSystemActive) return;

    const poolDate = poolDateKey(nowInTz());
    const intervalMs = settings.rewardIntervalMinutes * 60 * 1000;
    const cutoff = new Date(Date.now() - intervalMs);

    const claim = await prisma.rouletteRewardPool.updateMany({
      where: {
        date: poolDate,
        currentPromoBalance: { gt: 0 },
        OR: [{ lastRewardRunAt: null }, { lastRewardRunAt: { lte: cutoff } }],
      },
      data: { lastRewardRunAt: new Date() },
    });

    if (claim.count === 0) return;
    await runScheduledRouletteRewards();
  } catch {
    /* no debe afectar el giro del jugador */
  }
}

export async function previewEligiblePlayers(
  settings?: RouletteSettingsData
): Promise<PlayerActivity[]> {
  const cfg = settings ?? (await getRouletteSettings());
  const windowMs = cfg.rewardIntervalMinutes * 60 * 1000;
  const since = new Date(Date.now() - windowMs);

  const bets = (await prisma.rouletteBet.findMany({
    where: { createdAt: { gte: since } },
    select: {
      userId: true,
      spinId: true,
      amount: true,
      payout: true,
      result: true,
      createdAt: true,
    },
  })) as WindowBet[];

  if (!bets.length) return [];

  const userIds = [...new Set(bets.map((b) => b.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, fullName: true, active: true },
  });
  const userMap = new Map(
    users.map((u) => [u.id, { username: u.username, fullName: u.fullName, active: u.active }])
  );

  const activity = buildPlayerActivity(bets, userMap);
  return activity
    .filter(
      (p) =>
        p.active &&
        p.spinCount >= cfg.minSpinsToQualify &&
        p.totalBet >= cfg.minBetAmountToQualify
    )
    .sort((a, b) => b.totalBet - a.totalBet);
}

/**
 * Reparte premios del pozo promocional a jugadores activos.
 * NUNCA toca el resultado de la ruleta ni usa dinero de la casa.
 */
export async function runScheduledRouletteRewards(
  opts: { force?: boolean } = {}
): Promise<RewardRunResult> {
  const settings = await getRouletteSettings();
  const poolDate = poolDateKey(nowInTz());

  const base: RewardRunResult = {
    ran: false,
    poolDate,
    promoBalanceBefore: 0,
    promoBalanceAfter: 0,
    budget: 0,
    totalPaid: 0,
    rewardsCreated: 0,
    cashbackPaid: 0,
    activeBonusPaid: 0,
    eligiblePlayers: 0,
    details: [],
  };

  if (!settings.rewardSystemActive && !opts.force) {
    return { ...base, reason: "Sistema de premios inactivo." };
  }

  const pool = await prisma.rouletteRewardPool.findUnique({
    where: { date: poolDate },
  });
  if (!pool || pool.currentPromoBalance <= 0) {
    return {
      ...base,
      promoBalanceBefore: pool?.currentPromoBalance ?? 0,
      reason: "Sin fondos en el pozo promocional.",
    };
  }

  base.promoBalanceBefore = pool.currentPromoBalance;

  const budget = round2(
    Math.min(
      (pool.currentPromoBalance * settings.maxRewardPercentOfPromoPool) / 100,
      pool.currentPromoBalance
    )
  );
  base.budget = budget;
  if (budget <= 0) {
    return { ...base, promoBalanceAfter: pool.currentPromoBalance, reason: "Presupuesto cero." };
  }

  const eligible = await previewEligiblePlayers(settings);
  base.eligiblePlayers = eligible.length;
  if (!eligible.length) {
    return {
      ...base,
      promoBalanceAfter: pool.currentPromoBalance,
      reason: "Sin jugadores elegibles.",
    };
  }

  const intervalMs = settings.rewardIntervalMinutes * 60 * 1000;
  const details: RewardRunResult["details"] = [];
  let totalPaid = 0;
  let cashbackPaid = 0;
  let activeBonusPaid = 0;
  let rewardsCreated = 0;

  // 1) Cashback por mala racha (objetivo: jugadores con muchas pérdidas seguidas).
  const streakPlayers = eligible.filter(
    (p) => p.consecutiveLosingSpins >= settings.cashbackAfterLosses && p.totalLostInStreak > 0
  );

  let remainingBudget = budget;

  for (const p of streakPlayers) {
    if (remainingBudget <= 0) break;
    if (await recentlyRewarded(p.userId, "CASHBACK", intervalMs)) continue;

    const raw = (p.totalLostInStreak * settings.cashbackPercent) / 100;
    const capped = Math.min(raw, settings.maxCashbackAmount, remainingBudget);
    const amount = round2(capped);
    if (amount <= 0) continue;

    const paid = await prisma.$transaction((tx) =>
      payRewardInTx(tx, {
        poolId: pool.id,
        poolDate,
        playerId: p.userId,
        rewardType: "CASHBACK",
        amount,
        reason: "Recibiste cashback por actividad",
        eligibilityData: {
          consecutiveLosingSpins: p.consecutiveLosingSpins,
          totalLostInStreak: p.totalLostInStreak,
          cashbackPercent: settings.cashbackPercent,
        },
      })
    );

    if (paid > 0) {
      remainingBudget = round2(remainingBudget - paid);
      cashbackPaid += paid;
      totalPaid += paid;
      rewardsCreated += 1;
      details.push({
        playerId: p.userId,
        username: p.username,
        rewardType: "CASHBACK",
        amount: paid,
        reason: "Cashback por mala racha",
      });
    }
  }

  // 2) Bono por actividad (reparto proporcional al peso de actividad).
  const bonusCandidates: PlayerActivity[] = [];
  for (const p of eligible) {
    if (await recentlyRewarded(p.userId, "ACTIVE_PLAYER_BONUS", intervalMs)) continue;
    bonusCandidates.push(p);
  }

  const totalWeight = bonusCandidates.reduce(
    (s, p) => s + (p.totalBet + p.spinCount * settings.spinWeight),
    0
  );

  if (remainingBudget > 0 && totalWeight > 0) {
    for (const p of bonusCandidates) {
      if (remainingBudget <= 0) break;
      const weight = p.totalBet + p.spinCount * settings.spinWeight;
      let amount = round2(budget * (weight / totalWeight));
      amount = Math.min(amount, remainingBudget);
      if (amount <= 0) continue;

      const paid = await prisma.$transaction((tx) =>
        payRewardInTx(tx, {
          poolId: pool.id,
          poolDate,
          playerId: p.userId,
          rewardType: "ACTIVE_PLAYER_BONUS",
          amount,
          reason: "Recibiste un bono del pozo promocional",
          eligibilityData: {
            weight,
            totalWeight,
            totalBet: p.totalBet,
            spinCount: p.spinCount,
          },
        })
      );

      if (paid > 0) {
        remainingBudget = round2(remainingBudget - paid);
        activeBonusPaid += paid;
        totalPaid += paid;
        rewardsCreated += 1;
        details.push({
          playerId: p.userId,
          username: p.username,
          rewardType: "ACTIVE_PLAYER_BONUS",
          amount: paid,
          reason: "Bono por actividad",
        });
      }
    }
  }

  const after = await prisma.rouletteRewardPool.findUnique({ where: { id: pool.id } });

  return {
    ran: true,
    poolDate,
    promoBalanceBefore: base.promoBalanceBefore,
    promoBalanceAfter: after?.currentPromoBalance ?? base.promoBalanceBefore,
    budget,
    totalPaid: round2(totalPaid),
    rewardsCreated,
    cashbackPaid: round2(cashbackPaid),
    activeBonusPaid: round2(activeBonusPaid),
    eligiblePlayers: eligible.length,
    details,
  };
}
