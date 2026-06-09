"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";

type Player = { id: string; fullName: string; username: string; balance: number };
type Mode = "add" | "subtract";

const QUICK = [50, 100, 200, 500];

export default function CajeroRecargarPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [amount, setAmount] = useState("100");
  const [mode, setMode] = useState<Mode>("add");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/cajero/players")
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMsg("Ingresa un monto válido mayor a $0.");
      return;
    }
    if (!playerId) {
      setMsg("Selecciona un jugador.");
      return;
    }

    const selected = players.find((p) => p.id === playerId);
    if (mode === "subtract" && selected && parsed > selected.balance) {
      setMsg(`Saldo insuficiente. Disponible: ${formatMoney(selected.balance)}.`);
      return;
    }

    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/cajero/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, amount: parsed, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Error");
        return;
      }

      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, balance: data.balanceAfter } : p
        )
      );

      const verb = mode === "add" ? "Recarga" : "Descuento";
      setMsg(
        `${verb} de ${formatMoney(data.amount)} aplicado. Nuevo saldo: ${formatMoney(data.balanceAfter)}`
      );
    } finally {
      setLoading(false);
    }
  }

  const selected = players.find((p) => p.id === playerId);

  return (
    <div>
      <h1 className="admin-page-title">Recargar / Descontar saldo</h1>

      <form className="staff-form" onSubmit={submit}>
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

        <div className="staff-mode-toggle">
          <button
            type="button"
            className={`staff-mode-btn${mode === "add" ? " active" : ""}`}
            onClick={() => setMode("add")}
          >
            + Recargar
          </button>
          <button
            type="button"
            className={`staff-mode-btn staff-mode-btn--subtract${mode === "subtract" ? " active" : ""}`}
            onClick={() => setMode("subtract")}
          >
            − Descontar
          </button>
        </div>

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
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <button
          type="submit"
          className={`admin-save-btn${mode === "subtract" ? " staff-btn--danger" : ""}`}
          disabled={loading}
        >
          {loading
            ? "Procesando…"
            : mode === "add"
              ? "Aplicar recarga"
              : "Aplicar descuento"}
        </button>
        {msg && <p className="admin-save-msg">{msg}</p>}
      </form>
    </div>
  );
}
