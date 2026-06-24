import { prisma } from "./db";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { RouletteSettingsData } from "./roulette-settings";
import { formatMoney } from "./utils";

const TZ = "America/Santo_Domingo";

function todayKey(): string {
  return format(toZonedTime(new Date(), TZ), "yyyy-MM-dd");
}

export type PromoSpinContext = {
  usedFreeSpin: boolean;
  cashbackAmount: number;
  bonusMessage: string | null;
};

export async function ensurePlayerPromo(userId: string) {
  return prisma.roulettePlayerPromo.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function applyWelcomeAndTrialCredits(
  userId: string,
  settings: RouletteSettingsData
): Promise<{ credited: number; message: string | null }> {
  let credited = 0;
  let message: string | null = null;

  const promo = await ensurePlayerPromo(userId);
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return { credited: 0, message: null };

  if (settings.trialCreditsEnabled && !promo.trialCreditClaimed) {
    credited += settings.trialCreditAmount;
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: settings.trialCreditAmount } },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "ROULETTE_PROMO",
          amount: settings.trialCreditAmount,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance + settings.trialCreditAmount,
          note: "Créditos de prueba — Ruleta",
        },
      }),
      prisma.roulettePlayerPromo.update({
        where: { userId },
        data: { trialCreditClaimed: true },
      }),
    ]);
    message = `¡Recibiste ${formatMoney(settings.trialCreditAmount)} en créditos de prueba!`;
  }

  if (settings.welcomeBonusEnabled && !promo.welcomeBonusClaimed) {
    const w = await prisma.wallet.findUnique({ where: { userId } });
    if (!w) return { credited, message };

    const bonus = settings.welcomeBonusAmount;
    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: w.id },
        data: { balance: { increment: bonus } },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: w.id,
          type: "ROULETTE_PROMO",
          amount: bonus,
          balanceBefore: w.balance,
          balanceAfter: w.balance + bonus,
          note: "Bono de bienvenida — Ruleta",
        },
      }),
      prisma.roulettePlayerPromo.update({
        where: { userId },
        data: { welcomeBonusClaimed: true },
      }),
    ]);
    credited += bonus;
    message = message
      ? `${message} Bono de bienvenida: ${formatMoney(bonus)}.`
      : `¡Bono de bienvenida! ${formatMoney(bonus)} agregados a tu saldo.`;
  }

  return { credited, message };
}

/** Solo lectura — para validar saldo sin consumir el giro gratis. */
export async function peekStakeToCharge(
  userId: string,
  settings: RouletteSettingsData,
  totalStake: number
): Promise<number> {
  if (!settings.freeSpinsEnabled || totalStake <= 0) {
    return totalStake;
  }

  const promo = await ensurePlayerPromo(userId);
  const day = todayKey();
  const usedToday =
    promo.freeSpinsDate === day ? promo.freeSpinsUsedToday : 0;

  if (usedToday >= settings.freeSpinsPerDay) {
    return totalStake;
  }

  return 0;
}

type PromoTx = Pick<
  typeof prisma,
  "roulettePlayerPromo"
>;

/** Consume giro gratis dentro de la transacción del spin (solo si el giro completa). */
export async function consumeFreeSpinInTx(
  tx: PromoTx,
  userId: string,
  settings: RouletteSettingsData,
  totalStake: number
): Promise<{ useFreeSpin: boolean; stakeToCharge: number }> {
  if (!settings.freeSpinsEnabled || totalStake <= 0) {
    return { useFreeSpin: false, stakeToCharge: totalStake };
  }

  const promo = await tx.roulettePlayerPromo.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const day = todayKey();
  const usedToday =
    promo.freeSpinsDate === day ? promo.freeSpinsUsedToday : 0;

  if (usedToday >= settings.freeSpinsPerDay) {
    return { useFreeSpin: false, stakeToCharge: totalStake };
  }

  await tx.roulettePlayerPromo.update({
    where: { userId },
    data: {
      freeSpinsUsedToday: usedToday + 1,
      freeSpinsDate: day,
    },
  });

  return { useFreeSpin: true, stakeToCharge: 0 };
}

export async function applyCashbackOnLoss(
  userId: string,
  settings: RouletteSettingsData,
  lostStake: number
): Promise<number> {
  if (!settings.cashbackEnabled || lostStake <= 0) return 0;

  const cashback = Math.round(lostStake * (settings.cashbackPercent / 100) * 100) / 100;
  if (cashback <= 0) return 0;

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return 0;

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: cashback } },
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "ROULETTE_PROMO",
        amount: cashback,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance + cashback,
        note: `Cashback promocional ${settings.cashbackPercent}% — Ruleta`,
      },
    }),
  ]);

  return cashback;
}

export function positiveOutcomeMessage(
  won: boolean,
  settings: RouletteSettingsData,
  cashbackAmount: number
): string | null {
  if (won) return "¡Excelente! ¡Sigue jugando con responsabilidad!";
  if (cashbackAmount > 0) {
    return `No salió esta vez, pero recuperaste ${formatMoney(cashbackAmount)} en cashback.`;
  }
  return settings.positiveSpinMessage;
}
