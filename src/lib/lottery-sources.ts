export type LotterySourceConfig = {
  code: string;
  /** Ruta en la fuente oficial (loteriasdominicanas.com) */
  officialPath: string;
  /** Nombre del bloque en la fuente oficial */
  officialName: string;
  /** Nombre del bloque en la fuente alterna (conectate.com.do) */
  alternateName: string;
};

export const LOTTERY_SOURCES: LotterySourceConfig[] = [
  { code: "LP_DIA", officialPath: "/la-primera/quiniela-medio-dia", officialName: "La Primera Día", alternateName: "La Primera Día" },
  { code: "LP_NOCHE", officialPath: "/la-primera/quiniela-noche", officialName: "Primera Noche", alternateName: "Primera Noche" },
  { code: "LOTEDOM", officialPath: "/lotedom/quiniela", officialName: "Quiniela LoteDom", alternateName: "LoteDom" },
  { code: "LS_DIA", officialPath: "/la-suerte-dominicana/quiniela", officialName: "La Suerte 12:30", alternateName: "La Suerte MD" },
  { code: "LS_TARDE", officialPath: "/la-suerte-dominicana/quiniela-tarde", officialName: "La Suerte 18:00", alternateName: "La Suerte 6PM" },
  { code: "GANAMAS", officialPath: "/loteria-nacional/gana-mas", officialName: "Gana Más", alternateName: "Gana Más" },
  { code: "QREAL", officialPath: "/loto-real/quiniela", officialName: "Quiniela Real", alternateName: "Quiniela Real" },
  { code: "NAC_NOCHE", officialPath: "/loteria-nacional/quiniela", officialName: "Lotería Nacional", alternateName: "Lotería Nacional" },
  { code: "LOTEKA", officialPath: "/loteka/quiniela-mega-decenas", officialName: "Quiniela Loteka", alternateName: "Quiniela Loteka" },
  { code: "LEIDSA", officialPath: "/leidsa/quiniela-pale", officialName: "Quiniela Leidsa", alternateName: "Quiniela Leidsa" },
  { code: "ANG_10", officialPath: "/anguila/anguila-manana", officialName: "Anguila Mañana", alternateName: "Anguila 10:00 AM" },
  { code: "ANG_1", officialPath: "/anguila/anguila-medio-dia", officialName: "Anguila Medio Día", alternateName: "Anguila 1:00 PM" },
  { code: "ANG_6", officialPath: "/anguila/anguila-tarde", officialName: "Anguila Tarde", alternateName: "Anguila 6:00 PM" },
  { code: "ANG_9", officialPath: "/anguila/anguila-noche", officialName: "Anguila Noche", alternateName: "Anguila 9:00 PM" },
  { code: "FL_AM", officialPath: "/americanas/florida-tarde", officialName: "Florida Día", alternateName: "Florida Día" },
  { code: "FL_PM", officialPath: "/americanas/florida-noche", officialName: "Florida Noche", alternateName: "Florida Noche" },
  { code: "NY_AM", officialPath: "/americanas/new-york-medio-dia", officialName: "New York Tarde", alternateName: "New York 3:30" },
  { code: "NY_PM", officialPath: "/americanas/new-york-noche", officialName: "New York Noche", alternateName: "New York 11:30" },
  { code: "KING_AM", officialPath: "/king-lottery/quiniela-dia", officialName: "King Lottery 12:30", alternateName: "King Lottery 12:30" },
  { code: "KING_PM", officialPath: "/king-lottery/quiniela-noche", officialName: "King Lottery 7:30", alternateName: "King Lottery 7:30" },
];

export const LOTTERY_SOURCE_BY_CODE = Object.fromEntries(
  LOTTERY_SOURCES.map((s) => [s.code, s])
) as Record<string, LotterySourceConfig>;

/** Fuente oficial — se consulta primero. */
export const OFFICIAL_SOURCE_BASE = "https://loteriasdominicanas.com";
/** Fuente alterna — solo para confirmar lo obtenido en la oficial. */
export const ALTERNATE_SOURCE_BASE = "https://www.conectate.com.do/loterias/";

/** Minutos después del sorteo antes de consultar fuentes. */
export const SYNC_DELAY_MINUTES = 20;
