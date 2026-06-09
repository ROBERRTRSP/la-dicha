"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { QUICK_AMOUNTS } from "@/lib/bet-parser";

export function AmountSelector({
  amount,
  onChange,
}: {
  amount: number;
  onChange: (n: number) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");

  function applyCustom() {
    const n = Number(customVal);
    if (n > 0) {
      onChange(n);
      setCustomOpen(false);
      setCustomVal("");
    }
  }

  return (
    <section className="px-4 pb-2">
      <h3 className="font-bold text-[#1e3a5f] mb-2">Monto</h3>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            className={cn("amount-btn bg-white", amount === a && "selected")}
          >
            {a}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={cn(
            "amount-btn bg-white col-span-3",
            !QUICK_AMOUNTS.includes(amount as (typeof QUICK_AMOUNTS)[number]) &&
              amount > 0 &&
              "selected"
          )}
        >
          otro
          {!QUICK_AMOUNTS.includes(amount as (typeof QUICK_AMOUNTS)[number]) &&
            amount > 0 &&
            ` — ${amount}`}
        </button>
      </div>

      {customOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-8">
            <h4 className="font-bold text-lg mb-4">Otro monto</h4>
            <input
              type="number"
              inputMode="numeric"
              value={customVal}
              onChange={(e) => setCustomVal(e.target.value)}
              placeholder="Ej: 25"
              className="w-full text-2xl font-bold text-center border-2 border-slate-200 rounded-xl py-4 mb-4"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="btn-navy opacity-60"
              >
                Cancelar
              </button>
              <button type="button" onClick={applyCustom} className="btn-primary">
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
