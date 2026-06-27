"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils";

export function SlotHeader({
  name,
  tagline,
  logoSrc,
  balance,
  balanceNode,
  backHref = "/ruleta",
  className,
  showBalancePill,
}: {
  name: string;
  tagline: string;
  logoSrc?: string;
  balance?: number;
  balanceNode?: ReactNode;
  backHref?: string;
  className?: string;
  showBalancePill?: boolean;
}) {
  return (
    <header className={cn("slot-header", "slot-header--integrated", className)}>
      <div className="slot-header-toolbar">
        <Link href={backHref} className="slot-header-back" aria-label="Volver al casino">
          <span className="slot-header-back-chevron" aria-hidden>
            ←
          </span>
          <span className="slot-header-back-label">Casino</span>
        </Link>
        {showBalancePill && (
          <div className="slot-header-balance-pill">
            <span className="slot-header-balance-pill-label">Saldo</span>
            {balanceNode ?? (
              <strong className="slot-header-balance-pill-value">
                {formatMoney(balance ?? 0)}
              </strong>
            )}
          </div>
        )}
      </div>

      <div className="slot-header-banner">
        <div className="slot-header-banner-lights" aria-hidden />
        <div className="slot-header-banner-plate" aria-hidden />
        <div className="slot-header-banner-frame" aria-hidden />
        <div className="slot-header-banner-content">
          {logoSrc ? (
            <div className="slot-header-banner-art">
              <Image
                src={logoSrc}
                alt={name}
                fill
                priority
                sizes="(max-width: 520px) 94vw, 520px"
                className="slot-header-banner-image"
              />
              <div className="slot-header-banner-vignette" aria-hidden />
              <div className="slot-header-banner-shimmer" aria-hidden />
            </div>
          ) : (
            <h1 className="slot-marquee-title slot-header-banner-title">{name}</h1>
          )}
        </div>
        {tagline ? (
          <p className="slot-header-banner-tagline">{tagline}</p>
        ) : null}
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
  hideLabel,
  testIdPrefix,
}: {
  bet: number;
  options: readonly number[];
  disabled?: boolean;
  onSelect: (amount: number) => void;
  hideLabel?: boolean;
  testIdPrefix?: string;
}) {
  return (
    <div className="slot-bet-controls">
      {!hideLabel && (
        <span className="slot-bet-controls-label">APUESTA</span>
      )}
      <div className="slot-bet-controls-row">
        {options.map((amount) => (
          <button
            key={amount}
            type="button"
            className={cn("slot-bet-btn", bet === amount && "slot-bet-btn--active")}
            disabled={disabled}
            onClick={() => onSelect(amount)}
            data-testid={testIdPrefix ? `${testIdPrefix}-${amount}` : undefined}
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
  ready,
  disabled,
  onClick,
  "aria-busy": ariaBusy,
  testId,
}: {
  label: string;
  spinning?: boolean;
  ready?: boolean;
  disabled?: boolean;
  onClick: () => void;
  "aria-busy"?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "slot-spin-button",
        spinning && "slot-spin-button--spinning",
        ready && !spinning && "slot-spin-button--ready"
      )}
      disabled={disabled}
      aria-busy={ariaBusy}
      onClick={onClick}
      data-testid={testId}
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

export function SlotCabinetDeck({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <footer className={cn("slot-cabinet-deck", className)}>{children}</footer>
  );
}

export function SlotControlDeck({
  financeHud,
  navButtons,
  betControls,
  spinButton,
}: {
  financeHud?: ReactNode;
  navButtons?: ReactNode;
  betControls: ReactNode;
  spinButton: ReactNode;
}) {
  return (
    <div className="slot-control-deck">
      {financeHud}
      <div className="slot-control-deck-main">
        <div className="slot-control-deck-bets">{betControls}</div>
        <div className="slot-control-deck-spin">{spinButton}</div>
      </div>
      {navButtons ? (
        <div className="slot-control-deck-nav">{navButtons}</div>
      ) : null}
    </div>
  );
}

export function SlotCabinetBody({ children }: { children: ReactNode }) {
  return <div className="slot-cabinet-body">{children}</div>;
}
