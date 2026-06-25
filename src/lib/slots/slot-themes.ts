import type { SlotGameId } from "./types";

export type SlotThemeConfig = {
  id: SlotGameId;
  title: string;
  subtitle: string;
  colors: {
    primary: string;
    secondary: string;
    glow: string;
    reelBg: string;
  };
};

export const SLOT_THEMES: Record<SlotGameId, SlotThemeConfig> = {
  "magic-lamp": {
    id: "magic-lamp",
    title: "Magic Lamp",
    subtitle: "Lámpara mágica y deseos",
    colors: {
      primary: "#818cf8",
      secondary: "#e879f9",
      glow: "#c084fc",
      reelBg: "#0f0a1e",
    },
  },
  "golden-ox": {
    id: "golden-ox",
    title: "Golden Ox",
    subtitle: "Toro dorado y fortuna",
    colors: {
      primary: "#fbbf24",
      secondary: "#dc2626",
      glow: "#fde047",
      reelBg: "#1c0a00",
    },
  },
  "moon-wolf": {
    id: "moon-wolf",
    title: "Moon Wolf",
    subtitle: "Lobo, luna y noche",
    colors: {
      primary: "#93c5fd",
      secondary: "#6366f1",
      glow: "#e0e7ff",
      reelBg: "#0c1222",
    },
  },
  "treasure-skunk": {
    id: "treasure-skunk",
    title: "Treasure Skunk",
    subtitle: "Bosque, cofres y monedas",
    colors: {
      primary: "#86efac",
      secondary: "#fbbf24",
      glow: "#4ade80",
      reelBg: "#0a1810",
    },
  },
  "classic-7": {
    id: "classic-7",
    title: "Classic 7",
    subtitle: "Slot clásica · 1 línea central",
    colors: {
      primary: "#ef4444",
      secondary: "#e8c05a",
      glow: "#ffd54f",
      reelBg: "#1a0808",
    },
  },
};
