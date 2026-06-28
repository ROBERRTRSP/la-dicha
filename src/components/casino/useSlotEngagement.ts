"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isSlotSoundMuted,
  setSlotSoundMuted,
  hapticBigWin,
  hapticFreeSpin,
  hapticSpin,
  hapticWin,
} from "@/lib/slot-haptics";
import {
  unlockSlotAudio,
  playSlotClick,
  playSlotFreeSpin,
  playSlotNoWin,
  playSlotReelStop,
  playSlotSpinStart,
  playSlotWinBig,
  playSlotWinSmall,
} from "@/lib/slot-sounds";

export function useSlotEngagement() {
  const [muted, setMuted] = useState(false);
  const reelStopCount = useRef(0);

  useEffect(() => {
    setMuted(isSlotSoundMuted());
  }, []);

  const ensureAudio = useCallback(() => {
    unlockSlotAudio();
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      setSlotSoundMuted(next);
      return next;
    });
  }, []);

  const playClick = useCallback(() => {
    if (muted) return;
    ensureAudio();
    playSlotClick();
  }, [ensureAudio, muted]);

  const playSpinStart = useCallback(() => {
    reelStopCount.current = 0;
    if (muted) {
      hapticSpin();
      return;
    }
    ensureAudio();
    playSlotSpinStart();
    hapticSpin();
  }, [ensureAudio, muted]);

  const playReelStop = useCallback(() => {
    reelStopCount.current += 1;
    if (muted) return;
    ensureAudio();
    playSlotReelStop(reelStopCount.current);
  }, [ensureAudio, muted]);

  const playWin = useCallback(
    (amount: number, bet: number) => {
      const big = amount >= bet * 20;
      if (muted) {
        if (big) hapticBigWin();
        else hapticWin();
        return;
      }
      ensureAudio();
      if (big) {
        playSlotWinBig();
        hapticBigWin();
      } else {
        playSlotWinSmall();
        hapticWin();
      }
    },
    [ensureAudio, muted]
  );

  const playFreeSpinAward = useCallback(() => {
    if (muted) {
      hapticFreeSpin();
      return;
    }
    ensureAudio();
    playSlotFreeSpin();
    hapticFreeSpin();
  }, [ensureAudio, muted]);

  const playNoWin = useCallback(() => {
    if (muted) return;
    ensureAudio();
    playSlotNoWin();
  }, [ensureAudio, muted]);

  return {
    muted,
    toggleMute,
    playClick,
    playSpinStart,
    playReelStop,
    playWin,
    playFreeSpinAward,
    playNoWin,
    ensureAudio,
  };
}
