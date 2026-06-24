type BetRow = {
  id: string;
  spinId: string | null;
  userId: string;
  betType: string;
  betChoice: string;
  amount: number;
  winningNumber: number;
  payout: number;
  profit: number;
  result: string;
  createdAt: Date | string;
};

export type GroupedRouletteSpin<T extends BetRow> = {
  key: string;
  spinId: string | null;
  winningNumber: number;
  createdAt: string;
  betCount: number;
  totalStake: number;
  totalPayout: number;
  totalProfit: number;
  wonCount: number;
  result: "WIN" | "LOSE" | "MIXED";
  /** Giros viejos con houseAlwaysWins (número 0 forzado). */
  legacyManipulated: boolean;
  bets: T[];
};

function spinGroupKey(bet: BetRow): string {
  if (bet.spinId) return bet.spinId;
  const t = new Date(bet.createdAt).getTime();
  const bucket = Math.floor(t / 4000);
  return `${bet.userId}-${bet.winningNumber}-${bucket}`;
}

function isLegacyManipulatedZero(bets: BetRow[]): boolean {
  if (bets.length === 0 || bets[0].winningNumber !== 0) return false;
  const types = new Set(bets.map((b) => b.betType));
  return types.has("RED") && types.has("BLACK");
}

export function groupBetsBySpin<T extends BetRow>(
  rows: T[],
  spinLimit: number
): GroupedRouletteSpin<T>[] {
  const groups = new Map<string, T[]>();

  for (const bet of rows) {
    const key = spinGroupKey(bet);
    const list = groups.get(key);
    if (list) list.push(bet);
    else groups.set(key, [bet]);
  }

  const spins: GroupedRouletteSpin<T>[] = [];

  for (const [key, bets] of groups) {
    bets.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const first = bets[0];
    const wonCount = bets.filter((b) => b.result === "WIN").length;
    const totalStake = bets.reduce((s, b) => s + b.amount, 0);
    const totalPayout = bets.reduce((s, b) => s + b.payout, 0);
    const totalProfit = bets.reduce((s, b) => s + b.profit, 0);

    spins.push({
      key,
      spinId: first.spinId,
      winningNumber: first.winningNumber,
      createdAt:
        typeof first.createdAt === "string"
          ? first.createdAt
          : first.createdAt.toISOString(),
      betCount: bets.length,
      totalStake,
      totalPayout,
      totalProfit,
      wonCount,
      result:
        wonCount === 0 ? "LOSE" : wonCount === bets.length ? "WIN" : "MIXED",
      legacyManipulated: isLegacyManipulatedZero(bets),
      bets,
    });
  }

  spins.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return spins.slice(0, spinLimit);
}

export function summarizeSpinBets(
  bets: Pick<BetRow, "betType" | "betChoice">[],
  maxItems = 3
): string {
  const labels = bets.map((b) =>
    b.betType === "STRAIGHT" ? `#${b.betChoice}` : b.betType
  );
  if (labels.length <= maxItems) return labels.join(", ");
  return `${labels.slice(0, maxItems).join(", ")} +${labels.length - maxItems}`;
}
