"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { SlotRulesPanel, type SlotRulesSection } from "./SlotRulesPanel";
import { SlotReels } from "./SlotReels";
import { SlotFinanceHud } from "./SlotFinanceHud";
import { SlotPaylineFrame } from "./SlotPaylineFrame";
import { AmbientLights } from "./AmbientLights";
import { MoonWolfEffects } from "./MoonWolfEffects";
import { CoinBurst } from "./CoinBurst";
import { AnimatedBalance, WinDisplay } from "./WinDisplay";
import { SlotAutoFreeProgress } from "./SlotAutoFreeProgress";
import { SlotFreeModeBanner } from "./SlotFreeModeBanner";
import { SlotFreeSpinSummary } from "./SlotFreeSpinSummary";
import { SlotOnboarding, SlotSoundToggle } from "./SlotOnboarding";
import { useSlotEngagement } from "./useSlotEngagement";
import type { AutoFreeSpinProgress } from "@/lib/slots/auto-free-spin";
import { getSlotUiPace } from "@/lib/slots/mobile-pace";
import { WinCelebration } from "./WinCelebration";
import { useSlotMobile, useSlotPortraitBlock } from "./useSlotMobile";
import { SlotOrientationNotice } from "./SlotOrientationNotice";
import { AppImage } from "@/components/ui/AppImage";
import { BetControls, SpinButton } from "./SlotCabinet";
import { getSlotGame } from "@/lib/slots/games";
import { preloadSlotSymbolImages } from "@/lib/slots/symbol-assets";
import { CASINO_ART } from "@/lib/casino-art";
import { CASINO_LOBBY_HREF } from "@/lib/casino-routes";
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
  autoFreeSpinProgress?: AutoFreeSpinProgress;
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
  const [autoFreeProgress, setAutoFreeProgress] = useState<AutoFreeSpinProgress | null>(null);
  const [progressPulse, setProgressPulse] = useState(false);
  const [freeSpinSummary, setFreeSpinSummary] = useState<{
    totalWin: number;
    spinsPlayed: number;
  } | null>(null);
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
  const prevFreeSpinsLeftRef = useRef(0);
  const freeSpinSessionWinRef = useRef(0);
  const freeSpinSessionCountRef = useRef(0);
  const engagement = useSlotEngagement();

  useEffect(() => {
    preloadSlotSymbolImages(gameId);
    fetch("/api/slots/spin")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.balance === "number") setBalance(d.balance);
        if (typeof d.minBetAmount === "number") setMinBetAmount(d.minBetAmount);
        if (typeof d.maxBetAmount === "number") setMaxBetAmount(d.maxBetAmount);
        if (d.bonusStates?.[gameId]) setBonus(d.bonusStates[gameId]);
        if (d.autoFreeSpinProgress?.[gameId]) {
          setAutoFreeProgress(d.autoFreeSpinProgress[gameId]);
        }
      })
      .catch(() => {});

    const thumb = new window.Image();
    thumb.src = CASINO_ART.thumbs[gameId];
    if (gameId === "magic-lamp") {
      const bg = new window.Image();
      bg.src = CASINO_ART.magicLampBg;
    } else if (gameId === "moon-wolf") {
      const bg = new window.Image();
      bg.src = CASINO_ART.moonWolfBg;
    }
  }, [gameId]);

  useEffect(() => {
    if (betOptions.length === 0) return;
    if (!betOptions.includes(bet)) {
      setBet(betOptions[betOptions.length - 1]);
    }
  }, [bet, betOptions]);

  const isLamp = gameId === "magic-lamp";
  const isWolf = gameId === "moon-wolf";
  const isSkunk = gameId === "treasure-skunk";
  const isOx = gameId === "golden-ox";
  const isMobile = useSlotMobile();
  const portraitBlock = useSlotPortraitBlock();
  const uiPace = useMemo(() => getSlotUiPace(isMobile), [isMobile]);

  useEffect(() => {
    const prev = prevFreeSpinsLeftRef.current;
    if (prev === 0 && bonus.freeSpinsLeft > 0) {
      freeSpinSessionWinRef.current = 0;
      freeSpinSessionCountRef.current = 0;
      setFreeSpinSummary(null);
    }
    if (prev > 0 && bonus.freeSpinsLeft === 0 && freeSpinSessionCountRef.current > 0) {
      setFreeSpinSummary({
        totalWin: freeSpinSessionWinRef.current,
        spinsPlayed: freeSpinSessionCountRef.current,
      });
    }
    prevFreeSpinsLeftRef.current = bonus.freeSpinsLeft;
  }, [bonus.freeSpinsLeft]);

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
    if (result.autoFreeSpinProgress) {
      setAutoFreeProgress(result.autoFreeSpinProgress);
    }

    const scatterAward = result.freeSpinsAwarded ?? 0;
    const autoAward = result.autoFreeSpinsAwarded ?? 0;
    const totalFreeAward =
      !result.isFreeSpin && (scatterAward > 0 || autoAward > 0)
        ? scatterAward + autoAward
        : 0;

    if (result.isFreeSpin) {
      freeSpinSessionWinRef.current += result.payout;
      freeSpinSessionCountRef.current += 1;
    }

    if (autoAward > 0) {
      setProgressPulse(true);
      window.setTimeout(() => setProgressPulse(false), 900);
      engagement.playFreeSpinAward();
    }

    if (result.payout > 0) {
      setWinFlash(true);
      window.setTimeout(() => setWinFlash(false), uiPace.winFlashMs);
      engagement.playWin(result.payout, bet);
    } else if (totalFreeAward > 0) {
      engagement.playFreeSpinAward();
    } else {
      engagement.playNoWin();
    }

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
  }, [bet, engagement, isMobile, uiPace]);

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
          if (d.autoFreeSpinProgress?.[gameId]) {
            setAutoFreeProgress(d.autoFreeSpinProgress[gameId]);
          }
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
    engagement.ensureAudio();
    engagement.playSpinStart();
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
  }, [balance, bet, bonus.freeSpinsLeft, engagement, failSpin, gameId, spinning, tryFinalizeSpin]);

  const handleAllStopped = useCallback(() => {
    reelsStoppedRef.current = true;
    for (let i = 0; i < 5; i++) {
      window.setTimeout(() => engagement.playReelStop(), i * 120);
    }
    tryFinalizeSpin();
  }, [engagement, tryFinalizeSpin]);

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
  const maxBet = useCallback(() => {
    if (spinning || awaitingStop || betOptions.length === 0 || freeMode) return;
    const affordable = [...betOptions].reverse().find((value) => value <= balance);
    setBet(affordable ?? betOptions[0]!);
  }, [awaitingStop, balance, betOptions, freeMode, spinning]);

  if (portraitBlock) {
    return (
      <div
        className={cn(
          "slot-landscape-root",
          game.themeClass,
          isLamp && "slot-landscape-root--lamp",
          isWolf && "slot-landscape-root--wolf",
          isSkunk && "slot-landscape-root--skunk",
          isOx && "slot-landscape-root--ox"
        )}
      >
        <SlotOrientationNotice active />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "slot-landscape-root",
        game.themeClass,
        isLamp && "slot-landscape-root--lamp",
        isWolf && "slot-landscape-root--wolf",
        isSkunk && "slot-landscape-root--skunk",
        isOx && "slot-landscape-root--ox",
        awaitingStop && "slot-landscape-root--spinning",
        winFlash && "slot-landscape-root--win"
      )}
    >
      <SlotSoundToggle muted={engagement.muted} onToggle={engagement.toggleMute} />
      <SlotOnboarding gameId={gameId} />

      <div className="slot-landscape-bg" aria-hidden />
      <div className="slot-landscape-vignette" aria-hidden />

      {isLamp && <AmbientLights className="slot-landscape-ambient" />}
      {isWolf && (
        <MoonWolfEffects
          className="slot-landscape-ambient"
          intense={freeMode || winFlash}
        />
      )}

      <div className="slot-landscape-shell">
        <aside className="slot-landscape-panel slot-landscape-panel--left">
          <Link href={CASINO_LOBBY_HREF} className="slot-landscape-back">
            ← Casino
          </Link>
          <div className="slot-landscape-logo-card">
            <AppImage
              src={CASINO_ART.thumbs[gameId]}
              alt={game.name}
              width={120}
              height={120}
              className="slot-landscape-logo"
              priority
            />
            <p className="slot-landscape-tagline">{game.tagline}</p>
          </div>
          <div className="slot-landscape-balance-card">
            <span>Saldo</span>
            <AnimatedBalance value={balance} className="slot-balance-value" />
          </div>
          <SlotAutoFreeProgress
            progress={autoFreeProgress}
            freeMode={freeMode}
            pulse={progressPulse}
          />
          <div className="slot-landscape-status-card">
            {freeMode ? (
              <p>
                Giros gratis: <strong>{bonus.freeSpinsLeft}</strong>
              </p>
            ) : (
              <p>
                Líneas: <strong>{game.paylineCount}</strong>
              </p>
            )}
            {(bonus.multiplier > 1 || bonus.progressiveMultiplier > 1) && (
              <p>
                Multiplicador:
                <strong>
                  {" "}
                  ×{Math.max(bonus.multiplier, bonus.progressiveMultiplier)}
                </strong>
              </p>
            )}
          </div>
        </aside>

        <section className="slot-landscape-center">
          <header className="slot-landscape-center-head">
            <h1>{game.name}</h1>
            <p>
              {game.cols}x{game.rows} · {game.paylineCount} líneas activas
            </p>
          </header>
          <div className={cn("slot-landscape-machine", settleFlash && "slot-landscape-machine--settle")}>
            <SlotFreeModeBanner freeSpinsLeft={bonus.freeSpinsLeft} />
            {freeSpinSummary && (
              <SlotFreeSpinSummary
                totalWin={freeSpinSummary.totalWin}
                spinsPlayed={freeSpinSummary.spinsPlayed}
                onDismiss={() => setFreeSpinSummary(null)}
              />
            )}
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
            <WinDisplay
              amount={lastWin ?? 0}
              generation={stopGeneration}
            />
            {jackpotTier && (
              <div
                className={cn(
                  "slot-landscape-jackpot",
                  `slot-landscape-jackpot--${jackpotTier.toLowerCase()}`
                )}
              >
                {formatJackpotBanner(jackpotTier)}
              </div>
            )}
          </div>
        </section>

        <aside className="slot-landscape-panel slot-landscape-panel--right">
          <SlotFinanceHud
            balance={balance}
            hideBalance
            balanceNode={<AnimatedBalance value={balance} className="slot-balance-value" />}
            bet={bet}
            win={lastWin}
            winPending={awaitingStop}
            freeMode={freeMode}
            lineCount={game.paylineCount}
            winGeneration={stopGeneration}
          />
          <div className="slot-landscape-bets">
            <BetControls
              bet={bet}
              options={betOptions}
              disabled={spinning || awaitingStop || freeMode}
              onSelect={(value) => {
                engagement.playClick();
                setBet(value);
              }}
            />
          </div>
          <div className="slot-landscape-spin-wrap">
            <SpinButton
              label={awaitingStop ? "GIRANDO" : freeMode ? "GRATIS" : "GIRAR"}
              spinning={awaitingStop}
              ready={!spinning && !awaitingStop && (freeMode || balance >= bet)}
              disabled={spinning || awaitingStop || (!freeMode && balance < bet)}
              onClick={() => {
                engagement.ensureAudio();
                void spin();
              }}
              aria-busy={awaitingStop}
            />
          </div>
          <div className="slot-landscape-actions">
            <button
              type="button"
              className="slot-rules-btn"
              onClick={() => {
                setRulesSection("rules");
                setRulesOpen(true);
              }}
            >
              Reglas
            </button>
            <button
              type="button"
              className="slot-rules-btn slot-rules-btn--secondary"
              onClick={() => {
                setRulesSection("paytable");
                setRulesOpen(true);
              }}
            >
              Pagos
            </button>
            <button
              type="button"
              className="slot-rules-btn slot-rules-btn--secondary"
              disabled={spinning || awaitingStop || freeMode}
              onClick={maxBet}
            >
              Máx
            </button>
          </div>
          <div className="slot-landscape-result" aria-live="polite">
            {showWinResult && <p className="slot-result-strip slot-result-strip--win">Ganaste {formatMoney(lastWin ?? 0)}</p>}
            {showNoPrizeResult && <p className="slot-result-strip slot-result-strip--neutral">Sin premio este giro</p>}
            {showBonusMessage && <p className="slot-result-strip slot-result-strip--bonus">{message}</p>}
            {error && <p className="slot-result-strip slot-result-strip--error">{error}</p>}
          </div>
        </aside>
      </div>

      <SlotRulesPanel
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        gameId={gameId}
        bet={bet}
        initialSection={rulesSection}
      />
    </div>
  );
}
