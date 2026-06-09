import { WHEEL_ORDER, wheelIndexForNumber } from "./roulette";

export const SEGMENT_COUNT = WHEEL_ORDER.length;
export const DEG_PER_SEGMENT = 360 / SEGMENT_COUNT;

export type SpinAnimation = {
  wheelFinal: number;
  ballStart: number;
  ballFinal: number;
  durationMs: number;
  winningIndex: number;
};

export function computeSpinAnimation(
  targetNumber: number,
  prevWheelRotation: number
): SpinAnimation {
  const winningIndex = Math.max(0, wheelIndexForNumber(targetNumber));
  const segmentAngle = winningIndex * DEG_PER_SEGMENT + DEG_PER_SEGMENT / 2;
  const wheelSpins = 4 + Math.floor(Math.random() * 3);
  const normalized = prevWheelRotation % 360;
  const wheelFinal =
    prevWheelRotation -
    normalized +
    wheelSpins * 360 +
    (360 - segmentAngle);

  const ballSpins = 6 + Math.floor(Math.random() * 4);
  const ballStart = -(ballSpins * 360 + Math.random() * 180);
  const ballFinal = 0;
  const durationMs = 4500 + Math.floor(Math.random() * 2000);

  return {
    wheelFinal,
    ballStart,
    ballFinal,
    durationMs,
    winningIndex,
  };
}
