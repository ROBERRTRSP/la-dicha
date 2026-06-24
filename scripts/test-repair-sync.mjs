import { repairWeekResults } from "../src/lib/results-sync.ts";

const { purged, sync } = await repairWeekResults(7);
const applied = sync.filter((r) => r.status === "applied" || r.status === "settled");
const failed = sync.filter((r) => r.status === "no_data" || r.status === "mismatch");

console.log("purged", purged);
console.log("applied", applied.length);
console.log("failed", failed.length);
if (applied.length) {
  console.log("sample", applied.slice(0, 5).map((r) => `${r.code} ${r.numbers}`).join(", "));
}
if (failed.length) {
  console.log("failures", failed.slice(0, 5).map((r) => `${r.code} ${r.status} ${r.reason}`).join(", "));
}
