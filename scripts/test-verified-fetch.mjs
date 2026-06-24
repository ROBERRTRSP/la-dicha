import { fetchVerifiedQuiniela } from "../src/lib/results-scraper.ts";
import { LOTTERY_SOURCE_BY_CODE } from "../src/lib/lottery-sources.ts";
import { dayStartInTz, nowInTz } from "../src/lib/timezone.ts";
import { subDays } from "date-fns";

const day = dayStartInTz(subDays(nowInTz(), 1));
const codes = ["QREAL", "LOTEDOM", "LP_DIA", "ANG_10", "NAC_NOCHE", "NY_PM"];

for (const code of codes) {
  const cfg = LOTTERY_SOURCE_BY_CODE[code];
  const r = await fetchVerifiedQuiniela(cfg, day);
  if (r.ok) {
    console.log(code, "OK", r.data.first, r.data.second, r.data.third);
  } else {
    console.log(code, r.reason, r.detail ?? "");
  }
}
