import { RECEIPT_CONFIG } from "./receipt-config";
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
  verificationCode: string;
  createdAt: string | Date;
  totalAmount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  status?: "ACTIVE" | "CANCELLED" | "COPY" | "CANCELED";
  playerName?: string;
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

const W = RECEIPT_CONFIG.thermalWidth;

/** Jerarquía visual del recibo (80mm POS) */
const DIV_L1 = "="; // Nivel 1: empresa, ticket, cierre
const DIV_L2 = "-"; // Nivel 2: lotería

const BET_HIERARCHY: Record<string, number> = {
  QUINIELA: 1,
  PALE: 2,
  TRIPLETA: 3,
  SUPER_PALE: 4,
};

const BET_SHORT: Record<string, string> = {
  QUINIELA: "Q",
  PALE: "P",
  TRIPLETA: "T",
  SUPER_PALE: "SP",
};

function amountPlain(n: number) {
  return n.toFixed(2);
}

function amountReceipt(n: number) {
  return `$${amountPlain(n)}`;
}

/** Línea centrada de exactamente W caracteres */
function lineCenter(text: string): string {
  const t = text.length > W ? text.slice(0, W) : text;
  const pad = W - t.length;
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + t + " ".repeat(pad - left);
}

/** Línea izquierda, máximo W caracteres */
function lineLeft(text: string): string {
  return text.length > W ? text.slice(0, W) : text;
}

/** Dos columnas: izquierda + derecha al borde W */
function lineCols(left: string, right: string): string {
  const r = right.length > 10 ? right.slice(0, 10) : right;
  const maxLeft = W - r.length - 1;
  const l = left.length > maxLeft ? left.slice(0, maxLeft) : left;
  const gap = W - l.length - r.length;
  return l + " ".repeat(Math.max(1, gap)) + r;
}

