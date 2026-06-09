import { prisma } from "./db";

export type RouletteSettingsData = {
  active: boolean;
  minBetAmount: number;
  maxBetAmount: number;
  maxStraightBet: number;
  maxOutsideBet: number;
  maxPayoutPerSpin: number;
  maxDailyPayoutPerPlayer: number;
  maxExposurePerNumber: number;
  maxExposurePerSpin: number;
  houseReserve: number;
  maxRiskPercentOfReserve: number;
  welcomeBonusEnabled: boolean;
  welcomeBonusAmount: number;
  cashbackEnabled: boolean;
  cashbackPercent: number;
  freeSpinsEnabled: boolean;
  freeSpinsPerDay: number;
  trialCreditsEnabled: boolean;
  trialCreditAmount: number;
  rankingEnabled: boolean;
  promoBannerMessage: string | null;
  positiveSpinMessage: string | null;
};

export const DEFAULT_ROULETTE_SETTINGS: RouletteSettingsData = {
  active: true,
  minBetAmount: 1,
  maxBetAmount: 100,
  maxStraightBet: 20,
  maxOutsideBet: 50,
  maxPayoutPerSpin: 500,
  maxDailyPayoutPerPlayer: 15000,
  maxExposurePerNumber: 180,
  maxExposurePerSpin: 800,
  houseReserve: 10000,
  maxRiskPercentOfReserve: 15,
  welcomeBonusEnabled: false,
  welcomeBonusAmount: 5,
  cashbackEnabled: false,
  cashbackPercent: 5,
  freeSpinsEnabled: false,
  freeSpinsPerDay: 1,
  trialCreditsEnabled: false,
  trialCreditAmount: 10,
  rankingEnabled: true,
  promoBannerMessage: null,
  positiveSpinMessage: "¡Buena suerte! La ruleta es justa y cada giro es una nueva oportunidad.",
};

export async function getRouletteSettings(): Promise<RouletteSettingsData> {
  const row = await prisma.rouletteSettings.findUnique({
    where: { id: "default" },
  });
  if (!row) return { ...DEFAULT_ROULETTE_SETTINGS };
  return {
    active: row.active,
    minBetAmount: row.minBetAmount,
    maxBetAmount: row.maxBetAmount,
    maxStraightBet: row.maxStraightBet,
    maxOutsideBet: row.maxOutsideBet,
    maxPayoutPerSpin: row.maxPayoutPerSpin,
    maxDailyPayoutPerPlayer: row.maxDailyPayoutPerPlayer,
    maxExposurePerNumber: row.maxExposurePerNumber,
    maxExposurePerSpin: row.maxExposurePerSpin,
    houseReserve: row.houseReserve,
    maxRiskPercentOfReserve: row.maxRiskPercentOfReserve,
    welcomeBonusEnabled: row.welcomeBonusEnabled,
    welcomeBonusAmount: row.welcomeBonusAmount,
    cashbackEnabled: row.cashbackEnabled,
    cashbackPercent: row.cashbackPercent,
    freeSpinsEnabled: row.freeSpinsEnabled,
    freeSpinsPerDay: row.freeSpinsPerDay,
    trialCreditsEnabled: row.trialCreditsEnabled,
    trialCreditAmount: row.trialCreditAmount,
    rankingEnabled: row.rankingEnabled,
    promoBannerMessage: row.promoBannerMessage,
    positiveSpinMessage: row.positiveSpinMessage,
  };
}

export function maxRiskFromReserve(settings: RouletteSettingsData): number {
  return (settings.houseReserve * settings.maxRiskPercentOfReserve) / 100;
}

export function effectiveMaxSpinExposure(settings: RouletteSettingsData): number {
  return Math.min(settings.maxExposurePerSpin, maxRiskFromReserve(settings));
}
