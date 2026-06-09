import { prisma } from "./db";

/** Orden físico de la ruleta europea (para animación) */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export type RouletteBetType =
  | "STRAIGHT"
  | "RED"
  | "BLACK"
  | "EVEN"
  | "ODD"
  | "LOW"
  | "HIGH"
  | "DOZEN_1"
  | "DOZEN_2"
  | "DOZEN_3"
  | "COLUMN_1"
  | "COLUMN_2"
  | "COLUMN_3";

export const BET_TYPE_LABELS: Record<RouletteBetType, string> = {
  STRAIGHT: "Número directo",
  RED: "Rojo",
  BLACK: "Negro",
  EVEN: "Par",
  ODD: "Impar",
  LOW: "Bajo (1-18)",
  HIGH: "Alto (19-36)",
  DOZEN_1: "1ra docena (1-12)",
  DOZEN_2: "2da docena (13-24)",
  DOZEN_3: "3ra docena (25-36)",
  COLUMN_1: "Columna 1",
  COLUMN_2: "Columna 2",
  COLUMN_3: "Columna 3",
};

const PAYOUT_MULTIPLIER: Record<RouletteBetType, number> = {
  STRAIGHT: 35,
  RED: 1,
  BLACK: 1,
  EVEN: 1,
  ODD: 1,
  LOW: 1,
  HIGH: 1,
  DOZEN_1: 2,
  DOZEN_2: 2,
  DOZEN_3: 2,
  COLUMN_1: 2,
  COLUMN_2: 2,
  COLUMN_3: 2,
};

export function numberColor(n: number): "green" | "red" | "black" {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

/** Resultado aleatorio justo — ruleta europea 0–36, sin manipulación */
export function spinWinningNumber(): number {
  const buf = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
    return buf[0] % 37;
  }
  return Math.floor(Math.random() * 37);
}

export const EUROPEAN_HOUSE_EDGE = 0.027;

export function wheelIndexForNumber(n: number): number {
  return WHEEL_ORDER.indexOf(n as (typeof WHEEL_ORDER)[number]);
}

function isInColumn(n: number, col: 1 | 2 | 3): boolean {
  if (n === 0) return false;
  return n % 3 === (col === 3 ? 0 : col);
}

export type RouletteBetInput = {
  betType: RouletteBetType;
  betChoice: string;
  amount: number;
};

export function normalizeBetChoice(
  betType: RouletteBetType,
  betChoice: string
): string {
  return betType === "STRAIGHT" ? betChoice : betType;
}

export function betSelectionKey(
  betType: RouletteBetType,
  betChoice: string
): string {
  if (betType === "STRAIGHT") return `STRAIGHT:${betChoice}`;
  return betType;
}

export function formatBetLabel(betType: RouletteBetType, betChoice: string): string {
  if (betType === "STRAIGHT") {
    return `${BET_TYPE_LABELS.STRAIGHT} · ${betChoice}`;
  }
  return BET_TYPE_LABELS[betType];
}

export function validateBetInput(
  betType: string,
  betChoice: string,
  amount: number
): string | null {
  if (!Object.keys(BET_TYPE_LABELS).includes(betType)) {
    return "Tipo de apuesta inválido.";
  }
  if (!amount || amount <= 0) return "Ingresa un monto mayor a $0.";
  if (betType === "STRAIGHT") {
    const num = parseInt(betChoice, 10);
    if (Number.isNaN(num) || num < 0 || num > 36) {
      return "Elige un número del 0 al 36.";
    }
  }
  return null;
}

export function isBetWinner(
  betType: RouletteBetType,
  betChoice: string,
  winning: number
): boolean {
  switch (betType) {
    case "STRAIGHT":
      return winning === parseInt(betChoice, 10);
    case "RED":
      return winning !== 0 && RED_NUMBERS.has(winning);
    case "BLACK":
      return winning !== 0 && !RED_NUMBERS.has(winning);
    case "EVEN":
      return winning !== 0 && winning % 2 === 0;
    case "ODD":
      return winning !== 0 && winning % 2 === 1;
    case "LOW":
      return winning >= 1 && winning <= 18;
    case "HIGH":
      return winning >= 19 && winning <= 36;
    case "DOZEN_1":
      return winning >= 1 && winning <= 12;
    case "DOZEN_2":
      return winning >= 13 && winning <= 24;
    case "DOZEN_3":
      return winning >= 25 && winning <= 36;
    case "COLUMN_1":
      return isInColumn(winning, 1);
    case "COLUMN_2":
      return isInColumn(winning, 2);
    case "COLUMN_3":
      return isInColumn(winning, 3);
    default:
      return false;
  }
}

