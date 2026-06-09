import { addMinutes, differenceInSeconds, startOfDay, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { prisma } from "./db";

const TZ = "America/Santo_Domingo";

function parseDrawTime(time: string, base: Date) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function pseudoResultNums(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h + seed.charCodeAt(i) * (i + 1)) % 1000;
  }
  const n = (v: number) => String(v % 100).padStart(2, "0");
  return { first: n(h), second: n(h * 3 + 7), third: n(h * 11 + 19) };
}

/** Crea/actualiza sorteos de un día. Días pasados reciben resultado demo. */
export async function ensureDrawsForDay(day: Date) {
  const now = toZonedTime(new Date(), TZ);
  const dayStart = startOfDay(day);
  const todayStart = startOfDay(now);
  const isPast = dayStart < todayStart;
  const lotteries = await prisma.lottery.findMany({ where: { active: true } });

  for (const lot of lotteries) {
    const drawAt = parseDrawTime(lot.drawTime, dayStart);
    const closesAt = addMinutes(drawAt, -lot.closeMin);
    let status: "OPEN" | "CLOSING_SOON" | "CLOSED" | "WAITING_RESULT" | "RESULT_AVAILABLE" =
      "OPEN";

    if (isPast) {
      status = "RESULT_AVAILABLE";
    } else if (now >= drawAt) {
      const result = await prisma.result.findFirst({
        where: { draw: { lotteryId: lot.id, drawDate: dayStart } },
      });
      status = result ? "RESULT_AVAILABLE" : "WAITING_RESULT";
    } else if (now >= closesAt) status = "CLOSED";
    else if (differenceInSeconds(closesAt, now) <= 600) status = "CLOSING_SOON";

    const draw = await prisma.draw.upsert({
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

    if (isPast) {
      const existing = await prisma.result.findUnique({ where: { drawId: draw.id } });
      if (!existing) {
        const nums = pseudoResultNums(`${lot.code}-${dayStart.toISOString()}`);
        await prisma.result.create({
          data: { drawId: draw.id, ...nums },
        });
      }
    }
  }
}

export async function ensureTodayDraws() {
  const now = toZonedTime(new Date(), TZ);
  await ensureDrawsForDay(startOfDay(now));
}

export async function ensureYesterdayDraws() {
  const now = toZonedTime(new Date(), TZ);
  await ensureDrawsForDay(startOfDay(subDays(now, 1)));
}

export const RESULTS_WEEK_DAYS = 7;

/** Asegura sorteos + resultados demo de los últimos N días (incluye hoy). */
export async function ensureWeekDraws(days = RESULTS_WEEK_DAYS) {
  const now = toZonedTime(new Date(), TZ);
  await Promise.all(
    Array.from({ length: days }, (_, i) =>
      ensureDrawsForDay(startOfDay(subDays(now, i)))
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
  const now = toZonedTime(new Date(), TZ);
  const today = startOfDay(now);

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
