"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";

export default function CajeroDashboardPage() {
  const [stats, setStats] = useState<{
    playerCount: number;
    winnerTickets: number;
    deposits: { amount: number; createdAt: string; wallet: { user: { fullName: string } } }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/cajero/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) return <p className="admin-loading">Cargando…</p>;

  return (
    <div>
      <h1 className="admin-page-title">Panel Cajero</h1>
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Jugadores activos</p>
          <p className="admin-stat-value">{stats.playerCount}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Tickets con premio</p>
          <p className="admin-stat-value">{stats.winnerTickets}</p>
        </div>
      </div>

      <h2 className="admin-subtitle">Recargas de hoy</h2>
      {stats.deposits.length === 0 ? (
        <p className="admin-empty">Sin recargas hoy.</p>
      ) : (
        <ul className="admin-exposure-list">
          {stats.deposits.map((d, i) => (
            <li key={i}>
              <span>{d.wallet.user.fullName}</span>
              <span>{formatMoney(d.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
