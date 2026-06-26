"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { AiVisual } from "@/components/ui/AiVisual";
import { SpinButton } from "../SlotCabinet";
import { SlotReels } from "../SlotReels";
import { CoinBurst } from "../CoinBurst";
import { Classic7PaytableModal } from "./Classic7PaytableModal";
import { getSlotGame } from "@/lib/slots/games";
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
  const [winCells, setWinCells] = useState<WinCell[]>([]);
  const [bigWin, setBigWin] = useState(false);
  const [error, setError] = useState("");
  const [resultReady, setResultReady] = useState(false);
  const [paytableOpen, setPaytableOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SpinHistoryEntry[]>([]);
  const [maxBetAmount, setMaxBetAmount] = useState(10);
  const [minBetAmount, setMinBetAmount] = useState(1);

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
    setLastWin(result.payout);
    setWinCells(result.winningCells ?? []);
    if (result.message) setMessage(result.message);

    const payout = result.payout;
    if (payout > 0) {
      setWinFlash(true);
      setBigWin(payout >= bet * 50);
      window.setTimeout(() => {
        setWinFlash(false);
        setBigWin(false);
      }, payout >= bet * 50 ? 2400 : 1400);
    }

    setHistory((h) =>
      [
        {
          id: result.spinId ?? String(Date.now()),
          bet,
          win: payout,
          at: Date.now(),
        },
        ...h.filter((row) => row.id !== result.spinId),
      ].slice(0, 8)
    );
    void loadHistory();

    setSpinning(false);
    setAwaitingStop(false);
    inFlightRef.current = false;
    spinIdempotencyRef.current = null;
  }, [bet, loadHistory]);

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
        })
        .catch(() => {});
    },
    []
  );

  const spin = async () => {
    if (spinning || inFlightRef.current) return;
    if (balance < bet) {
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
    setWinCells([]);
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
  };

  const handleAllStopped = useCallback(() => {
    reelsStoppedRef.current = true;
    tryFinalizeSpin();
  }, [tryFinalizeSpin]);

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

  return (
    <div className="casino-machine casino-machine--classic7 classic7-machine">
      <div className="casino-machine-bg classic7-machine-bg" aria-hidden>
        <AiVisual
          src={C7.bg}
          alt=""
          fill
          priority
          sizes="100vw"
          className="classic7-bg-art"
        />
        <div className="classic7-bg-vignette" />
      </div>
      <div className="casino-machine-inner classic7-inner">
        <CoinBurst active={winFlash} generation={stopGeneration} variant="coins" />
        {winFlash && <div className="classic7-win-overlay" aria-hidden />}

        <div className="classic7-cabinet slot-theme--classic7">
          <header className="classic7-header">
            <div className="classic7-header-toolbar">
              <Link href={CASINO_LOBBY_HREF} className="classic7-back">
                ← Casino
              </Link>
              <span className="classic7-header-badge">1 línea central</span>
            </div>
            <div className="classic7-marquee">
              <div className="classic7-marquee-shimmer" aria-hidden />
              <AiVisual
                src={C7.logo}
                alt="Clásica 7"
                width={480}
                height={120}
                priority
                className="classic7-marquee-logo"
              />
            </div>
          </header>

          <div className="classic7-body">
            <div className="classic7-console">
              <div className="classic7-reel-wrap">
                <div className="classic7-reel-frame-deco" aria-hidden>
                  <AiVisual
                    src={C7.cabinetFrame}
                    alt=""
                    fill
                    sizes="(max-width: 420px) 96vw, 420px"
                    className="classic7-reel-frame-art"
                  />
                </div>
                <div className="classic7-reel-window">
                  <div
                    className={cn(
                      "classic7-screen",
                      winFlash && "classic7-screen--win",
                      awaitingStop && "classic7-screen--spinning"
                    )}
                  >
                    <div className="classic7-payline" aria-hidden>
                      <span className="classic7-payline-arrow classic7-payline-arrow--left" />
                      <span className="classic7-payline-line" />
                      <span className="classic7-payline-arrow classic7-payline-arrow--right" />
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
                </div>
                <p
                  className={cn(
                    "classic7-reel-caption",
                    winFlash && "classic7-reel-caption--win"
                  )}
                >
                  Línea de pago central
                </p>
              </div>

              {error && <p className="classic7-error">{error}</p>}
              {message && !error && <p className="classic7-message">{message}</p>}
              {bigWin && (
                <div className="classic7-big-win-banner" role="status">
                  <AiVisual
                    src={C7.ui.bigWin}
                    alt=""
                    fill
                    sizes="320px"
                    className="classic7-big-win-art"
                  />
                  <p className="classic7-big-win">
                    BIG WIN · {formatMoney(lastWin ?? 0)}
                  </p>
                </div>
              )}

              <div className="classic7-action-dock">
              <div className="classic7-hud">
                <div className="classic7-hud-bg" aria-hidden>
                  <AiVisual
                    src={C7.ui.hudPanel}
                    alt=""
                    fill
                    sizes="420px"
                    className="classic7-hud-art"
                  />
                </div>
                <div className="classic7-hud-grid">
                  <div className="classic7-hud-cell">
                    <span>Balance</span>
                    <strong>{formatMoney(balance)}</strong>
                  </div>
                  <div className="classic7-hud-cell classic7-hud-cell--bet">
                    <span>Apuesta</span>
                    <strong>{formatMoney(bet)}</strong>
                  </div>
                  <div
                    className={cn(
                      "classic7-hud-cell",
                      lastWin && lastWin > 0 && "classic7-hud-cell--win"
                    )}
                  >
                    <span>Premio</span>
                    <strong>{formatMoney(awaitingStop ? 0 : lastWin ?? 0)}</strong>
                  </div>
                </div>
              </div>

              <div className="classic7-controls">
                <div className="classic7-bet-panel">
                  <button
                    type="button"
                    className="classic7-side-btn"
                    onClick={() => setPaytableOpen(true)}
                  >
                    Pagos
                  </button>
                  <button
                    type="button"
                    className="classic7-bet-btn"
                    disabled={spinning}
                    onClick={decBet}
                    aria-label="Bajar apuesta"
                  >
                    −
                  </button>
                  <div className="classic7-bet-readout" aria-live="polite">
                    <span>Monto</span>
                    <strong>{formatMoney(bet)}</strong>
                  </div>
                  <button
                    type="button"
                    className="classic7-bet-btn"
                    disabled={spinning}
                    onClick={incBet}
                    aria-label="Subir apuesta"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="classic7-side-btn"
                    disabled={spinning}
                    onClick={maxBet}
                  >
                    Máx
                  </button>
                </div>

                <div className="classic7-spin-row">
                  <SpinButton
                    label={awaitingStop ? "GIRANDO..." : "GIRAR"}
                    spinning={awaitingStop}
                    ready={!spinning && !awaitingStop && balance >= bet}
                    disabled={spinning || awaitingStop || balance < bet}
                    onClick={() => void spin()}
                    aria-busy={awaitingStop}
                  />
                </div>
              </div>
            </div>
            </div>

            <details
              className="classic7-history"
              open={historyOpen}
              onToggle={(e) => setHistoryOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary>Historial reciente</summary>
              {history.length === 0 ? (
                <p className="classic7-history-empty">Aún no hay giros.</p>
              ) : (
                <ul>
                  {history.map((h) => (
                    <li key={h.id}>
                      {formatMoney(h.bet)} → {h.win > 0 ? `ganó ${formatMoney(h.win)}` : "sin premio"}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          </div>
        </div>

        <Classic7PaytableModal
          open={paytableOpen}
          onClose={() => setPaytableOpen(false)}
          bet={bet}
        />
      </div>
    </div>
  );
}
