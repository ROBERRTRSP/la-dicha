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
      emoji: "✨🦨",
      pays: { 3: 8, 4: 20, 5: 60 },
      isWild: true,
    },
    CHEST: {
      id: "CHEST",
      label: "Cofre",
      emoji: "📦",
      pays: { 3: 5, 4: 12, 5: 30 },
      isScatter: true,
    },
    GOLD_BAG: {
      id: "GOLD_BAG",
      label: "Bolsa de oro",
      emoji: "💰",
      pays: { 3: 6, 4: 15, 5: 40 },
    },
    DIAMOND: {
      id: "DIAMOND",
      label: "Diamante",
      emoji: "💎",
      pays: { 3: 5, 4: 12, 5: 35 },
    },
    COINS: {
      id: "COINS",
      label: "Monedas",
      emoji: "🪙",
      pays: { 3: 3, 4: 8, 5: 20 },
    },
    SKUNK: {
      id: "SKUNK",
      label: "Zorrillo",
      emoji: "🦨",
      pays: { 3: 4, 4: 10, 5: 25 },
    },
    LEAF: {
      id: "LEAF",
      label: "Hoja",
      emoji: "🍃",
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
      emoji: "🪔",
      pays: { 3: 10, 4: 25, 5: 80 },
      isWild: true,
      isScatter: true,
    },
    GENIE: {
      id: "GENIE",
      label: "Genio",
      emoji: "🧞",
      pays: { 3: 8, 4: 20, 5: 50 },
    },
    RUBY: {
      id: "RUBY",
      label: "Rubí",
      emoji: "💍",
      pays: { 3: 6, 4: 15, 5: 35 },
    },
    CARPET: {
      id: "CARPET",
      label: "Alfombra",
      emoji: "🕌",
      pays: { 3: 5, 4: 12, 5: 30 },
    },
    STAR: {
      id: "STAR",
      label: "Estrella",
      emoji: "⭐",
      pays: { 3: 4, 4: 10, 5: 22 },
    },
    COINS: {
      id: "COINS",
      label: "Monedas",
      emoji: "🪙",
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
      emoji: "🐂",
      pays: { 3: 10, 4: 30, 5: 100 },
      isWild: true,
    },
    INGOT: {
      id: "INGOT",
      label: "Lingote",
      emoji: "🥇",
      pays: { 3: 8, 4: 20, 5: 50 },
    },
    RED_COIN: {
      id: "RED_COIN",
      label: "Moneda roja",
      emoji: "🔴",
      pays: { 3: 6, 4: 15, 5: 35 },
    },
    FIRE: {
      id: "FIRE",
      label: "Fuego",
      emoji: "🔥",
      pays: { 3: 5, 4: 12, 5: 28 },
      isScatter: true,
    },
    A: { id: "A", label: "A", emoji: "🅰️", pays: { 3: 2, 4: 5, 5: 12 } },
    K: { id: "K", label: "K", emoji: "🅺", pays: { 3: 2, 4: 4, 5: 10 } },
    Q: { id: "Q", label: "Q", emoji: "🆀", pays: { 3: 1.5, 4: 3, 5: 8 } },
    J: { id: "J", label: "J", emoji: "🅹", pays: { 3: 1.5, 4: 3, 5: 8 } },
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
    description: "Premio menor, mayor y gran premio · multiplicadores ×2, ×5, ×10",
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
      emoji: "🐺",
      pays: { 3: 9, 4: 22, 5: 55 },
      isWild: true,
    },
    MOON: {
      id: "MOON",
      label: "Luna",
      emoji: "🌙",
      pays: { 3: 6, 4: 15, 5: 40 },
      isScatter: true,
    },
    MOUNTAIN: {
      id: "MOUNTAIN",
      label: "Montaña",
      emoji: "⛰️",
      pays: { 3: 5, 4: 12, 5: 28 },
    },
    CLAW: {
      id: "CLAW",
      label: "Garra",
      emoji: "🐾",
      pays: { 3: 4, 4: 10, 5: 22 },
    },
    STAR: {
      id: "STAR",
      label: "Estrella",
      emoji: "⭐",
      pays: { 3: 3, 4: 8, 5: 18 },
    },
    A: { id: "A", label: "A", emoji: "🅰️", pays: { 3: 2, 4: 5, 5: 12 } },
    K: { id: "K", label: "K", emoji: "🅺", pays: { 3: 2, 4: 4, 5: 10 } },
    Q: { id: "Q", label: "Q", emoji: "🆀", pays: { 3: 1.5, 4: 3, 5: 8 } },
    J: { id: "J", label: "J", emoji: "🅹", pays: { 3: 1.5, 4: 3, 5: 8 } },
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

export const SLOT_GAMES: Record<SlotGameId, SlotGameConfig> = {
  "treasure-skunk": TREASURE_SKUNK,
  "magic-lamp": MAGIC_LAMP,
  "golden-ox": GOLDEN_OX,
  "moon-wolf": MOON_WOLF,
};

export const SLOT_GAME_LIST = Object.values(SLOT_GAMES);

export function getSlotGame(id: string): SlotGameConfig | null {
  return SLOT_GAMES[id as SlotGameId] ?? null;
}

export function isSlotGameId(id: string): id is SlotGameId {
  return id in SLOT_GAMES;
}
