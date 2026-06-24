"use client";

import { useEffect, useMemo, useState } from "react";
import { BET_TYPE_LABELS, type RouletteBetType } from "@/lib/roulette";
import { summarizeSpinBets } from "@/lib/roulette-spin-group";
import { formatMoney } from "@/lib/utils";
import { RewardPoolSection } from "./RewardPoolSection";

type DailyPanel = {
  sessionDate: string;
  status: string;
  totalBet: number;
  totalPaid: number;
  houseProfit: number;
  profitPercentActual: number;
  targetPercent: number;
  minPercent: number;
  maxPercent: number;
  expectedProfit: number;
  closeStatus: string;
  excessReturned: number;
  projectedExcessReturn: number;
  closeStatusPreview: string;
};

type CloseRow = {
  sessionDate: string;
  status: string;
  totalBet: number;
  totalPaid: number;
  houseProfit: number;
  realProfitPct: number;
  minProfitPct: number;
  maxProfitPct: number;
  excessReturned: number;
  closeStatus: string;
  adjustmentCount: number;
};

type PlayerAdjustment = {
  id: string;
  username: string;
  fullName: string;
  amount: number;
  adjustmentType: string;
  playerLoss: number;
  playerBet: number;
  playerPaid: number;
};

type PlayerSummary = {
  userId: string;
  username: string;
  fullName: string;
  totalBet: number;
  totalPayout: number;
  netProfit: number;
  wins: number;
  losses: number;
  bets: number;
};

type AdminBet = {
  id: string;
  spinId: string | null;
  betType: string;
  betChoice: string;
  amount: number;
  winningNumber: number;
  payout: number;
  profit: number;
  result: string;
  createdAt: string;
  user: { username: string; fullName: string };
};

type AdminSpin = {
  key: string;
  spinId: string | null;
  winningNumber: number;
  createdAt: string;
  betCount: number;
  totalStake: number;
  totalPayout: number;
  totalProfit: number;
  wonCount: number;
  result: "WIN" | "LOSE" | "MIXED";
  legacyManipulated: boolean;
  user: { username: string; fullName: string };
  bets: AdminBet[];
};

const ADJUSTMENT_TYPES = [
  { value: "BALANCE_CREDIT", label: "Crédito en balance" },
  { value: "BONUS", label: "Bono promocional" },
  { value: "CASHBACK", label: "Cashback disponible" },
] as const;

function betLabel(betType: string, betChoice: string): string {
  const label = BET_TYPE_LABELS[betType as RouletteBetType] ?? betType;
  if (betType === "STRAIGHT") return `${label} · ${betChoice}`;
  return label;
}

function spinResultLabel(result: AdminSpin["result"]): string {
  if (result === "WIN") return "Ganó";
  if (result === "MIXED") return "Parcial";
  return "Perdió";
}

function closeStatusLabel(status: string): string {
  switch (status) {
    case "OK":
      return "OK";
    case "OVER_TARGET":
      return "Sobre meta";
    case "UNDER_TARGET":
      return "Bajo meta";
    case "OPEN":
      return "Abierto";
    default:
      return status;
  }
}

function matchesClientQuery(
  fullName: string,
  username: string,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    fullName.toLowerCase().includes(q) || username.toLowerCase().includes(q)
  );
}

