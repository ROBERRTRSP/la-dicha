"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";

type Stats = {
  playerCount: number;
  cajeroCount: number;
  ticketsToday: number;
  lotterySalesToday: number;
  totalWalletBalance: number;
  openDrawsToday: number;
  rouletteSpinsToday: number;
  rouletteHouseProfit: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch("/api/admin/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar el panel.");
        return r.json();
      })
      .then(setStats)
      .catch((e) => {
        setStats(null);
        setError(e instanceof Error ? e.message : "Error de conexión.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="admin-loading">Cargando panel…</p>;
  }

  if (error || !stats) {
    return (
      <div>
        <h1 className="admin-page-title">Panel Administrador</h1>
        <p className="admin-error">{error || "No hay datos disponibles."}</p>
        <button
          type="button"
          className="admin-save-btn"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="admin-page-title">Panel Administrador</h1>
      <p className="admin-ruleta-sub">Resumen operativo de hoy</p>

      <div className="admin-stats-grid admin-stats-grid--wide">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Jugadores activos</p>
          <p className="admin-stat-value">{stats.playerCount}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Cajeros</p>
          <p className="admin-stat-value">{stats.cajeroCount}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Tickets hoy</p>
          <p className="admin-stat-value">{stats.ticketsToday}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Ventas lotería hoy</p>
          <p className="admin-stat-value">{formatMoney(stats.lotterySalesToday)}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Saldo total jugadores</p>
          <p className="admin-stat-value">{formatMoney(stats.totalWalletBalance)}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Sorteos abiertos</p>
          <p className="admin-stat-value">{stats.openDrawsToday}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Giros ruleta hoy</p>
          <p className="admin-stat-value">{stats.rouletteSpinsToday}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Ganancia ruleta hoy</p>
          <p
            className={`admin-stat-value${stats.rouletteHouseProfit >= 0 ? " positive" : " negative"}`}
          >
            {formatMoney(stats.rouletteHouseProfit)}
          </p>
        </div>
      </div>
    </div>
  );
}
