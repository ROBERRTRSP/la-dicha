"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandHeader } from "@/components/player/BrandHeader";
import { RouletteWheel } from "@/components/roulette/RouletteWheel";
import { RouletteResultBadge } from "@/components/roulette/RouletteResultBadge";
import {
  BET_TYPE_LABELS,
  betSelectionKey,
  formatBetLabel,
  numberColor,
  type RouletteBetType,
} from "@/lib/roulette";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

type HistoryItem = {
  id: string;
  betType: string;
  betChoice: string;
  amount: number;
  winningNumber: number;
  payout: number;
  profit: number;
  result: string;
  createdAt: string;
};

type SelectedBet = {
  key: string;
  betType: RouletteBetType;
  betChoice: string;
  amount: number;
};

const OUTSIDE_BETS: RouletteBetType[] = [
  "RED",
  "BLACK",
  "EVEN",
  "ODD",
  "LOW",
  "HIGH",
  "DOZEN_1",
  "DOZEN_2",
  "DOZEN_3",
  "COLUMN_1",
  "COLUMN_2",
  "COLUMN_3",
];

const AMOUNTS = [1, 2, 3, 4, 5];

function resultColor(c: string): "red" | "black" | "green" {
  if (c === "red" || c === "black" || c === "green") return c;
  return "black";
}

function isStraightSelected(
  bets: SelectedBet[],
  n: number
): boolean {
  const key = betSelectionKey("STRAIGHT", String(n));
  return bets.some((b) => b.key === key);
}

function isOutsideSelected(bets: SelectedBet[], type: RouletteBetType): boolean {
  const key = betSelectionKey(type, type);
  return bets.some((b) => b.key === key);
}

