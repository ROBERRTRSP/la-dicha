"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";

type RewardsPanel = {
  rewardSystemActive: boolean;
  poolDate: string;
  config: {
    housePercent: number;
    promoPercent: number;
    rewardIntervalMinutes: number;
    maxRewardPercentOfPromoPool: number;
    minSpinsToQualify: number;
    minBetAmountToQualify: number;
    cashbackAfterLosses: number;
    cashbackPercent: number;
    maxCashbackAmount: number;
    spinWeight: number;
    dailyMissionBetAmount: number;
    dailyMissionBonus: number;
    activePlayerBonusPercent: number;
  };
  pool: {
    currentPromoBalance: number;
    totalPromoCollected: number;
    totalPromoPaid: number;
    totalMainCollected: number;
    totalHouseFee: number;
    percentUsed: number;
  };
  nextRunAt: string;
  eligible: {
    userId: string;
    username: string;
    fullName: string;
    totalBet: number;
    spinCount: number;
    consecutiveLosingSpins: number;
    weight: number;
  }[];
  rewardsToday: {
    id: string;
    username: string;
    fullName: string;
    rewardType: string;
    amount: number;
    reason: string;
    status: string;
    createdAt: string;
  }[];
  summary: {
    rewardsCount: number;
    totalPaidToday: number;
    cashbackToday: number;
    missionsToday: number;
    activeBonusToday: number;
  };
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  CASHBACK: "Cashback",
  ACTIVE_PLAYER_BONUS: "Bono actividad",
  MISSION: "Misión",
  JACKPOT: "Jackpot",
  FREE_SPIN: "Giro gratis",
};

type NumField = keyof RewardsPanel["config"];

