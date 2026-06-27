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
    const widthMq = window.matchMedia(`(max-width: ${SLOT_MOBILE_MAX_WIDTH}px)`);
    const touchMq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const iosLandscapeMq = window.matchMedia("(max-width: 1024px)");
    const update = () => {
      setIsMobile(widthMq.matches || (touchMq.matches && iosLandscapeMq.matches));
    };
    update();
    const stopWidth = listenMediaChange(widthMq, update);
    const stopTouch = listenMediaChange(touchMq, update);
    const stopIosLandscape = listenMediaChange(iosLandscapeMq, update);
    return () => {
      stopWidth();
      stopTouch();
      stopIosLandscape();
    };
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

/**
 * Bloqueo de orientación para juegos landscape-first:
 * - En teléfonos táctiles en modo vertical, se debe ocultar el juego
 *   y mostrar solo el aviso de rotación.
 * - En pantallas grandes (tablet/desktop) nunca se bloquea.
 *
 * Devuelve `true` cuando hay que mostrar el overlay y NO renderizar el juego.
 */
export function useSlotPortraitBlock(): boolean {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const portraitMq = window.matchMedia("(orientation: portrait)");
    const touchMq = window.matchMedia("(hover: none) and (pointer: coarse)");
    // Solo consideramos "teléfono": viewport corto en su lado menor.
    const phoneMq = window.matchMedia("(max-width: 900px)");

    const update = () => {
      setBlocked(
        portraitMq.matches && touchMq.matches && phoneMq.matches
      );
    };

    update();
    const stopPortrait = listenMediaChange(portraitMq, update);
    const stopTouch = listenMediaChange(touchMq, update);
    const stopPhone = listenMediaChange(phoneMq, update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);
    return () => {
      stopPortrait();
      stopTouch();
      stopPhone();
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return blocked;
}
