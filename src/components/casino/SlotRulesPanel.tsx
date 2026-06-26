"use client";

import { useEffect, useRef, useState } from "react";
import { SlotPayTableContent } from "./SlotPayTable";
import type { SlotGameId } from "@/lib/slots/types";
import { cn } from "@/lib/utils";

export type SlotRulesSection = "rules" | "paytable";

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
  initialSection = "rules",
}: {
  open: boolean;
  onClose: () => void;
  gameId: SlotGameId;
  bet: number;
  initialSection?: SlotRulesSection;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<SlotRulesSection>(initialSection);

  useEffect(() => {
    if (open) setSection(initialSection);
  }, [open, initialSection]);

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
          <div className="slot-rules-header-main">
            <h2 id="slot-rules-title" className="slot-rules-title">
              {section === "rules" ? "Reglas del juego" : "Tabla de pagos"}
            </h2>
            <div className="slot-rules-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={section === "rules"}
                className={cn(
                  "slot-rules-tab",
                  section === "rules" && "slot-rules-tab--active"
                )}
                onClick={() => setSection("rules")}
              >
                Reglas
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={section === "paytable"}
                className={cn(
                  "slot-rules-tab",
                  section === "paytable" && "slot-rules-tab--active"
                )}
                onClick={() => setSection("paytable")}
              >
                Pagos
              </button>
            </div>
          </div>
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
          {section === "rules" ? (
            <div className="slot-rules-intro">
              <p>
                Gira los <strong>5 rodillos</strong> y gana alineando símbolos en
                las <strong>10 líneas de pago</strong> de izquierda a derecha.
                Elige tu apuesta total y pulsa <strong>GIRAR</strong>.
              </p>
              <p>
                Los símbolos <strong>Wild</strong> sustituyen a otros (excepto
                Scatter). Tres o más <strong>Scatter</strong> activan giros gratis
                según la tabla de pagos.
              </p>
              <p>
                Además, el sistema otorga automáticamente <strong>1 giro gratis
                por cada 4 giros pagados</strong>.
              </p>
            </div>
          ) : (
            <SlotPayTableContent gameId={gameId} bet={bet} />
          )}
        </div>
      </div>
    </div>
  );
}
