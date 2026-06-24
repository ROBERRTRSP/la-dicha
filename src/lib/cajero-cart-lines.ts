import { generateId } from "./generate-id";
import type { OpenDrawView } from "./draws";
import type { ExpandedPlay } from "./cajero-bet-entry";
import { isSuperPaleId, type OpenSuperPaleView } from "./super-pale";
import type { CartLine } from "./cart-line";

export function selectedSuperIds(selected: Set<string>) {
  return [...selected].filter(isSuperPaleId);
}

export function playsToCartLines(
  plays: ExpandedPlay[],
  betAmount: number,
  selected: Set<string>,
  draws: OpenDrawView[],
  openSuperPales: OpenSuperPaleView[]
): CartLine[] {
  const selectedSuper = selectedSuperIds(selected);
  const selectedDraws = draws.filter((d) => selected.has(d.id));

  const lines: CartLine[] = [];

  for (const play of plays) {
    if (play.betType === "SUPER_PALE") {
      if (selectedSuper.length === 0) {
        throw new Error("Selecciona al menos un Súper Palé.");
      }
      for (const spId of selectedSuper) {
        const sp = openSuperPales.find((s) => s.id === spId);
        if (!sp) throw new Error("Súper Palé no disponible.");
        lines.push({
          id: generateId(),
          betType: play.betType,
          digits: play.digits,
          numbers: play.numbers,
          amount: betAmount,
          drawIds: [sp.drawIdA, sp.drawIdB],
          lotteryNames: [sp.lotteryNameA, sp.lotteryNameB],
          lotteryCodes: [sp.lotteryCodeA, sp.lotteryCodeB],
          superPaleCode: sp.code,
          superPaleName: sp.name,
          superPaleLotCodes: [sp.lotteryCodeA, sp.lotteryCodeB],
          addedAt: Date.now(),
        });
      }
      continue;
    }

    if (play.betType === "PALE") {
      if (selectedDraws.length === 0 && selectedSuper.length === 0) {
        throw new Error("Selecciona lotería o Súper Palé para el palé.");
      }
      for (const draw of selectedDraws) {
        lines.push({
          id: generateId(),
          betType: play.betType,
          digits: play.digits,
          numbers: play.numbers,
          amount: betAmount,
          drawIds: [draw.id],
          lotteryNames: [draw.lotteryName],
          lotteryCodes: [draw.lotteryCode],
          addedAt: Date.now(),
        });
      }
      for (const spId of selectedSuper) {
        const sp = openSuperPales.find((s) => s.id === spId);
        if (!sp) throw new Error("Súper Palé no disponible.");
        lines.push({
          id: generateId(),
          betType: "SUPER_PALE",
          digits: play.digits,
          numbers: play.numbers,
          amount: betAmount,
          drawIds: [sp.drawIdA, sp.drawIdB],
          lotteryNames: [sp.lotteryNameA, sp.lotteryNameB],
          lotteryCodes: [sp.lotteryCodeA, sp.lotteryCodeB],
          superPaleCode: sp.code,
          superPaleName: sp.name,
          superPaleLotCodes: [sp.lotteryCodeA, sp.lotteryCodeB],
          addedAt: Date.now(),
        });
      }
      continue;
    }

    if (selectedDraws.length === 0) {
      throw new Error("Selecciona al menos una lotería.");
    }

    for (const draw of selectedDraws) {
      lines.push({
        id: generateId(),
        betType: play.betType,
        digits: play.digits,
        numbers: play.numbers,
        amount: betAmount,
        drawIds: [draw.id],
        lotteryNames: [draw.lotteryName],
        lotteryCodes: [draw.lotteryCode],
        addedAt: Date.now(),
      });
    }
  }

  return lines;
}
