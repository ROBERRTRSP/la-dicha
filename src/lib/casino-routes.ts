import type { SlotGameConfig, SlotGameId } from "@/lib/slots/types";

/** Lobby principal del casino. */
export const CASINO_LOBBY_HREF = "/ruleta";

/** Ruleta europea. */
export const ROULETTE_HREF = "/ruleta/roulette";

/** Prefijos de rutas jugador del casino (nav activa, middleware). */
export const CASINO_ROUTE_PREFIXES = ["/ruleta", "/slots", "/casino"] as const;

export function slotGameHref(gameId: SlotGameId | string): string {
  return `/ruleta/${gameId}`;
}

/** Etiqueta corta del tile en lobby. */
export function slotLobbyBadge(game: SlotGameConfig): string {
  if (game.id === "classic-7") return "1 línea";
  return "5×3";
}

/** Nombre corto para chips horizontales en /jugar. */
export const SLOT_CHIP_LABEL: Record<SlotGameId, string> = {
  "treasure-skunk": "Zorrillo",
  "magic-lamp": "Lámpara",
  "golden-ox": "Toro",
  "moon-wolf": "Lobo",
  "classic-7": "Clásica 7",
};
