"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  isCajeroVanqueroOverlayOpen,
  isCustomerTypingTarget,
  parseCajeroNumpadKey,
  type CajeroNumpadMode,
} from "@/lib/cajero-numpad";

export function useCajeroNumpad({
  enabled,
  confirmOpen,
  mode,
  jugadaBuffer,
  amountBuffer,
  onAppend,
  onBackspace,
  onArrowClear,
  onCancelTicket,
  onNextLottery,
  onPrevLottery,
  onEnterStep,
  onSellPrint,
  onDuplicateTicket,
  onMarkPaid,
  onConfirm,
  onCancelConfirm,
  customerInputRef,
}: {
  enabled: boolean;
  confirmOpen: boolean;
  mode: CajeroNumpadMode;
  jugadaBuffer: string;
  amountBuffer: string;
  onAppend: (ch: string) => void;
  onBackspace: () => void;
  onArrowClear: () => void;
  onCancelTicket: () => void;
  onNextLottery: () => void;
  onPrevLottery: () => void;
  onEnterStep: () => void;
  onSellPrint: () => void;
  onDuplicateTicket: () => void;
  onMarkPaid: () => void;
  onConfirm: () => void;
  onCancelConfirm: () => void;
  customerInputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const captureRef = useRef<HTMLInputElement>(null);

  const refocusCapture = useCallback(() => {
    if (!enabled || confirmOpen || isCajeroVanqueroOverlayOpen()) return;
    const active = document.activeElement;
    if (active === customerInputRef?.current) return;
    if (isCustomerTypingTarget(active)) return;
    captureRef.current?.focus({ preventScroll: true });
  }, [enabled, confirmOpen, customerInputRef]);

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      const allowTyping =
        document.activeElement === customerInputRef?.current ||
        (confirmOpen ? false : isCustomerTypingTarget(document.activeElement));

      const action = parseCajeroNumpadKey(e, {
        confirmOpen,
        allowTyping,
        mode,
        jugadaBuffer,
        amountBuffer,
      });
      if (!action) return;

      e.preventDefault();

      switch (action.type) {
        case "append":
          onAppend(action.char);
          break;
        case "backspace":
          onBackspace();
          break;
        case "arrow_clear":
          onArrowClear();
          break;
        case "cancel_ticket":
          onCancelTicket();
          break;
        case "next_lottery":
          onNextLottery();
          break;
        case "prev_lottery":
          onPrevLottery();
          break;
        case "enter_step":
          onEnterStep();
          break;
        case "sell_print":
          onSellPrint();
          break;
        case "duplicate_ticket":
          onDuplicateTicket();
          break;
        case "mark_paid":
          onMarkPaid();
          break;
        case "confirm":
          onConfirm();
          break;
        case "cancel_confirm":
          onCancelConfirm();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    confirmOpen,
    mode,
    jugadaBuffer,
    amountBuffer,
    onAppend,
    onBackspace,
    onArrowClear,
    onCancelTicket,
    onNextLottery,
    onPrevLottery,
    onEnterStep,
    onSellPrint,
    onDuplicateTicket,
    onMarkPaid,
    onConfirm,
    onCancelConfirm,
    customerInputRef,
  ]);

  useEffect(() => {
    if (!enabled) return;
    refocusCapture();
    const t = setInterval(refocusCapture, 2000);
    return () => clearInterval(t);
  }, [enabled, confirmOpen, refocusCapture]);

  return { captureRef, refocusCapture };
}
