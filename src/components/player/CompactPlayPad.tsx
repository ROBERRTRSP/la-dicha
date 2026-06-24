"use client";

import { useState } from "react";
import { cn, formatMoney } from "@/lib/utils";
import {
  detectBetType,
  betTypeLabel,
  formatNumbers,
  QUICK_AMOUNTS,
} from "@/lib/bet-parser";
import { BET_AMOUNT_MAX, BET_AMOUNT_MIN } from "@/lib/cart-limits";

export function CompactPlayPad({
  digits,
  amount,
  onDigit,
  onDoubleZero,
  onBackspace,
  onClear,
  onAdd,
  onAmountChange,
}: {
  digits: string;
  amount: number;
  onDigit: (d: string) => void;
  onDoubleZero: () => void;
  onBackspace: () => void;
  onClear: () => void;
  onAdd: () => void;
  onAmountChange: (n: number) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const [customError, setCustomError] = useState("");

  const type = detectBetType(digits);
  const display = type ? formatNumbers(digits, type) : digits || "—";
  const typeHint = type ? betTypeLabel(type) : "Números";

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="play-pad flex flex-col shrink-0 px-3">
      <div className="play-display shrink-0">
        <span className="text-[10px] text-slate-400 uppercase tracking-wide">
          {typeHint}
        </span>
        <p className="text-2xl font-bold text-[#1e3a5f] tracking-widest leading-none">
          {display}
        </p>
        <p className="text-[9px] text-slate-400 mt-1">
          2 = Quiniela · 4 = Palé · 6 = Tripleta
        </p>
      </div>

      <div className="play-amounts shrink-0">
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onAmountChange(a)}
            className={cn("play-amount-chip", amount === a && "selected")}
          >
            {a}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setCustomError("");
            setCustomVal(amount > 0 && !QUICK_AMOUNTS.includes(amount as (typeof QUICK_AMOUNTS)[number]) ? String(amount) : "");
            setCustomOpen(true);
          }}
          className={cn(
            "play-amount-chip",
            !QUICK_AMOUNTS.includes(amount as (typeof QUICK_AMOUNTS)[number]) &&
              amount > 0 &&
              "selected"
          )}
        >
          otro
        </button>
      </div>

      <div className="play-keypad">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className="play-key"
            onClick={() => onDigit(k)}
          >
            {k}
          </button>
        ))}
        <button type="button" className="play-key play-key--action" onClick={onBackspace}>
          Borrar
        </button>
        <button type="button" className="play-key" onClick={() => onDigit("0")}>
          0
        </button>
        <button type="button" className="play-key" onClick={onDoubleZero}>
          00
        </button>
      </div>

      <div className="play-actions shrink-0 grid grid-cols-2 gap-2">
        <button type="button" className="play-action-secondary" onClick={onClear}>
          Limpiar
        </button>
        <button type="button" className="play-action-primary" onClick={onAdd}>
          Agregar
        </button>
      </div>

      {customOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-5 pb-8">
            <h4 className="font-bold mb-1">Otro monto</h4>
            <p className="text-xs text-slate-500 mb-3">
              Mínimo {formatMoney(BET_AMOUNT_MIN)} · máximo {formatMoney(BET_AMOUNT_MAX)}
            </p>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={BET_AMOUNT_MAX}
              value={customVal}
              onChange={(e) => {
                setCustomVal(e.target.value);
                setCustomError("");
              }}
              className="w-full text-xl font-bold text-center border-2 border-slate-200 rounded-xl py-3 mb-2"
              autoFocus
            />
            {customError && (
              <p className="text-xs text-red-600 font-semibold text-center mb-2">
                {customError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomOpen(false);
                  setCustomError("");
                }}
                className="play-action-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                className="play-action-primary"
                onClick={() => {
                  const n = Math.floor(Number(customVal));
                  if (!Number.isFinite(n) || n < BET_AMOUNT_MIN) {
                    setCustomError(`Escribe un monto de al menos ${formatMoney(BET_AMOUNT_MIN)}.`);
                    return;
                  }
                  if (n > BET_AMOUNT_MAX) {
                    setCustomError(`El máximo por jugada es ${formatMoney(BET_AMOUNT_MAX)}.`);
                    return;
                  }
                  onAmountChange(n);
                  setCustomOpen(false);
                  setCustomVal("");
                  setCustomError("");
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
