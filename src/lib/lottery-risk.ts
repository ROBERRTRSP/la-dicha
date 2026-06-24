import { differenceInSeconds } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "./db";
import { roundMoney } from "./cajero-banca-config";
import { formatMoney } from "./utils";
import { betTypeLabel, type BetTypeCode } from "./bet-parser";
import { dedupeDrawsForDisplay } from "./results-sync";
import {
  closesAtForDraw,
  computeDrawStatus,
  drawAtInTz,
  type DrawRuntimeStatus,
} from "./lottery-schedule";
import { dateKeyInTz, dayStartInTz, nowInTz, TZ } from "./timezone";
import type { PaymentFilter } from "./admin-lottery-sales";
import {
  DEFAULT_LOTTERY_PAYOUT_CONFIG,
  getLotteryRiskLimits,
  worstCasePayout,
  type LotteryPayoutConfig,
  type LotteryRiskLimits,
} from "./lottery-payout-config";

export type RiskBetTypeFilter = BetTypeCode | "ALL";
export type RiskStatusFilter = DrawRuntimeStatus | "ALL";
export type RiskCategoryFilter = "ALL" | "DOMINICANA" | "EXTRANJERA";
export type RiskSortBy =
  | "hottest"
  | "exposure"
  | "closing"
  | "sales"
  | "tickets"
  | "priority";

export type RiskLevel = "bajo" | "medio" | "alto" | "critico";
export type RiskPriority = "Crítica" | "Alta" | "Media" | "Baja";

export type RiskHotPlay = {
  betType: BetTypeCode;
  betTypeLabel: string;
  numbers: string;
  soldAmount: number;
  possiblePayout: number;
  plays: number;
  ticketIds: string[];
  ticketCount: number;
  walletAmount: number;
  cashAmount: number;
  mainChannel: "Web" | "Cajero" | "Mixto";
  exceedsLimit: boolean;
  note?: string;
  drawId?: string;
  drawLabel?: string;
};

export type RiskDrawRow = {
  drawId: string;
  lotteryId: string;
  lotteryCode: string;
  lotteryName: string;
  category: string;
  drawTime: string;
  drawDate: string;
  status: string;
  runtimeStatus: DrawRuntimeStatus;
  statusLabel: string;
  priority: RiskPriority;
  timeLabel: string;
  secondsToClose: number | null;
  totalSales: number;
  totalPlays: number;
  totalTickets: number;
  maxExposure: number;
  netRiskEstimate: number;
  riskScore: number;
  riskLevel: RiskLevel;
  hotPlay: RiskHotPlay | null;
  mainChannel: "Web" | "Cajero" | "Mixto";
  recommendedAction: string;
  walletSales: number;
  cashSales: number;
};

export type RiskDrawDetail = {
  drawId: string;
  lotteryName: string;
  drawTime: string;
  topQuinielas: RiskHotPlay[];
  topPales: RiskHotPlay[];
  topTripletas: RiskHotPlay[];
  topSuperPales: RiskHotPlay[];
  byChannel: { web: number; cajero: number };
  byTicket: { ticketId: string; ticketNumber: string; amount: number; plays: number }[];
  totalSold: number;
  totalPossiblePayout: number;
  maxIndividualExposure: number;
};

export type RiskAlert = {
  level: RiskLevel;
  message: string;
  drawId?: string;
};

export type RiskInventorySummary = {
  totalDaySales: number;
  totalDayExposure: number;
  maxExposureAmount: number;
  mostDangerousDraw: { drawId: string; name: string; exposure: number } | null;
  hottestQuiniela: RiskHotPlay | null;
  hottestPale: RiskHotPlay | null;
  hottestTripleta: RiskHotPlay | null;
  drawsClosingSoon: number;
  drawsWaitingResult: number;
  openDraws: number;
};