export function RouletteClient({ balance: initialBalance }: { balance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [amount, setAmount] = useState(1);
  const [selectedBets, setSelectedBets] = useState<SelectedBet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [showingResult, setShowingResult] = useState(false);
  const [targetNumber, setTargetNumber] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{
    number: number;
    won: boolean;
    payout: number;
    color: string;
    summary?: string;
    promoMessage?: string | null;
  } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [promoBanner, setPromoBanner] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [limits, setLimits] = useState({
    minBet: 1,
    maxBet: 100,
    maxStraightBet: 20,
    maxOutsideBet: 50,
  });
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [pendingResult, setPendingResult] = useState<{
    winningNumber: number;
    won: boolean;
    payout: number;
    color: string;
    balanceAfter: number;
    summary?: string;
    promoMessage?: string | null;
  } | null>(null);

  const amountOptions = useMemo(
    () =>
      AMOUNTS.filter(
        (a) => a >= limits.minBet && a <= limits.maxBet
      ),
    [limits.minBet, limits.maxBet]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResultRef = useRef(pendingResult);

  useEffect(() => {
    pendingResultRef.current = pendingResult;
  }, [pendingResult]);

  const focusMode = spinning || showingResult;

  const scrollToWheel = useCallback(() => {
    const scroll = scrollRef.current;
    const hero = heroRef.current;
    if (!scroll || !hero) return;

    requestAnimationFrame(() => {
      const scrollTop = scroll.scrollTop;
      const heroRect = hero.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();
      const heroCenter =
        scrollTop + (heroRect.top - scrollRect.top) + heroRect.height / 2;
      const targetScroll = heroCenter - scroll.clientHeight / 2;

      scroll.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    });
  }, []);

  const totalStake = useMemo(
    () => selectedBets.reduce((sum, b) => sum + b.amount, 0),
    [selectedBets]
  );

  const historyPills = history;

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/roulette/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadHistory();
    fetch("/api/roulette/status")
      .then((r) => r.json())
      .then((d) => {
        setActive(d.active !== false);
        if (d.limits) setLimits(d.limits);
        if (d.promotions?.banner) setPromoBanner(d.promotions.banner);
        if (typeof d.balance === "number") setBalance(d.balance);
        if (d.promoCreditMessage) setInfoMessage(d.promoCreditMessage);
        setDailyLimitReached(d.dailyLimitReached === true);
      })
      .catch(() => {});
  }, [loadHistory]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!infoMessage) return;
    const t = setTimeout(() => setInfoMessage(""), 6000);
    return () => clearTimeout(t);
  }, [infoMessage]);

  useEffect(() => {
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (focusMode) scrollToWheel();
  }, [focusMode, scrollToWheel]);

  function toggleBet(betType: RouletteBetType, betChoice: string) {
    if (spinning) return;
    setError("");
    const key = betSelectionKey(betType, betChoice);
    const normalized = betType === "STRAIGHT" ? betChoice : betType;

    setSelectedBets((prev) => {
      const existing = prev.find((b) => b.key === key);
      if (existing) {
        return prev.filter((b) => b.key !== key);
      }
      return [
        ...prev,
        { key, betType, betChoice: normalized, amount },
      ];
    });
  }

  function selectOutside(type: RouletteBetType) {
    toggleBet(type, type);
  }

  function selectStraight(n: number) {
    toggleBet("STRAIGHT", String(n));
  }

  function clearBets() {
    if (spinning) return;
    setSelectedBets([]);
    setError("");
  }

  function canSpin() {
    if (!active || spinning || dailyLimitReached) return false;
    if (selectedBets.length === 0) return false;
    if (totalStake <= 0 || totalStake > balance) return false;
    return true;
  }

  const onSpinEnd = useCallback(() => {
    const result = pendingResultRef.current;
    if (result) {
      setBalance(result.balanceAfter);
      setLastResult({
        number: result.winningNumber,
        won: result.won,
        payout: result.payout,
        color: result.color,
        summary: result.summary,
        promoMessage: result.promoMessage,
      });
      if (result.promoMessage) {
        setInfoMessage(result.promoMessage);
      }
      setSelectedBets([]);
      loadHistory();
      setDailyLimitReached(false);
    }
    setSpinning(false);
    setShowingResult(true);
    setPendingResult(null);

    resultTimerRef.current = setTimeout(() => {
      setShowingResult(false);
      resultTimerRef.current = null;
    }, 3200);
  }, [loadHistory]);

  async function handleSpin() {
    if (spinning) return;
    setError("");
    if (selectedBets.length === 0) {
      setError("Selecciona al menos una apuesta.");
      return;
    }
    if (totalStake > balance) {
      setError("Saldo insuficiente.");
      return;
    }

    const betPayload = selectedBets.map((b) => ({
      betType: b.betType,
      betChoice: b.betChoice,
      amount: b.amount,
    }));

    try {
      const valRes = await fetch("/api/roulette/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bets: betPayload }),
      });
      const val = await valRes.json();
      if (!val.ok) {
        setError(val.message ?? "No se puede jugar esta apuesta.");
        if (val.message?.includes("tope de premios")) {
          setDailyLimitReached(true);
        }
        return;
      }
    } catch {
      setError("No se pudo validar la apuesta. Intenta de nuevo.");
      return;
    }

    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    setShowingResult(false);
    setSpinning(true);
    setLastResult(null);
    setTargetNumber(null);
    setPendingResult(null);
    scrollToWheel();

    try {
      const res = await fetch("/api/roulette/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bets: betPayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al girar.");

      const summary =
        data.betCount > 1
          ? `${data.wonCount} de ${data.betCount} apuestas ganadas`
          : undefined;

      setPendingResult({
        winningNumber: data.winningNumber,
        won: data.anyWon,
        payout: data.totalPayout,
        color: data.color,
        balanceAfter: data.balanceAfter,
        summary,
        promoMessage: data.promoMessage ?? null,
      });
      setTargetNumber(data.winningNumber);
    } catch (e) {
      setSpinning(false);
      setError(e instanceof Error ? e.message : "Error al girar.");
    }
  }

  return (
    <div className={cn("roulette-screen", focusMode && "roulette-screen--focus")}>
      <BrandHeader balance={balance} title="Ruleta" backHref="/jugar" />

      {!active && (
        <p className="roulette-disabled-banner">
          La Ruleta está desactivada por el administrador.
        </p>
      )}

      {dailyLimitReached && active && (
        <p className="roulette-limit-banner">
          Llegaste al tope de premios de hoy. Vuelve mañana para seguir jugando.
        </p>
      )}

      {promoBanner && active && !focusMode && !dailyLimitReached && (
        <p className="roulette-promo-banner">{promoBanner}</p>
      )}

      <div className="roulette-scroll" ref={scrollRef}>
        <section
          className={cn("roulette-hero", focusMode && "roulette-hero--focus")}
          ref={heroRef}
        >
          <RouletteWheel
            spinning={spinning}
            targetNumber={targetNumber}
            onSpinEnd={onSpinEnd}
          />

          {spinning && (
            <p className="roulette-spin-status" aria-live="polite">
              Girando…
            </p>
          )}

          {lastResult && showingResult && (
            <RouletteResultBadge
              number={lastResult.number}
              color={resultColor(lastResult.color)}
              won={lastResult.won}
              payout={lastResult.payout}
              summary={lastResult.summary}
              className="roulette-hero-result"
            />
          )}
        </section>

        {!focusMode && (
        <section className="roulette-bets roulette-bets--enter">
          <div className="roulette-amount-panel">
            <p className="roulette-section-label">Monto por apuesta</p>
            <p className="roulette-amount-hint">
              Elige un monto y toca las jugadas que quieras. Puedes combinar varias.
            </p>
            <div className="roulette-amounts">
              {amountOptions.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={cn(
                    "roulette-amount-chip",
                    amount === a && "selected"
                  )}
                  onClick={() => setAmount(a)}
                  disabled={spinning}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <p className="roulette-section-label">Número directo</p>
          <div className="roulette-number-grid">
            <button
              type="button"
              className={cn(
                "roulette-num-btn green",
                isStraightSelected(selectedBets, 0) && "selected"
              )}
              onClick={() => selectStraight(0)}
              disabled={spinning}
            >
              0
            </button>
            {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={cn(
                  "roulette-num-btn",
                  n % 2 === 0 ? "black" : "red",
                  isStraightSelected(selectedBets, n) && "selected"
                )}
                onClick={() => selectStraight(n)}
                disabled={spinning}
              >
                {n}
              </button>
            ))}
          </div>

          <p className="roulette-section-label">Apuestas externas</p>
          <div className="roulette-outside-grid">
            {OUTSIDE_BETS.map((type) => (
              <button
                key={type}
                type="button"
                className={cn(
                  "roulette-outside-btn",
                  isOutsideSelected(selectedBets, type) && "selected",
                  type === "RED" && "red",
                  type === "BLACK" && "black"
                )}
                onClick={() => selectOutside(type)}
                disabled={spinning}
              >
                {BET_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="roulette-spin-btn"
            disabled={!canSpin()}
            onClick={handleSpin}
          >
            {spinning
              ? "Girando…"
              : selectedBets.length > 1
                ? `Girar · ${formatMoney(totalStake)}`
                : "Girar"}
          </button>

          {selectedBets.length > 0 && (
            <div className="roulette-slip">
              <div className="roulette-slip-head">
                <p className="roulette-slip-title">
                  {selectedBets.length} apuesta{selectedBets.length > 1 ? "s" : ""}
                </p>
                <button
                  type="button"
                  className="roulette-slip-clear"
                  onClick={clearBets}
                  disabled={spinning}
                >
                  Limpiar
                </button>
              </div>
              <ul className="roulette-slip-list">
                {selectedBets.map((bet) => (
                  <li key={bet.key} className="roulette-slip-item">
                    <span className="roulette-slip-label">
                      {formatBetLabel(bet.betType, bet.betChoice)}
                    </span>
                    <span className="roulette-slip-amount">
                      {formatMoney(bet.amount)}
                    </span>
                    <button
                      type="button"
                      className="roulette-slip-remove"
                      onClick={() => toggleBet(bet.betType, bet.betChoice)}
                      disabled={spinning}
                      aria-label={`Quitar ${formatBetLabel(bet.betType, bet.betChoice)}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <p className="roulette-slip-total">
                Total apostado: <strong>{formatMoney(totalStake)}</strong>
              </p>
            </div>
          )}
        </section>
        )}

        {!focusMode && (
        <section className="roulette-history roulette-history--enter">
          <p className="roulette-section-label">Historial</p>
          {historyPills.length === 0 ? (
            <p className="roulette-history-empty-text">
              Tu historial aparecerá después del primer giro.
            </p>
          ) : (
            <ul className="roulette-history-pills">
              {historyPills.map((h) => {
                const c = numberColor(h.winningNumber);
                return (
                  <li
                    key={h.id}
                    className={cn(
                      "roulette-history-pill",
                      `roulette-history-pill--${c}`,
                      h.result === "WIN" && "roulette-history-pill--won"
                    )}
                    title={`${BET_TYPE_LABELS[h.betType as RouletteBetType] ?? h.betType} · ${formatMoney(h.amount)}`}
                  >
                    {h.winningNumber}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        )}
      </div>

      {error && <div className="play-toast play-toast--error">{error}</div>}
      {infoMessage && !error && (
        <div className="play-toast play-toast--info">{infoMessage}</div>
      )}
    </div>
  );
}
