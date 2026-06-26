import type { BetTypeCode } from "./bet-parser";
import type { OpenDrawView } from "./draws";
import { generateId } from "./generate-id";
import {
  getOpenSuperPales,
  getSuperPaleDefinition,
  type OpenSuperPaleView,
} from "./super-pale";
import type { CartLine } from "./tickets";
import { validatePlayLimitsForLines } from "./play-limits";
import type { SoldPlayItem } from "./play-limits";
import type { PlayLimitContext } from "./play-limit-context";

export type TicketItemForDuplicate = {
  betType: string;
  numbers: string;
  amount: number;
  lotteryName: string;
  superPaleName?: string | null;
};

export type DuplicateLotteryOption = {
  key: string;
  label: string;
  kind: "draw" | "super_pale";
  playCount: number;
  subtotal: number;
  open: boolean;
  closedMessage?: string;
};

export type DuplicateTicketPreview = {
  ticketId: string;
  displayTicketNumber: string;
  ticketNumber: string;
  internalTicketCode?: string | null;
  totalAmount: number;
  createdAt: string;
  lotteries: DuplicateLotteryOption[];
};

export type DuplicateTicketApplyResult = {
  lines: CartLine[];
  addedCount: number;
  errors: string[];
  warnings: string[];
};

function normalizeLotteryName(name: string) {
  return name.toUpperCase().replace(/\s+/g, " ").trim();
}

function drawLotteryKey(lotteryName: string) {
  return `draw:${normalizeLotteryName(lotteryName)}`;
}

function superPaleKey(codeOrName: string) {
  return `super:${codeOrName}`;
}

function itemLotteryKey(item: TicketItemForDuplicate): string {
  if (item.betType === "SUPER_PALE" || item.superPaleName) {
    return superPaleKey(item.superPaleName ?? item.lotteryName);
  }
  return drawLotteryKey(item.lotteryName);
}

function findOpenDraw(
  lotteryName: string,
  openDraws: OpenDrawView[]
): OpenDrawView | undefined {
  const target = normalizeLotteryName(lotteryName);
  return openDraws.find(
    (d) =>
      normalizeLotteryName(d.lotteryName) === target ||
      d.lotteryName.includes(lotteryName) ||
      lotteryName.includes(d.lotteryName)
  );
}

function isSuperPaleOpen(
  codeOrName: string,
  openSuperPales: OpenSuperPaleView[]
): OpenSuperPaleView | undefined {
  const def = getSuperPaleDefinition(codeOrName);
  return (
    openSuperPales.find((s) => s.code === codeOrName) ??
    openSuperPales.find((s) => s.name === codeOrName) ??
    (def ? openSuperPales.find((s) => s.code === def.code) : undefined)
  );
}

export function buildDuplicateLotteryOptions(
  items: TicketItemForDuplicate[],
  openDraws: OpenDrawView[],
  openSuperPalesInput?: OpenSuperPaleView[]
): DuplicateLotteryOption[] {
  const openSuperPales = openSuperPalesInput ?? getOpenSuperPales(openDraws);
  const map = new Map<string, DuplicateLotteryOption>();

  for (const item of items) {
    const key = itemLotteryKey(item);
    const existing = map.get(key);

    if (item.betType === "SUPER_PALE" || item.superPaleName) {
      const code = item.superPaleName ?? item.lotteryName;
      const def = getSuperPaleDefinition(code);
      const label = def?.name ?? code;
      const sp = isSuperPaleOpen(code, openSuperPales);
      const open = Boolean(sp);
      const entry: DuplicateLotteryOption = existing ?? {
        key,
        label,
        kind: "super_pale",
        playCount: 0,
        subtotal: 0,
        open,
        closedMessage: open
          ? undefined
          : `La lotería ${label} ya está cerrada y no puede duplicarse.`,
      };
      entry.playCount += 1;
      entry.subtotal += item.amount;
      map.set(key, entry);
      continue;
    }

    const draw = findOpenDraw(item.lotteryName, openDraws);
    const open = Boolean(draw);
    const label = item.lotteryName;
    const entry: DuplicateLotteryOption = existing ?? {
      key,
      label,
      kind: "draw",
      playCount: 0,
      subtotal: 0,
      open,
      closedMessage: open
        ? undefined
        : `La lotería ${label} ya está cerrada y no puede duplicarse.`,
    };
    entry.playCount += 1;
    entry.subtotal += item.amount;
    map.set(key, entry);
  }

  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
}

export function filterItemsByLotteryKeys(
  items: TicketItemForDuplicate[],
  selectedKeys: Set<string>
): TicketItemForDuplicate[] {
  return items.filter((item) => selectedKeys.has(itemLotteryKey(item)));
}

function playGroupKey(item: TicketItemForDuplicate) {
  const sp = item.superPaleName ?? "";
  return `${item.betType}|${item.numbers}|${item.amount}|${sp}`;
}

function digitsFromNumbers(numbers: string) {
  return numbers.replace(/-/g, "");
}

function superPaleDisplay(codeOrName: string) {
  return getSuperPaleDefinition(codeOrName)?.name ?? codeOrName;
}