export type RiskInventoryResult = {
  date: string;
  generatedAt: string;
  filters: {
    payment: PaymentFilter;
    betType: RiskBetTypeFilter;
    status: RiskStatusFilter;
    category: RiskCategoryFilter;
    lotteryCode?: string;
    sortBy: RiskSortBy;
  };
  payoutConfig: LotteryPayoutConfig;
  limits: LotteryRiskLimits;
  summary: RiskInventorySummary;
  draws: RiskDrawRow[];
  globalHotPlays: RiskHotPlay[];
  alerts: RiskAlert[];
  drawDetails: Record<string, RiskDrawDetail>;
};

type PlayAgg = {
  betType: BetTypeCode;
  numbers: string;
  soldAmount: number;
  possiblePayout: number;
  plays: number;
  ticketIds: Set<string>;
  walletAmount: number;
  cashAmount: number;
};

function parseReportDate(dateStr?: string): Date {
  const trimmed = (dateStr ?? dateKeyInTz(new Date())).trim();
  let key = dateKeyInTz(new Date());
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    key = trimmed;
  } else {
    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
      const [, mm, dd, yyyy] = slash;
      key = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }
  return fromZonedTime(`${key}T00:00:00`, TZ);
}

function quinielaParts(numbers: string): string[] {
  return numbers
    .split(/[\s,+-]+/)
    .map((n) => n.replace(/\D/g, "").padStart(2, "0").slice(-2))
    .filter((n) => n.length === 2);
}

function playKey(betType: string, numbers: string): string {
  if (betType === "QUINIELA") {
    const parts = quinielaParts(numbers);
    return `QUINIELA|${parts[0] ?? numbers}`;
  }
  if (betType === "PALE" || betType === "SUPER_PALE") {
    const parts = numbers.split("-").map((n) => n.padStart(2, "0"));
    return `${betType}|${parts.sort().join("-")}`;
  }
  return `${betType}|${numbers}`;
}

function mainChannel(
  wallet: number,
  cash: number
): "Web" | "Cajero" | "Mixto" {
  if (wallet > 0 && cash > 0) return "Mixto";
  if (cash > 0) return "Cajero";
  return "Web";
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 81) return "critico";
  if (score >= 61) return "alto";
  if (score >= 31) return "medio";
  return "bajo";
}

function priorityFromScore(
  score: number,
  runtimeStatus: DrawRuntimeStatus
): RiskPriority {
  if (
    score >= 81 ||
    (runtimeStatus === "CLOSING_SOON" && score >= 50) ||
    (runtimeStatus === "WAITING_RESULT" && score >= 60)
  ) {
    return "Crítica";
  }
  if (
    score >= 61 ||
    runtimeStatus === "WAITING_RESULT" ||
    runtimeStatus === "CLOSING_SOON"
  ) {
    return "Alta";
  }
  if (score >= 31 || runtimeStatus === "CLOSED") return "Media";
  return "Baja";
}

const PRIORITY_ORDER: Record<RiskPriority, number> = {
  Crítica: 0,
  Alta: 1,
  Media: 2,
  Baja: 3,
};

function calcRiskScore(input: {
  hotPlay: RiskHotPlay | null;
  totalSales: number;
  maxExposure: number;
  secondsToClose: number | null;
  runtimeStatus: DrawRuntimeStatus;
  limits: LotteryRiskLimits;
}): number {
  let score = 0;
  const hot = input.hotPlay;
  if (!hot || input.totalSales <= 0) return score;

  const payoutRatio = hot.possiblePayout / input.totalSales;
  score += Math.min(35, payoutRatio * 12);

  const concentration = hot.soldAmount / input.totalSales;
  score += Math.min(25, concentration * 55);

  if (input.runtimeStatus === "CLOSING_SOON") score += 20;
  else if (input.runtimeStatus === "WAITING_RESULT") score += 15;
  else if (
    input.secondsToClose != null &&
    input.secondsToClose > 0 &&
    input.secondsToClose < 3600
  ) {
    score += Math.min(12, ((3600 - input.secondsToClose) / 3600) * 12);
  }

  if (hot.exceedsLimit) score += 18;
  if (hot.possiblePayout > input.totalSales * input.limits.exposureSalesRatio) {
    score += 15;
  }
  if (concentration * 100 >= input.limits.concentrationPercent) score += 10;

  return Math.min(100, Math.round(score));
}

