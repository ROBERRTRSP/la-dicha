"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CajeroTicketViewModal } from "@/components/cajero/CajeroTicketViewModal";
import { cn, formatMoney } from "@/lib/utils";
import { todayMonitorDateInput } from "@/lib/cajero-monitor-date";
import {
  filterMonitorRows,
  MONITOR_STATUS_OPTIONS,
  summarizeMonitorRows,
  type MonitorStatusFilter,
  type TicketMonitorRow,
} from "@/lib/cajero-monitor-filters";

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) {
    throw new Error(
      res.status === 401
        ? "Sesión expirada. Vuelva a entrar como cajero."
        : "El servidor no devolvió datos."
    );
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Respuesta inválida del servidor.");
  }
}

function formatMonitorDate(iso: string) {
  return new Date(iso).toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function statusClass(status: string) {
  switch (status) {
    case "WINNER":
      return "cajero-monitor-status--winner";
    case "PAID":
      return "cajero-monitor-status--paid";
    case "CANCELED":
      return "cajero-monitor-status--canceled";
    case "ACTIVE":
      return "cajero-monitor-status--active";
    case "LOSER":
      return "cajero-monitor-status--loser";
    default:
      return "";
  }
}

export default function CajeroMonitorPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayMonitorDateInput);
  const [statusFilter, setStatusFilter] = useState<MonitorStatusFilter>("all");
  const [quickFilter, setQuickFilter] = useState("");
  const [rows, setRows] = useState<TicketMonitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewTicket, setViewTicket] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ date });
      const res = await fetch(`/api/cajero/monitor?${params}`, {
        credentials: "include",
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(String(data.error ?? "Error al cargar."));
      }
      setRows((data.tickets as TicketMonitorRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusFilteredRows = useMemo(
    () => filterMonitorRows(rows, statusFilter),
    [rows, statusFilter]
  );

  const displayedRows = useMemo(() => {
    const q = quickFilter.trim().toLowerCase();
    if (!q) return statusFilteredRows;
    return statusFilteredRows.filter(
      (t) =>
        t.ticketNumber.toLowerCase().includes(q) ||
        t.userLabel.toLowerCase().includes(q) ||
        String(t.totalAmount).includes(q) ||
        t.statusLabel.toLowerCase().includes(q)
    );
  }, [statusFilteredRows, quickFilter]);

  const summary = useMemo(
    () => summarizeMonitorRows(statusFilteredRows),
    [statusFilteredRows]
  );

  function onFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    void load();
  }

  async function cancelTicket(t: TicketMonitorRow) {
    if (!t.canCancel || cancelingId) return;
    const ok = window.confirm(
      `¿Cancelar el ticket ${t.ticketNumber} por ${formatMoney(t.totalAmount)}?`
    );
    if (!ok) return;

    setActionMsg("");
    setCancelingId(t.id);
    try {
      const res = await fetch("/api/cajero/tickets/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticketId: t.id }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(String(data.error ?? "No se pudo cancelar."));
      }
      setActionMsg(`Ticket ${t.ticketNumber} cancelado.`);
      if (viewTicket === t.ticketNumber) setViewTicket(null);
      await load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Error al cancelar.");
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <div className="cajero-monitor-page">
      <div className="cajero-monitor-head">
        <h1 className="admin-page-title">Monitor de tickets</h1>
        <Link href="/cajero/vender" className="cajero-monitor-back">
          ← Volver al vanquero
        </Link>
      </div>

      <form className="cajero-monitor-filter" onSubmit={onFilterSubmit}>
        <label className="cajero-monitor-date-field">
          <span>Fecha</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button type="submit" className="admin-save-btn" disabled={loading}>
          Filtrar
        </button>
      </form>

      <div className="cajero-monitor-status-tabs">
        <span className="cajero-monitor-status-tabs-label">Estado</span>
        <div className="cajero-monitor-status-btns" role="tablist" aria-label="Estado">
          {MONITOR_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === opt.value}
              className={cn(
                "cajero-monitor-status-btn",
                statusFilter === opt.value && "active"
              )}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cajero-monitor-totals">
        <p>
          <span>Monto total:</span>{" "}
          <strong>{formatMoney(summary.totalAmount)}</strong>
        </p>
        <p>
          <span>Total de premios:</span>{" "}
          <strong>{formatMoney(summary.totalPrizes)}</strong>
        </p>
        <p>
          <span>Total pendiente de pago:</span>{" "}
          <strong className="cajero-monitor-pending">
            {formatMoney(summary.totalPending)}
          </strong>
        </p>
      </div>

      <div className="cajero-monitor-quick">
        <label>
          <span>Filtro rápido</span>
          <input
            type="search"
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value)}
            placeholder="Número, cliente o código…"
          />
        </label>
      </div>

      {error && <p className="staff-error">{error}</p>}
      {actionMsg && <p className="admin-save-msg">{actionMsg}</p>}

      <div className="admin-table-wrap cajero-monitor-table-wrap">
        <table className="admin-table cajero-monitor-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Monto</th>
              <th>Premio</th>
              <th>Fecha de cancelación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="cajero-monitor-loading">
                  Cargando…
                </td>
              </tr>
            ) : displayedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="cajero-monitor-empty">
                  {rows.length === 0
                    ? "Sin tickets para esta fecha."
                    : statusFilter !== "all"
                      ? `Sin tickets en «${MONITOR_STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}».`
                      : "Ningún ticket coincide con el filtro rápido."}
                </td>
              </tr>
            ) : (
              displayedRows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.ticketNumber}</strong>
                  </td>
                  <td>{formatMonitorDate(t.createdAt)}</td>
                  <td>{t.userLabel}</td>
                  <td>{formatMoney(t.totalAmount)}</td>
                  <td className={t.totalPrize > 0 ? "win" : ""}>
                    {t.totalPrize > 0 ? formatMoney(t.totalPrize) : "—"}
                  </td>
                  <td>
                    {t.canceledAt ? formatMonitorDate(t.canceledAt) : "—"}
                  </td>
                  <td>
                    <span
                      className={`cajero-monitor-status ${statusClass(t.status)}`}
                    >
                      {t.statusLabel}
                    </span>
                  </td>
                  <td className="cajero-monitor-actions">
                    <button
                      type="button"
                      className="staff-link-btn"
                      onClick={() => setViewTicket(t.ticketNumber)}
                    >
                      Ver
                    </button>
                    {t.status !== "CANCELED" && (
                      <Link
                        href={`/cajero/vender?dup=${encodeURIComponent(t.ticketNumber)}`}
                        className="staff-link-btn"
                      >
                        Duplicar
                      </Link>
                    )}
                    {t.status === "WINNER" && (
                      <button
                        type="button"
                        className="staff-link-btn"
                        onClick={() =>
                          router.push(
                            `/cajero/tickets?q=${encodeURIComponent(t.ticketNumber)}`
                          )
                        }
                      >
                        Pagar
                      </button>
                    )}
                    {t.canCancel && (
                      <button
                        type="button"
                        className="staff-link-btn staff-link-btn--cancel"
                        disabled={cancelingId === t.id}
                        onClick={() => void cancelTicket(t)}
                      >
                        {cancelingId === t.id ? "Cancelando…" : "Cancelar"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CajeroTicketViewModal
        open={viewTicket !== null}
        ticketNumber={viewTicket}
        onClose={() => setViewTicket(null)}
        onCanceled={() => {
          setViewTicket(null);
          void load();
        }}
        onPay={
          viewTicket
            ? () => {
                setViewTicket(null);
                router.push(
                  `/cajero/tickets?q=${encodeURIComponent(viewTicket)}`
                );
              }
            : undefined
        }
      />
    </div>
  );
}
