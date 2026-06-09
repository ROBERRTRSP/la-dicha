"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/utils";

type TicketRow = {
  id: string;
  ticketNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  user: { fullName: string; username: string };
};

export default function AdminTicketsPage() {
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/admin/tickets?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setTickets(data.tickets ?? []);
  }

  return (
    <div>
      <h1 className="admin-page-title">Tickets</h1>
      <form className="staff-search" onSubmit={search}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Número, hash o jugador…"
          className="staff-search-input"
        />
        <button type="submit" className="admin-save-btn">Buscar</button>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Jugador</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.ticketNumber}</td>
                <td>{t.user.fullName}</td>
                <td>{formatMoney(t.totalAmount)}</td>
                <td>{t.status}</td>
                <td>{new Date(t.createdAt).toLocaleString("es-DO")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
