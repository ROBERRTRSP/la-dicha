import { LOTTERY_SOURCES } from "../src/lib/lottery-sources.ts";
import { OFFICIAL_SOURCE_BASE } from "../src/lib/lottery-sources.ts";
import { queryDateInTz, dayStartInTz, nowInTz } from "../src/lib/timezone.ts";
import { subDays } from "date-fns";

function revive(arr, idx, seen = new Map()) {
  if (typeof idx !== "number") return idx;
  if (seen.has(idx)) return seen.get(idx);
  const v = arr[idx];
  if (v === null || typeof v !== "object") {
    seen.set(idx, v);
    return v;
  }
  if (Array.isArray(v)) {
    const out = v.map((x) => (typeof x === "number" ? revive(arr, x, seen) : x));
    seen.set(idx, out);
    return out;
  }
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    out[k] = typeof val === "number" ? revive(arr, val, seen) : val;
  }
  seen.set(idx, out);
  return out;
}

const day = dayStartInTz(subDays(nowInTz(), 1));
const date = queryDateInTz(day);
const targetKey = "2026-06-12";

for (const src of LOTTERY_SOURCES) {
  const url = `${OFFICIAL_SOURCE_BASE}${src.officialPath}?date=${date}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "LaDicha/1.0", Accept: "text/html" },
  });
  const html = await res.text();
  const m = html.match(/id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) {
    console.log(src.code, "NO_NUXT");
    continue;
  }
  const data = JSON.parse(m[1]);
  const root = revive(data, 0);
  const games = [];
  function walk(o) {
    if (!o || typeof o !== "object") return;
    if (!Array.isArray(o) && o._id && o.title && o.game_id) games.push(o);
    if (Array.isArray(o)) for (const x of o) walk(x);
    else for (const v of Object.values(o)) walk(v);
  }
  walk(root);
  const match =
    games.find((g) => g.title === src.officialName) ??
    games.find((g) => g.title?.includes(src.officialName.split(" ")[0]));
  console.log(
    src.code,
    match?._id ?? "MISSING",
    match?.title ?? games.map((g) => g.title).slice(0, 3).join("|")
  );
}
