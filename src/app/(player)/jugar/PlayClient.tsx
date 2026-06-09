"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandHeader } from "@/components/player/BrandHeader";
import { DecorativeBanner } from "@/components/ui/DecorativeBanner";
import { AiVisual } from "@/components/ui/AiVisual";
import { ART } from "@/lib/visual-assets";
import { CompactPlayPad } from "@/components/player/CompactPlayPad";
import { PlayBetsPanel } from "@/components/player/PlayBetsPanel";
import { LotteryStrip } from "@/components/player/LotteryStrip";
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
import type { CartLine } from "@/lib/tickets";

export function PlayClient({
  initialDraws,
  balance: initialBalance,
}: {
  initialDraws: OpenDrawView[];
  balance: number;
}) {
  const [draws, setDraws] = useState(initialDraws);
  const [balance, setBalance] = useState(initialBalance);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [digits, setDigits] = useState("");
  const [amount, setAmount] = useState(5);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addedFlash, setAddedFlash] = useState(false);
  const [loading, setLoading] = useState(false);
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
        setSelected((prev) => {
          const openIds = new Set(nextDraws.map((d) => d.id));
          return new Set([...prev].filter((id) => openIds.has(id)));
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

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    const raw = sessionStorage.getItem(REPEAT_CART_KEY);
    if (!raw) return;
    sessionStorage.removeItem(REPEAT_CART_KEY);
    try {
      const lines = JSON.parse(raw) as CartLine[];
      if (!lines.length) return;
      setCart(lines);
      setSelected(new Set(lines.flatMap((l) => l.drawIds)));
    } catch {
      /* ignore */
    }
  }, []);

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.amount * l.drawIds.length, 0),
    [cart]
  );

  const openDrawIds = useMemo(() => draws.map((d) => d.id), [draws]);

  function toggleDraw(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function appendDigit(d: string) {
    setError("");
    if (digits.length >= 6) {
      setError("Máximo 6 dígitos.");
      return;
    }
    setDigits((prev) => prev + d);
  }

  function appendDoubleZero() {
    setError("");
    if (digits.length > 4) {
      setError("Máximo 6 dígitos.");
      return;
    }
    setDigits((prev) => prev + "00");
  }

  function addToCart() {
    setError("");
    const digitErr = validateDigits(digits);
    if (digitErr) {
      setError(digitErr);
      return;
    }
    if (selected.size === 0) {
      setError("Selecciona al menos una lotería abierta.");
      return;
    }
    if (amount <= 0) {
      setError("Selecciona un monto válido.");
      return;
    }

    const type = detectBetType(digits)!;
    const selectedDraws = draws.filter((d) => selected.has(d.id));
    const line: CartLine = {
      id: generateId(),
      betType: type,
      digits,
      numbers: formatNumbers(digits, type),
      amount,
      drawIds: selectedDraws.map((d) => d.id),
      lotteryNames: selectedDraws.map((d) => d.lotteryName),
      addedAt: Date.now(),
    };

    setCart((prev) => [...prev, line]);
    setDigits("");
    setAddedFlash(true);
    setTimeout(() => setAddedFlash(false), 2000);
  }

  async function confirmSale() {
    setLoading(true);
    setError("");
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
      setError(e instanceof Error ? e.message : "Error al confirmar.");
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
    <div className="play-screen">
      <BrandHeader balance={balance} compact />

      <DecorativeBanner src={ART.jugarBanner} className="play-visual-banner" />

      <LotteryStrip
        draws={draws}
        selected={selected}
        onToggle={toggleDraw}
        onSelectAll={() => setSelected(new Set(openDrawIds))}
        onClear={() => setSelected(new Set())}
      />

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

      <PlayBetsPanel
        lines={cart}
        onRemove={(id) => setCart((c) => c.filter((l) => l.id !== id))}
      />

      <div className="play-confirm-bar">
        {cart.length > 0 && (
          <div className="play-footer-summary">
            <div>
              <p className="text-[10px] text-slate-400">
                {cart.length} jugada{cart.length !== 1 ? "s" : ""} · Total
              </p>
              <p className="text-lg font-bold text-[#c9a227] leading-tight">
                {formatMoney(total)}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 text-right">
              Saldo después
              <br />
              <span className="font-semibold text-[#0d9488]">
                {formatMoney(balance - total)}
              </span>
            </p>
          </div>
        )}
        <button
          type="button"
          className="play-confirm-full"
          disabled={cart.length === 0 || total > balance}
          onClick={() => {
            if (cart.length === 0) {
              setError("Agrega una jugada antes de confirmar.");
              return;
            }
            if (total > balance) {
              setError("Saldo insuficiente. Contacta a tu cajero.");
              return;
            }
            setConfirmOpen(true);
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

      {addedFlash && (
        <div className="play-added-toast">Jugada agregada</div>
      )}

      {error && <div className="play-toast">{error}</div>}

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
    </div>
  );
}
