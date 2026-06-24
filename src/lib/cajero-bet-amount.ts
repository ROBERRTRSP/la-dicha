import { BET_AMOUNT_MAX, BET_AMOUNT_MIN } from "./cart-limits";
import { formatMoney } from "./utils";

export const CAJERO_AMOUNT_EMPTY_ERROR =
  "Debe ingresar un monto para poder agregar la jugada.";

/** Monto entero desde el buffer del teclado; null si vacío o inválido. */
export function parseBetAmountDraft(
  draft: string,
  minBet = BET_AMOUNT_MIN
): number | null {
  const trimmed = draft.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < minBet || n > BET_AMOUNT_MAX) return null;
  return n;
}

export function validateBetAmountDraft(
  draft: string,
  minBet = BET_AMOUNT_MIN
): { ok: true; amount: number } | { ok: false; error: string } {
  const trimmed = draft.trim();
  if (!trimmed) {
    return { ok: false, error: CAJERO_AMOUNT_EMPTY_ERROR };
  }
  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      error: "Monto inválido. Use solo números enteros (pesos completos).",
    };
  }
  const n = parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: CAJERO_AMOUNT_EMPTY_ERROR };
  }
  if (n < minBet) {
    return {
      ok: false,
      error: `El monto mínimo por jugada es ${formatMoney(minBet)}.`,
    };
  }
  if (n > BET_AMOUNT_MAX) {
    return {
      ok: false,
      error: `El monto máximo por jugada es ${formatMoney(BET_AMOUNT_MAX)}.`,
    };
  }
  return { ok: true, amount: n };
}

export function hasValidBetAmountDraft(
  draft: string,
  minBet = BET_AMOUNT_MIN
): boolean {
  return validateBetAmountDraft(draft, minBet).ok;
}
