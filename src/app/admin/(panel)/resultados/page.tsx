"use client";

import { useEffect, useState } from "react";

type DrawRow = {
  id: string;
  lotteryName: string;
  drawTime: string;
  status: string;
  result: { first: string; second: string; third: string } | null;
};

export default function AdminResultadosPage() {
  const [draws, setDraws] = useState<DrawRow[]>([]);
  const [selected, setSelected] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [third, setThird] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/draws");
    const data = await res.json();
    setDraws(data.draws ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drawId: selected, first, second, third, settle: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Error");
      return;
    }
    setMsg(`Resultado publicado. ${data.settled} jugadas liquidadas.`);
    load();
  }

  return (
    <div>
      <h1 className="admin-page-title">Resultados</h1>
      <p className="admin-ruleta-sub">
        Publica números y liquida premios automáticamente (Quiniela, Palé, Tripleta).
      </p>

      <form className="staff-form" onSubmit={publish}>
        <div className="admin-settings-grid">
          <label className="admin-field admin-field--full">
            <span>Sorteo</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="staff-select"
              required
            >
              <option value="">Elegir sorteo…</option>
              {draws.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.lotteryName} — {d.drawTime} ({d.status})
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>1ero</span>
            <input value={first} onChange={(e) => setFirst(e.target.value)} maxLength={2} required />
          </label>
          <label className="admin-field">
            <span>2do</span>
            <input value={second} onChange={(e) => setSecond(e.target.value)} maxLength={2} required />
          </label>
          <label className="admin-field">
            <span>3ero</span>
            <input value={third} onChange={(e) => setThird(e.target.value)} maxLength={2} required />
          </label>
        </div>
        <button type="submit" className="admin-save-btn">Publicar y liquidar</button>
        {msg && <p className="admin-save-msg">{msg}</p>}
      </form>
    </div>
  );
}
