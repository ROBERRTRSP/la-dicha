import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const TZ = "America/Santo_Domingo";

export function nowInTz(): Date {
  return toZonedTime(new Date(), TZ);
}

/** Medianoche del día calendario en RD, como instante UTC para la BD. */
export function dayStartInTz(date: Date = new Date()): Date {
  const key = formatInTimeZone(date, TZ, "yyyy-MM-dd");
  return fromZonedTime(`${key}T00:00:00`, TZ);
}

export function dateKeyInTz(date: Date): string {
  return formatInTimeZone(date, TZ, "yyyy-MM-dd");
}

/** Formato d-m-yyyy usado por loteriasdominicanas.com */
export function queryDateInTz(date: Date): string {
  const d = Number(formatInTimeZone(date, TZ, "d"));
  const m = Number(formatInTimeZone(date, TZ, "M"));
  const y = formatInTimeZone(date, TZ, "yyyy");
  return `${d}-${m}-${y}`;
}
