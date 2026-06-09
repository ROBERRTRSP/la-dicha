"use client";

import { X, Trash2 } from "lucide-react";
import { betTypeLabel } from "@/lib/bet-parser";
import { formatMoney } from "@/lib/utils";
import type { CartLine } from "@/lib/tickets";

export function CartSheet({
  open,
  lines,
  total,
  onRemove,
  onClose,
}: {
  open: boolean;
  lines: CartLine[];
  total: number;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl max-h-[60dvh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h2 className="font-bold text-[#1e3a5f]">
            Jugadas ({lines.length})
          </h2>
          <button type="button" onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-2 flex-1">
          {lines.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">
              Sin jugadas aún.
            </p>
          ) : (
            lines.map((line) => (
              <div
                key={line.id}
                className="flex justify-between items-start bg-slate-50 rounded-xl p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-[#1e3a5f]">
                    {betTypeLabel(line.betType)} {line.numbers}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {line.lotteryNames.join(", ")}
                  </p>
                  <p className="text-xs text-[#c9a227] font-semibold mt-0.5">
                    {formatMoney(line.amount * line.drawIds.length)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(line.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 text-red-500 shrink-0 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
        {lines.length > 0 && (
          <div className="px-4 py-3 border-t flex justify-between items-center shrink-0">
            <span className="font-bold text-[#1e3a5f]">Total</span>
            <span className="font-bold text-[#c9a227] text-lg">
              {formatMoney(total)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
