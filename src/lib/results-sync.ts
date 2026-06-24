import { addMinutes, subDays } from "date-fns";
import { prisma } from "./db";
import { ensureDrawsForDay } from "./draws";
import {
  LOTTERY_SOURCE_BY_CODE,
  LOTTERY_SOURCES,
  SYNC_DELAY_MINUTES,
} from "./lottery-sources";
import {
  clearAlternateSourceCache,
  fetchVerifiedQuiniela,
  numbersKey,
} from "./results-scraper";
import { settleDraw } from "./settlement";
import { dateKeyInTz, dayStartInTz, nowInTz, TZ } from "./timezone";
import { fromZonedTime } from "date-fns-tz";

export type SyncResult = {
  code: string;
  status:
    | "applied"
    | "settled"
    | "skipped"
    | "waiting"
    | "no_source"
    | "no_data"
    | "manual"
    | "mismatch"
    | "date_mismatch";
  numbers?: string;
  reason?: string;
};

function drawInstantInTz(drawTime: string, day: Date) {
  const key = dateKeyInTz(day);
  return fromZonedTime(`${key}T${drawTime}:00`, TZ);
}

function verifyReasonToStatus(reason: string): SyncResult["status"] {
  if (reason === "mismatch") return "mismatch";
  if (reason === "official_date" || reason === "alternate_date") return "date_mismatch";
  return "no_data";
}

async function findDrawForLotteryDay(lotteryId: string, day: Date) {
  const key = dateKeyInTz(day);
  const dayStart = dayStartInTz(day);
  const draws = await prisma.draw.findMany({
    where: { lotteryId },
    include: { result: true },
    orderBy: { createdAt: "asc" },
  });

  const matching = draws.filter((d) => dateKeyInTz(d.drawDate) === key);
  if (matching.length === 0) return null;

  return matching.sort((a, b) => {
    const aExact = a.drawDate.getTime() === dayStart.getTime() ? 1 : 0;
    const bExact = b.drawDate.getTime() === dayStart.getTime() ? 1 : 0;
    if (bExact !== aExact) return bExact - aExact;
    if (Boolean(b.result) !== Boolean(a.result)) return b.result ? 1 : -1;
    return 0;
  })[0];
}

