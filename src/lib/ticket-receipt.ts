import { RECEIPT_CONFIG } from "./receipt-config";
import {
  getSuperPaleDefinition,
  superPaleReceiptTitle,
} from "./super-pale";
import { formatTime12 } from "./utils";

export type ReceiptItem = {
  betType: string;
  numbers: string;
  amount: number;
  lotteryName: string;
  drawTime?: string;
  drawDate?: string | Date;
  superPaleName?: string | null;
};

export type ReceiptData = {
  ticketNumber: string;
  internalTicketCode?: string | null;
  verificationCode: string;
  createdAt: string | Date;
  totalAmount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  status?: "ACTIVE" | "CANCELLED" | "COPY" | "CANCELED";
  paymentMethod?: "WALLET" | "CASH";
  playerName?: string;
  businessName?: string;
  items: ReceiptItem[];
};

export type GroupedBet = {
  betType: string;
  numbers: string;
  amount: number;
  lotteries: { name: string; drawTime: string; drawDate: string }[];
  superPaleName?: string | null;
};

export type LotteryEntry = {
  name: string;
  drawTime: string;
  drawDate: string;
};

export type LotteryBetLine = {
  betType: string;
  numbers: string;
  amount: number;
  superPaleName?: string | null;
};

export type LotteryBetGroup = {
  name: string;
  drawTime: string;
  drawDate: string;
  drawTime24: string;
  subtotal: number;
  bets: LotteryBetLine[];
};

export type ReceiptDisplayLine =
  | { type: "brand"; text: string }
  | { type: "status"; text: string }
  | { type: "datetime"; text: string }
  | { type: "ticket-hero"; text: string }
  | { type: "meta"; label: string; value: string }
  | { type: "hash"; text: string }
  | { type: "divider" }
  | { type: "lottery"; title: string; subtotal: string }
  | { type: "col-header" }
  | {
      type: "bet-row";
      left: { play: string; amount: string };
      right?: { play: string; amount: string };
    }
  | { type: "total"; amount: string }
  | { type: "balance"; before: string; after: string }
  | { type: "prizes"; text: string }
  | { type: "footer"; text: string };

const W = RECEIPT_CONFIG.thermalWidth;

const BET_HIERARCHY: Record<string, number> = {
  QUINIELA: 1,
  PALE: 2,
  TRIPLETA: 3,
  SUPER_PALE: 4,
};

function amountPlain(n: number) {
  return n.toFixed(2);
}

function amountReceipt(n: number) {
  return amountPlain(n);
}

function lineCenter(text: string): string {
  const t = text.length > W ? text.slice(0, W) : text;
  const pad = W - t.length;
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + t + " ".repeat(pad - left);
}

function lineLeft(text: string): string {
  return text.length > W ? text.slice(0, W) : text;
}

function lineDivider(): string {
  return "=".repeat(W);
}

function parseTime24(time: string): number {
  if (!time) return 9999;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 9999;
  return h * 60 + m;
}

function sortLotteriesByTime(groups: LotteryBetGroup[]): LotteryBetGroup[] {
  return [...groups].sort(
    (a, b) => parseTime24(a.drawTime24) - parseTime24(b.drawTime24)
  );
}

function sortBetsByHierarchy(bets: LotteryBetLine[]): LotteryBetLine[] {
  return [...bets].sort((a, b) => {
    const oa = BET_HIERARCHY[a.betType] ?? 99;
    const ob = BET_HIERARCHY[b.betType] ?? 99;
    if (oa !== ob) return oa - ob;
    return a.numbers.localeCompare(b.numbers);
  });
}

