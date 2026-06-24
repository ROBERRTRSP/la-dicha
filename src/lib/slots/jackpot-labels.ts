export const JACKPOT_TIER_LABELS: Record<string, string> = {
  MINOR: "Premio menor",
  MAJOR: "Premio mayor",
  GRAND: "Gran premio",
};

export function formatJackpotMessage(tier: string): string {
  const label = JACKPOT_TIER_LABELS[tier] ?? `Premio ${tier}`;
  return `¡${label}!`;
}

export function formatJackpotBanner(tier: string): string {
  const label = JACKPOT_TIER_LABELS[tier];
  if (label) return label.toUpperCase();
  return `PREMIO ${tier}`;
}
