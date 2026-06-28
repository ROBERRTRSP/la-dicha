"use client";

import { useEffect, useState } from "react";
import type { SlotGameId } from "@/lib/slots/types";
import { getSlotGame } from "@/lib/slots/games";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "la-dicha-slot-onboard-v1-";

function onboardKey(gameId: SlotGameId) {
  return `${STORAGE_PREFIX}${gameId}`;
}

const BONUS_HINT: Partial<Record<SlotGameId, string>> = {
  "treasure-skunk": "3 cofres = giros gratis",
  "magic-lamp": "3 lámparas = giros gratis + multiplicador",
  "golden-ox": "3 fuegos = giros gratis + jackpots",
  "moon-wolf": "3 lunas = giros gratis bajo la noche",
  "classic-7": "3 sietes = giros gratis en la línea central",
};

export function SlotOnboarding({ gameId }: { gameId: SlotGameId }) {
  const [visible, setVisible] = useState(false);
  const game = getSlotGame(gameId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(onboardKey(gameId))) return;
    const t = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(t);
  }, [gameId]);

  function dismiss() {
    localStorage.setItem(onboardKey(gameId), "1");
    setVisible(false);
  }

  if (!visible || !game) return null;

  return (
    <div className="slot-onboarding" role="dialog" aria-label="Guía rápida">
      <div className="slot-onboarding-card">
        <p className="slot-onboarding-kicker">Guía rápida</p>
        <h2 className="slot-onboarding-title">{game.name}</h2>
        <ol className="slot-onboarding-steps">
          <li>
            Elige <strong>apuesta</strong> con los chips
          </li>
          <li>
            Toca <strong>GIRAR</strong> para jugar
          </li>
          <li>{BONUS_HINT[gameId] ?? "Scatter = bonos especiales"}</li>
          <li>Cada <strong>4 giros pagados</strong> = 1 giro gratis</li>
        </ol>
        <button type="button" className="slot-onboarding-btn" onClick={dismiss}>
          ¡Entendido!
        </button>
      </div>
    </div>
  );
}

export function SlotSoundToggle({
  muted,
  onToggle,
  className,
}: {
  muted: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn("slot-sound-toggle", muted && "slot-sound-toggle--muted", className)}
      onClick={onToggle}
      aria-label={muted ? "Activar sonido" : "Silenciar sonido"}
      title={muted ? "Activar sonido" : "Silenciar sonido"}
    >
      <span className="slot-sound-toggle-icon" aria-hidden />
      <span className="slot-sound-toggle-label">{muted ? "OFF" : "ON"}</span>
    </button>
  );
}
