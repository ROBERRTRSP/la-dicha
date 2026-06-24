"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { OpenDrawView } from "@/lib/draws";
import { LotteryLogo } from "@/components/player/LotteryLogo";
import {
  buildPlayStripItems,
  getOpenSuperPales,
  isSuperPaleId,
  type OpenSuperPaleView,
} from "@/lib/super-pale";
import {
  vanqueroStripLabelFromCode,
  vanqueroSuperStripLabel,
} from "@/lib/cajero-vanquero-display";

export function CajeroLotteryStrip({
  draws,
  superPales: superPalesProp,
  selected,
  focusId,
  multiLot,
  onToggle,
  onSelectAll,
  onClear,
  onSetSingleLot,
  onSetMultiLot,
}: {
  draws: OpenDrawView[];
  superPales?: OpenSuperPaleView[];
  selected: Set<string>;
  focusId?: string | null;
  multiLot: boolean;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onSetSingleLot: () => void;
  onSetMultiLot: () => void;
}) {
  const superPales = useMemo(
    () => superPalesProp ?? getOpenSuperPales(draws),
    [superPalesProp, draws]
  );
  const stripItems = useMemo(
    () => buildPlayStripItems(draws, superPales),
    [draws, superPales]
  );

  if (stripItems.length === 0) {
    return (
      <div className="cajero-vq-lottery-panel">
        <div className="cajero-vq-strip cajero-vq-strip--empty">
          Sin loterías abiertas
        </div>
      </div>
    );
  }

  const selectedDrawCount = [...selected].filter(
    (id) => !isSuperPaleId(id)
  ).length;
  const selectedSuperCount = selected.size - selectedDrawCount;
  const selectedLabel =
    selected.size === 0
      ? "Ninguna"
      : selectedSuperCount > 0 && selectedDrawCount > 0
        ? `${selectedDrawCount} lot · ${selectedSuperCount} SP`
        : selectedSuperCount > 0
          ? `${selectedSuperCount} Súper Palé`
          : selectedDrawCount === 1
            ? "1 seleccionada"
            : `${selectedDrawCount} seleccionadas`;

  return (
    <div className="cajero-vq-lottery-panel">
      <div className="cajero-vq-strip">
        {stripItems.map((item) => {
          if (item.kind === "super_pale") {
            const sp = item.superPale;
            return (
              <StripButton
                key={sp.id}
                id={sp.id}
                label={vanqueroSuperStripLabel(sp.code, sp.name)}
                selected={selected.has(sp.id)}
                focused={focusId === sp.id}
                closing={sp.status === "CLOSING_SOON"}
                multi={selected.has(sp.id)}
                onToggle={() => onToggle(sp.id)}
                logos={
                  <div className="cajero-vq-strip-logos cajero-vq-strip-logos--duo">
                    <LotteryLogo
                      code={sp.lotteryCodeA}
                      name={sp.lotteryNameA}
                      size={20}
                      decorative
                    />
                    <LotteryLogo
                      code={sp.lotteryCodeB}
                      name={sp.lotteryNameB}
                      size={20}
                      decorative
                    />
                  </div>
                }
              />
            );
          }
          const d = item.draw;
          return (
            <StripButton
              key={d.id}
              id={d.id}
              label={vanqueroStripLabelFromCode(
                d.lotteryCode,
                d.lotteryName,
                d.drawTime
              )}
              selected={selected.has(d.id)}
              focused={focusId === d.id}
              closing={d.status === "CLOSING_SOON"}
              onToggle={() => onToggle(d.id)}
              multi={multiLot && selected.has(d.id)}
              logos={
                <LotteryLogo
                  code={d.lotteryCode}
                  name={d.lotteryName}
                  logoUrl={d.logoUrl}
                  size={24}
                  decorative
                  className="cajero-vq-strip-logo"
                />
              }
            />
          );
        })}
      </div>
      <div className="cajero-vq-lottery-bar">
        <button
          type="button"
          className={cn("cajero-vq-lot-mode", !multiLot && "active")}
          onClick={onSetSingleLot}
        >
          1 Lotería
        </button>
        <button
          type="button"
          className={cn("cajero-vq-lot-mode", multiLot && "active")}
          onClick={onSetMultiLot}
        >
          Varias
        </button>
        <span className="cajero-vq-lot-count">{selectedLabel}</span>
        <button type="button" className="cajero-vq-lot-action" onClick={onSelectAll}>
          Todas
        </button>
        <button type="button" className="cajero-vq-lot-action muted" onClick={onClear}>
          Limpiar
        </button>
      </div>
    </div>
  );
}

function StripButton({
  id,
  label,
  logos,
  selected,
  focused,
  closing,
  multi,
  onToggle,
}: {
  id: string;
  label: string;
  logos?: React.ReactNode;
  selected: boolean;
  focused: boolean;
  closing?: boolean;
  multi?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-lot-id={id}
      onClick={onToggle}
      className={cn(
        "cajero-vq-strip-btn",
        selected && "selected",
        focused && "focused",
        closing && !selected && "closing",
        multi && "multi"
      )}
      title={label}
    >
      {multi && selected && (
        <span className="cajero-vq-strip-check" aria-hidden>
          ✓
        </span>
      )}
      {logos}
      <span className="cajero-vq-strip-label">{label}</span>
    </button>
  );
}
