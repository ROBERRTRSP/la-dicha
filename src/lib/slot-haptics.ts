const MUTE_KEY = "la-dicha-slot-sounds-muted";

export function isSlotSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setSlotSoundMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

export function vibrateSlot(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export function hapticSpin() {
  vibrateSlot(12);
}

export function hapticWin() {
  vibrateSlot([20, 40, 30]);
}

export function hapticBigWin() {
  vibrateSlot([30, 50, 40, 50, 60]);
}

export function hapticFreeSpin() {
  vibrateSlot([15, 30, 15, 30, 40]);
}
