"use client";

import { formatMoney } from "@/lib/utils";
import {
  formatAmountExceedsLimitMessage,
  type PlayLimitInfo,
} from "@/lib/play-limits";
import { cn } from "@/lib/utils";

export type PlayLimitPanelState = {
  visible: boolean;
  loading?: boolean;
  waitingForNumber?: boolean;
  waitingForAmount?: boolean;
  number?: string;
  playTypeLabel?: string;
  amount?: number;
  items: PlayLimitInfo[];
  canPlay?: boolean;
  blockMessage?: string;
};

function panelStatus(
  item: PlayLimitInfo,
  amount: number
): "normal" | "warning" | "error" {
  if (amount > 0 && amount > item.available) return "error";
  if (item.available <= item.limit * 0.25) return "warning";
  return "normal";
}

function resolveStatus(
  items: PlayLimitInfo[],
  amount: number
): "normal" | "warning" | "error" {
  if (amount > 0 && items.some((i) => amount > i.available)) return "error";
  if (items.some((i) => i.available <= i.limit * 0.25)) return "warning";
  return "normal";
}

function resolveBlockMessage(
  items: PlayLimitInfo[],
  amount: number,
  fallback?: string
): string | undefined {
  if (amount <= 0) return undefined;
  const blocked = items.find((i) => amount > i.available);
  if (!blocked) return fallback;
  if (blocked.message) return blocked.message;
  return formatAmountExceedsLimitMessage(
    blocked.number,
    blocked.available,
    amount
  );
}

export function CajeroPlayLimitPanel({ state }: { state: PlayLimitPanelState }) {
  if (state.waitingForNumber && (state.amount ?? 0) > 0) {
    return (
      <div className="cajero-play-limit cajero-play-limit--waiting" aria-live="polite">
        <span className="cajero-play-limit-title">Límite del número</span>
        <p className="cajero-play-limit-hint">
          Monto: <strong>{formatMoney(state.amount ?? 0)}</strong> — escriba el
          número para validar
        </p>
      </div>
    );
  }

  if (!state.visible || state.items.length === 0) {
    return (
      <div className="cajero-play-limit cajero-play-limit--empty" aria-hidden>
        <span className="cajero-play-limit-title">Límite del número</span>
        <p className="cajero-play-limit-hint">
          {state.waitingForAmount
            ? "Escriba un monto para validar."
            : "Escriba número y monto para ver disponibilidad"}
        </p>
      </div>
    );
  }

  const amount = state.amount ?? 0;
  const primary = state.items[0];
  const status = resolveStatus(state.items, amount);
  const multi = state.items.length > 1;
  const blockMsg = resolveBlockMessage(
    state.items,
    amount,
    state.blockMessage
  );

  return (
    <div
      className={cn(
        "cajero-play-limit",
        state.loading && "cajero-play-limit--loading",
        `cajero-play-limit--${status}`,
        amount > 0 && state.canPlay === false && "cajero-play-limit--blocked"
      )}
      aria-live="polite"
    >
      <div className="cajero-play-limit-head">
        <span className="cajero-play-limit-title">Límite del número</span>
        {state.playTypeLabel && (
          <span className="cajero-play-limit-type">{state.playTypeLabel}</span>
        )}
      </div>

      {multi ? (
        <ul className="cajero-play-limit-multi">
          {state.items.map((item) => {
            const itemStatus = panelStatus(item, amount);
            return (
              <li
                key={`${item.lotteryId}-${item.number}-${item.playType}`}
                className={cn("cajero-play-limit-row", `is-${itemStatus}`)}
              >
                <span className="cajero-play-limit-lot">{item.lotteryName}</span>
                <span>Nº {item.number}</span>
                <span>Máx {formatMoney(item.limit)}</span>
                <span>Vend. {formatMoney(item.sold)}</span>
                <strong>Disp. {formatMoney(item.available)}</strong>
              </li>
            );
          })}
        </ul>
      ) : (
        <dl className="cajero-play-limit-grid">
          <div>
            <dt>Núm.</dt>
            <dd>{primary.number}</dd>
          </div>
          <div>
            <dt>Máximo</dt>
            <dd>{formatMoney(primary.limit)}</dd>
          </div>
          <div>
            <dt>Vendido</dt>
            <dd>{formatMoney(primary.sold)}</dd>
          </div>
          <div className="cajero-play-limit-available">
            <dt>Disponible</dt>
            <dd>{formatMoney(primary.available)}</dd>
          </div>
        </dl>
      )}

      {multi && (
        <p className="cajero-play-limit-lot-label">{state.items.length} loterías</p>
      )}

      {!multi && primary.lotteryName && (
        <p className="cajero-play-limit-lot-label">{primary.lotteryName}</p>
      )}

      {state.waitingForAmount && (
        <p className="cajero-play-limit-hint">Escriba un monto para validar.</p>
      )}

      {amount > 0 && state.canPlay === false && blockMsg && (
        <p className="cajero-play-limit-msg">{blockMsg}</p>
      )}
    </div>
  );
}
