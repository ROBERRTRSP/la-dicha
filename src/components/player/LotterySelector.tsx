"use client";

import { cn, formatTime12 } from "@/lib/utils";
import type { OpenDrawView } from "@/lib/draws";
import { statusLabel } from "@/lib/draws";

function formatCountdown(seconds: number) {
  if (seconds <= 0) return "Cerrada";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function LotterySelector({
  draws,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  draws: OpenDrawView[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  return (
    <section className="px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-[#1e3a5f] text-lg">Loterías</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs font-semibold text-[#0d9488] px-2 py-1"
          >
            Todas
          </button>
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-slate-500 px-2 py-1"
          >
            Limpiar
          </button>
        </div>
      </div>

      {draws.length === 0 ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          No hay loterías abiertas en este momento. Vuelve más tarde o revisa
          resultados.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 mt-3">
          {draws.map((d) => {
            const isSelected = selected.has(d.id);
            const isClosing = d.status === "CLOSING_SOON";
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onToggle(d.id)}
                className={cn(
                  "lottery-card text-left w-full",
                  isSelected && "selected",
                  isClosing && !isSelected && "closing"
                )}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-bold text-[#1e3a5f] text-base leading-snug">
                      {d.lotteryName}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Sorteo {formatTime12(d.drawTime)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "text-xs font-bold uppercase",
                        d.status === "OPEN" && "status-open",
                        d.status === "CLOSING_SOON" && "status-closing",
                        d.status === "CLOSED" && "status-closed"
                      )}
                    >
                      {statusLabel(d.status)}
                    </span>
                    {d.status !== "CLOSED" && (
                      <p className="text-xs text-slate-400 mt-1">
                        {formatCountdown(d.secondsLeft)}
                      </p>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <p className="text-xs text-[#0d9488] font-semibold mt-2">
                    ✓ Seleccionada
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
