"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";
import { defaultAccountingDate } from "@/lib/admin-lottery-sales";
import { AdminInventoryPanel } from "@/components/admin/AdminInventoryPanel";
import { statusLabel } from "@/lib/draws";
import type {
  AdminDrawSalesRow,
  AdminLotteryAccounting,
  PaymentFilter,
} from "@/lib/admin-lottery-sales";

function formatTime24(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export default function AdminLoteriasPage() {
  const [date, setDate] = useState(defaultAccountingDate);
  const [payment, setPayment] = useState<PaymentFilter>("ALL");
  const [selectedDrawId, setSelectedDrawId] = useState<string | null>(null);
  const [report, setReport] = useState<AdminLotteryAccounting | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date, payment });
      const res = await fetch(`/api/admin/lottery-sales?${params}`);
      if (!res.ok) return;
      const data = (await res.json()) as AdminLotteryAccounting;
      setReport(data);
      if (
        selectedDrawId &&
        !data.drawInventories.some((d) => d.drawId === selectedDrawId)
      ) {
        setSelectedDrawId(null);
      }
    } finally {
      setLoading(false);
    }
  }, [date, payment, selectedDrawId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  function selectDraw(draw: AdminDrawSalesRow) {
    setSelectedDrawId((prev) =>
      prev === draw.drawId ? null : draw.drawId
    );
  }
  const activeLotteries =
    report?.lotteries.filter((l) => l.active).length ?? 0;

  return (
    <div>
      <h1 className="admin-page-title">Loterías y contabilidad</h1>
      <p className="admin-ruleta-sub">
        Ventas y números jugados por sorteo · {activeLotteries} loterías activas
      </p>

      <div className="admin-loterias-toolbar">
        <label className="admin-field">
          <span>Fecha</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="admin-field">
          <span>Canal</span>
          <select
            value={payment}
            onChange={(e) => setPayment(e.target.value as PaymentFilter)}
          >
            <option value="ALL">Todos</option>
            <option value="WALLET">Web / billetera</option>
            <option value="CASH">Cajero</option>
          </select>
        </label>
        <button
          type="button"
          className="admin-save-btn admin-loterias-refresh"
          onClick={() => void loadReport()}
        >
          Actualizar
        </button>
      </div>

      {loading || !report ? (
        <p className="admin-loading">Cargando contabilidad…</p>
      ) : (
        <>
          <div className="admin-stats-grid admin-stats-grid--wide">
            <div className="admin-stat-card">
              <p className="admin-stat-label">Ventas totales</p>
              <p className="admin-stat-value">
                {formatMoney(report.summary.totalSales)}
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Tickets</p>
              <p className="admin-stat-value">{report.summary.totalTickets}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Jugadas</p>
              <p className="admin-stat-value">{report.summary.totalItems}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Web</p>
              <p className="admin-stat-value">
                {formatMoney(report.summary.walletSales)}
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Cajero</p>
              <p className="admin-stat-value">
                {formatMoney(report.summary.cashSales)}
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Quiniela</p>
              <p className="admin-stat-value">
                {formatMoney(report.summary.quinielaSales)}
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Palé</p>
              <p className="admin-stat-value">
                {formatMoney(report.summary.paleSales)}
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Tripleta</p>
              <p className="admin-stat-value">
                {formatMoney(report.summary.tripletaSales)}
              </p>
            </div>
          </div>

          <AdminInventoryPanel
            drawInventories={report.drawInventories}
            globalInventory={report.globalInventory}
            totalItems={report.summary.totalItems}
            selectedDrawId={selectedDrawId}
            onSelectDraw={setSelectedDrawId}
          />

          <h2 className="admin-subtitle">Ventas por sorteo</h2>
          <p className="admin-loterias-hint">
            Resumen por lotería. Toca una fila para abrir su inventario arriba.
          </p>

          <div className="admin-table-wrap">
            <table className="admin-table admin-table--clickable">
              <thead>
                <tr>
                  <th>Lotería</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Tickets</th>
                  <th>Jugadas</th>
                  <th>Ventas</th>
                  <th>Web</th>
                  <th>Cajero</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {report.draws
                  .filter((d) => d.itemCount > 0)
                  .map((d) => (
                  <tr
                    key={d.drawId}
                    className={
                      selectedDrawId === d.drawId ? "staff-row-selected" : ""
                    }
                    onClick={() => selectDraw(d)}
                  >
                    <td>
                      <strong>{d.lotteryName}</strong>
                      <span className="admin-loterias-code">{d.lotteryCode}</span>
                    </td>
                    <td>{formatTime24(d.drawTime)}</td>
                    <td>{statusLabel(d.status)}</td>
                    <td>{d.ticketCount}</td>
                    <td>{d.itemCount}</td>
                    <td>{formatMoney(d.totalSales)}</td>
                    <td>{formatMoney(d.walletSales)}</td>
                    <td>{formatMoney(d.cashSales)}</td>
                    <td>
                      {d.result
                        ? `${d.result.first} · ${d.result.second} · ${d.result.third}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="admin-subtitle">Catálogo de loterías</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Hora sorteo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {report.lotteries.map((l) => (
                  <tr key={l.code}>
                    <td>{l.code}</td>
                    <td>{l.name}</td>
                    <td>{l.category}</td>
                    <td>{formatTime24(l.drawTime)}</td>
                    <td>
                      <span
                        className={`admin-loterias-badge${
                          l.active ? " admin-loterias-badge--on" : ""
                        }`}
                      >
                        {l.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
