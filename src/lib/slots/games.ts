import type { SlotGameConfig, SlotGameId } from "./types";

function strip(...symbols: string[]): string[] {
  return symbols;
}

function buildReel(base: string[], wild: string, scatter: string): string[] {
  return [
    ...base,
    ...base,
    wild,
    ...base,
    scatter,
    ...base,
    ...base,
    wild,
    ...base,
  ];
}

const TREASURE_SKUNK: SlotGameConfig = {
  id: "treasure-skunk",
  name: "Zorrillo del Tesoro",
  tagline: "Bosque, cofres y monedas",
  themeClass: "slot-theme--skunk",
  cols: 5,
  rows: 3,
  wildId: "WILD_SKUNK",
  scatterIds: ["CHEST"],
  paylineCount: 10,
  symbols: {
    WILD_SKUNK: {
      id: "WILD_SKUNK",
      label: "Zorrillo dorado",
      pays: { 3: 8, 4: 20, 5: 60 },
      isWild: true,
    },
    CHEST: {
      id: "CHEST",
      label: "Cofre",
      pays: { 3: 5, 4: 12, 5: 30 },
      isScatter: true,
    },
    GOLD_BAG: {
      id: "GOLD_BAG",
      label: "Bolsa de oro",
      pays: { 3: 6, 4: 15, 5: 40 },
    },
    DIAMOND: {
      id: "DIAMOND",
      label: "Diamante",
      pays: { 3: 5, 4: 12, 5: 35 },
    },
    COINS: {
      id: "COINS",
      label: "Monedas",
      pays: { 3: 3, 4: 8, 5: 20 },
    },
    SKUNK: {
      id: "SKUNK",
      label: "Zorrillo",
      pays: { 3: 4, 4: 10, 5: 25 },
    },
    LEAF: {
      id: "LEAF",
      label: "Hoja",
      pays: { 3: 2, 4: 5, 5: 12 },
    },
  },
  reelStrips: Array.from({ length: 5 }, () =>
    buildReel(
      ["LEAF", "COINS", "SKUNK", "DIAMOND", "GOLD_BAG", "LEAF", "COINS"],
      "WILD_SKUNK",
      "CHEST"
    )
  ),
  bonus: {
    type: "chest_free",
    scatterCount: 3,
    freeSpinsAwarded: 10,
    description: "3 cofres activan ronda gratis",
  },
};

const MAGIC_LAMP: SlotGameConfig = {
  id: "magic-lamp",
  name: "Lámpara Mágica",
  tagline: "Lámpara mágica y deseos",
  themeClass: "slot-theme--lamp",
  cols: 5,
  rows: 3,
  wildId: "LAMP",
  scatterIds: ["LAMP"],
  paylineCount: 10,
  symbols: {
    LAMP: {
      id: "LAMP",
      label: "Lámpara mágica",
      pays: { 3: 10, 4: 25, 5: 80 },
      isWild: true,
      isScatter: true,
    },
    GENIE: {
      id: "GENIE",
      label: "Genio",
      pays: { 3: 8, 4: 20, 5: 50 },
    },
    RUBY: {
      id: "RUBY",
      label: "Rubí",
      pays: { 3: 6, 4: 15, 5: 35 },
    },
    CARPET: {
      id: "CARPET",
      label: "Alfombra",
      pays: { 3: 5, 4: 12, 5: 30 },
    },
    STAR: {
      id: "STAR",
      label: "Estrella",
      pays: { 3: 4, 4: 10, 5: 22 },
    },
    COINS: {
      id: "COINS",
      label: "Monedas",
      pays: { 3: 2, 4: 6, 5: 15 },
    },
  },
  reelStrips: Array.from({ length: 5 }, () =>
    buildReel(
      ["COINS", "STAR", "CARPET", "RUBY", "GENIE", "COINS", "STAR"],
      "LAMP",
      "LAMP"
    )
  ),
  bonus: {
    type: "lamp_multiplier",
    scatterCount: 3,
    freeSpinsAwarded: 8,
    description: "3 lámparas → 8 giros gratis con multiplicador",
  },
};

const GOLDEN_OX: SlotGameConfig = {
  id: "golden-ox",
  name: "Toro Dorado",
  tagline: "Toro dorado y fortuna",
  themeClass: "slot-theme--ox",
  cols: 5,
  rows: 3,
  wildId: "OX",
  scatterIds: ["FIRE"],
  paylineCount: 10,
  symbols: {
    OX: {
      id: "OX",
      label: "Toro dorado",
      pays: { 3: 10, 4: 30, 5: 100 },
      isWild: true,
    },
    INGOT: {
      id: "INGOT",
      label: "Lingote",
      pays: { 3: 8, 4: 20, 5: 50 },
    },
    RED_COIN: {
      id: "RED_COIN",
      label: "Moneda roja",
      pays: { 3: 6, 4: 15, 5: 35 },
    },
    FIRE: {
      id: "FIRE",
      label: "Fuego",
      pays: { 3: 5, 4: 12, 5: 28 },
      isScatter: true,
    },
    A: { id: "A", label: "A", pays: { 3: 2, 4: 5, 5: 12 } },
    K: { id: "K", label: "K", pays: { 3: 2, 4: 4, 5: 10 } },
    Q: { id: "Q", label: "Q", pays: { 3: 1.5, 4: 3, 5: 8 } },
    J: { id: "J", label: "J", pays: { 3: 1.5, 4: 3, 5: 8 } },
  },
  reelStrips: Array.from({ length: 5 }, () =>
    strip(
      "J",
      "Q",
      "K",
      "A",
      "RED_COIN",
      "INGOT",
      "FIRE",
      "J",
      "Q",
      "OX",
      "A",
      "RED_COIN",
      "INGOT",
      "K",
      "FIRE",
      "J",
      "Q"
    )
  ),
  bonus: {
    type: "ox_jackpot",
    scatterCount: 3,
    freeSpinsAwarded: 0,
    description: "Jackpots minor/major/grand · mult. ×2, ×5, ×10",
  },
};

