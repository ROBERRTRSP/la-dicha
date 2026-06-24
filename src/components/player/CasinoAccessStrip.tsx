"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AiVisual } from "@/components/ui/AiVisual";
import { CASINO_ART } from "@/lib/casino-art";
import { SLOT_GAME_LIST } from "@/lib/slots/games";
import { ART } from "@/lib/visual-assets";

const SLOT_SHORT: Record<string, string> = {
  "treasure-skunk": "Zorrillo",
  "magic-lamp": "Lámpara",
  "golden-ox": "Toro",
  "moon-wolf": "Lobo",
};

export function CasinoAccessStrip() {
  const [rouletteActive, setRouletteActive] = useState(true);
  const [slotsActive, setSlotsActive] = useState(true);

  useEffect(() => {
    fetch("/api/roulette/status")
      .then((r) => r.json())
      .then((d) => setRouletteActive(d.active !== false))
      .catch(() => {});
    fetch("/api/slots/spin")
      .then((r) => r.json())
      .then((d) => setSlotsActive(d.active !== false))
      .catch(() => {});
  }, []);

  if (!rouletteActive && !slotsActive) return null;

  return (
    <section className="play-casino-strip" aria-label="Casino La Dicha">
      <div className="play-casino-strip-head">
        <span className="play-casino-strip-title">Casino La Dicha</span>
        <Link href="/ruleta" className="play-casino-strip-all">
          Ver todo →
        </Link>
      </div>
      <div className="play-casino-strip-scroll">
        {rouletteActive && (
          <Link href="/ruleta/roulette" className="play-casino-chip">
            <AiVisual
              src={ART.ruletaChip}
              alt=""
              width={40}
              height={40}
              className="play-casino-chip-img"
            />
            <span>Ruleta</span>
          </Link>
        )}
        {slotsActive &&
          SLOT_GAME_LIST.map((game) => (
            <Link
              key={game.id}
              href={`/ruleta/${game.id}`}
              className={`play-casino-chip play-casino-chip--slot ${game.themeClass}`}
            >
              <Image
                src={CASINO_ART.thumbs[game.id]}
                alt=""
                width={40}
                height={40}
                className="play-casino-chip-img play-casino-chip-thumb"
              />
              <span>{SLOT_SHORT[game.id] ?? game.name}</span>
            </Link>
          ))}
      </div>
    </section>
  );
}
