import { prisma } from "./db";
import type { RoulettePayoutMultipliers } from "./roulette-payouts";
import { calcBetPayout } from "./roulette-payouts";
import { formatMoney } from "./utils";

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

export function calcPayout(
  betType: RouletteBetType,
  amount: number,
  won: boolean,
  multipliers: RoulettePayoutMultipliers
): number {
  return calcBetPayout(betType, amount, won, multipliers);
}

export function numberColor(n: number): "green" | "red" | "black" {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

export const DEFAULT_HOUSE_EDGE = 0.08;

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

export async function isRouletteActive(): Promise<boolean> {
  const { getRouletteSettings } = await import("./roulette-settings");
  const { getRoulettePlayWindow } = await import("./roulette-daily");
  const settings = await getRouletteSettings();
  const window = await getRoulettePlayWindow(settings);
  return window.open;
}

export type RouletteSpinResult = {
  bets: {
    id: string;
    betType: string;
    betChoice: string;
    amount: number;
    won: boolean;
    payout: number;
    profit: number;
  }[];
  winningNumber: number;
  color: string;
  balanceAfter: number;
  totalStake: number;
  totalPayout: number;
  totalProfit: number;
  wonCount: number;
  betCount: number;
  anyWon: boolean;
  usedFreeSpin: boolean;
  cashbackAmount: number;
  promoMessage: string | null;
  fairPlay: boolean;
  houseEdge: number;
};

export async function placeRouletteBets(
  userId: string,
  rawBody: unknown
): Promise<RouletteSpinResult> {
  const { getRouletteSettings, resolvePlayerSettings } = await import(
    "./roulette-settings"
  );
  const { getEffectiveRouletteSettings } = await import("./roulette-bankroll");
  const { validateBetsRisk } = await import("./roulette-risk");
  const {
    getRoulettePlayWindow,
    recordSpinOnDailySession,
  } = await import("./roulette-daily");
  const { normalizeRouletteBets, parseRouletteBetsPayload } = await import(
    "./roulette-validation"
  );
  const {
    beginSpinIdempotency,
    extractIdempotencyKey,
    releaseSpinIdempotency,
    saveSpinResponse,
  } = await import("./roulette-idempotency");
  const {
    consumeFreeSpinInTx,
    applyCashbackOnLoss,
    positiveOutcomeMessage,
  } = await import("./roulette-promotions");
  const { spinWinningNumber, newRouletteSpinId } = await import("./roulette-random");
  const { computeBetSplit, collectSpinSplitInTx, poolDateKey } = await import(
    "./roulette-reward-pool"
  );

  const settings = await getRouletteSettings();
  const playWindow = await getRoulettePlayWindow(settings);
  if (!playWindow.open) {
    throw new Error(playWindow.reason ?? "La Ruleta no está disponible.");
  }

  const rouletteCtx = await getEffectiveRouletteSettings();
  const playerSettings = resolvePlayerSettings(rouletteCtx.effective);
  const payoutMultipliers = settings.payoutMultipliers;

  const idempotencyKey = extractIdempotencyKey(rawBody);
  if (idempotencyKey) {
    const { cached } = await beginSpinIdempotency(userId, idempotencyKey);
    if (cached) return cached as RouletteSpinResult;
  }

  try {
  const rawList = parseRouletteBetsPayload(rawBody);
  const bets = normalizeRouletteBets(rawList, playerSettings);
  const risk = validateBetsRisk(
    bets,
    { ...playerSettings, houseAlwaysWins: settings.houseAlwaysWins },
    payoutMultipliers,
    rouletteCtx.bankroll
  );
  if (!risk.ok) throw new Error(risk.message);

  const totalStake = bets.reduce((sum, b) => sum + b.amount, 0);

  const txResult = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error("Cuenta sin billetera.");

    const { useFreeSpin, stakeToCharge } = await consumeFreeSpinInTx(
      tx,
      userId,
      settings,
      totalStake
    );

    if (stakeToCharge > wallet.balance) {
      throw new Error("Saldo insuficiente para estas apuestas.");
    }

    const winningNumber = spinWinningNumber();
    const spinId = newRouletteSpinId();
    const color = numberColor(winningNumber);

    let outcomes = bets.map((bet) => {
      const won = isBetWinner(bet.betType, bet.betChoice, winningNumber);
      const payout = calcPayout(bet.betType, bet.amount, won, payoutMultipliers);
      return {
        ...bet,
        won,
        payout,
        profit: payout - bet.amount,
        result: won ? ("WIN" as const) : ("LOSE" as const),
      };
    });

    let totalPayout = outcomes.reduce((sum, o) => sum + o.payout, 0);
    let dailyCapMessage: string | null = null;

    const { applyDailyPayoutCapInTx } = await import("./roulette-daily-payout");
    const capped = await applyDailyPayoutCapInTx(
      tx,
      userId,
      settings.maxDailyPayoutPerPlayer,
      outcomes
    );
    if (capped) {
      outcomes = capped.outcomes;
      totalPayout = capped.totalPayout;
      dailyCapMessage = capped.message;
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - stakeToCharge + totalPayout;
    const netChange = balanceAfter - balanceBefore;

    const updated = await tx.wallet.updateMany({
      where: {
        id: wallet.id,
        balance: { gte: stakeToCharge },
      },
      data: { balance: balanceAfter },
    });
    if (updated.count === 0) {
      throw new Error(
        "Saldo insuficiente. Tu saldo cambió; revisa e intenta de nuevo."
      );
    }

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: netChange >= 0 ? "ROULETTE_WIN" : "ROULETTE_BET",
        amount: netChange,
        balanceBefore,
        balanceAfter,
        note: `Ruleta ${bets.length} apuesta(s) → ${winningNumber}${useFreeSpin ? " (giro gratis)" : ""}${dailyCapMessage ? " · tope diario" : ""}`,
      },
    });

    const poolDate = poolDateKey();
    const spinSplit = { houseFee: 0, promoContribution: 0, mainPoolContribution: 0 };

    let runningBalance = balanceBefore;
    const created = [];
    for (const outcome of outcomes) {
      const betBalanceAfter = runningBalance - outcome.amount + outcome.payout;
      const split = computeBetSplit(outcome.amount, settings);
      spinSplit.houseFee += split.houseFee;
      spinSplit.promoContribution += split.promoContribution;
      spinSplit.mainPoolContribution += split.mainPoolContribution;
      const bet = await tx.rouletteBet.create({
        data: {
          userId,
          spinId,
          betType: outcome.betType,
          betChoice: outcome.betChoice,
          amount: outcome.amount,
          winningNumber,
          payout: outcome.payout,
          profit: outcome.profit,
          balanceBefore: runningBalance,
          balanceAfter: betBalanceAfter,
          result: outcome.result,
          houseFee: split.houseFee,
          promoContribution: split.promoContribution,
          mainPoolContribution: split.mainPoolContribution,
          poolDate,
        },
      });
      created.push(bet);
      runningBalance = betBalanceAfter;
    }

    await collectSpinSplitInTx(tx, {
      settings,
      split: spinSplit,
      spinId,
      poolDate,
    });

    return {
      savedBets: created,
      winningNumber,
      color,
      outcomes,
      balanceBefore,
      balanceAfter,
      totalPayout,
      totalStake,
      useFreeSpin,
      stakeToCharge,
      dailyCapMessage,
    };
  });

  const wonCount = txResult.outcomes.filter((o) => o.won).length;
  const anyWon = wonCount > 0;
  let balanceAfter = txResult.balanceAfter;
  const stakeToCharge = txResult.stakeToCharge;

  let cashbackAmount = 0;
  // El cashback inmediato (financiado por la casa) solo aplica cuando el sistema
  // de premios del pozo está INACTIVO. Con el pozo activo, el cashback se reparte
  // desde el pozo promocional vía el job programado (no con dinero de la casa).
  if (
    !anyWon &&
    stakeToCharge > 0 &&
    !settings.houseAlwaysWins &&
    !settings.rewardSystemActive
  ) {
    cashbackAmount = await applyCashbackOnLoss(userId, settings, stakeToCharge);
    if (cashbackAmount > 0) {
      balanceAfter += cashbackAmount;
    }
  }

  const promoMessage =
    txResult.dailyCapMessage ??
    positiveOutcomeMessage(anyWon, settings, cashbackAmount);

  const response = {
    bets: txResult.outcomes.map((outcome, i) => ({
      id: txResult.savedBets[i].id,
      betType: outcome.betType,
      betChoice: outcome.betChoice,
      amount: outcome.amount,
      won: outcome.won,
      payout: outcome.payout,
      profit: outcome.profit,
    })),
    winningNumber: txResult.winningNumber,
    color: txResult.color,
    balanceAfter,
    totalStake: txResult.totalStake,
    totalPayout: txResult.totalPayout,
    totalProfit: txResult.totalPayout - stakeToCharge + cashbackAmount,
    wonCount,
    betCount: txResult.outcomes.length,
    anyWon,
    usedFreeSpin: txResult.useFreeSpin,
    cashbackAmount,
    promoMessage,
    fairPlay: !settings.houseAlwaysWins,
    houseEdge: settings.houseEdge,
  };

  if (idempotencyKey) {
    await saveSpinResponse(userId, idempotencyKey, response);
  }

  await recordSpinOnDailySession(
    playWindow.sessionDate,
    stakeToCharge,
    txResult.totalPayout
  );

  if (settings.rewardSystemActive) {
    const { maybeRunRewardsAfterSpin } = await import("./roulette-rewards");
    await maybeRunRewardsAfterSpin();
  }

  return response;
  } catch (e) {
    if (idempotencyKey) {
      await releaseSpinIdempotency(userId, idempotencyKey);
    }
    throw e;
  }
}

