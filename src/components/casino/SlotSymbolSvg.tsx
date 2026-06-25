"use client";

import type { ComponentType } from "react";
import { useId, useState } from "react";
import { getSlotGame } from "@/lib/slots/games";
import { getSlotSymbolImage } from "@/lib/slots/symbol-assets";
import type { SlotGameId } from "@/lib/slots/types";
import { cn } from "@/lib/utils";
import { LampSymbolArt } from "./symbols/lamp-symbol-art";
import { OxSymbolArt } from "./symbols/ox-symbol-art";
import { WolfSymbolArt } from "./symbols/wolf-symbol-art";
import { SkunkSymbolArt } from "./symbols/skunk-symbol-art";
import { SlotSymbolArt, SLOT_THEME_ACCENT } from "./slot-symbol-art";

const GAME_ART: Partial<
  Record<
    SlotGameId,
    ComponentType<{
      symbolId: string;
      uid: string;
      isWild?: boolean;
      isScatter?: boolean;
    }>
  >
> = {
  "magic-lamp": LampSymbolArt,
  "golden-ox": OxSymbolArt,
  "moon-wolf": WolfSymbolArt,
  "treasure-skunk": SkunkSymbolArt,
};

export function SlotSymbolSvg({
  symbolId,
  gameId,
  className,
  size,
  variant = "fixed",
}: {
  symbolId: string;
  gameId: SlotGameId;
  className?: string;
  size?: number;
  variant?: "cell" | "fixed";
}) {
  const uid = useId().replace(/:/g, "");
  const game = getSlotGame(gameId);
  const sym = game?.symbols[symbolId];
  const Art = GAME_ART[gameId];
  const isCell = variant === "cell";

  const imgSrc = getSlotSymbolImage(gameId, symbolId);
  const [imgFailed, setImgFailed] = useState(false);

  // Render preferente: imagen premium del símbolo. Si falta el asset o falla
  // la carga, hacemos fallback al arte vectorial SVG (más abajo).
  if (imgSrc && !imgFailed) {
    return (
      <img
        src={imgSrc}
        alt={sym?.label ?? symbolId}
        draggable={false}
        loading={isCell ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={isCell ? "high" : "auto"}
        onError={() => setImgFailed(true)}
        className={cn(
          "slot-symbol-image",
          isCell && "slot-symbol-image--cell",
          `slot-symbol-image--${gameId}`,
          sym?.isWild && "slot-symbol-image--wild",
          sym?.isScatter && "slot-symbol-image--scatter",
          className
        )}
        {...(!isCell && size != null ? { width: size, height: size } : {})}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      {...(!isCell && size != null
        ? { width: size, height: size }
        : { width: undefined, height: undefined })}
      className={cn(
        "slot-symbol-svg",
        isCell && "slot-symbol-svg--cell",
        `slot-symbol-svg--${gameId}`,
        sym?.isWild && "slot-symbol-svg--wild",
        sym?.isScatter && "slot-symbol-svg--scatter",
        className
      )}
      aria-label={sym?.label}
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      {Art ? (
        <Art
          symbolId={symbolId}
          uid={uid}
          isWild={sym?.isWild}
          isScatter={sym?.isScatter}
        />
      ) : (
        <SlotSymbolArt
          symbolId={symbolId}
          uid={uid}
          accent={SLOT_THEME_ACCENT[gameId] ?? "#94a3b8"}
        />
      )}
    </svg>
  );
}
