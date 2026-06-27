"use client";

import { useEffect, useState } from "react";
import { SLOT_MOBILE_MAX_WIDTH } from "@/lib/slots/mobile-pace";

function listenMediaChange(mq: MediaQueryList, listener: () => void) {
  if ("addEventListener" in mq) {
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }
  const legacyMq = mq as MediaQueryList & {
    addListener?: (cb: () => void) => void;
    removeListener?: (cb: () => void) => void;
  };
  legacyMq.addListener?.(listener);
  return () => legacyMq.removeListener?.(listener);
}

export function useSlotMobile(): boolean {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SLOT_MOBILE_MAX_WIDTH}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    return listenMediaChange(mq, update);
  }, []);

  return isMobile;
}

/**
 * Aviso de orientación para teléfonos:
 * - táctil (pointer coarse)
 * - landscape
 * - viewport bajo (típico en móvil al girar)
 */
export function useSlotLandscapeWarning(): boolean {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const orientationMq = window.matchMedia("(orientation: landscape)");
    const heightMq = window.matchMedia("(max-height: 560px)");
    const touchMq = window.matchMedia("(hover: none) and (pointer: coarse)");

    const update = () => {
      setShowWarning(
        orientationMq.matches && heightMq.matches && touchMq.matches
      );
    };

    update();
    const stopOrientation = listenMediaChange(orientationMq, update);
    const stopHeight = listenMediaChange(heightMq, update);
    const stopTouch = listenMediaChange(touchMq, update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);
    return () => {
      stopOrientation();
      stopHeight();
      stopTouch();
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return showWarning;
}
