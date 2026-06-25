"use client";

import { useEffect } from "react";
import { SlotSymbolSvg } from "../SlotSymbolSvg";
import { getSlotGame } from "@/lib/slots/games";
import { formatMoney } from "@/lib/utils";

export function Classic7PaytableModal({
  open,
  onClose,
  bet,
}: {
  open: boolean;
  onClose: () => void;
  bet: number;
}) {
  const game = getSlotGame("classic-7")!;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const order = [
    "red-seven",
    "triple-bar",
    "double-bar",
    "single-bar",
    "golden-bell",
    "diamond",
    "horseshoe",
    "cherry",
  ];

  return (
    <div className="classic7-paytable-backdrop" onClick={onClose} role="presentation">
      <div
        className="classic7-paytable-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="classic7-paytable-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="classic7-paytable-header">
          <h2 id="classic7-paytable-title">Tabla de pagos</h2>
          <button type="button" className="classic7-paytable-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="classic7-paytable-body">
          <p className="classic7-paytable-intro">
            Solo paga la <strong>línea central</strong>. Las combinaciones ganadoras cuentan desde el{" "}
            <strong>primer rodillo hacia la derecha</strong>.
          </p>
          <ul className="classic7-paytable-list">
            {order.map((id) => {
              const sym = game.symbols[id];
              if (!sym) return null;
              const rows = ([5, 4, 3, 2] as const)
                .filter((n) => sym.pays[n])
                .map((n) => (
                  <li key={n}>
                    {n} iguales = ×{sym.pays[n]} ({formatMoney(bet * (sym.pays[n] ?? 0))})
                  </li>
                ));
              return (
                <li key={id} className="classic7-paytable-row">
                  <SlotSymbolSvg symbolId={id} gameId="classic-7" size={44} />
                  <div>
                    <strong>{sym.label}</strong>
                    <ul>{rows}</ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
