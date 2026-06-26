export type SlotGameId =
  | "treasure-skunk"
  | "magic-lamp"
  | "golden-ox"
  | "moon-wolf"
  | "classic-7";

export type SymbolDef = {
  id: string;
  label: string;
  /** Multiplicador de la apuesta por línea: 2 / 3 / 4 / 5 iguales. */
  pays: Partial<Record<2 | 3 | 4 | 5, number>>;
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
    type:
      | "chest_free"
      | "lamp_multiplier"
      | "ox_jackpot"
      | "moon_progressive"
      | "classic_none";
    scatterCount: number;
    freeSpinsAwarded: number;
    description: string;
  };
};

export type Grid = string[][];

export type LineWin = {
  lineIndex: number;
  symbolId: string;
  count: 2 | 3 | 4 | 5;
  payout: number;
};

/** Celda ganadora dentro de la rejilla (columna y fila visibles). */
export type WinCell = {
  col: number;
  row: number;
};

export type SpinResult = {
  grid: Grid;
  lineWins: LineWin[];
  winningCells: WinCell[];
  scatterCells: WinCell[];
  scatterCount: number;
  payout: number;
  bonusTriggered: string | null;
  freeSpinsAwarded: number;
  jackpotTier: "MINOR" | "MAJOR" | "GRAND" | null;
  jackpotAmount: number;
  multiplierApplied: number;
  message: string | null;
};

export type BonusState = {
  freeSpinsLeft: number;
  multiplier: number;
  progressiveMultiplier: number;
  /** Apuesta congelada que disparó la ronda de giros gratis (servidor). */
  freeSpinBetAmount?: number;
};
