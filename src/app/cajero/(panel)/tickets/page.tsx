"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CajeroQrScannerModal } from "@/components/cajero/CajeroQrScannerModal";
import { fetchCajeroTicketLookup } from "@/lib/cajero-ticket-lookup-client";
import { parseTicketQrPayload, ticketQrSearchQueries } from "@/lib/ticket-codes";
import { formatMoney } from "@/lib/utils";

type TicketDetail = {
  id: string;
  ticketNumber: string;
  status: string;
  totalAmount: number;
  totalPrize: number;
  createdAt: string;
  items: {
    betType: string;
    numbers: string;
    amount: number;
    status: string;
    prizeAmount: number | null;
    lotteryName: string;
  }[];
};

export default function CajeroTicketsPage() {
  const searchParams = useSearchParams();
  const pendingRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<TicketDetail[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [q, setQ] = useState("");
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const lookupByQuery = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setError("");
    setTicket(null);
    setMsg("");

    const result = await fetchCajeroTicketLookup<{ ticket: TicketDetail }>(
      trimmed
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setQ(result.data.ticket.ticketNumber);
    setTicket(result.data.ticket);
  }, []);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await fetch("/api/cajero/tickets");
      const data = await res.json();
      setPending(data.pending ?? []);
    } catch {
      setPending([]);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useEffect(() => {
    if (searchParams.get("focus") !== "pending") return;
    const t = setTimeout(() => {
      pendingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => clearTimeout(t);
  }, [searchParams, loadingPending, pending.length]);

  useEffect(() => {
    const initialQ = searchParams.get("q")?.trim();
    if (!initialQ) return;
    void lookupByQuery(initialQ);
  }, [searchParams, lookupByQuery]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    await lookupByQuery(q);
  }

  const handleQrScan = useCallback(
    (raw: string) => {
      setQrOpen(false);
      const parsed = parseTicketQrPayload(raw);
      const queries = parsed ? ticketQrSearchQueries(parsed) : [raw];
      if (queries[0]) setQ(queries[0]);
      void lookupByQuery(raw);
    },
    [lookupByQuery]
  );

  function selectTicket(t: TicketDetail) {
    setTicket(t);
    setQ(t.ticketNumber);
    setError("");
    setMsg("");
  }

  async function collect() {
    if (!ticket || collecting) return;
    setMsg("");
    setCollecting(true);
    try {
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
      setMsg(
        `Premio pagado en efectivo: ${formatMoney(data.prize)} (no se acredita al saldo)`
      );
      setTicket({ ...ticket, status: "PAID" });
      setPending((prev) => prev.filter((t) => t.id !== ticket.id));
    } finally {
      setCollecting(false);
    }
  }

  return (
    <div>
      <h1 className="admin-page-title">Consultar ticket</h1>
      <p className="admin-ruleta-sub">
        Premios de lotería se pagan en efectivo en ventanilla (no van al saldo digital).
        Datos del jugador ocultos por privacidad.
      </p>

      <h2 className="admin-subtitle" ref={pendingRef}>
        Premios pendientes de pago
      </h2>
      {loadingPending ? (
        <p className="admin-loading">Cargando…</p>
      ) : pending.length === 0 ? (
        <p className="admin-empty">No hay tickets ganadores por cobrar.</p>
      ) : (
        <div className="admin-table-wrap staff-pending-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Premio</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((t) => (
                <tr
                  key={t.id}
                  className={ticket?.id === t.id ? "staff-row-selected" : ""}
                >
                  <td>
                    <strong>{t.ticketNumber}</strong>
                  </td>
                  <td className="win">{formatMoney(t.totalPrize)}</td>
                  <td>
                    {new Date(t.createdAt).toLocaleString("es-DO", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="staff-link-btn"
                      onClick={() => selectTicket(t)}
                    >
                      Ver / Pagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="admin-subtitle">Buscar por número o código</h2>
      <form className="staff-search" onSubmit={lookup}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Número de ticket o código"
          className="staff-search-input"
          autoComplete="off"
        />
        <button
          type="button"
          className="staff-qr-scan-btn"
          onClick={() => setQrOpen(true)}
        >
          Leer QR
        </button>
        <button type="submit" className="admin-save-btn">
          Buscar
        </button>
      </form>

      <CajeroQrScannerModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onScan={handleQrScan}
      />

      {error && <p className="staff-error">{error}</p>}

      {ticket && (
        <div className="staff-ticket-card">
          <p>
            <strong>Ticket {ticket.ticketNumber}</strong>
          </p>
          <p className="staff-hint">Jugador: información reservada</p>
          <p>Estado: {ticket.status}</p>
          <p>Apostado: {formatMoney(ticket.totalAmount)}</p>
          <p>Premio: {formatMoney(ticket.totalPrize)}</p>
          <ul className="staff-ticket-items">
            {ticket.items.map((i, idx) => (
              <li key={idx}>
                {i.lotteryName} — {i.betType} {i.numbers} —{" "}
                {formatMoney(i.amount)}
                {i.prizeAmount ? ` → ${formatMoney(i.prizeAmount)}` : ""}
              </li>
            ))}
          </ul>
          {ticket.status === "WINNER" && (
            <button
              type="button"
              className="admin-save-btn"
              onClick={collect}
              disabled={collecting}
            >
              {collecting ? "Procesando…" : "Pagar premio"}
            </button>
          )}
          {ticket.status === "PAID" && (
            <p className="admin-save-msg">Este ticket ya fue pagado.</p>
          )}
          {msg && <p className="admin-save-msg">{msg}</p>}
        </div>
      )}
    </div>
  );
}
