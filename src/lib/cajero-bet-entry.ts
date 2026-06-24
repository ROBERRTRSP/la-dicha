import {
  detectBetType,
  formatNumbers,
  validateDigits,
  type BetTypeCode,
} from "./bet-parser";
import { isSuperPaleId } from "./super-pale";

/** ¿La jugada de 4 dígitos es súper palé y no palé normal? */
export function shouldParseAsSuperPale(opts: {
  focusId: string | null;
  selectedSuperCount: number;
  selectedDrawCount: number;
}): boolean {
  if (opts.selectedSuperCount === 0) return false;
  if (opts.focusId && isSuperPaleId(opts.focusId)) return true;
  if (opts.selectedDrawCount === 0) return true;
  return false;
}

export type ExpandedPlay = {
  betType: BetTypeCode;
  digits: string;
  numbers: string;
  note?: string;
};

export type JugadaParseResult =
  | { ok: true; plays: ExpandedPlay[] }
  | { ok: false; error: string };

function permute<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permute(rest)) {
      out.push([arr[i], ...p]);
    }
  }
  return out;
}

function uniqueQuinielasFromTriple(s: string): ExpandedPlay[] {
  const chars = s.split("");
  const seen = new Set<string>();
  const plays: ExpandedPlay[] = [];
  for (const p of permute(chars)) {
    const d = p.join("").slice(0, 2);
    if (d.length === 2 && !seen.has(d)) {
      seen.add(d);
      plays.push({
        betType: "QUINIELA",
        digits: d,
        numbers: d,
        note: "Combinación",
      });
    }
  }
  return plays;
}

function expandPaleBox(four: string): ExpandedPlay[] {
  const d = four.split("");
  const splits = [
    [d[0] + d[1], d[2] + d[3]],
    [d[0] + d[2], d[1] + d[3]],
    [d[0] + d[3], d[1] + d[2]],
  ];
  return splits.map(([a, b]) => ({
    betType: "PALE" as const,
    digits: a + b,
    numbers: `${a}-${b}`,
    note: "Palé combinado",
  }));
}

function expandTripletaBox(six: string): ExpandedPlay[] {
  const chars = six.split("");
  const map = new Map<string, ExpandedPlay>();
  for (const p of permute(chars)) {
    const a = p[0] + p[1];
    const b = p[2] + p[3];
    const c = p[4] + p[5];
    const key = [a, b, c].sort().join("|");
    if (!map.has(key)) {
      map.set(key, {
        betType: "TRIPLETA",
        digits: a + b + c,
        numbers: `${a}-${b}-${c}`,
        note: "Tripleta combinada",
      });
    }
  }
  return [...map.values()];
}

function expandPairSequence(start: string, end: string): ExpandedPlay[] {
  const s = parseInt(start, 10);
  const e = parseInt(end, 10);
  if (Number.isNaN(s) || Number.isNaN(e) || s > e) {
    return [];
  }
  const plays: ExpandedPlay[] = [];
  for (let n = s; n <= e; n += 11) {
    const str = String(n).padStart(2, "0");
    plays.push({
      betType: "QUINIELA",
      digits: str,
      numbers: str,
      note: "Secuencia pares",
    });
  }
  return plays;
}

function standardPlay(digits: string, isSuperPale: boolean): ExpandedPlay | null {
  if (isSuperPale) {
    if (digits.length !== 4) return null;
    return {
      betType: "SUPER_PALE",
      digits,
      numbers: formatNumbers(digits, "SUPER_PALE"),
    };
  }
  const err = validateDigits(digits);
  if (err) return null;
  const type = detectBetType(digits)!;
  return {
    betType: type,
    digits,
    numbers: formatNumbers(digits, type),
  };
}

/** Parsea jugada vanquero (directo, palé, tripleta, súper palé y combinaciones). */
export function parseJugadaInput(
  raw: string,
  opts: { isSuperPale: boolean }
): JugadaParseResult {
  const input = raw.trim().toLowerCase();

  if (!input) {
    return { ok: false, error: "Escribe la jugada." };
  }

  if (opts.isSuperPale) {
    const digits = input.replace(/\D/g, "");
    if (digits.length !== 4) {
      return { ok: false, error: "Súper Palé: 4 dígitos y Enter." };
    }
    const play = standardPlay(digits, true);
    return play ? { ok: true, plays: [play] } : { ok: false, error: "Súper Palé inválido." };
  }

  if (input.endsWith(".")) {
    const base = input.slice(0, -1).replace(/\D/g, "");
    if (base.length === 4) {
      return { ok: true, plays: expandPaleBox(base) };
    }
    if (base.length === 6) {
      return { ok: true, plays: expandTripletaBox(base) };
    }
    return {
      ok: false,
      error: "Punto (.) combinado: use 4 dígitos (palé) o 6 (tripleta).",
    };
  }

  if (input.endsWith("q")) {
    const base = input.slice(0, -1).replace(/\D/g, "");
    if (base.length !== 3) {
      return { ok: false, error: "Formato 123q: tres dígitos + q." };
    }
    const plays = uniqueQuinielasFromTriple(base);
    if (!plays.length) {
      return { ok: false, error: "No se generaron combinaciones." };
    }
    return { ok: true, plays };
  }

  const pairSeq = input.match(/^(\d{2})d(\d{2})$/);
  if (pairSeq) {
    const plays = expandPairSequence(pairSeq[1], pairSeq[2]);
    if (!plays.length) {
      return { ok: false, error: "Secuencia d inválida (ej. 33d66)." };
    }
    return { ok: true, plays };
  }

  if (/[a-z]/.test(input) || /\+\d|-\d{2,}/.test(input)) {
    return {
      ok: false,
      error:
        "Cash3/Play4/Bolita/Singulación no están en La Dicha. Use quiniela, palé, tripleta o súper palé.",
    };
  }

  const digits = input.replace(/\D/g, "");
  const play = standardPlay(digits, false);
  if (!play) {
    return {
      ok: false,
      error: "Directo=2 · Palé=4 · Tripleta=6 · Palé comb.=1234. · Seq.=33d66",
    };
  }
  return { ok: true, plays: [play] };
}

export function jugadaAllowsMoreChars(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  if (s.length >= 14) return false;
  if (s.endsWith(".") || s.endsWith("q")) return false;
  if (/^\d{2}d\d{0,2}$/.test(s) && s.length >= 5) return s.length < 5;
  return true;
}

export function appendJugadaChar(current: string, ch: string): string | null {
  const c = ch.length === 1 ? ch : null;
  if (!c) return null;
  if (/^[0-9.+\-qdfb]$/i.test(c)) {
    const next = current + c.toLowerCase();
    return jugadaAllowsMoreChars(next) ? next : null;
  }
  return null;
}
