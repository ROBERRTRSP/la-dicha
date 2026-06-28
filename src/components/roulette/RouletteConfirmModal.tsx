"use client";

import { useState } from "react";
import { formatBetLabel, type RouletteBetType } from "@/lib/roulette";
import { setRouletteConfirmSkipped } from "@/lib/roulette-preferences";
import { formatMoney } from "@/lib/utils";

type BetRow = {
  betType: RouletteBetType;
  betChoice: string;
  amount: number;
};

export function RouletteConfirmModal({
  open,
  bets,
  totalStake,
  balanceBefore,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  bets: BetRow[];
  totalStake: number;
  balanceBefore: number;
  loading: boolean;
  onConfirm: (skipNextTime: boolean) => void;
  onClose: () => void;
}) {
  const [skipNext, setSkipNext] = useState(false);

  if (!open) return null;

  const balanceAfterMin = balanceBefore - totalStake;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roulette-confirm-title"
    >
      <div className="bg-white text-[#1e3a5f] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[85dvh] overflow-y-auto">
        <h2 id="roulette-confirm-title" className="text-xl font-bold mb-1">
          ¿Confirmar giro?
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          El resultado lo define el servidor. Al confirmar se descuenta tu apuesta
          y se registra el giro.
        </p>

        <ul className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {bets.map((bet) => (
            <li
              key={`${bet.betType}-${bet.betChoice}`}
              className="flex justify-between gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2"
            >
              <span className="font-semibold truncate">
                {formatBetLabel(bet.betType, bet.betChoice)}
              </span>
              <span className="shrink-0 text-slate-600">
                {formatMoney(bet.amount)}
              </span>
            </li>
          ))}
        </ul>

        <div className="bg-[#1e3a5f] text-white rounded-2xl p-4 mb-4 space-y-2 text-sm">
          <div className="flex justify-between opacity-90">
            <span>Total a apostar</span>
            <span className="font-bold text-[#c9a227]">
              {formatMoney(totalStake)}
            </span>
          </div>
          <div className="flex justify-between opacity-90">
            <span>Saldo antes</span>
            <span>{formatMoney(balanceBefore)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-white/20 pt-2">
            <span>Saldo mínimo después</span>
            <span className="text-[#0d9488]">
              {formatMoney(Math.max(0, balanceAfterMin))}
            </span>
          </div>
          <p className="text-[11px] opacity-75 pt-1">
            Si ganas, el premio se suma automáticamente a tu saldo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <label className="roulette-skip-confirm">
            <input
              type="checkbox"
              checked={skipNext}
              onChange={(e) => setSkipNext(e.target.checked)}
            />
            No volver a preguntar
          </label>
          <button
            type="button"
            className="roulette-spin-btn min-h-[48px]"
            onClick={() => {
              if (skipNext) setRouletteConfirmSkipped(true);
              onConfirm(skipNext);
            }}
            disabled={loading}
          >
            {loading ? "Procesando…" : "Sí, girar ruleta"}
          </button>
          <button
            type="button"
            className="roulette-repeat-btn min-h-[48px]"
            onClick={onClose}
            disabled={loading}
          >
            Volver a editar
          </button>
        </div>
      </div>
    </div>
  );
}
