/** Sonidos sintetizados · sin archivos externos */

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function unlockSlotAudio() {
  const c = ctx();
  if (c?.state === "suspended") void c.resume();
}

function tone(
  freq: number,
  durationMs: number,
  opts?: { type?: OscillatorType; gain?: number; decay?: boolean }
) {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts?.type ?? "sine";
  osc.frequency.value = freq;
  const peak = opts?.gain ?? 0.08;
  gain.gain.setValueAtTime(peak, c.currentTime);
  if (opts?.decay !== false) {
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + durationMs / 1000);
  }
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + durationMs / 1000 + 0.02);
}

export function playSlotClick() {
  tone(880, 40, { type: "square", gain: 0.04 });
}

export function playSlotSpinStart() {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(120, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(420, c.currentTime + 0.18);
  gain.gain.setValueAtTime(0.05, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.24);
}

export function playSlotReelStop(index = 0) {
  tone(180 + index * 55, 55, { type: "triangle", gain: 0.06 });
}

export function playSlotWinSmall() {
  tone(523, 80, { gain: 0.07 });
  window.setTimeout(() => tone(659, 100, { gain: 0.08 }), 70);
}

export function playSlotWinBig() {
  [523, 659, 784, 988].forEach((f, i) => {
    window.setTimeout(() => tone(f, 140, { gain: 0.09 }), i * 90);
  });
}

export function playSlotFreeSpin() {
  [440, 554, 659, 880].forEach((f, i) => {
    window.setTimeout(() => tone(f, 160, { type: "square", gain: 0.06 }), i * 110);
  });
}

export function playSlotNoWin() {
  tone(220, 90, { type: "sine", gain: 0.03 });
}

export function playRouletteSpinStart() {
  playSlotSpinStart();
}

export function playRouletteBallStop() {
  tone(330, 120, { type: "triangle", gain: 0.07 });
}

export function playRouletteWin() {
  playSlotWinBig();
}