const MOON_WOLF: SlotGameConfig = {
  id: "moon-wolf",
  name: "Lobo Lunar",
  tagline: "Lobo, luna y noche",
  themeClass: "slot-theme--wolf",
  cols: 5,
  rows: 3,
  wildId: "WOLF",
  scatterIds: ["MOON"],
  paylineCount: 10,
  symbols: {
    WOLF: {
      id: "WOLF",
      label: "Lobo",
      pays: { 3: 9, 4: 22, 5: 55 },
      isWild: true,
    },
    MOON: {
      id: "MOON",
      label: "Luna",
      pays: { 3: 6, 4: 15, 5: 40 },
      isScatter: true,
    },
    MOUNTAIN: {
      id: "MOUNTAIN",
      label: "Montaña",
      pays: { 3: 5, 4: 12, 5: 28 },
    },
    CLAW: {
      id: "CLAW",
      label: "Garra",
      pays: { 3: 4, 4: 10, 5: 22 },
    },
    STAR: {
      id: "STAR",
      label: "Estrella",
      pays: { 3: 3, 4: 8, 5: 18 },
    },
    A: { id: "A", label: "A", pays: { 3: 2, 4: 5, 5: 12 } },
    K: { id: "K", label: "K", pays: { 3: 2, 4: 4, 5: 10 } },
    Q: { id: "Q", label: "Q", pays: { 3: 1.5, 4: 3, 5: 8 } },
    J: { id: "J", label: "J", pays: { 3: 1.5, 4: 3, 5: 8 } },
  },
  reelStrips: Array.from({ length: 5 }, () =>
    buildReel(
      ["J", "Q", "STAR", "CLAW", "MOUNTAIN", "A", "K", "STAR"],
      "WOLF",
      "MOON"
    )
  ),
  bonus: {
    type: "moon_progressive",
    scatterCount: 3,
    freeSpinsAwarded: 12,
    description: "3 lunas activan giros nocturnos · multiplicador progresivo",
  },
};

const CLASSIC_STRIP = [
  "cherry",
  "single-bar",
  "double-bar",
  "golden-bell",
  "cherry",
  "triple-bar",
  "horseshoe",
  "diamond",
  "cherry",
  "single-bar",
  "red-seven",
  "double-bar",
  "cherry",
  "golden-bell",
  "single-bar",
  "horseshoe",
  "cherry",
  "triple-bar",
  "diamond",
  "red-seven",
];

const CLASSIC_7: SlotGameConfig = {
  id: "classic-7",
  name: "Clásica 7",
  tagline: "Slot clásica · 1 línea central",
  themeClass: "slot-theme--classic7",
  cols: 5,
  rows: 3,
  wildId: "__none__",
  scatterIds: [],
  paylineCount: 1,
  symbols: {
    "red-seven": {
      id: "red-seven",
      label: "Siete rojo",
      pays: { 3: 20, 4: 100, 5: 500 },
    },
    "triple-bar": {
      id: "triple-bar",
      label: "Triple BAR",
      pays: { 3: 15, 4: 75, 5: 250 },
    },
    "double-bar": {
      id: "double-bar",
      label: "Double BAR",
      pays: { 3: 10, 4: 50, 5: 150 },
    },
    "single-bar": {
      id: "single-bar",
      label: "BAR",
      pays: { 3: 8, 4: 30, 5: 100 },
    },
    "golden-bell": {
      id: "golden-bell",
      label: "Campana",
      pays: { 3: 5, 4: 20, 5: 75 },
    },
    diamond: {
      id: "diamond",
      label: "Diamante",
      pays: { 3: 4, 4: 15, 5: 60 },
    },
    horseshoe: {
      id: "horseshoe",
      label: "Herradura",
      pays: { 3: 3, 4: 10, 5: 40 },
    },
    cherry: {
      id: "cherry",
      label: "Cereza",
      pays: { 2: 1, 3: 2, 4: 8, 5: 25 },
    },
  },
  reelStrips: Array.from({ length: 5 }, () => [...CLASSIC_STRIP]),
  bonus: {
    type: "classic_none",
    scatterCount: 99,
    freeSpinsAwarded: 0,
    description: "1 línea central · clásica americana",
  },
};

export const SLOT_GAMES: Record<SlotGameId, SlotGameConfig> = {
  "treasure-skunk": TREASURE_SKUNK,
  "magic-lamp": MAGIC_LAMP,
  "golden-ox": GOLDEN_OX,
  "moon-wolf": MOON_WOLF,
  "classic-7": CLASSIC_7,
};

export const SLOT_GAME_LIST = Object.values(SLOT_GAMES);

export function getSlotGame(id: string): SlotGameConfig | null {
  return SLOT_GAMES[id as SlotGameId] ?? null;
}

export function isSlotGameId(id: string): id is SlotGameId {
  return id in SLOT_GAMES;
}
