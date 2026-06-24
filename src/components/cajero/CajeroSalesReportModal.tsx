"use client";

import { useCallback, useEffect, useState } from "react";
import { buildSalesReportHtml } from "@/lib/cajero-sales-report-html";
import type { CajeroSalesReport } from "@/lib/cajero-sales-report";
import { todayMonitorDateInput } from "@/lib/cajero-monitor-date";
import { formatMoney } from "@/lib/utils";

function formatReportInputDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

export function CajeroSalesReportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [date, setDate] = useState(todayMonitorDateInput);
  const [report, setReport] = useState<CajeroSalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async (d: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/cajero/sales-report?date=${encodeURIComponent(d)}`,
        { credentials: "include" }
      );
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo cargar el reporte.");
      }
      setReport(data.report as CajeroSalesReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setDate(todayMonitorDateInput());
    void loadReport(todayMonitorDateInput());
  }, [open, loadReport]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function printReport() {
    if (!report) return;
    const html = buildSalesReportHtml(report);
    const w = window.open("", "_blank", "width=720,height=900");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.onload = () => {
        w.print();
        setTimeout(() => w.close(), 500);
      };
      return;
    }
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
    setTimeout(() => iframe.remove(), 2000);
  }

  if (!open) return null;

  return (
    <div
      className="cajero-vq-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="cajero-vq-modal cajero-vq-modal--report"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="cajero-report-title"
      >
        <header className="cajero-vq-modal-head">
          <h2 id="cajero-report-title">Reporte de ventas</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="cajero-vq-modal-body cajero-report-body">
          <form
            className="cajero-report-date-form"
            onSubmit={(e) => {
              e.preventDefault();
              void loadReport(date);
            }}
          >
            <label>
              <span>Fecha</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <button type="submit" className="cajero-vq-modal-link-btn" disabled={loading}>
              Actualizar
            </button>
          </form>

          {loading && <p className="cajero-vq-modal-note">Cargando reporte…</p>}
          {error && <p className="cajero-vq-modal-error">{error}</p>}

          {report && !error && (
            <>
              <div className="cajero-report-summary">
                <p>
                  Balance a la fecha:{" "}
                  <strong>{formatMoney(report.balanceAtDate)}</strong>
                </p>
                <p>
                  Tickets pendientes:{" "}
                  <strong>{formatMoney(report.pendingAmount)}</strong>
                </p>
                <p>
                  Banca <strong>{report.bancaName}</strong> · Código{" "}
                  <strong>{report.terminalCode}</strong>
                </p>
                <div className="cajero-report-counters">
                  <span>Pendiente {report.pendingCount}</span>
                  <span>Perdedores {report.losersCount}</span>
                  <span>Ganadores {report.winnersCount}</span>
                  <span>Total {report.totalTickets}</span>
                </div>
                <table className="cajero-report-mini-table">
                  <tbody>
                    <tr>
                      <td>Venta</td>
                      <td>{formatMoney(report.sales)}</td>
                    </tr>
                    <tr>
                      <td>Comisiones</td>
                      <td>{formatMoney(report.commissions)}</td>
                    </tr>
                    <tr>
                      <td>Premios</td>
                      <td>{formatMoney(report.prizes)}</td>
                    </tr>
                    <tr>
                      <td>Neto</td>
                      <td>{formatMoney(report.net)}</td>
                    </tr>
                    <tr>
                      <td>Balance</td>
                      <td>{formatMoney(report.balance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="cajero-report-section">Totales por sorteo</h3>
              <div className="cajero-report-table-wrap">
                <table className="cajero-report-table">
                  <thead>
                    <tr>
                      <th>Sorteo</th>
                      <th>Venta</th>
                      <th>Com.</th>
                      <th>Premios</th>
                      <th>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.draws.map((d) => (
                      <tr key={d.lotteryCode}>
                        <td>{d.lotteryName}</td>
                        <td>{d.sales.toFixed(2)}</td>
                        <td>{d.commission.toFixed(2)}</td>
                        <td>{d.prizes.toFixed(2)}</td>
                        <td>{d.net.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="cajero-report-total-row">
                      <td>Total</td>
                      <td>{report.sales.toFixed(2)}</td>
                      <td>{report.commissions.toFixed(2)}</td>
                      <td>{report.prizes.toFixed(2)}</td>
                      <td>{report.net.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="cajero-report-section">Tickets ganadores</h3>
              <div className="cajero-report-table-wrap">
                <table className="cajero-report-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Ticket</th>
                      <th>A pagar</th>
                      <th>Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.winnerTickets.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="cajero-report-empty">
                          No hay información disponible
                        </td>
                      </tr>
                    ) : (
                      report.winnerTickets.map((t) => (
                        <tr key={t.ticketNumber}>
                          <td>
                            {new Date(t.createdAt).toLocaleString("es-DO", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td>{t.ticketNumber}</td>
                          <td>{t.toPay.toFixed(2)}</td>
                          <td>{t.paid.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <h3 className="cajero-report-section">Números ganadores</h3>
              <div className="cajero-report-table-wrap">
                <table className="cajero-report-table">
                  <thead>
                    <tr>
                      <th>Sorteo</th>
                      <th>1ra</th>
                      <th>2da</th>
                      <th>3ra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.winnerNumbers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="cajero-report-empty">
                          Sin resultados confirmados
                        </td>
                      </tr>
                    ) : (
                      report.winnerNumbers.map((w) => (
                        <tr key={`${w.lotteryCode}-${w.first}`}>
                          <td>{w.shortLabel}</td>
                          <td>{w.first}</td>
                          <td>{w.second}</td>
                          <td>{w.third}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <p className="cajero-vq-modal-note">
                Fecha del reporte: {formatReportInputDate(report.date)}
              </p>
            </>
          )}
        </div>

        {report && !error && (
          <footer className="cajero-vq-modal-foot">
            <button
              type="button"
              className="cajero-vq-modal-link-btn"
              onClick={printReport}
            >
              Imprimir reporte
            </button>
            <button type="button" className="cajero-vq-modal-link-btn" onClick={onClose}>
              Cerrar
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
