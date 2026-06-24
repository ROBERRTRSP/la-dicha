/** Nombres en franja vanquero (estilo ELITE, sin scroll). */
const STRIP_LOT_LABELS: Record<string, string> = {
  LP_DIA: "LA PRIMERA DIA",
  LP_NOCHE: "LA PRIMERA NOCHE",
  LOTEDOM: "LOTEDOM",
  LS_DIA: "LA SUERTE DIA",
  LS_TARDE: "LA SUERTE NOCHE",
  QREAL: "QUINIELA REAL",
  GANAMAS: "GANA MAS",
  NAC_TARDE: "NACIONAL TARDE",
  NAC_NOCHE: "NACIONAL NOCHE",
  LOTEKA: "LOTEKA",
  LEIDSA: "QUINIELA PALE",
  NY_AM: "NEW YORK AM",
  NY_PM: "NEW YORK PM",
  FL_AM: "FLORIDA AM",
  FL_PM: "FLORIDA PM",
  ANG_10: "ANGUILA 10 A.M",
  ANG_1: "ANGUILA 1 P.M",
  ANG_6: "ANGUILA 6 P.M",
  ANG_9: "ANGUILA 9 P.M",
  KING_AM: "KING LOTTERY AM",
  KING_PM: "KING LOTTERY PM",
};

const STRIP_SUPER_LABELS: Record<string, string> = {
  SP_REAL_GANAMAS: "SUPER PALE REAL-GANA MAS",
  SP_NAC_LEIDSA: "SUPER PALE NACIONAL-QP",
};

export function vanqueroStripLabelFromCode(
  code: string,
  name: string,
  drawTime?: string
): string {
  return STRIP_LOT_LABELS[code] ?? vanqueroStripLabel(name, drawTime);
}

export function vanqueroSuperStripLabel(code: string, name: string): string {
  return STRIP_SUPER_LABELS[code] ?? name.toUpperCase();
}

/** Nombres cortos estilo vanquero (franja superior). */
export function vanqueroStripLabel(name: string, drawTime?: string): string {
  let n = name
    .replace(/^Quiniela\s+/i, "")
    .replace(/^Loter[ií]a\s+/i, "")
    .trim();

  if (/^La\s+/i.test(name) && !/^La Primera|^La Suerte/i.test(name)) {
    n = name.replace(/^La\s+/i, "LA ");
  }

  if (drawTime) {
    const [h] = drawTime.split(":").map(Number);
    const suffix =
      h >= 18 ? " PM" : h < 12 ? " AM" : h === 12 ? " PM" : " PM";
    if (/noche|tarde|d[ií]a|mañana|medio/i.test(n)) {
      return n.toUpperCase();
    }
    if (!/\b(AM|PM)\b/i.test(n)) {
      n = `${n}${suffix}`;
    }
  }

  return n.toUpperCase();
}

export const SUPER_PALE_CART_LABELS: Record<string, string> = {
  SP_REAL_GANAMAS: "SPR",
  SP_NAC_LEIDSA: "SPQN",
};

const CART_LOT_LABELS: Record<string, string> = {
  LP_DIA: "LP DIA",
  LP_NOCHE: "LP NOC",
  LOTEDOM: "LOTEDOM",
  LS_DIA: "SUERTE AM",
  LS_TARDE: "SUERTE PM",
  QREAL: "REAL",
  GANAMAS: "GANA+",
  NAC_TARDE: "NAC T",
  NAC_NOCHE: "NAC N",
  LOTEKA: "LOTEKA",
  LEIDSA: "LEIDSA",
  NY_AM: "NY AM",
  NY_PM: "NY PM",
  FL_AM: "FL AM",
  FL_PM: "FL PM",
  ANG_10: "ANG 10",
  ANG_1: "ANG 1",
  ANG_6: "ANG 6",
  ANG_9: "ANG 9",
  KING_AM: "KING AM",
  KING_PM: "KING PM",
};

/** Etiqueta corta para columna LOT del carrito vanquero */
export function vanqueroCartLotLabel(
  codes: string[] | undefined,
  names: string[]
): string {
  const list = codes?.filter(Boolean) ?? [];
  if (list.length === 0) {
    return vanqueroLotCode(names, null);
  }
  if (list.length === 1) {
    return CART_LOT_LABELS[list[0]] ?? vanqueroLotCode(names, null);
  }
  return list
    .map((code) => CART_LOT_LABELS[code] ?? code.replace(/_/g, " "))
    .join(" · ");
}

/** Una fila del carrito (estilo ELITE: SPR, NY AM, NJ PM…) */
export function vanqueroCartRowLabel(line: {
  superPaleCode?: string;
  lotteryCodes?: string[];
  lotteryNames: string[];
}): string {
  if (line.superPaleCode) {
    return (
      SUPER_PALE_CART_LABELS[line.superPaleCode] ??
      vanqueroLotCode(line.lotteryNames, line.superPaleCode)
    );
  }
  return vanqueroCartLotLabel(line.lotteryCodes, line.lotteryNames);
}

export function vanqueroLotCode(
  names: string[],
  superPaleName?: string | null
): string {
  if (superPaleName) {
    const parts = superPaleName
      .replace(/^Súper Palé\s+/i, "")
      .split(/\s*\+\s*/);
    const abbr = parts
      .map((p) =>
        p
          .replace(/^Quiniela\s+/i, "")
          .replace(/^Loter[ií]a\s+/i, "")
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 4)
      )
      .join("-");
    return `SP ${abbr}`;
  }
  if (names.length === 0) return "—";
  if (names.length === 1) {
    const short = names[0]
      .replace(/^Quiniela\s+/i, "")
      .replace(/^Loter[ií]a\s+/i, "")
      .replace(/^La\s+/i, "");
    const words = short.split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
    return words
      .map((w) => w.slice(0, 3))
      .join("")
      .slice(0, 8)
      .toUpperCase();
  }
  return `×${names.length}`;
}

const SESSION_KEY = "cajero-vanquero-session";

export function nextVanqueroSessionId(): string {
  if (typeof sessionStorage === "undefined") {
    return String(Date.now()).slice(-9).padStart(9, "0");
  }
  const prev = parseInt(sessionStorage.getItem(SESSION_KEY) ?? "141000", 10);
  const next = Number.isFinite(prev) ? prev + 1 : 141001;
  sessionStorage.setItem(SESSION_KEY, String(next));
  return String(next).padStart(9, "0");
}
