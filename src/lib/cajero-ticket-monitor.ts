import { fromZonedTime } from "date-fns-tz";
import { prisma } from "./db";
import { canCancelTicketForCajero } from "./tickets";
import {
  summarizeMonitorRows,
  type TicketMonitorRow,
  type TicketMonitorSummary,
} from "./cajero-monitor-filters";
import { dateKeyInTz, TZ } from "./timezone";

export type {
  TicketMonitorRow,
  TicketMonitorSummary,
  MonitorStatusFilter,
} from "./cajero-monitor-filters";
export {
  filterMonitorRows,
  MONITOR_STATUS_OPTIONS,
  summarizeMonitorRows,
} from "./cajero-monitor-filters";

function parseMonitorDate(dateStr: string): Date {
  const trimmed = dateStr.trim();
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

function statusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "ACTIVO";
    case "CANCELED":
      return "CANCELADO";
    case "WINNER":
      return "GANADOR";
    case "LOSER":
      return "PERDEDOR";
    case "PAID":
      return "PAGADO";
    default:
      return status;
  }
}

export async function getCajeroTicketMonitor(
  dateStr: string
): Promise<{ tickets: TicketMonitorRow[]; summary: TicketMonitorSummary }> {
  const dayStart = parseMonitorDate(dateStr);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        select: {
          prizeAmount: true,
          status: true,
          draw: { select: { status: true, closesAt: true } },
        },
      },
      user: { select: { fullName: true, username: true } },
    },
  });

  const cajeroIds = [
    ...new Set(tickets.map((t) => t.soldByCajeroId).filter(Boolean)),
  ] as string[];

  const cajeros =
    cajeroIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: cajeroIds } },
          select: { id: true, fullName: true },
        })
      : [];

  const cajeroName = new Map(cajeros.map((c) => [c.id, c.fullName]));

  const rows: TicketMonitorRow[] = tickets.map((t) => {
    const totalPrize = t.items.reduce((s, i) => s + (i.prizeAmount ?? 0), 0);
    const userLabel =
      t.customerName?.trim() ||
      (t.soldByCajeroId
        ? (cajeroName.get(t.soldByCajeroId) ?? "Cajero")
        : t.user.username === "mostrador"
          ? "Mostrador"
          : t.user.fullName);

    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      createdAt: t.createdAt.toISOString(),
      userLabel,
      totalAmount: t.totalAmount,
      totalPrize,
      canceledAt:
        t.status === "CANCELED" && t.closedAt
          ? t.closedAt.toISOString()
          : null,
      status: t.status,
      statusLabel: statusLabel(t.status),
      canCancel: canCancelTicketForCajero(
        t.status,
        t.items.map((i) => i.draw)
      ),
    };
  });

  return { tickets: rows, summary: summarizeMonitorRows(rows) };
}
