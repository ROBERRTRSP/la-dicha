"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/player/BrandHeader";
import { DecorativeBanner } from "@/components/ui/DecorativeBanner";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";
import { CompactPlayPad } from "@/components/player/CompactPlayPad";
import { PlayBetsPanel } from "@/components/player/PlayBetsPanel";
import { LotteryStrip } from "@/components/player/LotteryStrip";
import { CasinoAccessStrip } from "@/components/player/CasinoAccessStrip";
import { ConfirmModal } from "@/components/player/ConfirmModal";
import { TicketSuccess } from "@/components/player/TicketSuccess";
import {
  detectBetType,
  formatNumbers,
  validateDigits,
} from "@/lib/bet-parser";
import { formatMoney } from "@/lib/utils";
import type { OpenDrawView } from "@/lib/draws";
import { generateId } from "@/lib/generate-id";
import { REPEAT_CART_KEY } from "@/lib/ticket-cart";
import { BET_AMOUNT_MAX, BET_AMOUNT_MIN } from "@/lib/cart-limits";
import {
  findDuplicateInCart,
  sanitizeStoredCart,
  validateAndNormalizeCart,
  validateCartAgainstOpenDraws,
} from "@/lib/cart-validation";
import { cartLineTotal, type CartLine } from "@/lib/tickets";
import type { OpenSuperPaleView } from "@/lib/super-pale";
import { isSuperPaleId } from "@/lib/super-pale";
import { MAX_CART_LINES, MAX_CART_TOTAL } from "@/lib/cart-limits";

