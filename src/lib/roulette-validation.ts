import {
  betSelectionKey,
  normalizeBetChoice,
  validateBetInput,
  type RouletteBetInput,
  type RouletteBetType,
} from "./roulette";
import type { RouletteSettingsData } from "./roulette-settings";
import { formatMoney } from "./utils";

export const MAX_BETS_PER_SPIN = 50;

/** Montos permitidos por apuesta (número o jugada externa). */
export const ROULETTE_ALLOWED_AMOUNTS = [1, 2, 3, 4, 5] as const;

export type RouletteAllowedAmount = (typeof ROULETTE_ALLOWED_AMOUNTS)[number];

export function isAllowedRouletteAmount(amount: number): boolean {
  return (ROULETTE_ALLOWED_AMOUNTS as readonly number[]).includes(amount);
}

export const ROULETTE_AMOUNT_ERROR =
  "Solo puedes jugar 1.00, 2.00, 3.00, 4.00 o 5.00 por número en cada jugada.";

export function filterAllowedAmountsForBalance(balance: number): number[] {
  return ROULETTE_ALLOWED_AMOUNTS.filter((a) => a <= balance);
}

const BET_TYPES: RouletteBetType[] = [
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

function isRouletteBetType(value: string): value is RouletteBetType {
  return (BET_TYPES as string[]).includes(value);
}

export function parseRouletteBetsPayload(body: unknown): unknown[] {
  if (!body || typeof body !== "object") {
    throw new Error("Selecciona al menos una apuesta.");
  }
  const row = body as Record<string, unknown>;
  if (Array.isArray(row.bets) && row.bets.length > 0) {
    return row.bets;
  }
  if (row.betType) {
    return [
      {
        betType: row.betType,
        betChoice: row.betChoice,
        amount: row.amount,
      },
    ];
  }
  throw new Error("Selecciona al menos una apuesta.");
}

/**
 * Normaliza y valida apuestas en servidor (montos, tipos, duplicados).
 * No confía en totales ni resultados enviados por el cliente.
 */
export function normalizeRouletteBets(
  rawList: unknown[],
  settings: RouletteSettingsData
): RouletteBetInput[] {
  if (!rawList.length) {
    throw new Error("Selecciona al menos una apuesta.");
  }
  if (rawList.length > MAX_BETS_PER_SPIN) {
    throw new Error(`Máximo ${MAX_BETS_PER_SPIN} apuestas por giro.`);
  }

  const seen = new Set<string>();
  const bets: RouletteBetInput[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const raw = rawList[i];
    if (!raw || typeof raw !== "object") {
      throw new Error(`Apuesta #${i + 1} inválida.`);
    }
    const row = raw as Record<string, unknown>;
    const betTypeRaw = String(row.betType ?? "").trim();

    if (!isRouletteBetType(betTypeRaw)) {
      throw new Error(`Apuesta #${i + 1}: tipo de apuesta no permitido.`);
    }

    const betChoice = normalizeBetChoice(
      betTypeRaw,
      String(row.betChoice ?? "")
    );
    const amount = Math.floor(Number(row.amount));

    const basicErr = validateBetInput(betTypeRaw, betChoice, amount);
    if (basicErr) {
      throw new Error(`Apuesta #${i + 1}: ${basicErr}`);
    }

    if (amount < settings.minBetAmount) {
      throw new Error(
        `Apuesta #${i + 1}: el monto mínimo es ${formatMoney(settings.minBetAmount)}.`
      );
    }

    if (!isAllowedRouletteAmount(amount)) {
      throw new Error(`Apuesta #${i + 1}: ${ROULETTE_AMOUNT_ERROR}`);
    }

    const key = betSelectionKey(betTypeRaw, betChoice);
    if (seen.has(key)) {
      throw new Error("Apuesta duplicada en la misma jugada.");
    }
    seen.add(key);

    bets.push({
      betType: betTypeRaw,
      betChoice,
      amount,
    });
  }

  const totalStake = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalStake <= 0) {
    throw new Error("El total apostado debe ser mayor a cero.");
  }

  return bets;
}