function recommendedAction(
  row: Pick<RiskDrawRow, "runtimeStatus" | "riskLevel" | "hotPlay">
): string {
  if (row.runtimeStatus === "WAITING_RESULT") return "Esperando resultado";
  if (row.runtimeStatus === "RESULT_AVAILABLE") return "Resultado publicado";
  if (row.hotPlay?.exceedsLimit) return "Revisar límite";
  if (row.riskLevel === "critico") return "Bloquear aumento";
  if (row.runtimeStatus === "CLOSING_SOON" || row.riskLevel === "alto") {
    return "Vigilar";
  }
  if (row.runtimeStatus === "CLOSED") return "Cerrado";
  return "Vigilar";
}

function statusLabelEs(status: DrawRuntimeStatus): string {
  const map: Record<DrawRuntimeStatus, string> = {
    OPEN: "Abierta",
    CLOSING_SOON: "Cierra pronto",
    CLOSED: "Cerrada",
    WAITING_RESULT: "Esperando resultado",
    RESULT_AVAILABLE: "Resultado disponible",
  };
  return map[status] ?? status;
}

function playToHot(
  agg: PlayAgg,
  limits: LotteryRiskLimits,
  config: LotteryPayoutConfig,
  meta?: { drawId?: string; drawLabel?: string }
): RiskHotPlay {
  const exceedsLimit =
    agg.betType === "QUINIELA" &&
    agg.soldAmount > limits.maxQuinielaPerNumber;
  return {
    betType: agg.betType,
    betTypeLabel: betTypeLabel(agg.betType),
    numbers: agg.numbers,
    soldAmount: roundMoney(agg.soldAmount),
    possiblePayout: roundMoney(agg.possiblePayout),
    plays: agg.plays,
    ticketIds: [...agg.ticketIds],
    ticketCount: agg.ticketIds.size,
    walletAmount: roundMoney(agg.walletAmount),
    cashAmount: roundMoney(agg.cashAmount),
    mainChannel: mainChannel(agg.walletAmount, agg.cashAmount),
    exceedsLimit,
    note:
      agg.betType === "SUPER_PALE"
        ? "Súper palé — pago cruzado entre dos sorteos"
        : agg.betType === "PALE"
          ? "Palé — gana si ambos números salen en el sorteo"
          : undefined,
    drawId: meta?.drawId,
    drawLabel: meta?.drawLabel,
  };
}

function addPlay(
  map: Map<string, PlayAgg>,
  item: {
    betType: string;
    numbers: string;
    amount: number;
    ticketId: string;
    paymentMethod: string;
  },
  config: LotteryPayoutConfig
) {
  const betType = item.betType as BetTypeCode;
  if (betType === "QUINIELA") {
    for (const num of quinielaParts(item.numbers)) {
      const key = `QUINIELA|${num}`;
      const row =
        map.get(key) ??
        ({
          betType: "QUINIELA" as BetTypeCode,
          numbers: num,
          soldAmount: 0,
          possiblePayout: 0,
          plays: 0,
          ticketIds: new Set<string>(),
          walletAmount: 0,
          cashAmount: 0,
        } satisfies PlayAgg);
      row.plays += 1;
      row.soldAmount += item.amount;
      row.possiblePayout += worstCasePayout("QUINIELA", item.amount, config);
      row.ticketIds.add(item.ticketId);
      if (item.paymentMethod === "CASH") row.cashAmount += item.amount;
      else row.walletAmount += item.amount;
      map.set(key, row);
    }
    return;
  }

  const key = playKey(betType, item.numbers);
  const row =
    map.get(key) ??
    ({
      betType,
      numbers: item.numbers,
      soldAmount: 0,
      possiblePayout: 0,
      plays: 0,
      ticketIds: new Set<string>(),
      walletAmount: 0,
      cashAmount: 0,
    } satisfies PlayAgg);
  row.plays += 1;
  row.soldAmount += item.amount;
  row.possiblePayout += worstCasePayout(betType, item.amount, config);
  row.ticketIds.add(item.ticketId);
  if (item.paymentMethod === "CASH") row.cashAmount += item.amount;
  else row.walletAmount += item.amount;
  map.set(key, row);
}

