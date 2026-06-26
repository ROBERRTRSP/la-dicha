import type { Prisma } from "@prisma/client";
import type { RouletteBetType } from "./roulette";
import { dayStartInTz } from "./timezone";
import { formatMoney } from "./utils";

export type RouletteOutcomeDraft = {
  betType: RouletteBetType;
  betChoice: string;
  amount: number;
  won: boolean;
  payout: number;
  profit: number;
  result: "WIN" | "LOSE";
};

export async function getPlayerDailyRoulettePayoutTotal(
  tx: Prisma.TransactionClient,
  userId: string,
  since: Date = dayStartInTz()
): Promise<number> {
  const agg = await tx.rouletteBet.aggregate({
    where: {
      userId,
      createdAt: { gte: since },
      payout: { gt: 0 },
    },
    _sum: { payout: true },
  });
  return Math.round((agg._sum.payout ?? 0) * 100) / 100;
}

/** Limita premios del giro al cupo diario restante del jugador. */
export function scaleOutcomesToDailyPayoutCap(
  outcomes: RouletteOutcomeDraft[],
  maxAdditionalPayout: number
): {
  outcomes: RouletteOutcomeDraft[];
  totalPayout: number;
  message: string | null;
} {
  const rawTotal = outcomes.reduce((sum, o) => sum + o.payout, 0);
  if (rawTotal <= 0) {
    return { outcomes, totalPayout: 0, message: null };
  }

  if (maxAdditionalPayout <= 0) {
    const zeroed = outcomes.map((o) => ({
      ...o,
      won: false,
      payout: 0,
      profit: -o.amount,
      result: "LOSE" as const,
    }));
    return {
      outcomes: zeroed,
      totalPayout: 0,
      message: "Has alcanzado el límite de premios diarios en ruleta.",
    };
  }

  if (rawTotal <= maxAdditionalPayout) {
    return { outcomes, totalPayout: rawTotal, message: null };
  }

  const scale = maxAdditionalPayout / rawTotal;
  let totalPayout = 0;
  const scaled = outcomes.map((o) => {
    if (!o.won || o.payout <= 0) return o;
    const payout = Math.round(o.payout * scale * 100) / 100;
    totalPayout += payout;
    return {
      ...o,
      payout,
      profit: Math.round((payout - o.amount) * 100) / 100,
    };
  });

  return {
    outcomes: scaled,
    totalPayout: Math.round(totalPayout * 100) / 100,
    message: `Premio ajustado al límite diario (${formatMoney(maxAdditionalPayout)} restantes hoy).`,
  };
}

export async function applyDailyPayoutCapInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  maxDailyPayoutPerPlayer: number,
  outcomes: RouletteOutcomeDraft[]
): Promise<{
  outcomes: RouletteOutcomeDraft[];
  totalPayout: number;
  message: string | null;
} | null> {
  if (maxDailyPayoutPerPlayer <= 0) return null;

  const paidToday = await getPlayerDailyRoulettePayoutTotal(tx, userId);
  const remaining = Math.round((maxDailyPayoutPerPlayer - paidToday) * 100) / 100;
  const capped = scaleOutcomesToDailyPayoutCap(outcomes, remaining);
  return capped;
}
