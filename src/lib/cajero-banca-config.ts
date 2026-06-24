/** Configuración de banca / terminal (estilo ELITE). */
export const CAJERO_BANCA_CONFIG = {
  bancaName: "ELITE 13",
  terminalCode: "bei-0013",
  /** Balance de apertura del día (RD$). Ajustable por banca. */
  openingBalance: 0,
} as const;

/** Comisión retenida por lotería (decimal). NY/FL ~10%; dominicanas ~30%. */
export function commissionRateForLottery(lotteryCode: string): number {
  if (/^(NY_|FL_|NJ_)/.test(lotteryCode)) return 0.1;
  return 0.3;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