function shortLotteryReceiptTitle(name: string): string {
  const n = name.toUpperCase().trim();

  if (/SUPER\s*PAL/.test(n)) {
    return superPaleReceiptTitle(name);
  }
  const spDef = getSuperPaleDefinition(name);
  if (spDef) {
    return superPaleReceiptTitle(spDef.code);
  }

  const rules: [RegExp, string][] = [
    [/LOTEKA/, "LOTEKA"],
    [/LEIDSA/, "LEIDSA"],
    [/GANA\s*M[AÁ]S/, "GANA MAS"],
    [/NACIONAL.*NOCHE/, "NACIONAL NOCHE"],
    [/NACIONAL.*TARDE/, "NACIONAL TARDE"],
    [/NACIONAL/, "NACIONAL"],
    [/PRIMERA.*NOCHE/, "LA PRIMERA NOCHE"],
    [/PRIMERA.*D[IÍ]A/, "LA PRIMERA DIA"],
    [/PRIMERA/, "LA PRIMERA"],
    [/NEW JERSEY.*NOCHE|NEW JERSEY.*PM|NJ.*PM/, "NEW JERSEY PM"],
    [/NEW JERSEY.*TARDE|NEW JERSEY.*AM|NJ.*AM/, "NEW JERSEY AM"],
    [/NEW YORK.*NOCHE|NEW YORK.*PM/, "NEW YORK PM"],
    [/NEW YORK.*TARDE|NEW YORK.*AM/, "NEW YORK AM"],
    [/NEW YORK/, "NEW YORK"],
    [/FLORIDA.*NOCHE|FL.*PM/, "FLORIDA PM"],
    [/FLORIDA.*D[IÍ]A|FL.*AM/, "FLORIDA AM"],
    [/REAL/, "QUINIELA REAL"],
    [/LOTEDOM|LOTE DOM/, "LOTEDOM"],
    [/SUERTE.*(18|6:00|6PM)/, "LA SUERTE 6PM"],
    [/SUERTE.*(12|12:30)/, "LA SUERTE 12PM"],
    [/SUERTE/, "LA SUERTE"],
    [/KING.*(7|7:30)/, "KING 7:30 PM"],
    [/KING.*(12|12:30)/, "KING 12:30 PM"],
    [/KING/, "KING LOTTERY"],
    [/ANGUILA.*10/, "ANGUILA 10AM"],
    [/ANGUILA.*1(?!0)/, "ANGUILA 1 P.M"],
    [/ANGUILA.*6/, "ANGUILA 6 P.M"],
    [/ANGUILA.*9/, "ANGUILA 9 P.M"],
    [/ANGUILA/, "ANGUILA"],
  ];

  for (const [re, title] of rules) {
    if (re.test(n)) return title;
  }

  return n.replace(/^QUINIELA\s+/i, "").replace(/^LA\s+/i, "LA ").slice(0, 28);
}

function formatBetPlayLabel(bet: LotteryBetLine): string {
  if (bet.betType === "QUINIELA") {
    return bet.numbers.replace(/-/g, "");
  }
  return bet.numbers;
}

function statusBanner(status?: ReceiptData["status"]): string | null {
  if (status === "COPY") return "** COPIA **";
  if (status === "CANCELLED" || status === "CANCELED") return "* CANCELADO *";
  return "** ORIGINAL **";
}

export function validateReceiptData(data: ReceiptData): string | null {
  if (!data.ticketNumber?.trim()) return "Ticket sin número.";
  if (!data.verificationCode?.trim()) return "Ticket sin código de verificación.";
  if (!data.createdAt) return "Ticket sin fecha.";
  if (!data.items?.length) return "Ticket sin jugadas.";
  if (data.totalAmount < 0) return "Total inválido.";
  for (const item of data.items) {
    if (!item.lotteryName) return "Jugada sin lotería.";
    if (item.amount < 0) return "Monto negativo.";
    if (!item.numbers) return "Jugada sin números.";
  }
  const sum = data.items.reduce((s, i) => s + i.amount, 0);
  if (Math.abs(sum - data.totalAmount) > 0.01) return "Total incorrecto.";
  return null;
}

