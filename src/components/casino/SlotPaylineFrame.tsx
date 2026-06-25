"use client";

import type { ReactNode } from "react";
import { PAYLINES_5x3 } from "@/lib/slots/paylines";
import { cn } from "@/lib/utils";

const LEFT_LINES = [1, 2, 3, 4, 5];
const RIGHT_LINES = [6, 7, 8, 9, 10];

function linePath(rows: number[]): string {
  const colX = (col: number) => 10 + col * 20;
  const rowY = (row: number) => 16.67 + row * 33.33;
  return rows
    .map((row, col) => `${col === 0 ? "M" : "L"} ${colX(col)} ${rowY(row)}`)
    .join(" ");
}

export function SlotPaylineFrame({
  children,
  activeLineIndices = [],
  paylineCount = 10,
  className,
}: {
  children: ReactNode;
  activeLineIndices?: number[];
  paylineCount?: number;
  className?: string;
}) {
  const activeSet = new Set(activeLineIndices);
  const lines = PAYLINES_5x3.slice(0, paylineCount);

  return (
    <div className={cn("slot-payline-frame", className)}>
      <div className="slot-payline-rail slot-payline-rail--left" aria-hidden>
        <span className="slot-payline-rail-title">LÍNEAS</span>
        {LEFT_LINES.filter((n) => n <= paylineCount).map((n) => (
          <span
            key={n}
            className={cn(
              "slot-payline-badge",
              activeSet.has(n - 1) && "slot-payline-badge--active"
            )}
          >
            {n}
          </span>
        ))}
      </div>

      <div className="slot-payline-reels">
        <svg
          className="slot-payline-overlay"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {lines.map((rows, index) =>
            activeSet.has(index) ? (
              <path
                key={index}
                d={linePath(rows)}
                className="slot-payline-path slot-payline-path--active"
              />
            ) : null
          )}
        </svg>
        {children}
      </div>

      <div className="slot-payline-rail slot-payline-rail--right" aria-hidden>
        <span className="slot-payline-rail-title">{paylineCount}</span>
        {RIGHT_LINES.filter((n) => n <= paylineCount).map((n) => (
          <span
            key={n}
            className={cn(
              "slot-payline-badge",
              activeSet.has(n - 1) && "slot-payline-badge--active"
            )}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}
