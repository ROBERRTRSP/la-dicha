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

export type SlotAnimOptions = {
  /** Ancho del viewport del carrete (≤768 = móvil) */
  mobile?: boolean;
  /** Altura de celda medida en runtime para igualar velocidad visual */
  cellHeight?: number;
};

function scaleAnimForDevice(
  base: SlotAnimConfig,
  opts?: SlotAnimOptions
): SlotAnimConfig {
  const refCell = base.cellHeight;
  const cellH = opts?.cellHeight && opts.cellHeight > 0 ? opts.cellHeight : refCell;
  const cellRatio = cellH / refCell;

  let config: SlotAnimConfig = {
    ...base,
    maxVelocity: base.maxVelocity * cellRatio,
  };

  if (opts?.mobile) {
    config = {
      ...config,
      accelMs: Math.round(config.accelMs * 1.35),
      maxVelocity: config.maxVelocity * 0.72,
      columnStopDelayMs: Math.round(config.columnStopDelayMs * 1.4),
      baseSpinMs: Math.round(config.baseSpinMs * 1.55),
      decelMs: Math.round(config.decelMs * 1.3),
      settleMs: Math.round(config.settleMs * 1.1),
    };
  }

  return config;
}

export function getSlotAnimationConfig(
  gameId: SlotGameId,
  opts?: SlotAnimOptions
): SlotAnimConfig {
  const base = SLOT_ANIMATION[gameId] ?? DEFAULT;
  return scaleAnimForDevice(base, opts);
}

export const UI_ANIM = {
  winCountMs: 900,
  winCountEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
  paytableOpenMs: 280,
  coinBurstMs: 1200,
} as const;
