"use client";

import { cn } from "@/lib/utils";

export function SlotFreeModeBanner({
  freeSpinsLeft,
  className,
}: {
  freeSpinsLeft: number;
  className?: string;
}) {
  if (freeSpinsLeft <= 0) return null;

  return (
    <div className={cn("slot-free-mode-banner", className)} role="status">
      <span className="slot-free-mode-banner-badge">MODO GRATIS</span>
      <strong className="slot-free-mode-banner-count">
        {freeSpinsLeft} {freeSpinsLeft === 1 ? "giro" : "giros"}
      </strong>
      <span className="slot-free-mode-banner-sub">Sin costo · mismos premios</span>
    </div>
  );
}