export function formatReceiptDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-DO", {
    timeZone: RECEIPT_CONFIG.timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatReceiptTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d
    .toLocaleTimeString("en-US", {
      timeZone: RECEIPT_CONFIG.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDrawDateShort(drawDate?: string | Date): string {
  if (!drawDate) return "";
  const d = typeof drawDate === "string" ? new Date(drawDate) : drawDate;
  return d.toLocaleDateString("es-DO", {
    timeZone: RECEIPT_CONFIG.timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function statusLabel(status?: ReceiptData["status"]) {
  if (status === "CANCELLED" || status === "CANCELED") return "CANCELADO";
  if (status === "COPY") return "COPIA";
  return "ACTIVO";
}

export function formatVerificationDisplay(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function groupReceiptBets(items: ReceiptItem[]): GroupedBet[] {
  const map = new Map<string, GroupedBet>();
  for (const item of items) {
    const key = `${item.betType}|${item.numbers}|${item.amount}|${item.superPaleName ?? ""}`;
    if (!map.has(key)) {
      map.set(key, {
        betType: item.betType,
        numbers: item.numbers,
        amount: item.amount,
        lotteries: [],
        superPaleName: item.superPaleName,
      });
    }
    const group = map.get(key)!;
    if (!group.lotteries.some((l) => l.name === item.lotteryName)) {
      group.lotteries.push({
        name: item.lotteryName,
        drawTime: item.drawTime ?? "",
        drawDate: formatDrawDateShort(item.drawDate),
      });
    }
  }
  return [...map.values()];
}

export function uniqueLotteries(items: ReceiptItem[]): LotteryEntry[] {
  const map = new Map<string, LotteryEntry>();
  for (const item of items) {
    if (!map.has(item.lotteryName)) {
      map.set(item.lotteryName, {
        name: item.lotteryName,
        drawTime: item.drawTime ? formatTime12(item.drawTime) : "",
        drawDate: formatDrawDateShort(item.drawDate),
      });
    }
  }
  return [...map.values()];
}

export function groupReceiptByLottery(items: ReceiptItem[]): LotteryBetGroup[] {
  const map = new Map<string, LotteryBetGroup>();
  for (const item of items) {
    const isSuperPale = Boolean(item.superPaleName);
    const groupKey = isSuperPale
      ? `__sp__:${item.superPaleName}`
      : item.lotteryName;
    const displayName = isSuperPale
      ? superPaleReceiptTitle(item.superPaleName)
      : item.lotteryName;

    if (!map.has(groupKey)) {
      map.set(groupKey, {
        name: displayName,
        drawTime: item.drawTime ? formatTime12(item.drawTime) : "",
        drawDate: formatDrawDateShort(item.drawDate),
        drawTime24: item.drawTime ?? "",
        subtotal: 0,
        bets: [],
      });
    }
    const group = map.get(groupKey)!;
    group.subtotal += item.amount;
    group.bets.push({
      betType: item.betType,
      numbers: item.numbers,
      amount: item.amount,
      superPaleName: item.superPaleName,
    });
  }
  return [...map.values()];
}

function lotteryBlockTitle(group: LotteryBetGroup): string {
  const base = shortLotteryReceiptTitle(group.name);
  if (group.drawTime && !base.toUpperCase().includes(group.drawTime.toUpperCase().replace(/\s/g, ""))) {
    return `${base} ${group.drawTime}`.trim();
  }
  return base;
}

function pairBets(
  bets: LotteryBetLine[]
): { left: { play: string; amount: string }; right?: { play: string; amount: string } }[] {
  const sorted = sortBetsByHierarchy(bets);
  const rows: {
    left: { play: string; amount: string };
    right?: { play: string; amount: string };
  }[] = [];

  for (let i = 0; i < sorted.length; i += 2) {
    const left = sorted[i];
    const right = sorted[i + 1];
    rows.push({
      left: {
        play: formatBetPlayLabel(left),
        amount: amountReceipt(left.amount),
      },
      right: right
        ? {
            play: formatBetPlayLabel(right),
            amount: amountReceipt(right.amount),
          }
        : undefined,
    });
  }

  return rows;
}

export function buildReceiptDisplayLines(data: ReceiptData): ReceiptDisplayLine[] {
  const err = validateReceiptData(data);
  if (err) throw new Error(err);

  const brand = data.businessName ?? RECEIPT_CONFIG.businessName;
  const saleDate = formatReceiptDate(data.createdAt);
  const saleTime = formatReceiptTime(data.createdAt);
  const now = new Date();
  const printStamp = `${formatReceiptDate(now)} ${formatReceiptTime(now)}`;
  const hash = formatVerificationDisplay(data.verificationCode);
  const groups = sortLotteriesByTime(groupReceiptByLottery(data.items));

  const lines: ReceiptDisplayLine[] = [];

  const banner = statusBanner(data.status);
  if (banner) lines.push({ type: "status", text: banner });

  lines.push({ type: "brand", text: brand });
  lines.push({ type: "datetime", text: printStamp });
  lines.push({ type: "ticket-hero", text: `TICKET: ${data.ticketNumber}` });
  if (data.internalTicketCode && data.internalTicketCode !== data.ticketNumber) {
    lines.push({
      type: "meta",
      label: "Código interno:",
      value: data.internalTicketCode,
    });
  }
  lines.push({ type: "meta", label: "Fecha:", value: `${saleDate} ${saleTime}` });
  lines.push({ type: "hash", text: hash });

  for (const group of groups) {
    lines.push({ type: "divider" });
    lines.push({
      type: "lottery",
      title: lotteryBlockTitle(group),
      subtotal: amountPlain(group.subtotal),
    });
    lines.push({ type: "divider" });

    const rows = pairBets(group.bets);
    if (rows.length > 0) {
      lines.push({ type: "col-header" });
      for (const row of rows) {
        lines.push({ type: "bet-row", ...row });
      }
    }
  }

  lines.push({ type: "total", amount: amountPlain(data.totalAmount) });

  if (data.balanceBefore != null && data.balanceAfter != null) {
    lines.push({
      type: "balance",
      before: amountPlain(data.balanceBefore),
      after: amountPlain(data.balanceAfter),
    });
  }

  lines.push({ type: "prizes", text: RECEIPT_CONFIG.prizeFooter });
  lines.push({ type: "footer", text: "NO TIKET, NO MONEY" });

  return lines;
}

function displayLineToPlain(line: ReceiptDisplayLine): string[] {
  switch (line.type) {
    case "brand":
      return [lineCenter(line.text)];
    case "status":
    case "datetime":
    case "footer":
      return [lineCenter(line.text)];
    case "ticket-hero":
      return [lineCenter(line.text)];
    case "meta":
      return [lineLeft(`${line.label} ${line.value}`)];
    case "hash":
      return line.text.length > W
        ? [lineLeft(line.text.slice(0, W)), lineLeft(line.text.slice(W))]
        : [lineLeft(line.text)];
    case "divider":
      return [lineDivider()];
    case "lottery":
      return [lineCenter(`${line.title}: ${line.subtotal}`)];
    case "col-header":
      return [lineLeft("JUGADA  MONTO   JUGADA  MONTO")];
    case "bet-row": {
      const l = `${line.left.play} ${line.left.amount}`.padEnd(21);
      const r = line.right ? `${line.right.play} ${line.right.amount}` : "";
      return [lineLeft(`${l}${r}`.trimEnd())];
    }
    case "total":
      return [lineCenter(`-- TOTAL: ${line.amount} --`)];
    case "balance":
      return [lineLeft(`Bal ${line.before} > ${line.after}`)];
    case "prizes":
      return [lineCenter(line.text)];
    default:
      return [];
  }
}

export function formatThermalReceipt(data: ReceiptData): string {
  return buildReceiptDisplayLines(data)
    .flatMap((l) => displayLineToPlain(l))
    .join("\n");
}

export function buildReceiptLinesForDisplay(data: ReceiptData): string[] {
  return buildReceiptDisplayLines(data).flatMap((l) => displayLineToPlain(l));
}

/** @deprecated Marcadores legacy — mantener por compatibilidad interna */
export function lotteryTitleMarker(title: string): string {
  return `@LOT@${title}@`;
}

export function isLotteryTitleLine(line: string): string | null {
  const m = line.match(/^@LOT@(.+)@$/);
  return m ? m[1] : null;
}

export function betLineMarker(play: string, amount: string | number): string {
  const a = typeof amount === "number" ? amountReceipt(amount) : amount;
  return `@BET@${play}|$${a}@`;
}

export function parseBetLine(
  line: string
): { play: string; amount: string } | null {
  const m = line.match(/^@BET@(.+)\|(\$?[\d.]+)@$/);
  return m ? { play: m[1], amount: m[2].startsWith("$") ? m[2] : `$${m[2]}` } : null;
}

export function formatFullTicketReceipt(
  items: {
    lotteryName: string;
    numbers: string;
    amount: number;
    betType?: string;
    drawTime?: string;
    drawDate?: string;
  }[],
  meta: {
    ticketNumber: string;
    verificationCode: string;
    createdAt: Date | string;
    totalAmount?: number;
    balanceBefore?: number;
    balanceAfter?: number;
    status?: ReceiptData["status"];
    playerName?: string;
    businessName?: string;
  }
): string {
  return formatThermalReceipt({
    ticketNumber: meta.ticketNumber,
    verificationCode: meta.verificationCode,
    createdAt: meta.createdAt,
    totalAmount: meta.totalAmount ?? items.reduce((s, i) => s + i.amount, 0),
    balanceBefore: meta.balanceBefore,
    balanceAfter: meta.balanceAfter,
    status: meta.status,
    playerName: meta.playerName,
    businessName: meta.businessName,
    items: items.map((i) => ({
      betType: i.betType ?? "QUINIELA",
      numbers: i.numbers,
      amount: i.amount,
      lotteryName: i.lotteryName,
      drawTime: i.drawTime,
      drawDate: i.drawDate,
    })),
  });
}
