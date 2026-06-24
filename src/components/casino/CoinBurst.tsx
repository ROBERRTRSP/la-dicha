"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const COINS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: 15 + (i * 7) % 70,
  delay: (i * 0.06) % 0.5,
  size: 6 + (i % 4) * 2,
  drift: -20 + (i * 13) % 40,
}));

export function CoinBurst({ active, generation }: { active: boolean; generation: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    setShow(true);
    const t = window.setTimeout(() => setShow(false), 1200);
    return () => window.clearTimeout(t);
  }, [active, generation]);

  if (!show) return null;

  return (
    <div className="slot-coin-burst" aria-hidden key={generation}>
      {COINS.map((c) => (
        <span
          key={c.id}
          className="slot-coin-burst-piece"
          style={
            {
              "--coin-left": `${c.left}%`,
              "--coin-delay": `${c.delay}s`,
              "--coin-size": `${c.size}px`,
              "--coin-drift": `${c.drift}px`,
            } as CSSProperties
          }
        />
      ))}
      <div className={cn("slot-coin-burst-flash")} />
    </div>
  );
}
