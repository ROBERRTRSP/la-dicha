"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SlotSymbolSvg } from "./SlotSymbolSvg";
import type { SlotGameId, WinCell } from "@/lib/slots/types";
import { getSlotGame } from "@/lib/slots/games";
import { cn } from "@/lib/utils";

const CELL_H = 72;
const SPIN_SYMBOLS = 16;

function randomSymbol(ids: string[]): string {
  return ids[Math.floor(Math.random() * ids.length)] ?? ids[0];
}

function buildStrip(finalCol: string[], allIds: string[]): string[] {
  const filler: string[] = [];
  for (let i = 0; i < SPIN_SYMBOLS; i++) {
    filler.push(randomSymbol(allIds));
  }
  return [...filler, ...finalCol];
}

function SlotReelColumn({
  columnIndex,
  finalSymbols,
  gameId,
  allSymbolIds,
  spinning,
  stopGeneration,
  winRows,
  scatterRows,
  highlight,
  onStopped,
}: {
  columnIndex: number;
  finalSymbols: string[];
  gameId: SlotGameId;
  allSymbolIds: string[];
  spinning: boolean;
  stopGeneration: number;
  winRows: Set<number>;
  scatterRows: Set<number>;
  highlight: boolean;
  onStopped?: () => void;
}) {
  const [strip, setStrip] = useState<string[]>(() =>
    buildStrip(finalSymbols, allSymbolIds)
  );
  const [phase, setPhase] = useState<"idle" | "blur" | "stop">("idle");
  const [offset, setOffset] = useState(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!spinning) return;
    stoppedRef.current = false;
    const newStrip = buildStrip(finalSymbols, allSymbolIds);
    setStrip(newStrip);
    setOffset(0);
    setPhase("blur");

    const stopAt = 600 + columnIndex * 280;
    const stopTimer = window.setTimeout(() => {
      setPhase("stop");
      requestAnimationFrame(() => {
        setOffset((newStrip.length - 3) * CELL_H);
      });
    }, stopAt);

    return () => window.clearTimeout(stopTimer);
  }, [spinning, stopGeneration, columnIndex, allSymbolIds, finalSymbols]);

  useEffect(() => {
    if (phase !== "stop" || stoppedRef.current) return;
    const t = window.setTimeout(() => {
      stoppedRef.current = true;
      setPhase("idle");
      onStopped?.();
    }, 700);
    return () => window.clearTimeout(t);
  }, [phase, onStopped]);

  const lastIndex = strip.length - 3;

  return (
    <div className="slot-reel-col">
      <div
        className={cn(
          "slot-reel-strip",
          phase === "blur" && "slot-reel-strip--blur",
          phase === "stop" && "slot-reel-strip--stop"
        )}
        style={
          phase === "blur"
            ? undefined
            : { transform: `translate3d(0, -${offset}px, 0)` }
        }
      >
        {strip.map((symId, i) => {
          const visibleRow = i - lastIndex;
          const isWin =
            highlight && visibleRow >= 0 && winRows.has(visibleRow);
          const isScatter =
            highlight && visibleRow >= 0 && scatterRows.has(visibleRow);
          return (
            <div
              key={`${stopGeneration}-${i}-${symId}`}
              className={cn(
                "slot-reel-cell",
                isWin && "slot-reel-cell--win",
                isScatter && "slot-reel-cell--scatter"
              )}
            >
              <SlotSymbolSvg symbolId={symId} gameId={gameId} size={56} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SlotReels({
  gameId,
  grid,
  spinning,
  stopGeneration,
  winningCells = [],
  scatterCells = [],
  highlight = false,
  onAllStopped,
}: {
  gameId: SlotGameId;
  grid: string[][];
  spinning: boolean;
  stopGeneration: number;
  winningCells?: WinCell[];
  scatterCells?: WinCell[];
  highlight?: boolean;
  onAllStopped?: () => void;
}) {
  const game = getSlotGame(gameId)!;
  const allIds = useMemo(() => Object.keys(game.symbols), [game.symbols]);
  const stoppedCount = useRef(0);

  const winByCol = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const c of winningCells) {
      if (!map.has(c.col)) map.set(c.col, new Set());
      map.get(c.col)!.add(c.row);
    }
    return map;
  }, [winningCells]);

  const scatterByCol = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const c of scatterCells) {
      if (!map.has(c.col)) map.set(c.col, new Set());
      map.get(c.col)!.add(c.row);
    }
    return map;
  }, [scatterCells]);

  const handleStopped = useCallback(() => {
    stoppedCount.current += 1;
    if (stoppedCount.current >= 5) {
      stoppedCount.current = 0;
      onAllStopped?.();
    }
  }, [onAllStopped]);

  useEffect(() => {
    if (spinning) stoppedCount.current = 0;
  }, [spinning, stopGeneration]);

  return (
    <div className="slot-reels">
      {grid.map((col, colIndex) => (
        <SlotReelColumn
          key={colIndex}
          columnIndex={colIndex}
          finalSymbols={[col[0], col[1], col[2]]}
          gameId={gameId}
          allSymbolIds={allIds}
          spinning={spinning}
          stopGeneration={stopGeneration}
          winRows={winByCol.get(colIndex) ?? EMPTY_SET}
          scatterRows={scatterByCol.get(colIndex) ?? EMPTY_SET}
          highlight={highlight && !spinning}
          onStopped={handleStopped}
        />
      ))}
    </div>
  );
}

const EMPTY_SET = new Set<number>();
