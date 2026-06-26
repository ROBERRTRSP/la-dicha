/** Ritmo de animación/UI optimizado para pantallas ≤768px. */

export const SLOT_MOBILE_MAX_WIDTH = 768;

export const MOBILE_REEL_PACE = {
  cycleTargetMs: 5400,
  minTotalSpinMs: 4600,
  velocityFactor: 0.86,
  accelFactor: 1.06,
  columnDelayFactor: 1.18,
  decelFactor: 1.08,
} as const;

export const DESKTOP_REEL_PACE = {
  cycleTargetMs: 5000,
  minTotalSpinMs: 4000,
} as const;

export type SlotUiPace = {
  winFlashMs: number;
  freeSpinCelebrationMs: number;
  autoFreeSpinDelayMs: number;
  classicWinFlashMs: number;
  classicBigWinFlashMs: number;
  coinBurstMs: number;
  winCountMs: number;
};

const DESKTOP_UI_PACE: SlotUiPace = {
  winFlashMs: 1600,
  freeSpinCelebrationMs: 2400,
  autoFreeSpinDelayMs: 700,
  classicWinFlashMs: 1400,
  classicBigWinFlashMs: 2400,
  coinBurstMs: 1200,
  winCountMs: 900,
};

const MOBILE_UI_PACE: SlotUiPace = {
  winFlashMs: 2800,
  freeSpinCelebrationMs: 4000,
  autoFreeSpinDelayMs: 1600,
  classicWinFlashMs: 2400,
  classicBigWinFlashMs: 3600,
  coinBurstMs: 2000,
  winCountMs: 1500,
};

export function getSlotUiPace(isMobile: boolean): SlotUiPace {
  return isMobile ? MOBILE_UI_PACE : DESKTOP_UI_PACE;
}

export function minReelTotalSpinMs(mobile = false): number {
  return mobile
    ? MOBILE_REEL_PACE.minTotalSpinMs
    : DESKTOP_REEL_PACE.minTotalSpinMs;
}
