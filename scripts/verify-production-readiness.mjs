#!/usr/bin/env node
/**
 * Verificación integral pre-producción (sin servidor).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function ok(msg) {
  console.log("  ✓", msg);
}
function fail(msg) {
  console.log("  ✗", msg);
  failed++;
}

console.log("\n=== 1. Assets WebP ===");
const webp = spawnSync("node", ["scripts/verify-webp-assets.mjs"], {
  cwd: root,
  encoding: "utf8",
});
if (webp.status === 0) ok("Todos los WebP referenciados existen");
else {
  fail("WebP faltantes");
  console.log(webp.stdout || webp.stderr);
}

console.log("\n=== 2. Seguridad (código) ===");
const spinRoute = fs.readFileSync(
  path.join(root, "src/app/api/slots/spin/route.ts"),
  "utf8"
);
const rouletteRoute = fs.readFileSync(
  path.join(root, "src/app/api/roulette/spin/route.ts"),
  "utf8"
);
const cronAuth = fs.readFileSync(path.join(root, "src/lib/cron-auth.ts"), "utf8");
const drawsRoute = fs.readFileSync(
  path.join(root, "src/app/api/draws/route.ts"),
  "utf8"
);

if (/enforceSpinRateLimit/.test(spinRoute)) ok("Rate limit en /api/slots/spin");
else fail("Sin rate limit en slots/spin");

if (/enforceSpinRateLimit/.test(rouletteRoute)) ok("Rate limit en /api/roulette/spin");
else fail("Sin rate limit en roulette/spin");

if (/VERCEL_ENV.*production/.test(cronAuth) && /CRON_SECRET/.test(cronAuth)) {
  ok("Cron exige CRON_SECRET en producción");
} else fail("Cron auth incompleto");

if (/requirePlayer/.test(drawsRoute)) ok("/api/draws protegido");
else fail("/api/draws sin auth");

console.log("\n=== 3. CSS modular ===");
for (const f of [
  "src/styles/player-shell.css",
  "src/styles/admin-panel.css",
  "src/styles/cajero-panel.css",
  "src/styles/responsive-touch.css",
]) {
  if (fs.existsSync(path.join(root, f))) ok(f);
  else fail(`Falta ${f}`);
}

const globalsLines = fs
  .readFileSync(path.join(root, "src/app/globals.css"), "utf8")
  .split("\n").length;
if (globalsLines < 2500) ok(`globals.css podado (${globalsLines} líneas)`);
else fail(`globals.css aún muy grande (${globalsLines} líneas)`);

console.log("\n=== 4. Orientación slot ===");
const modern = fs.readFileSync(
  path.join(root, "src/components/casino/ModernSlotMachine.tsx"),
  "utf8"
);
if (/SlotOrientationNotice/.test(modern) && /useSlotPortraitBlock/.test(modern)) {
  ok("Aviso orientación montado en slots");
} else fail("SlotOrientationNotice no integrado");

console.log("\n=== 5. Documentación Vercel ===");
if (fs.existsSync(path.join(root, "docs/VERCEL-ENV.md"))) ok("docs/VERCEL-ENV.md");
else fail("Falta guía CRON_SECRET");

console.log(`\n=== RESULTADO: ${failed === 0 ? "LISTO" : `${failed} fallos`} ===\n`);
process.exit(failed ? 1 : 0);
