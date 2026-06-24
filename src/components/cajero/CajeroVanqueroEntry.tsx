"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn, formatMoney } from "@/lib/utils";
import type { CajeroNumpadMode } from "@/lib/cajero-numpad";
import { ART } from "@/lib/visual-assets";
import {
  CajeroPlayLimitPanel,
  type PlayLimitPanelState,
} from "@/components/cajero/CajeroPlayLimitPanel";

export function CajeroVanqueroEntry({
  jugadaInput,
  pendingCount,
  inputMode,
  amountDraft,
  sessionId,
  cartTotal,
  cartCount,
  dayPlays,
  daySales,
  bancaBalance,
  bancaName,
  multiLot,
  onToggleMultiLot,
  captureRef,
  onCaptureClick,
  customerName,
  onCustomerNameChange,
  customerInputRef,
  limitPanel,
  entryBlocked = false,
  onFocusJugada,
  onFocusAmount,
  afterClock,
}: {
  jugadaInput: string;
  pendingCount: number;
  inputMode: CajeroNumpadMode;
  amountDraft: string;
  sessionId: string;
  cartTotal: number;
  cartCount: number;
  dayPlays: number;
  daySales: number;
  bancaBalance?: number | null;
  bancaName?: string;
  multiLot: boolean;
  onToggleMultiLot: () => void;
  captureRef: React.RefObject<HTMLInputElement | null>;
  onCaptureClick: () => void;
  customerName: string;
  onCustomerNameChange: (v: string) => void;
  customerInputRef: React.RefObject<HTMLInputElement | null>;
  limitPanel?: PlayLimitPanelState;
  entryBlocked?: boolean;
  onFocusJugada?: () => void;
  onFocusAmount?: () => void;
  afterClock?: React.ReactNode;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const dateStr = now.toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const displayJugada =
    jugadaInput ||
    (pendingCount > 0 ? `${pendingCount} comb.` : "N/A");

  const displayMonto = amountDraft;

  return (
    <header className="cajero-vq-header">
      <div className="cajero-vq-clock">
        <div className="cajero-vq-brand">
          <Image
            src={ART.logo}
            alt="La Dicha"
            width={28}
            height={28}
            className="cajero-vq-brand-logo"
          />
          <span className="cajero-vq-brand-name">La Dicha</span>
        </div>
        <span className="cajero-vq-clock-time">{timeStr}</span>
        <span className="cajero-vq-clock-sep">|</span>
        <span className="cajero-vq-clock-date">{dateStr}</span>
        <Link href="/cajero" className="cajero-vq-back">
          Panel
        </Link>
      </div>

      {afterClock}

      <div className="cajero-vq-stats">
        <div className="cajero-vq-stat">
          <span className="cajero-vq-stat-label">Jugadas del día</span>
          <strong>{dayPlays}</strong>
        </div>
        <div className="cajero-vq-stat">
          <span className="cajero-vq-stat-label">Ventas del día</span>
          <strong>{formatMoney(daySales)}</strong>
        </div>
        {bancaBalance !== null && bancaBalance !== undefined && (
          <div className="cajero-vq-stat cajero-vq-stat--banca">
            <span className="cajero-vq-stat-label">
              Balance {bancaName ?? "banca"}
            </span>
            <strong>{formatMoney(bancaBalance)}</strong>
          </div>
        )}
        <button
          type="button"
          className={cn("cajero-vq-mult", multiLot && "active")}
          onClick={onToggleMultiLot}
        >
          {multiLot ? "Mult. lot" : "1 lotería"}
        </button>
        <label className="cajero-vq-cliente">
          <span>Cliente</span>
          <input
            ref={customerInputRef}
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            onBlur={onCaptureClick}
            placeholder="Opcional"
          />
        </label>
      </div>

      <input
        ref={captureRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        data-cajero-numpad="capture"
        className="cajero-numpad-capture"
        aria-label="Entrada teclado numérico"
        readOnly
        tabIndex={0}
      />

      <div className="cajero-vq-entry-wrap">
        <div className="cajero-vq-entry" role="presentation">
          <div
            className={cn(
              "cajero-vq-field",
              inputMode === "numbers" && "cajero-vq-field--active",
              entryBlocked && "cajero-vq-field--blocked"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onFocusJugada?.();
              onCaptureClick();
            }}
            role="button"
            tabIndex={-1}
          >
            <span className="cajero-vq-field-label">Jugada</span>
            <span className="cajero-vq-field-value">{displayJugada}</span>
          </div>
          <div
            className={cn(
              "cajero-vq-field",
              inputMode === "amount" && "cajero-vq-field--active",
              entryBlocked && "cajero-vq-field--blocked"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onFocusAmount?.();
              onCaptureClick();
            }}
            role="button"
            tabIndex={-1}
          >
            <span className="cajero-vq-field-label">Monto</span>
            <span
              className={cn(
                "cajero-vq-field-value cajero-vq-field-value--monto",
                entryBlocked && "cajero-vq-field-value--blocked"
              )}
            >
              {displayMonto || "\u00A0"}
            </span>
          </div>
        </div>
        <CajeroPlayLimitPanel
          state={
            limitPanel ?? {
              visible: false,
              items: [],
            }
          }
        />
      </div>

      <div className="cajero-vq-ticket-bar">
        <span className="cajero-vq-session">
          {sessionId} - {formatMoney(cartTotal)}
        </span>
        <span className="cajero-vq-summary">
          Jugadas: <strong>{cartCount}</strong>
        </span>
        <span className="cajero-vq-summary">
          Total: <strong>{formatMoney(cartTotal)}</strong>
        </span>
      </div>
    </header>
  );
}
