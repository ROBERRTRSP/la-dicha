"use client";

import { Trash2 } from "lucide-react";
import { betTypeLabel } from "@/lib/bet-parser";
import { formatMoney } from "@/lib/utils";
import type { CartLine } from "@/lib/tickets";

export function BetCart({
  lines,
  onRemove,
}: {
  lines: CartLine[];
  onRemove: (id: string) => void;
}) {
  if (lines.length === 0) {
    return (
      <section className="px-4 py-2">
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-400 text-sm">
          Tu carrito está vacío. Agrega una jugada.
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-2">
      <h3 className="font-bold text-[#1e3a5f] mb-2">
        Jugadas ({lines.length})
      </h3>
      <div className="space-y-2">
        {lines.map((line) => {
          const subtotal = line.amount * line.drawIds.length;
          return (
            <div
              key={line.id}
              className="bg-white rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-[#1e3a5f]">
                    {betTypeLabel(line.betType)} {line.numbers}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {line.lotteryNames.join(", ")}
                  </p>
                  <p className="text-sm text-slate-400">
                    ${line.amount} × {line.drawIds.length} ={" "}
                    {formatMoney(subtotal)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(line.id)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-red-50 text-red-500"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
