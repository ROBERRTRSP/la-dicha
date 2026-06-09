"use client";

import { useEffect, useMemo, useRef } from "react";
import { betTypeLabel } from "@/lib/bet-parser";
import { formatMoney } from "@/lib/utils";
import { cartLineTotal, type CartLine } from "@/lib/tickets";

function shortLotteryName(name: string) {
  return name
    .replace(/^Quiniela\s+/i, "")
    .replace(/^Loter[ií]a\s+/i, "")
    .replace(/^La\s+/i, "")
    .trim();
}

function formatCartLotteries(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return shortLotteryName(names[0]);
  const shorts = names.map(shortLotteryName);
  if (names.length === 2) return shorts.join(" · ");
  return `${shorts.slice(0, 2).join(" · ")} +${names.length - 2}`;
}

export function PlayBetsPanel({
  lines,
  onRemove,
}: {
  lines: CartLine[];
  onRemove: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const ordered = useMemo(
    () => [...lines].sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0)),
    [lines]
  );

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ordered.length]);

  if (lines.length === 0) {
    return null;
  }

  return (
    <section className="play-bets-panel">
      <div className="play-bets-header">
        <p className="play-bets-title">Tus jugadas</p>
        <p className="play-bets-count">{lines.length}</p>
      </div>

      <div ref={listRef} className="play-bets-list">
        {ordered.map((line, index) => (
          <div key={line.id} className="play-bet-row">
            <span className="play-bet-order">#{index + 1}</span>
            <div className="play-bet-info">
              <p className="play-bet-numbers">
                {betTypeLabel(line.betType)}{" "}
                <span>{line.numbers}</span>
              </p>
              <p className="play-bet-lottery">
                {line.superPaleName ?? formatCartLotteries(line.lotteryNames)}
              </p>
            </div>
            <p className="play-bet-amount">
              {formatMoney(cartLineTotal(line))}
            </p>
            <button
              type="button"
              className="play-bet-remove"
              onClick={() => onRemove(line.id)}
              aria-label="Quitar jugada"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
