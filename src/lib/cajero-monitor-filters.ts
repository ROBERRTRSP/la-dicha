export type TicketMonitorRow = {
  id: string;
  ticketNumber: string;
  createdAt: string;
  userLabel: string;
  totalAmount: number;
  totalPrize: number;
  canceledAt: string | null;
  status: string;
  statusLabel: string;
  canCancel: boolean;
};

export type TicketMonitorSummary = {
  totalAmount: number;
  totalPrizes: number;
  totalPending: number;
};

export type MonitorStatusFilter =
  | "all"
  | "winner"
  | "loser"
  | "pending"
  | "canceled";

export const MONITOR_STATUS_OPTIONS: {
  value: MonitorStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "Todo" },
  { value: "winner", label: "Ganadores" },
  { value: "loser", label: "Perdedores" },
  { value: "pending", label: "Pendiente" },
  { value: "canceled", label: "Cancelado" },
];

export function filterMonitorRows(
  rows: TicketMonitorRow[],
  status: MonitorStatusFilter
): TicketMonitorRow[] {
  switch (status) {
    case "winner":
      return rows.filter((t) => t.status === "WINNER" || t.status === "PAID");
    case "loser":
      return rows.filter((t) => t.status === "LOSER");
    case "pending":
      return rows.filter((t) => t.status === "WINNER");
    case "canceled":
      return rows.filter((t) => t.status === "CANCELED");
    default:
      return rows;
  }
}

export function summarizeMonitorRows(
  rows: TicketMonitorRow[]
): TicketMonitorSummary {
  const activeRows = rows.filter((t) => t.status !== "CANCELED");
  return {
    totalAmount: activeRows.reduce((s, t) => s + t.totalAmount, 0),
    totalPrizes: rows.reduce((s, t) => s + t.totalPrize, 0),
    totalPending: rows
      .filter((t) => t.status === "WINNER")
      .reduce((s, t) => s + t.totalPrize, 0),
  };
}
