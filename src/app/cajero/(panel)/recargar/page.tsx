"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";

type Player = { id: string; fullName: string; username: string; balance: number };

const QUICK = [50, 100, 200, 500];

export default function CajeroRecargarPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [amount, setAmount] = useState("100");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/cajero/players")
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []))
      .catch(() => {});
  }, []);

  async function deposit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/cajero/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId, amount: Number(amount) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Error");
      return;
    }
    setMsg(`Recarga OK. Nuevo saldo: ${formatMoney(data.balanceAfter)}`);
    const refreshed = await fetch("/api/cajero/players").then((r) => r.json());
    setPlayers(refreshed.players ?? []);
  }

  const selected = players.find((p) => p.id === playerId);

  return (
    <div>
      <h1 className="admin-page-title">Recargar saldo</h1>

      <form className="staff-form" onSubmit={deposit}>
        <label className="admin-field admin-field--full">
          <span>Jugador</span>
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="staff-select"
            required
          >
            <option value="">Seleccionar…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} ({p.username}) — {formatMoney(p.balance)}
              </option>
            ))}
          </select>
        </label>

        {selected && (
          <p className="staff-hint">Saldo actual: {formatMoney(selected.balance)}</p>
        )}

        <div className="staff-quick-amounts">
          {QUICK.map((a) => (
            <button
              key={a}
              type="button"
              className={`staff-quick-chip${amount === String(a) ? " active" : ""}`}
              onClick={() => setAmount(String(a))}
            >
              {a}
            </button>
          ))}
        </div>

        <label className="admin-field">
          <span>Monto RD$</span>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>

        <button type="submit" className="admin-save-btn">Recargar</button>
        {msg && <p className="admin-save-msg">{msg}</p>}
      </form>
    </div>
  );
}
