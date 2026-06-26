import type { SlotGameId } from "./slots/types";

/** Assets del casino La Dicha */

export const CASINO_ART = {

  lobbyBg: "/casino/casino-lobby-bg.png",

  cabinetFrame: "/casino/slot-cabinet-frame.png",

  magicLampBg: "/casino/magic-lamp-bg.svg",

  moonWolfBg: "/casino/moon-wolf-bg.svg",

  classic7: {

    bg: "/casino/classic-7-bg.png",

    logo: "/assets/casino/slots/classic-7/logo.png",

    cabinetFrame: "/assets/casino/slots/classic-7/cabinet-frame.png",

    ui: {

      spinBtn: "/assets/casino/slots/classic-7/ui/spin-btn.png",

      hudPanel: "/assets/casino/slots/classic-7/ui/hud-panel.png",

      bigWin: "/assets/casino/slots/classic-7/ui/big-win.png",

    },

  },

  thumbs: {

    "treasure-skunk": "/casino/thumb-treasure-skunk.png",

    "magic-lamp": "/casino/thumb-magic-lamp.png",

    "golden-ox": "/casino/thumb-golden-ox.png",

    "moon-wolf": "/casino/thumb-moon-wolf.png",

    "classic-7": "/casino/thumb-classic-7.png",

  },

  roulette: "/art/ruleta-chip.png",

  /** Collage IA: 5 paneles verticales (uno por slot). */
  winCelebrationSplash: "/assets/casino/slots/ui/win-celebration-splash.png",

  goldenOx: {

    symbols: {

      OX: "/assets/slots/golden-ox/symbols/ox-wild.svg",

      INGOT: "/assets/slots/golden-ox/symbols/ingot.svg",

      RED_COIN: "/assets/slots/golden-ox/symbols/red-coin.svg",

      FIRE: "/assets/slots/golden-ox/symbols/fire-scatter.svg",

      A: "/assets/slots/golden-ox/symbols/a.svg",

      K: "/assets/slots/golden-ox/symbols/k.svg",

      Q: "/assets/slots/golden-ox/symbols/q.svg",

      J: "/assets/slots/golden-ox/symbols/j.svg",

    },

    ui: {

      jackpotMinor: "/assets/slots/golden-ox/ui/jackpot-minor.svg",

      jackpotMajor: "/assets/slots/golden-ox/ui/jackpot-major.svg",

      jackpotGrand: "/assets/slots/golden-ox/ui/jackpot-grand.svg",

      multX2: "/assets/slots/golden-ox/ui/mult-x2.svg",

      multX5: "/assets/slots/golden-ox/ui/mult-x5.svg",

      multX10: "/assets/slots/golden-ox/ui/mult-x10.svg",

    },

  },

} as const;

const WIN_CELEBRATION_PANEL_X: Record<SlotGameId, number> = {
  "treasure-skunk": 0,
  "magic-lamp": 25,
  "golden-ox": 50,
  "moon-wolf": 75,
  "classic-7": 100,
};

/** Posición horizontal del panel temático dentro del collage de celebración. */
export function winCelebrationPanelPosition(gameId: SlotGameId): string {
  return `${WIN_CELEBRATION_PANEL_X[gameId]}% 50%`;
}

/** @deprecated Usar CASINO_ART.classic7.logo */

export const CLASSIC7_LOGO = CASINO_ART.classic7.logo;



/** @deprecated Usar CASINO_ART.classic7.bg */

export const CLASSIC7_BG = CASINO_ART.classic7.bg;


