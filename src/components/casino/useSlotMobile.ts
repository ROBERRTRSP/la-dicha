"use client";

import { useEffect, useState } from "react";
import { SLOT_MOBILE_MAX_WIDTH } from "@/lib/slots/mobile-pace";

export function useSlotMobile(): boolean {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SLOT_MOBILE_MAX_WIDTH}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}
