export const ROULETTE_SPIN_RECOVERY_KEY = "la_dicha_roulette_spin_recovery";

export type RouletteSpinRecovery = {
  balanceAfter: number;
  winningNumber: number;
  anyWon: boolean;
  totalPayout: number;
  savedAt: number;
};

export function saveSpinRecovery(data: Omit<RouletteSpinRecovery, "savedAt">) {
  if (typeof sessionStorage === "undefined") return;
  const payload: RouletteSpinRecovery = { ...data, savedAt: Date.now() };
  sessionStorage.setItem(ROULETTE_SPIN_RECOVERY_KEY, JSON.stringify(payload));
}

export function consumeSpinRecovery(): RouletteSpinRecovery | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(ROULETTE_SPIN_RECOVERY_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(ROULETTE_SPIN_RECOVERY_KEY);
  try {
    const data = JSON.parse(raw) as RouletteSpinRecovery;
    if (Date.now() - data.savedAt > 120_000) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSpinRecovery() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(ROULETTE_SPIN_RECOVERY_KEY);
}
