"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { SlotReels } from "./SlotReels";
import { CASINO_ART } from "@/lib/casino-art";
import { getSlotGame } from "@/lib/slots/games";
import { SLOT_BET_OPTIONS } from "@/lib/slots/settings";
import type { BonusState, Grid, LineWin, SlotGameId } from "@/lib/slots/types";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

type SpinResponse = {
  balance: number;
  grid: Grid;
  lineWins: LineWin[];
  payout: number;
  message: string | null;
  bonus: BonusState;
  isFreeSpin: boolean;
  jackpotTier: string | null;
  multiplierApplied: number;
};

export function ModernSlotMachine({
  gameId,
  initialBalance,
}: {
  gameId: SlotGameId;
  initialBalance: number;
}) {
  const game = getSlotGame(gameId)!;
  const defaultGrid = useMemo(
    () =>
      Array.from({ length: 5 }, (_, c) =>
        Array.from({ length: 3 }, (_, r) => Object.keys(game.symbols)[(c + r) % 6])
      ),
    [game.symbols]
  );

  const [balance, setBalance] = useState(initialBalance);
  const [bet, setBet] = useState(1);
  const [grid, setGrid] = useState<Grid>(defaultGrid);
  const [spinning, setSpinning] = useState(false);
  const [awaitingStop, setAwaitingStop] = useState(false);
  const [stopGeneration, setStopGeneration] = useState(0);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [winFlash, setWinFlash] = useState(false);
  const [bonus, setBonus] = useState<BonusState>({
    freeSpinsLeft: 0,
    multiplier: 1,
    progressiveMultiplier: 1,
  });
  const [error, setError] = useState("");
  const pendingResult = useRef<SpinResponse | null>(null);

  useEffect(() => {
    fetch("/api/slots/spin")
      .then((r) => r.json())
      .then((d) => {
        if (d.bonusStates?.[gameId]) setBonus(d.bonusStates[gameId]);
      })
      .catch(() => {});
  }, [gameId]);

  const spin = async () => {
    if (spinning) return;
    setError("");
    setLastWin(null);
    setMessage(null);
    setWinFlash(false);
    setSpinning(true);
    setAwaitingStop(true);
    setStopGeneration((g) => g + 1);
    pendingResult.current = null;

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
        setAwaitingStop(false);
        return;
      }
      pendingResult.current = data as SpinResponse;
      setGrid(data.grid);
    } catch {
      setError("Error de conexión.");
      setSpinning(false);
      setAwaitingStop(false);
    }
  };

  const handleAllStopped = useCallback(() => {
    const result = pendingResult.current;
    if (!result) {
      setSpinning(false);
      setAwaitingStop(false);
      return;
    }
    setBalance(result.balance);
    setBonus(result.bonus);
    setLastWin(result.payout);
    if (result.message) setMessage(result.message);
    if (result.payout > 0) {
      setWinFlash(true);
      window.setTimeout(() => setWinFlash(false), 1200);
    }
    setSpinning(false);
    setAwaitingStop(false);
    pendingResult.current = null;
  }, []);

  const freeMode = bonus.freeSpinsLeft > 0;

  return (
    <div className={cn("casino-machine", game.themeClass, winFlash && "casino-machine--win")}>
      <div className="casino-machine-bg" aria-hidden />
      <div className="casino-machine-inner">
        <header className="casino-machine-top">
          <Link href="/ruleta" className="casino-machine-back">
            ← Casino
          </Link>
          <div className="casino-machine-title">
            <h1>{game.name}</h1>
            <p>{game.tagline}</p>
          </div>
          <div className="casino-machine-balance">
            <span>Saldo</span>
            <strong>{formatMoney(balance)}</strong>
          </div>
        </header>

        <div className="casino-led-panel">
          {freeMode ? (
            <span className="casino-led-free">
              FREE SPINS {bonus.freeSpinsLeft}
              {bonus.multiplier > 1 ? ` · ×${bonus.multiplier}` : ""}
              {bonus.progressiveMultiplier > 1
                ? ` · PROG ×${bonus.progressiveMultiplier}`
                : ""}
            </span>
          ) : (
            <span className="casino-led-idle">5 × 3 · {game.bonus.description}</span>
          )}
          {lastWin != null && lastWin > 0 && (
            <span className="casino-led-win">WIN {formatMoney(lastWin)}</span>
          )}
        </div>

        <div className="casino-cabinet">
          <Image
            src={CASINO_ART.cabinetFrame}
            alt=""
            fill
            className="casino-cabinet-frame"
            priority
            sizes="(max-width: 480px) 100vw, 420px"
          />
          <div className="casino-cabinet-window">
            <SlotReels
              gameId={gameId}
              grid={grid}
              spinning={awaitingStop}
              stopGeneration={stopGeneration}
              onAllStopped={handleAllStopped}
            />
            {winFlash && <div className="casino-win-overlay" aria-hidden />}
          </div>
        </div>

        {message && <p className="casino-msg casino-msg--bonus">{message}</p>}
        {error && <p className="casino-msg casino-msg--error">{error}</p>}

        <div className="casino-controls">
          <div className="casino-bet-panel">
            <span>APUESTA</span>
            <div className="casino-bet-btns">
              {SLOT_BET_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={cn("casino-bet-chip", bet === amount && "active")}
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
            className={cn("casino-spin-btn", spinning && "casino-spin-btn--active")}
            disabled={spinning || (!freeMode && balance < bet)}
            onClick={() => void spin()}
          >
            <span className="casino-spin-btn-ring" aria-hidden />
            <span className="casino-spin-btn-label">
              {spinning
                ? "…"
                : freeMode
                  ? "GIRAR GRATIS"
                  : "GIRAR"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
