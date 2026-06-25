/**
 * Verificación automatizada post-auditoría de slot machine.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const slotsSrc = path.join(root, "src", "components", "casino");
const slotsLib = path.join(root, "src", "lib", "slots");
const stylesDir = path.join(root, "src", "styles");
const assetsDir = path.join(root, "public", "assets", "slots");

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const WHITE_CELL_RE = /#eef2f7|#fef9c3|#fde047|slot-cell-emoji|\.emoji/i;

let passed = 0;
let failed = 0;

function ok(msg) {
  passed++;
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  failed++;
  console.log(`  ✗ ${msg}`);
}

console.log("\n=== 1. Emojis en código slot ===");
for (const dir of [slotsSrc, slotsLib, path.join(root, "src", "components", "slots")]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of walk(dir)) {
    if (!/\.(tsx?|css)$/.test(f)) continue;
    const content = fs.readFileSync(f, "utf8");
    if (EMOJI_RE.test(content)) {
      fail(`Emoji en ${path.relative(root, f)}`);
    }
  }
}
if (!failed) ok("Sin emojis Unicode en componentes/lib slot");

console.log("\n=== 2. Fondos blancos en CSS de celdas (spin) ===");
const casinoCss = fs.readFileSync(path.join(stylesDir, "casino.css"), "utf8");
if (/#eef2f7|linear-gradient\(180deg,\s*#eef/i.test(casinoCss)) {
  fail("Flash blanco #eef2f7 aún presente en casino.css");
} else {
  ok("Sin gradiente blanco en motion cells");
}
if (/--casino-reel-cell/.test(casinoCss)) {
  ok("Variable --casino-reel-cell definida");
} else {
  fail("Falta --casino-reel-cell");
}

console.log("\n=== 3. Assets PNG (tamaño y transparencia) ===");
const pngs = walk(assetsDir).filter((f) => f.endsWith(".png"));
let totalKb = 0;
for (const png of pngs) {
  const stat = fs.statSync(png);
  totalKb += stat.size;
  if (stat.size > 200 * 1024) {
    fail(`${path.basename(png)} > 200KB (${(stat.size / 1024).toFixed(0)}KB)`);
  }
  const meta = await sharp(png).metadata();
  if (!meta.hasAlpha) {
    fail(`${path.basename(png)} sin canal alpha`);
  }
  // Muestreo esquinas: no deben ser blanco puro opaco
  const { data, info } = await sharp(png)
    .extract({ left: 0, top: 0, width: Math.min(8, meta.width), height: Math.min(8, meta.height) })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let cornerWhite = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2],
      a = info.channels === 4 ? data[i + 3] : 255;
    if (r > 240 && g > 240 && b > 240 && a > 200) cornerWhite++;
  }
  if (cornerWhite > 32) {
    fail(`${path.basename(png)} esquina con fondo blanco opaco`);
  }
}
ok(`${pngs.length} PNGs, total ${(totalKb / 1024 / 1024).toFixed(2)}MB, alpha OK`);

console.log("\n=== 4. Paytable vs engine (muestra) ===");
// Verificación estática: paytable usa bet/paylineCount × mult (mismo criterio que engine)
const payTableSrc = fs.readFileSync(
  path.join(slotsSrc, "SlotPayTable.tsx"),
  "utf8"
);
if (/bet \/ game\.paylineCount/.test(payTableSrc) && /formatMoney/.test(payTableSrc)) {
  ok("Paytable calcula premio por línea con apuesta real");
} else {
  fail("Paytable no usa fórmula bet/paylineCount");
}
const engineSrc = fs.readFileSync(path.join(slotsLib, "engine.ts"), "utf8");
if (/crypto.*randomInt|from "crypto"/.test(engineSrc)) {
  ok("RNG seguro en backend (crypto.randomInt)");
} else {
  fail("RNG no usa crypto");
}

console.log("\n=== 5. Lógica spin-service (debito atomico) ===");
const spinSrc = fs.readFileSync(path.join(slotsLib, "spin-service.ts"), "utf8");
if (/updateMany/.test(spinSrc) && /balance:\s*\{\s*gte/.test(spinSrc)) {
  ok("Débito atómico con updateMany + gte");
} else {
  fail("Falta débito atómico en spin-service");
}
if (/freeSpinBetAmount/.test(spinSrc)) {
  ok("Apuesta congelada en free spins");
} else {
  fail("Falta freeSpinBetAmount");
}

console.log("\n=== 6. Frontend anti doble giro ===");
const machineSrc = fs.readFileSync(path.join(slotsSrc, "ModernSlotMachine.tsx"), "utf8");
if (/inFlightRef/.test(machineSrc) && /spinning \|\| inFlightRef/.test(machineSrc)) {
  ok("inFlightRef bloquea doble giro");
} else {
  fail("Falta protección inFlightRef");
}
if (/tryFinalizeSpin/.test(machineSrc) && /resultReady/.test(machineSrc)) {
  ok("Sincronización animación + API");
} else {
  fail("Falta sync animación/API");
}

console.log("\n=== 7. Mobile CSS ===");
const mobileCss = fs.readFileSync(path.join(stylesDir, "slot-mobile.css"), "utf8");
const checks = [
  ["slot-spin-button", "Botón GIRAR responsive"],
  ["--casino-nav-h", "Padding nav (en casino.css)"],
  ["max-height: 700px", "Compact mode pantallas bajas"],
];
for (const [pattern, label] of checks) {
  const inMobile = mobileCss.includes(pattern);
  const inCasino = pattern === "--casino-nav-h" ? casinoCss.includes(pattern) : inMobile;
  if (inMobile || inCasino) ok(label);
  else fail(`Falta ${label}`);
}
if (/min\(140px,\s*38vw\)/.test(mobileCss)) ok("GIRAR min(140px, 38vw)");

console.log(`\n=== RESULTADO: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