export function calcPayout(
  betType: RouletteBetType,
  amount: number,
  won: boolean
): number {
  if (!won) return 0;
  return amount + amount * PAYOUT_MULTIPLIER[betType];
}

export async function isRouletteActive(): Promise<boolean> {
  const { getRouletteSettings } = await import("./roulette-settings");
  const settings = await getRouletteSettings();
  return settings.active;
}

export async function placeRouletteBets(
  userId: string,
  rawBets: RouletteBetInput[]
) {
  const { getRouletteSettings } = await import("./roulette-settings");
  const { validateBetsRisk } = await import("./roulette-risk");
  const { getPlayerDailyPayout } = await import("./roulette-stats");
  const {
    applyWelcomeAndTrialCredits,
    resolveFreeSpin,
    applyCashbackOnLoss,
    positiveOutcomeMessage,
  } = await import("./roulette-promotions");

  const settings = await getRouletteSettings();
  if (!settings.active) {
    throw new Error("La Ruleta está desactivada temporalmente.");
  }

  if (!rawBets.length) {
    throw new Error("Selecciona al menos una apuesta.");
  }

  const seen = new Set<string>();
  const bets: RouletteBetInput[] = [];
  for (const raw of rawBets) {
    const err = validateBetInput(raw.betType, raw.betChoice, raw.amount);
    if (err) throw new Error(err);
    const key = betSelectionKey(raw.betType, raw.betChoice);
    if (seen.has(key)) {
      throw new Error("Apuesta duplicada en la misma jugada.");
    }
    seen.add(key);
    bets.push({
      betType: raw.betType,
      betChoice: normalizeBetChoice(raw.betType, raw.betChoice),
      amount: raw.amount,
    });
  }

  const dailyPayout = await getPlayerDailyPayout(userId);
  const risk = validateBetsRisk(bets, settings, dailyPayout);
  if (!risk.ok) throw new Error(risk.message);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });
  if (!user?.wallet) throw new Error("Cuenta sin billetera.");

  const totalStake = bets.reduce((sum, b) => sum + b.amount, 0);
  const { useFreeSpin, stakeToCharge } = await resolveFreeSpin(
    userId,
    settings,
    totalStake
  );

  if (stakeToCharge > user.wallet.balance) {
    throw new Error("Saldo insuficiente para estas apuestas.");
  }

  const winningNumber = spinWinningNumber();
  const color = numberColor(winningNumber);

  const outcomes = bets.map((bet) => {
    const won = isBetWinner(bet.betType, bet.betChoice, winningNumber);
    const payout = calcPayout(bet.betType, bet.amount, won);
    return {
      ...bet,
      won,
      payout,
      profit: payout - bet.amount,
      result: won ? ("WIN" as const) : ("LOSE" as const),
    };
  });

  const totalPayout = outcomes.reduce((sum, o) => sum + o.payout, 0);
  const balanceBefore = user.wallet.balance;
  let balanceAfter = balanceBefore - stakeToCharge + totalPayout;
  const netChange = balanceAfter - balanceBefore;
  const wonCount = outcomes.filter((o) => o.won).length;
  const anyWon = wonCount > 0;

  const savedBets = await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: user.wallet!.id },
      data: { balance: balanceAfter },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: user.wallet!.id,
        type: netChange >= 0 ? "ROULETTE_WIN" : "ROULETTE_BET",
        amount: netChange,
        balanceBefore,
        balanceAfter,
        note: `Ruleta ${bets.length} apuesta(s) → ${winningNumber}${useFreeSpin ? " (giro gratis)" : ""}`,
      },
    });

    let runningBalance = balanceBefore;
    const created = [];
    for (const outcome of outcomes) {
      const betBalanceAfter = runningBalance - outcome.amount + outcome.payout;
      const bet = await tx.rouletteBet.create({
        data: {
          userId,
          betType: outcome.betType,
          betChoice: outcome.betChoice,
          amount: outcome.amount,
          winningNumber,
          payout: outcome.payout,
          profit: outcome.profit,
          balanceBefore: runningBalance,
          balanceAfter: betBalanceAfter,
          result: outcome.result,
        },
      });
      created.push(bet);
      runningBalance = betBalanceAfter;
    }
    return created;
  });

  let cashbackAmount = 0;
  if (!anyWon && stakeToCharge > 0) {
    cashbackAmount = await applyCashbackOnLoss(userId, settings, stakeToCharge);
    if (cashbackAmount > 0) {
      balanceAfter += cashbackAmount;
    }
  }

  const promoMessage = positiveOutcomeMessage(anyWon, settings, cashbackAmount);

  return {
    bets: outcomes.map((outcome, i) => ({
      id: savedBets[i].id,
      betType: outcome.betType,
      betChoice: outcome.betChoice,
      amount: outcome.amount,
      won: outcome.won,
      payout: outcome.payout,
      profit: outcome.profit,
    })),
    winningNumber,
    color,
    balanceAfter,
    totalStake,
    totalPayout,
    totalProfit: totalPayout - stakeToCharge + cashbackAmount,
    wonCount,
    betCount: outcomes.length,
    anyWon,
    usedFreeSpin: useFreeSpin,
    cashbackAmount,
    promoMessage,
    fairPlay: true,
  };
}

