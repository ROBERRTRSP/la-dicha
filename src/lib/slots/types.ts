export type SlotGameId =
  | "treasure-skunk"
  | "magic-lamp"
  | "golden-ox"
  | "moon-wolf";

export type SymbolDef = {
  id: string;
  label: string;
  emoji: string;
  /** Multiplicador de la apuesta por línea: 3 / 4 / 5 iguales. */
  pays: Partial<Record<3 | 4 | 5, number>>;
  isWild?: boolean;
  isScatter?: boolean;
};

export type SlotGameConfig = {
  id: SlotGameId;
  name: string;
  tagline: string;
  themeClass: string;
  cols: 5;
  rows: 3;
  symbols: Record<string, SymbolDef>;
  wildId: string;
  scatterIds: string[];
  /** Tiras por columna (símbolos ponderados). */
  reelStrips: string[][];
  paylineCount: number;
  bonus: {
    type: "chest_free" | "lamp_multiplier" | "ox_jackpot" | "moon_progressive";
    scatterCount: number;
    freeSpinsAwarded: number;
    description: string;
  };
};

export type Grid = string[][];

export type LineWin = {
  lineIndex: number;
  symbolId: string;
  count: 3 | 4 | 5;
  payout: number;
};

export type SpinResult = {
  grid: Grid;
  lineWins: LineWin[];
  scatterCount: number;
  payout: number;
  bonusTriggered: string | null;
  jackpotTier: "MINOR" | "MAJOR" | "GRAND" | null;
  jackpotAmount: number;
  multiplierApplied: number;
  message: string | null;
};

export type BonusState = {
  freeSpinsLeft: number;
  multiplier: number;
  progressiveMultiplier: number;
};
