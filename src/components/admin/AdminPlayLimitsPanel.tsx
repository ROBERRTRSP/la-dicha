"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/utils";
import type { BancaSettingsView } from "@/lib/banca-session";
import type { LotteryPlayLimitView } from "@/lib/play-limit-context";
import {
  PLAY_LIMIT_GLOBAL_LABELS,
  effectiveLotteryLimit,
} from "@/lib/play-limit-admin";

type SystemLimits = {
  minBetAmount: number;
  maxBetAmount: number;
  maxCartLines: number;
  maxCartTotal: number;
};

type LimitKey =
  | "maxDirectoPerNumber"
  | "maxPalePerNumber"
  | "maxTripletaPerNumber";

const PER_LOTTERY_KEYS: LimitKey[] = [
  "maxDirectoPerNumber",
  "maxPalePerNumber",
  "maxTripletaPerNumber",
];

export function AdminPlayLimitsPanel() {
  const [settings, setSettings] = useState<BancaSettingsView | null>(null);
  const [lotteries, setLotteries] = useState<LotteryPlayLimitView[]>([]);
  const [system, setSystem] = useState<SystemLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const isPerLottery = settings?.playLimitsMode === "PER_LOTTERY";

  const groupedLotteries = useMemo(() => {
    const groups: Record<string, LotteryPlayLimitView[]> = {};
    for (const lot of lotteries) {
      const cat = lot.category === "EXTRANJERA" ? "Extranjeras" : "Dominicanas";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(lot);
    }
    return groups;
  }, [lotteries]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/play-limits");
      if (!res.ok) throw new Error("No se pudo cargar la configuración.");
      const data = await res.json();
      setSettings(data.settings);
      setLotteries(data.lotteries ?? []);
      setSystem(data.system);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateField<K extends keyof BancaSettingsView>(
    key: K,
    value: BancaSettingsView[K]
  ) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateLotteryField(
    lotteryId: string,
    key: LimitKey,
    value: number | null
  ) {
    setLotteries((prev) =>
      prev.map((lot) =>
        lot.lotteryId === lotteryId ? { ...lot, [key]: value } : lot
      )
    );
  }

  function applyGlobalToAll(key: LimitKey) {
    if (!settings) return;
    const value = settings[key];
    setLotteries((prev) =>
      prev.map((lot) => ({ ...lot, [key]: value }))
    );
    setMsg(`Se copió ${formatMoney(value)} a todas las loterías (${key}).`);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await fetch("/api/admin/play-limits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          lotteryLimits: lotteries.map((lot) => ({
            lotteryId: lot.lotteryId,
            maxDirectoPerNumber: lot.maxDirectoPerNumber,
            maxPalePerNumber: lot.maxPalePerNumber,
            maxTripletaPerNumber: lot.maxTripletaPerNumber,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar.");
      setSettings(data.settings);
      setLotteries(data.lotteries ?? []);
      setMsg("Límites guardados. El cajero los aplica de inmediato.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="admin-ruleta-sub">Cargando límites…</p>;
  }

  if (!settings) {
    return <p className="admin-error">{error || "Sin configuración."}</p>;
  }

  const globalOnlyLabels = PLAY_LIMIT_GLOBAL_LABELS.filter((l) => !l.perLottery);
  const sharedLabels = PLAY_LIMIT_GLOBAL_LABELS.filter((l) => l.perLottery);

  return (
    <div className="admin-play-limits">
      <div className="admin-play-limits-intro">
        <p className="admin-ruleta-sub">
          Elija si el límite es el mismo para todas las loterías o configure
          cada lotería por separado. El cajero ve el disponible en vivo según la
          lotería seleccionada.
        </p>
        {system && (
          <ul className="admin-play-limits-system">
            <li>
              Monto mínimo por jugada: <strong>{formatMoney(system.minBetAmount)}</strong>
            </li>
            <li>
              Monto máximo por jugada:{" "}
              <strong>{formatMoney(system.maxBetAmount)}</strong>
            </li>
            <li>
              Máximo jugadas por ticket: <strong>{system.maxCartLines}</strong>
            </li>
            <li>
              Total máximo por ticket:{" "}
              <strong>{formatMoney(system.maxCartTotal)}</strong>
            </li>
          </ul>
        )}
      </div>

      <h2 className="admin-subtitle">Modo de límite</h2>
      <div className="admin-play-limits-mode">
        <label className="admin-play-limits-mode-opt">
          <input
            type="radio"
            name="playLimitsMode"
            checked={!isPerLottery}
            onChange={() => updateField("playLimitsMode", "GLOBAL")}
          />
          <span>
            <strong>Todas las loterías</strong> — mismo límite para cada una
          </span>
        </label>
        <label className="admin-play-limits-mode-opt">
          <input
            type="radio"
            name="playLimitsMode"
            checked={isPerLottery}
            onChange={() => updateField("playLimitsMode", "PER_LOTTERY")}
          />
          <span>
            <strong>Por lotería</strong> — límite distinto en cada sorteo
          </span>
        </label>
      </div>

      <h2 className="admin-subtitle">Terminal</h2>
      <div className="admin-settings-grid">
        <label className="admin-field">
          <span>Nombre de banca</span>
          <input
            type="text"
            value={settings.bancaName}
            onChange={(e) => updateField("bancaName", e.target.value)}
          />
        </label>
        <label className="admin-field">
          <span>Código terminal</span>
          <input
            type="text"
            value={settings.terminalCode}
            onChange={(e) => updateField("terminalCode", e.target.value)}
          />
        </label>
      </div>

      {!isPerLottery && (
        <>
          <h2 className="admin-subtitle">Límite por número — todas</h2>
          <div className="admin-play-limits-grid">
            {PLAY_LIMIT_GLOBAL_LABELS.map(({ key, label, hint }) => (
              <label key={key} className="admin-play-limit-card">
                <span className="admin-play-limit-card-title">{label}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={settings[key]}
                  onChange={(e) =>
                    updateField(key, parseInt(e.target.value, 10) || 0)
                  }
                />
                <span className="admin-play-limit-card-hint">{hint}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {isPerLottery && (
        <>
          <h2 className="admin-subtitle">Valores por defecto</h2>
          <p className="admin-ruleta-sub">
            Si una lotería queda en blanco, se usa el valor por defecto de esa
            columna.
          </p>
          <div className="admin-play-limits-grid admin-play-limits-grid--compact">
            {sharedLabels.map(({ key, label, hint }) => (
              <label key={key} className="admin-play-limit-card">
                <span className="admin-play-limit-card-title">{label}</span>
                <div className="admin-play-limit-card-row">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={settings[key]}
                    onChange={(e) =>
                      updateField(key, parseInt(e.target.value, 10) || 0)
                    }
                  />
                  <button
                    type="button"
                    className="admin-save-btn admin-save-btn--secondary admin-play-limit-copy-btn"
                    onClick={() => applyGlobalToAll(key as LimitKey)}
                  >
                    Aplicar a todas
                  </button>
                </div>
                <span className="admin-play-limit-card-hint">{hint}</span>
              </label>
            ))}
          </div>

          <h2 className="admin-subtitle">Límite por lotería</h2>
          {Object.entries(groupedLotteries).map(([category, lots]) => (
            <div key={category} className="admin-play-limits-lot-group">
              <h3 className="admin-play-limits-lot-cat">{category}</h3>
              <div className="admin-play-limits-table-wrap">
                <table className="admin-play-limits-table">
                  <thead>
                    <tr>
                      <th>Lotería</th>
                      <th>Hora</th>
                      <th>Directo</th>
                      <th>Palé</th>
                      <th>Tripleta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map((lot) => (
                      <tr key={lot.lotteryId}>
                        <td>{lot.name}</td>
                        <td>{lot.drawTime}</td>
                        {PER_LOTTERY_KEYS.map((key) => (
                          <td key={key}>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              placeholder={String(settings[key])}
                              value={lot[key] ?? ""}
                              title={`Por defecto: ${formatMoney(settings[key])}`}
                              onChange={(e) => {
                                const raw = e.target.value.trim();
                                updateLotteryField(
                                  lot.lotteryId,
                                  key,
                                  raw === ""
                                    ? null
                                    : parseInt(raw, 10) || null
                                );
                              }}
                            />
                            <span className="admin-play-limit-effective">
                              Efectivo:{" "}
                              {formatMoney(effectiveLotteryLimit(lot, key, settings))}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <h2 className="admin-subtitle">Global (súper palé y alertas)</h2>
          <div className="admin-play-limits-grid">
            {globalOnlyLabels.map(({ key, label, hint }) => (
              <label key={key} className="admin-play-limit-card">
                <span className="admin-play-limit-card-title">{label}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={settings[key]}
                  onChange={(e) =>
                    updateField(key, parseInt(e.target.value, 10) || 0)
                  }
                />
                <span className="admin-play-limit-card-hint">{hint}</span>
              </label>
            ))}
          </div>
        </>
      )}

      <div className="admin-play-limits-actions">
        <button
          type="button"
          className="admin-save-btn"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Guardando…" : "Guardar límites"}
        </button>
        {msg && <p className="admin-save-msg">{msg}</p>}
        {error && <p className="admin-error">{error}</p>}
      </div>
    </div>
  );
}
