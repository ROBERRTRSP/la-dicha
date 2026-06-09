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

  useEffect(() => {
    fetch("/api/admin/draws")
      .then((r) => r.json())
      .then((d) => setDraws(d.draws ?? []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="admin-page-title">Sorteos de hoy</h1>
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
    </div>
  );
}
