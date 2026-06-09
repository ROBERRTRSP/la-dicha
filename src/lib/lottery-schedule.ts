import { addMinutes, differenceInSeconds } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { dateKeyInTz, TZ } from "./timezone";

/** Minutos antes del sorteo en que cierra la venta de jugadas. */
export const LOTTERY_CLOSE_MINUTES = 15;

/** Instantánea del sorteo en hora de República Dominicana. */
export function drawAtInTz(drawTime: string, day: Date): Date {
  const [h, m] = drawTime.split(":").map(Number);
  const key = dateKeyInTz(day);
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return fromZonedTime(`${key}T${hh}:${mm}:00`, TZ);
}

export function closesAtForDraw(
  drawTime: string,
  day: Date,
  closeMin = LOTTERY_CLOSE_MINUTES
): Date {
  return addMinutes(drawAtInTz(drawTime, day), -closeMin);
}

export type DrawRuntimeStatus =
  | "OPEN"
  | "CLOSING_SOON"
  | "CLOSED"
  | "WAITING_RESULT"
  | "RESULT_AVAILABLE";

/** Estado del sorteo según hora actual en RD. */
export function computeDrawStatus(
  now: Date,
  drawAt: Date,
  closesAt: Date,
  opts?: { isPastDay?: boolean; hasResult?: boolean }
): DrawRuntimeStatus {
  if (opts?.isPastDay) {
    return opts.hasResult ? "RESULT_AVAILABLE" : "CLOSED";
  }
  if (now >= drawAt) {
    return opts?.hasResult ? "RESULT_AVAILABLE" : "WAITING_RESULT";
  }
  if (now >= closesAt) return "CLOSED";
  if (differenceInSeconds(closesAt, now) <= 600) return "CLOSING_SOON";
  return "OPEN";
}
