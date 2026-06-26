"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";

type WalletRow = {
  id: string;
  userId: string;
  balance: number;
  user: { username: string; fullName: string; role: string };
};

export default function AdminBilleterasPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/wallets");
      if (!res.ok) throw new Error("No se pudieron cargar las billeteras.");
      const data = await res.json();
      setWallets(data.wallets ?? []);
    } catch (e) {
      setWallets([]);
      setLoadError(e instanceof Error ? e.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function adjust(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount: Number(amount), note }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Error");
      return;
    }
    setMsg(`Nuevo saldo: ${formatMoney(data.balanceAfter)}`);
    setAmount("");
    load();
  }

  return (
    <div>
      <h1 className="admin-page-title">Billeteras</h1>

      <form className="staff-form" onSubmit={adjust}>
        <h2 className="admin-subtitle">Ajuste de saldo</h2>
        <div className="admin-settings-grid">
          <label className="admin-field">
            <span>ID usuario</span>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} required />
          </label>
          <label className="admin-field">
            <span>Monto (+/-)</span>
            <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label className="admin-field admin-field--full">
            <span>Nota</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <button type="submit" className="admin-save-btn">Aplicar ajuste</button>
        {msg && <p className="admin-save-msg">{msg}</p>}
      </form>

      <h2 className="admin-subtitle">Saldos</h2>
      {loading ? (
        <p className="admin-loading">Cargando billeteras…</p>
      ) : loadError ? (
        <>
          <p className="admin-error">{loadError}</p>
          <button type="button" className="admin-save-btn" onClick={load}>
            Reintentar
          </button>
        </>
      ) : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Usuario</th>
              <th>Saldo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {wallets.map((w) => (
              <tr key={w.id}>
                <td>{w.user.fullName}</td>
                <td>{w.user.username}</td>
                <td>{formatMoney(w.balance)}</td>
                <td>
                  <button
                    type="button"
                    className="staff-link-btn"
                    onClick={() => setUserId(w.userId)}
                  >
                    Ajustar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