/** Un registro por giro (agrupa apuestas múltiples del mismo spin) */
export async function getRouletteHistory(userId: string, limit = 15) {
  const bets = await prisma.rouletteBet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit * 8,
  });

  const spins: typeof bets = [];
  for (const bet of bets) {
    const prev = spins[spins.length - 1];
    if (
      prev &&
      prev.winningNumber === bet.winningNumber &&
      Math.abs(prev.createdAt.getTime() - bet.createdAt.getTime()) < 4000
    ) {
      continue;
    }
    spins.push(bet);
    if (spins.length >= limit) break;
  }
  return spins;
}

export async function getRouletteAdminStats() {
  const {
    buildExposureFromBets,
    calcRtp,
    calcHouseEdge,
    getPlayerRankings,
  } = await import("./roulette-stats");
  const { getRouletteSettings, effectiveMaxSpinExposure, maxRiskFromReserve } =
    await import("./roulette-settings");

  const [bets, agg, settings, rankings] = await Promise.all([
    prisma.rouletteBet.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, fullName: true } } },
      take: 200,
    }),
    prisma.rouletteBet.aggregate({
      _sum: { amount: true, payout: true },
      _count: true,
    }),
    getRouletteSettings(),
    getPlayerRankings(8),
  ]);

  const totalBet = agg._sum.amount ?? 0;
  const totalPaid = agg._sum.payout ?? 0;
  const houseProfit = totalBet - totalPaid;
  const rtp = calcRtp(totalBet, totalPaid);
  const houseEdge = calcHouseEdge(rtp);

  const recentForExposure = bets.slice(0, 50);
  const exposure = buildExposureFromBets(recentForExposure);

  const riskAlerts: string[] = [];
  const spinCap = effectiveMaxSpinExposure(settings);
  if (exposure.byNumber) {
    const hot = Object.entries(exposure.byNumber)
      .map(([n, p]) => ({ n: Number(n), p }))
      .filter((x) => x.p > settings.maxExposurePerNumber * 0.8)
      .sort((a, b) => b.p - a.p)
      .slice(0, 3);
    for (const h of hot) {
      if (h.p >= settings.maxExposurePerNumber * 0.9) {
        riskAlerts.push(
          `Número ${h.n} cerca del límite de exposición (RD$${h.p.toFixed(2)}).`
        );
      }
    }
  }
  if (rtp > 1 && totalBet > 100) {
    riskAlerts.push("RTP real supera 100% — revisar volumen reciente.");
  }
  if (houseProfit < 0 && totalBet > 500) {
    riskAlerts.push("Ganancia neta negativa en el periodo acumulado.");
  }
  if (settings.houseReserve < totalPaid * 0.1) {
    riskAlerts.push("Reserva de casa baja respecto a pagos históricos.");
  }

  const topNumbers = Object.entries(exposure.byNumber)
    .map(([n, p]) => ({ number: Number(n), exposure: p }))
    .filter((x) => x.exposure > 0)
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 10);

  return {
    bets,
    totalBet,
    totalPaid,
    houseProfit,
    totalSpins: agg._count,
    rtp,
    houseEdge,
    theoreticalHouseEdge: EUROPEAN_HOUSE_EDGE,
    exposure,
    topNumbers,
    rankings,
    riskAlerts,
    settings,
    limits: {
      effectiveMaxSpinExposure: spinCap,
      maxRiskFromReserve: maxRiskFromReserve(settings),
    },
  };
}
