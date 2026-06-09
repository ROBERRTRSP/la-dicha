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

/** Súper palés abiertos: cierran con la lotería de referencia (Real o Leidsa). */
export function getOpenSuperPales(draws: OpenDrawView[]): OpenSuperPaleView[] {
  const byCode = new Map(draws.map((d) => [d.lotteryCode, d]));
  const open: OpenSuperPaleView[] = [];

  for (const def of SUPER_PALE_DEFINITIONS) {
    const drawClose = byCode.get(def.closesWithLotteryCode);
    if (!drawClose) continue;

    const drawA = byCode.get(def.lotteryCodeA);
    const drawB = byCode.get(def.lotteryCodeB);
    if (!drawA || !drawB) continue;

    const secondsLeft = drawClose.secondsLeft;
    const status = drawClose.status === "CLOSING_SOON" ? "CLOSING_SOON" : "OPEN";

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
      secondsLeft,
    });
  }

  return open.sort((a, b) => compareDrawTime(a.sortTime, b.sortTime));
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
