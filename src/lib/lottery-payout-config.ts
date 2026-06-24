import { prisma } from "./db";

/** Multiplicadores de pago — fuente única para liquidación y Modo Riesgo. */
export type LotteryPayoutConfig = {
  quiniela1: number;
  quiniela2: number;
  quiniela3: number;
  pale: number;
  tripleta: number;
  superPale: number;
};

export const DEFAULT_LOTTERY_PAYOUT_CONFIG: LotteryPayoutConfig = {
  quiniela1: 56,
  quiniela2: 12,
  quiniela3: 4,
  pale: 1300,
  tripleta: 10000,
  superPale: 1300,
};

export type LotteryRiskLimits = {
  maxQuinielaPerNumber: number;
  expensiveDirectoAmount: number;
  /** Pago posible / ventas del sorteo — alerta crítica */
  exposureSalesRatio: number;
  /** % del sorteo en una sola jugada — concentración anormal */
  concentrationPercent: number;
};

const DEFAULT_RISK_LIMITS: LotteryRiskLimits = {
  maxQuinielaPerNumber: 500,
  expensiveDirectoAmount: 50,
  exposureSalesRatio: 2.5,
  concentrationPercent: 40,
};

export async function getLotteryRiskLimits(): Promise<LotteryRiskLimits> {
  const row = await prisma.bancaSettings.findUnique({ where: { id: "default" } });
  if (!row) return { ...DEFAULT_RISK_LIMITS };
  return {
    maxQuinielaPerNumber: row.maxDirectoPerNumber,
    expensiveDirectoAmount: row.expensiveDirectoAmount,
    exposureSalesRatio: DEFAULT_RISK_LIMITS.exposureSalesRatio,
    concentrationPercent: DEFAULT_RISK_LIMITS.concentrationPercent,
  };
}

export function worstCasePayout(
  betType: string,
  amount: number,
  config: LotteryPayoutConfig = DEFAULT_LOTTERY_PAYOUT_CONFIG
): number {
  switch (betType) {
    case "QUINIELA":
      return amount * config.quiniela1;
    case "PALE":
      return amount * config.pale;
    case "TRIPLETA":
      return amount * config.tripleta;
    case "SUPER_PALE":
      return amount * config.superPale;
    default:
      return 0;
  }
}
