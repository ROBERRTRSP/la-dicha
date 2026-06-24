"use client";

import { useCallback, useEffect, useState } from "react";
import { TicketReceipt } from "@/components/player/TicketReceipt";
import { PrintButton } from "@/components/player/PrintButton";
import type { ReceiptData } from "@/lib/ticket-receipt";
import { formatMoney } from "@/lib/utils";

export function CajeroTicketViewModal({
  ticketNumber,
  open,
  onClose,
  onPay,
  onCanceled,
}: {
  ticketNumber: string | null;
  open: boolean;
  onClose: () => void;
  onPay?: () => void;
  onCanceled?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>();
  const [ticketId, setTicketId] = useState("");
  const [status, setStatus] = useState("");
  const [totalPrize, setTotalPrize] = useState(0);
  const [canCancel, setCanCancel] = useState(false);

  const loadReceipt = useCallback(async (q: string) => {
    setLoading(true);
    setError("");
    setReceipt(null);
    try {
      const res = await fetch(
        `/api/cajero/tickets/receipt?q=${encodeURIComponent(q)}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo cargar el ticket.");
      }
      setReceipt(data.receipt as ReceiptData);
      setQrDataUrl(data.qrDataUrl as string);
      setTicketId(String(data.id ?? ""));
      setStatus(String(data.status ?? ""));
      setTotalPrize(Number(data.totalPrize ?? 0));
      setCanCancel(Boolean(data.canCancel));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !ticketNumber) {
      setReceipt(null);
      setError("");
      setTicketId("");
      setStatus("");
      setTotalPrize(0);
      setCanCancel(false);
      return;
    }
    void loadReceipt(ticketNumber);
  }, [open, ticketNumber, loadReceipt]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleCancel() {
    if (!ticketId || !canCancel || canceling) return;
    const ok = window.confirm(
      `¿Cancelar el ticket ${ticketNumber ?? ""}? Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    setCanceling(true);
    setError("");
    try {
      const res = await fetch("/api/cajero/tickets/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticketId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudo cancelar.");
      }
      onCanceled?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cancelar.");
    } finally {
      setCanceling(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="cajero-vq-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="cajero-vq-modal cajero-vq-modal--receipt"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="cajero-ticket-view-title"
      >
        <header className="cajero-vq-modal-head">
          <h2 id="cajero-ticket-view-title">
            {ticketNumber ? `Ticket ${ticketNumber}` : "Ver ticket"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        <div className="cajero-vq-modal-body cajero-ticket-view-body">
          {loading && <p className="cajero-vq-modal-note">Cargando ticket…</p>}
          {error && <p className="cajero-vq-modal-error">{error}</p>}
          {receipt && !error && (
            <>
              {status === "WINNER" && totalPrize > 0 && (
                <p className="cajero-ticket-view-prize">
                  Premio pendiente: <strong>{formatMoney(totalPrize)}</strong>
                </p>
              )}
              <TicketReceipt data={receipt} qrDataUrl={qrDataUrl} />
            </>
          )}
        </div>

        {receipt && !error && (
          <footer className="cajero-vq-modal-foot cajero-ticket-view-foot">
            <PrintButton className="cajero-vq-modal-link-btn" />
            {status === "WINNER" && onPay && (
              <button
                type="button"
                className="cajero-vq-modal-link-btn cajero-ticket-view-pay"
                onClick={onPay}
              >
                Pagar premio
              </button>
            )}
            {canCancel && onCanceled && (
              <button
                type="button"
                className="cajero-vq-modal-link-btn cajero-ticket-view-cancel"
                onClick={() => void handleCancel()}
                disabled={canceling}
              >
                {canceling ? "Cancelando…" : "Cancelar ticket"}
              </button>
            )}
            <button
              type="button"
              className="cajero-vq-modal-link-btn"
              onClick={onClose}
            >
              Cerrar
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
