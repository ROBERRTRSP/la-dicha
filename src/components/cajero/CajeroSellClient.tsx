"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { cartLineTotal, type CartLine } from "@/lib/tickets";
import { getOpenSuperPales, isSuperPaleId } from "@/lib/super-pale";

export function CajeroSellClient({
  initialDraws,
}: {
  initialDraws: OpenDrawView[];
}) {
  const [draws, setDraws] = useState(initialDraws);
  const [customerName, setCustomerName] = useState("");
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
      customerName?: string | null;
      createdAt: string;
      items: {
        betType: string;
        numbers: string;
        lotteryName: string;
        amount: number;
        drawTime?: string;
        drawDate?: string;
        superPaleName?: string | null;
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
          const openDrawIds = new Set(nextDraws.map((d) => d.id));
          const openSuperIds = new Set(
            getOpenSuperPales(nextDraws).map((s) => s.id)
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

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const total = useMemo(
    () => cart.reduce((s, l) => s + cartLineTotal(l), 0),
    [cart]
  );

  const openSuperPales = useMemo(() => getOpenSuperPales(draws), [draws]);
  const allSelectableIds = useMemo(
    () => [...draws.map((d) => d.id), ...openSuperPales.map((s) => s.id)],
    [draws, openSuperPales]
  );

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

    const selectedSuper = [...selected].filter(isSuperPaleId);
    if (selectedSuper.length > 0) {
      if (selectedSuper.length > 1) {
        setError("Selecciona solo un Súper Palé a la vez.");
        return;
      }
      if (digits.length !== 4) {
        setError("Súper Palé: juega 4 dígitos (2 números).");
        return;
      }
      const sp = openSuperPales.find((s) => s.id === selectedSuper[0]);
      if (!sp) {
        setError("Ese Súper Palé ya no está abierto.");
        return;
      }
      const line: CartLine = {
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
      setCart((prev) => [...prev, line]);
      setDigits("");
      setSelected(new Set());
      setAddedFlash(true);
      setTimeout(() => setAddedFlash(false), 2000);
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
      const res = await fetch("/api/cajero/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: cart, customerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al vender.");
      setSuccess({ ticket: data.ticket, qrDataUrl: data.qrDataUrl });
      setCart([]);
      setConfirmOpen(false);
      setDigits("");
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al vender.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <TicketSuccess
        ticket={{
          ...success.ticket,
          balanceBefore: 0,
          balanceAfter: 0,
        }}
        qrDataUrl={success.qrDataUrl}
        onNewBet={() => {
          setSuccess(null);
          setCustomerName("");
        }}
        cashSale
        newBetLabel="Nueva venta"
      />
    );
  }

  return (
    <div className="cajero-sell">
      <div className="cajero-sell-head">
        <div>
          <h1 className="admin-page-title">Vender números</h1>
          <p className="cajero-sell-sub">
            Vanquero · cobra en efectivo y entrega el ticket al cliente
          </p>
        </div>
        <Link href="/cajero" className="cajero-sell-back">
          ← Panel
        </Link>
      </div>

      <label className="cajero-sell-customer admin-field admin-field--full">
        <span>Cliente (opcional)</span>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nombre del cliente"
        />
      </label>

      <div className="cajero-sell-play">
        <LotteryStrip
          draws={draws}
          selected={selected}
          onToggle={toggleDraw}
          onSelectAll={() => setSelected(new Set(allSelectableIds))}
          onClear={() => setSelected(new Set())}
        />

        <CompactPlayPad
          digits={digits}
          amount={amount}
          onDigit={(d) => {
            setError("");
            if (digits.length >= 6) {
              setError("Máximo 6 dígitos.");
              return;
            }
            setDigits((prev) => prev + d);
          }}
          onDoubleZero={() => {
            setError("");
            if (digits.length > 4) {
              setError("Máximo 6 dígitos.");
              return;
            }
            setDigits((prev) => prev + "00");
          }}
          onBackspace={() => setDigits((d) => d.slice(0, -1))}
          onClear={() => setDigits("")}
          onAdd={addToCart}
          onAmountChange={setAmount}
        />

        <PlayBetsPanel
          lines={cart}
          onRemove={(id) => setCart((c) => c.filter((l) => l.id !== id))}
        />
      </div>

      <div className="cajero-sell-bar">
        {cart.length > 0 && (
          <p className="cajero-sell-total">
            Total a cobrar: <strong>{formatMoney(total)}</strong>
          </p>
        )}
        <button
          type="button"
          className="admin-save-btn cajero-sell-btn"
          disabled={cart.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          Cobrar y imprimir ticket
        </button>
      </div>

      {addedFlash && (
        <div className="cajero-sell-toast">Jugada agregada</div>
      )}
      {error && <div className="cajero-sell-error">{error}</div>}

      <ConfirmModal
        open={confirmOpen}
        lines={cart}
        total={total}
        balanceBefore={0}
        balanceAfter={0}
        loading={loading}
        onConfirm={confirmSale}
        onClose={() => setConfirmOpen(false)}
        cashSale
        customerName={customerName}
      />
    </div>
  );
}