function buildSuperPaleLine(
  item: TicketItemForDuplicate,
  openSuperPales: OpenSuperPaleView[]
): CartLine | null {
  const code = item.superPaleName ?? "";
  const def = getSuperPaleDefinition(code);
  const sp =
    openSuperPales.find((s) => s.code === code) ??
    openSuperPales.find((s) => s.name === code) ??
    (def ? openSuperPales.find((s) => s.code === def.code) : undefined);

  if (!sp) return null;

  return {
    id: generateId(),
    betType: "SUPER_PALE",
    numbers: item.numbers,
    digits: digitsFromNumbers(item.numbers),
    amount: item.amount,
    drawIds: [sp.drawIdA, sp.drawIdB],
    lotteryNames: [sp.lotteryNameA, sp.lotteryNameB],
    lotteryCodes: [sp.lotteryCodeA, sp.lotteryCodeB],
    superPaleCode: sp.code,
    superPaleName: sp.name,
    superPaleLotCodes: [sp.lotteryCodeA, sp.lotteryCodeB],
    addedAt: Date.now(),
  };
}

/** Convierte jugadas filtradas en líneas de carrito. */
export function ticketItemsToCartLines(
  items: TicketItemForDuplicate[],
  openDraws: OpenDrawView[],
  openSuperPalesInput?: OpenSuperPaleView[]
): { lines: CartLine[]; warning?: string } {
  if (items.length === 0) {
    throw new Error("No hay jugadas para duplicar.");
  }

  const openSuperPales = openSuperPalesInput ?? getOpenSuperPales(openDraws);
  const groups = new Map<string, TicketItemForDuplicate[]>();

  for (const item of items) {
    const key = playGroupKey(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const lines: CartLine[] = [];
  const missingLotteries = new Set<string>();

  for (const [, groupItems] of groups) {
    const sample = groupItems[0];
    const betType = sample.betType as BetTypeCode;

    if (betType === "SUPER_PALE") {
      const line = buildSuperPaleLine(sample, openSuperPales);
      if (line) lines.push(line);
      else if (sample.superPaleName) {
        missingLotteries.add(superPaleDisplay(sample.superPaleName));
      }
      continue;
    }

    const drawIds: string[] = [];
    const lotteryNames: string[] = [];
    const lotteryCodes: string[] = [];

    for (const item of groupItems) {
      const draw = findOpenDraw(item.lotteryName, openDraws);
      if (!draw) {
        missingLotteries.add(item.lotteryName);
        continue;
      }
      if (!drawIds.includes(draw.id)) {
        drawIds.push(draw.id);
        lotteryNames.push(draw.lotteryName);
        lotteryCodes.push(draw.lotteryCode);
      }
    }

    if (drawIds.length === 0) continue;

    lines.push({
      id: generateId(),
      betType,
      numbers: sample.numbers,
      digits: digitsFromNumbers(sample.numbers),
      amount: sample.amount,
      drawIds,
      lotteryNames,
      lotteryCodes,
      addedAt: Date.now(),
    });
  }

  if (lines.length === 0) {
    const names = [...missingLotteries].slice(0, 3).join(", ");
    throw new Error(
      names
        ? `Loterías cerradas o no disponibles: ${names}.`
        : "No se pudieron cargar las jugadas del ticket."
    );
  }

  if (missingLotteries.size > 0) {
    const skipped = [...missingLotteries].join(", ");
    return {
      lines,
      warning: `Algunas loterías no están abiertas (${skipped}).`,
    };
  }

  return { lines };
}

function limitErrorForLine(
  line: CartLine,
  validation: ReturnType<typeof validatePlayLimitsForLines>
): string | null {
  const blocked = validation.items.find((i) => !i.canPlay);
  if (!blocked) return validation.blockMessage ?? null;
  const lottery = blocked.lotteryName;
  const number = blocked.number;
  if (blocked.available <= 0) {
    return `El número ${number} en ${lottery} ya alcanzó el límite y no puede duplicarse.`;
  }
  return `El número ${number} en ${lottery} excede el límite disponible y no puede duplicarse.`;
}

export function applyDuplicateWithValidation(
  items: TicketItemForDuplicate[],
  selectedKeys: string[],
  openDraws: OpenDrawView[],
  limitCtx: PlayLimitContext,
  soldItems: SoldPlayItem[],
  existingCart: CartLine[] = [],
  openSuperPalesInput?: OpenSuperPaleView[]
): DuplicateTicketApplyResult {
  const selected = new Set(selectedKeys);
  const filtered = filterItemsByLotteryKeys(items, selected);

  if (filtered.length === 0) {
    return {
      lines: [],
      addedCount: 0,
      errors: ["Seleccione al menos una lotería abierta."],
      warnings: [],
    };
  }

  const { lines, warning } = ticketItemsToCartLines(
    filtered,
    openDraws,
    openSuperPalesInput
  );
  const accepted: CartLine[] = [];
  const errors: string[] = [];
  const cartAccumulator = [...existingCart];

  for (const line of lines) {
    const validation = validatePlayLimitsForLines(
      [line],
      cartAccumulator,
      limitCtx,
      soldItems
    );
    if (!validation.ok) {
      const msg = limitErrorForLine(line, validation);
      if (msg) errors.push(msg);
      continue;
    }
    accepted.push(line);
    cartAccumulator.push(line);
  }

  return {
    lines: accepted,
    addedCount: accepted.length,
    errors,
    warnings: warning ? [warning] : [],
  };
}
