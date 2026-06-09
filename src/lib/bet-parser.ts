export type BetTypeCode = "QUINIELA" | "PALE" | "TRIPLETA" | "SUPER_PALE";

export const QUICK_AMOUNTS = [1, 2, 3, 4, 5, 10] as const;

export function detectBetType(digits: string): BetTypeCode | null {
  const len = digits.length;
  if (len === 2) return "QUINIELA";
  if (len === 4) return "PALE";
  if (len === 6) return "TRIPLETA";
  return null;
}

export function formatNumbers(digits: string, type: BetTypeCode): string {
  if (type === "QUINIELA") return digits.slice(0, 2);
  if (type === "PALE" || type === "SUPER_PALE")
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
}

export function betTypeLabel(type: BetTypeCode) {
  const labels: Record<BetTypeCode, string> = {
    QUINIELA: "Quiniela",
    PALE: "Palé",
    TRIPLETA: "Tripleta",
    SUPER_PALE: "Súper Palé",
  };
  return labels[type];
}

export function validateDigits(digits: string): string | null {
  if (!digits) return "Escribe tus números.";
  if (digits.length > 6) return "Máximo 6 dígitos.";
  if (!/^\d+$/.test(digits)) return "Solo números del 00 al 99.";
  for (let i = 0; i < digits.length; i += 2) {
    const pair = digits.slice(i, i + 2);
    if (pair.length < 2) return "Cada número debe tener 2 dígitos.";
    const n = Number(pair);
    if (n < 0 || n > 99) return "Cada número debe ser del 00 al 99.";
  }
  const type = detectBetType(digits);
  if (!type) return "Quiniela=2 dígitos, Palé=4, Tripleta=6.";
  return null;
}
