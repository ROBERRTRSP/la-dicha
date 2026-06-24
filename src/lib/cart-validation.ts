import {
  detectBetType,
  formatNumbers,
  validateDigits,
  type BetTypeCode,
} from "./bet-parser";
import {
  BET_AMOUNT_MAX,
  BET_AMOUNT_MIN,
  MAX_CART_LINES,
  MAX_CART_TOTAL,
  MAX_LOTTERIES_PER_LINE,
} from "./cart-limits";
import type { OpenDrawView } from "./draws";
import { getOpenSuperPales, getSuperPaleDefinition } from "./super-pale";
import { formatMoney } from "./utils";
import { cartLineTotal, type CartLine } from "./cart-line";

export {
  BET_AMOUNT_MIN,
  BET_AMOUNT_MAX,
  MAX_CART_LINES,
  MAX_CART_TOTAL,
} from "./cart-limits";

function isBetType(value: string): value is BetTypeCode {
  return (
    value === "QUINIELA" ||
    value === "PALE" ||
    value === "TRIPLETA" ||
    value === "SUPER_PALE"
  );
}

function parseAmount(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) {
    throw new Error("Monto de jugada inválido.");
  }
  if (n < BET_AMOUNT_MIN) {
    throw new Error(`El monto mínimo por jugada es ${formatMoney(BET_AMOUNT_MIN)}.`);
  }
  if (n > BET_AMOUNT_MAX) {
    throw new Error(
      `El monto máximo por jugada es ${formatMoney(BET_AMOUNT_MAX)}.`
    );
  }
  return n;
}

function normalizeDigits(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Números de jugada inválidos.");
  }
  const digits = raw.replace(/\D/g, "");
  const err = validateDigits(digits);
  if (err) throw new Error(err);
  return digits;
}

/** Huella para detectar jugadas duplicadas en el carrito. */
export function cartLineFingerprint(line: CartLine): string {
  const draws = [...line.drawIds].sort().join(",");
  const sp = line.superPaleCode ?? "";
  return `${line.betType}|${line.digits}|${line.amount}|${draws}|${sp}`;
}

export function findDuplicateInCart(
  cart: CartLine[],
  candidate: CartLine
): CartLine | null {
  const fp = cartLineFingerprint(candidate);
  return cart.find((l) => cartLineFingerprint(l) === fp) ?? null;
}

/** Normaliza y valida estructura de una línea (servidor — no confía en el cliente). */
export function normalizeCartLine(raw: unknown, index: number): CartLine {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Jugada #${index + 1} inválida.`);
  }

  const row = raw as Record<string, unknown>;
  const amount = parseAmount(row.amount);
  const digits = normalizeDigits(row.digits ?? row.numbers);

  const drawIds = Array.isArray(row.drawIds)
    ? row.drawIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (drawIds.length === 0) {
    throw new Error(`Jugada #${index + 1}: sin loterías asignadas.`);
  }
  if (drawIds.length > MAX_LOTTERIES_PER_LINE) {
    throw new Error(`Jugada #${index + 1}: demasiadas loterías seleccionadas.`);
  }

  const superPaleCode =
    typeof row.superPaleCode === "string" ? row.superPaleCode : undefined;
  const superPaleName =
    typeof row.superPaleName === "string" ? row.superPaleName : undefined;

  let betType: BetTypeCode;
  if (superPaleCode || row.betType === "SUPER_PALE") {
    if (!superPaleCode) {
      throw new Error(`Jugada #${index + 1}: súper palé no válido.`);
    }
    const def = getSuperPaleDefinition(superPaleCode);
    if (!def) {
      throw new Error(`Jugada #${index + 1}: súper palé no reconocido.`);
    }
    if (digits.length !== 4) {
      throw new Error(`Jugada #${index + 1}: súper palé requiere 4 dígitos.`);
    }
    if (drawIds.length !== 2) {
      throw new Error(`Jugada #${index + 1}: súper palé requiere 2 sorteos.`);
    }
    betType = "SUPER_PALE";
  } else {
    const detected = detectBetType(digits);
    if (!detected) {
      throw new Error(`Jugada #${index + 1}: cantidad de dígitos no válida.`);
    }
    betType = detected;
    if (typeof row.betType === "string" && isBetType(row.betType) && row.betType !== betType) {
      throw new Error(`Jugada #${index + 1}: tipo de jugada no coincide con los números.`);
    }
  }

  const lotteryNames = Array.isArray(row.lotteryNames)
    ? row.lotteryNames.map((n) => (typeof n === "string" ? n : "Lotería"))
    : drawIds.map(() => "Lotería");

  const id =
    typeof row.id === "string" && row.id.length > 0 ? row.id : `line-${index}`;

  return {
    id,
    betType,
    digits,
    numbers: formatNumbers(digits, betType === "SUPER_PALE" ? "SUPER_PALE" : betType),
    amount,
    drawIds,
    lotteryNames,
    superPaleCode,
    superPaleName,
    addedAt: typeof row.addedAt === "number" ? row.addedAt : Date.now(),
  };
}

/**
 * Valida y normaliza el carrito completo en servidor.
 * Recalcula totales — nunca confía en totales enviados por el cliente.
 */
