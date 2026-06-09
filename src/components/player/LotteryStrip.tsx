"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";
import { cn, formatTime12 } from "@/lib/utils";
import type { OpenDrawView } from "@/lib/draws";
import { statusLabel } from "@/lib/draws";
import { LotteryLogo } from "@/components/player/LotteryLogo";

function formatCountdown(seconds: number) {
  if (seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LotteryStrip({
  draws,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  draws: OpenDrawView[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  onSelectAll: () => void;
}) {
  const [rouletteActive, setRouletteActive] = useState(true);

  useEffect(() => {
    fetch("/api/roulette/status")
      .then((r) => r.json())
      .then((d) => setRouletteActive(d.active !== false))
      .catch(() => {});
  }, []);

  return (
    <section className="play-lottery-strip">
      <div className="play-lottery-strip-header">
        <p className="play-lottery-strip-title">Loterías · por hora de salida</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-[11px] font-bold text-[#0d9488]"
          >
            Todas
          </button>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-bold text-slate-400"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="play-lottery-scroll">
        {rouletteActive ? (
          <Link href="/ruleta" className="play-lottery-chip play-lottery-chip--ruleta">
            <AiVisual
              src={ART.ruletaChip}
              alt=""
              width={32}
              height={32}
              className="play-lottery-chip-art"
            />
            <div className="play-lottery-chip-body">
              <p className="play-lottery-chip-name">Ruleta</p>
              <p className="play-lottery-chip-meta open">Siempre abierta · Jugar</p>
            </div>
          </Link>
        ) : (
          <div className="play-lottery-chip play-lottery-chip--ruleta disabled">
            <AiVisual
              src={ART.ruletaChip}
              alt=""
              width={32}
              height={32}
              className="play-lottery-chip-art"
            />
            <div className="play-lottery-chip-body">
              <p className="play-lottery-chip-name">Ruleta</p>
              <p className="play-lottery-chip-meta">Desactivada</p>
            </div>
          </div>
        )}

        {draws.map((d) => {
              const isSelected = selected.has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onToggle(d.id)}
                  className={cn(
                    "play-lottery-chip",
                    isSelected && "selected",
                    d.status === "CLOSING_SOON" && !isSelected && "closing"
                  )}
                >
                  <LotteryLogo
                    code={d.lotteryCode}
                    name={d.lotteryName}
                    logoUrl={d.logoUrl}
                    size={32}
                    decorative
                    className="play-lottery-chip-logo"
                  />
                  <div className="play-lottery-chip-body">
                    <p className="play-lottery-chip-name">{d.lotteryName}</p>
                    <p
                      className={cn(
                        "play-lottery-chip-meta",
                        d.status === "OPEN" ? "open" : "closing-text"
                      )}
                    >
                      {formatTime12(d.drawTime)}
                      {" · "}
                      {statusLabel(d.status)}
                      {d.secondsLeft > 0 && d.status === "CLOSING_SOON"
                        ? ` ${formatCountdown(d.secondsLeft)}`
                        : ""}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="play-lottery-chip-check" aria-hidden />
                  )}
                </button>
              );
        })}
      </div>

      {draws.length === 0 ? (
        <p className="text-xs text-amber-700 px-3 py-2 text-center">
          No hay más loterías abiertas ahora. Puedes jugar Ruleta.
        </p>
      ) : (
        <p className="play-lottery-hint">
          Desliza → · Ruleta + {draws.length} lotería
          {draws.length !== 1 ? "s" : ""}
        </p>
      )}
    </section>
  );
}
