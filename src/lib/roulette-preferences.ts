const SKIP_CONFIRM_KEY = "la-dicha-roulette-skip-confirm";

export function isRouletteConfirmSkipped(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SKIP_CONFIRM_KEY) === "1";
}

export function setRouletteConfirmSkipped(skip: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SKIP_CONFIRM_KEY, skip ? "1" : "0");
}
