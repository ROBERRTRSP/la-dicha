"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/utils";

type TicketRow = {
  id: string;
  ticketNumber: string;
  status: string;
  totalAmount: number;
  totalPrize: number;
  createdAt: string;
  user: { fullName: string; username: string };
};

export default function AdminTicketsPage() {
  const [q, setQ] = useState("");
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [msg, setMsg] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch(`/api/admin/tickets?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setTickets(data.tickets ?? []);
  }

  async function pay(ticketId: string) {
    setMsg("");
    const res = await fetch("/api/admin/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Error");
      return;
    }
    setMsg(`Premio pagado en efectivo: ${formatMoney(data.prize)}`);
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: "PAID" } : t))
    );
  }

  return (
    <div>
      <h1 className="admin-page-title">Tickets</h1>
      <p className="admin-ruleta-sub">
        Premios de lotería se pagan en ventanilla (efectivo), no al saldo digital.
      </p>

      <form className="staff-search" onSubmit={search}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Número, hash o jugador…"
          className="staff-search-input"
        />
        <button type="submit" className="admin-save-btn">
          Buscar
        </button>
      </form>

      {msg && <p className="admin-save-msg">{msg}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Jugador</th>
              <th>Apostado</th>
              <th>Premio</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id}>
                <td>{t.ticketNumber}</td>
                <td>{t.user.fullName}</td>
                <td>{formatMoney(t.totalAmount)}</td>
                <td>{t.totalPrize > 0 ? formatMoney(t.totalPrize) : "—"}</td>
                <td>{t.status}</td>
                <td>{new Date(t.createdAt).toLocaleString("es-DO")}</td>
                <td>
                  {t.status === "WINNER" && (
                    <button
                      type="button"
                      className="staff-link-btn"
                      onClick={() => pay(t.id)}
                    >
                      Pagar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
