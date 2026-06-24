import type { RouletteBetType } from "./roulette";

/** Multiplicador de ganancia (premio = stake + stake × mult). */
export type RoulettePayoutMultipliers = Record<string, number>;

export const PAYOUT_LABELS: Record<string, string> = {
  STRAIGHT: "Directo",
  SPLIT: "Split",
  STREET: "Street",
  CORNER: "Corner",
  LINE: "Line",
  RED: "Rojo",
  BLACK: "Negro",
  EVEN: "Par",
  ODD: "Impar",
  LOW: "Bajo",
  HIGH: "Alto",
  DOZEN_1: "1ra docena",
  DOZEN_2: "2da docena",
  DOZEN_3: "3ra docena",
  COLUMN_1: "Columna 1",
  COLUMN_2: "Columna 2",
  COLUMN_3: "Columna 3",
};

/** Pagos sugeridos para RTP jugador ~92% (house edge 8%). */
export const DEFAULT_ROULETTE_PAYOUTS: RoulettePayoutMultipliers = {
  STRAIGHT: 33,
  SPLIT: 16,
  STREET: 10,
  CORNER: 7,
  LINE: 4,
  RED: 0.89,
  BLACK: 0.89,
  EVEN: 0.89,
  ODD: 0.89,
  LOW: 0.89,
  HIGH: 0.89,
  DOZEN_1: 1.8,
  DOZEN_2: 1.8,
  DOZEN_3: 1.8,
  COLUMN_1: 1.8,
  COLUMN_2: 1.8,
  COLUMN_3: 1.8,
};

const ACTIVE_BET_TYPES: RouletteBetType[] = [
  "STRAIGHT",
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
];

export function parsePayoutMultipliers(raw: unknown): RoulettePayoutMultipliers {
  const base = { ...DEFAULT_ROULETTE_PAYOUTS };
  if (!raw) return base;
  if (typeof raw === "string") {
    try {
      return mergePayoutMultipliers(base, JSON.parse(raw) as RoulettePayoutMultipliers);
    } catch {
      return base;
    }
  }
  if (typeof raw === "object") {
    return mergePayoutMultipliers(base, raw as RoulettePayoutMultipliers);
  }
  return base;
}

function mergePayoutMultipliers(
  base: RoulettePayoutMultipliers,
  patch: RoulettePayoutMultipliers
): RoulettePayoutMultipliers {
  const out = { ...base };
  for (const [key, val] of Object.entries(patch)) {
    const n = Number(val);
    if (Number.isFinite(n) && n >= 0) out[key] = n;
  }
  return out;
}

export function getPayoutMultiplier(
  betType: RouletteBetType | string,
  multipliers: RoulettePayoutMultipliers
): number {
  const m = multipliers[betType];
  if (typeof m === "number" && m >= 0) return m;
  return DEFAULT_ROULETTE_PAYOUTS[betType] ?? 0;
}

export function calcBetPayout(
  betType: RouletteBetType,
  amount: number,
  won: boolean,
  multipliers: RoulettePayoutMultipliers
): number {
  if (!won) return 0;
  const mult = getPayoutMultiplier(betType, multipliers);
  return amount + amount * mult;
}

/** Premio máximo si gana un directo al tope permitido (RD$5 × mult.). */
export function maxStraightExposureAtStake(
  stake: number,
  multipliers: RoulettePayoutMultipliers
): number {
  return stake * (1 + getPayoutMultiplier("STRAIGHT", multipliers));
}

export function serializePayoutMultipliers(
  multipliers: RoulettePayoutMultipliers
): string {
  return JSON.stringify(multipliers);
}

export function validatePayoutMultipliersPatch(
  patch: Partial<RoulettePayoutMultipliers>,
  current: RoulettePayoutMultipliers
): RoulettePayoutMultipliers {
  const merged = mergePayoutMultipliers(current, patch as RoulettePayoutMultipliers);
  for (const key of Object.keys(merged)) {
    const n = merged[key];
    if (!Number.isFinite(n) || n < 0 || n > 500) {
      throw new Error(`Multiplicador inválido para ${key}.`);
    }
  }
  return merged;
}

export const ADMIN_PAYOUT_KEYS = [
  "STRAIGHT",
  "SPLIT",
  "STREET",
  "CORNER",
  "LINE",
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
] as const;

export function activeBetTypes(): RouletteBetType[] {
  return [...ACTIVE_BET_TYPES];
}
