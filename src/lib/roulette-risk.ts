import {
  calcPayout,
  formatBetLabel,
  isBetWinner,
  numberColor,
  type RouletteBetInput,
  type RouletteBetType,
} from "./roulette";
import {
  effectiveMaxSpinExposure,
  type RouletteSettingsData,
} from "./roulette-settings";

export type SpinExposure = {
  byNumber: Record<number, number>;
  byColor: { red: number; black: number; green: number };
  byBetType: Record<string, number>;
  maxPayout: number;
  worstNumber: number;
  totalStake: number;
};

export function payoutIfNumberWins(
  bets: RouletteBetInput[],
  winningNumber: number
): number {
  return bets.reduce((sum, bet) => {
    const won = isBetWinner(bet.betType, bet.betChoice, winningNumber);
    return sum + calcPayout(bet.betType, bet.amount, won);
  }, 0);
}

export function calculateSpinExposure(bets: RouletteBetInput[]): SpinExposure {
  const byNumber: Record<number, number> = {};
  let maxPayout = 0;
  let worstNumber = 0;

  for (let n = 0; n <= 36; n++) {
    const payout = payoutIfNumberWins(bets, n);
    byNumber[n] = payout;
    if (payout > maxPayout) {
      maxPayout = payout;
      worstNumber = n;
    }
  }

  const byColor = { red: 0, black: 0, green: 0 };
  for (let n = 0; n <= 36; n++) {
    const c = numberColor(n);
    byColor[c] = Math.max(byColor[c], byNumber[n]);
  }

  const byBetType: Record<string, number> = {};
  for (const bet of bets) {
    let maxForBet = 0;
    for (let n = 0; n <= 36; n++) {
      const won = isBetWinner(bet.betType, bet.betChoice, n);
      const p = calcPayout(bet.betType, bet.amount, won);
      if (p > maxForBet) maxForBet = p;
    }
    byBetType[bet.betType] = (byBetType[bet.betType] ?? 0) + maxForBet;
  }

  return {
    byNumber,
    byColor,
    byBetType,
    maxPayout,
    worstNumber,
    totalStake: bets.reduce((s, b) => s + b.amount, 0),
  };
}

function maxBetForType(
  betType: RouletteBetType,
  settings: RouletteSettingsData
): number {
  return betType === "STRAIGHT"
    ? settings.maxStraightBet
    : settings.maxOutsideBet;
}

export type RiskCheckResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateBetsRisk(
  bets: RouletteBetInput[],
  settings: RouletteSettingsData,
  playerDailyPayout: number
): RiskCheckResult {
  if (!bets.length) {
    return { ok: false, message: "Selecciona al menos una apuesta." };
  }

  for (const bet of bets) {
    if (bet.amount < settings.minBetAmount) {
      return {
        ok: false,
        message: `El monto mínimo por apuesta es RD$${settings.minBetAmount.toFixed(2)}.`,
      };
    }
    if (bet.amount > settings.maxBetAmount) {
      return {
        ok: false,
        message: "Reduce el monto para continuar.",
      };
    }

    const typeMax = maxBetForType(bet.betType, settings);
    if (bet.amount > typeMax) {
      return {
        ok: false,
        message: "Monto máximo permitido para esta apuesta alcanzado.",
      };
    }
  }

  const exposure = calculateSpinExposure(bets);

  if (exposure.maxPayout > settings.maxPayoutPerSpin) {
    return {
      ok: false,
      message:
        "Esta apuesta supera el límite permitido. Reduce el monto o elige otra opción.",
    };
  }

  const spinCap = effectiveMaxSpinExposure(settings);
  if (exposure.maxPayout > spinCap) {
    return {
      ok: false,
      message:
        "Esta apuesta supera el límite permitido. Reduce el monto o elige otra opción.",
    };
  }

  if (playerDailyPayout >= settings.maxDailyPayoutPerPlayer) {
    return {
      ok: false,
      message:
        "Llegaste al tope de premios de hoy. Puedes seguir mañana o probar con apuestas más pequeñas otro día.",
    };
  }

  if (playerDailyPayout + exposure.maxPayout > settings.maxDailyPayoutPerPlayer) {
    return {
      ok: false,
      message:
        "Esta jugada superaría el tope de premios del día. Reduce el monto o quita alguna apuesta.",
    };
  }

  for (const bet of bets) {
    if (bet.betType !== "STRAIGHT") continue;
    const num = parseInt(bet.betChoice, 10);
    if (Number.isNaN(num)) continue;

    if (exposure.byNumber[num] > settings.maxExposurePerNumber) {
      return {
        ok: false,
        message: "Este número alcanzó el límite disponible por ahora.",
      };
    }

    const singlePayout = calcPayout("STRAIGHT", bet.amount, true);
    if (singlePayout > settings.maxExposurePerNumber) {
      return {
        ok: false,
        message: "Este número alcanzó el límite disponible por ahora.",
      };
    }
  }

  for (const bet of bets) {
    const label = formatBetLabel(bet.betType, bet.betChoice);
    const potential = calcPayout(bet.betType, bet.amount, true);
    if (potential > settings.maxPayoutPerSpin) {
      return {
        ok: false,
        message: `${label}: intenta con otra selección o reduce el monto.`,
      };
    }
  }

  return { ok: true };
}
