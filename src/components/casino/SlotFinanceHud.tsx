"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { getSlotUiPace } from "@/lib/slots/mobile-pace";
import { useSlotMobile } from "@/components/casino/useSlotMobile";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedWinValue({
  value,
  pending,
  generation = 0,
  className,
}: {
  value: number | null;
  pending?: boolean;
  generation?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);
  const isMobile = useSlotMobile();
  const winCountMs = getSlotUiPace(isMobile).winCountMs;

  useEffect(() => {
    if (pending || value === null) {
      setDisplay(0);
      return;
    }
    if (value <= 0) {
      setDisplay(0);
      return;
    }

    const start = performance.now();
    const to = value;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / winCountMs);
      setDisplay(to * easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, pending, generation, winCountMs]);

  if (pending || value === null) {
    return <strong className={className}>—</strong>;
  }

  if (value > 0) {
    return (
      <strong className={cn("slot-finance-value--win", className)}>
        + {formatMoney(display)}
      </strong>
    );
  }

  return <strong className={className}>{formatMoney(0)}</strong>;
}

export function SlotFinanceHud({
  balance,
  balanceNode,
  bet,
  win,
  winPending,
  freeMode,
  lineCount = 10,
  className,
  hideBalance,
  winGeneration = 0,
}: {
  balance: number;
  balanceNode?: ReactNode;
  bet: number;
  win: number | null;
  winPending?: boolean;
  freeMode?: boolean;
  lineCount?: number;
  className?: string;
  /** Oculta saldo cuando ya aparece en el header (evita duplicado). */
  hideBalance?: boolean;
  winGeneration?: number;
}) {
  const betPerLine = lineCount > 0 ? bet / lineCount : bet;

  return (
    <div
      className={cn(
        "slot-finance-hud",
        hideBalance && "slot-finance-hud--compact",
        className
      )}
      role="group"
      aria-label="Estado financiero"
    >
      {!hideBalance && (
        <div className="slot-finance-cell slot-finance-cell--balance">
          <span className="slot-finance-label">Saldo</span>
          <strong className="slot-finance-value slot-finance-value--balance">
            {balanceNode ?? formatMoney(balance)}
          </strong>
        </div>
      )}
      <div className="slot-finance-cell slot-finance-cell--bet">
        <span className="slot-finance-label">Apuesta total</span>
        <strong className="slot-finance-value">
          {freeMode ? "GRATIS" : formatMoney(bet)}
        </strong>
        <span className="slot-finance-meta">
          {freeMode
            ? `${lineCount} líneas activas`
            : `${lineCount} líneas · ${formatMoney(betPerLine)}/línea`}
        </span>
      </div>
      <div className="slot-finance-cell slot-finance-cell--win">
        <span className="slot-finance-label">Premio</span>
        <AnimatedWinValue
          value={win}
          pending={winPending}
          generation={winGeneration}
        />
      </div>
    </div>
  );
}
