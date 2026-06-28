import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { roundMoney } from "./cajero-banca-config";
import type { CartLine } from "./tickets";
import { dateKeyInTz } from "./timezone";
import {
  fetchTodaySoldPlayItems,
  playLimitsBlockMessage,
  type PlayLimitSettings,
  validatePlayLimitsForLines,
} from "./play-limits";
import { formatMoney } from "./utils";
import {
  loadPlayLimitContext,
} from "./play-limit-context";

export type BancaSettingsView = {
  bancaName: string;
  terminalCode: string;
  defaultOpeningBalance: number;
  expensiveDirectoAmount: number;
  maxDirectoPerNumber: number;
  maxPalePerNumber: number;
  maxTripletaPerNumber: number;
  maxSuperPalePerNumber: number;
  playLimitsMode: "GLOBAL" | "PER_LOTTERY";
};

export type BancaStatusView = {
  settings: BancaSettingsView;
  sessionDate: string;
  status: string;
  openingBalance: number;
  currentBalance: number;
  closingBalance: number | null;
};

export function toPlayLimitSettings(
  settings: BancaSettingsView
): PlayLimitSettings {
  return {
    maxDirectoPerNumber: settings.maxDirectoPerNumber,
    maxPalePerNumber: settings.maxPalePerNumber,
    maxTripletaPerNumber: settings.maxTripletaPerNumber,
    maxSuperPalePerNumber: settings.maxSuperPalePerNumber,
  };
}

export async function getBancaSettings(): Promise<BancaSettingsView> {
  const row = await prisma.bancaSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {},
  });
  return {
    bancaName: row.bancaName,
    terminalCode: row.terminalCode,
    defaultOpeningBalance: row.defaultOpeningBalance,
    expensiveDirectoAmount: row.expensiveDirectoAmount,
    maxDirectoPerNumber: row.maxDirectoPerNumber,
    maxPalePerNumber: row.maxPalePerNumber,
    maxTripletaPerNumber: row.maxTripletaPerNumber,
    maxSuperPalePerNumber: row.maxSuperPalePerNumber,
    playLimitsMode:
      row.playLimitsMode === "PER_LOTTERY" ? "PER_LOTTERY" : "GLOBAL",
  };
}

export async function updateBancaSettings(
  patch: Partial<BancaSettingsView>
): Promise<BancaSettingsView> {
  const row = await prisma.bancaSettings.upsert({
    where: { id: "default" },
    update: patch,
    create: {
      id: "default",
      ...patch,
    },
  });
  return {
    bancaName: row.bancaName,
    terminalCode: row.terminalCode,
    defaultOpeningBalance: row.defaultOpeningBalance,
    expensiveDirectoAmount: row.expensiveDirectoAmount,
    maxDirectoPerNumber: row.maxDirectoPerNumber,
    maxPalePerNumber: row.maxPalePerNumber,
    maxTripletaPerNumber: row.maxTripletaPerNumber,
    maxSuperPalePerNumber: row.maxSuperPalePerNumber,
    playLimitsMode:
      row.playLimitsMode === "PER_LOTTERY" ? "PER_LOTTERY" : "GLOBAL",
  };
}

async function lastClosedBalance(terminalCode: string): Promise<number | null> {
  const last = await prisma.bancaDaySession.findFirst({
    where: { terminalCode, status: "CLOSED", closingBalance: { not: null } },
    orderBy: { sessionDate: "desc" },
  });
  return last?.closingBalance ?? null;
}

export async function ensureTodayBancaSession(
  cajeroId: string
): Promise<BancaStatusView> {
  const settings = await getBancaSettings();
  const sessionDate = dateKeyInTz(new Date());

  let session = await prisma.bancaDaySession.findUnique({
    where: {
      terminalCode_sessionDate: {
        terminalCode: settings.terminalCode,
        sessionDate,
      },
    },
  });

  if (!session) {
    const carry = await lastClosedBalance(settings.terminalCode);
    const opening = roundMoney(carry ?? settings.defaultOpeningBalance);
    session = await prisma.bancaDaySession.create({
      data: {
        terminalCode: settings.terminalCode,
        sessionDate,
        openingBalance: opening,
        currentBalance: opening,
        openedById: cajeroId,
        transactions: {
          create: {
            type: "OPEN",
            amount: opening,
            balanceBefore: 0,
            balanceAfter: opening,
            note: `Apertura ${sessionDate}`,
            createdById: cajeroId,
          },
        },
      },
    });
  }

  return {
    settings,
    sessionDate: session.sessionDate,
    status: session.status,
    openingBalance: session.openingBalance,
    currentBalance: session.currentBalance,
    closingBalance: session.closingBalance,
  };
}

export async function getBancaStatus(cajeroId: string): Promise<BancaStatusView> {
  return ensureTodayBancaSession(cajeroId);
}

async function applyBancaDelta(
  cajeroId: string,
  type: string,
  delta: number,
  note?: string
) {
  const settings = await getBancaSettings();
  const sessionDate = dateKeyInTz(new Date());
  const session = await prisma.bancaDaySession.findUnique({
    where: {
      terminalCode_sessionDate: {
        terminalCode: settings.terminalCode,
        sessionDate,
      },
    },
  });
  if (!session || session.status !== "OPEN") {
    throw new Error("No hay sesión de banca abierta hoy.");
  }

  const balanceBefore = session.currentBalance;
  const balanceAfter = roundMoney(balanceBefore + delta);

  await prisma.$transaction([
    prisma.bancaDaySession.update({
      where: { id: session.id },
      data: { currentBalance: balanceAfter },
    }),
    prisma.bancaTransaction.create({
      data: {
        sessionId: session.id,
        type,
        amount: delta,
        balanceBefore,
        balanceAfter,
        note,
        createdById: cajeroId,
      },
    }),
  ]);

  return balanceAfter;
}

