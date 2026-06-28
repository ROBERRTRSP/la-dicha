"use client";

import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function SlotFreeSpinSummary({
  totalWin,
  spinsPlayed,
  onDismiss,
}: {
  totalWin: number;
  spinsPlayed: number;
  onDismiss: () => void;
}) {
  return (
    <div className="slot-free-spin-summary" role="alert">
      <p className="slot-free-spin-summary-title">Ronda gratis terminada</p>
      <p className="slot-free-spin-summary-stats">
        {spinsPlayed} {spinsPlayed === 1 ? "giro" : "giros"} ·{" "}
        <strong className={cn(totalWin > 0 && "slot-free-spin-summary-win")}>
          {totalWin > 0 ? `+${formatMoney(totalWin)}` : "Sin premio"}
        </strong>
      </p>
      <button type="button" className="slot-free-spin-summary-btn" onClick={onDismiss}>
        Continuar
      </button>
    </div>
  );
}
