import { prisma } from "./db";
import {
  DEFAULT_ROULETTE_PAYOUTS,
  parsePayoutMultipliers,
  serializePayoutMultipliers,
  validatePayoutMultipliersPatch,
  type RoulettePayoutMultipliers,
} from "./roulette-payouts";

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
  houseEdge: number;
  playerRtp: number;
  payoutMultipliers: RoulettePayoutMultipliers;
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
  houseAlwaysWins: boolean;
  dailyOpenTime: string;
  dailyCloseTime: string;
  /** Porcentaje de ganancia diaria de la casa (legacy → target). */
  dailyProfitPercent: number;
  dailyMinProfitPct: number;
  dailyMaxProfitPct: number;
  dailyTargetProfitPct: number;
  autoAdjustmentEnabled: boolean;
  /** BALANCE_CREDIT | BONUS | CASHBACK */
  adjustmentType: "BALANCE_CREDIT" | "BONUS" | "CASHBACK";
  rewardSystemActive: boolean;
  housePercent: number;
  promoPercent: number;
  rewardIntervalMinutes: number;
  maxRewardPercentOfPromoPool: number;
  minSpinsToQualify: number;
  minBetAmountToQualify: number;
  cashbackAfterLosses: number;
  maxCashbackAmount: number;
  spinWeight: number;
  dailyMissionBetAmount: number;
  dailyMissionBonus: number;
  activePlayerBonusPercent: number;
};

/** Techo técnico; el jugador también se frena por límites de riesgo. */
export const PLAYER_BET_CEILING = 100_000;

export const DEFAULT_ROULETTE_SETTINGS: RouletteSettingsData = {
  active: true,
  minBetAmount: 1,
  maxBetAmount: 5,
  maxStraightBet: 5,
  maxOutsideBet: 5,
  maxPayoutPerSpin: 180,
  maxDailyPayoutPerPlayer: 0,
  maxExposurePerNumber: 180,
  maxExposurePerSpin: 180,
  houseReserve: 400,
  maxRiskPercentOfReserve: 15,
  houseEdge: 0.08,
  playerRtp: 0.92,
  payoutMultipliers: { ...DEFAULT_ROULETTE_PAYOUTS },
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
  positiveSpinMessage: "¡Buena suerte! La ruleta cierra diariamente.",
  houseAlwaysWins: false,
  dailyOpenTime: "06:00",
  dailyCloseTime: "23:45",
  dailyProfitPercent: 3,
  dailyMinProfitPct: 1,
  dailyMaxProfitPct: 8,
  dailyTargetProfitPct: 3,
  autoAdjustmentEnabled: true,
  adjustmentType: "BALANCE_CREDIT",
  rewardSystemActive: false,
  housePercent: 3,
  promoPercent: 20,
  rewardIntervalMinutes: 15,
  maxRewardPercentOfPromoPool: 10,
  minSpinsToQualify: 3,
  minBetAmountToQualify: 5,
  cashbackAfterLosses: 10,
  maxCashbackAmount: 50,
  spinWeight: 1,
  dailyMissionBetAmount: 20,
  dailyMissionBonus: 2,
  activePlayerBonusPercent: 3,
};

/** Límites automáticos según fondo de la casa (0 = solo dinámico). */
export const DYNAMIC_BANKROLL_ROULETTE_LIMITS: Pick<
  RouletteSettingsData,
  | "houseReserve"
  | "maxRiskPercentOfReserve"
  | "maxBetAmount"
  | "maxStraightBet"
  | "maxOutsideBet"
  | "maxPayoutPerSpin"
  | "maxDailyPayoutPerPlayer"
  | "maxExposurePerNumber"
  | "maxExposurePerSpin"
  | "houseEdge"
  | "playerRtp"
> = {
  houseReserve: 400,
  maxRiskPercentOfReserve: 15,
  maxBetAmount: 0,
  maxStraightBet: 0,
  maxOutsideBet: 0,
  maxPayoutPerSpin: 0,
  maxDailyPayoutPerPlayer: 0,
  maxExposurePerNumber: 0,
  maxExposurePerSpin: 0,
  houseEdge: 0.08,
  playerRtp: 0.92,
};