function lineDivider(char: string = DIV_L1) {
  return char.repeat(W);
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

/**
 * Títulos cortos para recibo 80mm (máx ~22 chars por línea centrada).
 * Basado en tickets POS dominicanos: nombre de marca + horario, sin "Quiniela".
 */
function shortLotteryReceiptTitle(name: string): string[] {
  const n = name.toUpperCase().trim();

  const rules: [RegExp, string | string[]][] = [
    [/LOTEKA/, "LOTEKA"],
    [/LEIDSA/, "LEIDSA"],
    [/GANA\s*M[AÁ]S/, "GANA MAS"],
    [/NACIONAL.*NOCHE/, "NACIONAL NOCHE"],
    [/NACIONAL.*TARDE/, "NACIONAL TARDE"],
    [/NACIONAL/, "NACIONAL"],
    [/PRIMERA.*NOCHE/, ["LA PRIMERA", "NOCHE"]],
    [/PRIMERA.*D[IÍ]A/, ["LA PRIMERA", "DIA"]],
    [/PRIMERA/, "LA PRIMERA"],
    [/NEW YORK.*NOCHE|NY.*PM/, ["NEW YORK", "NOCHE"]],
    [/NEW YORK.*TARDE|NY.*AM/, ["NEW YORK", "TARDE"]],
    [/FLORIDA.*NOCHE/, ["FLORIDA", "NOCHE"]],
    [/FLORIDA.*D[IÍ]A/, ["FLORIDA", "DIA"]],
    [/REAL/, "QUINIELA REAL"],
    [/LOTEDOM|LOTE DOM/, "LOTEDOM"],
    [/SUERTE.*(18|6:00|6PM)/, ["LA SUERTE", "6:00 PM"]],
    [/SUERTE.*(12|12:30)/, ["LA SUERTE", "12:30 PM"]],
    [/SUERTE/, "LA SUERTE"],
    [/KING.*(7|7:30)/, ["KING LOTTERY", "7:30 PM"]],
    [/KING.*(12|12:30)/, ["KING LOTTERY", "12:30 PM"]],
    [/KING/, "KING LOTTERY"],
    [/ANGUILA.*10/, ["ANGUILA", "10:00 AM"]],
    [/ANGUILA.*1(?!0)/, ["ANGUILA", "1:00 PM"]],
    [/ANGUILA.*6/, ["ANGUILA", "6:00 PM"]],
    [/ANGUILA.*9/, ["ANGUILA", "9:00 PM"]],
    [/ANGUILA/, "ANGUILA"],
  ];

  for (const [re, title] of rules) {
    if (re.test(n)) {
      return Array.isArray(title) ? title : [title];
    }
  }

  const clean = n
    .replace(/^QUINIELA\s+/i, "")
    .replace(/^LA\s+/i, "LA ");
  return wrapTitleWords(clean);
}

/** Parte títulos largos en líneas de máx 22 caracteres */
function wrapTitleWords(title: string): string[] {
  const max = 22;
  if (title.length <= max) return [title];

  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) {
      if (current) lines.push(current);
      current = word.length > max ? word.slice(0, max) : word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [title.slice(0, max)];
}

/**
 * Bloque de título de lotería — todo centrado (estándar banca):
 * ──────
 *   NOMBRE
 *   MONTO
 *   FECHA / HORA
 * ──────
 */
function lotteryTitleOneLine(name: string): string {
  return shortLotteryReceiptTitle(name).join(" ");
}

/** Marcador para título de lotería (render HTML más grande en pantalla) */
export function lotteryTitleMarker(title: string): string {
  return `@LOT@${title}@`;
}

export function isLotteryTitleLine(line: string): string | null {
  const m = line.match(/^@LOT@(.+)@$/);
  return m ? m[1] : null;
}

/** Marcador para jugada + monto apostado (render destacado en pantalla) */
export function betLineMarker(play: string, amount: number): string {
  return `@BET@${play}|${amountReceipt(amount)}@`;
}

export function parseBetLine(
  line: string
): { play: string; amount: string } | null {
  const m = line.match(/^@BET@(.+)\|(\$[\d.]+)@$/);
  return m ? { play: m[1], amount: m[2] } : null;
}

function formatLotteryBlockHeader(group: LotteryBetGroup): string[] {
  const draw =
    group.drawDate && group.drawTime
      ? `${group.drawDate} ${group.drawTime}`
      : group.drawDate || group.drawTime;

  return [
    lineDivider(DIV_L2),
    lotteryTitleMarker(lotteryTitleOneLine(group.name)),
    lineCenter(`${draw} · $${amountPlain(group.subtotal)}`),
  ];
}

function formatLotteryBets(bets: LotteryBetLine[]): string[] {
  const out: string[] = [lineCols("JUGADA", "JUGÓ")];
  const sorted = sortBetsByHierarchy(bets);

  for (const bet of sorted) {
    const prefix = BET_SHORT[bet.betType] ?? bet.betType.slice(0, 2);
    out.push(betLineMarker(`${prefix} ${bet.numbers}`, bet.amount));
    if (bet.betType === "SUPER_PALE" && bet.superPaleName) {
      out.push(lineLeft(`  ${bet.superPaleName}`));
    }
  }

  return out;
}

function formatSectionBusiness(cfg: typeof RECEIPT_CONFIG): string[] {
  const meta = [cfg.tagline, cfg.branch].filter(Boolean).join(" · ");
  return [
    lineCenter(cfg.businessName),
    ...(meta ? [lineCenter(meta)] : []),
    ...(cfg.phone ? [lineCenter(cfg.phone)] : []),
  ];
}

function formatSectionTicket(data: ReceiptData): string[] {
  const saleDate = formatReceiptDate(data.createdAt);
  const saleTime = formatReceiptTime(data.createdAt);
  const out: string[] = [];

  if (data.status === "COPY") {
    out.push(lineCenter(`** COPIA **`));
  } else if (data.status === "CANCELLED" || data.status === "CANCELED") {
    out.push(lineCenter("* CANCELADO *"));
  }

  out.push(lineLeft(`Tck: ${data.ticketNumber}`));
  out.push(lineLeft(`${saleDate} ${saleTime}`));
  if (data.playerName) {
    out.push(lineLeft(`Jug: ${data.playerName} · ${statusLabel(data.status)}`));
  } else {
    out.push(lineLeft(`Est: ${statusLabel(data.status)}`));
  }
  out.push(...wrapHash(formatVerificationDisplay(data.verificationCode)));
  return out;
}

function formatSectionLotteries(groups: LotteryBetGroup[]): string[] {
  const sorted = sortLotteriesByTime(groups);
  const out: string[] = [];

  for (const lot of sorted) {
    out.push(...formatLotteryBlockHeader(lot));
    out.push(...formatLotteryBets(lot.bets));
  }

  return out;
}

function formatSectionSummary(data: ReceiptData): string[] {
  const out: string[] = [
    lineDivider(DIV_L2),
    lineCenter(`TOTAL: $${amountPlain(data.totalAmount)} · ${data.items.length} jug.`),
  ];

  if (data.balanceBefore != null && data.balanceAfter != null) {
    out.push(
      lineLeft(
        `Bal: ${amountPlain(data.balanceBefore)} > ${amountPlain(data.balanceAfter)}`
      )
    );
  } else if (data.balanceAfter != null) {
    out.push(lineLeft(`Bal: ${amountPlain(data.balanceAfter)}`));
  }

  out.push(lineCenter("1st:$56 2nd:$12 3rd:$4 Pale:1300 Tri:$10k"));
  return out;
}

function formatSectionFooter(cfg: typeof RECEIPT_CONFIG): string[] {
  return [
    lineDivider(DIV_L1),
    lineCenter("NO TICKET, NO MONEY"),
    lineCenter(cfg.footerLines[0]),
    lineDivider(DIV_L1),
  ];
}

function wrapHash(code: string): string[] {
  if (code.length <= W) return [lineLeft(`Hash: ${code}`)];
  const half = Math.ceil(code.length / 2);
  return [
    lineLeft(`Hash: ${code.slice(0, half)}`),
    lineLeft(code.slice(half)),
  ];
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
  const clean = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length <= 12) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
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
    if (!map.has(item.lotteryName)) {
      map.set(item.lotteryName, {
        name: item.lotteryName,
        drawTime: item.drawTime ? formatTime12(item.drawTime) : "",
        drawDate: formatDrawDateShort(item.drawDate),
        drawTime24: item.drawTime ?? "",
        subtotal: 0,
        bets: [],
      });
    }
    const group = map.get(item.lotteryName)!;
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

function buildReceiptLines(data: ReceiptData): string[] {
  const err = validateReceiptData(data);
  if (err) throw new Error(err);

  const cfg = RECEIPT_CONFIG;
  const lotteryGroups = groupReceiptByLottery(data.items);

  return [
    ...formatSectionBusiness(cfg),
    ...formatSectionTicket(data),
    ...formatSectionLotteries(lotteryGroups),
    ...formatSectionSummary(data),
    ...formatSectionFooter(cfg),
  ];
}

function plainReceiptLine(line: string): string {
  const title = isLotteryTitleLine(line);
  if (title) return lineCenter(title);
  const bet = parseBetLine(line);
  if (bet) return lineCols(bet.play, bet.amount);
  return line;
}

export function formatThermalReceipt(data: ReceiptData): string {
  return buildReceiptLines(data).map(plainReceiptLine).join("\n");
}

export function buildReceiptLinesForDisplay(data: ReceiptData): string[] {
  return buildReceiptLines(data);
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