export async function syncLotteryResultForDay(
  lotteryCode: string,
  day: Date,
  options?: { force?: boolean }
): Promise<SyncResult> {
  const config = LOTTERY_SOURCE_BY_CODE[lotteryCode];
  if (!config) {
    return { code: lotteryCode, status: "no_source" };
  }

  const lottery = await prisma.lottery.findUnique({ where: { code: lotteryCode } });
  if (!lottery?.active) {
    return { code: lotteryCode, status: "skipped", reason: "inactiva" };
  }

  const now = nowInTz();
  const drawAt = drawInstantInTz(lottery.drawTime, day);
  const readyAt = addMinutes(drawAt, SYNC_DELAY_MINUTES);

  if (now < readyAt) {
    return {
      code: lotteryCode,
      status: "waiting",
      reason: `espera ${SYNC_DELAY_MINUTES} min post-sorteo (${lottery.drawTime})`,
    };
  }

  const draw = await findDrawForLotteryDay(lottery.id, day);
  if (!draw) {
    return { code: lotteryCode, status: "skipped", reason: "sin sorteo en BD" };
  }

  if (draw.result?.source === "MANUAL" && !options?.force) {
    return { code: lotteryCode, status: "manual", reason: "publicado por admin" };
  }

  const verified = await fetchVerifiedQuiniela(config, day);
  if (!verified.ok) {
    return {
      code: lotteryCode,
      status: verifyReasonToStatus(verified.reason),
      reason: verified.detail ?? verified.reason,
    };
  }

  const scraped = verified.data;
  const numbers = numbersKey(scraped);
  const hadResult = Boolean(draw.result);
  const sameNumbers =
    hadResult &&
    draw.result!.first === scraped.first &&
    draw.result!.second === scraped.second &&
    draw.result!.third === scraped.third;

  if (sameNumbers && draw.result?.source === "OFFICIAL") {
    return { code: lotteryCode, status: "skipped", numbers, reason: "ya verificado" };
  }

  if (hadResult && draw.result?.source === "MANUAL" && !options?.force) {
    return { code: lotteryCode, status: "manual" };
  }

  await prisma.result.upsert({
    where: { drawId: draw.id },
    update: {
      first: scraped.first,
      second: scraped.second,
      third: scraped.third,
      confirmed: true,
      source: "OFFICIAL",
      syncedAt: new Date(),
    },
    create: {
      drawId: draw.id,
      first: scraped.first,
      second: scraped.second,
      third: scraped.third,
      confirmed: true,
      source: "OFFICIAL",
      syncedAt: new Date(),
    },
  });

  await prisma.draw.update({
    where: { id: draw.id },
    data: { status: "RESULT_AVAILABLE" },
  });

  let status: SyncResult["status"] = "applied";
  try {
    const { settled } = await settleDraw(draw.id);
    if (settled > 0) status = "settled";
  } catch {
    /* sin jugadas pendientes */
  }

  return { code: lotteryCode, status, numbers };
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

export async function syncResultsForDay(day: Date): Promise<SyncResult[]> {
  await ensureDrawsForDay(day);
  clearAlternateSourceCache();
  const codes = LOTTERY_SOURCES.map((s) => s.code);
  return mapInBatches(codes, 4, (code) => syncLotteryResultForDay(code, day));
}

export async function syncRecentResults(days = 7): Promise<SyncResult[]> {
  const now = nowInTz();
  const all: SyncResult[] = [];

  for (let i = 0; i < days; i++) {
    const day = dayStartInTz(subDays(now, i));
    const dayResults = await syncResultsForDay(day);
    all.push(...dayResults);
  }

  return all;
}

/** Solo sorteos que ya debieron salir y aún no tienen resultado oficial. */
export async function syncPendingResultsForDay(day: Date): Promise<SyncResult[]> {
  await ensureDrawsForDay(day);
  const now = nowInTz();
  const dayStart = dayStartInTz(day);

  const draws = await prisma.draw.findMany({
    where: {
      drawDate: {
        gte: new Date(dayStart.getTime() - 12 * 60 * 60 * 1000),
        lte: new Date(dayStart.getTime() + 36 * 60 * 60 * 1000),
      },
      lottery: { active: true },
    },
    include: { lottery: true, result: true },
  });

  const pendingCodes = new Set<string>();
  for (const draw of draws) {
    if (dateKeyInTz(draw.drawDate) !== dateKeyInTz(day)) continue;
    if (draw.result?.source === "OFFICIAL" || draw.result?.source === "MANUAL") {
      continue;
    }
    const drawAt = drawInstantInTz(draw.drawTime, day);
    const readyAt = addMinutes(drawAt, SYNC_DELAY_MINUTES);
    if (now >= readyAt) {
      pendingCodes.add(draw.lottery.code);
    }
  }

  if (pendingCodes.size === 0) return [];

  clearAlternateSourceCache();
  return mapInBatches([...pendingCodes], 4, (code) =>
    syncLotteryResultForDay(code, day)
  );
}

/** Sincronización en vivo: hoy (+ ayer si daysBack >= 1). */
export async function syncPendingResults(daysBack = 1): Promise<SyncResult[]> {
  const now = nowInTz();
  const all: SyncResult[] = [];
  for (let i = 0; i <= daysBack; i++) {
    const day = dayStartInTz(subDays(now, i));
    const dayResults = await syncPendingResultsForDay(day);
    all.push(...dayResults);
  }
  return all;
}

export function countFreshResults(results: SyncResult[]) {
  return results.filter(
    (r) => r.status === "applied" || r.status === "settled"
  ).length;
}

type DrawWithOptionalResult = {
  id: string;
  lotteryId: string;
  drawDate: Date;
  drawTime: string;
  result: { source?: string | null } | null;
  createdAt: Date;
};

function drawDisplayScore(d: DrawWithOptionalResult) {
  let s = 0;
  if (d.result?.source === "OFFICIAL") s += 16;
  else if (d.result?.source === "MANUAL") s += 12;
  else if (d.result) s += 4;
  if (d.drawDate.getTime() === dayStartInTz(d.drawDate).getTime()) s += 2;
  return s;
}

/** Una fila por lotería y día (corrige duplicados legacy en BD). */
export function dedupeDrawsForDisplay<T extends DrawWithOptionalResult>(draws: T[]): T[] {
  const byKey = new Map<string, T>();

  for (const draw of draws) {
    const key = `${draw.lotteryId}:${dateKeyInTz(draw.drawDate)}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, draw);
      continue;
    }

    const drawScore = drawDisplayScore(draw);
    const existingScore = drawDisplayScore(existing);
    if (drawScore > existingScore) {
      byKey.set(key, draw);
    } else if (drawScore === existingScore && draw.createdAt > existing.createdAt) {
      byKey.set(key, draw);
    }
  }

  return [...byKey.values()];
}

/** Elimina resultados demo/sin fuente de un rango de fechas. */
export async function purgeUnverifiedResults(from: Date, to: Date) {
  const fromKey = dateKeyInTz(from);
  const toKey = dateKeyInTz(to);

  const draws = await prisma.draw.findMany({
    where: {
      drawDate: {
        gte: new Date(dayStartInTz(from).getTime() - 12 * 60 * 60 * 1000),
        lte: new Date(dayStartInTz(to).getTime() + 36 * 60 * 60 * 1000),
      },
      result: { source: null },
    },
    select: { id: true, drawDate: true, result: { select: { id: true } } },
  });

  const resultIds = draws
    .filter((d) => {
      const key = dateKeyInTz(d.drawDate);
      return key >= fromKey && key <= toKey && d.result;
    })
    .map((d) => d.result!.id);

  if (resultIds.length === 0) return 0;

  await prisma.result.deleteMany({ where: { id: { in: resultIds } } });
  return resultIds.length;
}

/** Sorteos únicos de un rango calendario (tolera drawDate legacy). */
export async function fetchDrawsForWeek(from: Date, to: Date) {
  const fromStart = dayStartInTz(from);
  const toStart = dayStartInTz(to);
  const fromKey = dateKeyInTz(fromStart);
  const toKey = dateKeyInTz(toStart);

  const raw = await prisma.draw.findMany({
    where: {
      drawDate: {
        gte: new Date(fromStart.getTime() - 12 * 60 * 60 * 1000),
        lte: new Date(toStart.getTime() + 36 * 60 * 60 * 1000),
      },
      lottery: { active: true },
    },
    include: { lottery: true, result: true },
    orderBy: { drawTime: "asc" },
  });

  return dedupeDrawsForDisplay(raw).filter((d) => {
    const key = dateKeyInTz(d.drawDate);
    return key >= fromKey && key <= toKey;
  });
}

/** Sincroniza y corrige resultados oficiales de los últimos N días. */
export async function repairWeekResults(days = 7) {
  const now = nowInTz();
  const today = dayStartInTz(now);
  const weekStart = dayStartInTz(subDays(now, days - 1));

  await Promise.all(
    Array.from({ length: days }, (_, i) => ensureDrawsForDay(dayStartInTz(subDays(now, i))))
  );

  const purged = await purgeUnverifiedResults(weekStart, today);
  const sync = await syncRecentResults(days);

  return { purged, sync };
}
