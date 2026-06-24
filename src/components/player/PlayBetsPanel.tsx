"use client";

import { useEffect, useMemo, useRef } from "react";
import { betTypeLabel } from "@/lib/bet-parser";
import { formatMoney } from "@/lib/utils";
import {
  cartLineTotal,
  isMultiLotteryLine,
  type CartLine,
} from "@/lib/tickets";

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

function lineMeta(line: CartLine) {
  if (line.superPaleCode || line.betType === "SUPER_PALE") {
    return "1 jugada · Súper Palé";
  }
  const n = line.drawIds.length;
  return n > 1 ? `1 jugada · ${n} loterías` : "1 jugada · 1 lotería";
}

export function PlayBetsPanel({
  lines,
  total,
  expanded,
  onToggleExpanded,
  onRemove,
}: {
  lines: CartLine[];
  total: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRemove: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const ordered = useMemo(
    () => [...lines].sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0)),
    [lines]
  );

  const lotteryUnits = useMemo(
    () => lines.reduce((s, l) => s + l.drawIds.length, 0),
    [lines]
  );

  useEffect(() => {
    if (!expanded) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ordered.length, expanded]);

  if (lines.length === 0) {
    return null;
  }

  return (
    <section
      className={`play-bets-sheet${expanded ? " play-bets-sheet--expanded" : ""}`}
      aria-label="Tus jugadas"
    >
      <button
        type="button"
        className="play-bets-sheet-toggle"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <div className="play-bets-sheet-toggle-left">
          <div className="play-bets-sheet-toggle-text">
            <span className="play-bets-title">Tus jugadas</span>
            <span className="play-bets-sheet-meta">
              {lines.length} jugada{lines.length !== 1 ? "s" : ""} ·{" "}
              {lotteryUnits} lotería{lotteryUnits !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="play-bets-count">{lines.length}</span>
        </div>
        <div className="play-bets-sheet-toggle-right">
          <span className="play-bets-sheet-total">{formatMoney(total)}</span>
          <span className="play-bets-chevron" aria-hidden>
            {expanded ? "▾" : "▴"}
          </span>
        </div>
      </button>

      {expanded && (
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
                <p className="play-bet-meta">{lineMeta(line)}</p>
                {isMultiLotteryLine(line) && (
                  <p className="play-bet-cost-detail">
                    {formatMoney(line.amount)} c/u · {formatMoney(cartLineTotal(line))}
                  </p>
                )}
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
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
