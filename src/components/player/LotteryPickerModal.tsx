"use client";

import { X } from "lucide-react";
import { cn, formatTime12 } from "@/lib/utils";
import type { OpenDrawView } from "@/lib/draws";
import { statusLabel } from "@/lib/draws";

export function LotteryPickerModal({
  open,
  draws,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  onClose,
}: {
  open: boolean;
  draws: OpenDrawView[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[70dvh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-[#1e3a5f]">Elegir loterías</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs font-semibold text-[#0d9488]"
            >
              Todas
            </button>
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-slate-500"
            >
              Limpiar
            </button>
            <button type="button" onClick={onClose} className="p-1">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto p-4 space-y-2">
          {draws.map((d) => {
            const isSelected = selected.has(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onToggle(d.id)}
                className={cn(
                  "w-full text-left rounded-xl border-2 px-3 py-2.5 transition-colors",
                  isSelected
                    ? "border-[#0d9488] bg-[#f0fdfa]"
                    : "border-slate-200 bg-white"
                )}
              >
                <div className="flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[#1e3a5f] truncate">
                      {d.lotteryName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatTime12(d.drawTime)} · {statusLabel(d.status)}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="text-[#0d9488] text-xs font-bold shrink-0">
                      ✓
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={onClose} className="btn-primary">
            Listo ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
