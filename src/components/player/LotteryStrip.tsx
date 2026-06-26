"use client";

import { useMemo } from "react";
import { cn, formatTime12 } from "@/lib/utils";
import type { OpenDrawView } from "@/lib/draws";
import { statusLabel } from "@/lib/draws";
import { LotteryLogo } from "@/components/player/LotteryLogo";
import {
  buildPlayStripItems,
  getOpenSuperPales,
  type OpenSuperPaleView,
} from "@/lib/super-pale";

function formatCountdown(seconds: number) {
  if (seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function SuperPaleChip({
  sp,
  isSelected,
  onToggle,
}: {
  sp: OpenSuperPaleView;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSelected}
      aria-label={`${sp.name}, ${formatTime12(sp.sortTime)}, ${statusLabel(sp.status)}`}
      className={cn(
        "play-lottery-chip play-lottery-chip--super",
        isSelected && "selected",
        sp.status === "CLOSING_SOON" && !isSelected && "closing"
      )}
    >
      <div className="play-lottery-chip-duo">
        <LotteryLogo
          code={sp.lotteryCodeA}
          name={sp.lotteryNameA}
          size={26}
          decorative
          className="play-lottery-chip-logo"
        />
        <LotteryLogo
          code={sp.lotteryCodeB}
          name={sp.lotteryNameB}
          size={26}
          decorative
          className="play-lottery-chip-logo"
        />
      </div>
      <div className="play-lottery-chip-body">
        <p className="play-lottery-chip-name">{sp.name}</p>
        <p
          className={cn(
            "play-lottery-chip-meta",
            sp.status === "OPEN" ? "open" : "closing-text"
          )}
        >
          {formatTime12(sp.sortTime)}
          {" · "}
          {statusLabel(sp.status)}
          {sp.secondsLeft > 0 && sp.status === "CLOSING_SOON"
            ? ` ${formatCountdown(sp.secondsLeft)}`
            : ""}
        </p>
      </div>
      {isSelected && <span className="play-lottery-chip-check" aria-hidden />}
    </button>
  );
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
  const superPales = useMemo(() => getOpenSuperPales(draws), [draws]);
  const stripItems = useMemo(
    () => buildPlayStripItems(draws, superPales),
    [draws, superPales]
  );

  const hasOpenGames = draws.length > 0 || superPales.length > 0;

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
        {stripItems.map((item) => {
          if (item.kind === "super_pale") {
            const sp = item.superPale;
            return (
              <SuperPaleChip
                key={sp.id}
                sp={sp}
                isSelected={selected.has(sp.id)}
                onToggle={() => onToggle(sp.id)}
              />
            );
          }

          const d = item.draw;
          const isSelected = selected.has(d.id);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onToggle(d.id)}
              aria-pressed={isSelected}
              aria-label={`${d.lotteryName}, ${formatTime12(d.drawTime)}, ${statusLabel(d.status)}`}
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

      {!hasOpenGames ? (
        <p className="text-xs text-amber-700 px-3 py-2 text-center">
          No hay loterías abiertas ahora. Revisa más tarde o juega Ruleta abajo.
        </p>
      ) : (
        <p className="play-lottery-hint">
          Desliza →
          {draws.length > 0 &&
            ` ${draws.length} lotería${draws.length !== 1 ? "s" : ""}`}
          {superPales.length > 0 &&
            `${draws.length > 0 ? " ·" : ""} ${superPales.length} súper palé${superPales.length !== 1 ? "s" : ""}`}
        </p>
      )}
    </section>
  );
}
