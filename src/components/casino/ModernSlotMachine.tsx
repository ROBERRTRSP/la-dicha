"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { OxBonusLegend } from "./OxBonusLegend";
import { SlotReels } from "./SlotReels";
import { SlotSymbolSvg } from "./SlotSymbolSvg";
import { AmbientLights } from "./AmbientLights";
import { CoinBurst } from "./CoinBurst";
import { AnimatedBalance, WinDisplay } from "./WinDisplay";
import {
  BetControls,
  SlotCabinet,
  SlotCabinetBody,
  SlotCabinetDeck,
  SlotHeader,
  SlotRuleBar,
  SlotScreen,
  SpinButton,
} from "./SlotCabinet";
import { getSlotGame } from "@/lib/slots/games";
import { CASINO_ART } from "@/lib/casino-art";
import { SLOT_BET_OPTIONS } from "@/lib/slots/settings";
import type {
  BonusState,
  Grid,
  LineWin,
  SlotGameId,
  WinCell,
} from "@/lib/slots/types";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

import { formatJackpotBanner } from "@/lib/slots/jackpot-labels";

type SpinResponse = {
  balance: number;
  grid: Grid;
  lineWins: LineWin[];
  winningCells: WinCell[];
  scatterCells: WinCell[];
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
  const [winCells, setWinCells] = useState<WinCell[]>([]);
  const [scatterCells, setScatterCells] = useState<WinCell[]>([]);
  const [jackpotTier, setJackpotTier] = useState<string | null>(null);
  const [bonus, setBonus] = useState<BonusState>({
    freeSpinsLeft: 0,
    multiplier: 1,
    progressiveMultiplier: 1,
  });
  const [error, setError] = useState("");
  const [resultReady, setResultReady] = useState(false);
  const pendingResult = useRef<SpinResponse | null>(null);
  const reelsStoppedRef = useRef(false);
  const apiResolvedRef = useRef(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    fetch("/api/slots/spin")
      .then((r) => r.json())
      .then((d) => {
        if (d.bonusStates?.[gameId]) setBonus(d.bonusStates[gameId]);
      })
      .catch(() => {});
  }, [gameId]);

  useEffect(() => {
    if (gameId !== "magic-lamp") return;
    const thumb = new window.Image();
    thumb.src = CASINO_ART.thumbs["magic-lamp"];
    const bg = new window.Image();
    bg.src = CASINO_ART.magicLampBg;
  }, [gameId]);

  const isLamp = gameId === "magic-lamp";
  const isOx = gameId === "golden-ox";

  // El premio se aplica una sola vez y solo cuando AMBOS terminaron:
  // los carretes pararon y el servidor respondió.
  const tryFinalizeSpin = useCallback(() => {
    if (!reelsStoppedRef.current || !apiResolvedRef.current) return;
    const result = pendingResult.current;
    if (!result) return;
    pendingResult.current = null;

    setBalance(result.balance);
    setBonus(result.bonus);
    setLastWin(result.payout);
    setWinCells(result.winningCells ?? []);
    setScatterCells(result.scatterCells ?? []);
    setJackpotTier(result.jackpotTier ?? null);
    if (result.message) setMessage(result.message);
    if (result.payout > 0) {
      setWinFlash(true);
      window.setTimeout(() => setWinFlash(false), 1600);
    }
    setSpinning(false);
    setAwaitingStop(false);
    inFlightRef.current = false;
  }, []);

  // Error / timeout: no aplica premio, libera el giro y re-hidrata el estado.
  const failSpin = useCallback(
    (msg: string) => {
      pendingResult.current = null;
      reelsStoppedRef.current = false;
      apiResolvedRef.current = false;
      setResultReady(false);
      setSpinning(false);
      setAwaitingStop(false);
      inFlightRef.current = false;
      setError(msg);
      fetch("/api/slots/spin")
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.balance === "number") setBalance(d.balance);
          if (d.bonusStates?.[gameId]) setBonus(d.bonusStates[gameId]);
        })
        .catch(() => {});
    },
    [gameId]
  );

  const spin = async () => {
    if (spinning || inFlightRef.current) return;
    inFlightRef.current = true;

    setError("");
    setLastWin(null);
    setMessage(null);
    setWinFlash(false);
    setWinCells([]);
    setScatterCells([]);
    setJackpotTier(null);
    pendingResult.current = null;
    reelsStoppedRef.current = false;
    apiResolvedRef.current = false;
    setResultReady(false);
    setSpinning(true);
    setAwaitingStop(true);
    setStopGeneration((g) => g + 1);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch("/api/slots/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, betAmount: bet }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        failSpin(data.error ?? "No se pudo girar.");
        return;
      }
      pendingResult.current = data as SpinResponse;
      setGrid(data.grid);
      apiResolvedRef.current = true;
      setResultReady(true);
      tryFinalizeSpin();
    } catch {
      failSpin(
        controller.signal.aborted
          ? "Tiempo de espera agotado. Intenta de nuevo."
          : "Error de conexión."
      );
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const handleAllStopped = useCallback(() => {
    reelsStoppedRef.current = true;
    tryFinalizeSpin();
  }, [tryFinalizeSpin]);

  const freeMode = bonus.freeSpinsLeft > 0;

  return (
    <div
      className={cn(
        "casino-machine",
        game.themeClass,
        isLamp && "casino-machine--magic-lamp",
        winFlash && "casino-machine--win"
      )}
    >
      <div className="casino-machine-bg" aria-hidden />
      {isLamp && <div className="casino-machine-theme-bg" aria-hidden />}
      <div className="casino-machine-floor-glow" aria-hidden />

      <div className="casino-machine-inner">
        <SlotCabinet themeClass={game.themeClass} winFlash={winFlash}>
          {isLamp && <AmbientLights className="slot-ambient-lights--cabinet" />}
          <SlotHeader
            name={game.name}
            tagline={game.tagline}
            balanceNode={
              <AnimatedBalance value={balance} className="slot-balance-value" />
            }
          />

          <SlotCabinetBody>
            <SlotRuleBar>
              {freeMode ? (
                <span className="slot-rule-text slot-rule-text--free">
                  GIROS GRATIS {bonus.freeSpinsLeft}
                  {bonus.multiplier > 1 ? ` · ×${bonus.multiplier}` : ""}
                  {bonus.progressiveMultiplier > 1
                    ? ` · PROGRESIVO ×${bonus.progressiveMultiplier}`
                    : ""}
                </span>
              ) : (
                <span className="slot-rule-text">
                  5 × 3 · {game.bonus.description}
                </span>
              )}
            </SlotRuleBar>

            <SlotScreen winFlash={winFlash}>
              <SlotReels
                gameId={gameId}
                grid={grid}
                spinning={awaitingStop}
                stopGeneration={stopGeneration}
                resultReady={resultReady}
                winningCells={winCells}
                scatterCells={scatterCells}
                highlight={!awaitingStop}
                onAllStopped={handleAllStopped}
              />
              <CoinBurst active={winFlash} generation={stopGeneration} />
              {winFlash && <div className="casino-win-overlay" aria-hidden />}
              {jackpotTier && (
                <div
                  className={cn(
                    "casino-jackpot-banner",
                    `casino-jackpot-banner--${jackpotTier.toLowerCase()}`
                  )}
                >
                  {formatJackpotBanner(jackpotTier)}
                </div>
              )}
            </SlotScreen>

            {!awaitingStop && lastWin != null && lastWin > 0 && (
              <WinDisplay amount={lastWin} generation={stopGeneration} />
            )}
            {message && <p className="slot-feedback slot-feedback--bonus">{message}</p>}
            {error && <p className="slot-feedback slot-feedback--error">{error}</p>}
          </SlotCabinetBody>

          <SlotCabinetDeck>
            <BetControls
              bet={bet}
              options={SLOT_BET_OPTIONS}
              disabled={spinning || freeMode}
              onSelect={setBet}
            />
            <SpinButton
              label={
                awaitingStop
                  ? "GIRANDO"
                  : freeMode
                    ? "GRATIS"
                    : "GIRAR"
              }
              spinning={awaitingStop}
              disabled={spinning || awaitingStop || (!freeMode && balance < bet)}
              onClick={() => void spin()}
            />
          </SlotCabinetDeck>
        </SlotCabinet>

        <details
          className={cn(
            "casino-paytable-details",
            isOx && "casino-paytable-details--ox"
          )}
        >
          <summary className="casino-paytable-toggle">Tabla de pagos</summary>
          <section className="casino-paytable">
            <h3 className="casino-paytable-title">Pagos · ×5 / ×4 / ×3</h3>
            <div className="casino-paytable-grid">
              {Object.values(game.symbols).map((sym) => (
                <div key={sym.id} className="casino-paytable-item">
                  <SlotSymbolSvg symbolId={sym.id} gameId={gameId} size={36} />
                  <div className="casino-paytable-info">
                    <span className="casino-paytable-name">
                      {sym.label}
                      {sym.isWild && (
                        <em className="casino-tag casino-tag--wild">COMODÍN</em>
                      )}
                      {sym.isScatter && (
                        <em className="casino-tag casino-tag--scatter">BONO</em>
                      )}
                    </span>
                    <span className="casino-paytable-pays">
                      {[5, 4, 3]
                        .map((n) => sym.pays[n as 3 | 4 | 5])
                        .filter((v): v is number => typeof v === "number")
                        .map((v) => `×${v}`)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="casino-paytable-foot">{game.bonus.description}</p>
            {isOx && <OxBonusLegend />}
          </section>
        </details>
      </div>
    </div>
  );
}
