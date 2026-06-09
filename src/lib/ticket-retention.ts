import { prisma } from "./db";

/** Tiempo que permanecen tickets cancelados o cobrados antes de borrarse */
export const TICKET_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** Los 3 tickets más recientes siempre se conservan en el historial */
export const MIN_KEPT_TICKETS = 3;

const CLOSED_STATUSES = ["CANCELED", "PAID"] as const;

function closedReferenceDate(closedAt: Date | null, createdAt: Date): Date {
  return closedAt ?? createdAt;
}

export async function purgeExpiredTickets(userId: string): Promise<number> {
  const tickets = await prisma.ticket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, closedAt: true, createdAt: true },
  });

  if (tickets.length <= MIN_KEPT_TICKETS) return 0;

  const protectedIds = new Set(
    tickets.slice(0, MIN_KEPT_TICKETS).map((t) => t.id)
  );

  const cutoff = Date.now() - TICKET_RETENTION_MS;
  const toDelete = tickets.filter((t) => {
    if (protectedIds.has(t.id)) return false;
    if (!CLOSED_STATUSES.includes(t.status as (typeof CLOSED_STATUSES)[number])) {
      return false;
    }
    const ref = closedReferenceDate(t.closedAt, t.createdAt);
    return ref.getTime() < cutoff;
  });

  if (!toDelete.length) return 0;

  await prisma.ticket.deleteMany({
    where: { id: { in: toDelete.map((t) => t.id) } },
  });

  return toDelete.length;
}

export async function getPlayerTickets(userId: string) {
  await purgeExpiredTickets(userId);

  return prisma.ticket.findMany({
    where: { userId },
    include: {
      items: { include: { draw: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