export async function rechargeBanca(
  cajeroId: string,
  amount: number,
  note?: string
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Monto de recarga inválido.");
  }
  return applyBancaDelta(
    cajeroId,
    "RECHARGE",
    amount,
    note?.trim() || "Recarga de venta"
  );
}

export async function closeBancaDay(cajeroId: string) {
  const settings = await getBancaSettings();
  const sessionDate = dateKeyInTz(new Date());
  const session = await prisma.bancaDaySession.findUnique({
    where: {
      terminalCode_sessionDate: {
        terminalCode: settings.terminalCode,
        sessionDate,
      },
    },
  });
  if (!session) throw new Error("No hay sesión de banca para cerrar.");
  if (session.status === "CLOSED") throw new Error("La banca ya está cerrada.");

  const closingBalance = session.currentBalance;
  await prisma.$transaction([
    prisma.bancaDaySession.update({
      where: { id: session.id },
      data: {
        status: "CLOSED",
        closingBalance,
        closedAt: new Date(),
      },
    }),
    prisma.bancaTransaction.create({
      data: {
        sessionId: session.id,
        type: "CLOSE",
        amount: 0,
        balanceBefore: closingBalance,
        balanceAfter: closingBalance,
        note: `Cierre ${sessionDate}`,
        createdById: cajeroId,
      },
    }),
  ]);

  return closingBalance;
}

export async function recordBancaCashSale(
  cajeroId: string,
  totalAmount: number,
  ticketNumber: string
) {
  return applyBancaDelta(
    cajeroId,
    "SALE",
    totalAmount,
    `Venta ${ticketNumber}`
  );
}

export async function recordBancaCashCancel(
  cajeroId: string,
  totalAmount: number,
  ticketNumber: string
) {
  return applyBancaDelta(
    cajeroId,
    "CANCEL",
    -totalAmount,
    `Anulación ${ticketNumber}`
  );
}

export async function recordBancaPrizePaid(
  cajeroId: string,
  prize: number,
  ticketNumber: string
) {
  return applyBancaDelta(
    cajeroId,
    "PRIZE",
    -prize,
    `Premio ${ticketNumber}`
  );
}

export type SellLimitWarning = {
  type: "expensive_directo" | "number_limit";
  message: string;
};

function computeSellLimitWarnings(
  lines: CartLine[],
  settings: BancaSettingsView
): SellLimitWarning[] {
  const warnings: SellLimitWarning[] = [];

  for (const line of lines) {
    if (line.betType === "QUINIELA" && line.amount >= settings.expensiveDirectoAmount) {
      warnings.push({
        type: "expensive_directo",
        message: `Directo costoso: ${line.numbers} por ${formatMoney(line.amount)} (límite ${formatMoney(settings.expensiveDirectoAmount)}).`,
      });
    }
  }

  return warnings;
}

/** Validación previa (UI). La venta real revalida dentro de la transacción. */
export async function validateSellLimits(
  lines: CartLine[],
  cart: CartLine[] = []
): Promise<SellLimitWarning[]> {
  const settings = await getBancaSettings();
  const ctx = await loadPlayLimitContext();
  const sold = await fetchTodaySoldPlayItems();
  const validation = validatePlayLimitsForLines(
    lines,
    cart,
    ctx,
    sold
  );
  const hard = playLimitsBlockMessage(validation);
  const warnings = computeSellLimitWarnings(lines, settings);
  if (hard) {
    warnings.push({ type: "number_limit", message: hard });
  }
  return warnings;
}

/** Validación autoritativa dentro de la venta transaccional (anti TOCTOU). */
export async function validateSellLimitsInTx(
  tx: Prisma.TransactionClient,
  lines: CartLine[],
  settings: BancaSettingsView,
  cart: CartLine[] = []
): Promise<SellLimitWarning[]> {
  const ctx = await loadPlayLimitContext();
  const drawIds = [
    ...new Set(lines.flatMap((line) => line.drawIds)),
  ];
  const sold = await fetchTodaySoldPlayItems(tx, drawIds);
  const validation = validatePlayLimitsForLines(
    lines,
    cart,
    ctx,
    sold
  );
  const hard = playLimitsBlockMessage(validation);
  const warnings = computeSellLimitWarnings(lines, settings);
  if (hard) {
    warnings.push({ type: "number_limit", message: hard });
  }
  return warnings;
}

export function sellLimitsBlockSale(warnings: SellLimitWarning[]): string | null {
  const hard = warnings.find((w) => w.type === "number_limit");
  return hard?.message ?? null;
}

export async function validatePlayLimitsForCart(
  pendingLines: CartLine[],
  cartLines: CartLine[] = []
) {
  const ctx = await loadPlayLimitContext();
  const drawIds = [
    ...new Set([
      ...pendingLines.flatMap((line) => line.drawIds),
      ...cartLines.flatMap((line) => line.drawIds),
    ]),
  ];
  const sold = await fetchTodaySoldPlayItems(undefined, drawIds);
  return validatePlayLimitsForLines(pendingLines, cartLines, ctx, sold);
}
