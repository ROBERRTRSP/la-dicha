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

  async function load() {
    const res = await fetch("/api/admin/wallets");
    const data = await res.json();
    setWallets(data.wallets ?? []);
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
