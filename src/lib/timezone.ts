import { startOfWeek } from "date-fns";
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

/** Lunes 00:00 (hora RD) del inicio de la semana contable. */
export function weekStartInTz(date: Date = new Date()): Date {
  const zoned = toZonedTime(date, TZ);
  const monday = startOfWeek(zoned, { weekStartsOn: 1 });
  const key = formatInTimeZone(monday, TZ, "yyyy-MM-dd");
  return fromZonedTime(`${key}T00:00:00`, TZ);
}

/** Formato d-m-yyyy usado por loteriasdominicanas.com */
export function queryDateInTz(date: Date): string {
  const d = Number(formatInTimeZone(date, TZ, "d"));
  const m = Number(formatInTimeZone(date, TZ, "M"));
  const y = formatInTimeZone(date, TZ, "yyyy");
  return `${d}-${m}-${y}`;
}
