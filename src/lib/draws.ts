import { differenceInSeconds, subDays } from "date-fns";
import { prisma } from "./db";
import {
  closesAtForDraw,
  computeDrawStatus,
  drawAtInTz,
} from "./lottery-schedule";
import { dayStartInTz, nowInTz } from "./timezone";
import {
  buildOpenSuperPales,
  type OpenSuperPaleView,
} from "./super-pale";

/** Crea/actualiza sorteos de un día (sin inventar resultados). */
export async function ensureDrawsForDay(day: Date) {
  const now = new Date();
  const dayStart = dayStartInTz(day);
  const todayStart = dayStartInTz(now);
  const isPast = dayStart < todayStart;
  const lotteries = await prisma.lottery.findMany({ where: { active: true } });

  for (const lot of lotteries) {
    const drawAt = drawAtInTz(lot.drawTime, dayStart);
    const closesAt = closesAtForDraw(lot.drawTime, dayStart, lot.closeMin);
    const result = await prisma.result.findFirst({
      where: { draw: { lotteryId: lot.id, drawDate: dayStart } },
    });
    const status = computeDrawStatus(now, drawAt, closesAt, {
      isPastDay: isPast,
      hasResult: !!result,
    });

    await prisma.draw.upsert({
      where: { lotteryId_drawDate: { lotteryId: lot.id, drawDate: dayStart } },
      update: { status, closesAt, drawTime: lot.drawTime },
      create: {
        lotteryId: lot.id,
        drawDate: dayStart,
        drawTime: lot.drawTime,
        closesAt,
        status,
      },
    });
  }
}

export async function ensureTodayDraws() {
  await ensureDrawsForDay(dayStartInTz(nowInTz()));
}

export async function ensureYesterdayDraws() {
  await ensureDrawsForDay(dayStartInTz(subDays(nowInTz(), 1)));
}

export const RESULTS_WEEK_DAYS = 7;

/** Asegura registros de sorteo de los últimos N días (incluye hoy). */
export async function ensureWeekDraws(days = RESULTS_WEEK_DAYS) {
  const now = nowInTz();
  await Promise.all(
    Array.from({ length: days }, (_, i) =>
      ensureDrawsForDay(dayStartInTz(subDays(now, i)))
    )
  );
}

export type OpenDrawView = {
  id: string;
  lotteryId: string;
  lotteryCode: string;
  lotteryName: string;
  logoUrl: string | null;
  category: string;
  drawTime: string;
  closesAt: string;
  status: string;
  secondsLeft: number;
};

function compareDrawTime(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return ah * 60 + am - (bh * 60 + bm);
}

/** Solo loterías abiertas, ordenadas por hora de salida. Las que ya pasaron no aparecen. */
export async function getOpenDrawsForPlayer(): Promise<OpenDrawView[]> {
  await ensureTodayDraws();
  const now = new Date();
  const today = dayStartInTz(now);

  const draws = await prisma.draw.findMany({
    where: {
      drawDate: today,
      status: { in: ["OPEN", "CLOSING_SOON"] },
      closesAt: { gt: now },
      lottery: { active: true },
    },
    include: { lottery: true },
  });

  return draws
    .map((d) => ({
      id: d.id,
      lotteryId: d.lotteryId,
      lotteryCode: d.lottery.code,
      lotteryName: d.lottery.name,
      logoUrl: d.lottery.logoUrl,
      category: d.lottery.category,
      drawTime: d.drawTime,
      closesAt: d.closesAt.toISOString(),
      status: d.status,
      secondsLeft: Math.max(0, differenceInSeconds(d.closesAt, now)),
    }))
    .sort((a, b) => compareDrawTime(a.drawTime, b.drawTime));
}

/** Vanquero: loterías abiertas + súper palés con sorteos del día completos. */
export async function getCajeroSellDraws(): Promise<{
  draws: OpenDrawView[];
  superPales: OpenSuperPaleView[];
}> {
  const draws = await getOpenDrawsForPlayer();
  const now = new Date();
  const today = dayStartInTz(now);

  const todayRows = await prisma.draw.findMany({
    where: {
      drawDate: today,
      lottery: { active: true },
    },
    include: { lottery: true },
  });

  const todayDraws = todayRows.map((d) => ({
    id: d.id,
    lotteryCode: d.lottery.code,
    lotteryName: d.lottery.name,
    drawTime: d.drawTime,
  }));

  const superPales = buildOpenSuperPales(draws, todayDraws);
  return { draws, superPales };
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    OPEN: "Abierta",
    CLOSING_SOON: "Cierra pronto",
    CLOSED: "Cerrada",
    WAITING_RESULT: "Esperando resultado",
    RESULT_AVAILABLE: "Resultado disponible",
  };
  return map[status] ?? status;
}
