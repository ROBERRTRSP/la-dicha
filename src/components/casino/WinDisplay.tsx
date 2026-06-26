"use client";

import { useEffect, useRef, useState } from "react";
import { getSlotUiPace } from "@/lib/slots/mobile-pace";
import { useSlotMobile } from "@/components/casino/useSlotMobile";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function WinDisplay({
  amount,
  generation,
  className,
}: {
  amount: number;
  generation: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  const isMobile = useSlotMobile();
  const winCountMs = getSlotUiPace(isMobile).winCountMs;

  useEffect(() => {
    if (amount <= 0) {
      setDisplay(0);
      return;
    }

    const start = performance.now();
    const from = 0;
    const to = amount;
    const duration = winCountMs;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(from + (to - from) * easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [amount, generation, winCountMs]);

  if (amount <= 0) return null;

  return (
    <div className={cn("slot-win-display", className)} key={generation}>
      <span className="slot-win-display-label">PREMIO</span>
      <span className="slot-win-display-value">+ {formatMoney(display)}</span>
    </div>
  );
}

export function AnimatedBalance({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const duration = 600;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(from + (to - from) * easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else prevRef.current = to;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return (
    <strong className={className}>{formatMoney(display)}</strong>
  );
}
