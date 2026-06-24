import { readFileSync } from "fs";
import { parseQuinielaBlocks } from "../src/lib/results-scraper.ts";

const html = readFileSync("./tmp-conectate.html", "utf8");
const rows = parseQuinielaBlocks(html, false);
const real = rows.find((r) => r.label?.includes("Quiniela Real"));
console.log("conectate total", rows.length);
console.log("quiniela real", real);

const payload = readFileSync(
  "C:/Users/minim/.cursor/projects/c-Users-minim-WEB-PARA-VENTA-DE-LOTERIA-DOMINICANA/agent-tools/f32d3f92-d6a4-4f7a-9acc-9583c338cfc3.txt",
  "utf8"
);
for (const pat of ["2026-06-12", "12-06-2026", '"96"', "Quiniela Real"]) {
  console.log(pat, payload.includes(pat));
}
const idx = payload.indexOf("session_date");
console.log("sample", payload.slice(idx, idx + 400));
