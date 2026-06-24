"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrandHeader } from "@/components/player/BrandHeader";
import { RouletteConfirmModal } from "@/components/roulette/RouletteConfirmModal";
import { RouletteWheel } from "@/components/roulette/RouletteWheel";
import { RouletteResultBadge } from "@/components/roulette/RouletteResultBadge";
import {
  BET_TYPE_LABELS,
  betSelectionKey,
  formatBetLabel,
  numberColor,
  type RouletteBetType,
} from "@/lib/roulette";
import {
  clearSpinRecovery,
  consumeSpinRecovery,
  saveSpinRecovery,
} from "@/lib/roulette-recovery";
import {
  ROULETTE_ALLOWED_AMOUNTS,
  ROULETTE_AMOUNT_ERROR,
  filterAllowedAmountsForBalance,
  isAllowedRouletteAmount,
} from "@/lib/roulette-validation";
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

type RewardItem = {
  id: string;
  rewardType: string;
  amount: number;
  reason: string;
  source: string;
  paidAt: string;
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  CASHBACK: "Cashback",
  ACTIVE_PLAYER_BONUS: "Bono del pozo",
  MISSION: "Misión",
  JACKPOT: "Premio comunitario",
  FREE_SPIN: "Giro gratis",
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
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [error, setError] = useState("");
  const [errorSticky, setErrorSticky] = useState(false);
  const [betsValid, setBetsValid] = useState(true);
  const [infoMessage, setInfoMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [spinRequesting, setSpinRequesting] = useState(false);
  const [promoBanner, setPromoBanner] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [dailyHours, setDailyHours] = useState<{
    openTime: string;
    closeLabel: string;
  } | null>(null);
  const [limits, setLimits] = useState({
    minBet: 1,
    maxBet: 5,
    maxStraightBet: 5,
    maxOutsideBet: 5,
  });
  const [lastPlayedBets, setLastPlayedBets] = useState<SelectedBet[]>([]);
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
    () => filterAllowedAmountsForBalance(balance),
    [balance]
  );

  useEffect(() => {
    if (amountOptions.length === 0) return;
    if (!amountOptions.includes(amount)) {
      setAmount(amountOptions[amountOptions.length - 1] ?? 1);
    }
  }, [amountOptions, amount]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResultRef = useRef(pendingResult);
  const spinLockedRef = useRef(false);
  const spinIdempotencyRef = useRef<string | null>(null);

  function newSpinIdempotencyKey() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `spin-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function showError(message: string, sticky = false) {
    setError(message);
    setErrorSticky(sticky);
  }

  useEffect(() => {
    pendingResultRef.current = pendingResult;
  }, [pendingResult]);

  /** Vista de giro: ruleta a pantalla completa; al terminar, vuelve el selector. */
  const spinView = spinning || showingResult;

  const totalStake = useMemo(
    () => selectedBets.reduce((sum, b) => sum + b.amount, 0),
    [selectedBets]
  );

  const lastPlayedStake = useMemo(
    () => lastPlayedBets.reduce((sum, b) => sum + b.amount, 0),
    [lastPlayedBets]
  );

  const historyPills = history;

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/roulette/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history ?? []);
        setRewards(data.rewards ?? []);
        setTotalReceived(data.totalReceived ?? 0);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const recovered = consumeSpinRecovery();
    if (recovered) {
      setBalance(recovered.balanceAfter);
      setInfoMessage(
        `Giro registrado: salió el ${recovered.winningNumber}${
          recovered.anyWon
            ? ` · premio ${formatMoney(recovered.totalPayout)}`
            : ""
        }. Saldo actualizado.`
      );
      void loadHistory();
    }
  }, [loadHistory]);

  const refreshStatus = useCallback(() => {
    fetch("/api/roulette/status")
      .then((r) => r.json())
      .then((d) => {
        setActive(d.active !== false);
        setClosedReason(d.closedReason ?? null);
        if (d.daily) {
          setDailyHours({
            openTime: d.daily.openTime,
            closeLabel: d.daily.closeLabel,
          });
        }
        if (d.limits) setLimits(d.limits);
        if (d.promotions?.banner) setPromoBanner(d.promotions.banner);
        if (typeof d.balance === "number") setBalance(d.balance);
        if (d.promoCreditMessage) setInfoMessage(d.promoCreditMessage);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadHistory();
    refreshStatus();
  }, [loadHistory, refreshStatus]);

  useEffect(() => {
    if (!error || errorSticky) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error, errorSticky]);

  useEffect(() => {
    if (!infoMessage) return;
    const t = setTimeout(() => setInfoMessage(""), 6000);
    return () => clearTimeout(t);
  }, [infoMessage]);

  useEffect(() => {
    setSelectedBets((prev) =>
      prev.length ? prev.map((b) => ({ ...b, amount })) : prev
    );
  }, [amount]);

  /** Validación en vivo antes de girar (montos 1–5 y saldo). */
  useEffect(() => {
    if (spinning || selectedBets.length === 0) {
      setBetsValid(true);
      if (!errorSticky) setError("");
      return;
    }

    const stake = selectedBets.reduce((sum, b) => sum + b.amount, 0);
    const amountsOk = selectedBets.every((b) => isAllowedRouletteAmount(b.amount));

    if (!amountsOk) {
      setBetsValid(false);
      showError(ROULETTE_AMOUNT_ERROR, true);
      return;
    }

    if (stake > balance) {
      setBetsValid(false);
      showError("Saldo insuficiente para estas apuestas.", true);
      return;
    }

    setBetsValid(true);
    setError("");
    setErrorSticky(false);
  }, [selectedBets, spinning, balance]);

  useEffect(() => {
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    };
  }, []);

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

  function repeatLastBets() {
    if (spinning || showingResult || lastPlayedBets.length === 0) return;
    if (lastPlayedStake > balance) {
      showError("Saldo insuficiente para repetir la jugada.", true);
      return;
    }
    setSelectedBets(lastPlayedBets.map((b) => ({ ...b })));
    setAmount(lastPlayedBets[0]?.amount ?? amount);
    setError("");
  }

  function canSpin() {
    if (!active || spinning || spinRequesting || showingResult) return false;
    if (selectedBets.length === 0) return false;
    if (totalStake <= 0 || totalStake > balance) return false;
    if (!betsValid) return false;
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
      refreshStatus();
    }
    setSpinning(false);
    setShowingResult(true);
    setPendingResult(null);
    spinLockedRef.current = false;
    spinIdempotencyRef.current = null;
    setSpinRequesting(false);
    clearSpinRecovery();

    resultTimerRef.current = setTimeout(() => {
      setShowingResult(false);
      setLastResult(null);
      resultTimerRef.current = null;
    }, 3800);
  }, [loadHistory, refreshStatus]);

  function requestSpin() {
    if (spinning || spinRequesting || spinLockedRef.current) return;
    setError("");
    setErrorSticky(false);
    if (selectedBets.length === 0) {
      showError("Selecciona al menos una apuesta.");
      return;
    }
    if (totalStake > balance) {
      showError("Saldo insuficiente para estas apuestas.", true);
      return;
    }
    setConfirmOpen(true);
  }

  async function executeSpin() {
    if (spinning || spinRequesting || spinLockedRef.current) return;

    spinLockedRef.current = true;
    setSpinRequesting(true);
    setConfirmOpen(false);
    setError("");
    setErrorSticky(false);

    if (!spinIdempotencyRef.current) {
      spinIdempotencyRef.current = newSpinIdempotencyKey();
    }

    const betsToPlay = selectedBets.map((b) => ({ ...b }));
    setLastPlayedBets(betsToPlay);

    const betPayload = betsToPlay.map((b) => ({
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
        showError(val.message ?? "No se puede jugar esta apuesta.", true);
        if (typeof val.balance === "number") setBalance(val.balance);
        spinLockedRef.current = false;
        spinIdempotencyRef.current = null;
        setSpinRequesting(false);
        return;
      }
    } catch {
      showError(
        "No se pudo validar la apuesta. Revisa tu conexión e intenta de nuevo.",
        true
      );
      spinLockedRef.current = false;
      spinIdempotencyRef.current = null;
      setSpinRequesting(false);
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

    try {
      const res = await fetch("/api/roulette/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bets: betPayload,
          idempotencyKey: spinIdempotencyRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al girar.");

      saveSpinRecovery({
        balanceAfter: data.balanceAfter,
        winningNumber: data.winningNumber,
        anyWon: data.anyWon,
        totalPayout: data.totalPayout,
      });

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
      spinLockedRef.current = false;
      setSpinRequesting(false);
      showError(
        e instanceof Error
          ? e.message
          : "Error al girar. Si se descontó saldo, actualiza la página.",
        true
      );
      void fetch("/api/roulette/status")
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.balance === "number") setBalance(d.balance);
        })
        .catch(() => {});
    }
  }

  return (
    <div className={cn("roulette-screen", spinView && "roulette-screen--focus")}>
      <BrandHeader balance={balance} title="Ruleta" backHref="/jugar" />

      {!active && (
        <p className="roulette-disabled-banner">
          {closedReason ?? "La Ruleta está desactivada por el administrador."}
        </p>
      )}

      {promoBanner && active && !spinView && (
        <p className="roulette-promo-banner">{promoBanner}</p>
      )}

      {active && !spinView && (
        <p className="roulette-fair-play">
          Ruleta europea (0–36) · cierre diario{" "}
          {dailyHours?.closeLabel ?? "11:45 PM"} · juega con tu saldo (
          {formatMoney(balance)})
        </p>
      )}

      <div className="roulette-scroll" ref={scrollRef}>
        {spinView && (
        <section
          className="roulette-hero roulette-hero--focus"
          ref={heroRef}
          aria-live="polite"
        >
          <RouletteWheel
            spinning={spinning}
            targetNumber={targetNumber}
            onSpinEnd={onSpinEnd}
          />

          {spinning && !targetNumber && (
            <p className="roulette-spin-status">Preparando giro…</p>
          )}

          {spinning && targetNumber !== null && (
            <p className="roulette-spin-status">Girando…</p>
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

          {showingResult && (
            <p className="roulette-spin-done-hint">Elige tus próximas jugadas en un momento…</p>
          )}
        </section>
        )}

        {!spinView && !active && (
          <section className="roulette-closed-card">
            <p className="roulette-closed-title">Ruleta no disponible</p>
            <p className="roulette-closed-text">
              {closedReason ??
                "La ruleta está cerrada en este momento. Vuelve dentro del horario de juego."}
            </p>
            {dailyHours && (
              <p className="roulette-closed-hint">
                Horario de juego diario: {dailyHours.openTime} –{" "}
                {dailyHours.closeLabel}
              </p>
            )}
          </section>
        )}

        {!spinView && active && (
        <section className="roulette-bets roulette-bets--enter">
          <div className="roulette-amount-panel">
            <p className="roulette-section-label">Monto por apuesta</p>
            <p className="roulette-amount-hint">
              Hasta {formatMoney(5)} por casilla. Puedes combinar varias en un mismo giro
              (ej.: número 7 con $3 y rojo con $2).
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

          {selectedBets.length > 0 && totalStake > balance && (
            <p className="roulette-balance-warning" role="alert">
              Saldo insuficiente. Necesitas {formatMoney(totalStake - balance)}{" "}
              más.
            </p>
          )}

          {selectedBets.length > 0 && !betsValid && error && (
            <p className="roulette-balance-warning" role="alert">
              {error}
            </p>
          )}

          <div className="roulette-actions">
            <button
              type="button"
              className="roulette-repeat-btn"
              disabled={
                spinning || spinRequesting || lastPlayedBets.length === 0
              }
              onClick={repeatLastBets}
            >
              Repetir jugada
            </button>
            <button
              type="button"
              className="roulette-spin-btn"
              disabled={!canSpin()}
              onClick={requestSpin}
            >
              {spinning || spinRequesting
                ? "Girando…"
                : selectedBets.length > 0
                  ? `Girar · ${formatMoney(totalStake)}`
                  : "Girar"}
            </button>
          </div>

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

        {!spinView && (
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

        {!spinView && rewards.length > 0 && (
        <section className="roulette-history roulette-rewards-list">
          <p className="roulette-section-label">
            Premios recibidos · Total {formatMoney(totalReceived)}
          </p>
          <ul className="roulette-rewards-items">
            {rewards.map((r) => (
              <li key={r.id} className="roulette-reward-item">
                <span className="roulette-reward-type">
                  {REWARD_TYPE_LABELS[r.rewardType] ?? r.rewardType}
                </span>
                <span className="roulette-reward-amount">
                  +{formatMoney(r.amount)}
                </span>
                <span className="roulette-reward-reason">{r.reason}</span>
              </li>
            ))}
          </ul>
          <p className="roulette-reward-note">
            Los premios salen del pozo promocional, no alteran el resultado de la
            ruleta.
          </p>
        </section>
        )}
      </div>

      <RouletteConfirmModal
        open={confirmOpen}
        bets={selectedBets}
        totalStake={totalStake}
        balanceBefore={balance}
        loading={spinRequesting}
        onConfirm={() => void executeSpin()}
        onClose={() => setConfirmOpen(false)}
      />

      {error && (
        <div className="play-toast play-toast--error" role="alert">
          {error}
          {errorSticky && (
            <button
              type="button"
              className="play-toast-dismiss"
              onClick={() => {
                setError("");
                setErrorSticky(false);
              }}
            >
              Entendido
            </button>
          )}
        </div>
      )}
      {infoMessage && !error && (
        <div className="play-toast play-toast--info" role="status">
          {infoMessage}
        </div>
      )}
    </div>
  );
}