function rowToSettings(row: {
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
  houseEdge: number;
  playerRtp: number;
  payoutMultipliers: string;
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
  houseAlwaysWins: boolean;
  dailyOpenTime: string;
  dailyCloseTime: string;
  dailyProfitPercent?: number | null;
  dailyMinProfitPct?: number | null;
  dailyMaxProfitPct?: number | null;
  dailyTargetProfitPct?: number | null;
  autoAdjustmentEnabled?: boolean | null;
  adjustmentType?: string | null;
  rewardSystemActive?: boolean | null;
  housePercent?: number | null;
  promoPercent?: number | null;
  rewardIntervalMinutes?: number | null;
  maxRewardPercentOfPromoPool?: number | null;
  minSpinsToQualify?: number | null;
  minBetAmountToQualify?: number | null;
  cashbackAfterLosses?: number | null;
  maxCashbackAmount?: number | null;
  spinWeight?: number | null;
  dailyMissionBetAmount?: number | null;
  dailyMissionBonus?: number | null;
  activePlayerBonusPercent?: number | null;
}): RouletteSettingsData {
  const targetPct =
    row.dailyTargetProfitPct ??
    row.dailyProfitPercent ??
    Math.round((row.houseEdge ?? 0.03) * 100);

  let minPct = row.dailyMinProfitPct ?? 1;
  let maxPct = row.dailyMaxProfitPct ?? 8;

  // Si el admin guardó un solo % (ej. 2.22), ese valor es el tope de ganancia de la casa.
  if (row.dailyProfitPercent != null && row.dailyProfitPercent > 0) {
    if (row.dailyProfitPercent < maxPct) {
      maxPct = row.dailyProfitPercent;
    }
    if (row.dailyMinProfitPct == null) {
      minPct = Math.max(0, Math.round(row.dailyProfitPercent * 50) / 100);
    }
  }

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
    houseEdge: row.houseEdge,
    playerRtp: row.playerRtp,
    payoutMultipliers: parsePayoutMultipliers(row.payoutMultipliers),
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
    houseAlwaysWins: false,
    dailyOpenTime: row.dailyOpenTime ?? "06:00",
    dailyCloseTime: row.dailyCloseTime ?? "23:45",
    dailyProfitPercent: targetPct,
    dailyMinProfitPct: minPct,
    dailyMaxProfitPct: maxPct,
    dailyTargetProfitPct: targetPct,
    autoAdjustmentEnabled: row.autoAdjustmentEnabled ?? true,
    adjustmentType:
      (row.adjustmentType as RouletteSettingsData["adjustmentType"]) ??
      "BALANCE_CREDIT",
    rewardSystemActive: row.rewardSystemActive ?? false,
    housePercent: row.housePercent ?? 3,
    promoPercent: row.promoPercent ?? 20,
    rewardIntervalMinutes: row.rewardIntervalMinutes ?? 15,
    maxRewardPercentOfPromoPool: row.maxRewardPercentOfPromoPool ?? 10,
    minSpinsToQualify: row.minSpinsToQualify ?? 3,
    minBetAmountToQualify: row.minBetAmountToQualify ?? 5,
    cashbackAfterLosses: row.cashbackAfterLosses ?? 10,
    maxCashbackAmount: row.maxCashbackAmount ?? 50,
    spinWeight: row.spinWeight ?? 1,
    dailyMissionBetAmount: row.dailyMissionBetAmount ?? 20,
    dailyMissionBonus: row.dailyMissionBonus ?? 2,
    activePlayerBonusPercent: row.activePlayerBonusPercent ?? 3,
  };
}

export async function getRouletteSettings(): Promise<RouletteSettingsData> {
  try {
    const row = await prisma.rouletteSettings.findUnique({
      where: { id: "default" },
    });
    if (!row) return { ...DEFAULT_ROULETTE_SETTINGS };
    return rowToSettings(row);
  } catch {
    return { ...DEFAULT_ROULETTE_SETTINGS };
  }
}

export function maxRiskFromReserve(settings: RouletteSettingsData): number {
  return (settings.houseReserve * settings.maxRiskPercentOfReserve) / 100;
}

/** 0 = sin tope de premios acumulados por jugador en la semana. */
export function hasPlayerPayoutCap(settings: RouletteSettingsData): boolean {
  return settings.maxDailyPayoutPerPlayer > 0;
}

