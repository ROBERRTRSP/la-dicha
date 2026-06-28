import type { SlotGameId } from "./types";
import {
  DESKTOP_REEL_PACE,
  MOBILE_REEL_PACE,
} from "./mobile-pace";

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

/** Debe coincidir con SETTLE_BOUNCE_MS en reel-motion.ts */
export const REEL_SETTLE_BOUNCE_MS = 60;

const REEL_COUNT = 5;
const LAST_COL_INDEX = REEL_COUNT - 1;

/** Ciclo total objetivo: video slot moderno (~2.8 s desktop, ~3.2 s móvil). */
const SPIN_CYCLE_TARGET_MS = DESKTOP_REEL_PACE.cycleTargetMs;

function spinTiming(
  columnStopDelayMs: number,
  decelMs: number,
  settleMs = 60,
  cycleTargetMs: number = SPIN_CYCLE_TARGET_MS
): Pick<
  SlotAnimConfig,
  "baseSpinMs" | "columnStopDelayMs" | "decelMs" | "settleMs"
> {
  const baseSpinMs = Math.max(
    900,
    cycleTargetMs -
      LAST_COL_INDEX * columnStopDelayMs -
      decelMs -
      REEL_SETTLE_BOUNCE_MS
  );
  return { baseSpinMs, columnStopDelayMs, decelMs, settleMs };
}

/** Duración estimada hasta que el último carrete termina (incl. snap). */
export function estimateMaxSpinDurationMs(config: SlotAnimConfig): number {
  return (
    config.baseSpinMs +
    LAST_COL_INDEX * config.columnStopDelayMs +
    config.decelMs +
    REEL_SETTLE_BOUNCE_MS
  );
}

const DEFAULT_TIMING = spinTiming(180, 420);

const DEFAULT: SlotAnimConfig = {
  cellHeight: 72,
  symbolSize: 52,
  loopRepeats: 6,
  spinSymbols: 14,
  accelMs: 120,
  maxVelocity: 5.6,
  decelEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
  ...DEFAULT_TIMING,
};

const PREMIUM_TIMING = spinTiming(190, 440);

const PREMIUM: SlotAnimConfig = {
  ...DEFAULT,
  loopRepeats: 7,
  spinSymbols: 16,
  accelMs: 110,
  maxVelocity: 6,
  decelEasing: "cubic-bezier(0.19, 1, 0.32, 1)",
  ...PREMIUM_TIMING,
};

export const SLOT_ANIMATION: Record<SlotGameId, SlotAnimConfig> = {
  "treasure-skunk": DEFAULT,
  "magic-lamp": PREMIUM,
  "golden-ox": DEFAULT,
  "moon-wolf": DEFAULT,
  "classic-7": {
    ...DEFAULT,
    loopRepeats: 7,
    accelMs: 100,
    maxVelocity: 5.9,
    decelEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
    ...spinTiming(200, 400),
  },
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
    const pace = MOBILE_REEL_PACE;
    const mobileTiming = spinTiming(
      Math.round(base.columnStopDelayMs * pace.columnDelayFactor),
      Math.round(base.decelMs * pace.decelFactor),
      base.settleMs,
      pace.cycleTargetMs
    );
    config = {
      ...config,
      ...mobileTiming,
      maxVelocity: config.maxVelocity * pace.velocityFactor,
      accelMs: Math.round(config.accelMs * pace.accelFactor),
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
