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

const STARS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: 10 + (i * 6) % 80,
  delay: (i * 0.05) % 0.45,
  size: 4 + (i % 3) * 2,
  drift: -30 + (i * 11) % 60,
  rise: -70 - (i % 5) * 18,
}));

export function CoinBurst({
  active,
  generation,
  variant = "coins",
}: {
  active: boolean;
  generation: number;
  variant?: "coins" | "stars";
}) {
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

  const pieces = variant === "stars" ? STARS : COINS;

  return (
    <div
      className={cn(
        "slot-coin-burst",
        variant === "stars" && "slot-coin-burst--stars"
      )}
      aria-hidden
      key={generation}
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={cn(
            "slot-coin-burst-piece",
            variant === "stars" && "slot-coin-burst-piece--star"
          )}
          style={
            {
              "--coin-left": `${piece.left}%`,
              "--coin-delay": `${piece.delay}s`,
              "--coin-size": `${piece.size}px`,
              "--coin-drift": `${piece.drift}px`,
              ...(variant === "stars"
                ? { "--coin-rise": `${(piece as (typeof STARS)[number]).rise}px` }
                : {}),
            } as CSSProperties
          }
        />
      ))}
      <div
        className={cn(
          "slot-coin-burst-flash",
          variant === "stars" && "slot-coin-burst-flash--stars"
        )}
      />
    </div>
  );
}
