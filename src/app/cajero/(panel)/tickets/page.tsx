"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/utils";

type TicketDetail = {
  id: string;
  ticketNumber: string;
  status: string;
  totalAmount: number;
  totalPrize: number;
  player: { fullName: string; username: string };
  items: { betType: string; numbers: string; amount: number; status: string; prizeAmount: number | null; lotteryName: string }[];
};

export default function CajeroTicketsPage() {
  const [q, setQ] = useState("");
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setTicket(null);
    const res = await fetch(`/api/cajero/tickets?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No encontrado");
      return;
    }
    setTicket(data.ticket);
  }

  async function collect() {
    if (!ticket) return;
    setMsg("");
    const res = await fetch("/api/cajero/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Error");
      return;
    }
    setMsg(`Premio cobrado: ${formatMoney(data.prize)}`);
    setTicket({ ...ticket, status: "PAID" });
  }

  return (
    <div>
      <h1 className="admin-page-title">Consultar ticket</h1>

      <form className="staff-search" onSubmit={lookup}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Número de ticket o código"
          className="staff-search-input"
        />
        <button type="submit" className="admin-save-btn">Buscar</button>
      </form>

      {error && <p className="staff-error">{error}</p>}

      {ticket && (
        <div className="staff-ticket-card">
          <p><strong>{ticket.ticketNumber}</strong></p>
          <p>{ticket.player.fullName} · {ticket.status}</p>
          <p>Apostado: {formatMoney(ticket.totalAmount)}</p>
          <p>Premio: {formatMoney(ticket.totalPrize)}</p>
          <ul className="staff-ticket-items">
            {ticket.items.map((i, idx) => (
              <li key={idx}>
                {i.lotteryName} — {i.betType} {i.numbers} — {formatMoney(i.amount)}
                {i.prizeAmount ? ` → ${formatMoney(i.prizeAmount)}` : ""}
              </li>
            ))}
          </ul>
          {ticket.status === "WINNER" && (
            <button type="button" className="admin-save-btn" onClick={collect}>
              Cobrar premio
            </button>
          )}
          {msg && <p className="admin-save-msg">{msg}</p>}
        </div>
      )}
    </div>
  );
}
