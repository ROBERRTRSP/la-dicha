"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { SpinButton } from "../SlotCabinet";
import { SlotReels } from "../SlotReels";
import { SlotFinanceHud } from "../SlotFinanceHud";
import { WinDisplay } from "../WinDisplay";
import { SlotAutoFreeProgress } from "../SlotAutoFreeProgress";
import { SlotFreeModeBanner } from "../SlotFreeModeBanner";
import { SlotOnboarding, SlotSoundToggle } from "../SlotOnboarding";
import { useSlotEngagement } from "../useSlotEngagement";
import type { AutoFreeSpinProgress } from "@/lib/slots/auto-free-spin";
import { CoinBurst } from "../CoinBurst";
import { WinCelebration } from "../WinCelebration";
import { useSlotMobile, useSlotPortraitBlock } from "../useSlotMobile";
import { SlotOrientationNotice } from "../SlotOrientationNotice";
import { AppImage } from "@/components/ui/AppImage";
import { Classic7PaytableModal } from "./Classic7PaytableModal";
import { getSlotGame } from "@/lib/slots/games";
import { getSlotUiPace } from "@/lib/slots/mobile-pace";
import { allowedBetOptionsForGame } from "@/lib/slots/settings";
import { newSpinIdempotencyKey } from "@/lib/spin-client";
import { preloadSlotSymbolImages } from "@/lib/slots/symbol-assets";
import { CASINO_ART } from "@/lib/casino-art";
import { CASINO_LOBBY_HREF } from "@/lib/casino-routes";
import type { BonusState, Grid, LineWin, WinCell } from "@/lib/slots/types";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

const C7 = CASINO_ART.classic7;

type SpinResponse = {
  spinId?: string;
  balance: number;
  grid: Grid;
  lineWins: LineWin[];
  winningCells: WinCell[];
  payout: number;
  message: string | null;
  bonus: BonusState;
  isFreeSpin?: boolean;
  freeSpinsAwarded?: number;
  autoFreeSpinsAwarded?: number;
  autoFreeSpinProgress?: AutoFreeSpinProgress;
};

type SpinHistoryEntry = {
  id: string;
  bet: number;
  win: number;
  at: number;
  isFreeSpin?: boolean;
};

