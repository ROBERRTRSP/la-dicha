"use client";

import { formatMoney } from "@/lib/utils";
import { betTypeLabel } from "@/lib/bet-parser";
import {
  cartLineTotal,
  isMultiLotteryLine,
  type CartLine,
} from "@/lib/tickets";

export function ConfirmModal({
  open,
  lines,
  total,
  balanceBefore,
  balanceAfter,
  loading,
  onConfirm,
  onClose,
  cashSale,
  customerName,
}: {
  open: boolean;
  lines: CartLine[];
  total: number;
  balanceBefore: number;
  balanceAfter: number;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
  cashSale?: boolean;
  customerName?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
      data-cajero-confirm-modal
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[85dvh] overflow-y-auto">
        <h2 id="confirm-modal-title" className="text-xl font-bold text-[#1e3a5f] mb-1">
          {cashSale ? "¿Confirmar venta?" : "¿Confirmar jugada?"}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          {cashSale
            ? "Revisa los números. Al confirmar cobras en efectivo y se imprime el ticket."
            : "Revisa tus números. Al confirmar se genera tu ticket."}
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
              <p className="text-slate-500">
                {l.superPaleName ?? l.lotteryNames.join(", ")}
              </p>
              {isMultiLotteryLine(l) && (
                <p className="text-amber-700 text-xs font-semibold">
                  {formatMoney(l.amount)} en cada una · {l.drawIds.length}{" "}
                  loterías
                </p>
              )}
              <p className="text-slate-400 font-semibold">
                Total línea: {formatMoney(cartLineTotal(l))}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-[#1e3a5f] text-white rounded-2xl p-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm opacity-80">
            <span>{cashSale ? "Total a cobrar" : "Total a apostar"}</span>
            <span className="font-bold text-[#c9a227]">{formatMoney(total)}</span>
          </div>
          {cashSale ? (
            <>
              <div className="flex justify-between text-sm opacity-80">
                <span>Forma de pago</span>
                <span className="font-semibold">Efectivo</span>
              </div>
              {customerName?.trim() && (
                <div className="flex justify-between text-sm opacity-80">
                  <span>Cliente</span>
                  <span>{customerName.trim()}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between text-sm opacity-80">
                <span>Saldo antes</span>
                <span>{formatMoney(balanceBefore)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-white/20 pt-2">
                <span>Saldo después</span>
                <span className="text-[#0d9488]">{formatMoney(balanceAfter)}</span>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="btn-primary"
          >
            {loading
              ? "Procesando…"
              : cashSale
                ? "Sí, cobrar y generar ticket"
                : "Sí, confirmar jugada"}
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
