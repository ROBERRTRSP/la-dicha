"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";

type Player = {
  id: string;
  username: string;
  fullName: string;
  phone: string | null;
  balance: number;
};

export default function CajeroJugadoresPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [form, setForm] = useState({
    username: "",
    fullName: "",
    phone: "",
    password: "1234",
    initialBalance: "100",
  });
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/cajero/players");
    const data = await res.json();
    setPlayers(data.players ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/cajero/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        initialBalance: Number(form.initialBalance) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Error");
      return;
    }
    setMsg(`Jugador ${data.user.username} creado. Contraseña: ${form.password}`);
    setForm({ username: "", fullName: "", phone: "", password: "1234", initialBalance: "100" });
    load();
  }

  return (
    <div>
      <h1 className="admin-page-title">Jugadores</h1>

      <form className="staff-form" onSubmit={create}>
        <h2 className="admin-subtitle">Crear jugador</h2>
        <div className="admin-settings-grid">
          <label className="admin-field">
            <span>Usuario</span>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </label>
          <label className="admin-field">
            <span>Nombre completo</span>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          </label>
          <label className="admin-field">
            <span>Teléfono</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="admin-field">
            <span>Contraseña temporal</span>
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label className="admin-field">
            <span>Saldo inicial</span>
            <input type="number" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} />
          </label>
        </div>
        <button type="submit" className="admin-save-btn">Crear jugador</button>
        {msg && <p className="admin-save-msg">{msg}</p>}
      </form>

      <h2 className="admin-subtitle">Activos</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td>{p.fullName}</td>
                <td>{p.username}</td>
                <td>{formatMoney(p.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