export function Classic7SlotMachine({ initialBalance }: { initialBalance: number }) {
  const game = getSlotGame("classic-7")!;
  const symbolIds = useMemo(() => Object.keys(game.symbols), [game.symbols]);
  const defaultGrid = useMemo(
    () =>
      Array.from({ length: 5 }, (_, c) =>
        Array.from({ length: 3 }, (_, r) => symbolIds[(c + r) % symbolIds.length])
      ),
    [symbolIds]
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
  const [bigWin, setBigWin] = useState(false);
  const [error, setError] = useState("");
  const [bonus, setBonus] = useState<BonusState>({
    freeSpinsLeft: 0,
    multiplier: 1,
    progressiveMultiplier: 1,
  });
  const [resultReady, setResultReady] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SpinHistoryEntry[]>([]);
  const [maxBetAmount, setMaxBetAmount] = useState(10);
  const [minBetAmount, setMinBetAmount] = useState(1);
  const [autoFreeProgress, setAutoFreeProgress] = useState<AutoFreeSpinProgress | null>(null);
  const [progressPulse, setProgressPulse] = useState(false);

  const betOptions = useMemo(
    () =>
      allowedBetOptionsForGame("classic-7", minBetAmount, maxBetAmount) as number[],
    [minBetAmount, maxBetAmount]
  );

  const pendingResult = useRef<SpinResponse | null>(null);
  const reelsStoppedRef = useRef(false);
  const apiResolvedRef = useRef(false);
  const inFlightRef = useRef(false);
  const spinIdempotencyRef = useRef<string | null>(null);
  const autoFreeSpinTimerRef = useRef(0);
  const freeSpinFlashTimerRef = useRef(0);
  const engagement = useSlotEngagement();
  const isMobile = useSlotMobile();
  const portraitBlock = useSlotPortraitBlock();
  const uiPace = useMemo(() => getSlotUiPace(isMobile), [isMobile]);

  const loadHistory = useCallback(() => {
    fetch("/api/slots/history?gameId=classic-7&limit=8")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.spins)) {
          setHistory(
            d.spins.map((s: SpinHistoryEntry) => ({
              id: s.id,
              bet: s.bet,
              win: s.win,
              at: s.at,
              isFreeSpin: s.isFreeSpin,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    preloadSlotSymbolImages("classic-7");
    fetch("/api/slots/spin")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.balance === "number") setBalance(d.balance);
        if (typeof d.maxBetAmount === "number") setMaxBetAmount(d.maxBetAmount);
        if (typeof d.minBetAmount === "number") setMinBetAmount(d.minBetAmount);
        if (d.bonusStates?.["classic-7"]) setBonus(d.bonusStates["classic-7"]);
        if (d.autoFreeSpinProgress?.["classic-7"]) {
          setAutoFreeProgress(d.autoFreeSpinProgress["classic-7"]);
        }
      })
      .catch(() => {});
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (betOptions.length === 0) return;
    if (!betOptions.includes(bet)) {
      setBet(betOptions[betOptions.length - 1]);
    }
  }, [bet, betOptions]);

  const tryFinalizeSpin = useCallback(() => {
    if (!reelsStoppedRef.current || !apiResolvedRef.current) return;
    const result = pendingResult.current;
    if (!result) return;
    pendingResult.current = null;

    setBalance(result.balance);
    setBonus(result.bonus);
    setLastWin(result.payout);
    setWinCells(result.winningCells ?? []);
    if (result.message) setMessage(result.message);
    if (result.autoFreeSpinProgress) {
      setAutoFreeProgress(result.autoFreeSpinProgress);
    }

    const payout = result.payout;
    const scatterAward = result.freeSpinsAwarded ?? 0;
    const autoAward = result.autoFreeSpinsAwarded ?? 0;
    const totalFreeAward =
      !result.isFreeSpin && (scatterAward > 0 || autoAward > 0)
        ? scatterAward + autoAward
        : 0;

    if (autoAward > 0) {
      setProgressPulse(true);
      window.setTimeout(() => setProgressPulse(false), 900);
      engagement.playFreeSpinAward();
    }

    if (payout > 0) {
      setWinFlash(true);
      const flashMs =
        payout >= bet * 50
          ? uiPace.classicBigWinFlashMs
          : uiPace.classicWinFlashMs;
      setBigWin(payout >= bet * 50);
      window.setTimeout(() => {
        setWinFlash(false);
        setBigWin(false);
      }, flashMs);
      engagement.playWin(payout, bet);
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

    setHistory((h) =>
      [
        {
          id: result.spinId ?? String(Date.now()),
          bet,
          win: payout,
          at: Date.now(),
          isFreeSpin: result.isFreeSpin,
        },
        ...h.filter((row) => row.id !== result.spinId),
      ].slice(0, 8)
    );
    void loadHistory();

    setSpinning(false);
    setAwaitingStop(false);
    inFlightRef.current = false;
    spinIdempotencyRef.current = null;
  }, [bet, engagement, loadHistory, uiPace]);

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
          if (d.bonusStates?.["classic-7"]) setBonus(d.bonusStates["classic-7"]);
        })
        .catch(() => {});
    },
    []
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
          gameId: "classic-7",
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
  }, [balance, bet, bonus.freeSpinsLeft, engagement, failSpin, spinning, tryFinalizeSpin]);

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
      paytableOpen
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
    paytableOpen,
    spin,
    spinning,
    uiPace.autoFreeSpinDelayMs,
  ]);

  const freeMode = bonus.freeSpinsLeft > 0;

  const betIndex = betOptions.indexOf(bet);
  const decBet = () => {
    if (spinning || awaitingStop) return;
    const i = betIndex <= 0 ? 0 : betIndex - 1;
    setBet(betOptions[i] ?? betOptions[0]);
  };
  const incBet = () => {
    if (spinning || awaitingStop) return;
    const i =
      betIndex < 0 || betIndex >= betOptions.length - 1
        ? betOptions.length - 1
        : betIndex + 1;
    setBet(betOptions[i] ?? betOptions[0]);
  };
  const maxBet = () => {
    if (spinning || awaitingStop || betOptions.length === 0) return;
    const affordable = [...betOptions].reverse().find((b) => b <= balance);
    setBet(affordable ?? betOptions[0]);
  };

  if (portraitBlock) {
    return (
      <div className="slot-landscape-root slot-landscape-root--classic7">
        <SlotOrientationNotice active />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "slot-landscape-root slot-landscape-root--classic7",
        awaitingStop && "slot-landscape-root--spinning",
        winFlash && "slot-landscape-root--win"
      )}
    >
      <SlotSoundToggle muted={engagement.muted} onToggle={engagement.toggleMute} />
      <SlotOnboarding gameId="classic-7" />

      <div className="slot-landscape-bg slot-landscape-bg--classic7" aria-hidden>
        <AppImage
          src={C7.bg}
          alt=""
          fill
          className="classic7-bg-art"
          sizes="100vw"
          priority
        />
      </div>
      <div className="slot-landscape-vignette" aria-hidden />

      <div className="slot-landscape-shell slot-landscape-shell--classic7">
        <aside className="slot-landscape-panel slot-landscape-panel--left">
          <Link href={CASINO_LOBBY_HREF} className="slot-landscape-back">
            ← Casino
          </Link>
          <div className="slot-landscape-logo-card slot-landscape-logo-card--classic7">
            <AppImage
              src={C7.logo}
              alt="Clásica 7"
              width={120}
              height={120}
              className="slot-landscape-logo"
              priority
            />
            <p className="slot-landscape-tagline">Slot clásica premium · 1 línea central</p>
          </div>
          <div className="slot-landscape-balance-card">
            <span>Saldo</span>
            <strong>{formatMoney(balance)}</strong>
          </div>
          <SlotAutoFreeProgress
            progress={autoFreeProgress}
            freeMode={freeMode}
            pulse={progressPulse}
          />
          <div className="slot-landscape-status-card">
            <p>
              Apuesta actual: <strong>{formatMoney(bet)}</strong>
            </p>
            {freeMode && (
              <p>
                Gratis: <strong>{bonus.freeSpinsLeft}</strong>
              </p>
            )}
          </div>
        </aside>

        <section className="slot-landscape-center slot-landscape-center--classic7">
          <header className="slot-landscape-center-head">
            <h1>Clásica 7</h1>
            <p>Cabina vintage · vertical u horizontal</p>
          </header>
          <div className="slot-landscape-machine slot-landscape-machine--classic7">
            <SlotFreeModeBanner freeSpinsLeft={bonus.freeSpinsLeft} />
            <div className="classic7-reel-frame-deco" aria-hidden>
              <AppImage
                src={C7.cabinetFrame}
                alt=""
                width={400}
                height={280}
                className="classic7-reel-frame-art"
              />
            </div>
            <div className="slot-landscape-classic-reels">
              <div className="classic7-payline" aria-hidden>
                <span className="classic7-payline-rail classic7-payline-rail--left" />
                <span className="classic7-payline-arrow classic7-payline-arrow--left" />
                <span className="classic7-payline-line">
                  <span className="classic7-payline-glow" />
                </span>
                <span className="classic7-payline-arrow classic7-payline-arrow--right" />
                <span className="classic7-payline-rail classic7-payline-rail--right" />
              </div>
              <div className="slot-screen-viewport">
                <SlotReels
                  gameId="classic-7"
                  grid={grid}
                  spinning={awaitingStop}
                  stopGeneration={stopGeneration}
                  resultReady={resultReady}
                  winningCells={winCells}
                  scatterCells={[]}
                  highlight={winFlash || winCells.length > 0}
                  onAllStopped={handleAllStopped}
                />
              </div>
            </div>
            <CoinBurst
              active={winFlash || freeSpinFlash}
              generation={stopGeneration}
              variant="coins"
              durationMs={uiPace.coinBurstMs}
            />
            <WinCelebration
              active={winFlash && (lastWin ?? 0) > 0}
              amount={lastWin ?? 0}
              gameId="classic-7"
              mode="win"
              big={(lastWin ?? 0) >= bet * 50}
            />
            <WinCelebration
              active={freeSpinFlash}
              gameId="classic-7"
              mode="free-spin"
              freeSpins={lastFreeSpinsAwarded}
              autoBonus={freeSpinAutoBonus}
            />
            <WinDisplay amount={lastWin ?? 0} generation={stopGeneration} />
          </div>
        </section>

        <aside className="slot-landscape-panel slot-landscape-panel--right">
          <SlotFinanceHud
            balance={balance}
            hideBalance
            bet={bet}
            win={lastWin}
            winPending={awaitingStop}
            freeMode={freeMode}
            lineCount={1}
            winGeneration={stopGeneration}
          />
          <div className="slot-landscape-classic-bets">
            <button type="button" className="slot-rules-btn slot-rules-btn--secondary" onClick={decBet} disabled={spinning || awaitingStop || freeMode}>
              −
            </button>
            <button type="button" className="slot-rules-btn slot-rules-btn--secondary" onClick={incBet} disabled={spinning || awaitingStop || freeMode}>
              +
            </button>
            <button type="button" className="slot-rules-btn slot-rules-btn--secondary" onClick={maxBet} disabled={spinning || awaitingStop || freeMode}>
              Máx
            </button>
          </div>
          <div className="slot-landscape-spin-wrap">
            <SpinButton
              label={awaitingStop ? "GIRANDO..." : freeMode ? "GIRO GRATIS" : "GIRAR"}
              spinning={awaitingStop}
              ready={!spinning && !awaitingStop && (freeMode || balance >= bet)}
              disabled={spinning || awaitingStop || (!freeMode && balance < bet)}
              onClick={() => void spin()}
              aria-busy={awaitingStop}
            />
          </div>
          <div className="slot-landscape-actions">
            <button
              type="button"
              className="slot-rules-btn"
              onClick={() => setPaytableOpen(true)}
            >
              Pagos
            </button>
            <button
              type="button"
              className="slot-rules-btn slot-rules-btn--secondary"
              onClick={() => setHistoryOpen((v) => !v)}
            >
              Historial
            </button>
          </div>
          <div className="slot-landscape-result" aria-live="polite">
            {error && <p className="slot-result-strip slot-result-strip--error">{error}</p>}
            {freeMode && (
              <p className="slot-result-strip slot-result-strip--bonus">
                GIRO GRATIS · {bonus.freeSpinsLeft}
              </p>
            )}
            {message && !error && !freeSpinFlash && (
              <p className="slot-result-strip slot-result-strip--neutral">{message}</p>
            )}
            {bigWin && (
              <p className="slot-result-strip slot-result-strip--win">
                BIG WIN · {formatMoney(lastWin ?? 0)}
              </p>
            )}
          </div>
          {historyOpen && (
            <div className="slot-landscape-history">
              <p>Historial reciente</p>
              {history.length === 0 ? (
                <span>Aún no hay giros.</span>
              ) : (
                <ul>
                  {history.map((h) => (
                    <li key={h.id}>
                      {formatMoney(h.bet)} → {h.win > 0 ? `ganó ${formatMoney(h.win)}` : "sin premio"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>
      </div>
      <div className="slot-landscape-modals">
        <Classic7PaytableModal
          open={paytableOpen}
          onClose={() => setPaytableOpen(false)}
          bet={bet}
        />
      </div>
    </div>
  );
}
