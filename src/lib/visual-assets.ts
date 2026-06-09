/** Rutas de gráficos generados con IA — identidad visual La Dicha */
export const ART = {
  logo: "/logo.png",
  loginBg: "/art/login-bg.png",
  jugarBanner: "/art/jugar-banner.png",
  rouletteBanner: "/art/roulette-banner.png",
  ruletaChip: "/art/ruleta-chip.png",
  emptyTickets: "/art/empty-tickets.png",
  emptyResults: "/art/empty-results.png",
  btnGirar: "/art/btn-girar.png",
  btnConfirmar: "/art/btn-confirmar.png",
  sealWatermark: "/art/seal-watermark.png",
  nav: {
    jugar: "/art/nav-jugar.png",
    tickets: "/art/nav-tickets.png",
    resultados: "/art/nav-resultados.png",
  },
  roulette: {
    bg: "/art/roulette/roulette-bg.png",
    header: "/art/roulette/header.png",
    wheelDisc: "/art/roulette/roulette-wheel-disc.png",
    wheelFrame: "/art/roulette/roulette-wheel-frame.png",
    tableFelt: "/art/roulette/roulette-table-felt.png",
    chipStack: "/art/roulette/roulette-chip-stack.png",
    emptyHistory: "/art/roulette/roulette-empty-history.png",
    ball: {
      red: "/art/roulette/roulette-ball-red.png",
      black: "/art/roulette/roulette-ball-black.png",
      green: "/art/roulette/roulette-ball-green.png",
    },
  },
} as const;

export function rouletteBallArt(color: "red" | "black" | "green") {
  return ART.roulette.ball[color];
}

