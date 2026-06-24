import { subDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "./db";
import { dateKeyInTz, dayStartInTz, nowInTz, TZ } from "./timezone";

/** Días visibles en el historial del jugador (igual que resultados). */
export const TICKET_RETENTION_DAYS = 7;

export function ticketRetentionStart(): Date {
  return dayStartInTz(subDays(nowInTz(), TICKET_RETENTION_DAYS - 1));
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function dayTitleForKey(dateKey: string): string {
  const today = dayStartInTz();
  const target = dayStartInTz(fromZonedTime(`${dateKey}T12:00:00`, TZ));
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000)
  );
  const label = formatDayLabel(target);
  if (diffDays === 0) return `Hoy · ${label}`;
  if (diffDays === 1) return `Ayer · ${label}`;
  return label;
}

export type TicketWeekDay<T> = {
  date: string;
  dateKey: string;
  title: string;
  tickets: T[];
};

/** Ventana de 7 días (hoy → atrás), un slide por día para deslizar. */
export function buildTicketWeekDays<T extends { createdAt: string }>(
  tickets: T[]
): TicketWeekDay<T>[] {
  const now = nowInTz();
  const weekDays = Array.from({ length: TICKET_RETENTION_DAYS }, (_, i) =>
    dayStartInTz(subDays(now, i))
  );

  const map = new Map<string, T[]>();
  for (const ticket of tickets) {
    const key = dateKeyInTz(new Date(ticket.createdAt));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ticket);
  }

  return weekDays.map((day, offset) => {
    const dateKey = dateKeyInTz(day);
    const dayTickets = map.get(dateKey) ?? [];
    dayTickets.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return {
      date: day.toISOString(),
      dateKey,
      title: dayTitleForKey(dateKey),
      tickets: dayTickets,
    };
  });
}

export function isTicketWithinRetention(createdAt: Date): boolean {
  return createdAt >= ticketRetentionStart();
}

export async function purgeExpiredTickets(userId: string): Promise<number> {
  const cutoff = ticketRetentionStart();
  const result = await prisma.ticket.deleteMany({
    where: { userId, createdAt: { lt: cutoff } },
  });
  return result.count;
}

export async function getPlayerTickets(userId: string) {
  await purgeExpiredTickets(userId);
  const cutoff = ticketRetentionStart();

  return prisma.ticket.findMany({
    where: { userId, createdAt: { gte: cutoff } },
    include: {
      items: { include: { draw: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
