"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";

export function RouletteAccess() {
  const [active, setActive] = useState(true);

  useEffect(() => {
    fetch("/api/roulette/status")
      .then((r) => r.json())
      .then((d) => setActive(d.active !== false))
      .catch(() => {});
  }, []);

  if (!active) {
    return (
      <div className="play-roulette-compact play-roulette-compact--off" aria-hidden>
        <span>Ruleta desactivada</span>
      </div>
    );
  }

  return (
    <Link href="/ruleta" className="play-roulette-compact" aria-label="Jugar Ruleta La Dicha">
      <AiVisual
        src={ART.ruletaChip}
        alt=""
        width={28}
        height={28}
        className="play-roulette-compact-art"
      />
      <span className="play-roulette-compact-label">Ruleta La Dicha</span>
      <span className="play-roulette-compact-cta">Jugar →</span>
    </Link>
  );
}
