"use client";

import Link from "next/link";
import { SLOT_GAME_LIST } from "@/lib/slots/games";
import { SlotSymbolSvg } from "@/components/casino/SlotSymbolSvg";
import type { SlotGameId } from "@/lib/slots/types";
import { formatMoney } from "@/lib/utils";

const PREVIEW: Record<SlotGameId, string[]> = {
  "treasure-skunk": ["SKUNK", "CHEST", "COINS", "DIAMOND", "GOLD_BAG"],
  "magic-lamp": ["LAMP", "GENIE", "RUBY", "STAR", "CARPET"],
  "golden-ox": ["OX", "INGOT", "RED_COIN", "FIRE", "A"],
  "moon-wolf": ["WOLF", "MOON", "MOUNTAIN", "CLAW", "STAR"],
};

export function SlotsLobby() {
  return (
    <div className="slots-lobby">
      <header className="slots-lobby-head">
        <h1 className="slots-lobby-title">Tragamonedas</h1>
        <p className="slots-lobby-sub">
          5 columnas × 3 filas · elige tu aventura
        </p>
      </header>
      <div className="slots-lobby-grid">
        {SLOT_GAME_LIST.map((game) => (
          <Link
            key={game.id}
            href={`/slots/${game.id}`}
            className={`slots-lobby-card ${game.themeClass}`}
          >
            <div className="slots-lobby-card-symbols">
              {(PREVIEW[game.id] ?? []).map((symbolId) => (
                <SlotSymbolSvg
                  key={symbolId}
                  symbolId={symbolId}
                  gameId={game.id}
                  size={40}
                />
              ))}
            </div>
            <h2>{game.name}</h2>
            <p>{game.tagline}</p>
            <span className="slots-lobby-card-bonus">{game.bonus.description}</span>
            <span className="slots-lobby-card-cta">Jugar →</span>
          </Link>
        ))}
      </div>
      <p className="slots-lobby-foot">
        Apuestas desde {formatMoney(1)} · Wilds y bonus en cada juego
      </p>
    </div>
  );
}
