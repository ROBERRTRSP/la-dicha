import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { RouletteSettingsData } from "./roulette-settings";
import { dateKeyInTz, nowInTz } from "./timezone";

export type RewardPoolView = {
  date: string;
  totalPromoCollected: number;
  totalPromoPaid: number;
  currentPromoBalance: number;
  totalMainCollected: number;
  totalHouseFee: number;
};

export type BetSplit = {
  houseFee: number;
  poolContribution: number;
  promoContribution: number;
  mainPoolContribution: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function poolDateKey(date: Date = nowInTz()): string {
  return dateKeyInTz(date);
}

/**
 * Desglose contable de una apuesta. NO afecta el resultado del giro.
 * La casa cobra su % primero; el resto alimenta el pozo (promo + main).
 */
export function computeBetSplit(
  betAmount: number,
  settings: RouletteSettingsData
): BetSplit {
  const houseFee = round2((betAmount * settings.housePercent) / 100);
  const poolContribution = round2(betAmount - houseFee);
  const promoContribution = round2(
    (poolContribution * settings.promoPercent) / 100
  );
  const mainPoolContribution = round2(poolContribution - promoContribution);
  return { houseFee, poolContribution, promoContribution, mainPoolContribution };
}

/** Crea/obtiene el pozo del día (sin transacción externa). */
export async function ensureRewardPool(date?: string) {
  const key = date ?? poolDateKey();
  return prisma.rouletteRewardPool.upsert({
    where: { date: key },
    update: {},
    create: { date: key },
  });
}

type TxClient = Prisma.TransactionClient;

/**
 * Aplica al pozo el desglose AGREGADO de un giro (suma de todas sus apuestas),
 * dentro de la transacción del spin. Una sola entrada de auditoría COLLECT.
 * Si el sistema de premios está inactivo se registra el desglose contable
 * pero no se acumula saldo promocional repartible.
 */
export async function collectSpinSplitInTx(
  tx: TxClient,
  params: {
    settings: RouletteSettingsData;
    split: { houseFee: number; promoContribution: number; mainPoolContribution: number };
    spinId: string;
    poolDate: string;
  }
): Promise<void> {
  const { settings, split, spinId, poolDate } = params;

  const pool = await tx.rouletteRewardPool.upsert({
    where: { date: poolDate },
    update: {},
    create: { date: poolDate },
  });

  const promoToAdd = settings.rewardSystemActive ? round2(split.promoContribution) : 0;
  const promoPoolBefore = pool.currentPromoBalance;
  const promoPoolAfter = round2(promoPoolBefore + promoToAdd);

  await tx.rouletteRewardPool.update({
    where: { id: pool.id },
    data: {
      totalHouseFee: { increment: round2(split.houseFee) },
      totalMainCollected: { increment: round2(split.mainPoolContribution) },
      totalPromoCollected: { increment: promoToAdd },
      currentPromoBalance: { increment: promoToAdd },
    },
  });

  if (promoToAdd > 0) {
    await tx.rouletteRewardLedger.create({
      data: {
        poolId: pool.id,
        poolDate,
        rewardType: "PROMO_FUNDING",
        direction: "COLLECT",
        amount: promoToAdd,
        promoPoolBefore,
        promoPoolAfter,
        reason: "Aporte promocional del giro",
        spinId,
      },
    });
  }
}

export async function getRewardPoolView(date?: string): Promise<RewardPoolView> {
  const key = date ?? poolDateKey();
  const pool = await prisma.rouletteRewardPool.findUnique({ where: { date: key } });
  if (!pool) {
    return {
      date: key,
      totalPromoCollected: 0,
      totalPromoPaid: 0,
      currentPromoBalance: 0,
      totalMainCollected: 0,
      totalHouseFee: 0,
    };
  }
  return {
    date: pool.date,
    totalPromoCollected: pool.totalPromoCollected,
    totalPromoPaid: pool.totalPromoPaid,
    currentPromoBalance: pool.currentPromoBalance,
    totalMainCollected: pool.totalMainCollected,
    totalHouseFee: pool.totalHouseFee,
  };
}
