/** Configuración del recibo térmico 80 mm (estilo banca ELITE). */
export const RECEIPT_CONFIG = {
  businessName: "ELITE 13",
  terminalCode: "bei-013",
  tagline: "Sistema de Lotería",
  phone: "809-000-0000",
  timezone: "America/Santo_Domingo",
  thermalWidth: 42,
  prizeFooter:
    "1st:$56 2nd:$12 3rd:$4 Pale:1300 Tripleta:$10,000",
} as const;

export type ReceiptConfig = typeof RECEIPT_CONFIG;
