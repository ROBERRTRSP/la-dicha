import type { SlotGameId } from "./types";

/**
 * Mapa de imágenes premium por símbolo. La clave externa es el `SlotGameId` y la
 * interna es el ID interno del símbolo (el mismo que usa el motor del juego).
 *
 * IMPORTANTE: esto es solo presentación visual. El RNG, las paytables y la
 * comparación de ganadores siguen usando los IDs internos, nunca las imágenes.
 *
 * Los archivos viven en `/public/assets/slots/<gameId>/<symbolId>.png`.
 */
const SLOT_SYMBOL_IMAGES: Record<SlotGameId, Record<string, string>> = {
  "golden-ox": {
    OX: "/assets/slots/golden-ox/OX.png",
    INGOT: "/assets/slots/golden-ox/INGOT.png",
    RED_COIN: "/assets/slots/golden-ox/RED_COIN.png",
    FIRE: "/assets/slots/golden-ox/FIRE.png",
    A: "/assets/slots/golden-ox/A.png",
    K: "/assets/slots/golden-ox/K.png",
    Q: "/assets/slots/golden-ox/Q.png",
    J: "/assets/slots/golden-ox/J.png",
  },
  "moon-wolf": {
    WOLF: "/assets/slots/moon-wolf/WOLF.png",
    MOON: "/assets/slots/moon-wolf/MOON.png",
    MOUNTAIN: "/assets/slots/moon-wolf/MOUNTAIN.png",
    CLAW: "/assets/slots/moon-wolf/CLAW.png",
    STAR: "/assets/slots/moon-wolf/STAR.png",
    A: "/assets/slots/moon-wolf/A.png",
    K: "/assets/slots/moon-wolf/K.png",
    Q: "/assets/slots/moon-wolf/Q.png",
    J: "/assets/slots/moon-wolf/J.png",
  },
  "magic-lamp": {
    LAMP: "/assets/slots/magic-lamp/LAMP.png",
    GENIE: "/assets/slots/magic-lamp/GENIE.png",
    RUBY: "/assets/slots/magic-lamp/RUBY.png",
    CARPET: "/assets/slots/magic-lamp/CARPET.png",
    STAR: "/assets/slots/magic-lamp/STAR.png",
    COINS: "/assets/slots/magic-lamp/COINS.png",
  },
  "treasure-skunk": {
    WILD_SKUNK: "/assets/slots/treasure-skunk/WILD_SKUNK.png",
    CHEST: "/assets/slots/treasure-skunk/CHEST.png",
    GOLD_BAG: "/assets/slots/treasure-skunk/GOLD_BAG.png",
    DIAMOND: "/assets/slots/treasure-skunk/DIAMOND.png",
    COINS: "/assets/slots/treasure-skunk/COINS.png",
    SKUNK: "/assets/slots/treasure-skunk/SKUNK.png",
    LEAF: "/assets/slots/treasure-skunk/LEAF.png",
  },
  "classic-7": {},
};

/**
 * Devuelve la ruta de la imagen del símbolo o `null` si no existe asset
 * (en cuyo caso el render hace fallback al arte vectorial SVG).
 */
export function getSlotSymbolImage(
  gameId: SlotGameId,
  symbolId: string
): string | null {
  return SLOT_SYMBOL_IMAGES[gameId]?.[symbolId] ?? null;
}

/** Precarga los PNG del juego activo para reducir parpadeos en el primer giro. */
export function preloadSlotSymbolImages(gameId: SlotGameId): void {
  if (typeof window === "undefined") return;
  const urls = Object.values(SLOT_SYMBOL_IMAGES[gameId] ?? {});
  for (const src of urls) {
    const img = new window.Image();
    img.decoding = "async";
    img.src = src;
  }
}
