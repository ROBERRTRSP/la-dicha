/** Rutas de gráficos La Dicha — WebP preferido (npm run assets:optimize) */
import { rasterAsset } from "./raster-asset";

export const ART = {
  logo: rasterAsset("/logo.png"),
  loginBg: rasterAsset("/art/login-bg.png"),
  jugarBanner: rasterAsset("/art/jugar-banner.png"),
  rouletteBanner: rasterAsset("/art/roulette-banner.png"),
  ruletaChip: "/casino/ruleta-chip.svg",
  emptyTickets: rasterAsset("/art/empty-tickets.png"),
  emptyResults: rasterAsset("/art/empty-results.png"),
  btnGirar: rasterAsset("/art/btn-girar.png"),
  btnConfirmar: rasterAsset("/art/btn-confirmar.png"),
  sealWatermark: rasterAsset("/art/seal-watermark.png"),
  nav: {
    jugar: "/art/nav-jugar.svg",
    tickets: "/art/nav-tickets.svg",
    resultados: "/art/nav-resultados.svg",
  },
  roulette: {
    bg: rasterAsset("/art/roulette/roulette-bg.png"),
    header: rasterAsset("/art/roulette/header.png"),
    wheelDisc: rasterAsset("/art/roulette/roulette-wheel-disc.png"),
    wheelFrame: rasterAsset("/art/roulette/roulette-wheel-frame.png"),
    tableFelt: rasterAsset("/art/roulette/roulette-table-felt.png"),
    chipStack: rasterAsset("/art/roulette/roulette-chip-stack.png"),
    emptyHistory: rasterAsset("/art/roulette/roulette-empty-history.png"),
    ball: {
      red: rasterAsset("/art/roulette/roulette-ball-red.png"),
      black: rasterAsset("/art/roulette/roulette-ball-black.png"),
      green: rasterAsset("/art/roulette/roulette-ball-green.png"),
    },
  },
  casino: {
    lobbyBg: rasterAsset("/casino/casino-lobby-bg.png"),
    cabinetFrame: rasterAsset("/casino/slot-cabinet-frame.png"),
  },
} as const;

export function rouletteBallArt(color: "red" | "black" | "green") {
  return ART.roulette.ball[color];
}
