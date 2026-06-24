import type { SlotGameId } from "./types";

export type SlotAnimConfig = {
  cellHeight: number;
  symbolSize: number;
  /** Segmentos repetidos en bucle (×12 símbolos c/u) */
  loopRepeats: number;
  spinSymbols: number;
  accelMs: number;
  maxVelocity: number;
  columnStopDelayMs: number;
  baseSpinMs: number;
  decelMs: number;
  settleMs: number;
  decelEasing: string;
};

const DEFAULT: SlotAnimConfig = {
  cellHeight: 72,
  symbolSize: 52,
  loopRepeats: 8,
  spinSymbols: 18,
  accelMs: 300,
  maxVelocity: 3.4,
  columnStopDelayMs: 240,
  baseSpinMs: 560,
  decelMs: 820,
  settleMs: 180,
  decelEasing: "cubic-bezier(0.14, 0.92, 0.18, 1.04)",
};

const PREMIUM: SlotAnimConfig = {
  ...DEFAULT,
  loopRepeats: 10,
  spinSymbols: 20,
  accelMs: 340,
  maxVelocity: 3.8,
  columnStopDelayMs: 260,
  baseSpinMs: 620,
  decelMs: 900,
  decelEasing: "cubic-bezier(0.12, 0.88, 0.22, 1.06)",
};

export const SLOT_ANIMATION: Record<SlotGameId, SlotAnimConfig> = {
  "treasure-skunk": DEFAULT,
  "magic-lamp": PREMIUM,
  "golden-ox": DEFAULT,
  "moon-wolf": DEFAULT,
};

export function getSlotAnimationConfig(gameId: SlotGameId): SlotAnimConfig {
  return SLOT_ANIMATION[gameId] ?? DEFAULT;
}

export const UI_ANIM = {
  winCountMs: 900,
  winCountEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
  paytableOpenMs: 280,
  coinBurstMs: 1200,
} as const;
