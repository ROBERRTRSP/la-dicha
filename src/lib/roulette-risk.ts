import {
  isBetWinner,
  type RouletteBetInput,
  type RouletteBetType,
} from "./roulette";
import type { RouletteBankrollSnapshot } from "./roulette-bankroll";
import { formatMoney } from "./utils";
import {
  calcBetPayout,
  getPayoutMultiplier,
  maxStraightExposureAtStake,
  type RoulettePayoutMultipliers,
} from "./roulette-payouts";
import {
  effectiveMaxSpinExposure,
  type RouletteSettingsData,
} from "./roulette-settings";
import {
  ROULETTE_ALLOWED_AMOUNTS,
  ROULETTE_AMOUNT_ERROR,
  isAllowedRouletteAmount,
} from "./roulette-validation";

export const ROULETTE_LIMIT_MESSAGE =
  "Esta jugada supera el límite permitido. Reduce el monto.";

export type RiskCheckResult =
  | { ok: true; exposure: SpinExposureSnapshot }
  | { ok: false; message: string; exposure?: SpinExposureSnapshot };

export type SpinExposureSnapshot = {
  byNumber: Record<number, number>;
  totalSpinExposure: number;
  totalStake: number;
  maxSingleNumberExposure: number;
};

const OUTSIDE_TYPES = new Set<RouletteBetType>([
  "RED",
  "BLACK",
  "EVEN",
  "ODD",
  "LOW",
  "HIGH",
  "DOZEN_1",
  "DOZEN_2",
  "DOZEN_3",
  "COLUMN_1",
  "COLUMN_2",
  "COLUMN_3",
]);

export function buildSpinExposure(
  bets: RouletteBetInput[],
  multipliers: RoulettePayoutMultipliers
): SpinExposureSnapshot {
  const byNumber: Record<number, number> = {};
  for (let n = 0; n <= 36; n++) byNumber[n] = 0;

  for (const bet of bets) {
    for (let n = 0; n <= 36; n++) {
      if (isBetWinner(bet.betType, bet.betChoice, n)) {
        byNumber[n] += calcBetPayout(bet.betType, bet.amount, true, multipliers);
      }
    }
  }

  const exposures = Object.values(byNumber);
  const totalSpinExposure = exposures.length ? Math.max(...exposures) : 0;
  const maxSingleNumberExposure = totalSpinExposure;
  const totalStake = bets.reduce((sum, b) => sum + b.amount, 0);

  return {
    byNumber,
    totalSpinExposure,
    totalStake,
    maxSingleNumberExposure,
  };
}

export function maxAllowedRisk(
  settings: RouletteSettingsData,
  bankroll?: RouletteBankrollSnapshot
): number {
  const spinCap = effectiveMaxSpinExposure(settings);
  const bankrollRisk =
    bankroll && settings.maxRiskPercentOfReserve > 0
      ? (bankroll.playableBankroll * settings.maxRiskPercentOfReserve) / 100
      : Number.POSITIVE_INFINITY;

  const caps = [spinCap, bankrollRisk].filter((n) => n > 0 && Number.isFinite(n));
  const exposureFloor = maxStraightExposureAtStake(
    Math.max(...ROULETTE_ALLOWED_AMOUNTS),
    settings.payoutMultipliers
  );
  if (caps.length === 0) return exposureFloor;
  return Math.max(Math.min(...caps), exposureFloor);
}

export function validateBetsRisk(
  bets: RouletteBetInput[],
  settings: RouletteSettingsData,
  multipliers: RoulettePayoutMultipliers,
  bankroll?: RouletteBankrollSnapshot
): RiskCheckResult {
  if (!bets.length) {
    return { ok: false, message: "Selecciona al menos una apuesta." };
  }

  for (const bet of bets) {
    if (bet.amount < settings.minBetAmount) {
      return {
        ok: false,
        message: `El monto mínimo por apuesta es ${formatMoney(settings.minBetAmount)}.`,
      };
    }

    if (!isAllowedRouletteAmount(bet.amount)) {
      return { ok: false, message: ROULETTE_AMOUNT_ERROR };
    }
  }

  const exposure = buildSpinExposure(bets, multipliers);

  /** Ruleta RD$1–5: montos ya validados; la casa controla el resultado. */
  if (bets.every((b) => isAllowedRouletteAmount(b.amount))) {
    return { ok: true, exposure };
  }

  for (const bet of bets) {
    if (settings.maxBetAmount > 0 && bet.amount > settings.maxBetAmount) {
      return { ok: false, message: ROULETTE_LIMIT_MESSAGE };
    }

    if (bet.betType === "STRAIGHT") {
      if (settings.maxStraightBet > 0 && bet.amount > settings.maxStraightBet) {
        return { ok: false, message: ROULETTE_LIMIT_MESSAGE };
      }
    } else if (OUTSIDE_TYPES.has(bet.betType)) {
      if (settings.maxOutsideBet > 0 && bet.amount > settings.maxOutsideBet) {
        return { ok: false, message: ROULETTE_LIMIT_MESSAGE };
      }
    }
  }

  const allowedRisk = maxAllowedRisk(settings, bankroll);

  if (Number.isFinite(allowedRisk) && exposure.totalSpinExposure > allowedRisk) {
    return { ok: false, message: ROULETTE_LIMIT_MESSAGE, exposure };
  }

  if (
    settings.maxExposurePerSpin > 0 &&
    exposure.totalSpinExposure > settings.maxExposurePerSpin
  ) {
    return { ok: false, message: ROULETTE_LIMIT_MESSAGE, exposure };
  }

  if (settings.maxPayoutPerSpin > 0 && exposure.totalSpinExposure > settings.maxPayoutPerSpin) {
    return { ok: false, message: ROULETTE_LIMIT_MESSAGE, exposure };
  }

  if (settings.maxExposurePerNumber > 0) {
    for (let n = 0; n <= 36; n++) {
      if (exposure.byNumber[n] > settings.maxExposurePerNumber) {
        return { ok: false, message: ROULETTE_LIMIT_MESSAGE, exposure };
      }
    }
  }

  return { ok: true, exposure };
}

/** Vista previa de una jugada individual antes de agregarla al carrito. */
export function validateBetAddition(
  existing: RouletteBetInput[],
  newBet: RouletteBetInput,
  settings: RouletteSettingsData,
  multipliers: RoulettePayoutMultipliers,
  bankroll?: RouletteBankrollSnapshot
): RiskCheckResult {
  const merged = [...existing, newBet];
  return validateBetsRisk(merged, settings, multipliers, bankroll);
}

export function formatExposureSummary(
  exposure: SpinExposureSnapshot,
  multipliers: RoulettePayoutMultipliers,
  bets: RouletteBetInput[]
) {
  const maxPayoutIfAllWin = bets.reduce(
    (sum, b) => sum + b.amount + b.amount * getPayoutMultiplier(b.betType, multipliers),
    0
  );
  return {
    totalStake: exposure.totalStake,
    totalSpinExposure: exposure.totalSpinExposure,
    maxSingleNumberExposure: exposure.maxSingleNumberExposure,
    maxPayoutIfAllWin,
  };
}
