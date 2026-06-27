"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AiVisual } from "@/components/ui/AiVisual";
import { SlotRulesPanel, type SlotRulesSection } from "../SlotRulesPanel";
import { SlotReels } from "../SlotReels";
import { SlotFinanceHud } from "../SlotFinanceHud";
import { SlotPaylineFrame } from "../SlotPaylineFrame";
import { CoinBurst } from "../CoinBurst";
import { AnimatedBalance } from "../WinDisplay";
import { WinCelebration } from "../WinCelebration";
import { useSlotMobile } from "../useSlotMobile";
import { BetControls, SpinButton } from "../SlotCabinet";
import { CASINO_ART } from "@/lib/casino-art";
import { getSlotGame } from "@/lib/slots/games";
import { getSlotUiPace } from "@/lib/slots/mobile-pace";
import type {
  BonusState,
  Grid,
  LineWin,
  SlotGameId,
  WinCell,
} from "@/lib/slots/types";
import { cn, formatMoney } from "@/lib/utils";

type PreviewMode = "auto" | "win" | "lose";

type PreviewSpinResponse = {
  balanceDelta: number;
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

const PREVIEW_GAME_ID: SlotGameId = "magic-lamp";
const PREVIEW_START_BALANCE = 2500;
const PREVIEW_BET_OPTIONS = [1, 2, 5, 10] as const;

export function SlotVisualPreviewMachine() {
  const game = getSlotGame(PREVIEW_GAME_ID)!;
  const defaultGrid = useMemo(
    () =>
      Array.from({ length: 5 }, (_, c) =>
        Array.from({ length: 3 }, (_, r) => {
          const ids = Object.keys(game.symbols);
          return ids[(c + r) % ids.length] ?? ids[0]!;
        })
      ),
    [game.symbols]
  );

  const [previewMode, setPreviewMode] = useState<PreviewMode>("auto");
  const [balance, setBalance] = useState(PREVIEW_START_BALANCE);
  const [bet, setBet] = useState(2);
  const [grid, setGrid] = useState<Grid>(defaultGrid);
  const [spinning, setSpinning] = useState(false);
  const [awaitingStop, setAwaitingStop] = useState(false);
  const [stopGeneration, setStopGeneration] = useState(0);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [winFlash, setWinFlash] = useState(false);
  const [winCells, setWinCells] = useState<WinCell[]>([]);
  const [lineWins, setLineWins] = useState<LineWin[]>([]);
  const [scatterCells, setScatterCells] = useState<WinCell[]>([]);
  const [bonus, setBonus] = useState<BonusState>({
    freeSpinsLeft: 0,
    multiplier: 1,
    progressiveMultiplier: 1,
    freeSpinBetAmount: 0,
  });
  const [resultReady, setResultReady] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesSection, setRulesSection] = useState<SlotRulesSection>("rules");
  const [spinCount, setSpinCount] = useState(0);
  const [spinWins, setSpinWins] = useState(0);
  const [spinLosses, setSpinLosses] = useState(0);
  const [error, setError] = useState("");

  const betOptions = useMemo(
    () => PREVIEW_BET_OPTIONS,
    []
  );
  const freeMode = bonus.freeSpinsLeft > 0;
  const isMobile = useSlotMobile();
  const uiPace = useMemo(() => getSlotUiPace(isMobile), [isMobile]);
  const pendingResult = useRef<PreviewSpinResponse | null>(null);
  const reelsStoppedRef = useRef(false);
  const apiResolvedRef = useRef(false);
  const inFlightRef = useRef(false);

  const activeLineIndices = useMemo(
    () => lineWins.map((w) => w.lineIndex),
    [lineWins]
  );
  const showWinResult = !awaitingStop && !error && (lastWin ?? 0) > 0;
  const showNoPrizeResult =
    !awaitingStop && !error && (lastWin ?? 0) <= 0 && !message;
  const maxBet = useCallback(() => {
    if (spinning || awaitingStop) return;
    const affordable = [...betOptions].reverse().find((value) => value <= balance);
    setBet(affordable ?? betOptions[0]!);
  }, [awaitingStop, balance, betOptions, spinning]);

  const tryFinalizeSpin = useCallback(() => {
    if (!reelsStoppedRef.current || !apiResolvedRef.current) return;
    const result = pendingResult.current;
    if (!result) return;
    pendingResult.current = null;

    setBalance((prev) => Math.max(0, prev + result.balanceDelta));
    setBonus(result.bonus);
    setLastWin(result.payout);
    setWinCells(result.winningCells ?? []);
    setLineWins(result.lineWins ?? []);
    setScatterCells(result.scatterCells ?? []);
    setMessage(result.payout > 0 ? null : result.message);
    setSpinCount((v) => v + 1);
    if (result.payout > 0) {
      setSpinWins((v) => v + 1);
      setWinFlash(true);
      window.setTimeout(() => setWinFlash(false), uiPace.winFlashMs);
    } else {
      setSpinLosses((v) => v + 1);
    }

    setSpinning(false);
    setAwaitingStop(false);
    inFlightRef.current = false;
  }, [uiPace.winFlashMs]);

  const spin = useCallback(async () => {
    if (spinning || inFlightRef.current) return;
    const usingFreeSpin = bonus.freeSpinsLeft > 0;
    if (!usingFreeSpin && balance < bet) {
      setError("Saldo demo insuficiente.");
      return;
    }
    inFlightRef.current = true;

    setError("");
    setLastWin(null);
    setMessage(null);
    setWinFlash(false);
    setWinCells([]);
    setLineWins([]);
    setScatterCells([]);
    pendingResult.current = null;
    reelsStoppedRef.current = false;
    apiResolvedRef.current = false;
    setResultReady(false);
    setSpinning(true);
    setAwaitingStop(true);
    setStopGeneration((g) => g + 1);

    window.setTimeout(async () => {
      try {
        const res = await fetch("/api/dev/slot-preview/spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: PREVIEW_GAME_ID,
            betAmount: bet,
            mode: previewMode,
            bonus,
          }),
        });
        const data = (await res.json()) as PreviewSpinResponse | { error?: string };
        if (!res.ok || !("grid" in data)) {
          throw new Error(
            ("error" in data && data.error) || "No se pudo simular giro."
          );
        }
        pendingResult.current = data;
        setGrid(data.grid);
        apiResolvedRef.current = true;
        setResultReady(true);
        tryFinalizeSpin();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de preview.");
        setSpinning(false);
        setAwaitingStop(false);
        inFlightRef.current = false;
      }
    }, 220);
  }, [balance, bet, bonus, previewMode, spinning, tryFinalizeSpin]);

  const handleAllStopped = useCallback(() => {
    reelsStoppedRef.current = true;
    tryFinalizeSpin();
  }, [tryFinalizeSpin]);

  return (
    <div
      className={cn(
        "slot-landscape-root",
        game.themeClass,
        "slot-landscape-root--preview",
        awaitingStop && "slot-landscape-root--spinning",
        winFlash && "slot-landscape-root--win"
      )}
    >
      <div className="slot-landscape-bg" aria-hidden />
      <div className="slot-landscape-shell">
        <aside className="slot-landscape-panel slot-landscape-panel--left">
          <div className="slot-landscape-logo-card">
            <AiVisual
              src={CASINO_ART.thumbs[PREVIEW_GAME_ID]}
              alt={`${game.name} preview`}
              width={360}
              height={130}
              className="slot-landscape-logo"
            />
            <p className="slot-landscape-tagline">Preview visual segura · demo aislada</p>
          </div>
          <div className="slot-landscape-balance-card">
            <span>Saldo demo</span>
            <AnimatedBalance value={balance} className="slot-balance-value" />
          </div>
          <div className="slot-landscape-status-card">
            <p>
              Giros: <strong data-testid="stats-spins">{spinCount}</strong>
            </p>
            <p>
              Premios: <strong data-testid="stats-wins">{spinWins}</strong>
            </p>
            <p>
              Sin premio: <strong data-testid="stats-losses">{spinLosses}</strong>
            </p>
          </div>
        </aside>

        <section className="slot-landscape-center">
          <header className="slot-landscape-center-head">
            <h1>{game.name} Preview</h1>
            <p>{game.paylineCount} líneas · iPhone landscape demo</p>
          </header>
          <div className="slot-landscape-machine">
            <div className="slot-preview-observer" aria-hidden>
              <span data-testid="preview-balance">{balance.toFixed(2)}</span>
              <span data-testid="preview-bet">{bet.toFixed(2)}</span>
              <span data-testid="preview-awaiting">{awaitingStop ? "1" : "0"}</span>
              <span data-testid="preview-last-win">
                {lastWin === null ? "null" : lastWin.toFixed(2)}
              </span>
            </div>
            <SlotPaylineFrame
              activeLineIndices={!awaitingStop ? activeLineIndices : []}
              paylineCount={game.paylineCount}
            >
              <SlotReels
                gameId={PREVIEW_GAME_ID}
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
              active={winFlash}
              generation={stopGeneration}
              variant="coins"
              durationMs={uiPace.coinBurstMs}
            />
            <WinCelebration
              active={winFlash && (lastWin ?? 0) > 0}
              amount={lastWin ?? 0}
              gameId={PREVIEW_GAME_ID}
              mode="win"
              big={(lastWin ?? 0) >= bet * 20}
            />
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
          />
          <div className="slot-preview-mode" data-testid="preview-mode-panel">
            <p className="slot-preview-mode-title">Modo de resultado demo</p>
            <div className="slot-preview-mode-row">
              <button
                type="button"
                data-testid="mode-auto"
                className={cn(
                  "slot-preview-mode-btn",
                  previewMode === "auto" && "slot-preview-mode-btn--active"
                )}
                onClick={() => setPreviewMode("auto")}
                disabled={awaitingStop}
              >
                Auto
              </button>
              <button
                type="button"
                data-testid="mode-win"
                className={cn(
                  "slot-preview-mode-btn",
                  previewMode === "win" && "slot-preview-mode-btn--active"
                )}
                onClick={() => setPreviewMode("win")}
                disabled={awaitingStop}
              >
                Premio
              </button>
              <button
                type="button"
                data-testid="mode-lose"
                className={cn(
                  "slot-preview-mode-btn",
                  previewMode === "lose" && "slot-preview-mode-btn--active"
                )}
                onClick={() => setPreviewMode("lose")}
                disabled={awaitingStop}
              >
                Sin premio
              </button>
            </div>
          </div>
          <div className="slot-landscape-bets">
            <BetControls
              bet={bet}
              options={betOptions}
              disabled={spinning || awaitingStop}
              onSelect={setBet}
              hideLabel
              testIdPrefix="bet"
            />
          </div>
          <div className="slot-landscape-spin-wrap" data-testid="preview-spin-wrap">
            <SpinButton
              label={awaitingStop ? "GIRANDO" : "GIRAR"}
              spinning={awaitingStop}
              ready={!spinning && !awaitingStop && balance >= bet}
              disabled={spinning || awaitingStop || balance < bet}
              onClick={() => void spin()}
              aria-busy={awaitingStop}
              testId="spin-button"
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
              disabled={spinning || awaitingStop}
              onClick={maxBet}
            >
              Máx
            </button>
          </div>
          <div className="slot-landscape-result">
            {showWinResult && (
              <p data-testid="toast-win" className="slot-result-strip slot-result-strip--win">
                Ganaste {formatMoney(lastWin ?? 0)}
              </p>
            )}
            {showNoPrizeResult && (
              <p data-testid="toast-no-win" className="slot-result-strip slot-result-strip--neutral">
                Sin premio este giro
              </p>
            )}
            {error && (
              <p className="slot-result-strip slot-result-strip--error">{error}</p>
            )}
          </div>
        </aside>
      </div>

      <SlotRulesPanel
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        gameId={PREVIEW_GAME_ID}
        bet={bet}
        initialSection={rulesSection}
      />
    </div>
  );
}
