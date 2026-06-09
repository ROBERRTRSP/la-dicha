"use client";

import { Delete, RotateCcw, Plus } from "lucide-react";
import {
  detectBetType,
  betTypeLabel,
  formatNumbers,
} from "@/lib/bet-parser";

export function NumberKeypad({
  digits,
  onDigit,
  onDoubleZero,
  onBackspace,
  onClear,
  onAdd,
  disabled,
}: {
  digits: string;
  onDigit: (d: string) => void;
  onDoubleZero: () => void;
  onBackspace: () => void;
  onClear: () => void;
  onAdd: () => void;
  disabled?: boolean;
}) {
  const type = detectBetType(digits);
  const display = type ? formatNumbers(digits, type) : digits || "—";
  const typeHint = type ? betTypeLabel(type) : "Escribe tus números";

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <section className="px-4 py-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-3">
        <p className="text-xs text-slate-500 mb-1">{typeHint}</p>
        <p className="text-3xl font-bold text-[#1e3a5f] tracking-widest text-center">
          {display}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className="key-btn"
            disabled={disabled}
            onClick={() => onDigit(k)}
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          className="key-btn"
          disabled={disabled}
          onClick={onBackspace}
        >
          <Delete className="w-6 h-6" />
        </button>
        <button
          type="button"
          className="key-btn"
          disabled={disabled}
          onClick={() => onDigit("0")}
        >
          0
        </button>
        <button
          type="button"
          className="key-btn"
          disabled={disabled}
          onClick={onDoubleZero}
        >
          00
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          type="button"
          className="flex items-center justify-center gap-2 min-h-[52px] rounded-xl border border-slate-200 bg-white font-semibold text-slate-600"
          disabled={disabled}
          onClick={onClear}
        >
          <RotateCcw className="w-5 h-5" />
          Limpiar
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 min-h-[52px] rounded-xl bg-[#1e3a5f] text-white font-bold"
          disabled={disabled}
          onClick={onAdd}
        >
          <Plus className="w-5 h-5" />
          Agregar
        </button>
      </div>
    </section>
  );
}