/** Sin límites de exposición ni apuesta configurados (solo dinámico). */
export function isUnlimitedPlayerMode(settings: RouletteSettingsData): boolean {
  return (
    settings.maxBetAmount <= 0 &&
    settings.maxStraightBet <= 0 &&
    settings.maxOutsideBet <= 0 &&
    settings.maxPayoutPerSpin <= 0 &&
    settings.maxExposurePerNumber <= 0 &&
    settings.maxExposurePerSpin <= 0 &&
    settings.maxDailyPayoutPerPlayer <= 0 &&
    settings.maxRiskPercentOfReserve <= 0
  );
}

/** Límites efectivos para el jugador (montos fijos RD$1–5). */
export function resolvePlayerSettings(
  settings: RouletteSettingsData
): RouletteSettingsData {
  return {
    ...settings,
    maxBetAmount: 5,
    maxStraightBet: 5,
    maxOutsideBet: 5,
    maxPayoutPerSpin: 0,
    maxExposurePerNumber: 0,
    maxExposurePerSpin: 0,
  };
}

/** Límite de premio por giro; 0 = usar solo riesgo dinámico sobre reserva. */
export function effectiveMaxSpinExposure(settings: RouletteSettingsData): number {
  const caps: number[] = [];
  if (settings.maxExposurePerSpin > 0) caps.push(settings.maxExposurePerSpin);
  if (settings.maxPayoutPerSpin > 0) caps.push(settings.maxPayoutPerSpin);
  if (caps.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...caps);
}