export function validateAndNormalizeCart(rawLines: unknown): {
  lines: CartLine[];
  total: number;
} {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new Error("Agrega una jugada antes de confirmar.");
  }
  if (rawLines.length > MAX_CART_LINES) {
    throw new Error(`Máximo ${MAX_CART_LINES} jugadas por ticket.`);
  }

  const lines = rawLines.map((row, i) => normalizeCartLine(row, i));
  const total = lines.reduce((sum, l) => sum + cartLineTotal(l), 0);

  if (total <= 0) {
    throw new Error("El total de la jugada debe ser mayor a cero.");
  }
  if (total > MAX_CART_TOTAL) {
    throw new Error(
      `El total del ticket no puede superar ${formatMoney(MAX_CART_TOTAL)}.`
    );
  }

  return { lines, total };
}

/** Valida que las jugadas del carrito sigan siendo vendibles con los sorteos abiertos actuales. */
export function validateCartAgainstOpenDraws(
  lines: CartLine[],
  openDraws: OpenDrawView[]
): string | null {
  if (!lines.length) return "Agrega una jugada antes de confirmar.";

  const openDrawIds = new Set(openDraws.map((d) => d.id));
  const openSuperCodes = new Set(
    getOpenSuperPales(openDraws).map((s) => s.code)
  );

  for (const line of lines) {
    const amountErr = validateLineAmount(line.amount);
    if (amountErr) return amountErr;

    const digitErr = validateDigits(line.digits);
    if (digitErr) return `Jugada inválida: ${digitErr}`;

    if (line.betType === "SUPER_PALE" || line.superPaleCode) {
      const code = line.superPaleCode ?? "";
      if (!openSuperCodes.has(code)) {
        return `"${line.superPaleName ?? "Súper Palé"}" ya no está abierto. Quítalo del carrito.`;
      }
      continue;
    }

    for (let i = 0; i < line.drawIds.length; i++) {
      const drawId = line.drawIds[i];
      if (!openDrawIds.has(drawId)) {
        const name = line.lotteryNames[i] ?? "Una lotería";
        return `${name} ya cerró. Quita o actualiza esa jugada.`;
      }
    }
  }

  return null;
}

function validateLineAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount < BET_AMOUNT_MIN) {
    return `El monto mínimo por jugada es ${formatMoney(BET_AMOUNT_MIN)}.`;
  }
  if (amount > BET_AMOUNT_MAX) {
    return `El monto máximo por jugada es ${formatMoney(BET_AMOUNT_MAX)}.`;
  }
  return null;
}

export type SanitizedCartResult = {
  lines: CartLine[];
  removedMessages: string[];
  warning: string | null;
};

/**
 * Sanea un carrito cargado (sessionStorage / repetir jugada).
 * Elimina líneas inválidas y devuelve mensajes claros para el usuario.
 */
export function sanitizeStoredCart(
  raw: unknown,
  openDraws: OpenDrawView[]
): SanitizedCartResult {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { lines: [], removedMessages: [], warning: null };
  }

  const openDrawIds = new Set(openDraws.map((d) => d.id));
  const openSuperCodes = new Set(
    getOpenSuperPales(openDraws).map((s) => s.code)
  );

  const valid: CartLine[] = [];
  const removedMessages: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    const label = `Jugada #${i + 1}`;
    try {
      const line = normalizeCartLine(raw[i], i);

      if (line.betType === "SUPER_PALE" || line.superPaleCode) {
        const code = line.superPaleCode ?? "";
        if (!openSuperCodes.has(code)) {
          removedMessages.push(
            `${label} (${line.superPaleName ?? "Súper Palé"}): ya no está abierto.`
          );
          continue;
        }
      } else {
        const closed = line.drawIds.filter((id) => !openDrawIds.has(id));
        if (closed.length > 0) {
          removedMessages.push(
            `${label} (${line.numbers}): una o más loterías ya cerraron.`
          );
          continue;
        }
      }

      valid.push(line);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "datos inválidos";
      removedMessages.push(`${label}: ${msg}`);
    }
  }

  if (valid.length > MAX_CART_LINES) {
    const extra = valid.length - MAX_CART_LINES;
    valid.splice(MAX_CART_LINES);
    removedMessages.push(
      `Se omitieron ${extra} jugada(s) por exceder el máximo de ${MAX_CART_LINES}.`
    );
  }

  const total = valid.reduce((s, l) => s + cartLineTotal(l), 0);
  if (total > MAX_CART_TOTAL) {
    return {
      lines: [],
      removedMessages: [
        ...removedMessages,
        `El total repetido supera ${formatMoney(MAX_CART_TOTAL)}. Carrito descartado.`,
      ],
      warning:
        "La jugada repetida supera el límite permitido. Arma tu ticket de nuevo.",
    };
  }

  let warning: string | null = null;
  if (removedMessages.length > 0) {
    if (valid.length === 0) {
      warning =
        "No se pudo cargar la jugada repetida: las loterías cerraron o los datos no son válidos.";
    } else {
      warning = `Se cargaron ${valid.length} jugada(s). Algunas no estaban disponibles y se omitieron.`;
    }
  }

  return { lines: valid, removedMessages, warning };
}
