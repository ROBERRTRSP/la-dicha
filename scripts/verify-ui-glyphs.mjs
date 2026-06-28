#!/usr/bin/env node
/** Rechaza emojis y texto SVG decorativo en UI de juego (excepto ruleta numérica). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const SKIP = [
  "RouletteWheelSvg.tsx",
  "verify-",
  ".test.",
];
const SCAN_DIRS = [
  path.join(root, "src", "components", "casino"),
  path.join(root, "src", "components", "player"),
  path.join(root, "src", "components", "cajero"),
  path.join(root, "src", "app", "(player)"),
];

let failed = 0;

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|css)$/.test(e.name)) out.push(full);
  }
  return out;
}

for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    if (SKIP.some((s) => file.includes(s))) continue;
    const rel = path.relative(root, file);
    const content = fs.readFileSync(file, "utf8");
    if (EMOJI_RE.test(content)) {
      console.log("EMOJI", rel);
      failed++;
    }
    if (/confettiGlyphs/.test(content)) {
      console.log("CONFETTI_TEXT", rel);
      failed++;
    }
    if (/<text[\s>]/.test(content) && !file.includes("RouletteWheelSvg")) {
      console.log("SVG_TEXT", rel);
      failed++;
    }
  }
}

console.log(failed ? `\n=== ${failed} problemas ===\n` : "\n=== UI sin emoji/texto SVG decorativo ===\n");
process.exit(failed ? 1 : 0);