/** Un registro por giro (agrupa apuestas múltiples del mismo spinId) */
export async function getRouletteHistory(userId: string, limit = 15) {
  const bets = await prisma.rouletteBet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit * 10,
  });

  type SpinSummary = (typeof bets)[0] & { amount: number };
  const spins: SpinSummary[] = [];
  const seenSpinIds = new Set<string>();

  for (const bet of bets) {
    if (bet.spinId) {
      if (seenSpinIds.has(bet.spinId)) continue;
      seenSpinIds.add(bet.spinId);
      const spinBets = bets.filter((b) => b.spinId === bet.spinId);
      const totalStake = spinBets.reduce((s, b) => s + b.amount, 0);
      const anyWin = spinBets.some((b) => b.result === "WIN");
      spins.push({
        ...bet,
        amount: totalStake,
        result: anyWin ? "WIN" : "LOSE",
      });
    } else {
      const prev = spins[spins.length - 1];
      if (
        prev &&
        prev.winningNumber === bet.winningNumber &&
        Math.abs(prev.createdAt.getTime() - bet.createdAt.getTime()) < 4000
      ) {
        continue;
      }
      spins.push(bet);
    }
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
  const { getEffectiveRouletteSettings } = await import("./roulette-bankroll");
  const { effectiveMaxSpinExposure } = await import("./roulette-settings");
  const { maxAllowedRisk } = await import("./roulette-risk");

  const { weekStartInTz, dayStartInTz, dateKeyInTz, nowInTz } = await import("./timezone");
  const { ensureTodayRouletteSession, getDaySession } = await import("./roulette-daily");
  const weekStart = weekStartInTz();
  const dayStart = dayStartInTz(nowInTz());
  const todayKey = dateKeyInTz(nowInTz());

  const [bets, agg, dailyAgg, rouletteCtx, rankings, dailySession] = await Promise.all([
    prisma.rouletteBet.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { username: true, fullName: true } } },
      take: 200,
    }),
    prisma.rouletteBet.aggregate({
      where: { createdAt: { gte: weekStart } },
      _sum: { amount: true, payout: true },
      _count: true,
    }),
    prisma.rouletteBet.aggregate({
      where: { createdAt: { gte: dayStart } },
      _sum: { amount: true, payout: true },
      _count: true,
    }),
    getEffectiveRouletteSettings(),
    getPlayerRankings(8),
    ensureTodayRouletteSession().catch(() => getDaySession(todayKey)),
  ]);

  const { settings, effective, bankroll, dynamicLimits } = rouletteCtx;
  const unlimitedPlayerMode = (await import("./roulette-settings")).isUnlimitedPlayerMode(
    settings
  );

  const totalBet = agg._sum.amount ?? 0;
  const totalPaid = agg._sum.payout ?? 0;
  const houseProfit = totalBet - totalPaid;
  const rtp = calcRtp(totalBet, totalPaid);
  const houseEdge = calcHouseEdge(rtp);

  const recentForExposure = bets.slice(0, 50);
  const exposure = buildExposureFromBets(
    recentForExposure,
    settings.payoutMultipliers
  );

  const riskAlerts: string[] = [];
  const spinCap = effectiveMaxSpinExposure(effective);
  const allowedRisk = maxAllowedRisk(effective, bankroll);
  const expectedHouseProfit = totalBet * settings.houseEdge;

  if (exposure.byNumber) {
    const hot = Object.entries(exposure.byNumber)
      .map(([n, p]) => ({ n: Number(n), p }))
      .filter((x) => x.p > 0)
      .sort((a, b) => b.p - a.p)
      .slice(0, 3);

    if (
      !unlimitedPlayerMode &&
      settings.maxExposurePerNumber > 0 &&
      effective.maxExposurePerNumber > 0
    ) {
      for (const h of hot) {
        if (h.p >= effective.maxExposurePerNumber * 0.9) {
          riskAlerts.push(
            `Número ${h.n} cerca del límite de exposición (${formatMoney(h.p)}).`
          );
        }
      }
    } else if (unlimitedPlayerMode && hot.length > 0 && hot[0].p >= 100) {
      riskAlerts.push(
        `Monitoreo: Nº ${hot[0].n} con pago posible ${formatMoney(hot[0].p)} (últimas 50 jugadas).`
      );
    }
  }

  if (
    !unlimitedPlayerMode &&
    bankroll.currentBankroll < bankroll.initialReserve * 0.75
  ) {
    riskAlerts.push(
      `Fondo dinámico bajo (${formatMoney(bankroll.currentBankroll)}). Los límites de apuesta están reducidos.`
    );
  }
  if (rtp > 1 && totalBet > 100) {
    riskAlerts.push("RTP real supera 100% — revisar volumen reciente.");
  }
  if (houseProfit < 0 && totalBet > 500) {
    riskAlerts.push("Ganancia neta negativa en el periodo acumulado.");
  }
  if (bankroll.currentBankroll < totalPaid * 0.1 && totalPaid > 100) {
    riskAlerts.push("Fondo dinámico bajo respecto a pagos recientes.");
  }

  const topNumbers = Object.entries(exposure.byNumber)
    .map(([n, p]) => ({ number: Number(n), exposure: p }))
    .filter((x) => x.exposure > 0)
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 10);

  const dailyTotalBet = dailyAgg._sum.amount ?? 0;
  const dailyTotalPaid = dailyAgg._sum.payout ?? 0;
  const dailyHouseProfit = dailyTotalBet - dailyTotalPaid;

  return {
    bets,
    totalBet,
    totalPaid,
    houseProfit,
    totalSpins: agg._count,
    weekStart: weekStart.toISOString(),
    daily: {
      sessionDate: todayKey,
      session: dailySession,
      totalBet: dailyTotalBet,
      totalPaid: dailyTotalPaid,
      houseProfit: dailyHouseProfit,
      totalSpins: dailyAgg._count,
      rtp: calcRtp(dailyTotalBet, dailyTotalPaid),
    },
    rtp,
    houseEdge,
    theoreticalHouseEdge: settings.houseEdge,
    configuredPlayerRtp: settings.playerRtp,
    expectedHouseProfit,
    maxAllowedRisk: Number.isFinite(allowedRisk) ? allowedRisk : null,
    currentSpinExposure: exposure.byNumber
      ? Math.max(...Object.values(exposure.byNumber), 0)
      : 0,
    exposure,
    topNumbers,
    rankings,
    riskAlerts,
    settings,
    effectiveLimits: effective,
    bankroll,
    dynamicLimits,
    unlimitedPlayerMode,
    limits: {
      effectiveMaxSpinExposure: spinCap,
    },
  };
}