function clampNum(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function validateRouletteSettingsPatch(
  patch: Partial<RouletteSettingsData>,
  current: RouletteSettingsData = DEFAULT_ROULETTE_SETTINGS
): Partial<RouletteSettingsData> & { payoutMultipliers?: RoulettePayoutMultipliers } {
  const merged = { ...current, ...patch };
  const out: Partial<RouletteSettingsData> = {};

  if (patch.active !== undefined) out.active = Boolean(patch.active);

  if (patch.minBetAmount !== undefined) {
    out.minBetAmount = clampNum(patch.minBetAmount, 1, 1000, merged.minBetAmount);
  }
  if (patch.maxBetAmount !== undefined) {
    out.maxBetAmount = clampNum(patch.maxBetAmount, 0, 100000, merged.maxBetAmount);
  }
  if (patch.maxStraightBet !== undefined) {
    out.maxStraightBet = clampNum(patch.maxStraightBet, 0, 100000, merged.maxStraightBet);
  }
  if (patch.maxOutsideBet !== undefined) {
    out.maxOutsideBet = clampNum(patch.maxOutsideBet, 0, 100000, merged.maxOutsideBet);
  }
  if (patch.maxPayoutPerSpin !== undefined) {
    out.maxPayoutPerSpin = clampNum(patch.maxPayoutPerSpin, 0, 100000, merged.maxPayoutPerSpin);
  }
  if (patch.maxDailyPayoutPerPlayer !== undefined) {
    out.maxDailyPayoutPerPlayer = clampNum(
      patch.maxDailyPayoutPerPlayer,
      0,
      1000000,
      merged.maxDailyPayoutPerPlayer
    );
  }
  if (patch.maxExposurePerNumber !== undefined) {
    out.maxExposurePerNumber = clampNum(
      patch.maxExposurePerNumber,
      0,
      100000,
      merged.maxExposurePerNumber
    );
  }
  if (patch.maxExposurePerSpin !== undefined) {
    out.maxExposurePerSpin = clampNum(
      patch.maxExposurePerSpin,
      0,
      1000000,
      merged.maxExposurePerSpin
    );
  }
  if (patch.houseReserve !== undefined) {
    out.houseReserve = clampNum(patch.houseReserve, 50, 10000000, merged.houseReserve);
  }
  if (patch.maxRiskPercentOfReserve !== undefined) {
    out.maxRiskPercentOfReserve = clampNum(
      patch.maxRiskPercentOfReserve,
      0,
      100,
      merged.maxRiskPercentOfReserve
    );
  }
  if (patch.houseEdge !== undefined) {
    out.houseEdge = clampNum(patch.houseEdge, 0, 0.5, merged.houseEdge);
  }
  if (patch.playerRtp !== undefined) {
    out.playerRtp = clampNum(patch.playerRtp, 0.5, 1, merged.playerRtp);
  }
  if (patch.payoutMultipliers !== undefined) {
    out.payoutMultipliers = validatePayoutMultipliersPatch(
      patch.payoutMultipliers,
      merged.payoutMultipliers
    );
  }

  const minBet = out.minBetAmount ?? merged.minBetAmount;
  const maxBet = out.maxBetAmount ?? merged.maxBetAmount;
  if (maxBet > 0 && minBet > maxBet) {
    throw new Error("La apuesta mínima no puede superar la máxima.");
  }

  if (patch.welcomeBonusEnabled !== undefined) {
    out.welcomeBonusEnabled = Boolean(patch.welcomeBonusEnabled);
  }
  if (patch.welcomeBonusAmount !== undefined) {
    out.welcomeBonusAmount = clampNum(patch.welcomeBonusAmount, 0, 1000, merged.welcomeBonusAmount);
  }
  if (patch.cashbackEnabled !== undefined) {
    out.cashbackEnabled = Boolean(patch.cashbackEnabled);
  }
  if (patch.cashbackPercent !== undefined) {
    out.cashbackPercent = clampNum(patch.cashbackPercent, 0, 50, merged.cashbackPercent);
  }
  if (patch.freeSpinsEnabled !== undefined) {
    out.freeSpinsEnabled = Boolean(patch.freeSpinsEnabled);
  }
  if (patch.freeSpinsPerDay !== undefined) {
    out.freeSpinsPerDay = clampNum(patch.freeSpinsPerDay, 0, 20, merged.freeSpinsPerDay);
  }
  if (patch.trialCreditsEnabled !== undefined) {
    out.trialCreditsEnabled = Boolean(patch.trialCreditsEnabled);
  }
  if (patch.trialCreditAmount !== undefined) {
    out.trialCreditAmount = clampNum(patch.trialCreditAmount, 0, 1000, merged.trialCreditAmount);
  }
  if (patch.rankingEnabled !== undefined) {
    out.rankingEnabled = Boolean(patch.rankingEnabled);
  }
  if (patch.promoBannerMessage !== undefined) {
    out.promoBannerMessage =
      patch.promoBannerMessage === null || patch.promoBannerMessage === ""
        ? null
        : String(patch.promoBannerMessage).slice(0, 200);
  }
  if (patch.positiveSpinMessage !== undefined) {
    out.positiveSpinMessage =
      patch.positiveSpinMessage === null || patch.positiveSpinMessage === ""
        ? null
        : String(patch.positiveSpinMessage).slice(0, 300);
  }
  if (patch.houseAlwaysWins !== undefined) {
    out.houseAlwaysWins = Boolean(patch.houseAlwaysWins);
  }
  if (patch.dailyOpenTime !== undefined) {
    out.dailyOpenTime = String(patch.dailyOpenTime).slice(0, 5) || merged.dailyOpenTime;
  }
  if (patch.dailyCloseTime !== undefined) {
    out.dailyCloseTime = String(patch.dailyCloseTime).slice(0, 5) || merged.dailyCloseTime;
  }
  if (patch.dailyProfitPercent !== undefined) {
    const pct = clampNum(patch.dailyProfitPercent, 0, 100, merged.dailyProfitPercent);
    out.dailyProfitPercent = pct;
    out.dailyTargetProfitPct = pct;
    out.dailyMaxProfitPct = pct;
    out.dailyMinProfitPct = Math.max(0, Math.round(pct * 50) / 100);
    out.houseEdge = pct / 100;
    out.playerRtp = 1 - pct / 100;
  }
  if (patch.dailyMinProfitPct !== undefined) {
    out.dailyMinProfitPct = clampNum(
      patch.dailyMinProfitPct,
      0,
      100,
      merged.dailyMinProfitPct
    );
  }
  if (patch.dailyMaxProfitPct !== undefined) {
    out.dailyMaxProfitPct = clampNum(
      patch.dailyMaxProfitPct,
      0,
      100,
      merged.dailyMaxProfitPct
    );
  }
  if (patch.dailyTargetProfitPct !== undefined) {
    const pct = clampNum(
      patch.dailyTargetProfitPct,
      0,
      100,
      merged.dailyTargetProfitPct
    );
    out.dailyTargetProfitPct = pct;
    out.dailyProfitPercent = pct;
    out.houseEdge = pct / 100;
    out.playerRtp = 1 - pct / 100;
  }
  if (patch.autoAdjustmentEnabled !== undefined) {
    out.autoAdjustmentEnabled = Boolean(patch.autoAdjustmentEnabled);
  }
  if (patch.adjustmentType !== undefined) {
    const t = String(patch.adjustmentType).toUpperCase();
    if (t === "BALANCE_CREDIT" || t === "BONUS" || t === "CASHBACK") {
      out.adjustmentType = t;
    }
  }

  if (patch.rewardSystemActive !== undefined) {
    out.rewardSystemActive = Boolean(patch.rewardSystemActive);
  }
  if (patch.housePercent !== undefined) {
    out.housePercent = clampNum(patch.housePercent, 0, 100, merged.housePercent);
  }
  if (patch.promoPercent !== undefined) {
    out.promoPercent = clampNum(patch.promoPercent, 0, 100, merged.promoPercent);
  }
  if (patch.rewardIntervalMinutes !== undefined) {
    out.rewardIntervalMinutes = Math.round(
      clampNum(patch.rewardIntervalMinutes, 1, 1440, merged.rewardIntervalMinutes)
    );
  }
  if (patch.maxRewardPercentOfPromoPool !== undefined) {
    out.maxRewardPercentOfPromoPool = clampNum(
      patch.maxRewardPercentOfPromoPool,
      0,
      100,
      merged.maxRewardPercentOfPromoPool
    );
  }
  if (patch.minSpinsToQualify !== undefined) {
    out.minSpinsToQualify = Math.round(
      clampNum(patch.minSpinsToQualify, 0, 1000, merged.minSpinsToQualify)
    );
  }
  if (patch.minBetAmountToQualify !== undefined) {
    out.minBetAmountToQualify = clampNum(
      patch.minBetAmountToQualify,
      0,
      100000,
      merged.minBetAmountToQualify
    );
  }
  if (patch.cashbackAfterLosses !== undefined) {
    out.cashbackAfterLosses = Math.round(
      clampNum(patch.cashbackAfterLosses, 1, 1000, merged.cashbackAfterLosses)
    );
  }
  if (patch.maxCashbackAmount !== undefined) {
    out.maxCashbackAmount = clampNum(
      patch.maxCashbackAmount,
      0,
      1000000,
      merged.maxCashbackAmount
    );
  }
  if (patch.spinWeight !== undefined) {
    out.spinWeight = clampNum(patch.spinWeight, 0, 10000, merged.spinWeight);
  }
  if (patch.dailyMissionBetAmount !== undefined) {
    out.dailyMissionBetAmount = clampNum(
      patch.dailyMissionBetAmount,
      0,
      1000000,
      merged.dailyMissionBetAmount
    );
  }
  if (patch.dailyMissionBonus !== undefined) {
    out.dailyMissionBonus = clampNum(
      patch.dailyMissionBonus,
      0,
      1000000,
      merged.dailyMissionBonus
    );
  }
  if (patch.activePlayerBonusPercent !== undefined) {
    out.activePlayerBonusPercent = clampNum(
      patch.activePlayerBonusPercent,
      0,
      100,
      merged.activePlayerBonusPercent
    );
  }

  const minPct = out.dailyMinProfitPct ?? merged.dailyMinProfitPct;
  const maxPct = out.dailyMaxProfitPct ?? merged.dailyMaxProfitPct;
  const targetPct = out.dailyTargetProfitPct ?? merged.dailyTargetProfitPct;
  if (minPct > maxPct) {
    throw new Error("El % mínimo no puede superar el % máximo.");
  }
  if (targetPct < minPct || targetPct > maxPct) {
    throw new Error("La meta debe estar entre el mínimo y el máximo.");
  }

  return out;
}

export function settingsForDbWrite(
  patch: Partial<RouletteSettingsData>
): Record<string, unknown> {
  const db: Record<string, unknown> = { ...patch };
  if (patch.payoutMultipliers) {
    db.payoutMultipliers = serializePayoutMultipliers(patch.payoutMultipliers);
  }
  return db;
}
