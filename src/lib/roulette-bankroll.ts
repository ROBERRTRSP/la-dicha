import { roundMoney } from "./cajero-banca-config";
import { prisma } from "./db";
import { maxStraightExposureAtStake } from "./roulette-payouts";
import {
  getRouletteSettings,
  type RouletteSettingsData,
} from "./roulette-settings";
import { ROULETTE_ALLOWED_AMOUNTS } from "./roulette-validation";
export type RouletteBankrollSnapshot = {
  initialReserve: number;
  totalBet: number;
  totalPaid: number;
  cumulativeProfit: number;
  currentBankroll: number;
  houseMarginHeld: number;
  playableBankroll: number;
};

export type DynamicRouletteLimits = {
  maxBetAmount: number;
  maxStraightBet: number;
  maxOutsideBet: number;
  maxPayoutPerSpin: number;
  maxExposurePerNumber: number;
  maxExposurePerSpin: number;
};

export async function getRouletteCumulativeProfit(): Promise<{
  totalBet: number;
  totalPaid: number;
  houseProfit: number;
}> {
  const agg = await prisma.rouletteBet.aggregate({
    _sum: { amount: true, payout: true },
  });
  const totalBet = agg._sum.amount ?? 0;
  const totalPaid = agg._sum.payout ?? 0;
  return {
    totalBet,
    totalPaid,
    houseProfit: totalBet - totalPaid,
  };
}

function staticCeiling(value: number): number {
  return value > 0 ? value : Number.POSITIVE_INFINITY;
}

/** 0 en admin = usar solo el cálculo dinámico; >0 = techo máximo fijo. */
function resolveLimit(staticVal: number, dynamicVal: number): number {
  if (staticVal <= 0) return roundMoney(dynamicVal);
  return roundMoney(Math.min(staticVal, dynamicVal));
}

/** Mínimo de exposición para permitir directos al máximo monto (RD$5). */
function minExposureForAllowedBets(settings: RouletteSettingsData): number {
  const maxStake = Math.max(...ROULETTE_ALLOWED_AMOUNTS);
  return roundMoney(maxStraightExposureAtStake(maxStake, settings.payoutMultipliers));
}

function withExposureFloor(value: number, floor: number): number {
  if (value <= 0) return floor;
  return roundMoney(Math.max(value, floor));
}
export function computeDynamicBankroll(
  settings: RouletteSettingsData,
  houseProfit: number
): RouletteBankrollSnapshot {
  const initialReserve = settings.houseReserve;
  const rawBankroll = initialReserve + houseProfit;
  const floor = Math.max(settings.minBetAmount, initialReserve * 0.05);
  const currentBankroll = Math.max(floor, rawBankroll);
  const houseMarginHeld = currentBankroll * settings.houseEdge;
  const playableBankroll = currentBankroll - houseMarginHeld;

  return {
    initialReserve,
    totalBet: 0,
    totalPaid: 0,
    cumulativeProfit: houseProfit,
    currentBankroll: roundMoney(currentBankroll),
    houseMarginHeld: roundMoney(houseMarginHeld),
    playableBankroll: roundMoney(Math.max(settings.minBetAmount, playableBankroll)),
  };
}

export function computeDynamicLimits(
  settings: RouletteSettingsData,
  bankroll: RouletteBankrollSnapshot
): DynamicRouletteLimits {
  const playable = bankroll.playableBankroll;
  const riskFraction = settings.maxRiskPercentOfReserve / 100;
  const spinCap = Math.max(settings.minBetAmount, playable * riskFraction);
  const betCap = Math.max(settings.minBetAmount, playable * 0.15);

  return {
    maxPayoutPerSpin: roundMoney(spinCap),
    maxExposurePerSpin: roundMoney(spinCap),
    maxExposurePerNumber: roundMoney(spinCap * 0.45),
    maxBetAmount: roundMoney(
      Math.min(staticCeiling(settings.maxBetAmount), betCap)
    ),
    maxStraightBet: roundMoney(
      Math.min(staticCeiling(settings.maxStraightBet), betCap * 0.5)
    ),
    maxOutsideBet: roundMoney(
      Math.min(staticCeiling(settings.maxOutsideBet), betCap)
    ),
  };
}

export function mergeDynamicLimits(
  settings: RouletteSettingsData,
  dynamic: DynamicRouletteLimits
): RouletteSettingsData {
  const exposureFloor = minExposureForAllowedBets(settings);
  const maxPayoutPerSpin = withExposureFloor(
    resolveLimit(settings.maxPayoutPerSpin, dynamic.maxPayoutPerSpin),
    exposureFloor
  );
  const maxExposurePerSpin = withExposureFloor(
    resolveLimit(settings.maxExposurePerSpin, dynamic.maxExposurePerSpin),
    exposureFloor
  );
  const maxExposurePerNumber = withExposureFloor(
    resolveLimit(settings.maxExposurePerNumber, dynamic.maxExposurePerNumber),
    exposureFloor
  );

  return {
    ...settings,
    maxBetAmount: resolveLimit(settings.maxBetAmount, dynamic.maxBetAmount),
    maxStraightBet: resolveLimit(settings.maxStraightBet, dynamic.maxStraightBet),
    maxOutsideBet: resolveLimit(settings.maxOutsideBet, dynamic.maxOutsideBet),
    maxPayoutPerSpin,
    maxExposurePerNumber,
    maxExposurePerSpin,
  };
}
export async function getEffectiveRouletteSettings(): Promise<{
  settings: RouletteSettingsData;
  effective: RouletteSettingsData;
  bankroll: RouletteBankrollSnapshot;
  dynamicLimits: DynamicRouletteLimits;
}> {
  const settings = await getRouletteSettings();
  const profit = await getRouletteCumulativeProfit();
  const bankroll = computeDynamicBankroll(settings, profit.houseProfit);
  bankroll.totalBet = profit.totalBet;
  bankroll.totalPaid = profit.totalPaid;
  const dynamicLimits = computeDynamicLimits(settings, bankroll);
  const effective = mergeDynamicLimits(settings, dynamicLimits);
  return { settings, effective, bankroll, dynamicLimits };
}
