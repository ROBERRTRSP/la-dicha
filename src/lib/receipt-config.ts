/** Configuración genérica del recibo — adaptable a cualquier plataforma */
export const RECEIPT_CONFIG = {
  businessName: "LA DICHA",
  tagline: "Sistema de Lotería",
  branch: "Principal",
  phone: "809-000-0000",
  footerLines: [
    "Conserve este ticket.",
    "Revise sus números antes de salir.",
    "Ticket válido solo para el sorteo indicado.",
    "Gracias por jugar.",
  ],
  timezone: "America/Santo_Domingo",
  thermalWidth: 48,
} as const;

export type ReceiptConfig = typeof RECEIPT_CONFIG;
