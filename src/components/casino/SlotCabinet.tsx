"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils";

export function SlotHeader({
  name,
  tagline,
  balance,
  balanceNode,
  backHref = "/ruleta",
  className,
}: {
  name: string;
  tagline: string;
  balance?: number;
  balanceNode?: ReactNode;
  backHref?: string;
  className?: string;
}) {
  return (
    <header className={cn("slot-header", className)}>
      <Link href={backHref} className="slot-header-back">
        ← Casino
      </Link>
      <div className="slot-marquee">
        <div className="slot-marquee-lights" aria-hidden />
        <h1 className="slot-marquee-title">{name}</h1>
        <p className="slot-marquee-tagline">{tagline}</p>
      </div>
      <div className="slot-jackpot-display">
        <span className="slot-jackpot-label">Saldo</span>
        {balanceNode ?? (
          <strong className="slot-jackpot-value">
            {formatMoney(balance ?? 0)}
          </strong>
        )}
      </div>
    </header>
  );
}

export function SlotRuleBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("slot-rule-bar", className)} role="status">
      <span className="slot-rule-bar-glow" aria-hidden />
      {children}
    </div>
  );
}

export function SlotScreen({
  children,
  className,
  winFlash,
}: {
  children: ReactNode;
  className?: string;
  winFlash?: boolean;
}) {
  return (
    <div className={cn("slot-screen", winFlash && "slot-screen--win", className)}>
      <div className="slot-screen-bezel" aria-hidden />
      <div className="slot-screen-glass" aria-hidden />
      <div className="slot-screen-viewport">{children}</div>
    </div>
  );
}

export function BetControls({
  bet,
  options,
  disabled,
  onSelect,
}: {
  bet: number;
  options: readonly number[];
  disabled?: boolean;
  onSelect: (amount: number) => void;
}) {
  return (
    <div className="slot-bet-controls">
      <span className="slot-bet-controls-label">APUESTA</span>
      <div className="slot-bet-controls-row">
        {options.map((amount) => (
          <button
            key={amount}
            type="button"
            className={cn("slot-bet-btn", bet === amount && "slot-bet-btn--active")}
            disabled={disabled}
            onClick={() => onSelect(amount)}
          >
            {formatMoney(amount)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SpinButton({
  label,
  spinning,
  disabled,
  onClick,
}: {
  label: string;
  spinning?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn("slot-spin-button", spinning && "slot-spin-button--spinning")}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="slot-spin-button-outer" aria-hidden />
      <span className="slot-spin-button-inner" aria-hidden />
      <span className="slot-spin-button-label">{label}</span>
    </button>
  );
}

export function SlotCabinet({
  themeClass,
  winFlash,
  children,
  className,
}: {
  themeClass?: string;
  winFlash?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "slot-cabinet",
        themeClass,
        winFlash && "slot-cabinet--win",
        className
      )}
    >
      <div className="slot-cabinet-aura" aria-hidden />
      <div className="slot-cabinet-shell">
        <div className="slot-cabinet-edge slot-cabinet-edge--left" aria-hidden />
        <div className="slot-cabinet-edge slot-cabinet-edge--right" aria-hidden />
        {children}
        <div className="slot-cabinet-base" aria-hidden />
      </div>
    </div>
  );
}

export function SlotCabinetDeck({ children }: { children: ReactNode }) {
  return <footer className="slot-cabinet-deck">{children}</footer>;
}

export function SlotCabinetBody({ children }: { children: ReactNode }) {
  return <div className="slot-cabinet-body">{children}</div>;
}
