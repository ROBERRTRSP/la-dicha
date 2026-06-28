export type LotteryBrand = {
  initials: string;
  bg: string;
  text: string;
  title?: string;
};

export const LOTTERY_BRANDS: Record<string, LotteryBrand> = {
  LP_DIA: { initials: "LP", title: "Primera", bg: "#c41e3a", text: "#ffffff" },
  LP_NOCHE: { initials: "LP", title: "Primera", bg: "#1e3a8a", text: "#ffffff" },
  LOTEDOM: { initials: "LD", title: "LoteDom", bg: "#15803d", text: "#ffffff" },
  LS_DIA: { initials: "LS", title: "Suerte", bg: "#eab308", text: "#1e3a8a" },
  LS_TARDE: { initials: "LS", title: "Suerte", bg: "#f59e0b", text: "#ffffff" },
  QREAL: { initials: "QR", title: "Real", bg: "#dc2626", text: "#ffffff" },
  GANAMAS: { initials: "GM", title: "Gana Más", bg: "#16a34a", text: "#ffffff" },
  NAC_TARDE: { initials: "NT", title: "Nacional", bg: "#1d4ed8", text: "#ffffff" },
  NAC_NOCHE: { initials: "NN", title: "Nacional", bg: "#1e40af", text: "#ffffff" },
  LOTEKA: { initials: "LK", title: "Loteka", bg: "#0284c7", text: "#ffffff" },
  LEIDSA: { initials: "LD", title: "Leidsa", bg: "#2563eb", text: "#ffffff" },
  QP: { initials: "QP", title: "Palé", bg: "#7c3aed", text: "#ffffff" },
  NY_AM: { initials: "NY", title: "New York", bg: "#0f172a", text: "#fbbf24" },
  NY_PM: { initials: "NY", title: "New York", bg: "#1e293b", text: "#fcd34d" },
  FL_AM: { initials: "FL", title: "Florida", bg: "#ea580c", text: "#ffffff" },
  FL_PM: { initials: "FL", title: "Florida", bg: "#c2410c", text: "#ffffff" },
  ANG_10: { initials: "A10", title: "Anguila", bg: "#db2777", text: "#ffffff" },
  ANG_1: { initials: "A1", title: "Anguila", bg: "#be185d", text: "#ffffff" },
  ANG_6: { initials: "A6", title: "Anguila", bg: "#a21caf", text: "#ffffff" },
  ANG_9: { initials: "A9", title: "Anguila", bg: "#86198f", text: "#ffffff" },
  KING_AM: { initials: "KG", title: "King", bg: "#b45309", text: "#ffffff" },
  KING_PM: { initials: "KG", title: "King", bg: "#92400e", text: "#ffffff" },
};

export function getLotteryBrand(code: string, name?: string): LotteryBrand {
  if (LOTTERY_BRANDS[code]) return LOTTERY_BRANDS[code];
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : code.slice(0, 2);
  return { initials, bg: "#64748b", text: "#ffffff" };
}

export function getLotteryLogoPath(code: string) {
  return `/logos/${code}.svg`;
}
