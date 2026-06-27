"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SlotRulesButton, SlotRulesPanel, type SlotRulesSection } from "./SlotRulesPanel";
import { SlotReels } from "./SlotReels";
import { SlotFinanceHud } from "./SlotFinanceHud";
import { SlotPaylineFrame } from "./SlotPaylineFrame";
import { AmbientLights } from "./AmbientLights";
import { MoonWolfEffects } from "./MoonWolfEffects";
import { CoinBurst } from "./CoinBurst";
import { AnimatedBalance } from "./WinDisplay";
import { getSlotUiPace } from "@/lib/slots/mobile-pace";
import { WinCelebration } from "./WinCelebration";
import { SlotOrientationNotice } from "./SlotOrientationNotice";
import { useSlotLandscapeWarning, useSlotMobile } from "./useSlotMobile";
import {
  BetControls,
  SlotCabinet,
  SlotCabinetBody,
  SlotCabinetDeck,
  SlotControlDeck,
  SlotHeader,
  SlotRuleBar,
  SlotScreen,
  SpinButton,
} from "./SlotCabinet";
import { getSlotGame } from "@/lib/slots/games";
import { preloadSlotSymbolImages } from "@/lib/slots/symbol-assets";
import { CASINO_ART } from "@/lib/casino-art";
import { allowedBetOptionsForGame } from "@/lib/slots/settings";
import { newSpinIdempotencyKey } from "@/lib/spin-client";
import type {
  BonusState,
  Grid,
  LineWin,
  SlotGameId,
  WinCell,
} from "@/lib/slots/types";
import { cn, formatMoney } from "@/lib/utils";

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
  bonusTriggered?: string | null;
  freeSpinsAwarded?: number;
  autoFreeSpinsAwarded?: number;
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
  const [freeSpinFlash, setFreeSpinFlash] = useState(false);
  const [lastFreeSpinsAwarded, setLastFreeSpinsAwarded] = useState(0);
  const [freeSpinAutoBonus, setFreeSpinAutoBonus] = useState(false);
  const [winCells, setWinCells] = useState<WinCell[]>([]);
  const [lineWins, setLineWins] = useState<LineWin[]>([]);
  const [scatterCells, setScatterCells] = useState<WinCell[]>([]);
  const [jackpotTier, setJackpotTier] = useState<string | null>(null);
  const [bonus, setBonus] = useState<BonusState>({
    freeSpinsLeft: 0,
    multiplier: 1,
    progressiveMultiplier: 1,
  });
  const [error, setError] = useState("");
  const [resultReady, setResultReady] = useState(false);
  const [settleFlash, setSettleFlash] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesSection, setRulesSection] = useState<SlotRulesSection>("rules");
  const [minBetAmount, setMinBetAmount] = useState(1);
  const [maxBetAmount, setMaxBetAmount] = useState(10);
  const betOptions = useMemo(
    () => allowedBetOptionsForGame(gameId, minBetAmount, maxBetAmount),
    [gameId, minBetAmount, maxBetAmount]
  );
  const pendingResult = useRef<SpinResponse | null>(null);
  const reelsStoppedRef = useRef(false);
  const apiResolvedRef = useRef(false);
  const inFlightRef = useRef(false);
  const spinIdempotencyRef = useRef<string | null>(null);
  const autoFreeSpinTimerRef = useRef(0);
  const freeSpinFlashTimerRef = useRef(0);

  useEffect(() => {
    preloadSlotSymbolImages(gameId);
    fetch("/api/slots/spin")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.balance === "number") setBalance(d.balance);
        if (typeof d.minBetAmount === "number") setMinBetAmount(d.minBetAmount);
        if (typeof d.maxBetAmount === "number") setMaxBetAmount(d.maxBetAmount);
        if (d.bonusStates?.[gameId]) setBonus(d.bonusStates[gameId]);
      })
      .catch(() => {});
  }, [gameId]);

  useEffect(() => {
    if (betOptions.length === 0) return;
    if (!betOptions.includes(bet)) {
      setBet(betOptions[betOptions.length - 1]);
    }
  }, [bet, betOptions]);

  useEffect(() => {
    if (gameId !== "magic-lamp" && gameId !== "moon-wolf") return;
    const thumb = new window.Image();
    thumb.src = CASINO_ART.thumbs[gameId];
    const bg = new window.Image();
    bg.src =
      gameId === "magic-lamp"
        ? CASINO_ART.magicLampBg
        : CASINO_ART.moonWolfBg;
  }, [gameId]);

  const isLamp = gameId === "magic-lamp";
  const isWolf = gameId === "moon-wolf";
  const isMobile = useSlotMobile();
  const showLandscapeWarning = useSlotLandscapeWarning();
  const uiPace = useMemo(() => getSlotUiPace(isMobile), [isMobile]);

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
    setLineWins(result.lineWins ?? []);
    setScatterCells(result.scatterCells ?? []);
    setJackpotTier(result.jackpotTier ?? null);
    if (result.message) setMessage(result.message);
    if (result.payout > 0) {
      setWinFlash(true);
      window.setTimeout(() => setWinFlash(false), uiPace.winFlashMs);
    }

    const scatterAward = result.freeSpinsAwarded ?? 0;
    const autoAward = result.autoFreeSpinsAwarded ?? 0;
    const totalFreeAward =
      !result.isFreeSpin && (scatterAward > 0 || autoAward > 0)
        ? scatterAward + autoAward
        : 0;
    if (totalFreeAward > 0) {
      setLastFreeSpinsAwarded(totalFreeAward);
      setFreeSpinAutoBonus(autoAward > 0);
      setFreeSpinFlash(true);
      window.clearTimeout(freeSpinFlashTimerRef.current);
      freeSpinFlashTimerRef.current = window.setTimeout(
        () => setFreeSpinFlash(false),
        uiPace.freeSpinCelebrationMs
      );
    }
    setSpinning(false);
    setAwaitingStop(false);
    inFlightRef.current = false;
    spinIdempotencyRef.current = null;
    setSettleFlash(true);
    window.setTimeout(() => setSettleFlash(false), isMobile ? 520 : 380);
  }, [isMobile, uiPace]);

  // Error / timeout: no aplica premio, libera el giro y re-hidrata el estado.
  const failSpin = useCallback(
    (msg: string, opts?: { retainIdempotency?: boolean }) => {
      pendingResult.current = null;
      reelsStoppedRef.current = false;
      apiResolvedRef.current = false;
      setResultReady(false);
      setSpinning(false);
      setAwaitingStop(false);
      inFlightRef.current = false;
      if (!opts?.retainIdempotency) {
        spinIdempotencyRef.current = null;
      }
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

  const spin = useCallback(async () => {
    if (spinning || inFlightRef.current) return;
    const usingFreeSpin = bonus.freeSpinsLeft > 0;
    if (!usingFreeSpin && balance < bet) {
      setError("Saldo insuficiente.");
      return;
    }
    inFlightRef.current = true;
    if (!spinIdempotencyRef.current) {
      spinIdempotencyRef.current = newSpinIdempotencyKey();
    }

    setError("");
    setLastWin(null);
    setMessage(null);
    setWinFlash(false);
    setFreeSpinFlash(false);
    setLastFreeSpinsAwarded(0);
    setFreeSpinAutoBonus(false);
    setWinCells([]);
    setLineWins([]);
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
        body: JSON.stringify({
          gameId,
          betAmount: bet,
          idempotencyKey: spinIdempotencyRef.current,
        }),
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
          ? "Tiempo de espera agotado. Reintenta el mismo giro."
          : "Error de conexión. Reintenta el mismo giro.",
        { retainIdempotency: true }
      );
    } finally {
      window.clearTimeout(timeout);
    }
  }, [balance, bet, bonus.freeSpinsLeft, failSpin, gameId, spinning, tryFinalizeSpin]);

  const handleAllStopped = useCallback(() => {
    reelsStoppedRef.current = true;
    tryFinalizeSpin();
  }, [tryFinalizeSpin]);

  useEffect(() => {
    window.clearTimeout(autoFreeSpinTimerRef.current);
    if (
      bonus.freeSpinsLeft <= 0 ||
      spinning ||
      awaitingStop ||
      inFlightRef.current ||
      Boolean(error) ||
      rulesOpen
    ) {
      return;
    }

    autoFreeSpinTimerRef.current = window.setTimeout(() => {
      if (
        bonus.freeSpinsLeft > 0 &&
        !spinning &&
        !awaitingStop &&
        !inFlightRef.current &&
        !error
      ) {
        void spin();
      }
    }, uiPace.autoFreeSpinDelayMs);

    return () => {
      window.clearTimeout(autoFreeSpinTimerRef.current);
    };
  }, [
    awaitingStop,
    bonus.freeSpinsLeft,
    error,
    rulesOpen,
    spin,
    spinning,
    uiPace.autoFreeSpinDelayMs,
  ]);

  const freeMode = bonus.freeSpinsLeft > 0;
  const showWinResult =
    !awaitingStop && !error && !freeSpinFlash && (lastWin ?? 0) > 0;
  const showNoPrizeResult =
    !awaitingStop &&
    !error &&
    !freeSpinFlash &&
    (lastWin ?? 0) <= 0 &&
    !message;
  const showBonusMessage =
    !freeSpinFlash && Boolean(message) && (lastWin ?? 0) <= 0;
  const activeLineIndices = useMemo(
    () => lineWins.map((w) => w.lineIndex),
    [lineWins]
  );

  return (
    <div
      className={cn(
        "casino-machine",
        game.themeClass,
        isLamp && "casino-machine--magic-lamp",
        isWolf && "casino-machine--moon-wolf",
        isWolf && freeMode && "casino-machine--moon-night",
        awaitingStop && "casino-machine--reels-active",
        showLandscapeWarning && "casino-machine--orientation-warning",
        winFlash && "casino-machine--win"
      )}
    >
      <div className="casino-machine-bg" aria-hidden />
      {isLamp && <div className="casino-machine-theme-bg" aria-hidden />}
      {isWolf && <div className="casino-machine-theme-bg" aria-hidden />}
      <div className="casino-machine-floor-glow" aria-hidden />
      <SlotOrientationNotice active={showLandscapeWarning} />

      <div className="casino-machine-inner">
        <SlotCabinet themeClass={game.themeClass} winFlash={winFlash}>
          {isLamp && <AmbientLights className="slot-ambient-lights--cabinet" />}
          {isWolf && (
            <MoonWolfEffects
              className="slot-wolf-effects--cabinet"
              intense={freeMode || winFlash}
            />
          )}
          <SlotHeader
            name={game.name}
            tagline={game.tagline}
            logoSrc={CASINO_ART.thumbs[gameId]}
            className="slot-header--compact"
            showBalancePill
            balanceNode={
              <AnimatedBalance value={balance} className="slot-balance-value" />
            }
          />

          <SlotCabinetBody>
            <SlotRuleBar className="slot-rule-bar--compact slot-rule-bar--minimal">
              {freeMode ? (
                <span className="slot-rule-text slot-rule-text--free">
                  GIROS GRATIS {bonus.freeSpinsLeft}
                  {bonus.multiplier > 1 ? ` · ×${bonus.multiplier}` : ""}
                  {bonus.progressiveMultiplier > 1
                    ? ` · PROGRESIVO ×${bonus.progressiveMultiplier}`
                    : ""}
                </span>
              ) : (
                <span className="slot-rule-text slot-rule-text--lines">
                  {game.paylineCount} líneas · {game.cols}×{game.rows}
                </span>
              )}
            </SlotRuleBar>

            <SlotScreen
              winFlash={winFlash}
              className={cn(
                "slot-screen--expanded",
                settleFlash && "slot-screen--settled"
              )}
            >
              <SlotPaylineFrame
                activeLineIndices={!awaitingStop ? activeLineIndices : []}
                paylineCount={game.paylineCount}
              >
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
              </SlotPaylineFrame>
              <CoinBurst
                active={winFlash || freeSpinFlash}
                generation={stopGeneration}
                variant={isWolf ? "stars" : "coins"}
                durationMs={uiPace.coinBurstMs}
              />
              <WinCelebration
                active={winFlash && (lastWin ?? 0) > 0}
                amount={lastWin ?? 0}
                gameId={gameId}
                mode="win"
                big={(lastWin ?? 0) >= bet * 20}
              />
              <WinCelebration
                active={freeSpinFlash}
                gameId={gameId}
                mode="free-spin"
                freeSpins={lastFreeSpinsAwarded}
                autoBonus={freeSpinAutoBonus}
                big={lastFreeSpinsAwarded >= 8}
              />
              {(winFlash || freeSpinFlash) && (
                <div className="casino-win-overlay" aria-hidden />
              )}
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
              {showWinResult && (
                <p
                  className="slot-result-strip slot-result-strip--win slot-result-strip--overlay"
                  aria-live="polite"
                >
                  Ganaste {formatMoney(lastWin ?? 0)}
                </p>
              )}
              {showNoPrizeResult && (
                <p
                  className="slot-result-strip slot-result-strip--neutral slot-result-strip--overlay"
                  aria-live="polite"
                >
                  Sin premio este giro
                </p>
              )}
              {showBonusMessage && (
                <p className="slot-result-strip slot-result-strip--bonus slot-result-strip--overlay">
                  {message}
                </p>
              )}
              {error && (
                <p className="slot-result-strip slot-result-strip--error slot-result-strip--overlay">
                  {error}
                </p>
              )}
            </SlotScreen>
          </SlotCabinetBody>

          <SlotCabinetDeck>
            <SlotControlDeck
              financeHud={
                <SlotFinanceHud
                  balance={balance}
                  hideBalance
                  balanceNode={
                    <AnimatedBalance
                      value={balance}
                      className="slot-balance-value"
                    />
                  }
                  bet={bet}
                  win={lastWin}
                  winPending={awaitingStop}
                  freeMode={freeMode}
                  lineCount={game.paylineCount}
                />
              }
              navButtons={
                <>
                  <SlotRulesButton
                    onClick={() => {
                      setRulesSection("rules");
                      setRulesOpen(true);
                    }}
                  />
                  <button
                    type="button"
                    className="slot-rules-btn slot-rules-btn--secondary"
                    onClick={() => {
                      setRulesSection("paytable");
                      setRulesOpen(true);
                    }}
                  >
                    <span className="slot-rules-btn-icon" aria-hidden>
                      $
                    </span>
                    <span className="slot-rules-btn-label">Pagos</span>
                  </button>
                </>
              }
              betControls={
                <BetControls
                  bet={bet}
                  options={betOptions}
                  disabled={spinning || freeMode}
                  onSelect={setBet}
                  hideLabel
                />
              }
              spinButton={
                <SpinButton
                  label={
                    awaitingStop
                      ? "GIRANDO"
                      : freeMode
                        ? "GRATIS"
                        : "GIRAR"
                  }
                  spinning={awaitingStop}
                  ready={
                    !spinning && !awaitingStop && (freeMode || balance >= bet)
                  }
                  disabled={
                    spinning ||
                    awaitingStop ||
                    (!freeMode && balance < bet)
                  }
                  onClick={() => void spin()}
                  aria-busy={awaitingStop}
                />
              }
            />
          </SlotCabinetDeck>
        </SlotCabinet>

        <SlotRulesPanel
          open={rulesOpen}
          onClose={() => setRulesOpen(false)}
          gameId={gameId}
          bet={bet}
          initialSection={rulesSection}
        />
      </div>
    </div>
  );
}
