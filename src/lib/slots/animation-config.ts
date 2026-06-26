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



/** Debe coincidir con SETTLE_BOUNCE_MS en reel-motion.ts */

export const REEL_SETTLE_BOUNCE_MS = 260;



const REEL_COUNT = 5;

const LAST_COL_INDEX = REEL_COUNT - 1;



/** Ciclo total objetivo: último carrete asentado (~5 s). */

const SPIN_CYCLE_TARGET_MS = 5000;



function spinTiming(

  columnStopDelayMs: number,

  decelMs: number,

  settleMs = 200

): Pick<

  SlotAnimConfig,

  "baseSpinMs" | "columnStopDelayMs" | "decelMs" | "settleMs"

> {

  const baseSpinMs = Math.max(

    1200,

    SPIN_CYCLE_TARGET_MS -

      LAST_COL_INDEX * columnStopDelayMs -

      decelMs -

      REEL_SETTLE_BOUNCE_MS

  );

  return { baseSpinMs, columnStopDelayMs, decelMs, settleMs };

}



/** Duración estimada hasta que el último carrete termina (incl. rebote). */

export function estimateMaxSpinDurationMs(config: SlotAnimConfig): number {

  return (

    config.baseSpinMs +

    LAST_COL_INDEX * config.columnStopDelayMs +

    config.decelMs +

    REEL_SETTLE_BOUNCE_MS

  );

}



const DEFAULT_TIMING = spinTiming(260, 880);



const DEFAULT: SlotAnimConfig = {

  cellHeight: 72,

  symbolSize: 52,

  loopRepeats: 8,

  spinSymbols: 18,

  accelMs: 300,

  maxVelocity: 3.4,

  decelEasing: "cubic-bezier(0.14, 0.92, 0.18, 1.04)",

  ...DEFAULT_TIMING,

};



const PREMIUM_TIMING = spinTiming(280, 920);



const PREMIUM: SlotAnimConfig = {

  ...DEFAULT,

  loopRepeats: 10,

  spinSymbols: 20,

  accelMs: 340,

  maxVelocity: 3.8,

  decelEasing: "cubic-bezier(0.12, 0.88, 0.22, 1.06)",

  ...PREMIUM_TIMING,

};



export const SLOT_ANIMATION: Record<SlotGameId, SlotAnimConfig> = {

  "treasure-skunk": DEFAULT,

  "magic-lamp": PREMIUM,

  "golden-ox": DEFAULT,

  "moon-wolf": DEFAULT,

  "classic-7": {

    ...DEFAULT,

    loopRepeats: 9,

    accelMs: 280,

    maxVelocity: 3.6,

    decelEasing: "cubic-bezier(0.14, 0.92, 0.18, 1.04)",

    ...spinTiming(300, 800, 200),

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

    config = {

      ...config,

      accelMs: Math.round(config.accelMs * 1.12),

      maxVelocity: config.maxVelocity * 0.72,

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


