export const AUTO_FREE_SPIN_EVERY_PAID_SPINS = 4;

export type AutoFreeSpinProgress = {
  paidTotal: number;
  current: number;
  target: number;
  remaining: number;
};

/** Progreso hacia el próximo giro gratis automático (cada N giros pagados). */
export function computeAutoFreeSpinProgress(
  paidSpinsCount: number
): AutoFreeSpinProgress {
  const target = AUTO_FREE_SPIN_EVERY_PAID_SPINS;
  const current = paidSpinsCount % target;
  let remaining: number;
  if (paidSpinsCount === 0) {
    remaining = target;
  } else if (current === 0) {
    remaining = 0;
  } else {
    remaining = target - current;
  }
  return { paidTotal: paidSpinsCount, current, target, remaining };
}
