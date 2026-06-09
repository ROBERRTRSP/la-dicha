"use client";

import { useEffect, useState } from "react";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";
import { formatMoney } from "@/lib/utils";
import { BET_TYPE_LABELS, type RouletteBetType } from "@/lib/roulette";
import type { RouletteSettingsData } from "@/lib/roulette-settings";

type AdminBet = {
  id: string;
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

type RankingRow = {
  userId: string;
  user?: { username: string; fullName: string };
  totalProfit: number;
  totalBet: number;
  totalPayout: number;
  spins: number;
};

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

export default function AdminRuletaPage() {
  const [active, setActive] = useState(true);
  const [bets, setBets] = useState<AdminBet[]>([]);
  const [totalBet, setTotalBet] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [houseProfit, setHouseProfit] = useState(0);
  const [rtp, setRtp] = useState(0);
  const [houseEdge, setHouseEdge] = useState(0);
  const [riskAlerts, setRiskAlerts] = useState<string[]>([]);
  const [topNumbers, setTopNumbers] = useState<{ number: number; exposure: number }[]>([]);
  const [exposureByColor, setExposureByColor] = useState<{
    red: number;
    black: number;
    green: number;
  } | null>(null);
  const [topWinners, setTopWinners] = useState<RankingRow[]>([]);
  const [topLosers, setTopLosers] = useState<RankingRow[]>([]);
  const [settings, setSettings] = useState<RouletteSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roulette");
      if (!res.ok) return;
      const data = await res.json();
      setActive(data.active);
      setBets(data.bets ?? []);
      setTotalBet(data.totalBet ?? 0);
      setTotalPaid(data.totalPaid ?? 0);
      setHouseProfit(data.houseProfit ?? 0);
      setRtp(data.rtp ?? 0);
      setHouseEdge(data.houseEdge ?? 0);
      setRiskAlerts(data.riskAlerts ?? []);
      setTopNumbers(data.topNumbers ?? []);
      setExposureByColor(data.exposure?.byColor ?? null);
      setTopWinners(data.rankings?.topWinners ?? []);
      setTopLosers(data.rankings?.topLosers ?? []);
      if (data.settings) setSettings(data.settings);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive() {
    setToggling(true);
    try {
      const res = await fetch("/api/admin/roulette", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      if (res.ok) {
        const data = await res.json();
        setActive(data.settings?.active ?? !active);
      }
    } finally {
      setToggling(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/admin/roulette", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveMsg("Configuración guardada.");
        await load();
      } else {
        setSaveMsg("Error al guardar.");
      }
    } finally {
      setSaving(false);
    }
  }

  function updateSetting<K extends keyof RouletteSettingsData>(
    key: K,
    value: RouletteSettingsData[K]
  ) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  return (
    <div className="admin-ruleta">
      <div className="admin-ruleta-head">
        <div>
          <h1 className="admin-page-title">Ruleta Europea</h1>
          <p className="admin-ruleta-sub">
            Juego justo · Ventaja teórica 2.70% · Sin manipulación de resultados
          </p>
        </div>
        <button
          type="button"
          className={`admin-toggle${active ? " on" : ""}`}
          onClick={toggleActive}
          disabled={toggling}
        >
          {active ? "Activa" : "Desactivada"}
        </button>
      </div>

      <div className="admin-stats-grid admin-stats-grid--wide">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Total apostado</p>
          <p className="admin-stat-value">{formatMoney(totalBet)}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Total pagado</p>
          <p className="admin-stat-value">{formatMoney(totalPaid)}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Ganancia neta casa</p>
          <p
            className={`admin-stat-value${houseProfit >= 0 ? " positive" : " negative"}`}
          >
            {formatMoney(houseProfit)}
          </p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">RTP real</p>
          <p className="admin-stat-value">{pct(rtp)}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">House edge real</p>
          <p className="admin-stat-value">{pct(houseEdge)}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">House edge teórico</p>
          <p className="admin-stat-value">2.70%</p>
        </div>
      </div>

      {riskAlerts.length > 0 && (
        <div className="admin-risk-alerts">
          <h2 className="admin-subtitle">Alertas de riesgo</h2>
          <ul>
            {riskAlerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {settings && (
        <>
          <h2 className="admin-subtitle">Límites y control de riesgo</h2>
          <div className="admin-settings-grid">
            {(
              [
                ["minBetAmount", "Monto mínimo por jugada"],
                ["maxBetAmount", "Monto máximo por jugada"],
                ["maxStraightBet", "Máximo número directo"],
                ["maxOutsideBet", "Máximo apuesta externa"],
                ["maxPayoutPerSpin", "Premio máximo por giro"],
                ["maxDailyPayoutPerPlayer", "Premio máximo diario / jugador"],
                ["maxExposurePerNumber", "Exposición máx. por número"],
                ["maxExposurePerSpin", "Exposición máx. por giro"],
                ["houseReserve", "Reserva de la casa"],
                ["maxRiskPercentOfReserve", "% riesgo máx. sobre reserva"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="admin-field">
                <span>{label}</span>
                <input
                  type="number"
                  step="any"
                  value={settings[key]}
                  onChange={(e) =>
                    updateSetting(key, parseFloat(e.target.value) || 0)
                  }
                />
              </label>
            ))}
          </div>

          <h2 className="admin-subtitle">Promociones (opcionales)</h2>
          <div className="admin-settings-grid">
            <label className="admin-field admin-field--check">
              <input
                type="checkbox"
                checked={settings.welcomeBonusEnabled}
                onChange={(e) =>
                  updateSetting("welcomeBonusEnabled", e.target.checked)
                }
              />
              <span>Bono de bienvenida</span>
            </label>
            <label className="admin-field">
              <span>Monto bono bienvenida</span>
              <input
                type="number"
                value={settings.welcomeBonusAmount}
                onChange={(e) =>
                  updateSetting("welcomeBonusAmount", parseFloat(e.target.value) || 0)
                }
              />
            </label>
            <label className="admin-field admin-field--check">
              <input
                type="checkbox"
                checked={settings.cashbackEnabled}
                onChange={(e) =>
                  updateSetting("cashbackEnabled", e.target.checked)
                }
              />
              <span>Cashback promocional</span>
            </label>
            <label className="admin-field">
              <span>% Cashback</span>
              <input
                type="number"
                value={settings.cashbackPercent}
                onChange={(e) =>
                  updateSetting("cashbackPercent", parseFloat(e.target.value) || 0)
                }
              />
            </label>
            <label className="admin-field admin-field--check">
              <input
                type="checkbox"
                checked={settings.freeSpinsEnabled}
                onChange={(e) =>
                  updateSetting("freeSpinsEnabled", e.target.checked)
                }
              />
              <span>Giros gratis</span>
            </label>
            <label className="admin-field">
              <span>Giros gratis por día</span>
              <input
                type="number"
                value={settings.freeSpinsPerDay}
                onChange={(e) =>
                  updateSetting("freeSpinsPerDay", parseInt(e.target.value, 10) || 0)
                }
              />
            </label>
            <label className="admin-field admin-field--check">
              <input
                type="checkbox"
                checked={settings.trialCreditsEnabled}
                onChange={(e) =>
                  updateSetting("trialCreditsEnabled", e.target.checked)
                }
              />
              <span>Créditos de prueba</span>
            </label>
            <label className="admin-field">
              <span>Monto créditos prueba</span>
              <input
                type="number"
                value={settings.trialCreditAmount}
                onChange={(e) =>
                  updateSetting("trialCreditAmount", parseFloat(e.target.value) || 0)
                }
              />
            </label>
            <label className="admin-field admin-field--full">
              <span>Banner promocional (jugador)</span>
              <input
                type="text"
                value={settings.promoBannerMessage ?? ""}
                onChange={(e) =>
                  updateSetting("promoBannerMessage", e.target.value || null)
                }
              />
            </label>
            <label className="admin-field admin-field--full">
              <span>Mensaje positivo post-giro</span>
              <input
                type="text"
                value={settings.positiveSpinMessage ?? ""}
                onChange={(e) =>
                  updateSetting("positiveSpinMessage", e.target.value || null)
                }
              />
            </label>
          </div>

          <button
            type="button"
            className="admin-save-btn"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? "Guardando…" : "Guardar configuración"}
          </button>
          {saveMsg && <p className="admin-save-msg">{saveMsg}</p>}
        </>
      )}

      <div className="admin-two-col">
        <div>
          <h2 className="admin-subtitle">Exposición por número (reciente)</h2>
          {topNumbers.length === 0 ? (
            <p className="admin-empty">Sin datos aún.</p>
          ) : (
            <ul className="admin-exposure-list">
              {topNumbers.map((t) => (
                <li key={t.number}>
                  <span>Nº {t.number}</span>
                  <span>{formatMoney(t.exposure)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          {exposureByColor && (
            <>
              <h2 className="admin-subtitle">Exposición por color</h2>
              <ul className="admin-exposure-list">
                <li><span>Rojo</span><span>{formatMoney(exposureByColor.red)}</span></li>
                <li><span>Negro</span><span>{formatMoney(exposureByColor.black)}</span></li>
                <li><span>Verde (0)</span><span>{formatMoney(exposureByColor.green)}</span></li>
              </ul>
            </>
          )}
          <h2 className="admin-subtitle">Ranking jugadores</h2>
          <p className="admin-rank-label">Mayores ganancias</p>
          <ul className="admin-rank-list">
            {topWinners.map((r) => (
              <li key={r.userId}>
                {r.user?.fullName ?? r.userId} · {formatMoney(r.totalProfit)}
              </li>
            ))}
          </ul>
          <p className="admin-rank-label">Mayores pérdidas</p>
          <ul className="admin-rank-list">
            {topLosers.map((r) => (
              <li key={r.userId}>
                {r.user?.fullName ?? r.userId} · {formatMoney(r.totalProfit)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2 className="admin-subtitle">Jugadas recientes</h2>

      {loading ? (
        <p className="admin-loading">Cargando…</p>
      ) : bets.length === 0 ? (
        <div className="admin-empty-state">
          <AiVisual
            src={ART.emptyResults}
            alt=""
            width={120}
            height={120}
            className="empty-state-art mx-auto mb-3"
          />
          <p className="admin-empty">Sin jugadas de ruleta aún.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Jugador</th>
                <th>Apuesta</th>
                <th>Monto</th>
                <th>Salió</th>
                <th>Resultado</th>
                <th>Premio</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((b) => (
                <tr key={b.id}>
                  <td>
                    {new Date(b.createdAt).toLocaleString("es-DO", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{b.user.fullName}</td>
                  <td>
                    {BET_TYPE_LABELS[b.betType as RouletteBetType] ?? b.betType}
                  </td>
                  <td>{formatMoney(b.amount)}</td>
                  <td>{b.winningNumber}</td>
                  <td className={b.result === "WIN" ? "win" : "lose"}>
                    {b.result === "WIN" ? "Ganó" : "Perdió"}
                  </td>
                  <td>{formatMoney(b.payout)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
