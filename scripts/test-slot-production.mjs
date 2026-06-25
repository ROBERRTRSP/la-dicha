/**
 * Auditoría de producción — slot machine (visual, funcional, responsive).
 * Ejecutar: npm run test:slot-production
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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
function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

console.log("\n=== 1. Layout e imports ===");
const layout = read("src/app/layout.tsx");
const layoutImports = (layout.match(/slot-layout\.css/g) || []).length;
assert(layoutImports === 1, "Import único de slot-layout.css");

console.log("\n=== 2. Reglas / Pagos (tabs separados) ===");
const rulesPanel = read("src/components/casino/SlotRulesPanel.tsx");
const machine = read("src/components/casino/ModernSlotMachine.tsx");
assert(/initialSection/.test(rulesPanel), "SlotRulesPanel acepta initialSection");
assert(/slot-rules-tab/.test(rulesPanel), "Tabs Reglas/Pagos en modal");
assert(/setRulesSection\("paytable"\)/.test(machine), "Botón Pagos abre tab paytable");
assert(/setRulesSection\("rules"\)/.test(machine), "Botón Reglas abre tab reglas");
assert(!/SlotPayTable/.test(machine), "Sin paytable duplicada en DOM");

console.log("\n=== 3. Símbolos — escala uniforme PNG/SVG ===");
const casinoCss = read("src/styles/casino.css");
assert(
  /--reel-symbol-size/.test(casinoCss) &&
    /\.slot-symbol-image--cell[\s\S]*?var\(--reel-symbol-size/.test(casinoCss),
  "PNG --cell usa --reel-symbol-size como SVG"
);

console.log("\n=== 4. Rodillos — decel, rebote, blur ===");
const reelMotion = read("src/lib/slots/reel-motion.ts");
const slotReels = read("src/components/casino/SlotReels.tsx");
const mobileCss = read("src/styles/slot-mobile.css");
assert(/settleBounceOffset/.test(reelMotion), "settleBounceOffset exportado");
assert(/easeOutBack/.test(reelMotion), "easeOutBack en deceleración");
assert(/runSettleBounce/.test(slotReels), "Rebote final en componente");
assert(/slot-reel-strip--motion[\s\S]*blur/.test(casinoCss), "Blur en giro (desktop)");
assert(/slot-reel-window--motion/.test(mobileCss), "Smear/viñeta móvil sin freeze iOS");

console.log("\n=== 5. HUD saldo/apuesta/premio ===");
assert(/hideBalance/.test(machine), "Saldo solo en header (hideBalance)");
assert(/SlotFinanceHud/.test(machine), "HUD apuesta/premio presente");
assert(/AnimatedBalance/.test(machine), "Saldo animado en header");

console.log("\n=== 6. Responsive móvil ===");
assert(/--casino-nav-h/.test(casinoCss), "Padding nav inferior en casino");
assert(/slot-cabinet-edge[\s\S]*display:\s*none/.test(mobileCss), "Sin bordes neón laterales móvil");
assert(/max-width:\s*768px/.test(mobileCss), "Breakpoint móvil 768px");
assert(/slot-screen--expanded|42vh/.test(read("src/styles/slot-layout.css")), "Área rodillos expandida");

console.log("\n=== 7. Barra inferior casino ===");
assert(/player-shell:has\(\.casino-machine\)/.test(casinoCss), "Nav oscura en pantalla casino");

console.log("\n=== 8. Anti doble giro + sync API ===");
assert(/inFlightRef/.test(machine), "inFlightRef");
assert(/tryFinalizeSpin/.test(machine), "tryFinalizeSpin");
assert(/resultReady/.test(machine), "resultReady sync");

console.log("\n=== 9. Suite motion (76+ tests) ===");
const motion = spawnSync("npm", ["run", "test:slot-motion"], {
  cwd: root,
  shell: true,
  encoding: "utf8",
});
if (motion.status === 0 && /0 failed/.test(motion.stdout + motion.stderr)) {
  ok("test:slot-motion pasó");
} else {
  fail("test:slot-motion falló");
  if (motion.stdout) console.log(motion.stdout.slice(-800));
  if (motion.stderr) console.log(motion.stderr.slice(-400));
}

console.log("\n=== 10. Suite audit ===");
const audit = spawnSync("npm", ["run", "test:slot-audit"], {
  cwd: root,
  shell: true,
  encoding: "utf8",
});
if (audit.status === 0) ok("test:slot-audit pasó");
else {
  fail("test:slot-audit falló");
  if (audit.stdout) console.log(audit.stdout.slice(-600));
}

console.log(`\n=== PRODUCCIÓN: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