function ClientSearchBar({
  id,
  value,
  onChange,
  options,
  filteredCount,
  totalCount,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { fullName: string; username: string }[];
  filteredCount: number;
  totalCount: number;
}) {
  const active = value.trim().length > 0;

  return (
    <div className="admin-client-search">
      <label htmlFor={id} className="admin-client-search__label">
        Buscar cliente
      </label>
      <div className="admin-client-search__row">
        <input
          id={id}
          type="search"
          className="admin-client-search__input"
          list={`${id}-list`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nombre o usuario…"
          autoComplete="off"
        />
        <datalist id={`${id}-list`}>
          {options.map((c) => (
            <option key={c.username} value={c.fullName}>
              @{c.username}
            </option>
          ))}
        </datalist>
        {active ? (
          <button
            type="button"
            className="admin-client-search__clear"
            onClick={() => onChange("")}
            aria-label="Limpiar búsqueda"
          >
            Limpiar
          </button>
        ) : null}
      </div>
      {active ? (
        <p className="admin-client-search__count">
          {filteredCount} de {totalCount}{" "}
          {totalCount === 1 ? "registro" : "registros"}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminRuletaPage() {
  const [active, setActive] = useState(true);
  const [minPct, setMinPct] = useState(1);
  const [maxPct, setMaxPct] = useState(8);
  const [targetPct, setTargetPct] = useState(3);
  const [autoAdjustment, setAutoAdjustment] = useState(true);
  const [adjustmentType, setAdjustmentType] = useState("BALANCE_CREDIT");
  const [daily, setDaily] = useState<DailyPanel | null>(null);
  const [closeHistory, setCloseHistory] = useState<CloseRow[]>([]);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [spins, setSpins] = useState<AdminSpin[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [closeAction, setCloseAction] = useState<string | null>(null);
  const [tab, setTab] = useState<"resumen" | "cierres" | "config">("resumen");
  const [clientSearch, setClientSearch] = useState("");
  const [spinDetail, setSpinDetail] = useState<AdminSpin | null>(null);
  const [adjustmentsModal, setAdjustmentsModal] = useState<{
    date: string;
    rows: PlayerAdjustment[];
  } | null>(null);

  function applyPanel(data: Record<string, unknown>) {
    if (data.active !== undefined) setActive(data.active !== false);
    if (typeof data.dailyMinProfitPct === "number") setMinPct(data.dailyMinProfitPct);
    if (typeof data.dailyMaxProfitPct === "number") setMaxPct(data.dailyMaxProfitPct);
    if (typeof data.dailyTargetProfitPct === "number") {
      setTargetPct(data.dailyTargetProfitPct);
    }
    if (data.autoAdjustmentEnabled !== undefined) {
      setAutoAdjustment(data.autoAdjustmentEnabled !== false);
    }
    if (typeof data.adjustmentType === "string") {
      setAdjustmentType(data.adjustmentType);
    }
    if (data.daily) setDaily(data.daily as DailyPanel);
    if (Array.isArray(data.closeHistory)) {
      setCloseHistory(data.closeHistory as CloseRow[]);
    }
    if (Array.isArray(data.players)) setPlayers(data.players as PlayerSummary[]);
    if (Array.isArray(data.spins)) setSpins(data.spins as AdminSpin[]);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roulette");
      if (!res.ok) return;
      applyPanel(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleActive() {
    setToggling(true);
    try {
      const res = await fetch("/api/admin/roulette", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (res.ok) applyPanel(await res.json());
    } finally {
      setToggling(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/admin/roulette", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyMinProfitPct: minPct,
          dailyMaxProfitPct: maxPct,
          dailyTargetProfitPct: targetPct,
          autoAdjustmentEnabled: autoAdjustment,
          adjustmentType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveMsg("Configuración guardada.");
        applyPanel(data);
      } else {
        setSaveMsg(data.error ?? "Error al guardar.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function runClose(
    sessionDate: string,
    action: "execute" | "recalculate" | "reopen"
  ) {
    setCloseAction(`${action}-${sessionDate}`);
    try {
      const res = await fetch("/api/admin/roulette/daily-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionDate, action }),
      });
      const data = await res.json();
      if (res.ok) {
        await load();
      } else {
        alert(data.error ?? "Error en cierre.");
      }
    } finally {
      setCloseAction(null);
    }
  }

  async function viewAdjustments(sessionDate: string) {
    const res = await fetch(
      `/api/admin/roulette/daily-close?sessionDate=${encodeURIComponent(sessionDate)}`
    );
    if (!res.ok) return;
    const data = await res.json();
    setAdjustmentsModal({ date: sessionDate, rows: data.adjustments ?? [] });
  }

  const statusOpen = daily?.status !== "CLOSED";

  const clientOptions = useMemo(() => {
    const map = new Map<string, { fullName: string; username: string }>();
    for (const p of players) {
      map.set(p.username, { fullName: p.fullName, username: p.username });
    }
    for (const s of spins) {
      if (!map.has(s.user.username)) {
        map.set(s.user.username, s.user);
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "es")
    );
  }, [players, spins]);

  const filteredPlayers = useMemo(
    () =>
      players.filter((p) =>
        matchesClientQuery(p.fullName, p.username, clientSearch)
      ),
    [players, clientSearch]
  );

  const filteredSpins = useMemo(
    () =>
      spins.filter((s) =>
        matchesClientQuery(s.user.fullName, s.user.username, clientSearch)
      ),
    [spins, clientSearch]
  );

  return (
    <div className="admin-ruleta">
      <div className="admin-ruleta-head">
        <div>
          <h1 className="admin-page-title">Ruleta Europea</h1>
          <p className="admin-ruleta-sub">
            Giros aleatorios y auditables. El control de ganancia se aplica al
            cierre del día.
          </p>
        </div>
        <button
          type="button"
          className={`admin-toggle${active ? " on" : ""}`}
          onClick={() => void toggleActive()}
          disabled={toggling}
        >
          {active ? "Activa" : "Desactivada"}
        </button>
      </div>

      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab${tab === "resumen" ? " active" : ""}`}
          onClick={() => setTab("resumen")}
        >
          Resumen
        </button>
        <button
          type="button"
          className={`admin-tab${tab === "cierres" ? " active" : ""}`}
          onClick={() => setTab("cierres")}
        >
          Cierres e historial
        </button>
        <button
          type="button"
          className={`admin-tab${tab === "config" ? " active" : ""}`}
          onClick={() => setTab("config")}
        >
          Configuración
        </button>
      </div>

      {/* ---------- RESUMEN ---------- */}
      {tab === "resumen" && (
        <>
          {loading ? (
            <p className="admin-loading">Cargando resumen del día…</p>
          ) : daily ? (
            <section className="admin-ruleta-summary-card">
              <div className="admin-ruleta-status-row">
                <div>
                  <span className="admin-ruleta-date-label">Día</span>
                  <strong className="admin-ruleta-date">{daily.sessionDate}</strong>
                </div>
                <span
                  className={`admin-status-badge admin-status-badge--${
                    statusOpen ? "open" : "closed"
                  }`}
                >
                  {statusOpen ? "Abierto" : "Cerrado"} ·{" "}
                  {closeStatusLabel(daily.closeStatus)}
                </span>
              </div>

              <div className="admin-stats-grid admin-stats-grid--wide">
                <div className="admin-stat-card">
                  <span className="admin-stat-label">Apostado hoy</span>
                  <strong className="admin-stat-value">
                    {formatMoney(daily.totalBet)}
                  </strong>
                </div>
                <div className="admin-stat-card">
                  <span className="admin-stat-label">Pagado en premios</span>
                  <strong className="admin-stat-value">
                    {formatMoney(daily.totalPaid)}
                  </strong>
                </div>
                <div className="admin-stat-card">
                  <span className="admin-stat-label">Ganancia casa</span>
                  <strong className="admin-stat-value">
                    {formatMoney(daily.houseProfit)}
                  </strong>
                </div>
                <div className="admin-stat-card">
                  <span className="admin-stat-label">
                    % real (meta {daily.targetPercent}%)
                  </span>
                  <strong className="admin-stat-value">
                    {daily.profitPercentActual.toFixed(2)}%
                  </strong>
                </div>
              </div>

              {daily.excessReturned > 0 && (
                <p className="admin-ruleta-info-line">
                  Exceso devuelto a jugadores:{" "}
                  <strong>{formatMoney(daily.excessReturned)}</strong>
                </p>
              )}
              {statusOpen &&
                daily.closeStatusPreview === "OVER_TARGET" &&
                daily.projectedExcessReturn > 0 && (
                  <p className="admin-ruleta-over-target">
                    Al cerrar el día se devolvería ~
                    {formatMoney(daily.projectedExcessReturn)} a los jugadores
                    perdedores (exceso sobre el {daily.maxPercent}%).
                  </p>
                )}

              <div className="admin-ruleta-actions-row">
                {statusOpen ? (
                  <button
                    type="button"
                    className="admin-save-btn admin-save-btn--secondary"
                    disabled={closeAction !== null}
                    onClick={() => void runClose(daily.sessionDate, "execute")}
                  >
                    {closeAction === `execute-${daily.sessionDate}`
                      ? "Cerrando…"
                      : "Cerrar día ahora"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-save-btn"
                    disabled={closeAction !== null}
                    onClick={() => void runClose(daily.sessionDate, "reopen")}
                  >
                    {closeAction === `reopen-${daily.sessionDate}`
                      ? "Reabriendo…"
                      : "Reabrir día (que vuelvan a jugar)"}
                  </button>
                )}
              </div>
              <p className="admin-ruleta-hint">
                El cierre se ejecuta solo al final del día. Ciérralo manualmente
                únicamente cuando ya nadie vaya a jugar.
              </p>
            </section>
          ) : null}

          <section className="admin-ruleta-history">
            <h2 className="admin-subtitle">Jugadores de hoy</h2>
            {!loading && players.length > 0 ? (
              <ClientSearchBar
                id="ruleta-players-search"
                value={clientSearch}
                onChange={setClientSearch}
                options={clientOptions}
                filteredCount={filteredPlayers.length}
                totalCount={players.length}
              />
            ) : null}
            {loading ? (
              <p className="admin-loading">Cargando…</p>
            ) : players.length === 0 ? (
              <p className="admin-empty">Sin jugadas hoy.</p>
            ) : filteredPlayers.length === 0 ? (
              <p className="admin-empty">
                Ningún jugador coincide con «{clientSearch.trim()}».
              </p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table admin-table--compact">
                  <thead>
                    <tr>
                      <th>Jugador</th>
                      <th>Apostado</th>
                      <th>Premios</th>
                      <th>Neto</th>
                      <th>Ganó</th>
                      <th>Perdió</th>
                      <th>Jugadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((p) => (
                      <tr key={p.userId}>
                        <td>
                          {p.fullName}
                          <span className="admin-client-search__username">
                            @{p.username}
                          </span>
                        </td>
                        <td>{formatMoney(p.totalBet)}</td>
                        <td>{formatMoney(p.totalPayout)}</td>
                        <td className={p.netProfit >= 0 ? "win" : "lose"}>
                          {formatMoney(p.netProfit)}
                        </td>
                        <td>{p.wins}</td>
                        <td>{p.losses}</td>
                        <td>{p.bets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ---------- CIERRES E HISTORIAL ---------- */}
      {tab === "cierres" && (
        <section className="admin-ruleta-history">
          <h2 className="admin-subtitle">Cierres diarios</h2>
          {loading ? (
            <p className="admin-loading">Cargando…</p>
          ) : closeHistory.length === 0 ? (
            <p className="admin-empty">Sin cierres registrados.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--compact">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Apostado</th>
                    <th>Pagado</th>
                    <th>Ganancia</th>
                    <th>% real</th>
                    <th>Rango</th>
                    <th>Exceso</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {closeHistory.map((row) => (
                    <tr key={row.sessionDate}>
                      <td>{row.sessionDate}</td>
                      <td>{formatMoney(row.totalBet)}</td>
                      <td>{formatMoney(row.totalPaid)}</td>
                      <td>{formatMoney(row.houseProfit)}</td>
                      <td>{row.realProfitPct.toFixed(2)}%</td>
                      <td>
                        {row.minProfitPct}–{row.maxProfitPct}%
                      </td>
                      <td>{formatMoney(row.excessReturned)}</td>
                      <td>{closeStatusLabel(row.closeStatus)}</td>
                      <td className="admin-table-actions">
                        <button
                          type="button"
                          className="admin-btn-sm"
                          disabled={closeAction !== null}
                          onClick={() => void runClose(row.sessionDate, "execute")}
                        >
                          {closeAction === `execute-${row.sessionDate}`
                            ? "…"
                            : "Cerrar"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn-sm"
                          disabled={closeAction !== null}
                          onClick={() =>
                            void runClose(row.sessionDate, "recalculate")
                          }
                        >
                          {closeAction === `recalculate-${row.sessionDate}`
                            ? "…"
                            : "Recalcular"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn-sm"
                          onClick={() => void viewAdjustments(row.sessionDate)}
                        >
                          Ajustes
                        </button>
                        {row.status === "CLOSED" && (
                          <button
                            type="button"
                            className="admin-btn-sm admin-btn-sm--reopen"
                            disabled={closeAction !== null}
                            onClick={() =>
                              void runClose(row.sessionDate, "reopen")
                            }
                          >
                            {closeAction === `reopen-${row.sessionDate}`
                              ? "…"
                              : "Reabrir"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="admin-subtitle">Historial de giros (hoy)</h2>
          <p className="admin-ruleta-sub">
            Un giro = una ruleta, aunque el jugador haya apostado varias casillas.
            Los giros con salió 0 y rojo+negro son del modo antiguo.
          </p>
          {!loading && spins.length > 0 ? (
            <ClientSearchBar
              id="ruleta-spins-search"
              value={clientSearch}
              onChange={setClientSearch}
              options={clientOptions}
              filteredCount={filteredSpins.length}
              totalCount={spins.length}
            />
          ) : null}
          {loading ? (
            <p className="admin-loading">Cargando…</p>
          ) : spins.length === 0 ? (
            <p className="admin-empty">Sin giros registrados hoy.</p>
          ) : filteredSpins.length === 0 ? (
            <p className="admin-empty">
              Ningún giro coincide con «{clientSearch.trim()}».
            </p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--compact">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Jugador</th>
                    <th>Apuestas</th>
                    <th>Resumen</th>
                    <th>Apostado</th>
                    <th>Salió</th>
                    <th>Resultado</th>
                    <th>Premio</th>
                    <th>Neto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpins.map((s) => (
                    <tr key={s.key}>
                      <td>
                        {new Date(s.createdAt).toLocaleString("es-DO", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td>
                        {s.user.fullName}
                        <span className="admin-client-search__username">
                          @{s.user.username}
                        </span>
                      </td>
                      <td>{s.betCount}</td>
                      <td>{summarizeSpinBets(s.bets)}</td>
                      <td>{formatMoney(s.totalStake)}</td>
                      <td>
                        {s.winningNumber}
                        {s.legacyManipulated && (
                          <span
                            className="admin-ruleta-legacy-tag"
                            title="Giro antiguo con número forzado"
                          >
                            {" "}
                            *
                          </span>
                        )}
                      </td>
                      <td
                        className={
                          s.result === "WIN"
                            ? "win"
                            : s.result === "MIXED"
                              ? ""
                              : "lose"
                        }
                      >
                        {spinResultLabel(s.result)}
                      </td>
                      <td>{formatMoney(s.totalPayout)}</td>
                      <td className={s.totalProfit >= 0 ? "win" : "lose"}>
                        {formatMoney(s.totalProfit)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn-sm"
                          onClick={() => setSpinDetail(s)}
                        >
                          Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ---------- CONFIGURACIÓN ---------- */}
      {tab === "config" && (
        <>
          <section className="admin-ruleta-profit-card">
            <h2 className="admin-subtitle">Rango de ganancia diaria</h2>
            <p className="admin-ruleta-sub">
              Si la ganancia real supera el máximo, se devuelve el exceso a
              jugadores perdedores. Si queda bajo el mínimo, no se quita dinero.
            </p>

            <div className="admin-ruleta-settings-grid">
              <label className="admin-field admin-field--profit">
                <span>% mínimo</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={minPct}
                  onChange={(e) => setMinPct(Number(e.target.value) || 0)}
                />
              </label>
              <label className="admin-field admin-field--profit">
                <span>% máximo</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={maxPct}
                  onChange={(e) => setMaxPct(Number(e.target.value) || 0)}
                />
              </label>
              <label className="admin-field admin-field--profit">
                <span>% meta</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={targetPct}
                  onChange={(e) => setTargetPct(Number(e.target.value) || 0)}
                />
              </label>
            </div>

            <label className="admin-field">
              <span>Tipo de ajuste al cierre</span>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value)}
              >
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-checkbox">
              <input
                type="checkbox"
                checked={autoAdjustment}
                onChange={(e) => setAutoAdjustment(e.target.checked)}
              />
              Ajuste automático al cierre (devolver exceso)
            </label>

            <button
              type="button"
              className="admin-save-btn"
              onClick={() => void saveSettings()}
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar configuración"}
            </button>
            {saveMsg && <p className="admin-save-msg">{saveMsg}</p>}
          </section>

          <RewardPoolSection />
        </>
      )}

      {spinDetail && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={() => setSpinDetail(null)}
        >
          <div
            className="admin-modal"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              Giro — salió {spinDetail.winningNumber}
              {spinDetail.spinId && (
                <span className="admin-ruleta-spin-id">
                  {" "}
                  ({spinDetail.spinId.slice(0, 8)}…)
                </span>
              )}
            </h3>
            <p className="admin-ruleta-sub">
              {spinDetail.user.fullName} · {spinDetail.betCount} apuesta(s) ·{" "}
              {formatMoney(spinDetail.totalStake)} apostado
            </p>
            <table className="admin-table admin-table--compact">
              <thead>
                <tr>
                  <th>Apuesta</th>
                  <th>Monto</th>
                  <th>Resultado</th>
                  <th>Premio</th>
                  <th>Neto</th>
                </tr>
              </thead>
              <tbody>
                {spinDetail.bets.map((b) => (
                  <tr key={b.id}>
                    <td>{betLabel(b.betType, b.betChoice)}</td>
                    <td>{formatMoney(b.amount)}</td>
                    <td className={b.result === "WIN" ? "win" : "lose"}>
                      {b.result === "WIN" ? "Ganó" : "Perdió"}
                    </td>
                    <td>{formatMoney(b.payout)}</td>
                    <td className={b.profit >= 0 ? "win" : "lose"}>
                      {formatMoney(b.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="admin-save-btn"
              onClick={() => setSpinDetail(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {adjustmentsModal && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={() => setAdjustmentsModal(null)}
        >
          <div
            className="admin-modal"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Ajustes — {adjustmentsModal.date}</h3>
            {adjustmentsModal.rows.length === 0 ? (
              <p className="admin-empty">Sin ajustes para este día.</p>
            ) : (
              <table className="admin-table admin-table--compact">
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th>Pérdida</th>
                    <th>Monto devuelto</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustmentsModal.rows.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {a.fullName} ({a.username})
                      </td>
                      <td>{formatMoney(a.playerLoss)}</td>
                      <td>{formatMoney(a.amount)}</td>
                      <td>{a.adjustmentType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button
              type="button"
              className="admin-save-btn"
              onClick={() => setAdjustmentsModal(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
