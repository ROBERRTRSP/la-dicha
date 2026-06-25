"use client";

import { useEffect, useRef } from "react";
import { SlotPayTableContent } from "./SlotPayTable";
import type { SlotGameId } from "@/lib/slots/types";
import { cn } from "@/lib/utils";

export function SlotRulesButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn("slot-rules-btn", className)}
      onClick={onClick}
      aria-haspopup="dialog"
    >
      <span className="slot-rules-btn-icon" aria-hidden>
        i
      </span>
      <span className="slot-rules-btn-label">Reglas</span>
    </button>
  );
}

export function SlotRulesPanel({
  open,
  onClose,
  gameId,
  bet,
}: {
  open: boolean;
  onClose: () => void;
  gameId: SlotGameId;
  bet: number;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="slot-rules-backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="slot-rules-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-rules-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="slot-rules-header">
          <h2 id="slot-rules-title" className="slot-rules-title">
            Reglas y pagos
          </h2>
          <button
            type="button"
            className="slot-rules-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        <div className="slot-rules-body">
          <div className="slot-rules-intro">
            <p>
              Gira los <strong>5 rodillos</strong> y gana alineando símbolos en
              las <strong>10 líneas de pago</strong> de izquierda a derecha.
              Elige tu apuesta total y pulsa <strong>GIRAR</strong>.
            </p>
          </div>
          <SlotPayTableContent gameId={gameId} bet={bet} />
        </div>
      </div>
    </div>
  );
}