export function RewardPoolSection() {
  const [panel, setPanel] = useState<RewardsPanel | null>(null);
  const [cfg, setCfg] = useState<RewardsPanel["config"] | null>(null);
  const [systemActive, setSystemActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roulette/rewards");
      if (!res.ok) return;
      const data = (await res.json()) as RewardsPanel;
      setPanel(data);
      setCfg(data.config);
      setSystemActive(data.rewardSystemActive);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function setField(field: NumField, value: number) {
    setCfg((c) => (c ? { ...c, [field]: value } : c));
  }

  async function saveConfig() {
    if (!cfg) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/roulette", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardSystemActive: systemActive, ...cfg }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Configuración del pozo guardada.");
        await load();
      } else {
        setMsg(data.error ?? "Error al guardar.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunning(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/roulette/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      const data = await res.json();
      if (res.ok) {
        const r = data.result;
        setMsg(
          r.ran
            ? `Reparto ejecutado: ${formatMoney(r.totalPaid)} a ${r.rewardsCreated} premio(s).`
            : `Sin reparto: ${r.reason ?? "—"}`
        );
        if (data.panel) {
          setPanel(data.panel);
          setCfg(data.panel.config);
          setSystemActive(data.panel.rewardSystemActive);
        } else {
          await load();
        }
      } else {
        setMsg(data.error ?? "Error al ejecutar reparto.");
      }
    } finally {
      setRunning(false);
    }
  }

  const numFields: { key: NumField; label: string; step?: number }[] = [
    { key: "housePercent", label: "% casa (cobra primero)", step: 0.5 },
    { key: "promoPercent", label: "% al pozo promocional", step: 1 },
    { key: "rewardIntervalMinutes", label: "Intervalo (min)", step: 1 },
    { key: "maxRewardPercentOfPromoPool", label: "% máx pozo por reparto", step: 1 },
    { key: "minSpinsToQualify", label: "Mín. giros para calificar", step: 1 },
    { key: "minBetAmountToQualify", label: "Mín. apostado", step: 1 },
    { key: "cashbackAfterLosses", label: "Pérdidas seguidas → cashback", step: 1 },
    { key: "cashbackPercent", label: "% cashback", step: 1 },
    { key: "maxCashbackAmount", label: "Cashback máx", step: 1 },
    { key: "spinWeight", label: "Peso por giro", step: 0.5 },
    { key: "dailyMissionBetAmount", label: "Misión: apostar", step: 1 },
    { key: "dailyMissionBonus", label: "Misión: bono", step: 1 },
    { key: "activePlayerBonusPercent", label: "% bono activo", step: 1 },
  ];

  return (
    <section className="admin-ruleta-history admin-reward-pool">
      <div className="admin-ruleta-head">
        <div>
          <h2 className="admin-subtitle" style={{ marginTop: 0 }}>
            Premios del pozo
          </h2>
          <p className="admin-ruleta-sub">
            Los premios programados salen del pozo promocional, nunca de la banca
            y sin alterar el resultado del giro. La casa cobra su % primero.
          </p>
        </div>
        <button
          type="button"
          className={`admin-toggle${systemActive ? " on" : ""}`}
          onClick={() => setSystemActive((v) => !v)}
        >
          {systemActive ? "Activo" : "Pausado"}
        </button>
      </div>

      {loading ? (
        <p className="admin-loading">Cargando pozo…</p>
      ) : panel ? (
        <>
          <div className="admin-stats-grid admin-stats-grid--wide">
            <div className="admin-stat-card">
              <span className="admin-stat-label">Fondo promocional</span>
              <strong className="admin-stat-value">
                {formatMoney(panel.pool.currentPromoBalance)}
              </strong>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Recaudado promo (hoy)</span>
              <strong className="admin-stat-value">
                {formatMoney(panel.pool.totalPromoCollected)}
              </strong>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Pagado promo (hoy)</span>
              <strong className="admin-stat-value">
                {formatMoney(panel.pool.totalPromoPaid)}
              </strong>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">% del pozo usado</span>
              <strong className="admin-stat-value">{panel.pool.percentUsed}%</strong>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Comisión casa (hoy)</span>
              <strong className="admin-stat-value">
                {formatMoney(panel.pool.totalHouseFee)}
              </strong>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Cashback (hoy)</span>
              <strong className="admin-stat-value">
                {formatMoney(panel.summary.cashbackToday)}
              </strong>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Bono actividad (hoy)</span>
              <strong className="admin-stat-value">
                {formatMoney(panel.summary.activeBonusToday)}
              </strong>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-label">Premios entregados</span>
              <strong className="admin-stat-value">{panel.summary.rewardsCount}</strong>
            </div>
          </div>

          <p className="admin-ruleta-sub">
            Estado: <strong>{systemActive ? "Activo" : "Pausado"}</strong> · Próximo
            reparto automático aprox.{" "}
            {new Date(panel.nextRunAt).toLocaleString("es-DO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {cfg && (
            <div className="admin-ruleta-settings-grid">
              {numFields.map((f) => (
                <label key={f.key} className="admin-field admin-field--profit">
                  <span>{f.label}</span>
                  <input
                    type="number"
                    min={0}
                    step={f.step ?? 1}
                    value={cfg[f.key]}
                    onChange={(e) => setField(f.key, Number(e.target.value) || 0)}
                  />
                </label>
              ))}
            </div>
          )}

          <div className="admin-table-actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="admin-save-btn"
              onClick={() => void saveConfig()}
              disabled={saving}
            >
              {saving ? "Guardando…" : "Guardar configuración del pozo"}
            </button>
            <button
              type="button"
              className="admin-save-btn admin-save-btn--secondary"
              onClick={() => void runNow()}
              disabled={running}
            >
              {running ? "Repartiendo…" : "Ejecutar reparto ahora"}
            </button>
          </div>
          {msg && <p className="admin-save-msg">{msg}</p>}

          <h3 className="admin-subtitle">Jugadores elegibles ({panel.eligible.length})</h3>
          {panel.eligible.length === 0 ? (
            <p className="admin-empty">
              Sin jugadores elegibles en los últimos {panel.config.rewardIntervalMinutes} min.
            </p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--compact">
                <thead>
                  <tr>
                    <th>Jugador</th>
                    <th>Apostado</th>
                    <th>Giros</th>
                    <th>Racha perdida</th>
                    <th>Peso</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.eligible.map((p) => (
                    <tr key={p.userId}>
                      <td>{p.fullName}</td>
                      <td>{formatMoney(p.totalBet)}</td>
                      <td>{p.spinCount}</td>
                      <td>{p.consecutiveLosingSpins}</td>
                      <td>{p.weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="admin-subtitle">Premios entregados hoy</h3>
          {panel.rewardsToday.length === 0 ? (
            <p className="admin-empty">Aún no se han repartido premios hoy.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--compact">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Jugador</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.rewardsToday.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {new Date(r.createdAt).toLocaleString("es-DO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>{r.fullName}</td>
                      <td>{REWARD_TYPE_LABELS[r.rewardType] ?? r.rewardType}</td>
                      <td>{formatMoney(r.amount)}</td>
                      <td>{r.reason}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
