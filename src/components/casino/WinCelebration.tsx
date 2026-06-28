"use client";

import type { CSSProperties } from "react";
import {
  CASINO_ART,
  winCelebrationPanelPosition,
} from "@/lib/casino-art";
import type { SlotGameId } from "@/lib/slots/types";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type WinCelebrationMode = "win" | "free-spin";

const WIN_COPY: Record<
  SlotGameId,
  { badge: string; title: string; megaTitle: string; signature: string }
> = {
  "treasure-skunk": {
    badge: "BOSQUE DEL TESORO",
    title: "COFRE ABIERTO",
    megaTitle: "TESORO LEGENDARIO",
    signature: "Racha de cofres",
  },
  "magic-lamp": {
    badge: "DESEO CUMPLIDO",
    title: "MAGIA DEL GENIO",
    megaTitle: "PODER DE LAMPARA",
    signature: "Suerte encantada",
  },
  "golden-ox": {
    badge: "FORTUNA DEL TORO",
    title: "FUEGO DORADO",
    megaTitle: "EMBESTIDA DE ORO",
    signature: "Ritmo de fortuna",
  },
  "moon-wolf": {
    badge: "NOCHE LUNAR",
    title: "AULLIDO GANADOR",
    megaTitle: "MANADA DE PREMIOS",
    signature: "Poder de la luna",
  },
  "classic-7": {
    badge: "CLASICA 7",
    title: "SIETE GANADOR",
    megaTitle: "JACKPOT CLASICO",
    signature: "Estilo retro premium",
  },
};

const FREE_SPIN_COPY: Record<
  SlotGameId,
  {
    badge: string;
    title: string;
    autoTitle: string;
    megaTitle: string;
    signature: string;
    autoSignature: string;
  }
> = {
  "treasure-skunk": {
    badge: "COFRE DESBLOQUEADO",
    title: "GIROS GRATIS",
    autoTitle: "BONO DEL BOSQUE",
    megaTitle: "RACHA DE COFRES",
    signature: "Tesoro sin costo",
    autoSignature: "1 gratis cada 4 giros pagados",
  },
  "magic-lamp": {
    badge: "LAMPARA ACTIVA",
    title: "GIROS DEL GENIO",
    autoTitle: "DESEO EXTRA",
    megaTitle: "TORBELLINO MAGICO",
    signature: "Magia sin apuesta",
    autoSignature: "1 gratis cada 4 giros pagados",
  },
  "golden-ox": {
    badge: "FUEGO DE FORTUNA",
    title: "GIROS GRATIS",
    autoTitle: "EMBESTIDA GRATIS",
    megaTitle: "TORO DORADO",
    signature: "Gira sin pagar",
    autoSignature: "1 gratis cada 4 giros pagados",
  },
  "moon-wolf": {
    badge: "LUNA DE SUERTE",
    title: "GIROS NOCTURNOS",
    autoTitle: "AULLIDO GRATIS",
    megaTitle: "MANADA ACTIVA",
    signature: "Noche de giros free",
    autoSignature: "1 gratis cada 4 giros pagados",
  },
  "classic-7": {
    badge: "CLASICA 7",
    title: "GIRO GRATIS",
    autoTitle: "BONO RETRO",
    megaTitle: "SIETE DE LA SUERTE",
    signature: "Estilo vintage sin costo",
    autoSignature: "1 gratis cada 4 giros pagados",
  },
};

const LIGHT_BULBS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  delay: (i * 0.08) % 0.85,
}));

const CONFETTI_PIECES = Array.from({ length: 34 }, (_, i) => ({
  id: i,
  left: 4 + (i * 2.8) % 92,
  delay: (i * 0.05) % 1.2,
  duration: 0.95 + (i % 5) * 0.22,
  drift: -42 + (i * 13) % 84,
  rotate: 90 + (i * 37) % 270,
  size: 10 + (i % 4) * 3,
  shape: i % 3,
}));

export function WinCelebration({
  active,
  amount = 0,
  freeSpins = 0,
  gameId,
  mode = "win",
  autoBonus = false,
  big = false,
}: {
  active: boolean;
  amount?: number;
  freeSpins?: number;
  gameId: SlotGameId;
  mode?: WinCelebrationMode;
  autoBonus?: boolean;
  big?: boolean;
}) {
  const isFreeSpin = mode === "free-spin";
  if (!active) return null;
  if (isFreeSpin && freeSpins <= 0) return null;
  if (!isFreeSpin && amount <= 0) return null;

  const winCopy = WIN_COPY[gameId];
  const freeCopy = FREE_SPIN_COPY[gameId];
  const badge = isFreeSpin ? freeCopy.badge : winCopy.badge;
  const title = isFreeSpin
    ? autoBonus
      ? freeCopy.autoTitle
      : freeCopy.title
    : big
      ? winCopy.megaTitle
      : winCopy.title;
  const signature = isFreeSpin
    ? autoBonus
      ? freeCopy.autoSignature
      : freeCopy.signature
    : winCopy.signature;
  const headline = isFreeSpin
    ? `${freeSpins} ${freeSpins === 1 ? "GIRO GRATIS" : "GIROS GRATIS"}`
    : formatMoney(amount);

  return (
    <div
      className={cn(
        "slot-win-celebration",
        big && "slot-win-celebration--big",
        isFreeSpin && "slot-win-celebration--free-spin",
        autoBonus && "slot-win-celebration--auto-bonus",
        `slot-win-celebration--${gameId}`
      )}
      role="status"
      aria-live="polite"
      aria-label={
        isFreeSpin
          ? `${title}: ${freeSpins} giros gratis`
          : `${title}: ganaste ${formatMoney(amount)}`
      }
    >
      <div
        className="slot-win-celebration__art"
        style={
          {
            backgroundImage: `url(${CASINO_ART.winCelebrationSplash})`,
            backgroundPosition: winCelebrationPanelPosition(gameId),
          } as CSSProperties
        }
        aria-hidden
      />
      <div className="slot-win-celebration__art-shine" aria-hidden />
      <div className="slot-win-celebration__bulbs" aria-hidden>
        {LIGHT_BULBS.map((bulb) => (
          <span
            key={bulb.id}
            className="slot-win-celebration__bulb"
            style={{ "--bulb-delay": `${bulb.delay}s` } as CSSProperties}
          />
        ))}
      </div>
      <div className="slot-win-celebration__confetti" aria-hidden>
        {CONFETTI_PIECES.map((piece) => (
          <span
            key={piece.id}
            className={cn(
              "slot-win-celebration__confetti-piece",
              piece.shape === 1 && "slot-win-celebration__confetti-piece--dot",
              piece.shape === 2 && "slot-win-celebration__confetti-piece--shard"
            )}
            style={
              {
                "--confetti-left": `${piece.left}%`,
                "--confetti-delay": `${piece.delay}s`,
                "--confetti-duration": `${piece.duration}s`,
                "--confetti-drift": `${piece.drift}px`,
                "--confetti-rotate": `${piece.rotate}deg`,
                "--confetti-size": `${piece.size}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="slot-win-celebration__rays" aria-hidden />
      <div className="slot-win-celebration__copy">
        <span className="slot-win-celebration__badge">{badge}</span>
        <strong className="slot-win-celebration__title">{title}</strong>
        <strong
          className={cn(
            "slot-win-celebration__amount",
            isFreeSpin && "slot-win-celebration__amount--free"
          )}
        >
          {headline}
        </strong>
        <span className="slot-win-celebration__signature">{signature}</span>
      </div>
    </div>
  );
}
