"use client";

import type { CSSProperties, ReactNode } from "react";
import { PAYLINES_5x3 } from "@/lib/slots/paylines";
import { cn } from "@/lib/utils";

const LEFT_LINES = [1, 2, 3, 4, 5] as const;
const RIGHT_LINES = [6, 7, 8, 9, 10] as const;

function PaylineRail({
  lines,
  side,
  activeSet,
  paylineCount,
}: {
  lines: readonly number[];
  side: "left" | "right";
  activeSet: Set<number>;
  paylineCount: number;
}) {
  return (
    <div
      className={cn(
        "slot-payline-rail",
        side === "left" ? "slot-payline-rail--left" : "slot-payline-rail--right"
      )}
      aria-hidden
    >
      <span className="slot-payline-rail-title">LÍNEAS</span>
      {lines
        .filter((n) => n <= paylineCount)
        .map((n) => (
          <span
            key={`${side}-${n}`}
            className={cn(
              "slot-payline-badge",
              activeSet.has(n - 1) && "slot-payline-badge--active"
            )}
          >
            {n}
          </span>
        ))}
    </div>
  );
}

function linePath(rows: number[]): string {
  const colX = (col: number) => 10 + col * 20;
  const rowY = (row: number) => 16.67 + row * 33.33;
  return rows
    .map((row, col) => `${col === 0 ? "M" : "L"} ${colX(col)} ${rowY(row)}`)
    .join(" ");
}

function linePoints(rows: number[]) {
  const colX = (col: number) => 10 + col * 20;
  const rowY = (row: number) => 16.67 + row * 33.33;
  return rows.map((row, col) => ({ x: colX(col), y: rowY(row) }));
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
      <PaylineRail
        lines={LEFT_LINES}
        side="left"
        activeSet={activeSet}
        paylineCount={paylineCount}
      />

      <div className="slot-payline-reels">
        <svg
          className="slot-payline-overlay"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {lines.map((rows, index) =>
            activeSet.has(index) ? (
              <g key={index} style={{ "--line-delay": `${index * 70}ms` } as CSSProperties}>
                <path
                  d={linePath(rows)}
                  className="slot-payline-path slot-payline-path--glow"
                />
                <path
                  d={linePath(rows)}
                  className="slot-payline-path slot-payline-path--active"
                />
                {linePoints(rows).map((point, pointIndex) => (
                  <circle
                    key={`${index}-${pointIndex}`}
                    cx={point.x}
                    cy={point.y}
                    r={1.45}
                    className="slot-payline-node"
                  />
                ))}
              </g>
            ) : null
          )}
        </svg>
        {children}
      </div>

      <PaylineRail
        lines={RIGHT_LINES}
        side="right"
        activeSet={activeSet}
        paylineCount={paylineCount}
      />
    </div>
  );
}
