"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CajeroQrScannerModal } from "@/components/cajero/CajeroQrScannerModal";
import {
  fetchDuplicateTicketApply,
  fetchDuplicateTicketPreview,
  type DuplicateTicketPreviewData,
} from "@/lib/cajero-ticket-lookup-client";
import { parseTicketQrPayload, ticketQrSearchQueries } from "@/lib/ticket-codes";
import { cn, formatMoney } from "@/lib/utils";
import type { CartLine } from "@/lib/tickets";

type Step = "search" | "select";

export function CajeroDuplicateTicketModal({
  open,
  onClose,
  onAddLines,
  initialTicketNumber = "",
  cart = [],
}: {
  open: boolean;
  onClose: () => void;
  onAddLines: (
    lines: CartLine[],
    ticketNumber: string,
    warning?: string
  ) => void;
  initialTicketNumber?: string;
  cart?: CartLine[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("search");
  const [ticketQuery, setTicketQuery] = useState(initialTicketNumber);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [preview, setPreview] = useState<DuplicateTicketPreviewData | null>(
    null
  );
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [qrOpen, setQrOpen] = useState(false);

  const openLotteries = useMemo(
    () => preview?.lotteries.filter((l) => l.open) ?? [],
    [preview]
  );

  const reset = useCallback(() => {
    setStep("search");
    setTicketQuery("");
    setLoading(false);
    setError("");
    setInfo("");
    setPreview(null);
    setSelectedKeys(new Set());
  }, []);

  const loadPreview = useCallback(async (q: string) => {
    if (!q) {
      setError("Ingrese el número de ticket.");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");
    setPreview(null);
    setSelectedKeys(new Set());

    try {
      const result = await fetchDuplicateTicketPreview(q);
      if (!result.ok) throw new Error(result.error);

      const data = result.data;
      setPreview(data);
      setStep("select");
      const defaults = new Set(
        data.lotteries.filter((l) => l.open).map((l) => l.key)
      );
      setSelectedKeys(defaults);
      if (defaults.size === 0) {
        setInfo("Ninguna lotería del ticket está abierta ahora.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar ticket.");
      setStep("search");
    } finally {
      setLoading(false);
    }
  }, []);

  const applyDuplicate = useCallback(async () => {
    if (!preview) return;
    const keys = [...selectedKeys];
    if (keys.length === 0) {
      setError("Seleccione al menos una lotería abierta.");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");

    try {
      const result = await fetchDuplicateTicketApply({
        ticketId: preview.ticketId,
        selectedLotteryKeys: keys,
        cart,
      });

      if (!result.ok) {
        const extra =
          result.errors && result.errors.length > 0
            ? `\n${result.errors.join("\n")}`
            : "";
        throw new Error(`${result.error}${extra}`);
      }

      const data = result.data;
      const lines = data.lines as CartLine[];
      if (!lines.length) {
        throw new Error("No se agregó ninguna jugada al carrito.");
      }

      const msgs: string[] = [];
      if (data.warnings?.length) msgs.push(...data.warnings);
      if (data.errors?.length) msgs.push(...data.errors);
      const warning = msgs.length ? msgs.join(" ") : undefined;

      onAddLines(lines, data.displayTicketNumber, warning);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al duplicar.");
    } finally {
      setLoading(false);
    }
  }, [preview, selectedKeys, cart, onAddLines, onClose]);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    if (initialTicketNumber) setTicketQuery(initialTicketNumber);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open, reset, initialTicketNumber]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function onSearch(e?: React.FormEvent) {
    e?.preventDefault();
    await loadPreview(ticketQuery.trim());
  }

  function toggleKey(key: string, openLot: boolean) {
    if (!openLot) return;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllOpen() {
    setSelectedKeys(new Set(openLotteries.map((l) => l.key)));
  }

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  if (!open) return null;

  const createdLabel = preview
    ? new Date(preview.createdAt).toLocaleString("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className="cajero-vq-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="cajero-vq-modal cajero-vq-modal--dup"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="cajero-dup-title"
      >
        <header className="cajero-vq-modal-head">
          <h2 id="cajero-dup-title">Duplicar ticket</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>

        {step === "search" && (
          <form className="cajero-vq-modal-body" onSubmit={onSearch}>
            <label className="cajero-vq-dup-field">
              <span>Número de ticket o QR</span>
              <div className="cajero-vq-dup-input-row">
                <input
                  ref={inputRef}
                  type="text"
                  value={ticketQuery}
                  onChange={(e) => setTicketQuery(e.target.value)}
                  placeholder="Ej. T-000126 o 126"
                  autoComplete="off"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="cajero-vq-dup-qr-btn"
                  onClick={() => setQrOpen(true)}
                  disabled={loading}
                >
                  Leer QR
                </button>
              </div>
            </label>

            {error && <p className="cajero-vq-modal-error">{error}</p>}

            <div className="cajero-vq-dup-actions">
              <button
                type="button"
                className="cajero-vq-dup-btn ghost"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="cajero-vq-dup-btn primary"
                disabled={loading || !ticketQuery.trim()}
              >
                {loading ? "Buscando…" : "Buscar ticket"}
              </button>
            </div>
          </form>
        )}

        {step === "select" && preview && (
          <div className="cajero-vq-modal-body cajero-vq-dup-select">
            <div className="cajero-vq-dup-summary">
              <p>
                <strong>Ticket:</strong> {preview.displayTicketNumber}
              </p>
              <p>
                <strong>Fecha:</strong> {createdLabel}
              </p>
              <p>
                <strong>Total:</strong> {formatMoney(preview.totalAmount)}
              </p>
              {preview.internalTicketCode &&
                preview.internalTicketCode !== preview.displayTicketNumber && (
                  <p className="cajero-vq-dup-internal">
                    Código interno: {preview.internalTicketCode}
                  </p>
                )}
            </div>

            <p className="cajero-vq-dup-section-title">Loterías en el ticket</p>
            <ul className="cajero-vq-dup-lottery-list">
              {preview.lotteries.map((lot) => (
                <li
                  key={lot.key}
                  className={cn(
                    "cajero-vq-dup-lottery-item",
                    !lot.open && "is-closed"
                  )}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(lot.key)}
                      disabled={!lot.open || loading}
                      onChange={() => toggleKey(lot.key, lot.open)}
                    />
                    <span className="cajero-vq-dup-lottery-name">{lot.label}</span>
                    <span className="cajero-vq-dup-lottery-meta">
                      {lot.playCount} jug. · {formatMoney(lot.subtotal)}
                    </span>
                  </label>
                  {!lot.open && lot.closedMessage && (
                    <p className="cajero-vq-dup-lottery-closed">
                      {lot.closedMessage}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {info && <p className="cajero-vq-modal-note">{info}</p>}
            {error && <p className="cajero-vq-modal-error">{error}</p>}

            <div className="cajero-vq-dup-toolbar">
              <button
                type="button"
                className="cajero-vq-dup-btn ghost"
                onClick={selectAllOpen}
                disabled={loading || openLotteries.length === 0}
              >
                Seleccionar todas
              </button>
              <button
                type="button"
                className="cajero-vq-dup-btn ghost"
                onClick={clearSelection}
                disabled={loading}
              >
                Limpiar
              </button>
            </div>

            <div className="cajero-vq-dup-actions">
              <button
                type="button"
                className="cajero-vq-dup-btn ghost"
                onClick={() => {
                  setStep("search");
                  setError("");
                }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="cajero-vq-dup-btn primary"
                onClick={() => void applyDuplicate()}
                disabled={loading || selectedKeys.size === 0}
              >
                {loading ? "Validando…" : "Duplicar seleccionadas"}
              </button>
            </div>
          </div>
        )}
      </div>

      <CajeroQrScannerModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onScan={(raw) => {
          setQrOpen(false);
          const parsed = parseTicketQrPayload(raw);
          const queries = parsed ? ticketQrSearchQueries(parsed) : [raw];
          const primary = queries[0] ?? raw;
          setTicketQuery(primary);
          void loadPreview(primary);
        }}
      />
    </div>
  );
}
