"use client";

import type { ReactNode } from "react";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function SlotFinanceHud({
  balance,
  balanceNode,
  bet,
  win,
  winPending,
  freeMode,
  lineCount = 10,
  className,
}: {
  balance: number;
  balanceNode?: ReactNode;
  bet: number;
  win: number | null;
  winPending?: boolean;
  freeMode?: boolean;
  lineCount?: number;
  className?: string;
}) {
  const winLabel =
    winPending || win === null
      ? "—"
      : win > 0
        ? `+ ${formatMoney(win)}`
        : formatMoney(0);

  return (
    <div className={cn("slot-finance-hud", className)} role="group" aria-label="Estado financiero">
      <div className="slot-finance-cell slot-finance-cell--balance">
        <span className="slot-finance-label">Saldo</span>
        <strong className="slot-finance-value slot-finance-value--balance">
          {balanceNode ?? formatMoney(balance)}
        </strong>
      </div>
      <div className="slot-finance-cell slot-finance-cell--bet">
        <span className="slot-finance-label">Apuesta total</span>
        <strong className="slot-finance-value">
          {freeMode ? "GRATIS" : formatMoney(bet)}
        </strong>
        <span className="slot-finance-meta">{lineCount} líneas</span>
      </div>
      <div className="slot-finance-cell slot-finance-cell--win">
        <span className="slot-finance-label">Premio</span>
        <strong
          className={cn(
            "slot-finance-value",
            win != null && win > 0 && "slot-finance-value--win"
          )}
        >
          {winLabel}
        </strong>
      </div>
    </div>
  );
}
