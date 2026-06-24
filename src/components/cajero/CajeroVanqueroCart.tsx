"use client";

import { useMemo } from "react";
import { cn, formatMoney } from "@/lib/utils";
import { cartLineTotal, type CartLine } from "@/lib/tickets";
import { vanqueroCartRowLabel } from "@/lib/cajero-vanquero-display";

function splitLines(lines: CartLine[]) {
  const directo: CartLine[] = [];
  const paleTripleta: CartLine[] = [];
  for (const line of lines) {
    if (line.betType === "QUINIELA") {
      directo.push(line);
    } else if (
      line.betType === "PALE" ||
      line.betType === "TRIPLETA" ||
      line.betType === "SUPER_PALE"
    ) {
      paleTripleta.push(line);
    }
  }
  return { directo, paleTripleta };
}

function sectionTotal(lines: CartLine[]) {
  return lines.reduce((s, l) => s + cartLineTotal(l), 0);
}

function VanqueroTable({
  title,
  lines,
  onRemove,
}: {
  title: string;
  lines: CartLine[];
  onRemove: (id: string) => void;
}) {
  const total = sectionTotal(lines);

  return (
    <section className="cajero-vq-table-section">
      <h3 className="cajero-vq-table-title">{title}</h3>
      <div className="cajero-vq-table-scroll">
        <table className="cajero-vq-table">
          <thead>
            <tr>
              <th className="cajero-vq-th-lot">LOT</th>
              <th className="cajero-vq-th-num">NUM</th>
              <th className="cajero-vq-th-amt">$</th>
              <th className="cajero-vq-th-act" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr className="cajero-vq-table-empty">
                <td colSpan={4}>&nbsp;</td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.id}>
                  <td className="cajero-vq-td-lot">
                    <span className="cajero-vq-lot-abbr">
                      {vanqueroCartRowLabel(line)}
                    </span>
                  </td>
                  <td className="cajero-vq-table-num">{line.numbers}</td>
                  <td className="cajero-vq-table-amt">{line.amount}</td>
                  <td className="cajero-vq-td-act">
                    <button
                      type="button"
                      className="cajero-vq-row-del"
                      onClick={() => onRemove(line.id)}
                      title="Quitar"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="cajero-vq-table-foot">
                TOTAL: {formatMoney(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export function CajeroVanqueroCart({
  lines,
  loading,
  checkoutDisabled = false,
  checkoutBlockReason,
  onRemove,
  onCheckout,
}: {
  lines: CartLine[];
  loading: boolean;
  checkoutDisabled?: boolean;
  checkoutBlockReason?: string;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}) {
  const ordered = useMemo(
    () => [...lines].sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0)),
    [lines]
  );
  const { directo, paleTripleta } = useMemo(
    () => splitLines(ordered),
    [ordered]
  );

  return (
    <div className="cajero-vq-cart-wrap">
      <div className="cajero-vq-cart">
        <VanqueroTable title="Directo" lines={directo} onRemove={onRemove} />
        <VanqueroTable
          title="Pale & Tripleta"
          lines={paleTripleta}
          onRemove={onRemove}
        />
      </div>
      <button
        type="button"
        className={cn(
          "cajero-vq-print-btn",
          checkoutDisabled && "cajero-vq-print-btn--blocked"
        )}
        disabled={lines.length === 0 || loading || checkoutDisabled}
        onClick={onCheckout}
        title={checkoutBlockReason}
      >
        {loading
          ? "Procesando…"
          : checkoutDisabled && lines.length > 0
            ? checkoutBlockReason?.includes("monto")
              ? "* Falta monto"
              : "* Límite excedido"
            : "* Imprimir ticket"}
      </button>
    </div>
  );
}