export function PlayClient({
  initialDraws,
  initialSuperPales = [],
  balance: initialBalance,
}: {
  initialDraws: OpenDrawView[];
  initialSuperPales?: OpenSuperPaleView[];
  balance: number;
}) {
  const [draws, setDraws] = useState(initialDraws);
  const [superPales, setSuperPales] = useState<OpenSuperPaleView[]>(
    initialSuperPales
  );
  const [balance, setBalance] = useState(initialBalance);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [digits, setDigits] = useState("");
  const [amount, setAmount] = useState(5);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState("");
  const [errorSticky, setErrorSticky] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectAllOpen, setSelectAllOpen] = useState(false);
  const [duplicatePending, setDuplicatePending] = useState<CartLine | null>(
    null
  );
  const [addedFlash, setAddedFlash] = useState("");
  const [repeatCartLoaded, setRepeatCartLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [betsExpanded, setBetsExpanded] = useState(false);
  const [success, setSuccess] = useState<{
    ticket: {
      id: string;
      ticketNumber: string;
      verificationCode: string;
      totalAmount: number;
      balanceBefore?: number;
      balanceAfter: number;
      createdAt: string;
      items: {
        betType: string;
        numbers: string;
        lotteryName: string;
        amount: number;
        drawTime?: string;
        drawDate?: string;
      }[];
    };
    qrDataUrl: string;
  } | null>(null);

  const refreshDraws = useCallback(async () => {
    try {
      const res = await fetch("/api/draws");
      if (res.ok) {
        const data = await res.json();
        const nextDraws: OpenDrawView[] = data.draws ?? [];
        setDraws(nextDraws);
        setSuperPales(data.superPales ?? []);
        setSelected((prev) => {
          const openDrawIds = new Set(nextDraws.map((d) => d.id));
          const openSuperIds = new Set(
            (data.superPales ?? []).map((s: OpenSuperPaleView) => s.id)
          );
          return new Set(
            [...prev].filter(
              (id) =>
                openDrawIds.has(id) ||
                (isSuperPaleId(id) && openSuperIds.has(id))
            )
          );
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshDraws();
    const t = setInterval(refreshDraws, 15000);
    return () => clearInterval(t);
  }, [refreshDraws]);

  function showError(message: string, sticky = false) {
    setError(message);
    setErrorSticky(sticky);
  }

  useEffect(() => {
    if (!error || errorSticky) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error, errorSticky]);

  useEffect(() => {
    if (repeatCartLoaded) return;
    const raw = sessionStorage.getItem(REPEAT_CART_KEY);
    if (!raw) {
      setRepeatCartLoaded(true);
      return;
    }
    sessionStorage.removeItem(REPEAT_CART_KEY);

    (async () => {
      let latestDraws = initialDraws;
      let latestSuperPales: OpenSuperPaleView[] = [];
      try {
        const res = await fetch("/api/draws");
        if (res.ok) {
          const data = await res.json();
          latestDraws = data.draws ?? initialDraws;
          latestSuperPales = data.superPales ?? [];
          setDraws(latestDraws);
          setSuperPales(latestSuperPales);
        }
      } catch {
        /* usar sorteos iniciales */
      }

      try {
        const parsed = JSON.parse(raw) as unknown;
        const { lines, warning } = sanitizeStoredCart(
          parsed,
          latestDraws,
          latestSuperPales
        );
        if (lines.length) setCart(lines);
        if (warning) showError(warning, true);
        else if (!lines.length) {
          showError(
            "No se pudo cargar la jugada repetida. Las loterías pueden haber cerrado.",
            true
          );
        }
      } catch {
        showError("No se pudo cargar la jugada repetida.", true);
      } finally {
        setRepeatCartLoaded(true);
      }
    })();
  }, [initialDraws, repeatCartLoaded]);

  const total = useMemo(
    () => cart.reduce((s, l) => s + cartLineTotal(l), 0),
    [cart]
  );

  const cartLotteryUnits = useMemo(
    () => cart.reduce((s, l) => s + l.drawIds.length, 0),
    [cart]
  );

  useEffect(() => {
    if (digits.length > 0) setBetsExpanded(false);
  }, [digits]);

  useEffect(() => {
    if (cart.length === 0) setBetsExpanded(false);
  }, [cart.length]);

  const openSuperPales = superPales;

  const openDrawIds = useMemo(() => draws.map((d) => d.id), [draws]);

  const allSelectableIds = useMemo(() => openDrawIds, [openDrawIds]);

  function flashAdded(line: CartLine) {
    const lineTotal = cartLineTotal(line);
    const units =
      line.betType === "SUPER_PALE" || line.superPaleCode
        ? 1
        : line.drawIds.length;
    const detail =
      units > 1
        ? ` · ${formatMoney(line.amount)} × ${units} loterías`
        : "";
    setAddedFlash(`Agregado ${formatMoney(lineTotal)}${detail}`);
    setTimeout(() => setAddedFlash(""), 2800);
  }

  function handleSelectAll() {
    if (draws.length > 3) {
      setSelectAllOpen(true);
      return;
    }
    setSelected(new Set(allSelectableIds));
  }

  function applySelectAll() {
    setSelected(new Set(allSelectableIds));
    setSelectAllOpen(false);
  }

  function toggleDraw(id: string) {
    setSelected((prev) => {
      if (isSuperPaleId(id)) {
        if (prev.has(id)) {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }
        return new Set([id]);
      }

      const next = new Set(prev);
      for (const key of [...next]) {
        if (isSuperPaleId(key)) next.delete(key);
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function appendDigit(d: string) {
    if (error && !errorSticky) setError("");
    if (digits.length >= 6) {
      showError("Máximo 6 dígitos.");
      return;
    }
    setDigits((prev) => prev + d);
  }

  function appendDoubleZero() {
    if (error && !errorSticky) setError("");
    if (digits.length > 4) {
      showError("Máximo 6 dígitos.");
      return;
    }
    setDigits((prev) => prev + "00");
  }

  function validateAmount(): string | null {
    if (!Number.isFinite(amount) || amount < BET_AMOUNT_MIN) {
      return `El monto mínimo es ${formatMoney(BET_AMOUNT_MIN)}.`;
    }
    if (amount > BET_AMOUNT_MAX) {
      return `El monto máximo es ${formatMoney(BET_AMOUNT_MAX)}.`;
    }
    return null;
  }

  function buildPendingLine(): CartLine | null {
    const digitErr = validateDigits(digits);
    if (digitErr) {
      showError(digitErr);
      return null;
    }
    if (selected.size === 0) {
      showError("Selecciona al menos una lotería abierta.");
      return null;
    }
    const amountErr = validateAmount();
    if (amountErr) {
      showError(amountErr);
      return null;
    }

    const selectedSuper = [...selected].filter(isSuperPaleId);
    if (selectedSuper.length > 0) {
      if (selectedSuper.length > 1) {
        showError("Selecciona solo un Súper Palé a la vez.");
        return null;
      }
      if (digits.length !== 4) {
        showError("Súper Palé: juega 4 dígitos (2 números).");
        return null;
      }
      const sp = openSuperPales.find((s) => s.id === selectedSuper[0]);
      if (!sp) {
        showError("Ese Súper Palé ya no está abierto.");
        return null;
      }
      return {
        id: generateId(),
        betType: "SUPER_PALE",
        digits,
        numbers: formatNumbers(digits, "SUPER_PALE"),
        amount,
        drawIds: [sp.drawIdA, sp.drawIdB],
        lotteryNames: [sp.lotteryNameA, sp.lotteryNameB],
        superPaleCode: sp.code,
        superPaleName: sp.name,
        addedAt: Date.now(),
      };
    }

    const type = detectBetType(digits)!;
    const selectedDraws = draws.filter((d) => selected.has(d.id));
    if (selectedDraws.length === 0) {
      showError("Selecciona al menos una lotería abierta.");
      return null;
    }

    return {
      id: generateId(),
      betType: type,
      digits,
      numbers: formatNumbers(digits, type),
      amount,
      drawIds: selectedDraws.map((d) => d.id),
      lotteryNames: selectedDraws.map((d) => d.lotteryName),
      addedAt: Date.now(),
    };
  }

  function commitLine(line: CartLine, clearSuperSelection = false) {
    const nextTotal =
      cart.reduce((s, l) => s + cartLineTotal(l), 0) + cartLineTotal(line);
    if (cart.length >= MAX_CART_LINES) {
      showError(`Máximo ${MAX_CART_LINES} jugadas por ticket.`);
      return;
    }
    if (nextTotal > MAX_CART_TOTAL) {
      showError(`El total no puede superar ${formatMoney(MAX_CART_TOTAL)}.`);
      return;
    }
    setCart((prev) => [...prev, line]);
    setDigits("");
    if (clearSuperSelection) setSelected(new Set());
    flashAdded(line);
  }

  function addToCart() {
    if (error && !errorSticky) setError("");
    const line = buildPendingLine();
    if (!line) return;

    if (findDuplicateInCart(cart, line)) {
      setDuplicatePending(line);
      return;
    }

    commitLine(line, !!line.superPaleCode);
  }

  function confirmDuplicateAdd() {
    if (!duplicatePending) return;
    commitLine(duplicatePending, !!duplicatePending.superPaleCode);
    setDuplicatePending(null);
  }

  async function openConfirm() {
    setError("");
    setErrorSticky(false);

    let latestDraws = draws;
    let latestSuperPales = superPales;
    try {
      const res = await fetch("/api/draws");
      if (res.ok) {
        const data = await res.json();
        latestDraws = data.draws ?? draws;
        latestSuperPales = data.superPales ?? superPales;
        setDraws(latestDraws);
        setSuperPales(latestSuperPales);
      }
    } catch {
      /* usar sorteos en memoria */
    }

    try {
      validateAndNormalizeCart(cart);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Carrito inválido.", true);
      return;
    }

    const cartErr = validateCartAgainstOpenDraws(
      cart,
      latestDraws,
      latestSuperPales
    );
    if (cartErr) {
      showError(cartErr, true);
      return;
    }

    const serverTotal = cart.reduce((s, l) => s + cartLineTotal(l), 0);
    if (serverTotal > balance) {
      showError("Saldo insuficiente. Contacta a tu cajero para recargar.", true);
      return;
    }

    setConfirmOpen(true);
  }

  async function confirmSale() {
    setLoading(true);
    setError("");
    setErrorSticky(false);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: cart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al confirmar.");
      setBalance(data.ticket.balanceAfter);
      setSuccess({ ticket: data.ticket, qrDataUrl: data.qrDataUrl });
      setCart([]);
      setConfirmOpen(false);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al confirmar.", true);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <TicketSuccess
        ticket={success.ticket}
        qrDataUrl={success.qrDataUrl}
        onNewBet={() => setSuccess(null)}
      />
    );
  }

  return (
    <div
      className={`play-screen${cart.length > 0 ? " play-screen--has-cart" : ""}${betsExpanded ? " play-screen--bets-open" : ""}${digits.length > 0 ? " play-screen--entry" : ""}`}
    >
      <div className="play-screen-scroll">
        <BrandHeader balance={balance} compact />

        <DecorativeBanner
          src={ART.jugarBanner}
          className="play-visual-banner play-visual-banner--collapsible"
        />

        <LotteryStrip
          draws={draws}
          selected={selected}
          onToggle={toggleDraw}
          onSelectAll={handleSelectAll}
          onClear={() => setSelected(new Set())}
        />

        <CasinoAccessStrip />

        <CompactPlayPad
          digits={digits}
          amount={amount}
          onDigit={appendDigit}
          onDoubleZero={appendDoubleZero}
          onBackspace={() => setDigits((d) => d.slice(0, -1))}
          onClear={() => setDigits("")}
          onAdd={addToCart}
          onAmountChange={setAmount}
        />

        <div className="play-confirm-bar play-confirm-bar--inline">
          {cart.length === 0 && (
            <p className="play-footer-hint">
              1. Lotería · 2. Números y monto · 3. Agregar · 4. Confirmar
            </p>
          )}
          {cart.length > 0 && (
            <div className="play-footer-summary">
              <div className="play-footer-summary-main">
                <p className="play-footer-meta">
                  {cart.length} jugada{cart.length !== 1 ? "s" : ""}
                  {cartLotteryUnits > 0 &&
                    ` · ${cartLotteryUnits} lotería${cartLotteryUnits !== 1 ? "s" : ""}`}
                </p>
                <p className="play-footer-total">{formatMoney(total)}</p>
              </div>
              <div className="play-footer-balance">
                <span className="play-footer-meta">Saldo después</span>
                <span className="play-footer-balance-value">
                  {formatMoney(balance - total)}
                </span>
              </div>
            </div>
          )}
          {cart.length > 0 && total > balance && (
            <p className="play-balance-warning" role="alert">
              Saldo insuficiente. Necesitas {formatMoney(total - balance)} más.
            </p>
          )}
          <button
            type="button"
            className="play-confirm-full"
            disabled={cart.length === 0 || total > balance || loading}
            onClick={() => {
              if (cart.length === 0) {
                showError("Agrega una jugada antes de confirmar.");
                return;
              }
              void openConfirm();
            }}
          >
            <AiVisual
              src={ART.btnConfirmar}
              alt=""
              width={24}
              height={24}
              className="play-confirm-icon"
            />
            Confirmar jugada
          </button>
        </div>
      </div>

      <div className="play-bottom-dock">
        <PlayBetsPanel
          lines={cart}
          total={total}
          expanded={betsExpanded}
          onToggleExpanded={() => setBetsExpanded((v) => !v)}
          onRemove={(id) => setCart((c) => c.filter((l) => l.id !== id))}
        />
      </div>

      {addedFlash && (
        <div className="play-added-toast" role="status">
          {addedFlash}
        </div>
      )}

      {error && (
        <div className="play-toast" role="alert">
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

      <ConfirmModal
        open={confirmOpen}
        lines={cart}
        total={total}
        balanceBefore={balance}
        balanceAfter={balance - total}
        loading={loading}
        onConfirm={confirmSale}
        onClose={() => setConfirmOpen(false)}
      />

      {duplicatePending && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-title"
        >
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6">
            <h2
              id="duplicate-title"
              className="text-lg font-bold text-[#1e3a5f] mb-2"
            >
              Esta jugada ya está en el ticket
            </h2>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Mismos números, loterías y monto (
              <strong>{duplicatePending.numbers}</strong> ·{" "}
              {formatMoney(cartLineTotal(duplicatePending))}). ¿Quieres
              agregarla otra vez?
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                className="play-action-primary min-h-[48px]"
                onClick={confirmDuplicateAdd}
              >
                Agregar de todos modos
              </button>
              <button
                type="button"
                className="play-action-secondary min-h-[48px]"
                onClick={() => setDuplicatePending(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {selectAllOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="select-all-title"
        >
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6">
            <h2 id="select-all-title" className="text-lg font-bold text-[#1e3a5f] mb-2">
              ¿Seleccionar todas las loterías?
            </h2>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Vas a seleccionar{" "}
              <strong>
                {draws.length} lotería{draws.length !== 1 ? "s" : ""}
                {openSuperPales.length > 0
                  ? ` y ${openSuperPales.length} súper palé${openSuperPales.length !== 1 ? "s" : ""}`
                  : ""}
              </strong>
              . Cada jugada normal cobrará el monto elegido{" "}
              <strong>en cada lotería marcada</strong>. Ejemplo: {formatMoney(5)} en 8
              loterías = {formatMoney(40)} por jugada.
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                className="play-action-primary min-h-[48px]"
                onClick={applySelectAll}
              >
                Sí, seleccionar todas
              </button>
              <button
                type="button"
                className="play-action-secondary min-h-[48px]"
                onClick={() => setSelectAllOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
