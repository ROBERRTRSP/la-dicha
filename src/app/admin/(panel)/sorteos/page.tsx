"use client";

import { useEffect, useState } from "react";

type DrawRow = {
  id: string;
  lotteryName: string;
  drawTime: string;
  status: string;
  ticketItems: number;
  result: { first: string; second: string; third: string } | null;
};

export default function AdminSorteosPage() {
  const [draws, setDraws] = useState<DrawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    fetch("/api/admin/draws")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar los sorteos.");
        return r.json();
      })
      .then((d) => setDraws(d.draws ?? []))
      .catch((e) => {
        setDraws([]);
        setError(e instanceof Error ? e.message : "Error de conexión.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="admin-page-title">Sorteos de hoy</h1>
      {loading ? (
        <p className="admin-loading">Cargando sorteos…</p>
      ) : error ? (
        <>
          <p className="admin-error">{error}</p>
          <button type="button" className="admin-save-btn" onClick={load}>
            Reintentar
          </button>
        </>
      ) : draws.length === 0 ? (
        <p className="admin-empty">No hay sorteos registrados para hoy.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Lotería</th>
                <th>Hora</th>
                <th>Estado</th>
                <th>Jugadas</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {draws.map((d) => (
                <tr key={d.id}>
                  <td>{d.lotteryName}</td>
                  <td>{d.drawTime}</td>
                  <td>{d.status}</td>
                  <td>{d.ticketItems}</td>
                  <td>
                    {d.result
                      ? `${d.result.first} · ${d.result.second} · ${d.result.third}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
