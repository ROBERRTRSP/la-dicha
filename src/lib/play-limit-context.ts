import { prisma } from "./db";
import {
  getBancaSettings,
  toPlayLimitSettings,
  type BancaSettingsView,
} from "./banca-session";
import {
  limitForBetType,
  type PlayLimitBetType,
  type PlayLimitSettings,
} from "./play-limits";

export type PlayLimitsMode = "GLOBAL" | "PER_LOTTERY";

export type LotteryPlayLimitView = {
  lotteryId: string;
  code: string;
  name: string;
  category: string;
  drawTime: string;
  maxDirectoPerNumber: number | null;
  maxPalePerNumber: number | null;
  maxTripletaPerNumber: number | null;
};

export type PlayLimitContext = {
  mode: PlayLimitsMode;
  global: PlayLimitSettings;
  expensiveDirectoAmount: number;
  lotteries: LotteryPlayLimitView[];
};

export function resolvePlayLimit(
  ctx: PlayLimitContext,
  betType: PlayLimitBetType,
  lotteryCode: string
): number {
  const globalLimit = limitForBetType(ctx.global, betType);

  if (ctx.mode === "GLOBAL" || betType === "SUPER_PALE") {
    return globalLimit;
  }

  const lot = ctx.lotteries.find((l) => l.code === lotteryCode);
  if (!lot) return globalLimit;

  switch (betType) {
    case "QUINIELA":
      return lot.maxDirectoPerNumber ?? globalLimit;
    case "PALE":
      return lot.maxPalePerNumber ?? globalLimit;
    case "TRIPLETA":
      return lot.maxTripletaPerNumber ?? globalLimit;
    default:
      return globalLimit;
  }
}

export async function loadPlayLimitContext(): Promise<PlayLimitContext> {
  const settings = await getBancaSettings();
  const rows = await prisma.lottery.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { drawTime: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      drawTime: true,
      maxDirectoPerNumber: true,
      maxPalePerNumber: true,
      maxTripletaPerNumber: true,
    },
  });

  const mode: PlayLimitsMode =
    settings.playLimitsMode === "PER_LOTTERY" ? "PER_LOTTERY" : "GLOBAL";

  return {
    mode,
    global: toPlayLimitSettings(settings),
    expensiveDirectoAmount: settings.expensiveDirectoAmount,
    lotteries: rows.map((lot) => ({
      lotteryId: lot.id,
      code: lot.code,
      name: lot.name,
      category: lot.category,
      drawTime: lot.drawTime,
      maxDirectoPerNumber: lot.maxDirectoPerNumber,
      maxPalePerNumber: lot.maxPalePerNumber,
      maxTripletaPerNumber: lot.maxTripletaPerNumber,
    })),
  };
}

export type PlayLimitAdminState = {
  settings: BancaSettingsView;
  lotteries: LotteryPlayLimitView[];
};

export async function loadPlayLimitAdminState(): Promise<PlayLimitAdminState> {
  const ctx = await loadPlayLimitContext();
  const settings = await getBancaSettings();
  return {
    settings: { ...settings, playLimitsMode: ctx.mode },
    lotteries: ctx.lotteries,
  };
}
