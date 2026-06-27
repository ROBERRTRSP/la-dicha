"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { SlotRulesButton, SlotRulesPanel, type SlotRulesSection } from "../SlotRulesPanel";
import { SlotReels } from "../SlotReels";
import { SlotFinanceHud } from "../SlotFinanceHud";
import { SlotPaylineFrame } from "../SlotPaylineFrame";
import { CoinBurst } from "../CoinBurst";
import { AnimatedBalance } from "../WinDisplay";
import { WinCelebration } from "../WinCelebration";
import { SlotOrientationNotice } from "../SlotOrientationNotice";
import { useSlotLandscapeWarning, useSlotMobile } from "../useSlotMobile";
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
} from "../SlotCabinet";
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
  const showLandscapeWarning = useSlotLandscapeWarning();
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
        "casino-machine",
        game.themeClass,
        "casino-machine--slot-preview",
        showLandscapeWarning && "casino-machine--orientation-warning",
        awaitingStop && "casino-machine--reels-active",
        winFlash && "casino-machine--win"
      )}
    >
      <div className="casino-machine-bg" aria-hidden />
      <div className="casino-machine-theme-bg" aria-hidden />
      <div className="casino-machine-floor-glow" aria-hidden />
      <SlotOrientationNotice active={showLandscapeWarning} />

      <div className="casino-machine-inner">
        <SlotCabinet themeClass={game.themeClass} winFlash={winFlash}>
          <SlotHeader
            name={`${game.name} Preview`}
            tagline="Demo visual segura · sin cobro real"
            logoSrc={CASINO_ART.thumbs[PREVIEW_GAME_ID]}
            backHref="/dev/slot-preview"
            className="slot-header--compact"
            showBalancePill
            balanceNode={
              <AnimatedBalance value={balance} className="slot-balance-value" />
            }
          />

          <SlotCabinetBody>
            <SlotRuleBar className="slot-rule-bar--compact slot-rule-bar--minimal">
              <span className="slot-rule-text slot-rule-text--lines">
                Preview visual · {game.paylineCount} líneas · saldo demo aislado
              </span>
            </SlotRuleBar>

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
                  Forzar premio
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
                  Forzar sin premio
                </button>
              </div>
              <p className="slot-preview-stats" data-testid="preview-stats">
                Giros: <strong data-testid="stats-spins">{spinCount}</strong> ·
                Premios: <strong data-testid="stats-wins">{spinWins}</strong> ·
                Sin premio: <strong data-testid="stats-losses">{spinLosses}</strong>
              </p>
            </div>

            <SlotScreen
              winFlash={winFlash}
              className={cn("slot-screen--expanded", "slot-screen--settled")}
            >
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
              {showWinResult && (
                <p
                  data-testid="toast-win"
                  className="slot-result-strip slot-result-strip--win slot-result-strip--overlay"
                >
                  Ganaste {formatMoney(lastWin ?? 0)}
                </p>
              )}
              {showNoPrizeResult && (
                <p
                  data-testid="toast-no-win"
                  className="slot-result-strip slot-result-strip--neutral slot-result-strip--overlay"
                >
                  Sin premio este giro
                </p>
              )}
              {error && (
                <p
                  className="slot-result-strip slot-result-strip--error slot-result-strip--overlay"
                >
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
                    <AnimatedBalance value={balance} className="slot-balance-value" />
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
                  disabled={spinning || awaitingStop}
                  onSelect={setBet}
                  hideLabel
                  testIdPrefix="bet"
                />
              }
              spinButton={
                <div className="slot-preview-spin" data-testid="preview-spin-wrap">
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
              }
            />
          </SlotCabinetDeck>
        </SlotCabinet>

        <SlotRulesPanel
          open={rulesOpen}
          onClose={() => setRulesOpen(false)}
          gameId={PREVIEW_GAME_ID}
          bet={bet}
          initialSection={rulesSection}
        />
      </div>
    </div>
  );
}