function topPlays(
  map: Map<string, PlayAgg>,
  betType: BetTypeCode,
  limits: LotteryRiskLimits,
  config: LotteryPayoutConfig,
  limit = 10
): RiskHotPlay[] {
  return [...map.values()]
    .filter((p) => p.betType === betType)
    .sort(
      (a, b) =>
        b.possiblePayout - a.possiblePayout ||
        b.soldAmount - a.soldAmount ||
        b.plays - a.plays
    )
    .slice(0, limit)
    .map((p) => playToHot(p, limits, config));
}

function buildDrawDetail(
  drawId: string,
  meta: { lotteryName: string; drawTime: string },
  playMap: Map<string, PlayAgg>,
  ticketMap: Map<string, { ticketNumber: string; amount: number; plays: number }>,
  limits: LotteryRiskLimits,
  config: LotteryPayoutConfig
): RiskDrawDetail {
  const all = [...playMap.values()];
  const totalSold = roundMoney(all.reduce((s, p) => s + p.soldAmount, 0));
  const totalPossiblePayout = roundMoney(
    all.reduce((s, p) => s + p.possiblePayout, 0)
  );
  const maxIndividualExposure = roundMoney(
    all.reduce((m, p) => Math.max(m, p.possiblePayout), 0)
  );

  return {
    drawId,
    lotteryName: meta.lotteryName,
    drawTime: meta.drawTime,
    topQuinielas: topPlays(playMap, "QUINIELA", limits, config),
    topPales: topPlays(playMap, "PALE", limits, config),
    topTripletas: topPlays(playMap, "TRIPLETA", limits, config),
    topSuperPales: topPlays(playMap, "SUPER_PALE", limits, config),
    byChannel: {
      web: roundMoney(all.reduce((s, p) => s + p.walletAmount, 0)),
      cajero: roundMoney(all.reduce((s, p) => s + p.cashAmount, 0)),
    },
    byTicket: [...ticketMap.entries()]
      .map(([ticketId, t]) => ({ ticketId, ...t }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20),
    totalSold,
    totalPossiblePayout,
    maxIndividualExposure,
  };
}

export async function calculateRiskInventory(options?: {
  date?: string;
  channel?: PaymentFilter;
  lotteryCode?: string;
  status?: RiskStatusFilter;
  betType?: RiskBetTypeFilter;
  category?: RiskCategoryFilter;
  sortBy?: RiskSortBy;
}): Promise<RiskInventoryResult> {
  const payment = options?.channel ?? "ALL";
  const betTypeFilter = options?.betType ?? "ALL";
  const statusFilter = options?.status ?? "ALL";
  const categoryFilter = options?.category ?? "ALL";
  const sortBy = options?.sortBy ?? "priority";
  const dayStart = parseReportDate(options?.date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const date = dateKeyInTz(dayStart);
  const now = nowInTz();
  const config = DEFAULT_LOTTERY_PAYOUT_CONFIG;
  const limits = await getLotteryRiskLimits();

  const rawDraws = await prisma.draw.findMany({
    where: {
      drawDate: {
        gte: new Date(dayStart.getTime() - 12 * 60 * 60 * 1000),
        lte: new Date(dayStart.getTime() + 36 * 60 * 60 * 1000),
      },
    },
    include: {
      lottery: true,
      result: true,
    },
    orderBy: { drawTime: "asc" },
  });
  const drawsForDay = dedupeDrawsForDisplay(rawDraws).filter(
    (d) => dateKeyInTz(d.drawDate) === date
  );

  const items = await prisma.ticketItem.findMany({
    where: {
      ticket: {
        status: { not: "CANCELED" },
        createdAt: { gte: dayStart, lt: dayEnd },
        ...(payment !== "ALL" ? { paymentMethod: payment } : {}),
      },
      ...(betTypeFilter !== "ALL" ? { betType: betTypeFilter } : {}),
      ...(options?.lotteryCode
        ? { draw: { lottery: { code: options.lotteryCode } } }
        : {}),
    },
    include: {
      ticket: {
        select: {
          id: true,
          ticketNumber: true,
          paymentMethod: true,
          status: true,
        },
      },
      draw: { include: { lottery: true, result: true } },
    },
  });

  type DrawBucket = {
    drawId: string;
    lotteryId: string;
    lotteryCode: string;
    lotteryName: string;
    category: string;
    drawTime: string;
    drawDate: Date;
    closeMin: number;
    hasResult: boolean;
    playMap: Map<string, PlayAgg>;
    ticketMap: Map<string, { ticketNumber: string; amount: number; plays: number }>;
    totalSales: number;
    walletSales: number;
    cashSales: number;
    totalPlays: number;
    ticketIds: Set<string>;
  };

  const buckets = new Map<string, DrawBucket>();
  const initBucket = (draw: (typeof drawsForDay)[0]): DrawBucket => ({
    drawId: draw.id,
    lotteryId: draw.lotteryId,
    lotteryCode: draw.lottery.code,
    lotteryName: draw.lottery.name,
    category: draw.lottery.category,
    drawTime: draw.drawTime,
    drawDate: draw.drawDate,
    closeMin: draw.lottery.closeMin,
    hasResult: !!draw.result,
    playMap: new Map(),
    ticketMap: new Map(),
    totalSales: 0,
    walletSales: 0,
    cashSales: 0,
    totalPlays: 0,
    ticketIds: new Set(),
  });

  for (const draw of drawsForDay) {
    if (categoryFilter !== "ALL") {
      const cat = draw.lottery.category?.toUpperCase() ?? "";
      if (categoryFilter === "DOMINICANA" && cat !== "DOMINICANA") continue;
      if (categoryFilter === "EXTRANJERA" && cat !== "EXTRANJERA") continue;
    }
    buckets.set(draw.id, initBucket(draw));
  }

  for (const item of items) {
    if (categoryFilter !== "ALL") {
      const cat = item.draw.lottery.category?.toUpperCase() ?? "";
      if (categoryFilter === "DOMINICANA" && cat !== "DOMINICANA") continue;
      if (categoryFilter === "EXTRANJERA" && cat !== "EXTRANJERA") continue;
    }

    let bucket = buckets.get(item.drawId);
    if (!bucket) {
      bucket = {
        drawId: item.drawId,
        lotteryId: item.draw.lotteryId,
        lotteryCode: item.draw.lottery.code,
        lotteryName: item.draw.lottery.name,
        category: item.draw.lottery.category,
        drawTime: item.draw.drawTime,
        drawDate: item.draw.drawDate,
        closeMin: item.draw.lottery.closeMin,
        hasResult: !!item.draw.result,
        playMap: new Map(),
        ticketMap: new Map(),
        totalSales: 0,
        walletSales: 0,
        cashSales: 0,
        totalPlays: 0,
        ticketIds: new Set(),
      };
      buckets.set(item.drawId, bucket);
    }

    bucket.totalPlays += 1;
    bucket.totalSales += item.amount;
    bucket.ticketIds.add(item.ticketId);
    if (item.ticket.paymentMethod === "CASH") bucket.cashSales += item.amount;
    else bucket.walletSales += item.amount;

    addPlay(bucket.playMap, {
      betType: item.betType,
      numbers: item.numbers,
      amount: item.amount,
      ticketId: item.ticketId,
      paymentMethod: item.ticket.paymentMethod,
    }, config);

    const t = bucket.ticketMap.get(item.ticketId) ?? {
      ticketNumber: item.ticket.ticketNumber,
      amount: 0,
      plays: 0,
    };
    t.amount += item.amount;
    t.plays += 1;
    bucket.ticketMap.set(item.ticketId, t);
  }

  const drawRows: RiskDrawRow[] = [];
  const drawDetails: Record<string, RiskDrawDetail> = {};
  const alerts: RiskAlert[] = [];

  for (const bucket of buckets.values()) {
    if (bucket.totalPlays === 0) continue;

    const drawAt = drawAtInTz(bucket.drawTime, bucket.drawDate);
    const closesAt = closesAtForDraw(
      bucket.drawTime,
      bucket.drawDate,
      bucket.closeMin
    );
    const isPastDay = dayStartInTz(now) > dayStartInTz(bucket.drawDate);
    const runtimeStatus = computeDrawStatus(now, drawAt, closesAt, {
      isPastDay,
      hasResult: bucket.hasResult,
    });

    if (statusFilter !== "ALL" && runtimeStatus !== statusFilter) continue;

    const secondsToClose =
      runtimeStatus === "OPEN" || runtimeStatus === "CLOSING_SOON"
        ? Math.max(0, differenceInSeconds(closesAt, now))
        : null;

    let timeLabel = statusLabelEs(runtimeStatus);
    if (runtimeStatus === "WAITING_RESULT") timeLabel = "Esperando resultado";
    else if (secondsToClose != null && secondsToClose > 0) {
      const mins = Math.floor(secondsToClose / 60);
      timeLabel = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
    }

    const hotAgg = [...bucket.playMap.values()].sort(
      (a, b) =>
        b.possiblePayout - a.possiblePayout ||
        b.soldAmount - a.soldAmount
    )[0];
    const hotPlay = hotAgg
      ? playToHot(hotAgg, limits, config)
      : null;

    const maxExposure = roundMoney(
      [...bucket.playMap.values()].reduce(
        (m, p) => Math.max(m, p.possiblePayout),
        0
      )
    );
    const totalSales = roundMoney(bucket.totalSales);
    const netRiskEstimate = roundMoney(Math.max(0, maxExposure - totalSales));

    const riskScore = calcRiskScore({
      hotPlay,
      totalSales,
      maxExposure,
      secondsToClose,
      runtimeStatus,
      limits,
    });
    const riskLevel = riskLevelFromScore(riskScore);
    const priority = priorityFromScore(riskScore, runtimeStatus);

    const row: RiskDrawRow = {
      drawId: bucket.drawId,
      lotteryId: bucket.lotteryId,
      lotteryCode: bucket.lotteryCode,
      lotteryName: bucket.lotteryName,
      category: bucket.category,
      drawTime: bucket.drawTime,
      drawDate: dateKeyInTz(bucket.drawDate),
      status: runtimeStatus,
      runtimeStatus,
      statusLabel: statusLabelEs(runtimeStatus),
      priority,
      timeLabel,
      secondsToClose,
      totalSales,
      totalPlays: bucket.totalPlays,
      totalTickets: bucket.ticketIds.size,
      maxExposure,
      netRiskEstimate,
      riskScore,
      riskLevel,
      hotPlay,
      mainChannel: mainChannel(bucket.walletSales, bucket.cashSales),
      recommendedAction: "",
      walletSales: roundMoney(bucket.walletSales),
      cashSales: roundMoney(bucket.cashSales),
    };
    row.recommendedAction = recommendedAction(row);
    drawRows.push(row);

    drawDetails[bucket.drawId] = buildDrawDetail(
      bucket.drawId,
      { lotteryName: bucket.lotteryName, drawTime: bucket.drawTime },
      bucket.playMap,
      bucket.ticketMap,
      limits,
      config
    );

    if (hotPlay?.exceedsLimit) {
      alerts.push({
        level: "critico",
        message: `${bucket.lotteryName} ${bucket.drawTime}: ${hotPlay.betTypeLabel} ${hotPlay.numbers} supera límite (${formatMoney(hotPlay.soldAmount)}).`,
        drawId: bucket.drawId,
      });
    }
    if (
      hotPlay &&
      totalSales > 0 &&
      hotPlay.possiblePayout > totalSales * limits.exposureSalesRatio
    ) {
      alerts.push({
        level: riskLevel === "critico" ? "critico" : "alto",
        message: `${bucket.lotteryName}: pago posible ${formatMoney(hotPlay.possiblePayout)} vs ventas ${formatMoney(totalSales)}.`,
        drawId: bucket.drawId,
      });
    }
  }

  const sortFns: Record<RiskSortBy, (a: RiskDrawRow, b: RiskDrawRow) => number> = {
    priority: (a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      b.riskScore - a.riskScore ||
      (a.secondsToClose ?? 99999) - (b.secondsToClose ?? 99999),
    hottest: (a, b) =>
      (b.hotPlay?.soldAmount ?? 0) - (a.hotPlay?.soldAmount ?? 0),
    exposure: (a, b) => b.maxExposure - a.maxExposure,
    closing: (a, b) =>
      (a.secondsToClose ?? 99999) - (b.secondsToClose ?? 99999),
    sales: (a, b) => b.totalSales - a.totalSales,
    tickets: (a, b) => b.totalTickets - a.totalTickets,
  };
  drawRows.sort(sortFns[sortBy]);

  const globalHotPlays: RiskHotPlay[] = [];
  for (const bucket of buckets.values()) {
    const label = `${bucket.lotteryName} ${bucket.drawTime}`;
    for (const agg of bucket.playMap.values()) {
      globalHotPlays.push(
        playToHot(agg, limits, config, {
          drawId: bucket.drawId,
          drawLabel: label,
        })
      );
    }
  }
  globalHotPlays.sort(
    (a, b) =>
      b.possiblePayout - a.possiblePayout || b.soldAmount - a.soldAmount
  );
  const topGlobal = globalHotPlays.slice(0, 30);

  const totalDaySales = roundMoney(
    drawRows.reduce((s, d) => s + d.totalSales, 0)
  );
  const totalDayExposure = roundMoney(
    drawRows.reduce((s, d) => s + d.maxExposure, 0)
  );
  const maxExposureRow = drawRows.reduce<RiskDrawRow | null>(
    (best, d) => (!best || d.maxExposure > best.maxExposure ? d : best),
    null
  );

  const hottestQuiniela =
    topGlobal.find((p) => p.betType === "QUINIELA") ?? null;
  const hottestPale = topGlobal.find((p) => p.betType === "PALE") ?? null;
  const hottestTripleta =
    topGlobal.find((p) => p.betType === "TRIPLETA") ?? null;

  const summary: RiskInventorySummary = {
    totalDaySales,
    totalDayExposure,
    maxExposureAmount: maxExposureRow?.maxExposure ?? 0,
    mostDangerousDraw: maxExposureRow
      ? {
          drawId: maxExposureRow.drawId,
          name: `${maxExposureRow.lotteryName} ${maxExposureRow.drawTime}`,
          exposure: maxExposureRow.maxExposure,
        }
      : null,
    hottestQuiniela,
    hottestPale,
    hottestTripleta,
    drawsClosingSoon: drawRows.filter((d) => d.runtimeStatus === "CLOSING_SOON")
      .length,
    drawsWaitingResult: drawRows.filter(
      (d) => d.runtimeStatus === "WAITING_RESULT"
    ).length,
    openDraws: drawRows.filter(
      (d) => d.runtimeStatus === "OPEN" || d.runtimeStatus === "CLOSING_SOON"
    ).length,
  };

  return {
    date,
    generatedAt: new Date().toISOString(),
    filters: {
      payment,
      betType: betTypeFilter,
      status: statusFilter,
      category: categoryFilter,
      lotteryCode: options?.lotteryCode,
      sortBy,
    },
    payoutConfig: config,
    limits,
    summary,
    draws: drawRows,
    globalHotPlays: topGlobal,
    alerts,
    drawDetails,
  };
}

export function defaultRiskDate(): string {
  return dateKeyInTz(nowInTz());
}
