"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelTicketMsLeft, canCancelTicket, type CartLine } from "@/lib/tickets";
import { REPEAT_CART_KEY } from "@/lib/ticket-cart";
import { formatMoney } from "@/lib/utils";

function formatCountdown(ms: number) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function TicketActionSheet({
  open,
  ticketId,
  ticketNumber,
  totalAmount,
  status,
  createdAt,
  cartLines,
  onClose,
  onCanceled,
}: {
  open: boolean;
  ticketId: string;
  ticketNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  cartLines: CartLine[];
  onClose: () => void;
  onCanceled: () => void;
}) {
  const router = useRouter();
  const [msLeft, setMsLeft] = useState(() => cancelTicketMsLeft(createdAt));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cancelable = canCancelTicket(status, createdAt) && msLeft > 0;

  useEffect(() => {
    if (!open || status !== "ACTIVE") return;
    const tick = () => setMsLeft(cancelTicketMsLeft(createdAt));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [open, status, createdAt]);

  useEffect(() => {
    if (!open) setError("");
  }, [open]);

  if (!open) return null;

  function handleRepeat() {
    sessionStorage.setItem(REPEAT_CART_KEY, JSON.stringify(cartLines));
    onClose();
    router.push("/jugar");
  }

  async function handleCancel() {
    if (!cancelable) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${ticketId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo cancelar.");
      onCanceled();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cancelar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="ticket-sheet-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ticket-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="ticket-sheet-title"
      >
        <div className="ticket-sheet-header">
          <div className="min-w-0">
            <p id="ticket-sheet-title" className="ticket-sheet-title">
              Opciones del ticket
            </p>
            <p className="ticket-sheet-number">{ticketNumber}</p>
            <p className="ticket-sheet-amount">{formatMoney(totalAmount)}</p>
          </div>
          <button
            type="button"
            className="ticket-sheet-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            Cerrar
          </button>
        </div>

        {error && <p className="ticket-sheet-error">{error}</p>}

        <div className="ticket-sheet-actions">
          <button
            type="button"
            className="ticket-sheet-btn ticket-sheet-btn--primary"
            onClick={handleRepeat}
            disabled={loading}
          >
            Jugar de nuevo
          </button>

          {status === "ACTIVE" && (
            <button
              type="button"
              className="ticket-sheet-btn ticket-sheet-btn--danger"
              onClick={handleCancel}
              disabled={loading || !cancelable}
            >
              {cancelable
                ? `Cancelar ticket (${formatCountdown(msLeft)})`
                : "Cancelar (expiró 5 min)"}
            </button>
          )}

          {status === "WINNER" && (
            <p className="ticket-sheet-hint ticket-sheet-hint--winner">
              ¡Felicidades! Tienes premio. Preséntate en ventanilla con este
              ticket y tu cajero te pagará en efectivo. El premio no se suma al
              saldo de la app.
            </p>
          )}

          {status === "CANCELED" && (
            <p className="ticket-sheet-hint">
              Ticket cancelado. Se eliminará del historial después de 7 días.
            </p>
          )}

          {status === "PAID" && (
            <p className="ticket-sheet-hint">
              Premio pagado en ventanilla. Se eliminará del historial después de
              7 días.
            </p>
          )}
        </div>

        <p className="ticket-sheet-foot">
          Toca fuera o la X para cerrar. Cancelar devuelve el saldo solo en los
          primeros 5 minutos.
        </p>
      </div>
    </div>
  );
}
