import { addDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { prisma } from "./db";
import {
  calcBetPayout,
  type RoulettePayoutMultipliers,
} from "./roulette-payouts";
import {
  isBetWinner,
  type RouletteBetInput,
} from "./roulette";
import type { RouletteSettingsData } from "./roulette-settings";
import { dateKeyInTz, nowInTz, TZ } from "./timezone";

export type RouletteDaySessionView = {
  sessionDate: string;
  status: "OPEN" | "CLOSED";
  totalBet: number;
  totalPaid: number;
  houseProfit: number;
  spinCount: number;
  openedAt: Date;
  closedAt: Date | null;
};

export type RoulettePlayWindow = {
  open: boolean;
  reason: string | null;
  sessionDate: string;
  sessionStatus: "OPEN" | "CLOSED";
  dailyOpenTime: string;
  dailyCloseTime: string;
  houseAlwaysWins: boolean;
  daily: RouletteDaySessionView | null;
};

/** Prisma client puede no tener el modelo si aún no se migró la BD. */
function daySessionDb() {
  const client = prisma as unknown as {
    rouletteDaySession?: {
      findUnique: (args: unknown) => Promise<unknown>;
      findMany: (args: unknown) => Promise<unknown[]>;
      create: (args: unknown) => Promise<unknown>;
      update: (args: unknown) => Promise<unknown>;
      updateMany: (args: unknown) => Promise<unknown>;
      upsert: (args: unknown) => Promise<unknown>;
    };
  };
  const model = client.rouletteDaySession;
  if (!model?.findMany) return null;
  return model;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map((x) => Number(x));
  if (!Number.isFinite(h)) return 0;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

function minutesSinceMidnightInTz(date: Date): number {
  const h = Number(formatInTimeZone(date, TZ, "H"));
  const m = Number(formatInTimeZone(date, TZ, "m"));
  return h * 60 + m;
}

export function isWithinDailyHours(
  openTime: string,
  closeTime: string,
  now: Date = new Date()
): boolean {
  const mins = minutesSinceMidnightInTz(now);
  const open = parseTimeToMinutes(openTime);
  const close = parseTimeToMinutes(closeTime);
  if (open === close) return true;
  if (open < close) return mins >= open && mins < close;
  return mins >= open || mins < close;
}

export function formatDailyCloseLabel(closeTime: string): string {
  const [h, m] = closeTime.split(":");
  const hour = Number(h);
  const min = Number(m ?? 0);
  if (!Number.isFinite(hour)) return closeTime;
  const suffix = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return min > 0 ? `${h12}:${String(min).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

export function sessionDayStartUtc(sessionDate: string): Date {
  return fromZonedTime(`${sessionDate}T00:00:00`, TZ);
}

export function sessionDayEndUtc(sessionDate: string): Date {
  const nextKey = dateKeyInTz(addDays(sessionDayStartUtc(sessionDate), 1));
  return fromZonedTime(`${nextKey}T00:00:00`, TZ);
}

function toSessionView(row: {
  sessionDate: string;
  status: string;
  totalBet: number;
  totalPaid: number;
  houseProfit: number;
  spinCount: number;
  openedAt: Date;
  closedAt: Date | null;
}): RouletteDaySessionView {
  return {
    sessionDate: row.sessionDate,
    status: row.status === "CLOSED" ? "CLOSED" : "OPEN",
    totalBet: row.totalBet,
    totalPaid: row.totalPaid,
    houseProfit: row.houseProfit,
    spinCount: row.spinCount,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
  };
}

export async function aggregateDayForSession(sessionDate: string) {
  const agg = await prisma.rouletteBet.aggregate({
    where: {
      createdAt: {
        gte: sessionDayStartUtc(sessionDate),
        lt: sessionDayEndUtc(sessionDate),
      },
    },
    _sum: { amount: true, payout: true },
    _count: true,
  });
  const totalBet = agg._sum.amount ?? 0;
  const totalPaid = agg._sum.payout ?? 0;
  return {
    totalBet,
    totalPaid,
    houseProfit: totalBet - totalPaid,
    spinCount: agg._count,
  };
}

async function aggregateDay(sessionDate: string) {
  return aggregateDayForSession(sessionDate);
}

async function buildSessionView(
  sessionDate: string,
  status: "OPEN" | "CLOSED",
  closedAt: Date | null = null
): Promise<RouletteDaySessionView> {
  const totals = await aggregateDay(sessionDate);
  return {
    sessionDate,
    status,
    ...totals,
    openedAt: sessionDayStartUtc(sessionDate),
    closedAt,
  };
}

export async function getDaySession(
  sessionDate: string
): Promise<RouletteDaySessionView | null> {
  const db = daySessionDb();
  if (db) {
    try {
      const row = (await db.findUnique({
        where: { sessionDate },
      })) as Parameters<typeof toSessionView>[0] | null;
      if (row) return toSessionView(row);
    } catch {
      /* tabla aún no existe */
    }
  }
  const totals = await aggregateDay(sessionDate);
  if (totals.spinCount === 0) return null;
  return buildSessionView(sessionDate, "OPEN");
}

/** Abre sesión del día; funciona sin tabla RouletteDaySession. */
export async function ensureTodayRouletteSession(): Promise<RouletteDaySessionView> {
  const today = dateKeyInTz(nowInTz());
  const db = daySessionDb();

  if (db) {
    try {
      const stale = (await db.findMany({
        where: { sessionDate: { not: today }, status: "OPEN" },
      })) as { id: string; sessionDate: string }[];

      for (const row of stale) {
        const { executeDailyClose } = await import("./roulette-daily-close");
        await executeDailyClose(row.sessionDate).catch(async () => {
          const totals = await aggregateDay(row.sessionDate);
          await db.update({
            where: { id: row.id },
            data: {
              status: "CLOSED",
              closedAt: new Date(),
              ...totals,
            },
          });
        });
      }

      const existing = (await db.findUnique({
        where: { sessionDate: today },
      })) as Parameters<typeof toSessionView>[0] | null;
      if (existing) return toSessionView(existing);

      const created = (await db.create({
        data: { sessionDate: today, status: "OPEN" },
      })) as Parameters<typeof toSessionView>[0];
      return toSessionView(created);
    } catch {
      /* fallback abajo */
    }
  }

  return buildSessionView(today, "OPEN");
}

/** Cierra la sesión de hoy si ya pasó la hora de cierre. */
export async function closeTodaySessionIfPastDeadline(
  settings: RouletteSettingsData
): Promise<RouletteDaySessionView> {
  const today = dateKeyInTz(nowInTz());
  const withinHours = isWithinDailyHours(
    settings.dailyOpenTime,
    settings.dailyCloseTime
  );

  if (withinHours) {
    return ensureTodayRouletteSession();
  }

  const totals = await aggregateDay(today);
  const closedAt = new Date();
  const db = daySessionDb();

  if (db) {
    try {
      await db.upsert({
        where: { sessionDate: today },
        update: { status: "CLOSED", closedAt, ...totals },
        create: { sessionDate: today, status: "CLOSED", closedAt, ...totals },
      });
    } catch {
      /* fallback abajo */
    }
  }

  return {
    sessionDate: today,
    status: "CLOSED",
    ...totals,
    openedAt: sessionDayStartUtc(today),
    closedAt,
  };
}

export async function getRoulettePlayWindow(
  settings: RouletteSettingsData
): Promise<RoulettePlayWindow> {
  const session = await closeTodaySessionIfPastDeadline(settings);
  const sessionDate = session.sessionDate;
  const withinHours = isWithinDailyHours(
    settings.dailyOpenTime,
    settings.dailyCloseTime
  );

  let open = settings.active && session.status === "OPEN" && withinHours;
  let reason: string | null = null;

  if (!settings.active) {
    open = false;
    reason = "La Ruleta está desactivada temporalmente.";
  } else if (session.status === "CLOSED" || !withinHours) {
    open = false;
    if (session.status === "CLOSED" && withinHours) {
      reason = `Cierre diario completado. La ruleta abre mañana a las ${settings.dailyOpenTime}.`;
    } else {
      const closeLabel = formatDailyCloseLabel(settings.dailyCloseTime);
      reason = `Fuera de horario. Juego diario ${settings.dailyOpenTime} – ${closeLabel}.`;
    }
  }

  return {
    open,
    reason,
    sessionDate,
    sessionStatus: open ? "OPEN" : "CLOSED",
    dailyOpenTime: settings.dailyOpenTime,
    dailyCloseTime: settings.dailyCloseTime,
    houseAlwaysWins: settings.houseAlwaysWins,
    daily: session,
  };
}

export function calcSpinTotalPayout(
  bets: RouletteBetInput[],
  winningNumber: number,
  multipliers: RoulettePayoutMultipliers
): number {
  return bets.reduce((sum, bet) => {
    const won = isBetWinner(bet.betType, bet.betChoice, winningNumber);
    return sum + calcBetPayout(bet.betType, bet.amount, won, multipliers);
  }, 0);
}

export async function recordSpinOnDailySession(
  sessionDate: string,
  stake: number,
  payout: number
): Promise<void> {
  const db = daySessionDb();
  if (!db) return;

  try {
    await db.updateMany({
      where: { sessionDate, status: "OPEN" },
      data: {
        totalBet: { increment: stake },
        totalPaid: { increment: payout },
        houseProfit: { increment: stake - payout },
        spinCount: { increment: 1 },
      },
    });
  } catch {
    /* totales se calculan desde RouletteBet */
  }
}

export async function closeRouletteDay(
  sessionDate?: string
): Promise<RouletteDaySessionView> {
  const { executeDailyClose } = await import("./roulette-daily-close");
  const key = sessionDate ?? dateKeyInTz(nowInTz());
  const closed = await executeDailyClose(key);
  return {
    sessionDate: closed.sessionDate,
    status: closed.status,
    totalBet: closed.totalBet,
    totalPaid: closed.totalPaid,
    houseProfit: closed.houseProfit,
    spinCount: closed.spinCount,
    openedAt: closed.openedAt,
    closedAt: closed.closedAt,
  };
}
