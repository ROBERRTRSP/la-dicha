/** Rutas de gráficos La Dicha — SVG en public/art/ (generados por npm run art:install) */
export const ART = {
  logo: "/logo.svg",
  loginBg: "/art/login-bg.svg",
  jugarBanner: "/art/jugar-banner.svg",
  rouletteBanner: "/art/roulette-banner.svg",
  ruletaChip: "/casino/ruleta-chip.svg",
  emptyTickets: "/art/empty-tickets.svg",
  emptyResults: "/art/empty-results.svg",
  btnGirar: "/art/btn-girar.svg",
  btnConfirmar: "/art/btn-confirmar.svg",
  sealWatermark: "/art/seal-watermark.svg",
  nav: {
    jugar: "/art/nav-jugar.svg",
    tickets: "/art/nav-tickets.svg",
    resultados: "/art/nav-resultados.svg",
  },
  roulette: {
    bg: "/art/roulette/roulette-bg.svg",
    header: "/art/roulette/header.svg",
    wheelDisc: "/art/roulette/roulette-wheel-disc.svg",
    wheelFrame: "/art/roulette/roulette-wheel-frame.svg",
    tableFelt: "/art/roulette/roulette-table-felt.svg",
    chipStack: "/art/roulette/roulette-chip-stack.svg",
    emptyHistory: "/art/roulette/roulette-empty-history.svg",
    ball: {
      red: "/art/roulette/roulette-ball-red.svg",
      black: "/art/roulette/roulette-ball-black.svg",
      green: "/art/roulette/roulette-ball-green.svg",
    },
  },
  casino: {
    lobbyBg: "/casino/casino-lobby-bg.png",
    cabinetFrame: "/casino/slot-cabinet-frame.png",
  },
} as const;

export function rouletteBallArt(color: "red" | "black" | "green") {
  return ART.roulette.ball[color];
}
