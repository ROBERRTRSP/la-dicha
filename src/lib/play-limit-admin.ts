import type { BancaSettingsView } from "./banca-session";
import type { LotteryPlayLimitView } from "./play-limit-context";
import { BET_AMOUNT_MAX, BET_AMOUNT_MIN } from "./cart-limits";

export type PlayLimitAdminPatch = Partial<
  Pick<
    BancaSettingsView,
    | "maxDirectoPerNumber"
    | "maxPalePerNumber"
    | "maxTripletaPerNumber"
    | "maxSuperPalePerNumber"
    | "expensiveDirectoAmount"
    | "bancaName"
    | "terminalCode"
    | "playLimitsMode"
  >
>;

export type LotteryLimitPatch = {
  lotteryId: string;
  maxDirectoPerNumber?: number | null;
  maxPalePerNumber?: number | null;
  maxTripletaPerNumber?: number | null;
};

export type PlayLimitAdminSaveBody = PlayLimitAdminPatch & {
  lotteryLimits?: LotteryLimitPatch[];
};

const LIMIT_KEYS = [
  "maxDirectoPerNumber",
  "maxPalePerNumber",
  "maxTripletaPerNumber",
  "maxSuperPalePerNumber",
  "expensiveDirectoAmount",
] as const;

function clampLimit(value: unknown, fallback: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, BET_AMOUNT_MIN), BET_AMOUNT_MAX);
}

function clampOptionalLimit(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(Math.max(n, BET_AMOUNT_MIN), BET_AMOUNT_MAX);
}

export function validatePlayLimitAdminPatch(
  raw: PlayLimitAdminSaveBody,
  current: BancaSettingsView
): {
  settings: PlayLimitAdminPatch;
  lotteryLimits: LotteryLimitPatch[];
} {
  const out: PlayLimitAdminPatch = {};
  const lotteryLimits: LotteryLimitPatch[] = [];

  for (const key of LIMIT_KEYS) {
    if (raw[key] !== undefined) {
      out[key] = clampLimit(raw[key], current[key]);
    }
  }

  if (raw.playLimitsMode !== undefined) {
    out.playLimitsMode =
      raw.playLimitsMode === "PER_LOTTERY" ? "PER_LOTTERY" : "GLOBAL";
  }

  if (raw.bancaName !== undefined) {
    const name = String(raw.bancaName).trim();
    if (name.length >= 2) out.bancaName = name.slice(0, 40);
  }

  if (raw.terminalCode !== undefined) {
    const code = String(raw.terminalCode).trim().toLowerCase();
    if (/^[a-z0-9-]{3,24}$/.test(code)) out.terminalCode = code;
  }

  if (Array.isArray(raw.lotteryLimits)) {
    for (const row of raw.lotteryLimits) {
      if (!row?.lotteryId) continue;
      lotteryLimits.push({
        lotteryId: row.lotteryId,
        maxDirectoPerNumber: clampOptionalLimit(row.maxDirectoPerNumber),
        maxPalePerNumber: clampOptionalLimit(row.maxPalePerNumber),
        maxTripletaPerNumber: clampOptionalLimit(row.maxTripletaPerNumber),
      });
    }
  }

  if (Object.keys(out).length === 0 && lotteryLimits.length === 0) {
    throw new Error("No hay cambios válidos para guardar.");
  }

  return { settings: out, lotteryLimits };
}

export const PLAY_LIMIT_GLOBAL_LABELS: {
  key: keyof Pick<
    BancaSettingsView,
    | "maxDirectoPerNumber"
    | "maxPalePerNumber"
    | "maxTripletaPerNumber"
    | "maxSuperPalePerNumber"
    | "expensiveDirectoAmount"
  >;
  label: string;
  hint: string;
  perLottery?: boolean;
}[] = [
  {
    key: "maxDirectoPerNumber",
    label: "Directo (quiniela)",
    hint: "Máximo vendido al mismo número por lotería y día.",
    perLottery: true,
  },
  {
    key: "maxPalePerNumber",
    label: "Palé",
    hint: "Máximo por combinación de palé y lotería.",
    perLottery: true,
  },
  {
    key: "maxTripletaPerNumber",
    label: "Tripleta",
    hint: "Máximo por tripleta y lotería.",
    perLottery: true,
  },
  {
    key: "maxSuperPalePerNumber",
    label: "Súper Palé",
    hint: "Máximo por súper palé (siempre global).",
    perLottery: false,
  },
  {
    key: "expensiveDirectoAmount",
    label: "Alerta directo costoso",
    hint: "A partir de este monto en directo, el cajero recibe advertencia antes de vender.",
    perLottery: false,
  },
];

export function effectiveLotteryLimit(
  lot: LotteryPlayLimitView,
  key: "maxDirectoPerNumber" | "maxPalePerNumber" | "maxTripletaPerNumber",
  global: BancaSettingsView
): number {
  return lot[key] ?? global[key];
}
