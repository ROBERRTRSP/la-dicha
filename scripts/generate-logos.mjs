import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

/** Inspirado en marcas de loteriasdominicanas.com — colores y estilo por lotería */
const LOTTERIES = {
  LP_DIA: { title: "Primera", sub: "DÍA", bg: "#c41e3a", bg2: "#1e3a8a", accent: "#ffd700" },
  LP_NOCHE: { title: "Primera", sub: "NOCHE", bg: "#1e3a8a", bg2: "#0f172a", accent: "#fbbf24" },
  LOTEDOM: { title: "LoteDom", sub: "12:00", bg: "#15803d", bg2: "#052e16", accent: "#86efac" },
  LS_DIA: { title: "Suerte", sub: "12:30", bg: "#eab308", bg2: "#ca8a04", accent: "#1e3a8a" },
  LS_TARDE: { title: "Suerte", sub: "6:00PM", bg: "#f59e0b", bg2: "#b45309", accent: "#fff" },
  QREAL: { title: "Real", sub: "12:55", bg: "#dc2626", bg2: "#7f1d1d", accent: "#fde047" },
  GANAMAS: { title: "Gana", sub: "MÁS", bg: "#16a34a", bg2: "#14532d", accent: "#fef08a" },
  NAC_TARDE: { title: "Nacional", sub: "TARDE", bg: "#1d4ed8", bg2: "#1e3a8a", accent: "#93c5fd" },
  NAC_NOCHE: { title: "Nacional", sub: "NOCHE", bg: "#1e40af", bg2: "#172554", accent: "#60a5fa" },
  LOTEKA: { title: "Loteka", sub: "7:55", bg: "#0284c7", bg2: "#0c4a6e", accent: "#f97316" },
  LEIDSA: { title: "Leidsa", sub: "8:55", bg: "#2563eb", bg2: "#1e3a8a", accent: "#fbbf24" },
  QP: { title: "Quiniela", sub: "Palé", bg: "#7c3aed", bg2: "#4c1d95", accent: "#e9d5ff" },
  NY_AM: { title: "New York", sub: "TARDE", bg: "#0f172a", bg2: "#334155", accent: "#fbbf24" },
  NY_PM: { title: "New York", sub: "NOCHE", bg: "#1e293b", bg2: "#0f172a", accent: "#fcd34d" },
  FL_AM: { title: "Florida", sub: "DÍA", bg: "#ea580c", bg2: "#0369a1", accent: "#fff" },
  FL_PM: { title: "Florida", sub: "NOCHE", bg: "#c2410c", bg2: "#1e3a8a", accent: "#fed7aa" },
  ANG_10: { title: "Anguila", sub: "10AM", bg: "#db2777", bg2: "#9d174d", accent: "#fbcfe8" },
  ANG_1: { title: "Anguila", sub: "1PM", bg: "#be185d", bg2: "#831843", accent: "#fff" },
  ANG_6: { title: "Anguila", sub: "6PM", bg: "#a21caf", bg2: "#701a75", accent: "#f0abfc" },
  ANG_9: { title: "Anguila", sub: "9PM", bg: "#86198f", bg2: "#581c87", accent: "#e879f9" },
  KING_AM: { title: "King", sub: "12:30", bg: "#b45309", bg2: "#78350f", accent: "#fde68a" },
  KING_PM: { title: "King", sub: "7:30", bg: "#92400e", bg2: "#451a03", accent: "#fcd34d" },
};

function makeSvg(code, { title, sub, bg, bg2, accent }) {
  const titleSize = title.length > 8 ? 9 : 11;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img">
  <defs>
    <linearGradient id="g-${code}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g-${code})"/>
  <rect x="0" y="0" width="64" height="6" rx="14" fill="${accent}" opacity="0.9"/>
  <circle cx="52" cy="52" r="10" fill="${accent}" opacity="0.25"/>
  <circle cx="12" cy="14" r="6" fill="#fff" opacity="0.15"/>
  <text x="32" y="30" text-anchor="middle" fill="#ffffff" font-size="${titleSize}" font-weight="800" font-family="system-ui,Arial,sans-serif">${title}</text>
  <text x="32" y="44" text-anchor="middle" fill="${accent}" font-size="10" font-weight="700" font-family="system-ui,Arial,sans-serif">${sub}</text>
  <text x="32" y="56" text-anchor="middle" fill="#ffffff" font-size="7" font-weight="600" opacity="0.7" font-family="system-ui,Arial,sans-serif">RD</text>
</svg>`;
}

const dir = join(process.cwd(), "public", "logos");
mkdirSync(dir, { recursive: true });

for (const [code, brand] of Object.entries(LOTTERIES)) {
  writeFileSync(join(dir, `${code}.svg`), makeSvg(code, brand), "utf8");
}

console.log(`Generated ${Object.keys(LOTTERIES).length} lottery logos`);
