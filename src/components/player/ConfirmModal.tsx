"use client";

import { formatMoney } from "@/lib/utils";
import { betTypeLabel } from "@/lib/bet-parser";
import type { CartLine } from "@/lib/tickets";

export function ConfirmModal({
  open,
  lines,
  total,
  balanceBefore,
  balanceAfter,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  lines: CartLine[];
  total: number;
  balanceBefore: number;
  balanceAfter: number;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[85dvh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[#1e3a5f] mb-1">
          ¿Confirmar jugada?
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Revisa tus números. Al confirmar se genera tu ticket.
        </p>

        <div className="space-y-2 mb-4">
          {[...lines]
            .sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0))
            .map((l, i) => (
            <div
              key={l.id}
              className="bg-slate-50 rounded-xl p-3 text-sm"
            >
              <p className="font-semibold text-[#1e3a5f]">
                #{i + 1} · {betTypeLabel(l.betType)} {l.numbers}
              </p>
              <p className="text-slate-500">{l.lotteryNames.join(", ")}</p>
              <p className="text-slate-400">
                {formatMoney(l.amount * l.drawIds.length)}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-[#1e3a5f] text-white rounded-2xl p-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm opacity-80">
            <span>Total a apostar</span>
            <span className="font-bold text-[#c9a227]">{formatMoney(total)}</span>
          </div>
          <div className="flex justify-between text-sm opacity-80">
            <span>Saldo antes</span>
            <span>{formatMoney(balanceBefore)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-white/20 pt-2">
            <span>Saldo después</span>
            <span className="text-[#0d9488]">{formatMoney(balanceAfter)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Procesando…" : "Sí, confirmar jugada"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-[48px] font-semibold text-slate-500"
          >
            Volver a editar
          </button>
        </div>
      </div>
    </div>
  );
}
