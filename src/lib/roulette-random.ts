import crypto from "crypto";

/** Resultado aleatorio justo — ruleta europea 0–36 (solo servidor). */
export function spinWinningNumber(): number {
  return crypto.randomInt(0, 37);
}

export function newRouletteSpinId(): string {
  return crypto.randomUUID();
}
