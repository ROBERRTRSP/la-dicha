"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const STARS = [
  { id: 0, top: "8%", left: "12%", size: 3, delay: 0 },
  { id: 1, top: "14%", left: "28%", size: 2, delay: 0.4 },
  { id: 2, top: "6%", left: "52%", size: 2, delay: 1.1 },
  { id: 3, top: "18%", left: "68%", size: 3, delay: 0.7 },
  { id: 4, top: "22%", left: "84%", size: 2, delay: 1.8 },
  { id: 5, top: "32%", left: "8%", size: 2, delay: 2.2 },
  { id: 6, top: "38%", left: "42%", size: 2, delay: 0.9 },
  { id: 7, top: "28%", left: "92%", size: 2, delay: 1.4 },
  { id: 8, top: "48%", left: "22%", size: 2, delay: 2.6 },
  { id: 9, top: "52%", left: "76%", size: 3, delay: 0.2 },
] as const;

export function MoonWolfEffects({
  className,
  intense = false,
}: {
  className?: string;
  intense?: boolean;
}) {
  return (
    <div
      className={cn(
        "slot-wolf-effects",
        intense && "slot-wolf-effects--intense",
        className
      )}
      aria-hidden
    >
      <span className="slot-wolf-moon-glow" />
      <span className="slot-wolf-moonbeam" />
      <span className="slot-wolf-aurora slot-wolf-aurora--left" />
      <span className="slot-wolf-aurora slot-wolf-aurora--right" />
      {STARS.map((star) => (
        <span
          key={star.id}
          className="slot-wolf-star"
          style={
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animationDelay: `${star.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
