"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";
import type {
  RiskDrawDetail,
  RiskDrawRow,
  RiskHotPlay,
  RiskInventoryResult,
  RiskLevel,
  RiskSortBy,
} from "@/lib/lottery-risk";
import type { PaymentFilter } from "@/lib/admin-lottery-sales";
import { defaultRiskDate } from "@/lib/lottery-risk";

function formatTime24(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function riskClass(level: RiskLevel) {
  return `admin-risk-level admin-risk-level--${level}`;
}

function HotPlayLine({ play }: { play: RiskHotPlay | null }) {
  if (!play) return <span className="admin-risk-muted">—</span>;
  return (
    <span>
      <strong>{play.numbers}</strong> · {formatMoney(play.soldAmount)} vendidos ·
      pago {formatMoney(play.possiblePayout)}
      {play.drawLabel ? ` · ${play.drawLabel}` : ""}
    </span>
  );
}

function DrawDetailModal({
  row,
  detail,
  onClose,
}: {
  row: RiskDrawRow;
  detail: RiskDrawDetail;
  onClose: () => void;
}) {
  return (
    <div className="admin-risk-modal-backdrop" onClick={onClose}>
      <div
        className="admin-risk-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="risk-detail-title"
      >
        <header className="admin-risk-modal-head">
          <div>
            <h2 id="risk-detail-title" className="admin-risk-modal-title">
              {row.lotteryName} · {formatTime24(row.drawTime)}
            </h2>
            <p className="admin-risk-modal-sub">
              {row.statusLabel} · {row.priority} · Score {row.riskScore}
            </p>
          </div>
          <button type="button" className="admin-risk-modal-close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <p className="admin-stat-label">Vendido</p>
            <p className="admin-stat-value">{formatMoney(detail.totalSold)}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">Posible a pagar</p>
            <p className="admin-stat-value">{formatMoney(detail.totalPossiblePayout)}</p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">Mayor exposición</p>
            <p className="admin-stat-value">
              {formatMoney(detail.maxIndividualExposure)}
            </p>
          </div>
          <div className="admin-stat-card">
            <p className="admin-stat-label">Canal</p>
            <p className="admin-stat-value">
              Web {formatMoney(detail.byChannel.web)} / Cajero{" "}
              {formatMoney(detail.byChannel.cajero)}
            </p>
          </div>
        </div>

        {[
          ["Top Quinielas", detail.topQuinielas],
          ["Top Palés", detail.topPales],
          ["Top Tripletas", detail.topTripletas],
          ["Top Súper Palés", detail.topSuperPales],
        ].map(([title, rows]) =>
          (rows as RiskHotPlay[]).length > 0 ? (
            <section key={title as string} className="admin-risk-detail-block">
              <h3 className="admin-subtitle">{title as string}</h3>
              <ul className="admin-risk-hot-list">
                {(rows as RiskHotPlay[]).map((p, i) => (
                  <li key={`${p.numbers}-${i}`}>
                    <span className={riskClass(p.exceedsLimit ? "critico" : "medio")}>
                      {p.numbers}
                    </span>
                    <span>
                      {formatMoney(p.soldAmount)} · {p.plays} jug. · pago{" "}
                      {formatMoney(p.possiblePayout)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null
        )}

        {detail.byTicket.length > 0 && (
          <section className="admin-risk-detail-block">
            <h3 className="admin-subtitle">Tickets con más jugadas</h3>
            <ul className="admin-risk-hot-list">
              {detail.byTicket.map((t) => (
                <li key={t.ticketId}>
                  <strong>#{t.ticketNumber}</strong>
                  <span>
                    {t.plays} jug. · {formatMoney(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export function AdminRiskPanel() {
  const [date, setDate] = useState(defaultRiskDate);
  const [channel, setChannel] = useState<PaymentFilter>("ALL");
  const [betType, setBetType] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [category, setCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<RiskSortBy>("priority");
  const [report, setReport] = useState<RiskInventoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDraw, setSelectedDraw] = useState<RiskDrawRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date,
        channel,
        betType,
        status,
        category,
        sortBy,
      });
      const res = await fetch(`/api/admin/lottery-risk?${params}`);
      if (!res.ok) return;
      setReport((await res.json()) as RiskInventoryResult);
    } finally {
      setLoading(false);
    }
  }, [date, channel, betType, status, category, sortBy]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const detail =
    selectedDraw && report?.drawDetails[selectedDraw.drawId]
      ? report.drawDetails[selectedDraw.drawId]
      : null;

  return (
    <div className="admin-risk">
      <div className="admin-loterias-toolbar admin-risk-toolbar">
        <label className="admin-field">
          <span>Fecha</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="admin-field">
          <span>Canal</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as PaymentFilter)}
          >
            <option value="ALL">Todos</option>
            <option value="WALLET">Web</option>
            <option value="CASH">Cajero</option>
          </select>
        </label>
        <label className="admin-field">
          <span>Tipo</span>
          <select value={betType} onChange={(e) => setBetType(e.target.value)}>
            <option value="ALL">Todos</option>
            <option value="QUINIELA">Quiniela</option>
            <option value="PALE">Palé</option>
            <option value="TRIPLETA">Tripleta</option>
            <option value="SUPER_PALE">Súper palé</option>
          </select>
        </label>
        <label className="admin-field">
          <span>Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">Todos</option>
            <option value="OPEN">Abierta</option>
            <option value="CLOSING_SOON">Cierra pronto</option>
            <option value="CLOSED">Cerrada</option>
            <option value="WAITING_RESULT">Esperando resultado</option>
            <option value="RESULT_AVAILABLE">Resultado disponible</option>
          </select>
        </label>
        <label className="admin-field">
          <span>Categoría</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="ALL">Todas</option>
            <option value="DOMINICANA">Dominicana</option>
            <option value="EXTRANJERA">Extranjera</option>
          </select>
        </label>
        <label className="admin-field">
          <span>Ordenar</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as RiskSortBy)}
          >
            <option value="priority">Prioridad</option>
            <option value="hottest">Más caliente</option>
            <option value="exposure">Mayor exposición</option>
            <option value="closing">Próximo a salir</option>
            <option value="sales">Más vendido</option>
            <option value="tickets">Más tickets</option>
          </select>
        </label>
        <button type="button" className="admin-save-btn admin-loterias-refresh" onClick={() => void load()}>
          Actualizar
        </button>
      </div>

      {loading || !report ? (
        <p className="admin-loading">Calculando riesgo…</p>
      ) : (
        <>
          <div className="admin-stats-grid admin-stats-grid--wide admin-risk-summary">
            <div className="admin-stat-card">
              <p className="admin-stat-label">Riesgo total del día</p>
              <p className="admin-stat-value">{formatMoney(report.summary.totalDayExposure)}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Mayor exposición</p>
              <p className="admin-stat-value">
                {formatMoney(report.summary.maxExposureAmount)}
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Sorteo más peligroso</p>
              <p className="admin-stat-value admin-stat-value--sm">
                {report.summary.mostDangerousDraw?.name ?? "—"}
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Por cerrar</p>
              <p className="admin-stat-value">{report.summary.drawsClosingSoon}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Esperando resultado</p>
              <p className="admin-stat-value">{report.summary.drawsWaitingResult}</p>
            </div>
            <div className="admin-stat-card">
              <p className="admin-stat-label">Ventas del día</p>
              <p className="admin-stat-value">{formatMoney(report.summary.totalDaySales)}</p>
            </div>
          </div>

          <div className="admin-risk-hot-cards">
            <div className="admin-risk-hot-card">
              <p className="admin-stat-label">Número más caliente</p>
              <HotPlayLine play={report.summary.hottestQuiniela} />
            </div>
            <div className="admin-risk-hot-card">
              <p className="admin-stat-label">Palé más caliente</p>
              <HotPlayLine play={report.summary.hottestPale} />
            </div>
            <div className="admin-risk-hot-card">
              <p className="admin-stat-label">Tripleta más caliente</p>
              <HotPlayLine play={report.summary.hottestTripleta} />
            </div>
          </div>

          {report.alerts.length > 0 && (
            <div className="admin-risk-alerts">
              <h2 className="admin-subtitle">Alertas</h2>
              <ul>
                {report.alerts.map((a, i) => (
                  <li key={i} className={riskClass(a.level)}>
                    {a.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="admin-subtitle">Riesgo por sorteo</h2>
          <p className="admin-loterias-hint">
            Datos reales de tickets activos (sin anulados). Toca un sorteo para el
            inventario caliente. Actualización automática cada 60 s.
          </p>

          <div className="admin-risk-cards">
            {report.draws.length === 0 ? (
              <p className="admin-empty">Sin jugadas con los filtros actuales.</p>
            ) : (
              report.draws.map((row) => (
                <button
                  key={row.drawId}
                  type="button"
                  className={`admin-risk-card ${riskClass(row.riskLevel)}`}
                  onClick={() => setSelectedDraw(row)}
                >
                  <div className="admin-risk-card-top">
                    <div>
                      <strong>{row.lotteryName}</strong>
                      <span className="admin-risk-card-time">
                        {formatTime24(row.drawTime)}
                      </span>
                    </div>
                    <span className={`admin-risk-priority admin-risk-priority--${row.priority.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")}`}>
                      {row.priority}
                    </span>
                  </div>
                  <div className="admin-risk-card-meta">
                    <span>{row.statusLabel}</span>
                    <span>{row.timeLabel}</span>
                    <span>Score {row.riskScore}</span>
                  </div>
                  <div className="admin-risk-card-stats">
                    <span>Ventas {formatMoney(row.totalSales)}</span>
                    <span>Exposición {formatMoney(row.maxExposure)}</span>
                    <span>{row.mainChannel}</span>
                  </div>
                  {row.hotPlay && (
                    <p className="admin-risk-card-hot">
                      {row.hotPlay.betTypeLabel} <strong>{row.hotPlay.numbers}</strong> ·{" "}
                      {formatMoney(row.hotPlay.soldAmount)} · pago{" "}
                      {formatMoney(row.hotPlay.possiblePayout)}
                    </p>
                  )}
                  <p className="admin-risk-card-action">{row.recommendedAction}</p>
                </button>
              ))
            )}
          </div>

          <div className="admin-table-wrap admin-risk-table-desktop">
            <table className="admin-table admin-table--compact">
              <thead>
                <tr>
                  <th>Lotería</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Tiempo</th>
                  <th>Prioridad</th>
                  <th>Ventas</th>
                  <th>Exposición</th>
                  <th>Jugada caliente</th>
                  <th>Pago posible</th>
                  <th>Canal</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {report.draws.map((row) => (
                  <tr
                    key={row.drawId}
                    className={`admin-risk-row ${riskClass(row.riskLevel)}`}
                    onClick={() => setSelectedDraw(row)}
                  >
                    <td>{row.lotteryName}</td>
                    <td>{formatTime24(row.drawTime)}</td>
                    <td>{row.statusLabel}</td>
                    <td>{row.timeLabel}</td>
                    <td>{row.priority}</td>
                    <td>{formatMoney(row.totalSales)}</td>
                    <td>{formatMoney(row.maxExposure)}</td>
                    <td>
                      {row.hotPlay
                        ? `${row.hotPlay.betTypeLabel} ${row.hotPlay.numbers}`
                        : "—"}
                    </td>
                    <td>
                      {row.hotPlay ? formatMoney(row.hotPlay.possiblePayout) : "—"}
                    </td>
                    <td>{row.mainChannel}</td>
                    <td>{row.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="admin-risk-config-note">
            Multiplicadores: Quiniela 1º ×{report.payoutConfig.quiniela1} · Palé ×
            {report.payoutConfig.pale} · Tripleta ×{report.payoutConfig.tripleta} ·
            Límite directo {formatMoney(report.limits.maxQuinielaPerNumber)}
          </p>
        </>
      )}

      {selectedDraw && detail && (
        <DrawDetailModal
          row={selectedDraw}
          detail={detail}
          onClose={() => setSelectedDraw(null)}
        />
      )}
    </div>
  );
}
