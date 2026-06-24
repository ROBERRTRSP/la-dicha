"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BrandHeader } from "@/components/player/BrandHeader";
import { getSlotGame } from "@/lib/slots/games";
import type { BonusState, Grid, LineWin, SlotGameId } from "@/lib/slots/types";
import { SLOT_BET_OPTIONS } from "@/lib/slots/settings";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

type SpinResponse = {
  balance: number;
  grid: Grid;
  lineWins: LineWin[];
  payout: number;
  profit: number;
  message: string | null;
  bonus: BonusState;
  isFreeSpin: boolean;
  jackpotTier: string | null;
  multiplierApplied: number;
};

export function SlotClient({
  gameId,
  initialBalance,
}: {
  gameId: SlotGameId;
  initialBalance: number;
}) {
  const game = getSlotGame(gameId)!;
  const [balance, setBalance] = useState(initialBalance);
  const [bet, setBet] = useState<number>(1);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bonus, setBonus] = useState<BonusState>({
    freeSpinsLeft: 0,
    multiplier: 1,
    progressiveMultiplier: 1,
  });
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/slots/spin");
      if (!res.ok) return;
      const data = await res.json();
      if (data.bonusStates?.[gameId]) {
        setBonus(data.bonusStates[gameId]);
      }
    } catch {
      /* ignore */
    }
  }, [gameId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const spin = async () => {
    if (spinning) return;
    setError("");
    setSpinning(true);
    setLastWin(null);
    setMessage(null);

    try {
      const res = await fetch("/api/slots/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, betAmount: bet }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo girar.");
        setSpinning(false);
        return;
      }

      const result = data as SpinResponse;
      await new Promise((r) => setTimeout(r, 900));
      setGrid(result.grid);
      setBalance(result.balance);
      setBonus(result.bonus);
      setLastWin(result.payout);
      if (result.message) setMessage(result.message);
    } catch {
      setError("Error de conexión.");
    } finally {
      setSpinning(false);
    }
  };

  const displayGrid: Grid =
    grid ??
    Array.from({ length: 5 }, () =>
      Array.from({ length: 3 }, () => Object.keys(game.symbols)[0])
    );

  const freeMode = bonus.freeSpinsLeft > 0;

  return (
    <div className={cn("slot-page", game.themeClass)}>
      <BrandHeader balance={balance} title={game.name} />

      <div className="slot-toolbar">
        <Link href="/slots" className="slot-back">
          ← Tragamonedas
        </Link>
        {freeMode && (
          <span className="slot-free-badge">
            Giros gratis: {bonus.freeSpinsLeft}
            {bonus.multiplier > 1 ? ` · ×${bonus.multiplier}` : ""}
            {bonus.progressiveMultiplier > 1
              ? ` · prog ×${bonus.progressiveMultiplier}`
              : ""}
          </span>
        )}
      </div>

      <p className="slot-tagline">{game.tagline}</p>
      <p className="slot-bonus-hint">{game.bonus.description}</p>

      <div className={cn("slot-grid-wrap", spinning && "slot-grid-wrap--spin")}>
        <div className="slot-grid">
          {[0, 1, 2].map((row) => (
            <div key={row} className="slot-grid-row">
              {[0, 1, 2, 3, 4].map((col) => {
                const symId = displayGrid[col]?.[row] ?? "LEAF";
                const sym = game.symbols[symId];
                return (
                  <div
                    key={`${col}-${row}`}
                    className={cn(
                      "slot-cell",
                      sym?.isWild && "slot-cell--wild",
                      sym?.isScatter && "slot-cell--scatter"
                    )}
                  >
                    <span className="slot-cell-emoji">{sym?.emoji ?? "?"}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {message && <p className="slot-message slot-message--bonus">{message}</p>}
      {lastWin != null && lastWin > 0 && (
        <p className="slot-message slot-message--win">
          Ganaste {formatMoney(lastWin)}
        </p>
      )}
      {error && <p className="slot-message slot-message--error">{error}</p>}

      <div className="slot-controls">
        <div className="slot-bet-row">
          <span>Apuesta</span>
          <div className="slot-bet-options">
            {SLOT_BET_OPTIONS.map((amount) => (
              <button
                key={amount}
                type="button"
                className={cn("slot-bet-btn", bet === amount && "active")}
                disabled={spinning || freeMode}
                onClick={() => setBet(amount)}
              >
                {formatMoney(amount)}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="slot-spin-btn"
          disabled={spinning || (!freeMode && balance < bet)}
          onClick={() => void spin()}
        >
          {spinning
            ? "Girando…"
            : freeMode
              ? `Giro gratis (${bonus.freeSpinsLeft})`
              : `Girar · ${formatMoney(bet)}`}
        </button>
      </div>

      <div className="slot-paytable">
        <h3>Símbolos</h3>
        <ul>
          {Object.values(game.symbols).map((sym) => (
            <li key={sym.id}>
              <span>{sym.emoji}</span> {sym.label}
              {sym.isWild && " · Wild"}
              {sym.isScatter && " · Bonus"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
