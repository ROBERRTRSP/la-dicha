/** Teclado vanquero — atajos estilo POS dominicano. */
export type CajeroNumpadMode = "numbers" | "amount";

export function numpadDigitFromEvent(e: KeyboardEvent): string | null {
  if (e.key >= "0" && e.key <= "9") return e.key;
  if (e.code.startsWith("Numpad") && e.code.length === 7) {
    const d = e.code.slice(6);
    if (d >= "0" && d <= "9") return d;
  }
  return null;
}

/** Modales del vanquero, duplicar ticket o confirmar venta. */
export function isCajeroVanqueroOverlayOpen() {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(".cajero-vq-modal-backdrop") ||
      document.querySelector("[data-cajero-confirm-modal]")
  );
}

export function isCustomerTypingTarget(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    const input = el as HTMLInputElement;
    if (input.dataset.cajeroNumpad === "capture") return false;
    return true;
  }
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

export type NumpadAction =
  | { type: "append"; char: string }
  | { type: "backspace" }
  | { type: "arrow_clear" }
  | { type: "cancel_ticket" }
  | { type: "next_lottery" }
  | { type: "prev_lottery" }
  | { type: "enter_step" }
  | { type: "sell_print" }
  | { type: "duplicate_ticket" }
  | { type: "mark_paid" }
  | { type: "confirm" }
  | { type: "cancel_confirm" };

export function parseCajeroNumpadKey(
  e: KeyboardEvent,
  ctx: {
    confirmOpen: boolean;
    allowTyping: boolean;
    mode: CajeroNumpadMode;
    jugadaBuffer: string;
    amountBuffer: string;
  }
): NumpadAction | null {
  if (e.repeat) return null;
  if (e.ctrlKey || e.altKey || e.metaKey) return null;
  if (isCajeroVanqueroOverlayOpen()) return null;

  if (ctx.confirmOpen) {
    if (e.key === "Enter" || e.code === "NumpadEnter") return { type: "confirm" };
    if (e.key === "Escape") return { type: "cancel_confirm" };
    return null;
  }

  if (ctx.allowTyping) return null;

  const digit = numpadDigitFromEvent(e);

  if (e.key === "ArrowUp") {
    return { type: "arrow_clear" };
  }

  if (e.key === "l" || e.key === "L") return { type: "cancel_ticket" };
  if (e.key === "c" || e.key === "C") return { type: "duplicate_ticket" };
  if (e.key === "p" || e.key === "P") return { type: "mark_paid" };

  if (ctx.mode === "numbers" && ctx.jugadaBuffer.length === 0) {
    if (e.key === "/" || e.code === "NumpadDivide") return { type: "next_lottery" };
    if (e.key === "-" || e.code === "NumpadSubtract") {
      return { type: "prev_lottery" };
    }
  }

  if (e.key === "*" || e.code === "NumpadMultiply") {
    return { type: "sell_print" };
  }

  if (e.key === "Enter" || e.code === "NumpadEnter") {
    return { type: "enter_step" };
  }

  if (e.key === "Backspace" || e.code === "NumpadBackspace") {
    return { type: "backspace" };
  }

  if (digit) return { type: "append", char: digit };

  if (e.key === "." || e.code === "NumpadDecimal") {
    return { type: "append", char: "." };
  }

  if (e.key === "+" || e.code === "NumpadAdd") {
    if (ctx.mode === "numbers" && ctx.jugadaBuffer.length > 0) {
      return { type: "append", char: "+" };
    }
    return null;
  }

  if (e.key === "-" || e.code === "NumpadSubtract") {
    if (ctx.mode === "numbers" && ctx.jugadaBuffer.length > 0) {
      return { type: "append", char: "-" };
    }
    return null;
  }

  if (ctx.mode === "numbers" && /^[qdfb]$/i.test(e.key)) {
    return { type: "append", char: e.key.toLowerCase() };
  }

  return null;
}
