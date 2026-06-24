import { dateKeyInTz } from "./timezone";

export function todayMonitorDateInput(): string {
  return dateKeyInTz(new Date());
}
