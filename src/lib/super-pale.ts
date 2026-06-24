import type { OpenDrawView } from "./draws";
import { compareDrawTime } from "./utils";

export type SuperPaleDefinition = {
  code: string;
  name: string;
  lotteryCodeA: string;
  lotteryCodeB: string;
  /** Lotería cuyo cierre define hasta cuándo se puede jugar el súper palé. */
  closesWithLotteryCode: string;
  sortTime: string;
};

export const SUPER_PALE_DEFINITIONS: SuperPaleDefinition[] = [
  {
    code: "SP_REAL_GANAMAS",
    name: "Súper Palé Real + Gana Más",
    lotteryCodeA: "QREAL",
    lotteryCodeB: "GANAMAS",
    closesWithLotteryCode: "QREAL",
    sortTime: "12:55",
  },
  {
    code: "SP_NAC_LEIDSA",
    name: "Súper Palé Nacional + Leidsa",
    lotteryCodeA: "NAC_NOCHE",
    lotteryCodeB: "LEIDSA",
    closesWithLotteryCode: "LEIDSA",
    sortTime: "20:55",
  },
];

export type OpenSuperPaleView = {
  id: string;
  code: string;
  name: string;
  sortTime: string;
  drawIdA: string;
  drawIdB: string;
  lotteryNameA: string;
  lotteryNameB: string;
  lotteryCodeA: string;
  lotteryCodeB: string;
  status: "OPEN" | "CLOSING_SOON";
  secondsLeft: number;
};

export function isSuperPaleId(id: string) {
  return id.startsWith("super:");
}

export function superPaleIdFromCode(code: string) {
  return `super:${code}`;
}

export function superPaleCodeFromId(id: string) {
  return id.replace(/^super:/, "");
}

export function getSuperPaleDefinition(code: string) {
  return SUPER_PALE_DEFINITIONS.find((s) => s.code === code);
}

/** Títulos para recibo / ticket (evita confundir con Leidsa, Gana Más, etc.). */
export const SUPER_PALE_RECEIPT_TITLES: Record<string, string> = {
  SP_REAL_GANAMAS: "SUPER PALE REAL-GANA MAS",
  SP_NAC_LEIDSA: "SUPER PALE NACIONAL-QP",
};

export function superPaleReceiptTitle(codeOrName?: string | null): string {
  if (!codeOrName) return "SUPER PALE";
  if (SUPER_PALE_RECEIPT_TITLES[codeOrName]) {
    return SUPER_PALE_RECEIPT_TITLES[codeOrName];
  }
  const def = getSuperPaleDefinition(codeOrName);
  if (def) return superPaleReceiptTitle(def.code);
  if (/s[uú]per\s*pal/i.test(codeOrName)) {
    return codeOrName
      .replace(/^S[uú]per\s*Pal[eé]\s+/i, "SUPER PALE ")
      .replace(/\s*\+\s*/g, "-")
      .toUpperCase();
  }
  return codeOrName.toUpperCase();
}

export type TodayDrawRef = {
  id: string;
  lotteryCode: string;
  lotteryName: string;
  drawTime: string;
};

/**
 * Súper palés abiertos para venta.
 * La lotería de cierre debe estar abierta; A y B usan el sorteo de hoy aunque ya hayan cerrado.
 */
export function buildOpenSuperPales(
  openDraws: OpenDrawView[],
  todayDraws: TodayDrawRef[]
): OpenSuperPaleView[] {
  const openByCode = new Map(openDraws.map((d) => [d.lotteryCode, d]));
  const todayByCode = new Map(todayDraws.map((d) => [d.lotteryCode, d]));
  const open: OpenSuperPaleView[] = [];

  for (const def of SUPER_PALE_DEFINITIONS) {
    const drawClose = openByCode.get(def.closesWithLotteryCode);
    if (!drawClose) continue;

    const drawA = todayByCode.get(def.lotteryCodeA);
    const drawB = todayByCode.get(def.lotteryCodeB);
    if (!drawA || !drawB) continue;

    const status =
      drawClose.status === "CLOSING_SOON" ? "CLOSING_SOON" : "OPEN";

    open.push({
      id: superPaleIdFromCode(def.code),
      code: def.code,
      name: def.name,
      sortTime: def.sortTime,
      drawIdA: drawA.id,
      drawIdB: drawB.id,
      lotteryNameA: drawA.lotteryName,
      lotteryNameB: drawB.lotteryName,
      lotteryCodeA: drawA.lotteryCode,
      lotteryCodeB: drawB.lotteryCode,
      status,
      secondsLeft: drawClose.secondsLeft,
    });
  }

  return open.sort((a, b) => compareDrawTime(a.sortTime, b.sortTime));
}

/** Cliente: fallback usando solo loterías abiertas. */
export function getOpenSuperPales(draws: OpenDrawView[]): OpenSuperPaleView[] {
  const todayRefs: TodayDrawRef[] = draws.map((d) => ({
    id: d.id,
    lotteryCode: d.lotteryCode,
    lotteryName: d.lotteryName,
    drawTime: d.drawTime,
  }));
  return buildOpenSuperPales(draws, todayRefs);
}

export type PlayStripItem =
  | { kind: "draw"; sortTime: string; draw: OpenDrawView }
  | { kind: "super_pale"; sortTime: string; superPale: OpenSuperPaleView };

export function buildPlayStripItems(
  draws: OpenDrawView[],
  superPales: OpenSuperPaleView[]
): PlayStripItem[] {
  const items: PlayStripItem[] = [
    ...draws.map((draw) => ({ kind: "draw" as const, sortTime: draw.drawTime, draw })),
    ...superPales.map((superPale) => ({
      kind: "super_pale" as const,
      sortTime: superPale.sortTime,
      superPale,
    })),
  ];
  return items.sort((a, b) => compareDrawTime(a.sortTime, b.sortTime));
}
